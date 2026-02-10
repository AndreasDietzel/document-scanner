# Release Notes v2.4.0 - Generic Folder Structure

**Release Date:** 2025-01-XX  
**Version:** 2.4.0  
**Focus:** Ordnerstruktur-Vereinheitlichung & Migration

---

## 🎯 Was ist neu?

### 📂 Generische Ordnerstruktur

**Problem gelöst:**
- Unterschiedliche Ordnerstrukturen über die Jahre (2000-2025 vs. 2026+)
- Inkonsistente Kategorien (z.B. `12_Logistik`, `13_Online`)
- Fehlende Kategorien für moderne Dokumenttypen (Behörden, Steuern, Soziales)

**Neue Standardstruktur (12 Kategorien):**
```
├── 01_Finanzen          (Banken, PayPal, Sparkasse, etc.)
├── 02_Beruf_Karriere    (Arbeitgeber, Bewerbungen)
├── 03_Gesundheit        (Krankenkassen, Arztbriefe)
├── 04_Versicherungen    (Allianz, AXA, HUK, etc.)
├── 05_Wohnen            (Miete, Strom, Gas, Wasser)
├── 06_Telekommunikation (Vodafone, Telekom, O2)
├── 07_Mobilitaet        (Auto, TÜV, ADAC, Bahn)
├── 08_Reisen            (Flüge, Hotels, Buchungen)
├── 09_Behoerden         (Ämter, Behördenbriefe)
├── 10_Steuern           (Finanzamt, Steuerbescheide)
├── 11_Soziales          (Kindergeld, Jugendamt, etc.)
└── 99_Sonstiges         (Online-Shops, Logistik, Diverses)
```

**Vorteile:**
- ✅ **Konsistenz**: Gleiche Struktur für alle Jahre (2000-2026+)
- ✅ **Vollständigkeit**: Deckt alle wichtigen Lebensbereiche ab
- ✅ **Zukunftssicher**: Erweiterbar für neue Kategorien
- ✅ **Übersichtlich**: Nummerierte Sortierung (01-11, 99)

### 🔄 Migrations-Tool

**Automatische Migration alter Archive:**

```bash
# Dry-Run (keine Änderungen)
npm run migrate -- ~/Documents/2020 --dry-run

# Tatsächliche Migration
npm run migrate -- ~/Documents/2020

# Alle Jahre migrieren
for year in {2000..2025}; do
  npm run migrate -- ~/Documents/$year
done
```

**Features:**
- ✅ **Intelligentes Mapping**: Alte Kategorien → neue Struktur
- ✅ **Dry-Run Modus**: Vorschau ohne Änderungen
- ✅ **Duplikat-Check**: Warnt bei bestehenden Dateien
- ✅ **Auto-Cleanup**: Entfernt leere alte Ordner
- ✅ **Detaillierte Logs**: Zeigt jede Datei-Bewegung

**Mapping-Beispiele:**
| Alt | Neu |
|-----|-----|
| `02_Gesundheit` | `03_Gesundheit` |
| `09_Auto` | `07_Mobilitaet` |
| `11_Telekommunikation` | `06_Telekommunikation` |
| `12_Logistik` | `99_Sonstiges` |
| `13_Online` | `99_Sonstiges` |

### 🎨 Vereinfachte Funktionalität

**Was wurde entfernt:**
- ❌ Automatisches Verschieben in Kategorien-Ordner
- ❌ Ordner-Suggestions während der Umbenennung

**Was bleibt:**
- ✅ Intelligente Umbenennung (AI + OCR)
- ✅ Firmen-Erkennung (weltweit via AI)
- ✅ Dokumenttyp-Analyse
- ✅ Undo-Funktion
- ✅ Datum-Extraktion (AI-gestützt)

**Warum?**
- 👤 **User Control**: Du entscheidest, wo Dokumente landen
- 🎯 **Focus**: Tool macht was es am besten kann - Namen generieren
- 🧹 **Simplicity**: Weniger Code, weniger Fehler

---

## 📚 Dokumentation

**Neue Dateien:**
- [`MIGRATION.md`](MIGRATION.md) - Vollständige Migrations-Anleitung
- `src/migrate-folders.ts` - Migration-Script Source

**Aktualisierte Dateien:**
- `README.md` - v2.4 Feature-Highlights
- `src/categories.ts` - Neue Kategorien-Definition
- `package.json` - Version 2.4.0 + `migrate` Script

---

## 🔧 Technische Details

### Geänderte Dateien

**`src/categories.ts`:**
```typescript
export const CATEGORIES: Record<string, CategoryInfo> = {
  'Finanzen': { folder: '01_Finanzen', companies: [...] },
  'Beruf': { folder: '02_Beruf_Karriere', companies: [] },
  'Gesundheit': { folder: '03_Gesundheit', companies: [...] },
  // ... 9 weitere Kategorien
  'Sonstiges': { folder: '99_Sonstiges', companies: [...] }
};
```

**`src/migrate-folders.ts` (NEU):**
- Vollständiges Migration-Tool
- ~300 Zeilen TypeScript
- CLI mit Pretty-Printing
- Export für programmatische Nutzung

**`package.json`:**
```json
{
  "version": "2.4.0",
  "scripts": {
    "migrate": "node build/migrate-folders.js"
  }
}
```

### Breaking Changes

⚠️ **Keine** - Rückwärtskompatibilität gewahrt:
- Bestehende Configs funktionieren weiterhin
- CLI-Befehle unverändert
- Migration ist **optional**

---

## 🚀 Upgrade-Path

### Für Neu-Nutzer (ab v2.4)
1. `npm install -g document-scanner`
2. `doc-scan --setup`
3. Nutze neue Ordnerstruktur von Anfang an

### Für Bestehende Nutzer

**Option A: Sofort migrieren**
```bash
# Update
npm update -g document-scanner

# Backup erstellen
cp -r ~/Documents/2020 ~/Documents/2020-backup

# Migration durchführen
for year in {2000..2025}; do
  npm run migrate -- ~/Documents/$year
done
```

**Option B: Graduelle Migration**
```bash
# Nur neue Dokumente in neuer Struktur
# Alte Archive bleiben unverändert
mkdir -p ~/Documents/2026/{01_Finanzen,02_Beruf_Karriere,...}
```

**Option C: Gar nicht migrieren**
```bash
# Alles bleibt beim Alten
# Tool umbenennt weiterhin Dateien korrekt
```

---

## 🐛 Bugfixes

Keine Bugfixes in diesem Release (Fokus auf Features).

---

## 📊 Statistiken

- **Neue Kategorie-Mappings**: 40+ Firmen neu kategorisiert
- **Migration-Script**: 300+ Zeilen Code
- **Dokumentation**: 200+ Zeilen (MIGRATION.md)
- **Tests**: Manuelle Validierung mit Real-World Daten

---

## 🙏 Credits

- **Konzept**: Basierend auf User-Feedback zu Ordner-Chaos
- **Inspiration**: 2026 Ordnerstruktur als Vorlage
- **Entwicklung**: AI-gestützte Implementation mit GitHub Copilot

---

## 📝 Next Steps

Post-Release:
- [ ] GitHub Release Tag erstellen
- [ ] NPM Package publishen
- [ ] Changelog.md aktualisieren
- [ ] Community Feedback sammeln

Future Features (v2.5+):
- [ ] Web-basiertes Dashboard für Dokumenten-Übersicht
- [ ] Erweiterte Kategorie-Anpassungen
- [ ] Multi-Language Support
- [ ] Cloud-Backup Integration

---

**Happy Organizing! 📂✨**
