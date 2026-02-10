/**
 * Undo Functionality
 * Tracks renames and allows rollback
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface RenameOperation {
  timestamp: number;
  oldPath: string;
  newPath: string;
  oldName: string;
  newName: string;
}

export interface UndoState {
  operations: RenameOperation[];
  lastBatch: number;
}

const UNDO_STATE_PATH = path.join(os.homedir(), '.doc-scan-undo.json');

/**
 * Load undo state
 */
export function loadUndoState(): UndoState {
  try {
    if (fs.existsSync(UNDO_STATE_PATH)) {
      const data = fs.readFileSync(UNDO_STATE_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn('⚠️  Konnte Undo-State nicht laden');
  }
  return { operations: [], lastBatch: 0 };
}

/**
 * Save undo state
 */
export function saveUndoState(state: UndoState): boolean {
  try {
    const data = JSON.stringify(state, null, 2);
    fs.writeFileSync(UNDO_STATE_PATH, data, 'utf8');
    return true;
  } catch (error) {
    console.error('❌ Konnte Undo-State nicht speichern:', error);
    return false;
  }
}

/**
 * Record a rename operation
 */
export function recordRename(oldPath: string, newPath: string): void {
  const state = loadUndoState();
  const now = Date.now();
  
  // Start new batch if last operation was >5 seconds ago
  if (state.operations.length > 0) {
    const lastOp = state.operations[state.operations.length - 1];
    if (now - lastOp.timestamp > 5000) {
      state.lastBatch = now;
    }
  } else {
    state.lastBatch = now;
  }
  
  state.operations.push({
    timestamp: now,
    oldPath,
    newPath,
    oldName: path.basename(oldPath),
    newName: path.basename(newPath)
  });
  
  saveUndoState(state);
}

/**
 * Get last batch of operations
 */
export function getLastBatch(): RenameOperation[] {
  const state = loadUndoState();
  if (state.operations.length === 0) return [];
  
  const lastBatch = state.lastBatch;
  return state.operations.filter(op => op.timestamp >= lastBatch);
}

/**
 * Undo last batch of renames
 */
export function undoLastBatch(): { success: number; failed: number; errors: string[] } {
  const batch = getLastBatch();
  if (batch.length === 0) {
    return { success: 0, failed: 0, errors: ['Keine Operationen zum Rückgängigmachen'] };
  }
  
  let success = 0;
  let failed = 0;
  const errors: string[] = [];
  
  // Undo in reverse order
  for (let i = batch.length - 1; i >= 0; i--) {
    const op = batch[i];
    
    try {
      // Check if renamed file still exists
      if (!fs.existsSync(op.newPath)) {
        errors.push(`${op.newName}: Datei nicht gefunden`);
        failed++;
        continue;
      }
      
      // Check if original name is available
      if (fs.existsSync(op.oldPath)) {
        errors.push(`${op.oldName}: Zielname bereits belegt`);
        failed++;
        continue;
      }
      
      // Perform undo
      fs.renameSync(op.newPath, op.oldPath);
      success++;
    } catch (error) {
      errors.push(`${op.newName}: ${error}`);
      failed++;
    }
  }
  
  // Remove undone operations from state
  if (success > 0) {
    const state = loadUndoState();
    const batchTimestamp = state.lastBatch;
    state.operations = state.operations.filter(op => op.timestamp < batchTimestamp);
    saveUndoState(state);
  }
  
  return { success, failed, errors };
}

/**
 * Clear undo history
 */
export function clearUndoHistory(): boolean {
  try {
    if (fs.existsSync(UNDO_STATE_PATH)) {
      fs.unlinkSync(UNDO_STATE_PATH);
    }
    return true;
  } catch (error) {
    console.error('❌ Konnte Undo-History nicht löschen:', error);
    return false;
  }
}

/**
 * Get undo statistics
 */
export function getUndoStats(): { totalOperations: number; lastBatchSize: number; lastBatchTime: Date | null } {
  const state = loadUndoState();
  const batch = getLastBatch();
  
  return {
    totalOperations: state.operations.length,
    lastBatchSize: batch.length,
    lastBatchTime: batch.length > 0 ? new Date(batch[0].timestamp) : null
  };
}
