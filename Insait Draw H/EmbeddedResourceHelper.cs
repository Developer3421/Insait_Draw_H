using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;

namespace Insait_Draw_H;

/// <summary>
/// Допоміжний клас для роботи з embedded resources (React файли вбудовані в exe)
/// </summary>
public static class EmbeddedResourceHelper
{
    private static readonly Assembly Assembly = typeof(EmbeddedResourceHelper).Assembly;
    private static readonly Dictionary<string, byte[]> _cache = new();
    private static readonly HashSet<string> _availableResources;

    static EmbeddedResourceHelper()
    {
        // Кешуємо список всіх embedded resources
        _availableResources = Assembly.GetManifestResourceNames().ToHashSet();
    }

    /// <summary>
    /// Перевіряє чи є embedded resources для wwwroot
    /// </summary>
    public static bool HasEmbeddedWebRoot()
    {
        return _availableResources.Any(r => r.Contains("wwwroot") || r.Contains("wwwroot\\") || r.Contains("wwwroot/"));
    }

    /// <summary>
    /// Отримує список всіх embedded resource імен
    /// </summary>
    public static IEnumerable<string> GetAllResourceNames()
    {
        return _availableResources;
    }

    /// <summary>
    /// Повертає діагностичну інформацію про embedded resources
    /// </summary>
    public static string GetDiagnosticInfo()
    {
        var sb = new System.Text.StringBuilder();
        sb.AppendLine($"Total embedded resources: {_availableResources.Count}");
        sb.AppendLine($"HasEmbeddedWebRoot: {HasEmbeddedWebRoot()}");
        sb.AppendLine($"ResourceExists(index.html): {ResourceExists("index.html")}");
        sb.AppendLine("All resources:");
        foreach (var r in _availableResources.OrderBy(x => x))
        {
            sb.AppendLine($"  - {r}");
        }
        return sb.ToString();
    }

    /// <summary>
    /// Читає embedded resource за віртуальним шляхом (наприклад "/index.html")
    /// </summary>
    public static byte[]? GetResource(string virtualPath)
    {
        // Нормалізуємо шлях
        virtualPath = virtualPath.TrimStart('/').Replace('\\', '/');
        if (string.IsNullOrEmpty(virtualPath) || virtualPath == "/")
        {
            virtualPath = "index.html";
        }

        // Перевіряємо кеш
        if (_cache.TryGetValue(virtualPath, out var cached))
        {
            return cached;
        }

        // Шукаємо ресурс
        var resourceName = FindResourceName(virtualPath);
        if (resourceName == null)
        {
            return null;
        }

        using var stream = Assembly.GetManifestResourceStream(resourceName);
        if (stream == null)
        {
            return null;
        }

        using var ms = new MemoryStream();
        stream.CopyTo(ms);
        var data = ms.ToArray();
        
        // Кешуємо результат
        _cache[virtualPath] = data;
        
        return data;
    }

    /// <summary>
    /// Перевіряє чи існує embedded resource за шляхом
    /// </summary>
    public static bool ResourceExists(string virtualPath)
    {
        virtualPath = virtualPath.TrimStart('/').Replace('\\', '/');
        if (string.IsNullOrEmpty(virtualPath) || virtualPath == "/")
        {
            virtualPath = "index.html";
        }

        return FindResourceName(virtualPath) != null;
    }

    private static string? FindResourceName(string virtualPath)
    {
        // Формуємо можливі імена ресурсу
        // EmbeddedResource з LogicalName = "wwwroot/path/file.ext" або "wwwroot\path\file.ext"
        
        var normalizedPath = virtualPath.Replace('\\', '/').TrimStart('/');
        var backslashPath = virtualPath.Replace('/', '\\').TrimStart('\\');
        
        var possibleNames = new[]
        {
            // З LogicalName (forward slash)
            $"wwwroot/{normalizedPath}",
            // З LogicalName (backslash - Windows стиль)
            $"wwwroot\\{backslashPath}",
            // Без префіксу
            normalizedPath,
            backslashPath,
            // З крапками замість слешів
            $"wwwroot/{normalizedPath.Replace('/', '.')}",
            $"wwwroot.{normalizedPath.Replace('/', '.')}",
            // Namespace варіанти
            $"Insait_Draw_H.wwwroot.{normalizedPath.Replace('/', '.')}",
            $"Insait_Draw_H.{normalizedPath.Replace('/', '.')}"
        };

        foreach (var name in possibleNames)
        {
            // Пряме співпадіння
            if (_availableResources.Contains(name))
            {
                return name;
            }
        }
        
        // Шукаємо ресурс що закінчується на наш шлях (без урахування регістру)
        var match = _availableResources.FirstOrDefault(r =>
        {
            // Нормалізуємо ім'я ресурсу для порівняння
            var normalizedR = r.Replace('\\', '/');
            var targetNormalized = $"wwwroot/{normalizedPath}";
            return normalizedR.Equals(targetNormalized, StringComparison.OrdinalIgnoreCase) ||
                   normalizedR.EndsWith($"/{normalizedPath}", StringComparison.OrdinalIgnoreCase);
        });
            
        if (match != null)
        {
            return match;
        }
        
        // Останній шанс - шукаємо часткове співпадіння по імені файлу
        var fileName = Path.GetFileName(normalizedPath);
        if (!string.IsNullOrEmpty(fileName))
        {
            var partialMatch = _availableResources.FirstOrDefault(r => 
                r.EndsWith(fileName, StringComparison.OrdinalIgnoreCase) ||
                r.EndsWith($"/{fileName}", StringComparison.OrdinalIgnoreCase) ||
                r.EndsWith($"\\{fileName}", StringComparison.OrdinalIgnoreCase));
            if (partialMatch != null)
            {
                return partialMatch;
            }
        }

        return null;
    }
}
