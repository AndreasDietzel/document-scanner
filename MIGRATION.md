# Ordnerstruktur-Migration

## Übersicht

Die **neue generische Ordnerstruktur** (ab Version 2.3.0) vereinfacht die Organisation von Dokumenten und ermöglicht eine konsistente Ablage über alle Jahre hinweg.

### Alte Struktur (≤ 2025)
```
2020/
├── 01_Finanzen/
├── 02_Gesundheit/
├── 04_Versicherungen/
├── 06_Reisen/
├── 09_Auto/
├── 11_Telekommunikation/
├── 12_Logistik/
└── 13_Online/
```

### Neue Struktur (≥ 2026)
```
2026/
├── 01_Finanzen/
├── 02_Beruf_Karriere/
├── 03_Gesundheit/
├── 04_Versicherungen/
├── 05_Wohnen/
├── 06_Telekommunikation/
├── 07_Mobilitaet/
├── 08_Reisen/
├── 09_Behoerden/
├── 10_Steuern/
├── 11_Soziales/
└── 99_Sonstiges/
```

## Migrations-Mapping

| Alte Kategorie | Neue Kategorie |
|----------------|----------------|
| `01_Finanzen` | `01_Finanzen` |
| `02_Gesundheit` | `03_Gesundheit` |
| `04_Versicherungen` | `04_Versicherungen` |
| `06_Reisen` | `08_Reisen` |
| `09_Auto` | `07_Mobilitaet` |
| `11_Telekommunikation` | `06_Telekommunikation` |
| `12_Logistik` | `99_Sonstiges` |
| `13_Online` | `99_Sonstiges` |
| Alle anderen | `99_Sonstiges` |

## Migration durchführen

### 1. Dry-Run (Vorschau ohne Änderungen)

Teste die Migration zuerst **ohne** Änderungen vorzunehmen:

```bash
npm run migrate -- ~/Documents/2020 --dry-run
```

### 2. Migration ausführen

Wenn die Vorschau OK ist, führe die Migration aus:

```bash
npm run migrate -- ~/Documents/2020
```

### 3. Mehrere Jahre migrieren

Migrier alle Jahre ab 2000:

```bash
for year in {2000..2025}; do
  if [ -d ~/Documents/$year ]; then
    echo "Migriere Jahr $year..."
    npm run migrate -- ~/Documents/$year
  fi
done
```

## Was macht die Migration?

1. **Erstellt neue Ordner**: Legt die 12 generischen Kategorien an (falls nicht vorhanden)
2. **Verschiebt Dateien**: Bewegt Dokumente aus alten Ordnern in die entsprechenden neuen Kategorien
3. **Entfernt leere Ordner**: Löscht alte Ordner, die nach der Migration leer sind
4. **Warnung bei Duplikaten**: Falls eine Datei bereits im Zielordner existiert, wird sie nicht überschrieben

## Wichtige Hinweise

- **Backup erstellen**: Erstelle vor der Migration ein Backup deiner Dokumente
- **Dry-Run zuerst**: Führe immer zuerst einen Dry-Run durch
- **Manuelle Prüfung**: Prüfe nach der Migration stichprobenartig die Ergebnisse
- **Sonstiges-Ordner**: Online-Shops (Amazon, eBay) und Logistik (DHL, Hermes) landen in `99_Sonstiges`

## Beispiel-Output

```
🔄 Document Folder Migration
═══════════════════════════════════════

📂 Target: /Users/andreas/Documents/2020
🔍 Mode: EXECUTE

  ✓ Create: 02_Beruf_Karriere
  ✓ Create: 05_Wohnen
  ✓ Create: 09_Behoerden
  ✓ Create: 10_Steuern
  ✓ Create: 11_Soziales

📁 12_Logistik → 99_Sonstiges
  ✓ Move: 2020-03-15_DHL_Paketschein.pdf
  ✓ Move: 2020-05-20_Hermes_Rechnung.pdf
  ✓ Remove empty: 12_Logistik

📁 13_Online → 99_Sonstiges
  ✓ Move: 2020-01-10_Amazon_Bestellung.pdf
  ✓ Move: 2020-02-14_eBay_Rechnung.pdf
  ✓ Remove empty: 13_Online

═══════════════════════════════════════
📊 Migration Summary
═══════════════════════════════════════

  Folders created: 5
  Files moved: 47
  Errors: 0

✅ Migration completed
```

## Nach der Migration

Ab sofort:
- Nutze `doc-scan` weiterhin zum **Umbenennen** von Dateien
- Der Tool erstellt **keine Ordner** mehr und verschiebt **keine Dateien**
- **Manuelle Organisation**: Verschiebe umbenannte Dateien selbst in die passenden Kategorien

## Fragen?

Bei Problemen oder Fragen:
- GitHub Issues: https://github.com/AndreasDietzel/document-scanner/issues
- E-Mail: siehe SECURITY.md
