#!/usr/bin/env node

/**
 * MCP Document Intelligence CLI
 * Standalone tool for quick file analysis and renaming
 */

import * as fs from "fs";
import * as path from "path";
import { createRequire } from "module";
import mammoth from "mammoth";
import AdmZip from "adm-zip";
import { execSync } from "child_process";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

// Import shared utilities from main index
function normalizeUnicode(str: string): string {
  return str.normalize('NFC');
}

function sanitizeFilename(filename: string): string {
  let safe = normalizeUnicode(filename);
  safe = safe.replace(/[<>:"|?*\x00-\x1F]/g, '_');
  safe = safe.replace(/[\\]/g, '-');
  safe = safe.trim().replace(/_+/g, '_').replace(/^_|_$/g, '');
  return safe;
}

// OCR Detection für gescannte PDFs/Bilder
async function extractTextWithOCR(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  
  try {
    if (ext === '.pdf') {
      // Erst normalen PDF-Text versuchen
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer, { max: 5 });
      
      if (data.text && data.text.trim().length > 50) {
        return data.text;
      }
      
      // Fallback zu OCR wenn wenig Text
      console.log("⚠️  PDF hat wenig Text, versuche OCR...");
    }
    
    // OCR für Bilder und gescannte PDFs
    if (['.pdf', '.png', '.jpg', '.jpeg'].includes(ext)) {
      try {
        execSync('tesseract --version', { stdio: 'ignore' });
        
        const tempOutput = path.join('/tmp', `ocr-${Date.now()}`);
        const cmd = `tesseract "${filePath}" "${tempOutput}" -l deu --psm 1 2>/dev/null`;
        
        execSync(cmd, { timeout: 30000 });
        
        const ocrText = fs.readFileSync(`${tempOutput}.txt`, 'utf8');
        fs.unlinkSync(`${tempOutput}.txt`);
        
        return ocrText.trim();
      } catch (ocrError) {
        console.log("⚠️  OCR nicht verfügbar oder fehlgeschlagen");
      }
    }
  } catch (error) {
    console.error("Fehler bei Textextraktion:", error);
  }
  
  return "";
}

// Extrahiere Text aus verschiedenen Formaten
async function extractText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  
  try {
    if (ext === '.txt') {
      let content = fs.readFileSync(filePath, 'utf8');
      // Fallback zu latin1 wenn UTF-8 fehlschlägt
      if (content.includes('�')) {
        content = fs.readFileSync(filePath, 'latin1');
      }
      return content;
    }
    
    if (ext === '.pdf') {
      return await extractTextWithOCR(filePath);
    }
    
    if (ext === '.docx') {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    }
    
    if (ext === '.pages') {
      const zip = new AdmZip(filePath);
      const entries = zip.getEntries();
      const indexEntry = entries.find(e => e.entryName === 'index.xml');
      if (indexEntry) {
        return indexEntry.getData().toString('utf8');
      }
    }
    
    if (['.png', '.jpg', '.jpeg'].includes(ext)) {
      return await extractTextWithOCR(filePath);
    }
  } catch (error) {
    console.error(`Fehler beim Lesen von ${filePath}:`, error);
  }
  
  return "";
}

// Intelligente Namensvorschläge
function generateSmartFilename(text: string, originalName: string, filePath: string): string {
  const suggestions: string[] = [];
  
  // 1. Scanner-Zeitstempel behalten (falls vorhanden)
  const scannerMatch = originalName.match(/(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})/);
  if (scannerMatch) {
    suggestions.push(scannerMatch[1]);
  }
  
  // 1b. Wenn kein Scanner-Zeitstempel, nutze Erstelldatum als Fallback
  if (!scannerMatch) {
    try {
      const stats = fs.statSync(filePath);
      const birthtime = stats.birthtime;
      const year = birthtime.getFullYear();
      const month = String(birthtime.getMonth() + 1).padStart(2, '0');
      const day = String(birthtime.getDate()).padStart(2, '0');
      suggestions.push(`${year}-${month}-${day}`);
    } catch (error) {
      // Fallback fehlgeschlagen, ignorieren
    }
  }
  
  // 2. Firmen/Absender (erweiterte Liste mit Versicherungen)
  const companies = [
    // Telekommunikation
    'Vodafone', 'Telekom', 'O2', 'Telefónica',
    // Versicherungen
    'Allianz', 'AXA', 'Generali', 'HUK-Coburg', 'ERGO', 'Gothaer', 'R+V Versicherung',
    'VHV', 'Debeka', 'Signal Iduna', 'Württembergische', 'LVM', 'Provinzial',
    // Krankenkassen
    'Techniker Krankenkasse', 'TK', 'AOK', 'Barmer', 'DAK', 'IKK', 'KKH',
    // Online & Logistik
    'Amazon', 'DHL', 'Deutsche Post', 'Hermes', 'UPS', 'FedEx',
    // Banken
    'Sparkasse', 'Volksbank', 'Postbank', 'Commerzbank', 'Deutsche Bank',
    'PayPal', 'N26', 'ING', 'DKB',
    // Sonstiges
    'Lufthansa', 'Deutsche Bahn', 'ADAC', 'eBay', 'Otto'
  ];
  for (const company of companies) {
    if (text.includes(company)) {
      suggestions.push(company.replace(/\s+/g, '_'));
      break;
    }
  }
  
  // 3. Dokumenttyp
  const docTypes: { [key: string]: string } = {
    'Rechnung': 'Rechnung',
    'Invoice': 'Rechnung',
    'Vertrag': 'Vertrag',
    'Contract': 'Vertrag',
    'Bescheid': 'Bescheid',
    'Mahnung': 'Mahnung',
    'Kündigung': 'Kuendigung',
    'Bestellung': 'Bestellung',
    'Lieferschein': 'Lieferschein',
    'Angebot': 'Angebot',
    'Kontoauszug': 'Kontoauszug',
    'Rezept': 'Rezept'
  };
  
  for (const [pattern, docType] of Object.entries(docTypes)) {
    if (text.includes(pattern)) {
      suggestions.push(docType);
      break;
    }
  }
  
  // 4. Datum aus Briefkopf (priorisiert vor Erstelldatum)
  // Suche nach Briefdatum (oft am Anfang des Dokuments)
  const textStart = text.substring(0, 1000); // Erste 1000 Zeichen für Briefkopf
  
  // DD.MM.YYYY Format (häufig in deutschen Briefen)
  const dateMatch = textStart.match(/(\d{2}\.\d{2}\.\d{4})/);
  if (dateMatch && suggestions.length > 0) {
    const [day, month, year] = dateMatch[1].split('.');
    // Ersetze Erstelldatum mit Briefdatum
    suggestions[0] = `${year}-${month}-${day}`;
  } else if (dateMatch) {
    const [day, month, year] = dateMatch[1].split('.');
    suggestions.unshift(`${year}-${month}-${day}`);
  }
  
  // YYYY-MM-DD Format als Alternative
  if (!dateMatch) {
    const isoMatch = textStart.match(/(\d{4}-\d{2}-\d{2})/);
    if (isoMatch && suggestions.length > 0) {
      suggestions[0] = isoMatch[1];
    } else if (isoMatch) {
      suggestions.unshift(isoMatch[1]);
    }
  }
  
  // 5. Referenznummern und IDs (erweitert)
  const referencePatterns = [
    /(?:Rechnungs-?Nr\.?|Rechnungsnummer)[:\s]+([A-Z0-9\-\/]+)/i,
    /(?:Invoice[- ]?(?:No\.|Number|#))[:\s]+([A-Z0-9\-\/]+)/i,
    /(?:Kunden-?Nr\.?|Kundennummer)[:\s]+([A-Z0-9\-\/]+)/i,
    /(?:Vertrags-?Nr\.?|Vertragsnummer)[:\s]+([A-Z0-9\-\/]+)/i,
    /(?:Policen-?Nr\.?|Versicherungs-?Nr\.?)[:\s]+([A-Z0-9\-\/]+)/i,
    /(?:Order[- ]?(?:No\.|#))[:\s]+([A-Z0-9\-\/]+)/i,
    /(?:Aktenzeichen|AZ)[:\s]+([A-Z0-9\-\/]+)/i
  ];
  
  for (const pattern of referencePatterns) {
    const match = text.match(pattern);
    if (match && match[1].length >= 3) { // Mind. 3 Zeichen
      suggestions.push(match[1]);
      break; // Nur erste Nummer verwenden
    }
  }
  
  if (suggestions.length === 0) {
    return originalName;
  }
  
  // Kombiniere zu Dateiname
  const ext = path.extname(originalName);
  const baseName = suggestions.join('_');
  return sanitizeFilename(baseName) + ext;
}

// macOS Benachrichtigung anzeigen
function showNotification(title: string, message: string, sound = false) {
  try {
    const soundArg = sound ? 'sound name "Glass"' : '';
    const script = `display notification "${message.replace(/"/g, '\\"')}" with title "${title.replace(/"/g, '\\"')}" ${soundArg}`;
    execSync(`osascript -e '${script}'`);
  } catch (error) {
    console.error("Benachrichtigung fehlgeschlagen:", error);
  }
}

// macOS Dialog für Bestätigung
function showDialog(message: string, buttons: string[] = ["OK", "Abbrechen"]): string {
  try {
    const buttonList = buttons.map(b => `"${b}"`).join(", ");
    const script = `button returned of (display dialog "${message.replace(/"/g, '\\"')}" buttons {${buttonList}} default button 1)`;
    const result = execSync(`osascript -e '${script}'`, { encoding: 'utf8' });
    return result.trim();
  } catch (error) {
    return "Abbrechen";
  }
}

// Einzelne Datei verarbeiten
async function processFile(
  filePath: string,
  options: { preview: boolean; execute: boolean; silent: boolean }
): Promise<{ success: boolean; renamed: boolean; oldName: string; newName: string; error?: string }> {
  const { preview, execute, silent } = options;
  
  // Validierung
  if (!fs.existsSync(filePath)) {
    return { success: false, renamed: false, oldName: path.basename(filePath), newName: '', error: 'Datei nicht gefunden' };
  }
  
  const ext = path.extname(filePath).toLowerCase();
  const supported = ['.pdf', '.docx', '.pages', '.png', '.jpg', '.jpeg', '.txt'];
  
  if (!supported.includes(ext)) {
    return { success: false, renamed: false, oldName: path.basename(filePath), newName: '', error: `Format ${ext} nicht unterstützt` };
  }
  
  console.log(`\n🔍 Analysiere: ${path.basename(filePath)}`);
  
  // Text extrahieren
  const text = await extractText(filePath);
  
  if (!text || text.trim().length < 10) {
    console.log(`⚠️  Konnte keinen Text extrahieren`);
    return { success: true, renamed: false, oldName: path.basename(filePath), newName: '', error: 'Kein Text gefunden' };
  }
  
  console.log(`✅ Text extrahiert: ${text.length} Zeichen`);
  
  // Namensvorschlag generieren
  const originalName = path.basename(filePath);
  const suggestion = generateSmartFilename(text, originalName, filePath);
  
  console.log(`\n📝 Vorschlag:`);
  console.log(`   Alt: ${originalName}`);
  console.log(`   Neu: ${suggestion}`);
  
  if (originalName === suggestion) {
    console.log(`\n✨ Name ist bereits optimal!`);
    return { success: true, renamed: false, oldName: originalName, newName: suggestion };
  }
  
  if (preview) {
    return { success: true, renamed: false, oldName: originalName, newName: suggestion };
  }
  
  // Umbenennung durchführen
  let shouldRename = execute;
  
  if (!execute && !silent) {
    const response = showDialog(
      `Datei umbenennen?\n\nAlt: ${originalName}\n\nNeu: ${suggestion}`,
      ["Umbenennen", "Abbrechen"]
    );
    shouldRename = response === "Umbenennen";
  }
  
  if (shouldRename) {
    const dir = path.dirname(filePath);
    const newPath = path.join(dir, suggestion);
    
    // Prüfe ob Ziel existiert
    if (fs.existsSync(newPath)) {
      console.error(`❌ Datei existiert bereits: ${suggestion}`);
      return { success: false, renamed: false, oldName: originalName, newName: suggestion, error: 'Ziel existiert bereits' };
    }
    
    try {
      fs.renameSync(filePath, newPath);
      console.log(`\n✅ Erfolgreich umbenannt!`);
      return { success: true, renamed: true, oldName: originalName, newName: suggestion };
    } catch (error) {
      console.error(`❌ Umbenennung fehlgeschlagen:`, error);
      return { success: false, renamed: false, oldName: originalName, newName: suggestion, error: 'Umbenennung fehlgeschlagen' };
    }
  } else {
    console.log(`\n❌ Abgebrochen`);
    return { success: true, renamed: false, oldName: originalName, newName: suggestion };
  }
}

// Hauptfunktion
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
MCP Document Intelligence CLI v1.0

Verwendung:
  mcp-scan <datei> [<datei2> ...]   Analysiert eine oder mehrere Dateien
  mcp-scan <datei> --preview        Analysiert ohne Umbenennung
  mcp-scan <datei> --execute        Benennt automatisch um (ohne Dialog)
  mcp-scan <datei> --silent         Keine Benachrichtigungen

Mehrfachdateien:
  mcp-scan file1.pdf file2.pdf file3.pdf --execute
  mcp-scan ~/Downloads/*.pdf --preview

Beispiele:
  mcp-scan ~/Downloads/scan123.pdf
  mcp-scan invoice.pdf --execute
  mcp-scan document.docx --preview --silent
  mcp-scan *.pdf --execute
`);
    process.exit(0);
  }
  
  const preview = args.includes('--preview');
  const execute = args.includes('--execute');
  const silent = args.includes('--silent');
  
  // Sammle alle Datei-Argumente (keine Flags)
  const filePaths = args.filter(arg => !arg.startsWith('--'));
  
  if (filePaths.length === 0) {
    console.error('❌ Keine Dateien angegeben');
    process.exit(1);
  }
  
  const results = [];
  const options = { preview, execute, silent };
  
  // Mehrere Dateien? Zeige Start-Benachrichtigung
  if (filePaths.length > 1 && !silent) {
    showNotification("MCP Scan Batch", `Verarbeite ${filePaths.length} Dateien`, true);
  }
  
  // Verarbeite alle Dateien
  for (const filePath of filePaths) {
    try {
      const result = await processFile(filePath, options);
      results.push(result);
    } catch (error) {
      console.error(`Fehler bei ${path.basename(filePath)}:`, error);
      results.push({
        success: false,
        renamed: false,
        oldName: path.basename(filePath),
        newName: '',
        error: String(error)
      });
    }
  }
  
  // Zusammenfassung bei mehreren Dateien
  if (filePaths.length > 1) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 ZUSAMMENFASSUNG - ${filePaths.length} Dateien verarbeitet`);
    console.log(`${'='.repeat(60)}\n`);
    
    const successful = results.filter(r => r.success).length;
    const renamed = results.filter(r => r.renamed).length;
    const skipped = results.filter(r => r.success && !r.renamed).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`✅ Erfolgreich: ${successful}`);
    console.log(`📝 Umbenannt: ${renamed}`);
    console.log(`⏭️  Übersprungen: ${skipped}`);
    console.log(`❌ Fehler: ${failed}\n`);
    
    if (renamed > 0) {
      console.log(`Umbenannte Dateien:`);
      results.forEach(r => {
        if (r.renamed) {
          console.log(`  • ${r.oldName}`);
          console.log(`    → ${r.newName}`);
        }
      });
    }
    
    if (failed > 0) {
      console.log(`\nFehlerhafte Dateien:`);
      results.forEach(r => {
        if (!r.success) {
          console.log(`  • ${r.oldName}: ${r.error}`);
        }
      });
    }
    
    if (!silent) {
      const message = `${renamed} umbenannt, ${skipped} übersprungen, ${failed} Fehler`;
      showNotification("MCP Scan Abgeschlossen", message, true);
    }
  } else {
    // Einzeldatei-Benachrichtigungen
    const result = results[0];
    if (!silent) {
      if (result.renamed) {
        showNotification("MCP Scan Erfolg", `Umbenannt zu:\n${result.newName}`, true);
      } else if (result.success && !result.error) {
        showNotification("MCP Scan", result.oldName === result.newName ? "Name ist bereits optimal" : `Vorschlag: ${result.newName}`);
      } else if (result.error) {
        showNotification("MCP Scan Fehler", result.error);
      }
    }
  }
}

main().catch(error => {
  console.error("Fehler:", error);
  process.exit(1);
});
