#!/bin/bash
set -euo pipefail

echo "Archon Mobile — Project Setup"
echo "=============================="

# Check prerequisites
if ! command -v xcodegen &> /dev/null; then
    echo "Error: XcodeGen is not installed."
    echo "Install it with: brew install xcodegen"
    exit 1
fi

# Create Config.xcconfig if it doesn't exist
CONFIG_FILE="Config/Config.xcconfig"
EXAMPLE_FILE="Config/Config.example.xcconfig"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "Creating $CONFIG_FILE from example..."
    cp "$EXAMPLE_FILE" "$CONFIG_FILE"
    echo ""
    echo "IMPORTANT: Edit $CONFIG_FILE with your Supabase credentials:"
    echo "  - SUPABASE_URL"
    echo "  - SUPABASE_ANON_KEY"
    echo "  - API_BASE_URL"
    echo ""
else
    echo "$CONFIG_FILE already exists — skipping."
fi

# Generate Xcode project
echo "Generating Xcode project with XcodeGen..."
xcodegen generate

echo ""
echo "Setup complete! Open ArchonMobile.xcodeproj in Xcode."
