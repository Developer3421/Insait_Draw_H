# Build script for Insait Draw H
# This script builds the React app and then the .NET application

Write-Host "Building React application..." -ForegroundColor Cyan

# Navigate to React project and build
Set-Location "Insait Draw H\Draw WebUi\vite-project"

# Check if node_modules exists, if not run npm install
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing npm dependencies..." -ForegroundColor Yellow
    npm install
}

# Build React app
Write-Host "Running npm build..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "React build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "React build completed successfully!" -ForegroundColor Green

# Return to root directory
Set-Location "..\..\..\"

# Build .NET application
Write-Host "`nBuilding .NET application..." -ForegroundColor Cyan
dotnet build "Insait Draw H/Insait Draw H.csproj"

if ($LASTEXITCODE -ne 0) {
    Write-Host ".NET build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n.NET build completed successfully!" -ForegroundColor Green

# Ask if user wants to run the application
$response = Read-Host "`nDo you want to run the application? (Y/N)"
if ($response -eq "Y" -or $response -eq "y") {
    Write-Host "Starting application..." -ForegroundColor Cyan
    dotnet run --project "Insait Draw H/Insait Draw H.csproj"
}
