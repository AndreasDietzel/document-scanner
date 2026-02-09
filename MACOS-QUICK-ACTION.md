# 🍎 macOS Kontextmenü-Integration (Quick Action)

## ✨ Was du bekommst

Nach der Installation kannst du:
- **Rechtsklick** auf jede PDF, DOCX, Pages, Bild-Datei im Finder
- Im Kontextmenü erscheint: **"Mit MCP scannen und umbenennen"**
- Datei wird analysiert und intelligenter Name vorgeschlagen
- Dialog erscheint zur Bestätigung
- ✅ Ein Klick und die Datei ist perfekt benannt!

## 📋 Installation

### Schritt 1: CLI-Tool installieren

```bash
cd /Users/andreasdietzel/Projects/mcp-document-intelligence

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

### Schritt 2: Quick Action erstellen

1. **Automator öffnen** (`/Applications/Automator.app`)

2. **Neues Dokument** → **Schnellaktion** (Quick Action) wählen

3. **Konfiguration oben rechts:**
   - Workflow erhält: **Dateien oder Ordner**
   - in: **Finder**
   - Bild: **Dokument** (optional)
   - Farbe: **Blau** (optional)

4. **Aktion hinzufügen:**
   - Suche links nach "Shell-Skript ausführen"
   - Ziehe es in den Workflow-Bereich

5. **Shell-Skript konfigurieren:**
   - Shell: **/bin/bash**
   - Übergabe: **als Argumente**
   - Inhalt ersetzen mit folgendem Script:

```bash
#!/bin/bash

# Node.js Pfad ermitteln
NODE_PATH=$(which node)

# mcp-scan global pfad (nach npm link)
MCP_SCAN="$(npm bin -g)/mcp-scan"

# Alle übergebenen Dateien verarbeiten
for file in "$@"; do
    if [ -f "$file" ]; then
        "$NODE_PATH" "$MCP_SCAN" "$file"
    fi
done
```

6. **Speichern als:**
   - Name: **Mit MCP scannen und umbenennen**
   - Speichert automatisch nach: `~/Library/Services/`

### Schritt 3: Testen

1. Öffne **Finder**
2. Navigiere zu `test-data/` in diesem Projekt
3. **Rechtsklick** auf `Rechnung_für_Müller_Größe_XL.txt`
4. Scrollen zu **Dienste** oder **Quick Actions**
5. Klicke auf **"Mit MCP scannen und umbenennen"**

**Erwartetes Verhalten:**
- Benachrichtigung: "Analysiere: Rechnung_für_Müller..."
- Dialog erscheint mit Umbenennungsvorschlag
- Bei "Umbenennen" → Datei wird umbenannt
- Erfolgs-Benachrichtigung mit neuem Namen

## 🎯 Verwendung

### Im Finder

1. **Rechtsklick** auf Datei
2. **Schnellaktionen** → **Mit MCP scannen und umbenennen**
3. Warte auf Analyse (1-3 Sekunden)
4. Dialog erscheint mit Vorschlag
5. **"Umbenennen"** klicken oder **"Abbrechen"**

### Unterstützte Formate

- ✅ PDF (auch gescannte mit OCR)
- ✅ DOCX (Word Dokumente)
- ✅ Pages (Apple Pages)
- ✅ PNG, JPG, JPEG (mit OCR)
- ✅ TXT (Textdateien)

### Was erkannt wird

Der Scanner findet automatisch:
- 📅 **Datum**: z.B. 24.01.2024 → 2024-01-24
- 🏢 **Firma**: Vodafone, Telekom, Amazon, DHL, etc.
- 📝 **Dokumenttyp**: Rechnung, Vertrag, Bescheid, etc.
- 🔢 **Referenznummern**: Rechnungs-Nr., Kunden-Nr., etc.
- ⏰ **Scanner-Zeitstempel**: 2024-01-24_14-30-45 (bleibt erhalten)

### Beispiel-Umbenennungen

| Vorher | Nachher |
|--------|---------|
| `scan123.pdf` | `2024-01-24_Vodafone_Rechnung_VF-12345.pdf` |
| `document.docx` | `2024-12-31_Telekom_Vertrag.docx` |
| `image001.jpg` | `2025-03-15_Amazon_Lieferschein.jpg` |
| `2024-01-24_14-30-45.pdf` | `2024-01-24_14-30-45_DHL_Rechnung.pdf` |

## 🔧 Konfiguration

### Mehrere Dateien gleichzeitig

Die Quick Action unterstützt **Mehrfachauswahl**:
- Markiere mehrere Dateien im Finder
- Rechtsklick → Quick Action
- Jede Datei wird nacheinander verarbeitet

### Ohne Dialog (automatisch umbenennen)

Bearbeite das Shell-Script in Automator und ergänze `--execute`:

```bash
"$NODE_PATH" "$MCP_SCAN" "$file" --execute
```

Dann erfolgt die Umbenennung **ohne Rückfrage**.

### Keine Benachrichtigungen

Ergänze `--silent`:

```bash
"$NODE_PATH" "$MCP_SCAN" "$file" --execute --silent
```

## 🐛 Troubleshooting

### "mcp-scan: command not found"

**Problem:** CLI nicht global installiert.

**Lösung:**
```bash
cd /Users/andreasdietzel/Projects/mcp-document-intelligence
npm link
```

### Quick Action erscheint nicht im Kontextmenü

**Lösung 1:** Systemeinstellungen prüfen
- **Systemeinstellungen** → **Erweiterungen** → **Finder**
- Prüfe ob "Mit MCP scannen und umbenennen" aktiviert ist

**Lösung 2:** Automator Service neu speichern
- Öffne die Schnellaktion in Automator
- Speichern unter neuem Namen
- Alten Service aus `~/Library/Services/` löschen

### "Keine Textinhalte gefunden"

**Mögliche Ursachen:**
- Bild ohne Text (leere Seite)
- OCR nicht installiert (nur bei gescannten PDFs/Bildern)
- Datei beschädigt

**OCR installieren:**
```bash
brew install tesseract tesseract-lang
```

### Dialog erscheint nicht

**Prüfe:**
- Benachrichtigungen müssen erlaubt sein
- Terminal/Automator braucht Benachrichtigungs-Rechte in Systemeinstellungen

## 🚀 Fortgeschrittene Nutzung

### Keyboard Shortcut zuweisen

1. **Systemeinstellungen** → **Tastatur** → **Kurzbefehle**
2. **Dienste** in Sidebar
3. Finde "Mit MCP scannen und umbenennen"
4. Klicke rechts auf "Hinzufügen"
5. Drücke gewünschten Shortcut (z.B. `⌘⌥S`)

Jetzt kannst du Dateien markieren und `⌘⌥S` drücken!

### Command Line direkt nutzen

```bash
# Einzelne Datei (mit Dialog)
mcp-scan ~/Downloads/invoice.pdf

# Vorschau ohne Umbenennung
mcp-scan document.pdf --preview

# Automatisch umbenennen (ohne Dialog)
mcp-scan scan123.pdf --execute

# Vollautomatisch und still
mcp-scan file.pdf --execute --silent

# Hilfe
mcp-scan --help
```

### Batch-Verarbeitung via Terminal

```bash
# Alle PDFs im Downloads-Ordner
for file in ~/Downloads/*.pdf; do
    mcp-scan "$file" --execute
done

# Nur Vorschau
for file in ~/Documents/Scans/*.pdf; do
    mcp-scan "$file" --preview
done
```

## 📚 Siehe auch

- [NUTZUNG-MIT-VSCODE.md](NUTZUNG-MIT-VSCODE.md) - VS Code Integration
- [PERPLEXITY-SETUP.md](PERPLEXITY-SETUP.md) - Perplexity Desktop Setup
- [README.md](README.md) - Alle Features im Überblick
