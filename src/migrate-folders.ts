#!/usr/bin/env node
/**
 * Folder Structure Migration Script
 * Migrates documents from old category structure (2000-2025) to new generic structure
 * 
 * Usage:
 *   npm run migrate -- /path/to/documents/2020
 *   npm run migrate -- /path/to/documents/2020 --dry-run
 */

import * as fs from 'fs';
import * as path from 'path';

interface MigrationMapping {
  oldFolder: string;
  newFolder: string;
}

// Mapping from old folder names to new generic structure
const MIGRATION_MAP: MigrationMapping[] = [
  // Finanzen
  { oldFolder: '01_Finanzen', newFolder: '01_Finanzen' },
  
  // Gesundheit
  { oldFolder: '02_Gesundheit', newFolder: '03_Gesundheit' },
  
  // Versicherungen
  { oldFolder: '04_Versicherungen', newFolder: '04_Versicherungen' },
  
  // Reisen
  { oldFolder: '06_Reisen', newFolder: '08_Reisen' },
  
  // Auto -> Mobilität
  { oldFolder: '09_Auto', newFolder: '07_Mobilitaet' },
  
  // Telekommunikation
  { oldFolder: '11_Telekommunikation', newFolder: '06_Telekommunikation' },
  
  // Logistik -> Sonstiges
  { oldFolder: '12_Logistik', newFolder: '99_Sonstiges' },
  
  // Online -> Sonstiges
  { oldFolder: '13_Online', newFolder: '99_Sonstiges' },
  
  // Alle anderen unbekannten -> Sonstiges
  { oldFolder: '*', newFolder: '99_Sonstiges' }
];

// New generic folder structure
const NEW_FOLDERS = [
  '01_Finanzen',
  '02_Beruf_Karriere',
  '03_Gesundheit',
  '04_Versicherungen',
  '05_Wohnen',
  '06_Telekommunikation',
  '07_Mobilitaet',
  '08_Reisen',
  '09_Behoerden',
  '10_Steuern',
  '11_Soziales',
  '99_Sonstiges'
];

interface MigrationStats {
  foldersCreated: number;
  filesMoved: number;
  errors: string[];
}

/**
 * Create new folder structure
 */
function createNewFolders(baseDir: string, dryRun: boolean): number {
  let created = 0;
  for (const folder of NEW_FOLDERS) {
    const folderPath = path.join(baseDir, folder);
    if (!fs.existsSync(folderPath)) {
      if (!dryRun) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
      console.log(`  ✓ Create: ${folder}`);
      created++;
    }
  }
  return created;
}

/**
 * Get target folder for old folder name
 */
function getTargetFolder(oldFolder: string): string {
  // Direct mapping
  for (const mapping of MIGRATION_MAP) {
    if (mapping.oldFolder === oldFolder) {
      return mapping.newFolder;
    }
  }
  
  // Default: Sonstiges
  return '99_Sonstiges';
}

/**
 * Migrate files from old structure to new
 */
function migrateFiles(baseDir: string, dryRun: boolean): MigrationStats {
  const stats: MigrationStats = {
    foldersCreated: 0,
    filesMoved: 0,
    errors: []
  };

  // Create new folders
  stats.foldersCreated = createNewFolders(baseDir, dryRun);

  // Find all subdirectories
  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    
    const oldFolder = entry.name;
    
    // Skip new folders
    if (NEW_FOLDERS.includes(oldFolder)) continue;
    
    // Determine target folder
    const targetFolder = getTargetFolder(oldFolder);
    
    console.log(`\n📁 ${oldFolder} → ${targetFolder}`);
    
    const sourcePath = path.join(baseDir, oldFolder);
    const targetPath = path.join(baseDir, targetFolder);
    
    // Move all files from source to target
    try {
      const files = fs.readdirSync(sourcePath);
      
      for (const file of files) {
        const sourceFile = path.join(sourcePath, file);
        const targetFile = path.join(targetPath, file);
        
        // Check if file already exists
        if (fs.existsSync(targetFile)) {
          const warning = `  ⚠️  File exists: ${file}`;
          console.log(warning);
          stats.errors.push(warning);
          continue;
        }
        
        if (!dryRun) {
          fs.renameSync(sourceFile, targetFile);
        }
        
        console.log(`  ✓ Move: ${file}`);
        stats.filesMoved++;
      }
      
      // Remove empty old folder
      const remainingFiles = fs.readdirSync(sourcePath);
      if (remainingFiles.length === 0) {
        if (!dryRun) {
          fs.rmdirSync(sourcePath);
        }
        console.log(`  ✓ Remove empty: ${oldFolder}`);
      }
      
    } catch (error) {
      const errorMsg = `Error processing ${oldFolder}: ${error}`;
      console.error(`  ✗ ${errorMsg}`);
      stats.errors.push(errorMsg);
    }
  }
  
  return stats;
}

/**
 * Main migration function
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: migrate-folders <directory> [--dry-run]');
    console.error('Example: npm run migrate -- ~/Documents/2020');
    process.exit(1);
  }
  
  const targetDir = args[0];
  const dryRun = args.includes('--dry-run');
  
  if (!fs.existsSync(targetDir)) {
    console.error(`❌ Directory not found: ${targetDir}`);
    process.exit(1);
  }
  
  if (!fs.statSync(targetDir).isDirectory()) {
    console.error(`❌ Not a directory: ${targetDir}`);
    process.exit(1);
  }
  
  console.log('\n🔄 Document Folder Migration');
  console.log('═══════════════════════════════════════\n');
  console.log(`📂 Target: ${targetDir}`);
  console.log(`🔍 Mode: ${dryRun ? 'DRY RUN (no changes)' : 'EXECUTE'}`);
  console.log('\n');
  
  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No files will be moved!\n');
  }
  
  // Run migration
  const stats = migrateFiles(targetDir, dryRun);
  
  // Summary
  console.log('\n═══════════════════════════════════════');
  console.log('📊 Migration Summary');
  console.log('═══════════════════════════════════════\n');
  console.log(`  Folders created: ${stats.foldersCreated}`);
  console.log(`  Files moved: ${stats.filesMoved}`);
  console.log(`  Errors: ${stats.errors.length}`);
  
  if (stats.errors.length > 0) {
    console.log('\n⚠️  Warnings/Errors:');
    stats.errors.forEach(err => console.log(`  - ${err}`));
  }
  
  console.log('\n✅ Migration ' + (dryRun ? 'simulation' : 'completed'));
  console.log('\n');
}

// Run if called directly
if (require.main === module) {
  main();
}

export { migrateFiles, createNewFolders, getTargetFolder };
