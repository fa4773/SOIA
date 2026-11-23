# SOIA OS (Synthetic Operator & Intelligent Agent)

> **Sistema Operativo Linux Autonomo (Debian Live / Installabile) con Harness Desktop Agentico a Schermo Intero.**

SOIA trasforma un computer in una postazione di lavoro interamente guidata dall'Intelligenza Artificiale. Il Desktop tradizionale (barre delle applicazioni, desktop clutter) è sostituito nativamente da un **Harness Multitasking Agentico** a schermo intero (basato su Electron, Chromium embedded, React, TypeScript e Tailwind CSS) capace di orchestrare il sistema operativo, navigare sul web, eseguire shell e produrre documenti.

---

## 🏗️ Architettura del Sistema

```
SOIA/
├── linux-iso/                  # Infrastruttura di boot, kernel e Debian Live ISO
│   ├── build-debian-iso.sh     # Script live-build completo (kernel, labwc, pandoc, libreoffice)
│   ├── grub/
│   │   └── grub.cfg            # Menu BIOS/UEFI: RAM pura, Persistenza, Installer, Ripristino
│   ├── session/
│   │   ├── labwc-autostart     # Wayland compositor minimale (lancio Harness a schermo pieno)
│   │   └── setup-persistence.sh# Gestione partizione persistence stile Tails (/ union)
│   └── installer/
│       └── soia-install.sh     # Setup guidato su SSD/NVMe interno o chiavetta USB
│
├── electron/                   # Backend Desktop & Host Bridge (Main Process)
│   ├── main.ts                 # Lifecycle finestra a tutto schermo, IPC handler, FS bridge
│   ├── preload.ts              # ContextBridge sicuro (window.soia)
│   ├── windowTabs.ts           # Gestione finestre staccabili (drag-out / pop-out)
│   ├── ptyManager.ts           # Ponte shell PTY nativo (Linux bash / Windows powershell dev)
│   └── securityPolicy.ts       # Profili Strict, Balanced, Autonomous
│
├── src/                        # Interfaccia Utente Harness (ChatGPT Desktop / Codex Style)
│   ├── components/
│   │   ├── Sidebar.tsx         # Chat recenti, File & Project Browser, stato CPU/RAM
│   │   ├── TabBar.tsx          # Tab 0 bloccata (Desktop), schede staccabili, nuova scheda
│   │   ├── AgentHarnessChat.tsx# Tab 0: Chat multimodale, visualizzazione tool calls, log
│   │   ├── AgenticBrowser.tsx  # Browser Chromium embedded (<webview>) con controlli AI
│   │   ├── TerminalTab.tsx     # Terminale xterm.js collegato alla shell reale
│   │   ├── DocumentViewerTab.tsx# Editor per documenti (.doc, .txt, note)
│   │   └── SettingsModal.tsx   # Configurazione AI, sicurezza e "Espandi Ambiente Linux"
│   ├── types/soia.d.ts         # Definizioni TypeScript type-safe per il bridge SOIA
│   ├── App.tsx                 # Root component e router finestre staccate
│   └── index.css               # Stili globali Tailwind & scorrimento scuro
│
├── .antigravity/settings.json  # Parametri di sistema SOIA
└── package.json                # Configurazione Electron, Vite e dipendenze
```

---

## 🚀 Modalità di Avvio e Installazione (Linux ISO)

L'immagine ISO generata da `linux-iso/build-debian-iso.sh` supporta boot universale UEFI e Legacy BIOS:

1. **Avvia SOIA Live (RAM - Nessuna Traccia)**:
   - Il sistema viene caricato interamente in memoria RAM (`toram`).
   - Spegnendo il computer non rimane alcuna traccia sul disco.
2. **Avvia SOIA Live con Persistenza (Stile Tails)**:
   - Monta automaticamente una partizione formattata in ext4 con etichetta `persistence` (crittografata LUKS o in chiaro).
   - Conserva file personali, chiavi API, impostazioni e pacchetti installati.
3. **Installa SOIA su Disco o USB**:
   - Avvia l'installer interattivo (`soia-install.sh`) per partizionare GPT, configurare EFI, root ext4 e persistenza, rendendo SOIA il sistema operativo permanente del PC.
4. **Modalità Ripristino**:
   - Shell di emergenza root con driver video di sicurezza (`nomodeset`).

---

## ⚡ Caratteristiche dell'Harness Agentico

* **Desktop Unificato (Tab 0 Fissa)**:
  - La scheda principale funge da desktop dell'OS: non può essere chiusa né staccata accidentalmente.
  - Offre un'interfaccia conversazionale multimodale con trasparenza totale sulle azioni di sistema (*tool calls*, comandi eseguiti, file generati).
* **Schede Staccabili (Detachable Tabs)**:
  - Le schede Browser, Terminale e Documenti possono essere staccate in finestre indipendenti con un solo clic o trascinandole, con sincronizzazione istantanea.
* **Browser Agentico Integrato (Stile Comet)**:
  - Basato su Chromium embedded (`<webview>`).
  - Consente all'agente di leggere il contenuto della pagina, estrarre informazioni e interagire con i form web.
* **Terminale Nativo PTY**:
  - Collegamento diretto a `/bin/bash` (su Linux) e trasparente su `powershell.exe` (su Windows in fase di sviluppo).
* **Document Engine**:
  - Creazione ed esportazione rapida di file `.doc`, `.txt` e note nel file system.
* **Pannello "Espandi Ambiente Linux"**:
  - Installazione con 1 clic tramite `apt` di ambienti desktop alternativi (XFCE, KDE Plasma, GNOME) o suite produttive (LibreOffice, VS Code, GIMP).

---

## 🛠️ Sviluppo Locale su Windows

Durante lo sviluppo su Windows, l'Harness funziona in modalità compatibile sfruttando PowerShell e la simulazione sicura del file system:

```bash
# 1. Installazione dipendenze
npm install

# 2. Avvio dell'ambiente di sviluppo con Electron + Vite Hot-Reload
npm run dev

# 3. Verifica compilazione TypeScript e bundle
npm run build
```

---

## 📦 Generazione della ISO Debian (su macchina Linux o VM)

```bash
cd linux-iso
sudo ./build-debian-iso.sh
```

La ISO pronta per essere scritta su chiavetta USB con `dd` verrà salvata in `linux-iso/soia-os-latest-amd64.iso`.
