/**
 * Perplexity AI Client for Document Analysis
 * Uses Perplexity API to intelligently extract document metadata
 */

import chalk from 'chalk';

export interface AIDocumentAnalysis {
  category: string;           // e.g., "Telekommunikation", "Versicherung"
  company: string;            // e.g., "Vodafone"
  documentType: string;       // e.g., "Rechnung", "Vertrag"
  keywords: string[];         // Up to 5 buzzwords
  referenceNumber?: string;   // Invoice number, customer number, etc.
  confidence: number;         // 0-1
  rawResponse?: string;
}

export interface PerplexityConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

const DEFAULT_MODEL = 'sonar';
const API_BASE_URL = 'https://api.perplexity.ai';

/**
 * Analyze document text with Perplexity AI
 */
export async function analyzeDocumentWithAI(
  text: string,
  config: PerplexityConfig,
  verbose: boolean = false
): Promise<AIDocumentAnalysis | null> {
  
  if (!config.apiKey || config.apiKey.length < 10) {
    if (verbose) {
      console.log(chalk.yellow('⚠️  Kein Perplexity API-Key konfiguriert'));
    }
    return null;
  }

  try {
    // Truncate text if too long (keep first 2000 chars for performance)
    const truncatedText = text.substring(0, 2000);
    
    const prompt = buildAnalysisPrompt(truncatedText);
    
    if (verbose) {
      console.log(chalk.gray('🤖 Perplexity AI Analyse läuft...'));
    }

    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.model || DEFAULT_MODEL,
        messages: [
          {
            role: 'system',
            content: 'Du bist ein Experte für Dokumentenanalyse. Deine Aufgabe ist es, Dokumente zu analysieren und strukturierte Metadaten zu extrahieren. Antworte IMMER im JSON-Format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: config.maxTokens || 500,
        temperature: config.temperature || 0.2,
        top_p: 0.9,
        stream: false
      })
    });

    if (!response.ok) {
      const error = await response.text();
      if (verbose) {
        console.log(chalk.red(`❌ Perplexity API Fehler: ${response.status}`));
        console.log(chalk.gray(error));
      }
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      if (verbose) {
        console.log(chalk.yellow('⚠️  Keine Antwort von Perplexity AI'));
      }
      return null;
    }

    // Parse JSON response
    const analysis = parseAIResponse(content, verbose);
    
    if (analysis && verbose) {
      console.log(chalk.green('✅ AI-Analyse abgeschlossen'));
      console.log(chalk.gray(`   Kategorie: ${analysis.category}`));
      console.log(chalk.gray(`   Firma: ${analysis.company}`));
      console.log(chalk.gray(`   Typ: ${analysis.documentType}`));
      console.log(chalk.gray(`   Keywords: ${analysis.keywords.join(', ')}`));
      console.log(chalk.gray(`   Confidence: ${(analysis.confidence * 100).toFixed(0)}%`));
    }

    return analysis;

  } catch (error) {
    if (verbose) {
      console.log(chalk.red('❌ Fehler bei AI-Analyse:'), error instanceof Error ? error.message : error);
    }
    return null;
  }
}

/**
 * Build analysis prompt for Perplexity
 */
function buildAnalysisPrompt(text: string): string {
  return `Analysiere dieses Dokument und extrahiere folgende Informationen im JSON-Format:

DOKUMENT:
${text}

AUFGABE:
Extrahiere aus dem Dokument:
1. Kategorie (wähle aus: Telekommunikation, Versicherung, Gesundheit, Finanzen, Logistik, Online, Reisen, Auto, Beruf, Bildung, Wohnen, Steuern, Sonstiges)
2. Firmenname (vollständiger Name der Firma/Absender)
3. Dokumenttyp (z.B. Rechnung, Vertrag, Kündigung, Mahnung, Bescheid, Angebot, Bestellung, Kontoauszug, etc.)
4. Keywords (bis zu 5 wichtige Schlagworte für den Dateinamen)
5. Referenznummer (Rechnungsnummer, Kundennummer, Vertragsnummer, etc. falls vorhanden)
6. Confidence (deine Sicherheit 0.0-1.0)

ANTWORT-FORMAT (NUR JSON, keine zusätzlichen Texte):
{
  "category": "Kategorie",
  "company": "Firmenname",
  "documentType": "Dokumenttyp",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "referenceNumber": "Nummer oder null",
  "confidence": 0.95
}

WICHTIG:
- Keywords sollten kurz und aussagekräftig sein (2-15 Zeichen)
- Keine Sonderzeichen in Keywords (nur A-Z, 0-9, -, _)
- Company-Name ohne Rechtsform (GmbH, AG, etc.) wenn möglich
- Nur JSON zurückgeben, keine Erklärungen`;
}

/**
 * Parse AI response and extract structured data
 */
function parseAIResponse(content: string, verbose: boolean): AIDocumentAnalysis | null {
  try {
    // Try to extract JSON from response (might be wrapped in markdown code blocks)
    let jsonText = content.trim();
    
    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\s*/g, '').replace(/```\s*$/g, '');
    }

    const parsed = JSON.parse(jsonText);

    // Validate and sanitize
    const analysis: AIDocumentAnalysis = {
      category: sanitizeString(parsed.category || 'Sonstiges'),
      company: sanitizeString(parsed.company || ''),
      documentType: sanitizeString(parsed.documentType || ''),
      keywords: (parsed.keywords || [])
        .map((k: string) => sanitizeString(k))
        .filter((k: string) => k.length >= 2 && k.length <= 20)
        .slice(0, 5),
      referenceNumber: parsed.referenceNumber ? sanitizeString(parsed.referenceNumber) : undefined,
      confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
      rawResponse: content
    };

    // Minimum validation
    if (!analysis.company && !analysis.documentType && analysis.keywords.length === 0) {
      if (verbose) {
        console.log(chalk.yellow('⚠️  AI-Analyse lieferte keine verwertbaren Daten'));
      }
      return null;
    }

    return analysis;

  } catch (error) {
    if (verbose) {
      console.log(chalk.red('❌ Fehler beim Parsen der AI-Antwort:'), error instanceof Error ? error.message : error);
      console.log(chalk.gray('Antwort:'), content.substring(0, 200));
    }
    return null;
  }
}

/**
 * Sanitize string for filename usage
 */
function sanitizeString(str: string): string {
  return str
    .trim()
    .replace(/[<>:"|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[\\\/]/g, '-')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 50); // Max 50 chars per component
}

/**
 * Build filename from AI analysis
 */
export function buildFilenameFromAI(
  analysis: AIDocumentAnalysis,
  timestamp: string,
  originalExtension: string
): string {
  const components: string[] = [];

  // 1. Timestamp (always first)
  if (timestamp) {
    components.push(timestamp);
  }

  // 2. Company (if high confidence)
  if (analysis.company && analysis.confidence >= 0.5) {
    components.push(analysis.company);
  }

  // 3. Document Type
  if (analysis.documentType) {
    components.push(analysis.documentType);
  }

  // 4. Keywords (up to 3 additional if space permits)
  const remainingKeywords = analysis.keywords.filter(k => 
    k !== analysis.company && 
    k !== analysis.documentType
  ).slice(0, 3);
  
  components.push(...remainingKeywords);

  // 5. Reference Number (if present and short enough)
  if (analysis.referenceNumber && analysis.referenceNumber.length <= 30) {
    components.push(analysis.referenceNumber);
  }

  // Build filename
  const basename = components.filter(c => c.length > 0).join('_');
  return basename + originalExtension;
}

/**
 * Check if AI analysis is enabled and configured
 */
export function isAIEnabled(config: PerplexityConfig | undefined): boolean {
  return !!(config?.apiKey && config.apiKey.length >= 10);
}

/**
 * Select best document date from multiple candidates using AI
 */
export async function selectDocumentDateWithAI(
  text: string,
  dates: string[],
  config: PerplexityConfig,
  verbose: boolean = false
): Promise<string | null> {
  
  if (!config.apiKey || config.apiKey.length < 10) {
    return null;
  }

  if (dates.length === 0) {
    return null;
  }

  if (dates.length === 1) {
    return dates[0];
  }

  try {
    const truncatedText = text.substring(0, 1500);
    const datesList = dates.join(', ');
    
    const prompt = `Analysiere dieses Dokument und identifiziere das BRIEFKOPF-DATUM (Datum des Schreibens/der Rechnung).

DOKUMENT:
${truncatedText}

GEFUNDENE DATEN:
${datesList}

AUFGABE:
Wähle aus den gefundenen Daten das wahrscheinlichste Briefkopf-Datum (= Datum des Dokuments, nicht z.B. Vertragslaufzeit oder andere Termine).

ANTWORT-FORMAT (NUR das Datum im Format DD.MM.YYYY, keine zusätzlichen Texte):
DD.MM.YYYY`;

    if (verbose) {
      console.log(chalk.gray(`🤖 KI prüft ${dates.length} gefundene Daten...`));
    }

    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.model || DEFAULT_MODEL,
        messages: [
          {
            role: 'system',
            content: 'Du bist ein Experte für Dokumentenanalyse. Antworte nur mit dem Datum im Format DD.MM.YYYY.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 50,
        temperature: 0.1,
        top_p: 0.9,
        stream: false
      })
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return null;
    }

    // Extract date from response
    const dateMatch = content.match(/(\d{2}\.\d{2}\.\d{4})/);
    if (dateMatch) {
      const selectedDate = dateMatch[1];
      if (dates.includes(selectedDate)) {
        if (verbose) {
          console.log(chalk.green(`✅ KI wählte Briefkopf-Datum: ${selectedDate}`));
        }
        return selectedDate;
      }
    }

    return null;

  } catch (error) {
    if (verbose) {
      console.log(chalk.yellow('⚠️  KI-Datumsauswahl fehlgeschlagen, nutze erstes Datum'));
    }
    return null;
  }
}
