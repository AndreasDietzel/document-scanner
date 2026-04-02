#!/bin/bash
#
# Document Scanner - macOS Quick Action Script
# Wird vom Automator Quick Action Workflow aufgerufen
#
# Installation: Siehe MACOS-QUICK-ACTION.md
#

# Ermittle ausführbares doc-scan Kommando robust
if command -v doc-scan >/dev/null 2>&1; then
    DOC_SCAN_CMD=("$(command -v doc-scan)")
elif [ -x "$HOME/.local/bin/doc-scan" ]; then
    DOC_SCAN_CMD=("$HOME/.local/bin/doc-scan")
elif command -v npx >/dev/null 2>&1; then
    # --yes verhindert interaktive Rückfragen bei npx
    DOC_SCAN_CMD=("npx" "--yes" "doc-scan")
else
    osascript -e "display notification \"doc-scan nicht gefunden\" with title \"Doc Scan Fehler\" sound name \"Basso\""
    exit 1
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
    
    # Führe doc-scan direkt im Execute-Modus aus, damit umbenannt wird
    if ! "${DOC_SCAN_CMD[@]}" "$file" --execute; then
        osascript -e "display notification \"Fehler bei: $(basename "$file")\" with title \"Doc Scan Fehler\" sound name \"Basso\""
    fi
done

exit 0
