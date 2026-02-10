# 🎯 Release v2.3.0 - Personal Data Protection & Rebranding

**Release Datum**: 10. Februar 2026  
**Version**: 2.3.0  
**Status**: ✅ Stabil

---

## 🎉 Wichtigste Änderungen

### 🔒 Geburtsdatum-Schutz

**Problem**: Geburtsdaten in Briefköpfen wurden oft fälschlicherweise als Dokumentdatum erkannt, was zu falschen Dateinamen führte.

**Lösung**:
- **Neue Config-Option**: `birthDate` (Format: DD.MM.YYYY)
- **Intelligente Erkennung**: Geburtsdatum wird beim Zeitstempel-Parsing übersprungen
- **Vertrauliche Behandlung**: Wie API-Keys, nur lokal in `~/.doc-scan.json` gespeichert
- **Setup-Integration**: Einfache Eingabe im interaktiven Setup-Wizard

**Beispiel**:
```bash
doc-scan --setup
# Bei "Dein Geburtsdatum" eingeben: 22.06.1979
```

Die Config (`~/.doc-scan.json`) enthält dann:
```json
{
  "birthDate": "22.06.1979",
  ...
}
```

Wenn ein Dokument dieses Datum enthält, wird es übersprungen und das nächste gefundene Datum verwendet.

---

### 🎨 Rebranding: "MCP" Begriff entfernt

**Grund**: Das Tool ist kein MCP Server im eigentlichen Sinne. Die Umbenennung verbessert die Klarheit und unterscheidet es besser vom Perplexity MCP Server.

**Änderungen**:

#### 1. Befehlsname
- **Alt**: `mcp-scan`
- **Neu**: `doc-scan`

#### 2. Config-Dateien
- **Alt**: `~/.mcp-scan.json`, `~/.mcp-scan-undo.json`
- **Neu**: `~/.doc-scan.json`, `~/.doc-scan-undo.json`

#### 3. Package Name
- **Alt**: `document-scanner`
- **Neu**: `document-scanner`

#### 4. Dokumentation
- Alle Markdown-Dateien aktualisiert
- README komplett überarbeitet
- Beispiele angepasst

---

## 🔄 Migration von v2.2.x

### Automatische Migration

```bash
# 1. Alte Config sichern
cp ~/.mcp-scan.json ~/.doc-scan.json
cp ~/.mcp-scan-undo.json ~/.doc-scan-undo.json

# 2. Projekt aktualisieren
cd ~/Projects/document-scanner
git pull origin main
npm install
npm run build

# 3. Global neu verlinken
npm unlink mcp-scan  # Alte Version entfernen
npm link             # Neue Version (doc-scan) installieren

# 4. Geburtsdatum hinzufügen (optional aber empfohlen)
doc-scan --setup
```

### Manuelle Config-Migration

Bearbeite `~/.doc-scan.json` und füge dein Geburtsdatum hinzu:

```json
{
  "defaultMode": "preview",
  "birthDate": "22.06.1979",  // ← NEU hinzufügen
  "enableOCR": true,
  "enableAI": true,
  "perplexityApiKey": "pplx-...",
  ...
}
```

### macOS Quick Action anpassen

Falls du die macOS Quick Action nutzt:

1. Öffne Automator
2. Bearbeite die "Document Scanner" Quick Action
3. Ersetze im Shell-Script `mcp-scan` durch `doc-scan`
4. Speichern und testen

---

## 📋 Changelog

### ✨ Neue Features

- **Geburtsdatum-Konfiguration**: Verhindert Fehlerkennungen bei der Datumserkennung
- **Vertrauliche Behandlung**: Geburtsdatum wird wie API-Keys geschützt (maskierte Anzeige, chmod 600)
- **Setup-Wizard erweitert**: Geburtsdatum-Abfrage mit Validierung

### 🔄 Breaking Changes

- **Befehlsname geändert**: `mcp-scan` → `doc-scan`
- **Config-Pfade geändert**: `~/.mcp-scan.json` → `~/.doc-scan.json`
- **Package-Name geändert**: `document-scanner` → `document-scanner`

### 🐛 Bugfixes

- Geburtsdatum wird nicht mehr fälschlicherweise als Dokumentdatum verwendet
- Zeitstempel-Erkennung robuster bei mehreren Datumsangaben im Briefkopf

### 📚 Dokumentation

- README komplett überarbeitet mit neuen Befehlsnamen
- Alle Markdown-Dateien aktualisiert
- Shell-Script für macOS Quick Action angepasst

---

## ✅ Testing

### Geburtsdatum-Schutz testen

```bash
# 1. Setup mit deinem Geburtsdatum
doc-scan --setup

# 2. Erstelle Test-Dokument mit deinem Geburtsdatum im Briefkopf
echo "Sehr geehrter Herr Dietzel,
geboren am 22.06.1979

Ihre Rechnung vom 15.01.2026
Rechnungsnummer: 12345

Mit freundlichen Grüßen
Vodafone" > test-rechnung.txt

# 3. Preview-Modus mit Verbose
doc-scan test-rechnung.txt --preview --verbose

# Erwartetes Ergebnis:
# ⚠️  Überspringe Geburtsdatum (22.06.1979) - nicht als Dokumentdatum verwenden
# ✓ Zeitstempel: 2026-01-15 (aus Rechnungsdatum)
```

### Befehlsname testen

```bash
# Sollte Version 2.3.0 zeigen
doc-scan --version

# Alte Befehle sollten nicht mehr funktionieren
mcp-scan --help  # Fehler: command not found
```

---

## 🔧 Known Issues

*Keine bekannten Probleme.*

---

## 🎯 Completed

- [x] GitHub Repository umbenennen: `mcp-document-scanner` → `document-scanner`
- [x] GitHub Release v2.3.0 erstellen
- [ ] npm Package veröffentlichen (falls gewünscht)

---

## 📊 Statistiken

- **Dateien geändert**: 15+
- **Code-Zeilen**: ~100 neue Zeilen
- **Dokumentation**: 500+ Zeilen aktualisiert
- **Breaking Changes**: 3 (Befehlsname, Config-Pfade, Package-Name)

---

## 💬 Feedback & Support

- **GitHub**: https://github.com/AndreasDietzel/document-scanner
- **Issues**: https://github.com/AndreasDietzel/document-scanner/issues

---

**Danke für die Nutzung von Document Scanner! 🎉**
