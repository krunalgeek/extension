#!/bin/bash
# Load Chrome Extension for Development
# Usage: ./load-extension.sh

EXTENSION_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "==========================================="
echo "  Exam Proctor Helper Extension v1.1.0"
echo "==========================================="
echo ""
echo "Extension Directory: $EXTENSION_DIR"
echo ""
echo "To load this extension in Chrome:"
echo ""
echo "1. Open Chrome and navigate to:"
echo "   chrome://extensions"
echo ""
echo "2. Enable 'Developer mode' (toggle in top-right)"
echo ""
echo "3. Click 'Load unpacked'"
echo ""
echo "4. Select this directory:"
echo "   $EXTENSION_DIR"
echo ""
echo "5. Verify extension appears with:"
echo "   - Name: Exam Proctor Helper"
echo "   - Version: 1.1.0"
echo "   - Status: Enabled"
echo ""
echo "6. (Optional) Pin extension to toolbar:"
echo "   - Click puzzle icon"
echo "   - Pin 'Exam Proctor Helper'"
echo ""
echo "==========================================="
echo ""

# Check if manifest.json exists
if [ ! -f "$EXTENSION_DIR/manifest.json" ]; then
    echo "❌ ERROR: manifest.json not found!"
    echo "   Make sure you're in the extension directory"
    exit 1
fi

echo "✅ Extension files validated"
echo ""

# Display file list
echo "Extension files:"
ls -lh "$EXTENSION_DIR" | grep -E '\.(json|js|html)$' | awk '{print "   " $9 " (" $5 ")"}'
echo ""

echo "After loading, test with:"
echo "  1. Open http://localhost:4200"
echo "  2. Open DevTools Console"
echo "  3. Run: window.postMessage({target:'proctor-ext',type:'PING'},'*')"
echo "  4. Check for PING_RES response"
echo ""
echo "For configuration, click the extension icon in Chrome toolbar"
echo ""
