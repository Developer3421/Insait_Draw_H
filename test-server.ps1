# Тестуємо HTTP сервер
Write-Host "Компілюємо проект..." -ForegroundColor Yellow
$buildOutput = dotnet build "Insait Draw H\Insait Draw H.csproj" -c Debug --nologo 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Помилка компіляції!" -ForegroundColor Red
    $buildOutput
    exit 1
}
Write-Host "Компіляція успішна!" -ForegroundColor Green

Write-Host "`nЗапускаємо додаток..." -ForegroundColor Yellow
Write-Host "Після запуску перевірте http://localhost:8765/ у браузері" -ForegroundColor Cyan
Write-Host "Натисніть Ctrl+C для зупинки`n" -ForegroundColor Gray

# Запускаємо додаток
& "Insait Draw H\bin\Debug\net8.0\Insait Draw H.exe"
