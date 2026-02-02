using System;
using System.IO;
using System.Text.Json;

namespace Insait_Draw_H;

public static class LanguageManager
{
    private static string _currentLanguage = "en";
    private static readonly string SettingsPath = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
        "InsaitDrawH",
        "settings.json"
    );

    public static string CurrentLanguage
    {
        get => _currentLanguage;
        set
        {
            _currentLanguage = value;
            SaveSettings();
        }
    }

    static LanguageManager()
    {
        LoadSettings();
    }

    private static void LoadSettings()
    {
        try
        {
            if (File.Exists(SettingsPath))
            {
                var json = File.ReadAllText(SettingsPath);
                var settings = JsonSerializer.Deserialize<Settings>(json);
                if (settings != null && !string.IsNullOrEmpty(settings.Language))
                {
                    _currentLanguage = settings.Language;
                }
            }
        }
        catch
        {
            // If loading fails, use default language
            _currentLanguage = "en";
        }
    }

    private static void SaveSettings()
    {
        try
        {
            var directory = Path.GetDirectoryName(SettingsPath);
            if (directory != null && !Directory.Exists(directory))
            {
                Directory.CreateDirectory(directory);
            }

            var settings = new Settings { Language = _currentLanguage };
            var json = JsonSerializer.Serialize(settings, new JsonSerializerOptions { WriteIndented = true });
            File.WriteAllText(SettingsPath, json);
        }
        catch
        {
            // Silently fail if we can't save settings
        }
    }

    public static string GetText(string key)
    {
        return _currentLanguage switch
        {
            "uk" => GetUkrainianText(key),
            "de" => GetGermanText(key),
            _ => GetEnglishText(key)
        };
    }

    private static string GetEnglishText(string key)
    {
        return key switch
        {
            // Main window
            "about" => "About",
            "userAgreement" => "User Agreement",
            "language" => "Language",
            
            // Language names
            "english" => "English",
            "ukrainian" => "Ukrainian",
            "german" => "German",
            
            // Language Selection Window
            "languageSelection" => "Language Selection",
            "selectInterfaceLanguage" => "Select Interface Language",
            
            // Loading Screen
            "loadingEditor" => "Loading editor...",
            "loadingInitializing" => "Initializing workspace...",
            "loadingAlmostReady" => "Almost ready...",
            "loadingFeature1" => "✓ Professional vector graphics editing",
            "loadingFeature2" => "✓ Bezier curves and path tools",
            "loadingFeature3" => "✓ Layers and object management",
            
            // About Window
            "aboutTitle" => "About Insait Draw H",
            "version" => "Version",
            "description" => "A modern vector graphics editor with an intuitive interface for creating illustrations, designs, and artwork.",
            "author" => "Author",
            "close" => "Close",
            "copyright" => "© 2026 Insait Draw H. All rights reserved.",
            
            // User Agreement Window
            "userAgreementTitle" => "User Agreement",
            "privacyAndTerms" => "Privacy and Terms of Use",
            "localDataStorage" => "Local Data Storage",
            "localDataStorageText" => "All your data, including projects, settings, and preferences, are stored locally on your computer. No data is transmitted to external servers or cloud services. Your creative work remains completely under your control and on your device.",
            "providedAsIs" => "Provided 'As Is'",
            "providedAsIsText" => "This application is provided 'as is' without any warranties, express or implied. The author does not guarantee that the software will be error-free or uninterrupted. Use of this software is at your own risk.",
            "acceptanceOfTerms" => "Acceptance of Terms",
            "acceptanceOfTermsText" => "By using Insait Draw H, you acknowledge that you have read and understood these terms. The author shall not be liable for any direct, indirect, incidental, or consequential damages arising from the use of this software.",
            "iUnderstand" => "I Understand",
            "authorCopyright" => "© 2026 Oleh Kurylo. All rights reserved.",
            
            _ => key
        };
    }

    private static string GetUkrainianText(string key)
    {
        return key switch
        {
            // Головне вікно
            "about" => "Про програму",
            "userAgreement" => "Угода користувача",
            "language" => "Мова",
            
            // Назви мов
            "english" => "Англійська",
            "ukrainian" => "Українська",
            "german" => "Німецька",
            
            // Вікно вибору мови
            "languageSelection" => "Вибір мови",
            "selectInterfaceLanguage" => "Виберіть мову інтерфейсу",
            
            // Екран завантаження
            "loadingEditor" => "Завантаження редактора...",
            "loadingInitializing" => "Ініціалізація робочого простору...",
            "loadingAlmostReady" => "Майже готово...",
            "loadingFeature1" => "✓ Професійне редагування векторної графіки",
            "loadingFeature2" => "✓ Криві Безьє та інструменти контурів",
            "loadingFeature3" => "✓ Шари та керування об'єктами",
            
            // Вікно "Про програму"
            "aboutTitle" => "Про Insait Draw H",
            "version" => "Версія",
            "description" => "Сучасний редактор векторної графіки з інтуїтивним інтерфейсом для створення ілюстрацій, дизайнів та художніх робіт.",
            "author" => "Автор",
            "close" => "Закрити",
            "copyright" => "© 2026 Insait Draw H. Всі права захищені.",
            
            // Вікно угоди користувача
            "userAgreementTitle" => "Угода користувача",
            "privacyAndTerms" => "Конфіденційність та умови використання",
            "localDataStorage" => "Локальне зберігання даних",
            "localDataStorageText" => "Всі ваші дані, включаючи проекти, налаштування та параметри, зберігаються локально на вашому комп'ютері. Жодні дані не передаються на зовнішні сервери або хмарні сервіси. Ваша творча робота залишається повністю під вашим контролем та на вашому пристрої.",
            "providedAsIs" => "Надається 'Як Є'",
            "providedAsIsText" => "Ця програма надається 'як є' без будь-яких гарантій, явних чи неявних. Автор не гарантує, що програмне забезпечення буде безпомилковим або безперервним. Використання цього програмного забезпечення на ваш власний ризик.",
            "acceptanceOfTerms" => "Прийняття умов",
            "acceptanceOfTermsText" => "Використовуючи Insait Draw H, ви підтверджуєте, що прочитали та зрозуміли ці умови. Автор не несе відповідальності за будь-які прямі, непрямі, випадкові або наслідкові збитки, що виникають внаслідок використання цього програмного забезпечення.",
            "iUnderstand" => "Зрозуміло",
            "authorCopyright" => "© 2026 Олег Курило. Всі права захищені.",
            
            _ => key
        };
    }

    private static string GetGermanText(string key)
    {
        return key switch
        {
            // Hauptfenster
            "about" => "Über",
            "userAgreement" => "Benutzervereinbarung",
            "language" => "Sprache",
            
            // Sprachnamen
            "english" => "Englisch",
            "ukrainian" => "Ukrainisch",
            "german" => "Deutsch",
            
            // Sprachauswahlfenster
            "languageSelection" => "Sprachauswahl",
            "selectInterfaceLanguage" => "Wählen Sie die Oberflächensprache",
            
            // Ladebildschirm
            "loadingEditor" => "Editor wird geladen...",
            "loadingInitializing" => "Arbeitsbereich wird initialisiert...",
            "loadingAlmostReady" => "Fast fertig...",
            "loadingFeature1" => "✓ Professionelle Vektorgrafik-Bearbeitung",
            "loadingFeature2" => "✓ Bézierkurven und Pfadwerkzeuge",
            "loadingFeature3" => "✓ Ebenen und Objektverwaltung",
            
            // Über-Fenster
            "aboutTitle" => "Über Insait Draw H",
            "version" => "Version",
            "description" => "Ein moderner Vektorgrafik-Editor mit einer intuitiven Benutzeroberfläche zum Erstellen von Illustrationen, Designs und Kunstwerken.",
            "author" => "Autor",
            "close" => "Schließen",
            "copyright" => "© 2026 Insait Draw H. Alle Rechte vorbehalten.",
            
            // Benutzervereinbarungsfenster
            "userAgreementTitle" => "Benutzervereinbarung",
            "privacyAndTerms" => "Datenschutz und Nutzungsbedingungen",
            "localDataStorage" => "Lokale Datenspeicherung",
            "localDataStorageText" => "Alle Ihre Daten, einschließlich Projekte, Einstellungen und Präferenzen, werden lokal auf Ihrem Computer gespeichert. Keine Daten werden an externe Server oder Cloud-Dienste übertragen. Ihre kreative Arbeit bleibt vollständig unter Ihrer Kontrolle und auf Ihrem Gerät.",
            "providedAsIs" => "Bereitstellung 'Wie Besehen'",
            "providedAsIsText" => "Diese Anwendung wird 'wie besehen' ohne jegliche Garantien, ausdrücklich oder stillschweigend, bereitgestellt. Der Autor garantiert nicht, dass die Software fehlerfrei oder unterbrechungsfrei ist. Die Nutzung dieser Software erfolgt auf eigenes Risiko.",
            "acceptanceOfTerms" => "Annahme der Bedingungen",
            "acceptanceOfTermsText" => "Durch die Nutzung von Insait Draw H bestätigen Sie, dass Sie diese Bedingungen gelesen und verstanden haben. Der Autor haftet nicht für direkte, indirekte, zufällige oder Folgeschäden, die aus der Nutzung dieser Software entstehen.",
            "iUnderstand" => "Ich verstehe",
            "authorCopyright" => "© 2026 Oleh Kurylo. Alle Rechte vorbehalten.",
            
            _ => key
        };
    }

    private class Settings
    {
        public string Language { get; set; } = "en";
    }
}
