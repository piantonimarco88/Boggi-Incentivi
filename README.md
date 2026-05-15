# Boggi Milano - Sistema Incentivazione (Desktop WPF)

## Requisiti
- **Visual Studio 2022** (Community edition va bene) con workload ".NET Desktop Development"
- **.NET 8 SDK** (incluso con VS 2022 aggiornato)
- **WebView2 Runtime** (già preinstallato su Windows 10/11 aggiornati, altrimenti: https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

## Come aprire e compilare

1. Apri `BoggiIncentivi.sln` in Visual Studio 2022
2. Al primo avvio, Visual Studio scaricherà automaticamente il pacchetto NuGet `Microsoft.Web.WebView2`
3. Premi **F5** per compilare e avviare in debug, oppure **Ctrl+Shift+B** per compilare

L'eseguibile verrà creato in `bin\Debug\net8.0-windows\BoggiIncentivi.exe`

## Per creare un eseguibile standalone (senza .NET installato)

Apri un terminale nella cartella del progetto:
```
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true
```
Troverai l'exe in `bin\Release\net8.0-windows\win-x64\publish\`

## Struttura

```
BoggiIncentivi/
├── BoggiIncentivi.sln      ← apri questo in Visual Studio
├── BoggiIncentivi.csproj    ← progetto .NET 8 WPF
├── App.xaml / App.xaml.cs   ← entry point WPF
├── MainWindow.xaml          ← interfaccia con toolbar nativa
├── MainWindow.xaml.cs       ← logica: PDF, salvataggio, dialoghi
├── web/
│   └── app.html             ← interfaccia incentivi (identica alla versione browser)
└── README.md
```

## Funzionalità Desktop (oltre alla versione HTML)

- **Toolbar nativa** Windows con bottoni Salva Config, Carica Config, Stampa PDF, Salva Tutti PDF
- **Salva Tutti i PDF**: genera un file `matricola_02_2026.pdf` per ciascun dipendente nella cartella scelta
- **Dialog nativi** Windows per apertura/salvataggio file
- **Status bar** con progresso generazione PDF
- **Singolo .exe** distribuibile (con publish self-contained)

## Note tecniche

L'app usa **WebView2** (basato su Edge/Chromium) per renderizzare la stessa interfaccia HTML della versione browser.
La toolbar WPF comunica con il JavaScript tramite `ExecuteScriptAsync` e `PrintToPdfAsync`.
Nessuna logica di calcolo è duplicata in C# — tutto il motore gira nel JS originale.
