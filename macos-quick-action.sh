#!/bin/bash
#
# Document Scanner - macOS Quick Action Script
# Wird vom Automator Quick Action Workflow aufgerufen
#
# Installation: Siehe MACOS-QUICK-ACTION.md
#

# Ermittle Node und doc-scan Pfade
NODE_PATH=$(which node)
DOC_SCAN_PATH="$HOME/.local/bin/doc-scan"

# Fallback: Wenn doc-scan nicht global installiert, nutze lokale Version
if [ ! -f "$DOC_SCAN_PATH" ]; then
    # Versuche npm global bin zu finden
    NPM_BIN=$(npm bin -g 2>/dev/null)
    if [ -n "$NPM_BIN" ]; then
        DOC_SCAN_PATH="$NPM_BIN/doc-scan"
    fi
fi

# Wenn immer noch nicht gefunden, versuche mit npx
if [ ! -f "$DOC_SCAN_PATH" ]; then
    DOC_SCAN_PATH="npx doc-scan"
fi

# Iteriere über alle übergebenen Dateien (Automator übergibt sie als $@)
for file in "$@"; do
    # Prüfe ob Datei existiert
    if [ ! -f "$file" ]; then
        osascript -e "display notification \"Datei nicht gefunden: $(basename "$file")\" with title \"Doc Scan Fehler\" sound name \"Basso\""
        continue
    fi
    
    # Prüfe Dateiendung (case-insensitive)
    ext="${file##*.}"
    ext_lower=$(echo "$ext" | tr '[:upper:]' '[:lower:]')
    
    if [[ ! "$ext_lower" =~ ^(pdf|docx|pages|png|jpg|jpeg|txt)$ ]]; then
        osascript -e "display notification \"Format .$ext nicht unterstützt\" with title \"Doc Scan Fehler\" sound name \"Basso\""
        continue
    fi
    
    # Führe doc-scan aus (ohne --silent, damit Dialog erscheint)
    $NODE_PATH "$DOC_SCAN_PATH" "$file"
done

exit 0
