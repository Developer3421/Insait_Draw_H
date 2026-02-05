# Налаштування асоціації файлів .insd для Insait Draw H
# Працює БЕЗ прав адміністратора (використовує HKEY_CURRENT_USER)

param(
    [string]$ExePath
)

$ErrorActionPreference = "Stop"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Налаштування асоціації файлів .insd" -ForegroundColor Cyan
Write-Host "  (без прав адміністратора)" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Визначаємо шлях до exe файлу
if (-not $ExePath) {
    # Шукаємо в типових місцях
    $possiblePaths = @(
        (Join-Path $PSScriptRoot "publish_test\Insait Draw H.exe"),
        (Join-Path $PSScriptRoot "Insait Draw H\bin\Release\net10.0\win-x64\publish\Insait Draw H.exe"),
        (Join-Path $PSScriptRoot "Insait Draw H\bin\Release\net10.0\win-x86\publish\Insait Draw H.exe"),
        (Join-Path $PSScriptRoot "Insait Draw H\bin\Publish\Insait Draw H.exe"),
        (Join-Path $PSScriptRoot "Insait Draw H\bin\Debug\net10.0\Insait Draw H.exe")
    )
    
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            $ExePath = $path
            break
        }
    }
}

if (-not $ExePath -or -not (Test-Path $ExePath)) {
    Write-Host "✗ Помилка: Не знайдено exe файл!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Використання:" -ForegroundColor Yellow
    Write-Host "  .\setup-file-association.ps1 -ExePath ""шлях\до\Insait Draw H.exe""" -ForegroundColor White
    Write-Host ""
    Write-Host "Або спочатку зберіть проект:" -ForegroundColor Yellow
    Write-Host "  dotnet publish -c Release -r win-x64" -ForegroundColor White
    exit 1
}

$ExePath = (Resolve-Path $ExePath).Path
$IconPath = "$ExePath,0"  # Використовуємо іконку з exe файлу

Write-Host "Exe файл: $ExePath" -ForegroundColor Gray
Write-Host "Іконка: $IconPath" -ForegroundColor Gray
Write-Host ""

# Створюємо записи в реєстрі (HKCU не потребує адмін прав)
Write-Host "Створюємо записи в реєстрі..." -ForegroundColor Yellow

try {
    # 1. Реєструємо розширення .insd
    $extPath = "HKCU:\Software\Classes\.insd"
    if (-not (Test-Path $extPath)) {
        New-Item -Path $extPath -Force | Out-Null
    }
    Set-ItemProperty -Path $extPath -Name "(Default)" -Value "InsaitDrawProject"
    Set-ItemProperty -Path $extPath -Name "Content Type" -Value "application/x-insait-draw"
    Write-Host "  ✓ Зареєстровано розширення .insd" -ForegroundColor Green

    # 2. Створюємо тип файлу InsaitDrawProject
    $typePath = "HKCU:\Software\Classes\InsaitDrawProject"
    if (-not (Test-Path $typePath)) {
        New-Item -Path $typePath -Force | Out-Null
    }
    Set-ItemProperty -Path $typePath -Name "(Default)" -Value "Insait Draw Project"
    Set-ItemProperty -Path $typePath -Name "FriendlyTypeName" -Value "Insait Draw Project"
    Write-Host "  ✓ Створено тип файлу InsaitDrawProject" -ForegroundColor Green

    # 3. Встановлюємо іконку за замовчуванням
    $iconPath = "HKCU:\Software\Classes\InsaitDrawProject\DefaultIcon"
    if (-not (Test-Path $iconPath)) {
        New-Item -Path $iconPath -Force | Out-Null
    }
    Set-ItemProperty -Path $iconPath -Name "(Default)" -Value $IconPath
    Write-Host "  ✓ Встановлено іконку: $IconPath" -ForegroundColor Green

    # 4. Створюємо команду відкриття
    $shellPath = "HKCU:\Software\Classes\InsaitDrawProject\shell"
    if (-not (Test-Path $shellPath)) {
        New-Item -Path $shellPath -Force | Out-Null
    }
    Set-ItemProperty -Path $shellPath -Name "(Default)" -Value "open"

    $openPath = "HKCU:\Software\Classes\InsaitDrawProject\shell\open"
    if (-not (Test-Path $openPath)) {
        New-Item -Path $openPath -Force | Out-Null
    }
    Set-ItemProperty -Path $openPath -Name "(Default)" -Value "Відкрити в Insait Draw"
    Set-ItemProperty -Path $openPath -Name "FriendlyAppName" -Value "Insait Draw H"

    $commandPath = "HKCU:\Software\Classes\InsaitDrawProject\shell\open\command"
    if (-not (Test-Path $commandPath)) {
        New-Item -Path $commandPath -Force | Out-Null
    }
    Set-ItemProperty -Path $commandPath -Name "(Default)" -Value "`"$ExePath`" `"%1`""
    Write-Host "  ✓ Налаштовано команду відкриття" -ForegroundColor Green

    # 5. Реєструємо програму в списку додатків
    $appPath = "HKCU:\Software\Classes\Applications\Insait Draw H.exe"
    if (-not (Test-Path $appPath)) {
        New-Item -Path $appPath -Force | Out-Null
    }
    Set-ItemProperty -Path $appPath -Name "FriendlyAppName" -Value "Insait Draw H"

    $appShellPath = "$appPath\shell\open\command"
    if (-not (Test-Path $appShellPath)) {
        New-Item -Path $appShellPath -Force | Out-Null
    }
    Set-ItemProperty -Path $appShellPath -Name "(Default)" -Value "`"$ExePath`" `"%1`""
    
    $appIconPath = "$appPath\DefaultIcon"
    if (-not (Test-Path $appIconPath)) {
        New-Item -Path $appIconPath -Force | Out-Null
    }
    Set-ItemProperty -Path $appIconPath -Name "(Default)" -Value $IconPath
    Write-Host "  ✓ Зареєстровано додаток" -ForegroundColor Green

    # 6. Додаємо підтримку SupportedTypes для .insd
    $supportedPath = "$appPath\SupportedTypes"
    if (-not (Test-Path $supportedPath)) {
        New-Item -Path $supportedPath -Force | Out-Null
    }
    Set-ItemProperty -Path $supportedPath -Name ".insd" -Value ""
    Write-Host "  ✓ Додано підтримку типу .insd" -ForegroundColor Green

    Write-Host ""
    Write-Host "✓ Асоціацію файлів успішно налаштовано!" -ForegroundColor Green
    Write-Host ""

    # Оновлюємо кеш іконок Windows
    Write-Host "Оновлюємо кеш іконок Windows..." -ForegroundColor Yellow
    
    # Повідомляємо систему про зміни
    $code = @'
    [DllImport("shell32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern void SHChangeNotify(int wEventId, int uFlags, IntPtr dwItem1, IntPtr dwItem2);
'@
    
    Add-Type -MemberDefinition $code -Namespace Win32 -Name Shell32
    
    # SHCNE_ASSOCCHANGED = 0x08000000, SHCNF_IDLIST = 0
    [Win32.Shell32]::SHChangeNotify(0x08000000, 0, [IntPtr]::Zero, [IntPtr]::Zero)
    
    Write-Host "  ✓ Кеш іконок оновлено" -ForegroundColor Green
    Write-Host ""
    Write-Host "Тепер файли .insd будуть:" -ForegroundColor Cyan
    Write-Host "  • Відображатися з іконкою Insait Draw H" -ForegroundColor White
    Write-Host "  • Відкриватися подвійним кліком в Insait Draw H" -ForegroundColor White
    Write-Host ""
    Write-Host "Примітка: Може знадобитися перезапустити Explorer" -ForegroundColor Yellow
    Write-Host "          або вийти/увійти в систему для застосування змін." -ForegroundColor Yellow
}
catch {
    Write-Host ""
    Write-Host "✗ Помилка: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Read-Host "Натисніть Enter для завершення"
