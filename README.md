# 🎯 MCP Document Scanner CLI

**Intelligente Dokumentenerkennung und Umbenennung mit OCR für macOS**

Standalone Command-Line Tool mit macOS Kontextmenü-Integration (Quick Action) für automatische Dateibenennung basierend auf Dokumentinhalten.

[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![macOS](https://img.shields.io/badge/macOS-Monterey%2B-blue)](https://www.apple.com/macos/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![OCR](https://img.shields.io/badge/OCR-Tesseract-orange)](https://github.com/tesseract-ocr/tesseract)
[![Version](https://img.shields.io/badge/Version-2.1.0-brightgreen)](package.json)

---

## 🤖 Features v2.1 - AI-Enhancement

### **NEU: Perplexity API Integration**
- **🚀 Dynamische Dokumentenanalyse** statt statischer Pattern-Matching
- **🏷️ Bis zu 5 Buzzwords** automatisch aus Dokumentinhalten extrahiert
- **🎯 Intelligente Absender-Erkennung** auch für unbekannte Firmen
- **📊 Confidence-Score** mit automatischem Pattern-Matching Fallback
- **⚙️ Konfigurierbar** über Setup-Wizard oder `~/.mcp-scan.json`
- **🔐 Privacy-First**: API-Key lokal gespeichert, maskierte Ausgabe

**Beispiel AI-Output:**
```
🤖 AI-Analyse läuft...
✓ Kategorie: Rechnung (95% Konfidenz)
✓ Firma: Vodafone GmbH
✓ Keywords: Mobilfunk, LTE, Datenvolumen, Grundgebühr
   → 2025-05-15_Vodafone_Mobilfunkrechnung_LTE_RG-2024-987654.pdf
```

👉 **[AI-Integration Dokumentation](AI-INTEGRATION.md)** für Details zu Setup, Verwendung und Best Practices

---

## ✨ Features v2.0

### 🔧 **NEU: Konfigurationsmanagement**
- **~/.mcp-scan.json** - Persistente Einstellungen
- **Interaktiver Setup-Wizard** (`mcp-scan --setup`)
- **Standard-Modus** wählbar (Preview/Execute)
- **OCR-Konfiguration** (Sprache, Enable/Disable)
- **Eigene Firmennamen** hinzufügen
- **CLI überschreibt Config** (flexible Nutzung)

### 📁 **NEU: Kategorisierung nach Branchen**
- **8 Kategorien:** Telekommunikation, Versicherung, Gesundheit, Finanzen, etc.
- **40+ Firmen** automatisch erkannt
- **Ordner-Vorschläge:** 01_Finanzen, 11_Telekommunikation, etc.
- **Aktivierbar** via Config oder Setup

### ⏮️ **NEU: Undo-Funktion**
- **`mcp-scan --undo`** - Letzte Batch-Umbenennung rückgängig machen
- **Automatisches Tracking** aller Operationen
- **Batch-Erkennung** (Gruppierung nach Zeit)
- **Statistiken** mit `--undo-stats`

### 🎨 **NEU: Farbige Terminal-Ausgabe**
- **Grün:** Erfolg
- **Rot:** Fehler
- **Gelb:** Warnungen
- **Cyan:** Vorschläge
- **Grau:** Debug-Details (nur --verbose)

### 🔒 **NEU: Security & Validation**
- **--verbose Flag** für Debug-Output
- **Standard:** Minimal logging (keine sensiblen Daten)
- **Filename Validation** (Länge, illegale Zeichen, etc.)
- **Reservierte Namen** erkennen (CON, PRN, etc.)

---

## ✨ Features v1.0 (Basis-Features)

- **📅 Zeitstempel-Erkennung**
  - Scanner-Zeitstempel beibehalten (`2024-01-24_14-30-45`)
  - Briefdatum aus OCR extrahieren (DD.MM.YYYY → YYYY-MM-DD)
  - **Fallback auf Erstelldatum** wenn kein Datum gefunden

- **🏢 Absender-Erkennung** (40+ Firmen)
  - Versicherungen: Allianz, AXA, Generali, HUK-Coburg, ERGO, etc.
  - Krankenkassen: TK, AOK, Barmer, DAK, IKK
  - Telekommunikation: Vodafone, Telekom, O2
  - Banken: Sparkasse, Volksbank, N26, DKB
  - Logistik: DHL, Hermes, UPS, FedEx
  - Online: Amazon, eBay, PayPal

- **📝 Dokumenttyp-Erkennung**
  - Rechnung, Vertrag, Bescheid, Mahnung, Kündigung
  - Bestellung, Lieferschein, Angebot, Kontoauszug
  - Rezept, Versicherungspolice

- **🔢 Referenznummern**
  - Rechnungsnummer, Kundennummer
  - Vertragsnummer, Policennummer  
  - Aktenzeichen, Order#

### 📄 Multi-Format Unterstützung

- ✅ **PDF** (auch gescannte mit OCR)
- ✅ **DOCX** (Microsoft Word)
- ✅ **Pages** (Apple Pages)
- ✅ **PNG/JPG/JPEG** (Bilder mit OCR)
- ✅ **TXT** (Textdateien mit UTF-8/Latin-1)

### 🚀 Batch-Verarbeitung

- **Mehrere Dateien gleichzeitig** scannen und umbenennen
- **Globbing-Support**: `mcp-scan *.pdf --execute`
- Zusammenfassung mit Statistiken
- Fehlerbehandlung pro Datei

### 🍎 macOS Integration

- **Finder Kontextmenü** (Quick Action)
- **Keyboard Shortcut** möglich
- **Benachrichtigungen** mit Sound
- **Dialoge** zur Bestätigung

---

## 🚀 Installation

### Voraussetzungen

```bash
# Node.js 18+ installieren
brew install node

# OCR (optional, für gescannte PDFs/Bilder)
brew install tesseract tesseract-lang
```

### CLI installieren

```bash
# Repository klonen
git clone https://github.com/AndreasDietzel/mcp-document-scanner.git
cd mcp-document-scanner

# Dependencies installieren
npm install

# Build ausführen
npm run build

# Global installieren (macht mcp-scan verfügbar)
npm link
```

**Test:**
```bash
mcp-scan --help
# Sollte die Hilfe anzeigen
```

### 🤖 AI-Integration einrichten (optional)

```bash
# 1. Perplexity API-Key besorgen
# → https://www.perplexity.ai/settings/api

# 2. Setup-Wizard starten
mcp-scan --setup

# 3. Bei "AI-Enhancement aktivieren?" → Ja wählen
# 4. API-Key eingeben (wird maskiert angezeigt)
```

**Manuelle Konfiguration:**
```bash
# ~/.mcp-scan.json bearbeiten
{
  "enableAI": true,
  "perplexityApiKey": "pplx-your-key-here"
}
```

👉 **Mehr Details:** [AI-INTEGRATION.md](AI-INTEGRATION.md)

### macOS Quick Action einrichten

**Detaillierte Anleitung:** Siehe [MACOS-KONTEXTMENU.md](./MACOS-KONTEXTMENU.md)

**Quick-Setup:**
1. Automator öffnen → "Schnellaktion" wählen
2. "Shell-Script ausführen" hinzufügen
3. Script einfügen (siehe Anleitung)
4. Als "🔍 Dokument scannen" speichern
5. Im Finder: Rechtsklick → Dienste → 🔍 Dokument scannen

---

## 🎯 Quick Start (v2.0)

### Erste Schritte

```bash
# 1️⃣ Setup-Wizard ausführen (erstmalig)
mcp-scan --setup

# 2️⃣ Einzelne Datei analysieren (Vorschau)
mcp-scan ~/Downloads/rechnung.pdf

# 3️⃣ Einzelne Datei umbenennen
mcp-scan ~/Downloads/rechnung.pdf --execute

# 4️⃣ Batch-Verarbeitung mit Kategorisierung
mcp-scan ~/Downloads/*.pdf --execute --verbose

# 5️⃣ Letzte Aktion rückgängig machen
mcp-scan --undo
```

### Neue v2.0 Befehle

```bash
# Setup-Wizard ausführen
mcp-scan --setup

# Undo letzte Batch-Umbenennung
mcp-scan --undo

# Undo-Statistiken anzeigen
mcp-scan --undo-stats

# Mit verbose Output (zeigt Kategorien)
mcp-scan file.pdf --preview --verbose
```

---

## 📖 Verwendung

Siehe [MACOS-QUICK-ACTION.md](MACOS-QUICK-ACTION.md) für detaillierte Anleitung.

**Kurzfassung:**
1. Automator öffnen → Schnellaktion erstellen
2. Shell-Script hinzufügen mit `mcp-scan` Aufruf
3. Speichern als "Mit MCP scannen und umbenennen"
4. **Rechtsklick im Finder** → Quick Action verwenden

---

## 📖 Verwendung

### Command Line

```bash
# Einzelne Datei (mit Dialog)
mcp-scan document.pdf

# Vorschau ohne Umbenennung
mcp-scan invoice.pdf --preview

# Automatisch umbenennen (ohne Dialog)
mcp-scan scan123.pdf --execute

# Mehrere Dateien
mcp-scan file1.pdf file2.pdf file3.pdf --execute

# Alle PDFs im Ordner
mcp-scan ~/Downloads/*.pdf --preview

# Vollautomatisch und still
mcp-scan document.pdf --execute --silent
```

### Finder Kontextmenü

1. Datei(en) im Finder auswählen
2. Rechtsklick → **Schnellaktionen** → **"Mit MCP scannen und umbenennen"**
3. Dialog erscheint mit Vorschlag
4. "Umbenennen" klicken

### Keyboard Shortcut

Optional: **⌘⌥S** zuweisen
- Systemeinstellungen → Tastatur → Kurzbefehle → Dienste
- "Mit MCP scannen und umbenennen" → Shortcut hinzufügen

---

## 🎯 Beispiele

### Umbenennung anhand von Briefkopf

| Vorher | Nachher | Erkannte Inhalte |
|--------|---------|------------------|
| `scan001.pdf` | `2024-01-24_Vodafone_Rechnung_VF-12345.pdf` | Datum: 24.01.2024, Firma: Vodafone, Typ: Rechnung, Nr: VF-12345 |
| `document.docx` | `2023-12-31_Allianz_Vertrag_POL-9876.docx` | Datum: 31.12.2023, Firma: Allianz, Typ: Vertrag, Policen-Nr: POL-9876 |
| `IMG_0123.jpg` | `2025-03-15_Techniker_Krankenkasse_Bescheid.jpg` | Datum: 15.03.2025, Firma: TK, Typ: Bescheid |

### Zeitstempel-Logik (Priorität)

1. **Scanner-Zeitstempel** (falls vorhanden)
   ```
   2024-01-24_14-30-45.pdf → 2024-01-24_14-30-45_Vodafone_Rechnung.pdf
   ```

2. **Briefdatum aus OCR** (aus ersten 1000 Zeichen)
   ```
   scan123.pdf (enthält "Berlin, 24.01.2024")
   → 2024-01-24_DHL_Lieferschein.pdf
   ```

3. **Erstelldatum der Datei** (Fallback)
   ```
   document.pdf (erstellt am 15.03.2024, kein Datum im Text)
   → 2024-03-15_Amazon_Rechnung.pdf
   ```

### Batch-Verarbeitung

```bash
# Alle PDFs im Downloads analysieren
mcp-scan ~/Downloads/*.pdf --preview

# Ausgabe:
# ============================================================
# 📊 ZUSAMMENFASSUNG - 15 Dateien verarbeitet
# ============================================================
# 
# ✅ Erfolgreich: 15
# 📝 Umbenannt: 0
# ⏭️  Übersprungen: 3
# ❌ Fehler: 0
# 
# Vorgeschlagene Umbenennungen:
#   • scan001.pdf
#     → 2024-01-24_Vodafone_Rechnung_VF-12345.pdf
#   • IMG_0456.jpg
#     → 2024-02-15_Allianz_Vertrag.jpg
#   ...

# Tatsächlich umbenennen
mcp-scan ~/Downloads/*.pdf --execute
```

---

## 🔧 Konfiguration

### Quick Action anpassen

**Automatisch umbenennen (ohne Dialog):**

Bearbeite das Automator Shell-Script:
```bash
"$NODE_PATH" "$MCP_SCAN" "$file" --execute
```

**Keine Benachrichtigungen:**
```bash
"$NODE_PATH" "$MCP_SCAN" "$file" --execute --silent
```

### Eigene Firmen/Muster hinzufügen

Bearbeite `src/cli.ts`:

```typescript
// Zeile 127-142: Firmen-Liste erweitern
const companies = [
  'Meine Firma',
  'Anderer Absender',
  // ...
];

// Zeile 165-173: Dokumenttypen erweitern
const docTypes: { [key: string]: string } = {
  'Mein Dokumenttyp': 'MeinTyp',
  // ...
};
```

Dann neu bauen:
```bash
npm run build
```

---

## 🐛 Troubleshooting

### "mcp-scan: command not found"

**Problem:** CLI nicht global installiert.

**Lösung:**
```bash
cd /pfad/zum/repo
npm link
```

### Quick Action erscheint nicht

**Lösung 1:** Systemeinstellungen prüfen
- Systemeinstellungen → Erweiterungen → Finder
- "Mit MCP scannen und umbenennen" aktivieren

**Lösung 2:** Service neu erstellen
- Automator öffnen
- Service aus `~/Library/Services/` öffnen und neu speichern

### OCR funktioniert nicht

**Installation prüfen:**
```bash
tesseract --version
# Sollte Version 5+ anzeigen

# Deutsche Sprache installieren
brew install tesseract-lang
```

**Test:**
```bash
tesseract --list-langs
# Sollte 'deu' enthalten
```

### "Keine Textinhalte gefunden"

**Mögliche Ursachen:**
- Bild ohne Text (leere Seite)
- OCR nicht installiert
- Datei beschädigt

**Debugging:**
```bash
# Detaillierte Ausgabe
mcp-scan datei.pdf --silent  # Zeigt Console-Output
```

---

## 🏗️ Entwicklung

### Projekt-Struktur

```
mcp-document-scanner/
├── src/
│   └── cli.ts              # Haupt-CLI Tool
├── build/                  # Kompilierte JavaScript-Dateien
├── test-data/              # Testdateien
├── package.json
├── tsconfig.json
├── README.md
├── MACOS-QUICK-ACTION.md   # macOS Setup-Anleitung
└── LICENSE
```

### Build & Test

```bash
# TypeScript kompilieren
npm run build

# Watch-Modus für Entwicklung
npm run watch

# Lokaler Test (ohne Installation)
node build/cli.js test-data/sample.pdf --preview
```

### Tests hinzufügen

```bash
# Testdateien erstellen
mkdir -p test-data
echo "Test content" > test-data/test.txt

# Testen
mcp-scan test-data/test.txt --preview
```

---

## 📚 Weiterführende Dokumentation

- [MACOS-QUICK-ACTION.md](MACOS-QUICK-ACTION.md) - Automator Setup & Troubleshooting
- [CHANGELOG.md](CHANGELOG.md) - Versionshistorie
- [LICENSE](LICENSE) - MIT Lizenz

---

## 🤝 Beitragen

Contributions sind willkommen! Bitte:

1. Fork das Repository
2. Feature-Branch erstellen (`git checkout -b feature/AmazingFeature`)
3. Änderungen committen (`git commit -m 'Add AmazingFeature'`)
4. Branch pushen (`git push origin feature/AmazingFeature`)
5. Pull Request öffnen

### Ideen für Contributions

- [ ] Weitere Firmen/Absender hinzufügen
- [ ] Zusätzliche Dokumenttypen erkennen
- [ ] GUI-Version mit Electron
- [ ] Windows/Linux Unterstützung
- [ ] Konfigurationsdatei (`~/.mcp-scan.json`)
- [ ] Plugin-System für eigene Muster

---

## 📄 Lizenz

MIT License - siehe [LICENSE](LICENSE)

---

## 👤 Autor

**Andreas Dietzel**
- GitHub: [@AndreasDietzel](https://github.com/AndreasDietzel)

---

## 🙏 Danksagungen

- [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) - OCR Engine
- [pdf-parse](https://www.npmjs.com/package/pdf-parse) - PDF Text Extraction
- [mammoth](https://www.npmjs.com/package/mammoth) - DOCX Parsing
- [MCP](https://github.com/modelcontextprotocol) - Model Context Protocol

---

## ⭐ Star History

Wenn dir dieses Projekt gefällt, gib ihm einen Stern auf GitHub!
