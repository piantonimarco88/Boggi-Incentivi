using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Threading;
using Microsoft.Web.WebView2.Core;

namespace BoggiIncentivi
{
    public partial class MainWindow : Window
    {
        private bool _isReady      = false;
        private bool _wasUpdated   = false;
        private bool _printReady   = false;
        private CancellationTokenSource _pdfCts = null;

        private static readonly string BaseDir    = AppDomain.CurrentDomain.BaseDirectory;
        private static readonly string UpdateCfg  = Path.Combine(BaseDir, "update.json");

        // File HTML: cerca prima in AppData (scrivibile senza admin), poi in Program Files
        private static readonly string AppDataRoot = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "BoggiIncentivi");
        private static readonly string AppDataDir  = Path.Combine(AppDataRoot, "web");
        private static readonly string LocalHtmlAppData = Path.Combine(AppDataDir, "app.html");
        private static readonly string LocalHtmlInstall = Path.Combine(BaseDir, "web", "app.html");

        // Percorso effettivo da caricare: preferisce AppData se aggiornato, altrimenti installazione
        private static string LocalHtml => File.Exists(LocalHtmlAppData) ? LocalHtmlAppData : LocalHtmlInstall;
        // Percorso dove scrivere gli aggiornamenti (sempre AppData — scrivibile)
        private static readonly string LocalHtmlWrite = Path.Combine(AppDataDir, "app.html");
        // State persistence: %LOCALAPPDATA%\BoggiIncentivi\state.json (sostituisce localStorage["boggi_state"])
        private static readonly string StatePath = Path.Combine(AppDataRoot, "state.json");
        // Audit log invii email (#8): %LOCALAPPDATA%\BoggiIncentivi\audit_log.jsonl
        // JSON Lines (una riga JSON per record), append-only, UTF-8 senza BOM.
        // Contiene PII (matricola, email, nomi) -> escluso da git via .gitignore.
        private static readonly string AuditLogPath = Path.Combine(AppDataRoot, "audit_log.jsonl");
        // Snapshot storici (#9): %LOCALAPPDATA%\BoggiIncentivi\snapshots\snapshot_<ts>_<mode>_<prize>.json
        // Salvati automaticamente dopo "Salva Tutti PDF". Contengono PII -> in .gitignore.
        private static readonly string SnapshotsDir = Path.Combine(AppDataRoot, "snapshots");
        private static readonly Encoding Utf8NoBom = new UTF8Encoding(false);
        private static readonly object _auditLock = new object();
        // Regex per estrarre matricola dal nome PDF (formato: {matr}_{periodo}.pdf)
        private static readonly Regex PdfNameRe = new Regex(@"^(\d+)_(.+)\.pdf$", RegexOptions.Compiled | RegexOptions.IgnoreCase);
        private static readonly HttpClient Http  = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };

        // ── STATE PERSISTENCE: debounce + payload pendente ─────────────────────
        private DispatcherTimer _stateSaveTimer;
        private string _pendingStatePayload;
        private readonly object _stateLock = new object();
        private const int StateSaveDebounceMs = 500;

        // ── MINI-LOG AZIONI RECENTI (#19) ──────────────────────────────────────
        // Coda delle ultime N azioni *completate* (non transitori).
        // Visualizzate in TxtRecentLog (inline, ultime 3) e TxtRecentLogFull (tooltip, tutte).
        private readonly Queue<(DateTime ts, string msg)> _recentActions = new();
        private readonly object _recentLock = new object();
        private const int RecentActionsMax = 10;
        private const int RecentActionsInline = 3;
        // Regex per riconoscere i progress-counter tipo "PDF 5/100…"
        private static readonly Regex ProgressCounterRe = new Regex(@"\b\d+/\d+\b", RegexOptions.Compiled);

        public MainWindow()
        {
            InitializeComponent();
            Loaded += MainWindow_Loaded;
            Closing += MainWindow_Closing;

            // Timer di debounce per saveState: 500ms dopo l'ultimo postMessage il payload viene scritto su disco.
            _stateSaveTimer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(StateSaveDebounceMs) };
            _stateSaveTimer.Tick += (s, e) => { _stateSaveTimer.Stop(); FlushStateToDisk(); };
        }

        // Su chiusura della finestra, flusha l'eventuale state pendente per non perderlo.
        private void MainWindow_Closing(object sender, System.ComponentModel.CancelEventArgs e)
        {
            try { _stateSaveTimer?.Stop(); FlushStateToDisk(); } catch { /* best-effort */ }
        }

        // Scrittura atomica del payload in coda su state.json (tmp + Move).
        // Sicuro da chiamare anche se non c'è nulla in coda.
        private void FlushStateToDisk()
        {
            string payload;
            lock (_stateLock) { payload = _pendingStatePayload; _pendingStatePayload = null; }
            if (string.IsNullOrEmpty(payload)) return;
            try
            {
                Directory.CreateDirectory(AppDataRoot);
                var tmp = StatePath + ".tmp";
                File.WriteAllText(tmp, payload, System.Text.Encoding.UTF8);
                File.Move(tmp, StatePath, overwrite: true);
            }
            catch (Exception ex)
            {
                // Non bloccare l'app per errori di scrittura state; logga su status bar.
                SetStatus("Errore salvataggio state: " + ex.Message);
            }
        }

        // Lettura sincrona dello state.json all'avvio (per inject pre-navigate).
        private static string TryReadStateJson()
        {
            try { return File.Exists(StatePath) ? File.ReadAllText(StatePath, System.Text.Encoding.UTF8) : null; }
            catch { return null; }
        }

        // ── AVVIO ──────────────────────────────────────────────────────────────
        private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
        {
            await TryAutoUpdate();
            SetStatus("Inizializzazione WebView2...");
            try
            {
                var udFolder = Path.Combine(Path.GetTempPath(), "BoggiIncentivi_WV2");
                Directory.CreateDirectory(udFolder);
                var env = await CoreWebView2Environment.CreateAsync(null, udFolder);

                // Inizializza entrambi i WebView con lo stesso env
                await WebView.EnsureCoreWebView2Async(env);
                await PrintWebView.EnsureCoreWebView2Async(env);
                _printReady = true;
            }
            catch (Exception ex)
            {
                System.Windows.MessageBox.Show(
                    "Impossibile inizializzare WebView2.\n\nErrore: " + ex.Message,
                    "Boggi Incentivi", MessageBoxButton.OK, MessageBoxImage.Error);
                SetStatus("Errore WebView2");
            }
        }

        // Helper status bar — thread-safe.
        // Aggiorna sia TxtStatusBar (ultimo evento, sinistra) sia, se il messaggio
        // rappresenta una *azione completata*, il mini-log a destra (#19).
        private void SetStatus(string text)
        {
            Dispatcher.Invoke(() => TxtStatusBar.Text = text);
            if (!IsTransientStatus(text))
                AppendRecentAction(text);
        }

        // ── MINI-LOG (#19): euristica e gestione coda ─────────────────────────
        // Un messaggio e` "transitorio" (NON entra nel mini-log) se:
        //   - termina con "..." o "…" (es. "Salvataggio...", "Generazione PDF...")
        //   - contiene un progress-counter tipo "5/100" (es. "PDF 12/45")
        //   - e` vuoto/null
        // Tutti gli altri sono considerati "azioni completate" (es. "Salvato: foo.pdf",
        // "Email inviata: x@y.it", "Aggiornato — v8.22", "Errore mail: ...").
        private static bool IsTransientStatus(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return true;
            var t = text.TrimEnd();
            if (t.EndsWith("...", StringComparison.Ordinal)) return true;
            if (t.EndsWith("…", StringComparison.Ordinal))   return true;
            if (ProgressCounterRe.IsMatch(t)) return true;
            return false;
        }

        // Accoda una azione completata e rinfresca TxtRecentLog + TxtRecentLogFull.
        private void AppendRecentAction(string msg)
        {
            string inlineText;
            string tooltipText;
            lock (_recentLock)
            {
                _recentActions.Enqueue((DateTime.Now, msg));
                while (_recentActions.Count > RecentActionsMax) _recentActions.Dequeue();

                // Inline: ultime N in ordine cronologico (la piu` recente a destra)
                var all = _recentActions.ToArray();
                var inlineEntries = all.Skip(Math.Max(0, all.Length - RecentActionsInline));
                inlineText = string.Join("  |  ", inlineEntries.Select(e =>
                    e.ts.ToString("HH:mm") + " → " + TruncateForInline(e.msg, 36)));

                // Tooltip: tutte, dalla piu` recente alla piu` vecchia, una per riga
                tooltipText = string.Join("\n", all.Reverse().Select(e =>
                    "[" + e.ts.ToString("HH:mm:ss") + "]  " + e.msg));
            }
            Dispatcher.Invoke(() =>
            {
                TxtRecentLog.Text = inlineText;
                TxtRecentLogFull.Text = tooltipText;
            });
        }

        // Tronca un messaggio per la visualizzazione inline (con ellipsis).
        private static string TruncateForInline(string s, int maxLen)
        {
            if (string.IsNullOrEmpty(s) || s.Length <= maxLen) return s;
            return s.Substring(0, maxLen - 1) + "…";
        }

        // ── AUTO-UPDATE ────────────────────────────────────────────────────────
        private async Task TryAutoUpdate()
        {
            if (!File.Exists(UpdateCfg)) return;
            string updateUrl; bool silent = true;
            try
            {
                var cfg   = JsonNode.Parse(await File.ReadAllTextAsync(UpdateCfg));
                updateUrl = cfg?["updateUrl"]?.GetValue<string>() ?? "";
                silent    = cfg?["silentUpdate"]?.GetValue<bool>() ?? true;
                if (!(cfg?["checkOnStartup"]?.GetValue<bool>() ?? true)) return;
                if (string.IsNullOrWhiteSpace(updateUrl) || updateUrl.StartsWith("https://INSERISCI")) return;
            }
            catch { return; }

            SetStatus("Controllo aggiornamenti...");
            try
            {
                var res = await Http.GetAsync(updateUrl);
                if (!res.IsSuccessStatusCode) { SetStatus("Aggiornamento non disponibile"); return; }
                var remote = await res.Content.ReadAsStringAsync();
                var remVer = ExtractVersion(remote);
                var locVer = File.Exists(LocalHtmlWrite) ? ExtractVersion(await File.ReadAllTextAsync(LocalHtmlWrite)) : (File.Exists(LocalHtmlInstall) ? ExtractVersion(await File.ReadAllTextAsync(LocalHtmlInstall)) : "0.0");

                // Skip se NON c'è un upgrade reale (versione remota uguale o piu` vecchia della locale).
                // Evita il bug downgrade: prima il check era `remVer == locVer`, qualsiasi differenza scatenava update.
                if (File.Exists(LocalHtml) && !IsRemoteNewer(remVer, locVer))
                { SetStatus($"Aggiornato — v{locVer}"); return; }

                if (!silent && File.Exists(LocalHtml))
                {
                    var ans = System.Windows.MessageBox.Show(
                        $"Disponibile v{remVer} (attuale: v{locVer}).\n\nAggiornare ora?\n(La nuova versione sarà attiva dalla prossima apertura)",
                        "Boggi Incentivi — Aggiornamento", MessageBoxButton.YesNo, MessageBoxImage.Information);
                    if (ans != MessageBoxResult.Yes) { SetStatus($"v{remVer} disponibile (saltato)"); return; }
                }

                // Scrivi sempre in AppData (nessun permesso admin richiesto)
                Directory.CreateDirectory(AppDataDir);
                var tmp = LocalHtmlWrite + ".tmp";
                await File.WriteAllTextAsync(tmp, remote, System.Text.Encoding.UTF8);
                File.Move(tmp, LocalHtmlWrite, overwrite: true);
                _wasUpdated = true;
                SetStatus($"✓ Aggiornato a v{remVer}");
            }
            catch (TaskCanceledException) { SetStatus("Timeout — uso versione locale"); }
            catch (Exception ex) { SetStatus("Offline — uso versione locale"); Console.WriteLine(ex.Message); }
        }

        private static string ExtractVersion(string html)
        {
            var idx = html.IndexOf("APP_VERSION", StringComparison.Ordinal);
            if (idx < 0) return "0.0";
            var q1 = html.IndexOfAny(new[] { '\'', '"' }, idx); if (q1 < 0) return "0.0";
            var q2 = html.IndexOf(html[q1], q1 + 1);            if (q2 < 0) return "0.0";
            return html.Substring(q1 + 1, q2 - q1 - 1);
        }

        // Confronto versione semver-like (major.minor[.build[.rev]]). Restituisce true SOLO se remote > local.
        // Caso degenere (non parsabile): fallback a !Equals — si comporta come il vecchio codice ma solo in quel ramo.
        private static bool IsRemoteNewer(string remoteVer, string localVer)
        {
            if (Version.TryParse(remoteVer, out var r) && Version.TryParse(localVer, out var l))
                return r > l;
            return !string.Equals(remoteVer, localVer, StringComparison.Ordinal);
        }

        // ── WEBVIEW PRINCIPALE — INIT ──────────────────────────────────────────
        private void WebView_CoreWebView2InitializationCompleted(
            object sender, CoreWebView2InitializationCompletedEventArgs e)
        {
            if (!e.IsSuccess)
            {
                var msg = "WebView2 init fallito: " + (e.InitializationException?.Message ?? "errore");
                SetStatus(msg);
                System.Windows.MessageBox.Show(msg, "Boggi Incentivi", MessageBoxButton.OK, MessageBoxImage.Error);
                return;
            }
            WebView.CoreWebView2.WebMessageReceived += CoreWebView2_WebMessageReceived;

            if (File.Exists(LocalHtml))
            {
                // INJECT STATE: prima della navigazione, esponiamo window.__BOGGI_STATE__ al JS.
                // Lato JS, app.html legge prima window.__BOGGI_STATE__ (se presente), poi cade su localStorage.
                // Lo script viene eseguito a ogni document-created — il JS internamente lo legge una sola volta all'avvio.
                var stateJson = TryReadStateJson();
                var injected = string.IsNullOrEmpty(stateJson)
                    ? "window.__BOGGI_HAS_STATE__=false;"
                    : "window.__BOGGI_HAS_STATE__=true;window.__BOGGI_STATE__=" + stateJson + ";";
                try { _ = WebView.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(injected); }
                catch (Exception ex) { SetStatus("Inject state fallito: " + ex.Message); }

                WebView.CoreWebView2.Navigate(new Uri(LocalHtml).AbsoluteUri);
                _isReady = true;
                var ver = ExtractVersion(File.ReadAllText(LocalHtml));
                SetStatus(_wasUpdated ? $"✓ Aggiornato a v{ver} — riavviato" : $"Pronto — v{ver}");
            }
            else
            {
                WebView.CoreWebView2.NavigateToString(
                    "<html><body style='background:#2c2925;color:#c9a96e;font-family:Segoe UI,sans-serif;padding:40px'>" +
                    "<h2>⚠ app.html non trovato</h2><p>Controlla update.json e cartella web/.</p></body></html>");
                SetStatus("app.html non trovato");
            }
        }

        // ── WEB MESSAGE HANDLER ────────────────────────────────────────────────
        private async void CoreWebView2_WebMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            try
            {
                var raw  = JsonNode.Parse(e.WebMessageAsJson);
                // postMessage può inviare un oggetto diretto o una stringa JSON (JSON.stringify) — gestisci entrambi
                var json = (raw is JsonValue sv) ? JsonNode.Parse(sv.GetValue<string>()) : raw;
                var type = json?["type"]?.GetValue<string>();

                if (type == "saveState")
                {
                    // Persist debouncato dello state JS in %LOCALAPPDATA%\BoggiIncentivi\state.json.
                    // Payload arriva come stringa JSON (gia` serializzata lato JS).
                    var payload = json?["payload"]?.GetValue<string>();
                    if (string.IsNullOrEmpty(payload)) return;
                    lock (_stateLock) { _pendingStatePayload = payload; }
                    // Riavvia il timer: ogni nuova chiamata ritarda di altri 500ms (debounce trailing).
                    Dispatcher.Invoke(() => { _stateSaveTimer.Stop(); _stateSaveTimer.Start(); });
                }
                else if (type == "resetState")
                {
                    // Cancella state.json e svuota la coda di scrittura pendente.
                    lock (_stateLock) { _pendingStatePayload = null; }
                    Dispatcher.Invoke(() => _stateSaveTimer?.Stop());
                    try { if (File.Exists(StatePath)) File.Delete(StatePath); }
                    catch (Exception ex) { SetStatus("Errore reset state: " + ex.Message); }
                }
                else if (type == "listSnapshots")
                {
                    // Risponde con "snapshotsList:<json-array>".
                    var listJson = ListSnapshotsJson();
                    WebView.CoreWebView2.PostWebMessageAsString("snapshotsList:" + listJson);
                }
                else if (type == "readSnapshot")
                {
                    // Risponde con "snapshotData:<filename>:<json-content>" oppure "snapshotError:<filename>".
                    var filename = json?["filename"]?.GetValue<string>();
                    var content = ReadSnapshot(filename);
                    if (content != null)
                        WebView.CoreWebView2.PostWebMessageAsString("snapshotData:" + filename + ":" + content);
                    else
                        WebView.CoreWebView2.PostWebMessageAsString("snapshotError:" + (filename ?? ""));
                }
                else if (type == "saveFile")
                {
                    var path    = json?["path"]?.GetValue<string>();
                    var content = json?["content"]?.GetValue<string>();
                    if (string.IsNullOrEmpty(path) || content == null) return;
                    var dir = Path.GetDirectoryName(path);
                    if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);
                    File.WriteAllText(path, content, System.Text.Encoding.UTF8);
                    SetStatus($"Script salvato: {path}");
                    Dispatcher.Invoke(() => System.Windows.MessageBox.Show(
                        $"Script salvato in:\n{path}", "Boggi Incentivi",
                        MessageBoxButton.OK, MessageBoxImage.Information));
                }
                else if (type == "openOutlookMail")
                {
                    var to      = json?["to"]?.GetValue<string>()      ?? "";
                    var subject = json?["subject"]?.GetValue<string>()  ?? "";
                    var body    = json?["body"]?.GetValue<string>()     ?? "";
                    var b64     = json?["pdfBase64"]?.GetValue<string>() ?? "";
                    var pdfName = json?["pdfName"]?.GetValue<string>()  ?? "lettera.pdf";
                    await Task.Run(() => OpenOutlookMail(to, subject, body, b64, pdfName));
                }
                else if (type == "openOutlookMailHtml")
                {
                    // Percorso alta qualità: C# genera il PDF via PrintToPdfAsync (stesso motore di Salva Tutti i PDF)
                    var to      = json?["to"]?.GetValue<string>()      ?? "";
                    var subject = json?["subject"]?.GetValue<string>()  ?? "";
                    var body    = json?["body"]?.GetValue<string>()     ?? "";
                    var html    = json?["html"]?.GetValue<string>()     ?? "";
                    var pdfName = json?["pdfName"]?.GetValue<string>()  ?? "lettera.pdf";
                    try
                    {
                        var tempDir = Path.Combine(Path.GetTempPath(), "BoggiIncentivi_Mail");
                        Directory.CreateDirectory(tempDir);
                        var tempPdf = Path.Combine(tempDir, pdfName);
                        // PrintToPdfAsync deve girare sul thread UI
                        await PrintHtmlToPdf(html, tempPdf);
                        // Outlook COM su thread STA separato
                        await Task.Run(() => OpenOutlookMailWithFile(to, subject, body, tempPdf));
                        SetStatus($"Email aperta: {to}");
                    }
                    catch (Exception ex)
                    {
                        SetStatus("Errore mail: " + ex.Message);
                    }
                    finally
                    {
                        // Notifica JS per procedere al prossimo (anche in caso di errore)
                        WebView.CoreWebView2.PostWebMessageAsString("mailDone");
                    }
                }
                else if (type == "selectPdfFolder")
                {
                    string selectedPath = null;
                    Dispatcher.Invoke(() =>
                    {
                        using var fd = new System.Windows.Forms.FolderBrowserDialog
                        {
                            Description = "Seleziona la cartella con i PDF degli incentivi",
                            ShowNewFolderButton = false
                        };
                        if (fd.ShowDialog() == System.Windows.Forms.DialogResult.OK)
                            selectedPath = fd.SelectedPath;
                    });
                    if (selectedPath != null)
                        WebView.CoreWebView2.PostWebMessageAsString("folderSelected:" + selectedPath);
                    else
                        WebView.CoreWebView2.PostWebMessageAsString("folderCancelled");
                }
                else if (type == "selectZipFolder")
                {
                    string selectedPath = null;
                    Dispatcher.Invoke(() =>
                    {
                        using var fd = new System.Windows.Forms.FolderBrowserDialog
                        {
                            Description = "Seleziona la cartella con gli ZIP dei Field Coach",
                            ShowNewFolderButton = false
                        };
                        if (fd.ShowDialog() == System.Windows.Forms.DialogResult.OK)
                            selectedPath = fd.SelectedPath;
                    });
                    if (selectedPath != null)
                        WebView.CoreWebView2.PostWebMessageAsString("zipFolderSelected:" + selectedPath);
                    else
                        WebView.CoreWebView2.PostWebMessageAsString("zipFolderCancelled");
                }
                else if (type == "sendOutlookMailDirect")
                {
                    var to      = json?["to"]?.GetValue<string>()        ?? "";
                    var subject = json?["subject"]?.GetValue<string>()    ?? "";
                    var body    = json?["body"]?.GetValue<string>()       ?? "";
                    var pdfFolder = json?["pdfFolder"]?.GetValue<string>() ?? "";
                    var pdfName = json?["pdfName"]?.GetValue<string>()    ?? "lettera.pdf";
                    try
                    {
                        var pdfPath = Path.Combine(pdfFolder, pdfName);
                        if (!File.Exists(pdfPath))
                            throw new Exception($"PDF non trovato: {pdfPath}\nSalva prima tutti i PDF con il bottone apposito.");
                        await Task.Run(() => SendOutlookMailDirect(to, subject, body, pdfPath));
                        SetStatus($"Email inviata: {to}");
                    }
                    catch (Exception ex)
                    {
                        SetStatus("Errore invio mail: " + ex.Message);
                    }
                    finally
                    {
                        WebView.CoreWebView2.PostWebMessageAsString("mailDone");
                    }
                }
            }
            catch (Exception ex) { SetStatus("Errore messaggio: " + ex.Message); }
        }

        private void OpenOutlookMailWithFile(string to, string subject, string body, string pdfPath)
        {
            Exception comEx = null;
            var thread = new Thread(() =>
            {
                try
                {
                    var appType = Type.GetTypeFromProgID("Outlook.Application");
                    if (appType == null) throw new Exception("Microsoft Outlook non trovato sul sistema.");
                    dynamic outlook = Activator.CreateInstance(appType);
                    dynamic mail    = outlook.CreateItem(0); // olMailItem
                    mail.To      = to;
                    mail.Subject = subject;
                    mail.Body    = body;
                    mail.Attachments.Add(pdfPath);
                    mail.Display(false);
                }
                catch (Exception ex) { comEx = ex; }
            });
            thread.SetApartmentState(ApartmentState.STA);
            thread.Start();
            thread.Join();
            if (comEx != null) throw comEx;
            // Audit (#8): finestra Outlook aperta correttamente. L'utente dovra` cliccare "Invia".
            LogEmailEvent("displayed", to, subject, pdfPath);
        }

        private void OpenOutlookMail(string to, string subject, string body, string pdfBase64, string pdfName)
        {
            try
            {
                var tempDir = Path.Combine(Path.GetTempPath(), "BoggiIncentivi_Mail");
                Directory.CreateDirectory(tempDir);
                var tempPdf = Path.Combine(tempDir, pdfName);
                File.WriteAllBytes(tempPdf, Convert.FromBase64String(pdfBase64));
                OpenOutlookMailWithFile(to, subject, body, tempPdf);
                SetStatus($"Email aperta: {to}");
            }
            catch (Exception ex)
            {
                SetStatus("Errore Outlook: " + ex.Message);
                Dispatcher.Invoke(() => System.Windows.MessageBox.Show(
                    $"Impossibile aprire Outlook:\n\n{ex.Message}\n\nAssicurati che Microsoft Outlook sia installato.",
                    "Boggi Incentivi", MessageBoxButton.OK, MessageBoxImage.Warning));
            }
        }

        private void SendOutlookMailDirect(string to, string subject, string body, string pdfPath)
        {
            Exception comEx = null;
            var thread = new Thread(() =>
            {
                try
                {
                    var appType = Type.GetTypeFromProgID("Outlook.Application");
                    if (appType == null) throw new Exception("Microsoft Outlook non trovato sul sistema.");
                    dynamic outlook = Activator.CreateInstance(appType);
                    dynamic mail    = outlook.CreateItem(0); // olMailItem
                    mail.To      = to;
                    mail.Subject = subject;
                    mail.Body    = body;
                    mail.Attachments.Add(pdfPath);
                    mail.Send();
                }
                catch (Exception ex) { comEx = ex; }
            });
            thread.SetApartmentState(ApartmentState.STA);
            thread.Start();
            thread.Join();
            if (comEx != null) throw comEx;
            // Audit (#8): mail consegnata a Outlook (Send() ritornato senza eccezioni).
            LogEmailEvent("sent", to, subject, pdfPath);
        }

        // ── AUDIT LOG INVII EMAIL (#8) ─────────────────────────────────────────
        // Registra ogni interazione di invio in audit_log.jsonl. Una riga JSON per evento.
        // eventType:
        //   - "sent":      mail.Send() chiamato direttamente (SendOutlookMailDirect)
        //   - "displayed": mail.Display(false) chiamato (l'utente decide se inviare)
        //
        // Limitazione nota: il campo "importo" non e` disponibile perche` non viene
        // passato nei postMessage attuali. Resta null finche` non estendiamo il bridge
        // JS->C# con un parametro extra (TODO).
        private void LogEmailEvent(string eventType, string to, string subject, string pdfPath)
        {
            try
            {
                var pdfName = pdfPath != null ? Path.GetFileName(pdfPath) : null;
                string matr = null, periodo = null;
                if (!string.IsNullOrEmpty(pdfName))
                {
                    var m = PdfNameRe.Match(pdfName);
                    if (m.Success) { matr = m.Groups[1].Value; periodo = m.Groups[2].Value; }
                }

                long pdfSize = 0;
                string pdfSha = null;
                if (!string.IsNullOrEmpty(pdfPath) && File.Exists(pdfPath))
                {
                    try
                    {
                        var bytes = File.ReadAllBytes(pdfPath);
                        pdfSize = bytes.Length;
                        pdfSha = Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();
                    }
                    catch { /* file potrebbe essere temp/lockato; lasciamo null */ }
                }

                // Costruisco l'oggetto JSON tramite JsonObject (mantiene ordine campi).
                var entry = new JsonObject
                {
                    ["ts"]         = DateTime.UtcNow.ToString("o"),
                    ["event"]      = eventType,
                    ["matricola"]  = matr,
                    ["periodo"]    = periodo,
                    ["to"]         = to,
                    ["subject"]    = subject,
                    ["pdf_name"]   = pdfName,
                    ["pdf_size"]   = pdfSize,
                    ["pdf_sha256"] = pdfSha,
                    ["importo"]    = null, // TODO: estendere bridge JS->C# per portare importo
                    ["user"]       = Environment.UserName,
                    ["machine"]    = Environment.MachineName
                };
                var jsonLine = entry.ToJsonString() + "\n";

                lock (_auditLock)
                {
                    Directory.CreateDirectory(AppDataRoot);
                    File.AppendAllText(AuditLogPath, jsonLine, Utf8NoBom);
                }
            }
            catch (Exception ex)
            {
                // L'audit non deve mai bloccare l'invio. Visibilita` errore via mini-log.
                SetStatus("Audit log fallito: " + ex.Message);
            }
        }

        // ── SNAPSHOT STORICI (#9) ──────────────────────────────────────────────
        // Salva un nuovo snapshot in SnapshotsDir. Filename con timestamp + mode + prize_mode
        // (estratti dal JSON payload) per evitare collisioni e permettere ordinamento.
        // Ritorna il filename salvato (senza path) o null in caso di errore.
        private string SaveSnapshotToDisk(string json)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(json)) return null;
                Directory.CreateDirectory(SnapshotsDir);
                // Estrai mode + prize_mode + period per il nome file
                string mode = "unknown", prize = "unknown", periodTag = "";
                try
                {
                    var node = JsonNode.Parse(json);
                    mode  = node?["mode"]?.GetValue<string>() ?? "unknown";
                    prize = node?["prize_mode"]?.GetValue<string>() ?? "unknown";
                    var month = node?["period"]?["month"]?.GetValue<int?>();
                    var year  = node?["period"]?["year"]?.GetValue<int?>();
                    var season = node?["period"]?["season"]?.GetValue<string>();
                    if (prize == "seasonal" && !string.IsNullOrEmpty(season) && year != null)
                        periodTag = $"_{season}_{year}";
                    else if (month != null && year != null)
                        periodTag = $"_{month:D2}_{year}";
                }
                catch { /* tag periodo "best effort" */ }

                var ts = DateTime.Now.ToString("yyyy-MM-dd_HHmmss");
                var filename = $"snapshot_{ts}_{mode}_{prize}{periodTag}.json";
                var path = Path.Combine(SnapshotsDir, filename);
                File.WriteAllText(path, json, Utf8NoBom);
                return filename;
            }
            catch (Exception ex)
            {
                SetStatus("Snapshot fallito: " + ex.Message);
                return null;
            }
        }

        // Lista snapshot disponibili come array JSON di metadati [{filename, ts, size, mode, prize, period}].
        // I metadati base (filename, size) sono dal filesystem. Mode/prize/period sono parsati dal JSON
        // (lettura completa di ogni file: per N snapshot piccoli e` accettabile).
        private string ListSnapshotsJson()
        {
            try
            {
                if (!Directory.Exists(SnapshotsDir)) return "[]";
                var arr = new JsonArray();
                var files = Directory.GetFiles(SnapshotsDir, "snapshot_*.json")
                                     .OrderByDescending(f => f) // piu` recenti prima
                                     .ToArray();
                foreach (var path in files)
                {
                    var info = new FileInfo(path);
                    var entry = new JsonObject
                    {
                        ["filename"] = info.Name,
                        ["size"]     = info.Length,
                        ["mtime"]    = info.LastWriteTimeUtc.ToString("o")
                    };
                    // Parse leggero per ottenere mode / prize_mode / period / saved_at / n_employees
                    try
                    {
                        var node = JsonNode.Parse(File.ReadAllText(path));
                        entry["mode"]       = node?["mode"]?.GetValue<string>();
                        entry["prize_mode"] = node?["prize_mode"]?.GetValue<string>();
                        entry["region"]     = node?["region"]?.GetValue<string>();
                        entry["saved_at"]   = node?["saved_at"]?.GetValue<string>();
                        if (node?["period"] is JsonObject p)
                        {
                            var pclone = new JsonObject();
                            foreach (var kv in p) pclone[kv.Key] = kv.Value?.DeepClone();
                            entry["period"] = pclone;
                        }
                        if (node?["employees"] is JsonArray emp) entry["n_employees"] = emp.Count;
                    }
                    catch { /* metadata estratti best-effort */ }
                    arr.Add(entry);
                }
                return arr.ToJsonString();
            }
            catch (Exception ex)
            {
                SetStatus("Lista snapshot fallita: " + ex.Message);
                return "[]";
            }
        }

        // Legge il contenuto completo di un singolo snapshot. Filename atteso senza path
        // (validazione contro path traversal: deve matchare "snapshot_*.json").
        private string ReadSnapshot(string filename)
        {
            try
            {
                if (string.IsNullOrEmpty(filename)) return null;
                if (filename.IndexOfAny(new[] { '/', '\\', ':' }) >= 0) return null; // no path traversal
                if (!filename.StartsWith("snapshot_", StringComparison.Ordinal)) return null;
                if (!filename.EndsWith(".json", StringComparison.Ordinal)) return null;
                var path = Path.Combine(SnapshotsDir, filename);
                if (!File.Exists(path)) return null;
                return File.ReadAllText(path, Encoding.UTF8);
            }
            catch (Exception ex)
            {
                SetStatus("Read snapshot fallita: " + ex.Message);
                return null;
            }
        }

        // ── HELPERS ────────────────────────────────────────────────────────────
        private async Task<string> RunJS(string script)
        {
            if (!_isReady || WebView.CoreWebView2 == null) return null;
            try   { return await WebView.CoreWebView2.ExecuteScriptAsync(script); }
            catch (Exception ex) { SetStatus("Errore JS: " + ex.Message); return null; }
        }

        private static string JS2Str(string raw, string fallback = "")
        {
            if (raw == null) return fallback;
            try   { return JsonSerializer.Deserialize<string>(raw) ?? fallback; }
            catch { return fallback; }
        }

        // Stampa HTML su PrintWebView (nascosto nel XAML) — non tocca mai il WebView principale
        private async Task PrintHtmlToPdf(string html, string pdfPath)
        {
            var tcs = new TaskCompletionSource<bool>();
            void OnNav(object s, CoreWebView2NavigationCompletedEventArgs args)
            { PrintWebView.CoreWebView2.NavigationCompleted -= OnNav; tcs.TrySetResult(true); }
            PrintWebView.CoreWebView2.NavigationCompleted += OnNav;
            PrintWebView.CoreWebView2.NavigateToString(html);
            await Task.WhenAny(tcs.Task, Task.Delay(6000));
            await Task.Delay(400); // rendering font
            await PrintWebView.CoreWebView2.PrintToPdfAsync(pdfPath);
        }

        // ── SALVA CONFIG ───────────────────────────────────────────────────────
        private async void BtnSaveConfig_Click(object sender, RoutedEventArgs e)
        {
            SetStatus("Salvataggio...");
            var json = await RunJS(
                "JSON.stringify({tc:TC,sick50:SICK_50,sick0:SICK_0,params:PARAMS,mode:MODE,region:REGION," +
                "prize_mode:PRIZE_MODE,season_period:SEASON_PERIOD,seas_cfg:SEAS_CFG,agg:AGG,vl:VL," +
                "usa_p:USA_P,store_flags:STORE_FLAGS,cfg_month:CFG_MONTH,cfg_year:CFG_YEAR," +
                "cfg_pdf_path:CFG_PDF_PATH,cfg_season:CFG_SEASON,saved:new Date().toISOString()},null,2)");
            if (json == null) return;
            json = JS2Str(json);
            var label = JS2Str(await RunJS("getPdfSubfolder().base"), "config");
            var dlg = new Microsoft.Win32.SaveFileDialog
            { Title = "Salva Configurazione", Filter = "JSON|*.json", FileName = $"boggi_config_{label}.json" };
            if (dlg.ShowDialog() == true)
            {
                File.WriteAllText(dlg.FileName, json);
                await RunJS("saveConfig()");
                SetStatus($"Salvato: {dlg.FileName}");
            }
            else SetStatus("Pronto");
        }

        // ── CARICA CONFIG ──────────────────────────────────────────────────────
        private async void BtnLoadConfig_Click(object sender, RoutedEventArgs e)
        {
            var dlg = new Microsoft.Win32.OpenFileDialog { Title = "Carica Configurazione", Filter = "JSON|*.json" };
            if (dlg.ShowDialog() != true) return;
            SetStatus("Caricamento...");
            var escaped = File.ReadAllText(dlg.FileName)
                .Replace("\\", "\\\\").Replace("'", "\\'").Replace("\n", "\\n").Replace("\r", "");
            await RunJS($"try{{loadConfig('{escaped}')}}catch(ex){{console.error(ex)}}");
            SetStatus($"Caricato: {Path.GetFileName(dlg.FileName)}");
        }

        // ── STAMPA PDF SINGOLO ─────────────────────────────────────────────────
        private async void BtnPrintPDF_Click(object sender, RoutedEventArgs e)
        {
            var has = await RunJS("document.getElementById('lc')&&document.getElementById('lc').innerHTML.trim().length>0");
            if (has != "true")
            { System.Windows.MessageBox.Show("Seleziona prima un dipendente nel tab Lettera."); return; }
            var dlg = new Microsoft.Win32.SaveFileDialog
            { Title = "Salva PDF", Filter = "PDF|*.pdf", FileName = "lettera.pdf" };
            if (dlg.ShowDialog() != true) return;
            SetStatus("Generazione PDF...");
            // Per il singolo: usa l'HTML isolato tramite PrintWebView
            var idx = await RunJS("(function(){var lc=document.getElementById('lc'); if(!lc||!lc.innerHTML.trim())return-1; for(var i=0;i<getLetterPool().length;i++){var e2=getLetterPool()[i];if(document.getElementById('lc').innerHTML.indexOf(e2.m)>=0)return i;} return 0;})()");
            var i0 = 0; int.TryParse(idx?.Trim(), out i0);
            var rawHtml = await RunJS($"getLetterHtmlForPrint({Math.Max(0,i0)})");
            var html = JS2Str(rawHtml);
            if (!string.IsNullOrEmpty(html) && _printReady)
                await PrintHtmlToPdf(html, dlg.FileName);
            else
            {
                // Fallback: print-letter sul WebView principale
                await RunJS("document.body.classList.add('print-letter')");
                await Task.Delay(200);
                await WebView.CoreWebView2.PrintToPdfAsync(dlg.FileName);
                await RunJS("document.body.classList.remove('print-letter')");
            }
            SetStatus($"Salvato: {dlg.FileName}");
        }

        // ── SALVA TUTTI I PDF ──────────────────────────────────────────────────
        private async void BtnSaveAllPDF_Click(object sender, RoutedEventArgs e)
        {
            // Se già in corso: ferma
            if (_pdfCts != null)
            {
                _pdfCts.Cancel();
                Dispatcher.Invoke(() => BtnSaveAllPDF.Content = "📁 Salva Tutti i PDF");
                SetStatus("Salvataggio interrotto.");
                return;
            }

            using var fd = new System.Windows.Forms.FolderBrowserDialog
            { Description = "Seleziona la cartella base per i PDF", UseDescriptionForTitle = true, ShowNewFolderButton = true };
            if (fd.ShowDialog() != System.Windows.Forms.DialogResult.OK) return;

            var mode      = JS2Str(await RunJS("MODE"),       "consuntivo");
            var prizeMode = JS2Str(await RunJS("PRIZE_MODE"), "mensile");
            var monthNum  = JS2Str(await RunJS("String(CFG_MONTH).padStart(2,'0')"), "01");
            var year      = JS2Str(await RunJS("String(CFG_YEAR)"), "2026");
            var relPath   = mode == "preventivo"
                ? JS2Str(await RunJS("getPdfSubfolder().prev"), "output/Preventivo")
                : JS2Str(await RunJS("getPdfSubfolder().cons"), "output/Consuntivo");

            var fullPath = Path.Combine(fd.SelectedPath,
                relPath.Replace("/", Path.DirectorySeparatorChar.ToString()));
            try { Directory.CreateDirectory(fullPath); }
            catch (Exception ex)
            { System.Windows.MessageBox.Show($"Impossibile creare la cartella:\n{fullPath}\n\n{ex.Message}"); return; }

            var countRaw = await RunJS("getLetterCount()");
            if (!int.TryParse(countRaw?.Trim(), out int count) || count == 0)
            { System.Windows.MessageBox.Show("Nessuna lettera da generare."); return; }

            if (!_printReady)
            { System.Windows.MessageBox.Show("Il motore di stampa non è pronto. Riprova."); return; }

            _pdfCts = new CancellationTokenSource();
            var token = _pdfCts.Token;
            Dispatcher.Invoke(() => BtnSaveAllPDF.Content = "⏹ Ferma");
            int saved = 0, skipped = 0;

            try
            {
                for (int i = 0; i < count; i++)
                {
                    if (token.IsCancellationRequested) break;

                    SetStatus($"PDF {i + 1}/{count}…");

                    var matr = JS2Str(await RunJS($"getLetterMatricola({i})"));
                    if (string.IsNullOrEmpty(matr)) { skipped++; continue; }

                    var rawHtml = await RunJS($"getLetterHtmlForPrint({i})");
                    var html    = JS2Str(rawHtml);
                    if (string.IsNullOrEmpty(html)) { skipped++; continue; }

                    // Usa lo stesso filename del tracciato lettere (.znf) — colonna FILENAME
                    var pdfName = JS2Str(await RunJS($"getLetterFilename({i})"));
                    if (string.IsNullOrEmpty(pdfName))
                        pdfName = prizeMode == "seasonal"
                            ? $"{matr}_{relPath.Replace("/", "_")}.pdf"
                            : $"{matr}_{monthNum}_{year}.pdf";

                    try
                    {
                        // Stampa su PrintWebView nascosto — WebView principale intatto
                        await PrintHtmlToPdf(html, Path.Combine(fullPath, pdfName));
                        saved++;
                    }
                    catch (Exception px)
                    {
                        Console.WriteLine($"Errore {matr}: {px.Message}");
                        skipped++;
                    }
                }
            }
            finally
            {
                _pdfCts?.Dispose();
                _pdfCts = null;
                Dispatcher.Invoke(() => BtnSaveAllPDF.Content = "📁 Salva Tutti i PDF");

                var cancelled = token.IsCancellationRequested;
                SetStatus($"✓ {saved}/{count} PDF → {fullPath}" +
                    (skipped > 0 ? $" ({skipped} err)" : "") +
                    (cancelled ? " — interrotto" : ""));

                var msg = $"Salvati {saved} PDF in:\n{fullPath}";
                if (skipped  > 0) msg += $"\n({skipped} errori)";
                if (cancelled)    msg += "\n\nInterrotto dall'utente.";
                System.Windows.MessageBox.Show(msg, "Boggi Incentivi — Completato");
            }

            // ── SNAPSHOT STORICO AUTOMATICO (#9) ──────────────────────────────
            // Dopo "Salva Tutti PDF" completato con almeno un file salvato,
            // chiede al JS di costruire uno snapshot dei calcoli correnti e lo
            // persiste in %LOCALAPPDATA%\BoggiIncentivi\snapshots\.
            // Fail-safe: errori non bloccano nulla, finiscono nel mini-log.
            if (saved > 0)
            {
                try
                {
                    var rawSnap = await RunJS("(typeof buildSnapshotForHistory==='function')?buildSnapshotForHistory():null");
                    var snapJson = JS2Str(rawSnap);
                    if (!string.IsNullOrEmpty(snapJson) && snapJson != "null")
                    {
                        var saved_file = SaveSnapshotToDisk(snapJson);
                        if (saved_file != null) SetStatus("Snapshot storico salvato: " + saved_file);
                    }
                }
                catch (Exception ex) { SetStatus("Snapshot non salvato: " + ex.Message); }
            }
        }
    }
}
