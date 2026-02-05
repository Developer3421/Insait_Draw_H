# Тестування асоціації файлів
# Цей скрипт створює тестовий .insd файл та перевіряє налаштування

$ErrorActionPreference = "Stop"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Тестування асоціації файлів .insd" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Створюємо тестову директорію
$testDir = Join-Path $PSScriptRoot "test-files"
if (-not (Test-Path $testDir)) {
    New-Item -Path $testDir -ItemType Directory -Force | Out-Null
}

# Створюємо тестовий .insd файл (простий JSON для тесту)
$testFile = Join-Path $testDir "test-project.insd"
$testContent = @"
{
  "version": "1.0",
  "name": "Test Project",
  "canvas": {
    "width": 800,
    "height": 600
  },
  "layers": []
}
"@

[System.IO.File]::WriteAllText($testFile, $testContent, [System.Text.Encoding]::UTF8)

Write-Host "✓ Створено тестовий файл:" -ForegroundColor Green
Write-Host "  $testFile" -ForegroundColor Gray
Write-Host ""

# Перевіряємо реєстрацію в реєстрі
Write-Host "Перевірка реєстрації в Windows Registry..." -ForegroundColor Yellow
Write-Host ""

$regPaths = @(
    "HKCU:\Software\Classes\.insd",
    "HKCU:\Software\Classes\InsaitDrawProject",
    "HKCU:\Software\Classes\InsaitDrawProject\DefaultIcon",
    "HKCU:\Software\Classes\InsaitDrawProject\shell\open\command"
)

$allExist = $true
foreach ($path in $regPaths) {
    if (Test-Path $path) {
        Write-Host "  ✓ $path" -ForegroundColor Green
        $value = (Get-ItemProperty -Path $path -Name "(Default)" -ErrorAction SilentlyContinue)."(Default)"
        if ($value) {
            Write-Host "    Значення: $value" -ForegroundColor Gray
        }
    } else {
        Write-Host "  ✗ $path - НЕ ЗНАЙДЕНО" -ForegroundColor Red
        $allExist = $false
    }
}

Write-Host ""

if ($allExist) {
    Write-Host "✓ Усі реєстраційні записи присутні!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Тепер:" -ForegroundColor Cyan
    Write-Host "1. Відкрийте папку:" -ForegroundColor White
    Write-Host "   $testDir" -ForegroundColor Gray
    Write-Host "2. Перевірте, що файл test-project.insd має іконку додатку" -ForegroundColor White
    Write-Host "3. Спробуйте відкрити файл подвійним кліком" -ForegroundColor White
    Write-Host ""
    
    # Відкриваємо папку в Explorer
    Write-Host "Відкриваємо папку в Explorer..." -ForegroundColor Yellow
    Start-Process explorer.exe $testDir
} else {
    Write-Host "✗ Деякі реєстраційні записи відсутні!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Запустіть спочатку:" -ForegroundColor Yellow
    Write-Host "  .\setup-file-association.ps1" -ForegroundColor White
}

Write-Host ""
Read-Host "Натисніть Enter для завершення"
