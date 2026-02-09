/**
 * Configuration Management for MCP Document Scanner
 * Handles ~/.mcp-scan.json config file
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface ScanConfig {
  defaultMode: 'preview' | 'execute';
  enableOCR: boolean;
  ocrLanguage: string;
  customCompanies: string[];
  customDocTypes: Record<string, string>;
  timestampPriority: ('scanner' | 'ocr' | 'creation')[];
  namingPattern: string;
  enableCategories: boolean;
  silent: boolean;
  verbose: boolean;
  // AI Enhancement
  enableAI: boolean;
  perplexityApiKey?: string;
  perplexityModel?: string;
  aiConfidenceThreshold?: number; // Minimum confidence to use AI results
}

export const DEFAULT_CONFIG: ScanConfig = {
  defaultMode: 'preview',
  enableOCR: true,
  ocrLanguage: 'deu',
  customCompanies: [],
  customDocTypes: {},
  timestampPriority: ['scanner', 'ocr', 'creation'],
  namingPattern: '{timestamp}_{company}_{doctype}_{reference}',
  enableCategories: false,
  silent: false,
  verbose: false,
  // AI defaults
  enableAI: false,
  perplexityApiKey: undefined,
  perplexityModel: 'llama-3.1-sonar-small-128k-online',
  aiConfidenceThreshold: 0.5
};

const CONFIG_PATH = path.join(os.homedir(), '.mcp-scan.json');

/**
 * Load configuration from ~/.mcp-scan.json
 */
export function loadConfig(): ScanConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      const userConfig = JSON.parse(data);
      return { ...DEFAULT_CONFIG, ...userConfig };
    }
  } catch (error) {
    console.warn(`⚠️  Konnte Config nicht laden: ${CONFIG_PATH}`);
  }
  return { ...DEFAULT_CONFIG };
}

/**
 * Save configuration to ~/.mcp-scan.json
 */
export function saveConfig(config: ScanConfig): boolean {
  try {
    const data = JSON.stringify(config, null, 2);
    fs.writeFileSync(CONFIG_PATH, data, 'utf8');
    return true;
  } catch (error) {
    console.error(`❌ Konnte Config nicht speichern: ${error}`);
    return false;
  }
}

/**
 * Check if config file exists
 */
export function configExists(): boolean {
  return fs.existsSync(CONFIG_PATH);
}

/**
 * Get config file path
 */
export function getConfigPath(): string {
  return CONFIG_PATH;
}

/**
 * Reset config to defaults
 */
export function resetConfig(): boolean {
  return saveConfig(DEFAULT_CONFIG);
}

/**
 * Merge CLI args with config
 */
export function mergeWithCLI(config: ScanConfig, args: any): ScanConfig {
  return {
    ...config,
    defaultMode: args.execute ? 'execute' : args.preview ? 'preview' : config.defaultMode,
    silent: args.silent !== undefined ? args.silent : config.silent,
    verbose: args.verbose !== undefined ? args.verbose : config.verbose
  };
}
