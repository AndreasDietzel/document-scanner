# Changelog

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
und dieses Projekt folgt [Semantic Versioning](https://semver.org/lang/de/).

---

## [2.4.0] - 2025-01-XX

### Added
- **Generische Ordnerstruktur**: 12 Standardkategorien (01-11 + 99) für konsistente Ablage
- **Migrations-Tool**: `npm run migrate` zum Umzug alter Ordnerstrukturen
- **Neue Kategorien**: Beruf & Karriere (02), Wohnen (05), Behörden (09), Steuern (10), Soziales (11)
- **MIGRATION.md**: Vollständige Anleitung zur Ordner-Migration
- **RELEASE-v2.4.0.md**: Detaillierte Release Notes
- **CHANGELOG.md**: Diese Datei für strukturierte Versions-Historie

### Changed
- **`src/categories.ts`**: Komplette Überarbeitung der Kategorie-Mappings
- **Kategorie-Nummern**: Neue Zuordnung (z.B. Telekommunikation: 11 → 06)
- **Sonstiges-Kategorie**: Logistik + Online-Shops jetzt in `99_Sonstiges`
- **package.json**: Version 2.4.0, neues `migrate` Script

### Removed
- **Automatisches Ordner-Organisation**: Tool verschiebt keine Dateien mehr zwischen Kategorien
- **Ordner-Suggestions**: Keine Vorschläge während der Umbenennung

### Documentation
- **README.md**: v2.4 Features hinzugefügt
- **Fokus auf AI**: Betont AI als primäre Erkennungsmethode (nicht lokale Listen)

---

## [2.3.0] - 2025-01-10

### Added
- **Geburtsdatum-Schutz**: Verhindert Fehlinterpretation als Dokument-Datum
- **AI-gestützte Datumsauswahl**: KI wählt korrektes Briefkopf-Datum aus mehreren Kandidaten
- **Perplexity "sonar" Model**: Update auf aktuelles AI-Modell
- **KfW Bankengruppe**: Zur Firmen-Fallback-Liste hinzugefügt
- **Rahmenkreditvertrag**: Neuer Dokumenttyp mit hoher Priorität

### Changed
- **Dokumenttyp-Priorität**: Spezifische Typen (Kreditvertrag) vor generischen (Vertrag)
- **extractTimestamp()**: Jetzt async für AI-Integration
- **Setup-Wizard**: Geburtsdatum-Eingabe integriert

### Fixed
- **Multi-Datum Problem**: AI wählt korrektes Datum statt erstem Fund
- **Geburtsdatum-Bug**: 22.06.1979 wird nicht mehr als Dokument-Datum verwendet

---

## [2.2.2] - 2024-12-XX

### Fixed
- **gescannte PDFs**: pdftoppm + Tesseract OCR Workflow implementiert
- **DOC-Support**: Auch alte Word-Formate (.doc) funktionieren jetzt

### Changed
- **macOS Quick Action**: Robuste NODE_PATH Erkennung ohne nvm-Abhängigkeit
- **Pfad-Unterstützung**: Funktioniert auf externen Laufwerken und Network Shares

---

## [2.2.0] - 2024-11-XX

### Added
- **ISO 25010 Security**: Input Validation, Path Traversal Protection
- **API Key Protection**: Sichere lokale Speicherung mit Permission Checks
- **File Size Limits**: 100MB Maximum für Verarbeitungs-Sicherheit
- **Enhanced .gitignore**: Automatischer Secrets-Schutz

### Changed
- **Graceful Degradation**: Fallbacks bei Fehlern, keine Crashes mehr
- **Verbose Logging**: Opt-In Debug-Output mit `--verbose`

---

## [2.1.0] - 2024-10-XX

### Added
- **Perplexity API Integration**: Dynamische Dokumentenanalyse statt Pattern-Matching
- **Buzzword-Extraktion**: Bis zu 5 Keywords aus Dokumentinhalten
- **Firmen-Erkennung via AI**: Erkennt ALLE Firmen weltweit (nicht nur vordefinierte)
- **Confidence-Score**: Qualitäts-Indikator mit automatischem Fallback
- **AI-INTEGRATION.md**: Vollständige Dokumentation der KI-Features

### Changed
- **Config**: `enableAI`, `perplexityApiKey` Felder hinzugefügt
- **Setup-Wizard**: AI-Konfiguration integriert

---

## [2.0.0] - 2024-09-XX

### Added
- **Konfigurationsmanagement**: `~/.doc-scan.json` für persistente Einstellungen
- **Setup-Wizard**: Interaktiver Konfigurator (`doc-scan --setup`)
- **Kategorisierung**: 8 Branchen-Kategorien mit 40+ Firmen
- **Undo-Funktion**: `doc-scan --undo` für Batch-Rollback
- **Farbige Ausgabe**: Grün/Rot/Gelb/Cyan/Grau für bessere UX
- **Security & Validation**: Filename-Checks, reservierte Namen, etc.

### Changed
- **CLI-Interface**: Neue Flags (`--setup`, `--undo`, `--undo-stats`, `--verbose`)
- **Standard-Modus**: Konfigurierbar (Preview/Execute)

---

## [1.0.0] - 2024-08-XX

### Added
- **Initial Release**: Document Scanner CLI
- **Zeitstempel-Erkennung**: Scanner-Format + Briefdatum-Extraktion
- **Absender-Erkennung**: 20+ bekannte Firmen (Vorläufer der AI-Version)
- **Dokumenttyp-Erkennung**: Rechnung, Vertrag, Bescheid, etc.
- **OCR-Support**: Tesseract für gescannte Dokumente
- **macOS Quick Action**: Kontextmenü-Integration
- **Batch-Processing**: Mehrere Dateien gleichzeitig

### Formats
- PDF (mit Text oder gescannt)
- DOCX (Word-Dokumente)
- TXT (Plain Text)

---

## Format-Legende

- **Added**: Neue Features
- **Changed**: Änderungen an bestehenden Features
- **Deprecated**: Bald entfallende Features
- **Removed**: Entfernte Features
- **Fixed**: Bugfixes
- **Security**: Sicherheits-Updates

---

**[Unreleased]**: Geplante Features für kommende Versionen

- Cloud-Backup Integration
- Multi-Language Support (EN, FR, ES)
- Web-Dashboard für Dokumenten-Übersicht
- Erweiterte Kategorie-Anpassungen
