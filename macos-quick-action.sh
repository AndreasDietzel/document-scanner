#!/bin/bash
#
# MCP Document Intelligence - macOS Quick Action Script
# Wird vom Automator Quick Action Workflow aufgerufen
#
# Installation: Siehe MACOS-QUICK-ACTION.md
#

# Ermittle Node und mcp-scan Pfade
NODE_PATH=$(which node)
MCP_SCAN_PATH="$HOME/.local/bin/mcp-scan"

# Fallback: Wenn mcp-scan nicht global installiert, nutze lokale Version
if [ ! -f "$MCP_SCAN_PATH" ]; then
    # Versuche npm global bin zu finden
    NPM_BIN=$(npm bin -g 2>/dev/null)
    if [ -n "$NPM_BIN" ]; then
        MCP_SCAN_PATH="$NPM_BIN/mcp-scan"
    fi
fi

# Wenn immer noch nicht gefunden, versuche mit npx
if [ ! -f "$MCP_SCAN_PATH" ]; then
    MCP_SCAN_PATH="npx mcp-scan"
fi

# Iteriere über alle übergebenen Dateien (Automator übergibt sie als $@)
for file in "$@"; do
    # Prüfe ob Datei existiert
    if [ ! -f "$file" ]; then
        osascript -e "display notification \"Datei nicht gefunden: $(basename "$file")\" with title \"MCP Scan Fehler\" sound name \"Basso\""
        continue
    fi
    
    # Prüfe Dateiendung (case-insensitive)
    ext="${file##*.}"
    ext_lower=$(echo "$ext" | tr '[:upper:]' '[:lower:]')
    
    if [[ ! "$ext_lower" =~ ^(pdf|docx|pages|png|jpg|jpeg|txt)$ ]]; then
        osascript -e "display notification \"Format .$ext nicht unterstützt\" with title \"MCP Scan Fehler\" sound name \"Basso\""
        continue
    fi
    
    # Führe mcp-scan aus (ohne --silent, damit Dialog erscheint)
    $NODE_PATH "$MCP_SCAN_PATH" "$file"
done

exit 0
