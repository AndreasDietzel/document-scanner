#!/usr/bin/env node

/**
 * Document Scanner CLI
 * Standalone tool for quick file analysis and renaming
 */

import * as fs from "fs";
import * as path from "path";
import { createRequire } from "module";
import mammoth from "mammoth";
import AdmZip from "adm-zip";
import { execSync } from "child_process";
import chalk from "chalk";
import { loadConfig, mergeWithCLI, ScanConfig, configExists, getConfigPath } from './config.js';
import { recordRename, undoLastBatch, getUndoStats } from './undo.js';
import { runSetupWizard } from './setup.js';
import { analyzeDocumentWithAI, buildFilenameFromAI, isAIEnabled, selectDocumentDateWithAI, analyzeDocumentImageWithClaude, AIConfig, ClaudeConfig } from './ai-analysis.js';
import {
  validateFilePath,
  sanitizeFilename as secSanitizeFilename,
  validateApiKey,
  checkConfigPermissions,
  validateEnvironment,
  secureCleanup,
  SECURITY_LIMITS
} from './security.js';

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

/**
 * Build AIConfig from ScanConfig based on selected provider
 */
function getAIConfig(config: ScanConfig): AIConfig | null {
  const provider = config.aiProvider || 'perplexity';
  if (provider === 'claude' && config.claudeApiKey) {
    return {
      provider: 'claude',
      apiKey: config.claudeApiKey,
      model: config.claudeModel,
    };
  }
  if (config.perplexityApiKey) {
    return {
      provider: 'perplexity',
      apiKey: config.perplexityApiKey,
      model: config.perplexityModel,
    };
  }
  return null;
}

// Global verbose flag
let VERBOSE = false;
let CONFIG: ScanConfig;

// Manche gescannte PDFs (v.a. aus iCloud) brauchen deutlich >30s für pdftoppm/tesseract.
const OCR_TIMEOUT_MS = 60000;

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

function buildUnreadableSuggestion(originalName: string): string {
  const ext = path.extname(originalName);
  const nameWithoutExt = path.basename(originalName, ext);
  const hasUnreadableSuffix = /\(unlesbar\)$/i.test(nameWithoutExt.trim());
  const cleanName = hasUnreadableSuffix ? nameWithoutExt : `${nameWithoutExt} (unlesbar)`;
  return `${cleanName}${ext}`;
}

// Opt-20: Enhanced filename validation
function validateFilename(filename: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!filename || filename.trim().length === 0) {
    errors.push('Dateiname ist leer');
    return { valid: false, errors };
  }
  
  // Check length (macOS/Windows limit: 255 bytes)
  if (filename.length > 255) {
    errors.push(`Dateiname zu lang (${filename.length} > 255 Zeichen)`);
  }
  
  // Check for illegal characters
  const illegalChars = /[<>:"|?*\x00-\x1F]/;
  if (illegalChars.test(filename)) {
    errors.push('Enth\u00e4lt ung\u00fcltige Zeichen (<>:"|?*)');
  }
  
  // Check for reserved names (Windows)
  const reserved = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$/i;
  const basename = filename.replace(/\.[^.]+$/, '');
  if (reserved.test(basename)) {
    errors.push('Reservierter Systemname (CON, PRN, etc.)');
  }
  
  // Check for trailing dots/spaces (Windows issue)
  if (/[.\s]$/.test(filename.replace(/\.[^.]+$/, ''))) {
    errors.push('Darf nicht mit Punkt oder Leerzeichen enden');
  }
  
  // Check for leading dots (hidden files warning)
  if (filename.startsWith('.') && filename !== '.' && filename !== '..') {
    if (VERBOSE) console.log(chalk.yellow('\u26a0\ufe0f  Hinweis: Datei beginnt mit Punkt (versteckte Datei)'));
  }
  
  return { valid: errors.length === 0, errors };
}

// OCR Detection für gescannte PDFs/Bilder
async function extractTextWithOCR(filePath: string, config: ScanConfig): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  const ocrLang = config.ocrLanguage || 'deu';
  
  try {
    if (ext === '.pdf') {
      // Erst normalen PDF-Text versuchen
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer, { max: 5 });
      
      if (data.text && data.text.trim().length > 50) {
        return data.text;
      }
      
      // Fallback zu OCR wenn wenig Text (gescanntes PDF)
      if (config.enableOCR) {
        if (VERBOSE) console.log(chalk.yellow("⚠️  PDF hat wenig Text, verwende OCR..."));
        
        try {
          // Prüfe ob pdftoppm verfügbar ist
          execSync('pdftoppm -v', { stdio: 'ignore' });
          execSync('tesseract --version', { stdio: 'ignore' });
          
          const tempDir = '/tmp';
          const timestamp = Date.now();
          
          // WORKAROUND: Kopiere PDF nach /tmp um Probleme mit komplexen Pfaden (iCloud, Spaces) zu vermeiden
          const tempPdf = path.join(tempDir, `input-pdf-${timestamp}.pdf`);
          fs.copyFileSync(filePath, tempPdf);
          
          const tempPdfBase = `input-pdf-${timestamp}.pdf`;
          const tempPngBase = `pdf-page-${timestamp}`;
          const tempOcrBase = `ocr-${timestamp}`;
          const tempPng = path.join(tempDir, tempPngBase);
          const tempOcr = path.join(tempDir, tempOcrBase);
          
          // Konvertiere erste Seite zu PNG (-singlefile = nur erste Seite, -png = PNG Format)
          // Benutze relative Pfade mit cwd=/tmp für bessere Kompatibilität
          const convertCmd = `pdftoppm -singlefile -png "${tempPdfBase}" "${tempPngBase}"`;
          execSync(convertCmd, { timeout: OCR_TIMEOUT_MS, cwd: tempDir, encoding: 'utf8' });
          
          const pngFile = `${tempPng}.png`;
          
          if (!fs.existsSync(pngFile)) {
            if (VERBOSE) console.log(chalk.red("❌ PDF-zu-Bild Konvertierung fehlgeschlagen"));
            return "";
          }
          
          // OCR auf PNG anwenden (--psm 1 = Automatic page segmentation with OSD)
          const pngFileBase = `${tempPngBase}.png`;
          const ocrCmd = `tesseract "${pngFileBase}" "${tempOcrBase}" -l ${ocrLang} --psm 1`;
          if (VERBOSE) console.log(chalk.gray(`   Führe aus: ${ocrCmd}`));
          execSync(ocrCmd, { timeout: OCR_TIMEOUT_MS, cwd: tempDir, encoding: 'utf8' });
          
          const ocrText = fs.readFileSync(`${tempOcr}.txt`, 'utf8');
          
          // Cleanup
          try {
            fs.unlinkSync(tempPdf);
            fs.unlinkSync(pngFile);
            fs.unlinkSync(`${tempOcr}.txt`);
          } catch (cleanupError) {
            // Ignore cleanup errors
          }
          
          if (VERBOSE && ocrText.trim().length > 0) {
            console.log(chalk.green(`✅ OCR erfolgreich: ${ocrText.trim().length} Zeichen extrahiert`));
          }
          
          return ocrText.trim();
        } catch (ocrError) {
          if (VERBOSE) {
            console.log(chalk.yellow("⚠️  OCR fehlgeschlagen:"));
            console.log(chalk.red(`   Fehler: ${ocrError instanceof Error ? ocrError.message : String(ocrError)}`));
            console.log(chalk.gray("   Stelle sicher dass poppler und tesseract installiert sind:"));
            console.log(chalk.gray("   brew install poppler tesseract tesseract-lang"));
          }
        }
      }
    }
    
    // OCR für Bilder (direkt ohne PDF-Konvertierung)
    if (['.png', '.jpg', '.jpeg', '.tiff', '.bmp'].includes(ext)) {
      if (config.enableOCR) {
        try {
          execSync('tesseract --version', { stdio: 'ignore' });
          
          const tempOutput = path.join('/tmp', `ocr-${Date.now()}`);
          const cmd = `tesseract "${filePath}" "${tempOutput}" -l ${ocrLang} --psm 1 2>/dev/null`;
          
          execSync(cmd, { timeout: OCR_TIMEOUT_MS });
          
          const ocrText = fs.readFileSync(`${tempOutput}.txt`, 'utf8');
          
          // Cleanup
          try {
            fs.unlinkSync(`${tempOutput}.txt`);
          } catch (cleanupError) {
            // Ignore cleanup errors
          }
          
          if (VERBOSE && ocrText.trim().length > 0) {
            console.log(chalk.green(`✅ OCR erfolgreich: ${ocrText.trim().length} Zeichen extrahiert`));
          }
          
          return ocrText.trim();
        } catch (ocrError) {
          if (VERBOSE) {
            console.log(chalk.yellow("⚠️  OCR nicht verfügbar. Installiere mit:"));
            console.log(chalk.gray("   brew install tesseract tesseract-lang"));
          }
        }
      }
    }
  } catch (error) {
    if (VERBOSE) console.error(chalk.red("❌ Fehler bei Textextraktion:"), error);
  }
  
  return "";
}

// macOS textutil — extrahiert Klartext aus .doc, .docx, .rtf, .odt
function extractWithTextutil(filePath: string): string | null {
  try {
    execSync('which textutil', { stdio: 'ignore' });
    const result = execSync(`textutil -convert txt -stdout "${filePath}"`, {
      timeout: 15000,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    if (result && result.trim().length > 10) {
      if (VERBOSE) console.log(chalk.green(`✅ textutil: ${result.trim().length} Zeichen extrahiert`));
      return result.trim();
    }
  } catch (error) {
    if (VERBOSE) console.log(chalk.gray('   textutil fehlgeschlagen oder nicht verfügbar'));
  }
  return null;
}

// Extrahiere lesbaren Text aus Apple IWA (Protobuf) Dateien (Pages/Numbers/Keynote)
function extractTextFromIWA(data: Buffer): string {
  // IWA nutzt Snappy-ähnliches Framing: 1 Byte Typ + 3 Bytes Länge (LE) + Payload
  let raw = Buffer.alloc(0);
  let pos = 0;
  try {
    while (pos < data.length) {
      if (pos + 4 > data.length) break;
      pos += 1; // frame type
      const frameLen = data[pos] | (data[pos + 1] << 8) | (data[pos + 2] << 16);
      pos += 3;
      if (pos + frameLen > data.length) break;
      raw = Buffer.concat([raw, data.subarray(pos, pos + frameLen)]);
      pos += frameLen;
    }
  } catch {
    raw = Buffer.from(data); // Fallback: rohe Daten verwenden
  }
  
  // Extrahiere lesbare UTF-8 Strings (mind. 8 Zeichen) aus den Protobuf-Daten
  const textParts: string[] = [];
  const regex = /[\x20-\x7e\u00c0-\u024f]{8,}/g;
  const rawStr = raw.toString('latin1');
  let match;
  while ((match = regex.exec(rawStr)) !== null) {
    const s = match[0];
    // Filtere UUIDs, technische IDs und Füllzeichen
    if (/^[i]+$/.test(s)) continue;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}/.test(s)) continue;
    if (/^[A-Z0-9_]{20,}$/.test(s)) continue;
    textParts.push(s);
  }
  
  return textParts.join(' ');
}

// Extrahiere Text aus verschiedenen Formaten
async function extractText(filePath: string, config: ScanConfig): Promise<string> {
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
      return await extractTextWithOCR(filePath, config);
    }
    
    // Microsoft Word
    if (ext === '.docx' || ext === '.doc') {
      try {
        const result = await mammoth.extractRawText({ path: filePath });
        if (result.value && result.value.trim().length > 10) {
          return result.value;
        }
      } catch (docError) {
        // mammoth scheitert oft bei .doc — weiter zum textutil Fallback
      }
      // Fallback: macOS textutil (unterstützt .doc und .docx nativ)
      const textutilResult = extractWithTextutil(filePath);
      if (textutilResult) return textutilResult;
      if (VERBOSE) {
        console.log(chalk.yellow(`⚠️  ${ext}-Datei konnte weder mit mammoth noch textutil gelesen werden`));
      }
      return '';
    }
    
    // Microsoft Excel
    if (ext === '.xls' || ext === '.xlsx') {
      if (VERBOSE) console.log(chalk.yellow('⚠️  Excel-Datei - kein Text extrahierbar (nutze Dateinamen)'));
      return '';
    }
    
    // Microsoft PowerPoint
    if (ext === '.ppt' || ext === '.pptx') {
      if (VERBOSE) console.log(chalk.yellow('⚠️  PowerPoint-Datei - kein Text extrahierbar (nutze Dateinamen)'));
      return '';
    }
    
    // Apple Numbers / Keynote — Protobuf-Format, kein Klartext extrahierbar
    if (ext === '.numbers' || ext === '.keynote') {
      if (VERBOSE) console.log(chalk.yellow(`⚠️  ${ext.slice(1).charAt(0).toUpperCase() + ext.slice(2)}-Datei — kein Klartext extrahierbar, nutze Dateinamen`));
      return '';
    }
    
    // OpenOffice/LibreOffice — textutil kann .odt lesen
    if (ext === '.odt' || ext === '.ods' || ext === '.odp') {
      if (ext === '.odt') {
        const textutilResult = extractWithTextutil(filePath);
        if (textutilResult) return textutilResult;
      }
      if (VERBOSE) {
        const type = ext === '.odt' ? 'Text' : ext === '.ods' ? 'Tabelle' : 'Präsentation';
        console.log(chalk.yellow(`⚠️  OpenOffice ${type}-Datei - kein Text extrahierbar`));
      }
      return '';
    }
    
    // Archive
    if (ext === '.rar' || ext === '.zip' || ext === '.7z') {
      if (VERBOSE) console.log(chalk.yellow('⚠️  Archive-Datei - kein Text extrahierbar'));
      return '';
    }
    
    // RTF — macOS textutil extrahiert Klartext
    if (ext === '.rtf') {
      const textutilResult = extractWithTextutil(filePath);
      if (textutilResult) return textutilResult;
      // Fallback: RTF-Tags manuell strippen
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const stripped = raw.replace(/\{\\[^{}]*\}/g, '').replace(/\\[a-z]+\d*\s?/gi, '').replace(/[{}]/g, '');
        if (stripped.trim().length > 10) return stripped;
      } catch (e) { /* ignore */ }
      if (VERBOSE) console.log(chalk.yellow('⚠️  RTF-Datei konnte nicht gelesen werden'));
      return '';
    }
    
    // Apple Pages — ZIP mit index.xml (älteres Format) oder Protobuf/IWA (neueres)
    if (ext === '.pages') {
      try {
        const zip = new AdmZip(filePath);
        const entries = zip.getEntries();
        
        // Älteres Format: index.xml enthält Klartext
        const indexEntry = entries.find(e => e.entryName === 'index.xml');
        if (indexEntry) {
          return indexEntry.getData().toString('utf8');
        }
        
        // Neueres Format: Document.iwa enthält Protobuf mit Textfragmenten
        const docEntry = entries.find(e => e.entryName === 'Index/Document.iwa');
        if (docEntry) {
          const iwaData = docEntry.getData();
          const text = extractTextFromIWA(iwaData);
          if (text.length > 10) {
            if (VERBOSE) console.log(chalk.green(`✅ Pages IWA-Extraktion: ${text.length} Zeichen`));
            return text;
          }
        }
      } catch (zipError) {
        if (VERBOSE) console.log(chalk.gray('   Pages ZIP-Extraktion fehlgeschlagen'));
      }
      if (VERBOSE) console.log(chalk.yellow('⚠️  Pages-Datei konnte nicht gelesen werden'));
      return '';
    }
    
    if (['.png', '.jpg', '.jpeg'].includes(ext)) {
      return await extractTextWithOCR(filePath, config);
    }
  } catch (error) {
    if (VERBOSE) console.error(chalk.red(`Fehler beim Lesen:`), error);
  }
  
  return "";
}



// Intelligente Namensvorschläge (mit AI oder Fallback auf Pattern-Matching)
async function generateSmartFilename(text: string, originalName: string, filePath: string): Promise<string> {
  const ext = path.extname(originalName);
  
  // Get timestamp (always first component)
  const timestamp = await extractTimestamp(originalName, filePath, text);
  
  // Try AI-based analysis first if enabled
  const aiConfig = CONFIG ? getAIConfig(CONFIG) : null;
  if (CONFIG?.enableAI && aiConfig) {
    try {
      const aiAnalysis = await analyzeDocumentWithAI(
        text,
        { ...aiConfig, temperature: 0.2 },
        VERBOSE
      );
      
      if (aiAnalysis && aiAnalysis.confidence >= (CONFIG.aiConfidenceThreshold || 0.5)) {
        const aiFilename = buildFilenameFromAI(aiAnalysis, timestamp, ext);
        
        if (VERBOSE) {
          console.log(chalk.magenta(`🤖 AI-Vorschlag (${(aiAnalysis.confidence * 100).toFixed(0)}% Konfidenz): ${aiFilename}`));
        }
        
        return aiFilename;
      } else if (aiAnalysis && VERBOSE) {
        console.log(chalk.yellow(`⚠️  AI-Konfidenz zu niedrig (${(aiAnalysis.confidence * 100).toFixed(0)}%), nutze Pattern-Matching`));
      }
    } catch (error) {
      if (VERBOSE) {
        console.log(chalk.yellow('⚠️  AI-Analyse fehlgeschlagen, nutze Pattern-Matching'));
      }
    }
  }
  
  // Fallback: Pattern-based analysis (only used when AI is disabled/unavailable/low-confidence)
  // Note: AI can recognize ANY company, not just those in the predefined list
  if (VERBOSE && !CONFIG?.enableAI) {
    console.log(chalk.yellow('💡 Tipp: Aktiviere AI (--setup) für bessere Firmenerkennung'));
  }
  return generateSmartFilenamePatternBased(text, originalName, filePath, timestamp, ext);
}

// Extract timestamp from various sources
async function extractTimestamp(originalName: string, filePath: string, text: string): Promise<string> {
  // 1. Scanner-Zeitstempel behalten (falls vorhanden)
  const scannerMatch = originalName.match(/(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})/);
  if (scannerMatch) {
    return scannerMatch[1].substring(0, 10); // Only date part
  }
  
  // 2. Datum aus Briefkopf (erste 1000 Zeichen) - sammle alle Daten (außer Geburtsdatum)
  const textStart = text.substring(0, 1000);
  const dateMatches = textStart.matchAll(/(\d{2}\.\d{2}\.\d{4})/g);
  const foundDates: string[] = [];
  
  for (const match of dateMatches) {
    const foundDate = match[1];
    
    // Skip if this is the user's birth date (configured to prevent false positives)
    if (CONFIG?.birthDate && foundDate === CONFIG.birthDate) {
      if (VERBOSE) {
        console.log(chalk.yellow(`⚠️  Überspringe Geburtsdatum (${foundDate}) - nicht als Dokumentdatum verwenden`));
      }
      continue; // Try next date match
    }
    
    foundDates.push(foundDate);
  }
  
  // If multiple dates found and AI enabled, ask AI to choose the best one
  const dateAiConfig = CONFIG ? getAIConfig(CONFIG) : null;
  if (foundDates.length > 1 && CONFIG?.enableAI && dateAiConfig) {
    try {
      const aiSelectedDate = await selectDocumentDateWithAI(
        text,
        foundDates,
        dateAiConfig,
        VERBOSE
      );
      
      if (aiSelectedDate) {
        const [day, month, year] = aiSelectedDate.split('.');
        return `${year}-${month}-${day}`;
      }
    } catch (error) {
      // Continue with first date as fallback
    }
  }
  
  // Use first found date (if any)
  if (foundDates.length > 0) {
    const [day, month, year] = foundDates[0].split('.');
    return `${year}-${month}-${day}`;
  }
  
  // 3. ISO Format
  const isoMatch = textStart.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) {
    return isoMatch[1];
  }
  
  // 4. Fallback: Erstelldatum
  try {
    const stats = fs.statSync(filePath);
    const birthtime = stats.birthtime;
    const year = birthtime.getFullYear();
    const month = String(birthtime.getMonth() + 1).padStart(2, '0');
    const day = String(birthtime.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (error) {
    return '';
  }
}

// Pattern-based filename generation (original logic)
function generateSmartFilenamePatternBased(
  text: string, 
  originalName: string, 
  filePath: string,
  timestamp: string,
  ext: string
): string {
  const suggestions: string[] = [];
  
  // 1. Timestamp
  if (timestamp) {
    suggestions.push(timestamp);
  }
  
  // 2. Firmen/Absender (nur Fallback - AI erkennt ALLE Firmen, nicht nur diese Liste!)
  // Diese Liste wird nur verwendet wenn AI nicht verfügbar ist oder niedrige Konfidenz hat
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
    'PayPal', 'N26', 'ING', 'DKB', 'KfW', 'KfW Bankengruppe',
    // Sonstiges
    'Lufthansa', 'Deutsche Bahn', 'ADAC', 'eBay', 'Otto',
    // Custom companies from config
    ...(CONFIG?.customCompanies || [])
  ];
  
  let detectedCompany: string | null = null;
  for (const company of companies) {
    if (text.includes(company)) {
      detectedCompany = company;
      suggestions.push(company.replace(/\s+/g, '_'));
      break;
    }
  }
  
  // 3. Dokumenttyp (spezifischere Typen zuerst!)
  const docTypes: { [key: string]: string } = {
    'Rahmenkreditvertrag': 'Rahmenkreditvertrag',
    'Kreditvertrag': 'Kreditvertrag',
    'Kontoauszug': 'Kontoauszug',
    'Lieferschein': 'Lieferschein',
    'Rechnung': 'Rechnung',
    'Invoice': 'Rechnung',
    'Vertrag': 'Vertrag',
    'Contract': 'Vertrag',
    'Bescheid': 'Bescheid',
    'Mahnung': 'Mahnung',
    'Kündigung': 'Kuendigung',
    'Bestellung': 'Bestellung',
    'Angebot': 'Angebot',
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
  
  // Wenn keine Daten gefunden: Originalname mit Hinweis beibehalten
  if (suggestions.length === 0) {
    const nameWithoutExt = path.basename(originalName, ext);
    return `${nameWithoutExt} (nicht_klassifizierbar)${ext}`;
  }
  
  // Wenn nur Datum, aber keine Firma/Typ: Hinweis hinzufügen
  if (suggestions.length === 1 && timestamp && suggestions[0] === timestamp) {
    const nameWithoutExt = path.basename(originalName, ext);
    // Behalte originalen Namen und füge nur Datum hinzu wenn nicht schon vorhanden
    if (!originalName.match(/^\d{4}-\d{2}-\d{2}/)) {
      return `${timestamp}_${nameWithoutExt.replace(/^\d{4}-\d{2}-\d{2}[_-]?/, '')}${ext}`;
    }
    return originalName;
  }
  
  // Kombiniere zu Dateiname
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
    if (VERBOSE) console.error(chalk.red("Benachrichtigung fehlgeschlagen:"), error);
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

// Extrahiere erste Seite als Bild für Claude Vision
async function extractImageForVision(
  filePath: string,
  ext: string
): Promise<{ base64: string; mediaType: 'image/jpeg' | 'image/png'; tempPath?: string } | null> {
  try {
    if (ext === '.pdf') {
      execSync('pdftoppm -v', { stdio: 'ignore' });
      const tempBase = path.join('/tmp', `vision-${Date.now()}`);
      const tempPdf = `${tempBase}-input.pdf`;
      fs.copyFileSync(filePath, tempPdf);
      execSync(`pdftoppm -singlefile -png "${path.basename(tempPdf)}" "${path.basename(tempBase)}"`, {
        cwd: '/tmp',
        timeout: OCR_TIMEOUT_MS
      });
      const pngPath = `${tempBase}.png`;
      if (!fs.existsSync(pngPath)) return null;
      const base64 = fs.readFileSync(pngPath).toString('base64');
      fs.unlinkSync(tempPdf);
      return { base64, mediaType: 'image/png', tempPath: pngPath };
    }

    if (['.png'].includes(ext)) {
      const base64 = fs.readFileSync(filePath).toString('base64');
      return { base64, mediaType: 'image/png' };
    }

    if (['.jpg', '.jpeg'].includes(ext)) {
      const base64 = fs.readFileSync(filePath).toString('base64');
      return { base64, mediaType: 'image/jpeg' };
    }
  } catch (error) {
    if (VERBOSE) console.log(chalk.gray('   Vision-Bildextraktion fehlgeschlagen'));
  }
  return null;
}

// Einzelne Datei verarbeiten
async function processFile(
  filePath: string,
  config: ScanConfig,
  options: { preview: boolean; execute: boolean; silent: boolean }
): Promise<{ success: boolean; renamed: boolean; oldName: string; newName: string; error?: string }> {
  const { preview, execute, silent } = options;
  
  // Security Validierung
  const fileValidation = validateFilePath(filePath);
  if (!fileValidation.valid) {
    console.error(chalk.red(`❌ Security: ${fileValidation.error}`));
    return { 
      success: false, 
      renamed: false, 
      oldName: path.basename(filePath), 
      newName: '', 
      error: fileValidation.error 
    };
  }
  
  // Resolve to absolute path for consistency
  filePath = path.resolve(filePath);
  
  // Basic file checks (redundant but kept for backward compatibility)
  if (!fs.existsSync(filePath)) {
    console.error(chalk.red(`\u274c Datei nicht gefunden: ${VERBOSE ? filePath : path.basename(filePath)}`));
    return { success: false, renamed: false, oldName: path.basename(filePath), newName: '', error: 'Datei nicht gefunden' };
  }
  
  const ext = path.extname(filePath).toLowerCase();
  const supported = [
    '.pdf', '.txt', '.rtf',
    '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',  // MS Office
    '.pages', '.numbers', '.keynote',  // Apple
    '.odt', '.ods', '.odp',  // OpenOffice
    '.png', '.jpg', '.jpeg',  // Images
    '.rar', '.zip', '.7z'  // Archives
  ];
  
  if (!supported.includes(ext)) {
    console.error(chalk.red(`\u274c Format ${ext} nicht unterst\u00fctzt`));
    return { success: false, renamed: false, oldName: path.basename(filePath), newName: '', error: `Format ${ext} nicht unterst\u00fctzt` };
  }
  
  console.log(chalk.blue(`\n\ud83d\udd0d Analysiere: ${path.basename(filePath)}`));
  
  // Text extrahieren
  const text = await extractText(filePath, config);
  
  if (!text || text.trim().length < 10) {
    const originalName = path.basename(filePath);
    const ext = path.extname(originalName);

    // Claude Vision Fallback für image-basierte PDFs und Bilder
    const aiConfig = CONFIG ? getAIConfig(CONFIG) : null;
    if (CONFIG?.enableAI && aiConfig?.provider === 'claude') {
      if (VERBOSE) console.log(chalk.gray('📷 Kein Text gefunden, versuche Claude Vision...'));
      const imageData = await extractImageForVision(filePath, ext);
      if (imageData) {
        const visionAnalysis = await analyzeDocumentImageWithClaude(
          imageData.base64,
          imageData.mediaType,
          aiConfig as ClaudeConfig,
          VERBOSE
        );
        if (imageData.tempPath) {
          try { fs.unlinkSync(imageData.tempPath); } catch { /* ignore */ }
        }
        if (visionAnalysis && visionAnalysis.confidence >= (CONFIG.aiConfidenceThreshold || 0.5)) {
          const timestamp = await extractTimestamp(originalName, filePath, '');
          const suggestion = buildFilenameFromAI(visionAnalysis, timestamp, ext);

          if (VERBOSE) {
            console.log(chalk.magenta(`🤖 Vision-Vorschlag (${(visionAnalysis.confidence * 100).toFixed(0)}% Konfidenz): ${suggestion}`));
          }

          console.log(chalk.cyan(`\n📝 Vorschlag:`));
          console.log(chalk.gray(`   Alt: ${originalName}`));
          console.log(chalk.green(`   Neu: ${suggestion}`));

          if (preview) return { success: true, renamed: false, oldName: originalName, newName: suggestion };

          let shouldRename = execute;
          if (!execute && !silent) {
            const response = showDialog(
              `Datei umbenennen?\n\nAlt: ${originalName}\n\nNeu: ${suggestion}`,
              ['Umbenennen', 'Abbrechen']
            );
            shouldRename = response === 'Umbenennen';
          }

          if (shouldRename) {
            const dir = path.dirname(filePath);
            const newPath = path.join(dir, suggestion);
            if (fs.existsSync(newPath)) {
              console.error(chalk.red(`❌ Datei existiert bereits: ${suggestion}`));
              return { success: false, renamed: false, oldName: originalName, newName: suggestion, error: 'Ziel existiert bereits' };
            }
            try {
              fs.renameSync(filePath, newPath);
              recordRename(filePath, newPath);
              console.log(chalk.green(`\n✅ Erfolgreich umbenannt!`));
              return { success: true, renamed: true, oldName: originalName, newName: path.basename(newPath) };
            } catch {
              return { success: false, renamed: false, oldName: originalName, newName: suggestion, error: 'Umbenennung fehlgeschlagen' };
            }
          }
          return { success: true, renamed: false, oldName: originalName, newName: suggestion };
        }
      }
    }

    console.log(chalk.yellow(`⚠️  Konnte keinen Text extrahieren - behalte Dateinamen mit Hinweis`));

    // Originalnamen beibehalten mit Zusatz "(unlesbar)" (ohne doppeltes Suffix)
    const suggestion = buildUnreadableSuggestion(originalName);
    
    console.log(chalk.cyan(`\n📝 Vorschlag:`));
    console.log(chalk.gray(`   Alt: ${originalName}`));
    console.log(chalk.yellow(`   Neu: ${suggestion}`));
    
    if (preview) {
      return { success: true, renamed: false, oldName: originalName, newName: suggestion };
    }
    
    // Optional umbenennen; falls Name bereits identisch ist, nichts tun.
    let shouldRename = execute;

    if (!execute && !silent && originalName !== suggestion) {
      const response = showDialog(
        `Dokument unlesbar - Hinweis einfügen?\n\nAlt: ${originalName}\n\nNeu: ${suggestion}`,
        ["Umbenennen", "Skip"]
      );
      shouldRename = response === "Umbenennen";
    }

    if (shouldRename && originalName !== suggestion) {
      const dir = path.dirname(filePath);
      const newPath = path.join(dir, suggestion);

      if (fs.existsSync(newPath)) {
        console.log(chalk.yellow(`⚠️  Zieldatei existiert bereits: ${suggestion}`));
        return { success: true, renamed: false, oldName: originalName, newName: suggestion };
      }

      try {
        fs.renameSync(filePath, newPath);
        recordRename(filePath, newPath);
        console.log(chalk.green(`\n✅ Hinweis "(unlesbar)" hinzugefügt`));
        return { success: true, renamed: true, oldName: originalName, newName: suggestion };
      } catch (error) {
        console.log(chalk.yellow(`⚠️  Umbenennung übersprungen`));
        return { success: true, renamed: false, oldName: originalName, newName: suggestion };
      }
    }
    
    return { success: true, renamed: false, oldName: originalName, newName: suggestion };
  }
  
  if (VERBOSE) {
    console.log(chalk.green(`\u2705 Text extrahiert: ${text.length} Zeichen`));
    console.log(chalk.gray('Vorschau:'), text.substring(0, 200).replace(/\n/g, ' ') + '...');
  } else {
    console.log(chalk.green(`\u2705 Text extrahiert: ${text.length} Zeichen`));
  }
  
  // Namensvorschlag generieren
  const originalName = path.basename(filePath);
  const suggestion = await generateSmartFilename(text, originalName, filePath);
  
  // Opt-20: Validate generated filename
  const validation = validateFilename(suggestion);
  if (!validation.valid) {
    console.error(chalk.red(`\u274c Generierter Name ung\u00fcltig:`));
    validation.errors.forEach(err => console.error(chalk.red(`  \u2022 ${err}`)));
    return { success: false, renamed: false, oldName: originalName, newName: suggestion, error: validation.errors.join(', ') };
  }
  
  console.log(chalk.cyan(`\n\ud83d\udcdd Vorschlag:`));
  console.log(chalk.gray(`   Alt: ${originalName}`));
  console.log(chalk.green(`   Neu: ${suggestion}`));
  
  if (originalName === suggestion) {
    console.log(chalk.green(`\n\u2728 Name ist bereits optimal!`));
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
      console.error(chalk.red(`\u274c Datei existiert bereits: ${suggestion}`));
      return { success: false, renamed: false, oldName: originalName, newName: suggestion, error: 'Ziel existiert bereits' };
    }
    
    try {
      fs.renameSync(filePath, newPath);      
      // Opt-17: Record rename for undo functionality
      recordRename(filePath, newPath);
      
      console.log(chalk.green(`\n✅ Erfolgreich umbenannt!`));
      if (VERBOSE) {
        console.log(chalk.gray(`   Von: ${filePath}`));
        console.log(chalk.gray(`   Nach: ${newPath}`));
      }
      
      return { success: true, renamed: true, oldName: originalName, newName: path.basename(newPath) };
    } catch (error) {
      console.error(chalk.red(`\u274c Umbenennung fehlgeschlagen:`), VERBOSE ? error : '');
      return { success: false, renamed: false, oldName: originalName, newName: suggestion, error: 'Umbenennung fehlgeschlagen' };
    }
  } else {
    console.log(chalk.yellow(`\n\u274c Abgebrochen`));
    return { success: true, renamed: false, oldName: originalName, newName: suggestion };
  }
}

// Hauptfunktion
async function main() {
  const args = process.argv.slice(2);
  
  // Security: Check environment
  const envCheck = validateEnvironment();
  if (!envCheck.secure && VERBOSE) {
    envCheck.warnings.forEach(w => console.log(chalk.yellow(w)));
  }
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
${chalk.bold.cyan('Document Scanner CLI v2.4.1')}

${chalk.bold('Verwendung:')}
  doc-scan <datei> [<datei2> ...]   Analysiert eine oder mehrere Dateien
  doc-scan <datei> --preview        Analysiert ohne Umbenennung
  doc-scan <datei> --execute        Benennt automatisch um (ohne Dialog)
  doc-scan <datei> --silent         Keine Benachrichtigungen
  doc-scan <datei> --verbose        Detaillierte Debug-Ausgabe

${chalk.bold('Spezial-Befehle:')}
  doc-scan --setup                  Interaktiver Setup-Wizard
  doc-scan --undo                   Macht letzte Batch-Umbenennung rückgängig
  doc-scan --undo-stats             Zeigt Undo-Statistiken

${chalk.bold('Mehrfachdateien:')}
  doc-scan file1.pdf file2.pdf file3.pdf --execute
  doc-scan ~/Downloads/*.pdf --preview

${chalk.bold('Beispiele:')}
  doc-scan ~/Downloads/scan123.pdf
  doc-scan invoice.pdf --execute
  doc-scan document.docx --preview --silent
  doc-scan *.pdf --execute --verbose
`);
    process.exit(0);
  }
  
  // Opt-13: Handle --setup command
  if (args.includes('--setup')) {
    await runSetupWizard();
    process.exit(0);
  }
  
  // Opt-17: Handle --undo command
  if (args.includes('--undo')) {
    console.log(chalk.cyan('\\n🔄 Mache letzte Batch-Umbenennung rückgängig...\\n'));
    const result = undoLastBatch();
    
    if (result.success > 0) {
      console.log(chalk.green(`✅ ${result.success} Datei(en) wiederhergestellt`));
    }
    if (result.failed > 0) {
      console.log(chalk.red(`❌ ${result.failed} Fehler:`));
      result.errors.forEach(err => console.log(chalk.red(`  • ${err}`)));
    }
    if (result.success === 0 && result.failed === 0) {
      console.log(chalk.yellow('⚠️  Keine Operationen zum Rückgängigmachen'));
    }
    console.log();
    process.exit(result.failed > 0 ? 1 : 0);
  }
  
  // Handle --undo-stats command
  if (args.includes('--undo-stats')) {
    const stats = getUndoStats();
    console.log(chalk.cyan('\\n📊 Undo-Statistiken:\\n'));
    console.log(chalk.gray(`  Gesamt-Operationen: ${stats.totalOperations}`));
    console.log(chalk.gray(`  Letzte Batch-Größe: ${stats.lastBatchSize}`));
    if (stats.lastBatchTime) {
      console.log(chalk.gray(`  Letzte Batch-Zeit:  ${stats.lastBatchTime.toLocaleString('de-DE')}`));
    }
    console.log();
    process.exit(0);
  }
  
  // Opt-01: Load configuration
  CONFIG = loadConfig();
  
  // Security: Check config file permissions
  const configPath = getConfigPath();
  if (fs.existsSync(configPath)) {
    const permCheck = checkConfigPermissions(configPath);
    if (!permCheck.secure && VERBOSE) {
      console.log(chalk.yellow(`⚠️  ${permCheck.warning}`));
    }
  }
  
  // Security: Validate API key if AI is enabled
  if (CONFIG.enableAI) {
    const activeKey = CONFIG.aiProvider === 'claude' ? CONFIG.claudeApiKey : CONFIG.perplexityApiKey;
    if (activeKey) {
      const keyValidation = validateApiKey(activeKey);
      if (!keyValidation.valid) {
        console.error(chalk.red(`❌ Security: API-Key ungültig - ${keyValidation.error}`));
        console.log(chalk.yellow('💡 Führe --setup aus, um API-Key neu zu konfigurieren'));
        process.exit(1);
      }
    }
  }
  
  // Check if setup is needed (first run)
  if (!configExists() && !args.includes('--setup')) {
    console.log(chalk.yellow('\\n⚠️  Keine Konfiguration gefunden. Starte Setup-Wizard...\\n'));
    await runSetupWizard();
    CONFIG = loadConfig();
  }
  
  const preview = args.includes('--preview');
  const execute = args.includes('--execute');
  const silent = args.includes('--silent');
  VERBOSE = args.includes('--verbose');
  
  // Merge CLI args with config
  CONFIG = mergeWithCLI(CONFIG, { preview, execute, silent, verbose: VERBOSE });
  
  // Apply config defaults if no explicit mode given
  if (!preview && !execute) {
    if (CONFIG.defaultMode === 'execute') {
      // Don't override, just inform in verbose mode
      if (VERBOSE) {
        console.log(chalk.gray('ℹ️  Config-Standard: execute-Modus\\n'));
      }
    }
  }
  
  if (VERBOSE) {
    console.log(chalk.gray('🔧 Verbose-Modus aktiviert'));
  }
  
  // Sammle alle Datei-Argumente (keine Flags)
  const filePaths = args.filter(arg => !arg.startsWith('--'));
  
  if (filePaths.length === 0) {
    console.error(chalk.red('\u274c Keine Dateien angegeben'));
    process.exit(1);
  }
  
  const results = [];
  const options = { preview, execute, silent };
  
  // Mehrere Dateien? Zeige Start-Benachrichtigung
  if (filePaths.length > 1 && !silent) {
    showNotification("Doc Scan Batch", `Verarbeite ${filePaths.length} Dateien`, true);
  }
  
  // Verarbeite alle Dateien
  for (const filePath of filePaths) {
    try {
      const result = await processFile(filePath, CONFIG, options);
      results.push(result);
    } catch (error) {
      console.error(chalk.red(`Fehler bei ${path.basename(filePath)}:`), VERBOSE ? error : '');
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
      console.log(chalk.bold('Umbenannte Dateien:'));
      results.forEach(r => {
        if (r.renamed) {
          console.log(chalk.gray(`  \u2022 ${r.oldName}`));
          console.log(chalk.green(`    \u2192 ${r.newName}`));
        }
      });
    }
    
    if (failed > 0) {
      console.log(chalk.bold.red('\nFehlerhafte Dateien:'));
      results.forEach(r => {
        if (!r.success) {
          console.log(chalk.red(`  \u2022 ${r.oldName}: ${r.error}`));
        }
      });
    }
    
    if (!silent) {
      const message = `${renamed} umbenannt, ${skipped} übersprungen, ${failed} Fehler`;
      showNotification("Doc Scan Abgeschlossen", message, true);
    }
  } else {
    // Einzeldatei-Benachrichtigungen
    const result = results[0];
    if (!silent) {
      if (result.renamed) {
        showNotification("Doc Scan Erfolg", `Umbenannt zu:\n${result.newName}`, true);
      } else if (result.success && !result.error) {
        showNotification("Doc Scan", result.oldName === result.newName ? "Name ist bereits optimal" : `Vorschlag: ${result.newName}`);
      } else if (result.error) {
        showNotification("Doc Scan Fehler", result.error);
      }
    }
  }
}

main().catch(error => {
  console.error(chalk.red.bold("\u274c Kritischer Fehler:"), VERBOSE ? error : error.message);
  process.exit(1);
});
