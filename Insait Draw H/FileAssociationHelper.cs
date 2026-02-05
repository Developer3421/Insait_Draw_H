using System;
using System.Runtime.InteropServices;
using System.Runtime.Versioning;
using Microsoft.Win32;

namespace Insait_Draw_H;

/// <summary>
/// Допоміжний клас для автоматичної реєстрації асоціації файлів .insd
/// Працює без прав адміністратора (використовує HKEY_CURRENT_USER)
/// </summary>
public static class FileAssociationHelper
{
    private const string FileExtension = ".insd";
    private const string ProgId = "InsaitDrawProject";
    private const string FileTypeDescription = "Insait Draw Project";
    private const string ContentType = "application/x-insait-draw";

    // Windows Shell32 API для оновлення кешу іконок
    [DllImport("shell32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern void SHChangeNotify(int wEventId, int uFlags, IntPtr dwItem1, IntPtr dwItem2);

    private const int SHCNE_ASSOCCHANGED = 0x08000000;
    private const int SHCNF_IDLIST = 0;

    /// <summary>
    /// Реєструє асоціацію файлів .insd для поточного користувача
    /// </summary>
    public static void RegisterFileAssociation()
    {
        // Працює тільки на Windows
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            System.Diagnostics.Debug.WriteLine("[FileAssociation] Skipping - not Windows");
            return;
        }

        try
        {
            // Отримуємо шлях до поточного exe файлу
            var exePath = Environment.ProcessPath;
            if (string.IsNullOrEmpty(exePath))
            {
                exePath = System.Reflection.Assembly.GetExecutingAssembly().Location;
            }

            if (string.IsNullOrEmpty(exePath) || !System.IO.File.Exists(exePath))
            {
                System.Diagnostics.Debug.WriteLine("[FileAssociation] Cannot find exe path");
                return;
            }

            // Перевіряємо чи вже зареєстровано з правильним шляхом
            if (IsAlreadyRegistered(exePath))
            {
                System.Diagnostics.Debug.WriteLine("[FileAssociation] Already registered with correct path");
                return;
            }

            System.Diagnostics.Debug.WriteLine($"[FileAssociation] Registering file association for: {exePath}");

            var iconPath = $"{exePath},0";

            // 1. Реєструємо розширення .insd
            using (var extKey = Registry.CurrentUser.CreateSubKey($@"Software\Classes\{FileExtension}"))
            {
                extKey.SetValue("", ProgId);
                extKey.SetValue("Content Type", ContentType);
            }

            // 2. Створюємо тип файлу
            using (var progIdKey = Registry.CurrentUser.CreateSubKey($@"Software\Classes\{ProgId}"))
            {
                progIdKey.SetValue("", FileTypeDescription);
                progIdKey.SetValue("FriendlyTypeName", FileTypeDescription);
            }

            // 3. Встановлюємо іконку
            using (var iconKey = Registry.CurrentUser.CreateSubKey($@"Software\Classes\{ProgId}\DefaultIcon"))
            {
                iconKey.SetValue("", iconPath);
            }

            // 4. Налаштовуємо команду відкриття
            using (var shellKey = Registry.CurrentUser.CreateSubKey($@"Software\Classes\{ProgId}\shell"))
            {
                shellKey.SetValue("", "open");
            }

            using (var openKey = Registry.CurrentUser.CreateSubKey($@"Software\Classes\{ProgId}\shell\open"))
            {
                openKey.SetValue("", "Відкрити в Insait Draw");
                openKey.SetValue("FriendlyAppName", "Insait Draw H");
            }

            using (var commandKey = Registry.CurrentUser.CreateSubKey($@"Software\Classes\{ProgId}\shell\open\command"))
            {
                commandKey.SetValue("", $"\"{exePath}\" \"%1\"");
            }

            // 5. Реєструємо додаток
            using (var appKey = Registry.CurrentUser.CreateSubKey(@"Software\Classes\Applications\Insait Draw H.exe"))
            {
                appKey.SetValue("FriendlyAppName", "Insait Draw H");
            }

            using (var appIconKey = Registry.CurrentUser.CreateSubKey(@"Software\Classes\Applications\Insait Draw H.exe\DefaultIcon"))
            {
                appIconKey.SetValue("", iconPath);
            }

            using (var appCommandKey = Registry.CurrentUser.CreateSubKey(@"Software\Classes\Applications\Insait Draw H.exe\shell\open\command"))
            {
                appCommandKey.SetValue("", $"\"{exePath}\" \"%1\"");
            }

            using (var supportedKey = Registry.CurrentUser.CreateSubKey(@"Software\Classes\Applications\Insait Draw H.exe\SupportedTypes"))
            {
                supportedKey.SetValue(FileExtension, "");
            }

            // Оновлюємо кеш іконок Windows
            SHChangeNotify(SHCNE_ASSOCCHANGED, SHCNF_IDLIST, IntPtr.Zero, IntPtr.Zero);

            System.Diagnostics.Debug.WriteLine("[FileAssociation] Successfully registered!");
        }
        catch (Exception ex)
        {
            // Не критична помилка - просто логуємо
            System.Diagnostics.Debug.WriteLine($"[FileAssociation] Error: {ex.Message}");
        }
    }

    /// <summary>
    /// Перевіряє чи асоціація зареєстрована (публічний метод)
    /// </summary>
    public static bool IsRegistered()
    {
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            return false;

        try
        {
            var exePath = Environment.ProcessPath;
            if (string.IsNullOrEmpty(exePath))
            {
                exePath = System.Reflection.Assembly.GetExecutingAssembly().Location;
            }

            if (string.IsNullOrEmpty(exePath))
                return false;

            return IsAlreadyRegistered(exePath);
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Перевіряє чи асоціація вже зареєстрована з правильним шляхом
    /// </summary>
    [SupportedOSPlatform("windows")]
    private static bool IsAlreadyRegistered(string exePath)
    {
        try
        {
            using var commandKey = Registry.CurrentUser.OpenSubKey($@"Software\Classes\{ProgId}\shell\open\command");
            if (commandKey == null) return false;

            var currentCommand = commandKey.GetValue("")?.ToString();
            if (string.IsNullOrEmpty(currentCommand)) return false;

            // Перевіряємо чи шлях співпадає
            return currentCommand.Contains(exePath, StringComparison.OrdinalIgnoreCase);
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Видаляє асоціацію файлів .insd
    /// </summary>
    public static void UnregisterFileAssociation()
    {
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            return;

        try
        {
            Registry.CurrentUser.DeleteSubKeyTree($@"Software\Classes\{FileExtension}", false);
            Registry.CurrentUser.DeleteSubKeyTree($@"Software\Classes\{ProgId}", false);
            Registry.CurrentUser.DeleteSubKeyTree(@"Software\Classes\Applications\Insait Draw H.exe", false);

            SHChangeNotify(SHCNE_ASSOCCHANGED, SHCNF_IDLIST, IntPtr.Zero, IntPtr.Zero);

            System.Diagnostics.Debug.WriteLine("[FileAssociation] Successfully unregistered!");
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[FileAssociation] Unregister error: {ex.Message}");
        }
    }
}
