# 🤖 AI-Integration mit Perplexity API

## Überblick

Version 2.1.0 erweitert den MCP Document Scanner um dynamische KI-basierte Dokumentenanalyse. Statt statischer Pattern-Matching-Regeln nutzt das Tool die Perplexity API, um Dokumente intelligent zu analysieren und bis zu **5 relevante Buzzwords** automatisch zu extrahieren.

## Features

### Intelligente Extraktion
- **Kategorie**: Automatische Erkennung (Rechnung, Vertrag, Mahnung, etc.)
- **Firmenname**: Präzise Identifizierung des Absenders
- **Dokumenttyp**: Art des Dokuments (Rechnung, Kündigung, Angebot, etc.)
- **Keywords**: Bis zu 5 relevante Schlagworte aus dem Inhalt
- **Referenznummer**: Rechnungs-, Kunden- oder Vorgangsnummern

### Fallback-Mechanismus
- **Confidence-Threshold**: Mindestvertrauen von 50% (konfigurierbar)
- **Pattern-Matching Fallback**: Bei niedriger Konfidenz oder API-Fehler automatischer Rückgriff auf bewährte Pattern-basierte Analyse
- **Fehlertoleranz**: Tool funktioniert auch ohne API-Key

## Einrichtung

### 1. API-Key besorgen

1. Besuche [https://www.perplexity.ai/settings/api](https://www.perplexity.ai/settings/api)
2. Erstelle einen neuen API-Key
3. Kopiere den Key (beginnt mit `pplx-...`)

### 2. Setup-Wizard ausführen

```bash
mcp-scan --setup
```

Im Setup-Wizard:
- Frage "🤖 AI-Enhancement mit Perplexity aktivieren?" mit **Ja** beantworten
- API-Key eingeben (wird maskiert angezeigt)
- Weitere Einstellungen nach Bedarf anpassen

### 3. Manuelle Konfiguration (optional)

Bearbeite `~/.mcp-scan.json`:

```json
{
  "enableAI": true,
  "perplexityApiKey": "pplx-your-api-key-here",
  "perplexityModel": "llama-3.1-sonar-small-128k-online",
  "aiConfidenceThreshold": 0.5
}
```

## Verwendung

### Mit aktivierter AI

```bash
# Standard-Analyse
mcp-scan dokument.pdf

# Mit Vorschau und Verbose-Logging
mcp-scan dokument.pdf --preview --verbose
```

**Beispiel-Output:**
```
🤖 AI-Analyse läuft...
✓ Kategorie erkannt: Rechnung
✓ Firma: Vodafone GmbH
✓ Typ: Mobilfunkrechnung
✓ Keywords: Mobilfunk, LTE, Datenvolumen, Grundgebühr
✓ Referenz: RG-2024-987654
🤖 AI-Vorschlag (95% Konfidenz):
   2025-05-15_Vodafone_Mobilfunkrechnung_LTE_Datenvolumen_RG-2024-987654.pdf
```

### Ohne AI (Pattern-Matching)

```bash
# AI im Setup deaktivieren oder API-Key entfernen
mcp-scan --setup

# Oder Config-Datei bearbeiten
echo '{"enableAI": false}' > ~/.mcp-scan.json
```

## Technische Details

### Verwendetes Modell
- **Standard**: `llama-3.1-sonar-small-128k-online`
- **Kontext**: 128k Tokens
- **Online-Zugriff**: Nutzt aktuelle Web-Informationen für bessere Firma-Erkennung

### Prompt-Engineering
Das Tool sendet strukturierte Prompts im JSON-Format:

```json
{
  "category": "Rechnung|Vertrag|Mahnung|...",
  "company": "Offizieller Firmenname",
  "documentType": "Kurze Beschreibung",
  "keywords": ["keyword1", "keyword2", "..."],
  "referenceNumber": "RG-2024-123456 oder null"
}
```

### Kosten-Optimierung
- **Text-Truncation**: Nur erste 2000 Zeichen werden analysiert
- **Caching**: Einmalige Analyse pro Dokument
- **Selective Use**: Nur bei aktivierter AI und vorhandenem API-Key

### Datenschutz
- **API-Key Verschlüsselung**: Keys werden nur lokal in `~/.mcp-scan.json` gespeichert
- **Maskierte Ausgabe**: Keys werden in Logs als `pplx-1234...5678` angezeigt
- **Keine Dokument-Speicherung**: Perplexity API speichert keine Dokumente dauerhaft

## Konfigurationsoptionen

### `enableAI`
- **Typ**: Boolean
- **Default**: `false`
- **Beschreibung**: Aktiviert/deaktiviert AI-Analyse

### `perplexityApiKey`
- **Typ**: String
- **Default**: `undefined`
- **Beschreibung**: Ihr Perplexity API-Key

### `perplexityModel`
- **Typ**: String
- **Default**: `"llama-3.1-sonar-small-128k-online"`
- **Alternativen**: 
  - `llama-3.1-sonar-large-128k-online` (höhere Qualität, teurer)
  - `llama-3.1-8b-instruct` (offline, günstiger)

### `aiConfidenceThreshold`
- **Typ**: Number (0.0 - 1.0)
- **Default**: `0.5`
- **Beschreibung**: Minimale Konfidenz für AI-Vorschläge. Bei niedrigerer Konfidenz wird Pattern-Matching genutzt.

## Troubleshooting

### "❌ AI-Analyse fehlgeschlagen"
- **Ursache**: Ungültiger API-Key oder Netzwerkfehler
- **Lösung**: API-Key überprüfen, Internetverbindung testen
- **Fallback**: Tool nutzt automatisch Pattern-Matching

### "⚠️ AI-Konfidenz zu niedrig (XX%)"
- **Ursache**: AI ist unsicher bei der Analyse
- **Lösung**: Normal - Pattern-Matching übernimmt automatisch
- **Tipp**: Bei häufigem Auftreten `customCompanies` in Config hinzufügen

### Keine AI-Analyse trotz aktiviertem Setting
- **Prüfen**: Ist `enableAI: true` in `~/.mcp-scan.json`?
- **Prüfen**: Ist `perplexityApiKey` korrekt gesetzt?
- **Prüfen**: Mit `--verbose` Flag detaillierte Logs anzeigen

## Beispiel-Dokumente

### Rechnung (hohe Konfidenz)
```
VODAFONE GMBH
Rechnung Nr.: RG-2024-987654
vom 15.05.2025

Ihre Mobilfunkrechnung für Mai 2025
Tarif: Red XL mit 40GB LTE
Grundgebühr: 49,99 EUR
```

**AI-Ergebnis:**
- Kategorie: Rechnung (98%)
- Firma: Vodafone GmbH
- Typ: Mobilfunkrechnung
- Keywords: [Mobilfunk, LTE, Red XL, Tarif]
- Referenz: RG-2024-987654

### Vertrag (mittlere Konfidenz)
```
MUSTERVERSICHERUNG AG
Vertragsnummer: V-2024-445566

Sehr geehrter Herr Mustermann,
anbei die Unterlagen zu Ihrer Versicherungspolice...
```

**AI-Ergebnis:**
- Kategorie: Vertrag (75%)
- Firma: Musterversicherung AG
- Typ: Versicherungspolice
- Keywords: [Versicherung, Police, Vertrag]
- Referenz: V-2024-445566

## Vergleich: AI vs. Pattern-Matching

| Feature | AI (Perplexity) | Pattern-Matching |
|---------|-----------------|------------------|
| **Dynamik** | ✅ Lernt aus Context | ❌ Statische Regeln |
| **Firma-Erkennung** | ✅ Intelligente Identifikation | ⚠️ Bekannte Liste |
| **Keywords** | ✅ Kontext-basiert (bis 5) | ❌ Fest definiert |
| **Neue Dokumenttypen** | ✅ Automatisch | ❌ Manuell ergänzen |
| **Offline-Fähig** | ❌ Benötigt Internet | ✅ Lokal |
| **Kosten** | 💰 API-Calls | ✅ Kostenlos |
| **Geschwindigkeit** | ⚠️ ~2-3s | ✅ <100ms |

## Best Practices

1. **Hybrid-Modus**: AI aktiviert lassen mit Pattern-Matching Fallback
2. **Confidence-Threshold**: 0.5 ist guter Standard-Wert
3. **Batch-Processing**: Bei vielen Dokumenten `--preview` nutzen, um Kosten zu prüfen
4. **Custom Companies**: Häufige Firmen in Config eintragen für bessere Pattern-Matching Fallbacks
5. **Verbose-Logging**: Bei Problemen `--verbose` für detaillierte Diagnose

## Roadmap

### v2.2 (geplant)
- [ ] Local AI Models (Ollama-Integration)
- [ ] Batch-Analyse mit Progress-Bar
- [ ] AI-basierte Auto-Kategorisierung neuer Firmen
- [ ] Lernfunktion: Feedback → bessere Prompts

### v2.3 (geplant)
- [ ] Multi-Dokument-Kontext (Rechnungsserien erkennen)
- [ ] Automatische Tag-Extraktion für Suchbarkeit
- [ ] Export zu Buchhaltungssoftware (Lexoffice, DATEV)

## Support

- **GitHub Issues**: [github.com/AndreasDietzel/mcp-document-scanner/issues](https://github.com/AndreasDietzel/mcp-document-scanner/issues)
- **Perplexity API Docs**: [docs.perplexity.ai](https://docs.perplexity.ai)

---

**Version**: 2.1.0  
**Autor**: Andreas Dietzel  
**Lizenz**: MIT
