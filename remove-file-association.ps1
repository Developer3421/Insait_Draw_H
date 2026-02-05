# Видалення асоціації файлів .insd для Insait Draw H
# Працює БЕЗ прав адміністратора (використовує HKEY_CURRENT_USER)

$ErrorActionPreference = "Stop"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Видалення асоціації файлів .insd" -ForegroundColor Cyan
Write-Host "  (без прав адміністратора)" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$regPaths = @(
    "HKCU:\Software\Classes\.insd",
    "HKCU:\Software\Classes\InsaitDrawProject",
    "HKCU:\Software\Classes\Applications\Insait Draw H.exe"
)

$removed = 0

foreach ($path in $regPaths) {
    if (Test-Path $path) {
        try {
            Remove-Item -Path $path -Recurse -Force
            Write-Host "  ✓ Видалено: $path" -ForegroundColor Green
            $removed++
        }
        catch {
            Write-Host "  ✗ Не вдалося видалити: $path" -ForegroundColor Red
            Write-Host "    Помилка: $_" -ForegroundColor Gray
        }
    }
    else {
        Write-Host "  - Не знайдено: $path" -ForegroundColor Gray
    }
}

Write-Host ""

if ($removed -gt 0) {
    Write-Host "✓ Видалено $removed записів з реєстру" -ForegroundColor Green
    
    # Оновлюємо кеш іконок Windows
    Write-Host ""
    Write-Host "Оновлюємо кеш іконок Windows..." -ForegroundColor Yellow
    
    $code = @'
    [DllImport("shell32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern void SHChangeNotify(int wEventId, int uFlags, IntPtr dwItem1, IntPtr dwItem2);
'@
    
    Add-Type -MemberDefinition $code -Namespace Win32 -Name Shell32 -ErrorAction SilentlyContinue
    
    # SHCNE_ASSOCCHANGED = 0x08000000, SHCNF_IDLIST = 0
    [Win32.Shell32]::SHChangeNotify(0x08000000, 0, [IntPtr]::Zero, [IntPtr]::Zero)
    
    Write-Host "  ✓ Кеш іконок оновлено" -ForegroundColor Green
    Write-Host ""
    Write-Host "Примітка: Може знадобитися перезапустити Explorer" -ForegroundColor Yellow
    Write-Host "          для повного застосування змін." -ForegroundColor Yellow
}
else {
    Write-Host "Жодних записів для видалення не знайдено." -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Натисніть Enter для завершення"
