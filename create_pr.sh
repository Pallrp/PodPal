#!/bin/bash

# Script to help create a pull request for the UI improvements

# Ensure all TypeScript files are compiled
echo "Compiling TypeScript files..."
tsc --project tsconfig.json

# Check if compilation was successful
if [ $? -ne 0 ]; then
    echo "Error: TypeScript compilation failed"
    exit 1
fi

# Create a new branch for the PR
BRANCH_NAME="ui-improvements-$(date +%Y%m%d)"
echo "Creating branch: $BRANCH_NAME"
git checkout -b $BRANCH_NAME

# Add modified files
echo "Adding files to commit..."
git add main.ts main.js agent.ts agent.js styles/main.css index.html .gitignore README.md

# Commit changes
echo "Committing changes..."
git commit -m "UI Improvements: Enhanced pod layout and visual design"

# Push to remote
echo "Pushing to remote repository..."
git push origin $BRANCH_NAME

# Instructions for creating PR
echo ""
echo "Branch '$BRANCH_NAME' has been created and pushed to the remote repository."
echo ""
echo "To create a pull request:"
echo "1. Go to your repository on GitHub/GitLab/etc."
echo "2. Click on 'Pull Requests' or 'Merge Requests'"
echo "3. Click 'New Pull Request'"
echo "4. Select '$BRANCH_NAME' as the source branch"
echo "5. Use the content from PULL_REQUEST.md as the description"
echo ""
echo "Done!" 