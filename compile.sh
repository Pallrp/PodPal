#!/bin/bash

# Compile TypeScript files with proper settings
echo "Compiling TypeScript files..."

# Use the tsconfig.json for compilation
tsc --project tsconfig.json

if [ $? -ne 0 ]; then
    echo "Error compiling TypeScript files"
    exit 1
fi

echo "Compilation completed successfully!"
echo "Open index.html in your browser to run the application." 