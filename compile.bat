@echo off
setlocal

echo Compiling TypeScript files...

:: Use the tsconfig.json for compilation
call npx tsc --project tsconfig.json

if %ERRORLEVEL% neq 0 (
    echo Error compiling TypeScript files
    exit /b 1
)

echo Compilation completed successfully!
echo Open index.html in your browser to run the application.

endlocal 