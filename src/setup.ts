/**
 * Interactive Setup Wizard
 * Guides users through initial configuration
 */

import prompts from 'prompts';
import chalk from 'chalk';
import { saveConfig, ScanConfig, DEFAULT_CONFIG, getConfigPath } from './config.js';

export async function runSetupWizard(): Promise<void> {
  console.log(chalk.bold.cyan('\n🔧 MCP Document Scanner - Setup Wizard\n'));
  console.log(chalk.gray('Beantworte ein paar Fragen zur Einrichtung deiner Dokumenten-Scanner-Konfiguration.\n'));
  
  const response = await prompts([
    {
      type: 'select',
      name: 'defaultMode',
      message: 'Standard-Modus für Dateiverarbeitung?',
      choices: [
        { title: 'Preview (Vorschau ohne Umbenennung)', value: 'preview' },
        { title: 'Execute (Automatisch umbenennen)', value: 'execute' }
      ],
      initial: 0
    },
    {
      type: 'confirm',
      name: 'enableAI',
      message: '🤖 AI-Enhancement mit Perplexity aktivieren? (Empfohlen)',
      initial: false
    },
    {
      type: (prev) => prev ? 'password' : null,
      name: 'perplexityApiKey',
      message: 'Perplexity API-Key (von https://www.perplexity.ai/settings/api):',
      validate: (value: string) => value.length >= 10 || 'API-Key zu kurz (min. 10 Zeichen)'
    },
    {
      type: 'confirm',
      name: 'enableOCR',
      message: 'OCR für gescannte PDFs/Bilder aktivieren?',
      initial: true
    },
    {
      type: (prev) => prev ? 'select' : null,
      name: 'ocrLanguage',
      message: 'OCR-Sprache?',
      choices: [
        { title: 'Deutsch (deu)', value: 'deu' },
        { title: 'English (eng)', value: 'eng' },
        { title: 'Deutsch + English (deu+eng)', value: 'deu+eng' }
      ],
      initial: 0
    },
    {
      type: 'confirm',
      name: 'enableCategories',
      message: 'Automatische Kategorisierung aktivieren? (Sortiert nach Branchen)',
      initial: false
    },
    {
      type: 'confirm',
      name: 'silent',
      message: 'macOS-Benachrichtigungen deaktivieren?',
      initial: false
    },
    {
      type: 'list',
      name: 'customCompanies',
      message: 'Eigene Firmennamen (kommasepariert, leer = keine)?',
      initial: '',
      separator: ','
    }
  ]);
  
  // User cancelled
  if (!response.defaultMode) {
    console.log(chalk.yellow('\n❌ Setup abgebrochen\n'));
    return;
  }
  
  // Build config
  const config: ScanConfig = {
    ...DEFAULT_CONFIG,
    defaultMode: response.defaultMode,
    enableAI: response.enableAI || false,
    perplexityApiKey: response.perplexityApiKey || undefined,
    enableOCR: response.enableOCR,
    ocrLanguage: response.ocrLanguage || 'deu',
    enableCategories: response.enableCategories,
    silent: response.silent,
    customCompanies: response.customCompanies
      ? response.customCompanies.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0)
      : []
  };
  
  // Save config
  if (saveConfig(config)) {
    console.log(chalk.green('\n✅ Konfiguration gespeichert!\n'));
    console.log(chalk.gray(`📁 Speicherort: ${getConfigPath()}\n`));
    console.log(chalk.bold(`🤖 AI-Enhancement:       ${config.enableAI ? 'Ja' : 'Nein'}`));
    if (config.enableAI && config.perplexityApiKey) {
      const maskedKey = config.perplexityApiKey.substring(0, 8) + '...' + config.perplexityApiKey.substring(config.perplexityApiKey.length - 4);
      console.log(chalk.cyan(`  Perplexity API-Key:   ${maskedKey}`));
    }
    console.log(chalk.cyan(`\n📋 Deine Einstellungen:\n`));
    console.log(chalk.cyan(`  Standard-Modus:       ${config.defaultMode}`));
    console.log(chalk.cyan(`  OCR aktiviert:        ${config.enableOCR ? 'Ja' : 'Nein'}`));
    if (config.enableOCR) {
      console.log(chalk.cyan(`  OCR-Sprache:          ${config.ocrLanguage}`));
    }
    console.log(chalk.cyan(`  Kategorisierung:      ${config.enableCategories ? 'Ja' : 'Nein'}`));
    console.log(chalk.cyan(`  Benachrichtigungen:   ${config.silent ? 'Aus' : 'An'}`));
    if (config.customCompanies.length > 0) {
      console.log(chalk.cyan(`  Eigene Firmen:        ${config.customCompanies.join(', ')}`));
    }
    console.log(chalk.gray('\n💡 Tipp: Du kannst die Config jederzeit mit --setup neu erstellen\n'));
  } else {
    console.log(chalk.red('\n❌ Fehler beim Speichern der Konfiguration\n'));
  }
}
