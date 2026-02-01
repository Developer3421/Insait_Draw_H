@echo off
echo =========================================
echo Building Insait Draw H
echo =========================================
echo.

echo [1/3] Building React application...
cd "Insait Draw H\Draw WebUi\vite-project"

if not exist "node_modules" (
    echo Installing npm dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: npm install failed!
        pause
        exit /b 1
    )
)

echo Running npm build...
call npm run build
if errorlevel 1 (
    echo ERROR: React build failed!
    pause
    exit /b 1
)

echo React build completed successfully!
echo.

cd "..\..\..\"

echo [2/3] Building .NET application...
dotnet build "Insait Draw H/Insait Draw H.csproj"
if errorlevel 1 (
    echo ERROR: .NET build failed!
    pause
    exit /b 1
)

echo.
echo =========================================
echo Build completed successfully!
echo =========================================
echo.

set /p response="Do you want to run the application? (Y/N): "
if /i "%response%"=="Y" (
    echo.
    echo Starting application...
    dotnet run --project "Insait Draw H/Insait Draw H.csproj"
)
