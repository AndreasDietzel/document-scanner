/**
 * Security utilities for Document Scanner
 * ISO 25010 Security Quality Attributes:
 * - Confidentiality: Protect sensitive data (API keys, file content)
 * - Integrity: Validate input data
 * - Non-repudiation: Audit logging
 * - Accountability: Track operations
 * - Authenticity: Verify data sources
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Security Constants
export const SECURITY_LIMITS = {
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100 MB
  MAX_FILENAME_LENGTH: 255,
  MAX_PATH_LENGTH: 4096,
  MAX_TEXT_LENGTH: 10 * 1024 * 1024, // 10 MB text
  API_KEY_MIN_LENGTH: 10,
  API_KEY_MAX_LENGTH: 200
};

// Allowed file extensions (whitelist approach)
const ALLOWED_EXTENSIONS = [
  // Documents
  '.pdf', '.txt',
  // Microsoft Office
  '.doc', '.docx',      // Word
  '.xls', '.xlsx',      // Excel
  '.ppt', '.pptx',      // PowerPoint
  // Apple
  '.pages', '.numbers', '.keynote',
  // OpenOffice/LibreOffice
  '.odt', '.ods', '.odp',
  // Images
  '.png', '.jpg', '.jpeg', '.tiff', '.bmp',
  // Archives
  '.rar', '.zip', '.7z'
];

/**
 * Validate file path for security issues
 * Prevents: Path traversal, symbolic links, special files
 */
export function validateFilePath(filePath: string): { valid: boolean; error?: string } {
  // Check if path is provided
  if (!filePath || typeof filePath !== 'string') {
    return { valid: false, error: 'Kein Dateipfad angegeben' };
  }

  // Check path length
  if (filePath.length > SECURITY_LIMITS.MAX_PATH_LENGTH) {
    return { valid: false, error: 'Dateipfad zu lang' };
  }

  // Resolve to absolute path
  const absolutePath = path.resolve(filePath);

  // Check for path traversal attempts
  if (absolutePath.includes('..') || absolutePath !== path.normalize(absolutePath)) {
    return { valid: false, error: 'Ungültiger Dateipfad (Path Traversal erkannt)' };
  }

  // Check if file exists
  if (!fs.existsSync(absolutePath)) {
    return { valid: false, error: 'Datei nicht gefunden' };
  }

  // Check if it's actually a file (not directory or special file)
  const stats = fs.lstatSync(absolutePath);
  if (!stats.isFile()) {
    return { valid: false, error: 'Pfad ist keine reguläre Datei' };
  }

  // Check for symbolic links (security risk)
  if (stats.isSymbolicLink()) {
    return { valid: false, error: 'Symbolische Links sind nicht erlaubt' };
  }

  // Check file size
  if (stats.size > SECURITY_LIMITS.MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Datei zu groß (${Math.round(stats.size / 1024 / 1024)} MB, max. ${Math.round(SECURITY_LIMITS.MAX_FILE_SIZE / 1024 / 1024)} MB)`
    };
  }

  // Check file extension (whitelist)
  const ext = path.extname(absolutePath).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `Dateityp ${ext} nicht unterstützt` };
  }

  return { valid: true };
}

/**
 * Sanitize filename for safe usage
 * Removes: Special characters, control characters, path separators
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'unnamed';
  }

  // Remove control characters and special chars
  let sanitized = filename
    .replace(/[\x00-\x1f\x7f]/g, '') // Control characters
    .replace(/[<>:"|?*]/g, '') // Windows illegal chars
    .replace(/\//g, '_') // Path separator Unix
    .replace(/\\/g, '_') // Path separator Windows
    .replace(/\s+/g, '_') // Multiple spaces to underscore
    .replace(/\.+/g, '.') // Multiple dots to single dot
    .trim();

  // Remove leading/trailing dots and underscores
  sanitized = sanitized.replace(/^[._]+|[._]+$/g, '');

  // Check length
  if (sanitized.length > SECURITY_LIMITS.MAX_FILENAME_LENGTH) {
    const ext = path.extname(sanitized);
    const base = path.basename(sanitized, ext);
    sanitized = base.substring(0, SECURITY_LIMITS.MAX_FILENAME_LENGTH - ext.length) + ext;
  }

  // Ensure not empty
  if (sanitized.length === 0) {
    sanitized = 'unnamed';
  }

  // Check for reserved filenames (Windows)
  const reserved = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4',
    'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3',
    'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
  const baseName = path.basename(sanitized, path.extname(sanitized)).toUpperCase();
  if (reserved.includes(baseName)) {
    sanitized = '_' + sanitized;
  }

  return sanitized;
}

/**
 * Validate API key format
 * Basic format validation without exposing key content
 */
export function validateApiKey(apiKey: string | undefined): { valid: boolean; error?: string } {
  if (!apiKey) {
    return { valid: false, error: 'API-Key fehlt' };
  }

  if (typeof apiKey !== 'string') {
    return { valid: false, error: 'API-Key muss ein String sein' };
  }

  if (apiKey.length < SECURITY_LIMITS.API_KEY_MIN_LENGTH) {
    return { valid: false, error: 'API-Key zu kurz' };
  }

  if (apiKey.length > SECURITY_LIMITS.API_KEY_MAX_LENGTH) {
    return { valid: false, error: 'API-Key zu lang' };
  }

  // Basic format check (alphanumeric + dash/underscore)
  if (!/^[a-zA-Z0-9_-]+$/.test(apiKey)) {
    return { valid: false, error: 'API-Key enthält ungültige Zeichen' };
  }

  return { valid: true };
}

/**
 * Mask API key for logging (show first 8 and last 4 chars)
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 12) {
    return '***';
  }
  return `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`;
}

/**
 * Validate text content length
 */
export function validateTextLength(text: string): { valid: boolean; error?: string } {
  if (text.length > SECURITY_LIMITS.MAX_TEXT_LENGTH) {
    return {
      valid: false,
      error: `Text zu lang (${Math.round(text.length / 1024)} KB, max. ${Math.round(SECURITY_LIMITS.MAX_TEXT_LENGTH / 1024)} KB)`
    };
  }
  return { valid: true };
}

/**
 * Secure cleanup of temporary files
 */
export function secureCleanup(filePaths: string[]): void {
  for (const filePath of filePaths) {
    try {
      if (fs.existsSync(filePath)) {
        // Overwrite file with zeros before deletion (paranoid mode)
        const stats = fs.statSync(filePath);
        if (stats.size < 100 * 1024 * 1024) { // Only for files < 100MB
          const buffer = Buffer.alloc(stats.size, 0);
          fs.writeFileSync(filePath, buffer);
        }
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      // Ignore cleanup errors (best effort)
    }
  }
}

/**
 * Check if config file has secure permissions (Unix)
 */
export function checkConfigPermissions(configPath: string): { secure: boolean; warning?: string } {
  if (os.platform() === 'win32') {
    return { secure: true }; // Skip on Windows
  }

  try {
    const stats = fs.statSync(configPath);
    const mode = stats.mode & parseInt('777', 8);

    // Check if world-readable (should be 600 or 400)
    if (mode & parseInt('004', 8)) {
      return {
        secure: false,
        warning: `Config-Datei ist für alle lesbar! Setze Rechte: chmod 600 ${configPath}`
      };
    }

    // Check if group-readable (should be 600 or 400)
    if (mode & parseInt('040', 8)) {
      return {
        secure: false,
        warning: `Config-Datei ist für Gruppe lesbar! Setze Rechte: chmod 600 ${configPath}`
      };
    }

    return { secure: true };
  } catch (error) {
    return { secure: true }; // Best effort, don't fail if can't check
  }
}

/**
 * Validate environment for secure operation
 */
export function validateEnvironment(): { secure: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Check if running as root (not recommended)
  if (process.getuid && process.getuid() === 0) {
    warnings.push('⚠️  Tool läuft als root - nicht empfohlen!');
  }

  // Check for suspicious environment variables
  const suspiciousVars = ['LD_PRELOAD', 'DYLD_INSERT_LIBRARIES', 'DYLD_LIBRARY_PATH'];
  for (const varName of suspiciousVars) {
    if (process.env[varName]) {
      warnings.push(`⚠️  Verdächtige Environment Variable: ${varName}`);
    }
  }

  return {
    secure: warnings.length === 0,
    warnings
  };
}

export default {
  SECURITY_LIMITS,
  validateFilePath,
  sanitizeFilename,
  validateApiKey,
  maskApiKey,
  validateTextLength,
  secureCleanup,
  checkConfigPermissions,
  validateEnvironment
};
