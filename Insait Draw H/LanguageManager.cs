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
            "tr" => GetTurkishText(key),
            "ru" => GetRussianText(key),
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
            "turkish" => "Turkish",
            "russian" => "Russian",
            
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
            
            // File Association
            "registerFileAssociation" => "Register .insd File Association",
            "reRegisterFileAssociation" => "Re-register File Association",
            "fileAssociationRegistered" => "✓ File association is registered",
            "fileAssociationSuccess" => "✓ File association registered successfully! .insd files will now open with Insait Draw H.",
            "fileAssociationError" => "Error registering file association",
            
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
            "turkish" => "Турецька",
            "russian" => "Російська",
            
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
            
            // Асоціація файлів
            "registerFileAssociation" => "Зареєструвати асоціацію .insd",
            "reRegisterFileAssociation" => "Перереєструвати асоціацію",
            "fileAssociationRegistered" => "✓ Асоціацію файлів зареєстровано",
            "fileAssociationSuccess" => "✓ Асоціацію файлів успішно зареєстровано! Файли .insd тепер відкриватимуться в Insait Draw H.",
            "fileAssociationError" => "Помилка реєстрації асоціації файлів",
            
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
            "turkish" => "Türkisch",
            "russian" => "Russisch",
            
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
            
            // Dateizuordnung
            "registerFileAssociation" => ".insd Dateizuordnung registrieren",
            "reRegisterFileAssociation" => "Dateizuordnung neu registrieren",
            "fileAssociationRegistered" => "✓ Dateizuordnung ist registriert",
            "fileAssociationSuccess" => "✓ Dateizuordnung erfolgreich registriert! .insd Dateien werden jetzt mit Insait Draw H geöffnet.",
            "fileAssociationError" => "Fehler bei der Registrierung der Dateizuordnung",
            
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

    private static string GetTurkishText(string key)
    {
        return key switch
        {
            // Ana pencere
            "about" => "Hakkında",
            "userAgreement" => "Kullanıcı Sözleşmesi",
            "language" => "Dil",
            
            // Dil adları
            "english" => "İngilizce",
            "ukrainian" => "Ukraynaca",
            "german" => "Almanca",
            "turkish" => "Türkçe",
            "russian" => "Rusça",
            
            // Dil seçim penceresi
            "languageSelection" => "Dil Seçimi",
            "selectInterfaceLanguage" => "Arayüz dilini seçin",
            
            // Yükleme Ekranı
            "loadingEditor" => "Editör yükleniyor...",
            "loadingInitializing" => "Çalışma alanı başlatılıyor...",
            "loadingAlmostReady" => "Neredeyse hazır...",
            "loadingFeature1" => "✓ Profesyonel vektör grafik düzenleme",
            "loadingFeature2" => "✓ Bezier eğrileri ve yol araçları",
            "loadingFeature3" => "✓ Katmanlar ve nesne yönetimi",
            
            // Hakkında Penceresi
            "aboutTitle" => "Insait Draw H Hakkında",
            "version" => "Sürüm",
            "description" => "İllüstrasyonlar, tasarımlar ve sanat eserleri oluşturmak için sezgisel bir arayüze sahip modern bir vektör grafik düzenleyicisi.",
            "author" => "Yazar",
            "close" => "Kapat",
            "copyright" => "© 2026 Insait Draw H. Tüm hakları saklıdır.",
            
            // Dosya İlişkilendirmesi
            "registerFileAssociation" => ".insd Dosya İlişkilendirmesini Kaydet",
            "reRegisterFileAssociation" => "Dosya İlişkilendirmesini Yeniden Kaydet",
            "fileAssociationRegistered" => "✓ Dosya ilişkilendirmesi kayıtlı",
            "fileAssociationSuccess" => "✓ Dosya ilişkilendirmesi başarıyla kaydedildi! .insd dosyaları artık Insait Draw H ile açılacak.",
            "fileAssociationError" => "Dosya ilişkilendirmesi kayıt hatası",
            
            // Kullanıcı Sözleşmesi Penceresi
            "userAgreementTitle" => "Kullanıcı Sözleşmesi",
            "privacyAndTerms" => "Gizlilik ve Kullanım Koşulları",
            "localDataStorage" => "Yerel Veri Depolama",
            "localDataStorageText" => "Projeler, ayarlar ve tercihler dahil tüm verileriniz bilgisayarınızda yerel olarak depolanır. Hiçbir veri harici sunuculara veya bulut hizmetlerine aktarılmaz. Yaratıcı çalışmanız tamamen sizin kontrolünüzde ve cihazınızda kalır.",
            "providedAsIs" => "'Olduğu Gibi' Sağlanır",
            "providedAsIsText" => "Bu uygulama açık veya zımni herhangi bir garanti olmaksızın 'olduğu gibi' sağlanmaktadır. Yazar, yazılımın hatasız veya kesintisiz olacağını garanti etmez. Bu yazılımın kullanımı kendi sorumluluğunuzdadır.",
            "acceptanceOfTerms" => "Koşulların Kabulü",
            "acceptanceOfTermsText" => "Insait Draw H'yi kullanarak, bu koşulları okuduğunuzu ve anladığınızı kabul etmiş olursunuz. Yazar, bu yazılımın kullanımından kaynaklanan doğrudan, dolaylı, arızi veya sonuç olarak ortaya çıkan zararlardan sorumlu tutulamaz.",
            "iUnderstand" => "Anladım",
            "authorCopyright" => "© 2026 Oleh Kurylo. Tüm hakları saklıdır.",
            
            _ => key
        };
    }

    private static string GetRussianText(string key)
    {
        return key switch
        {
            // Главное окно
            "about" => "О программе",
            "userAgreement" => "Пользовательское соглашение",
            "language" => "Язык",
            
            // Названия языков
            "english" => "Английский",
            "ukrainian" => "Украинский",
            "german" => "Немецкий",
            "turkish" => "Турецкий",
            "russian" => "Русский",
            
            // Окно выбора языка
            "languageSelection" => "Выбор языка",
            "selectInterfaceLanguage" => "Выберите язык интерфейса",
            
            // Экран загрузки
            "loadingEditor" => "Загрузка редактора...",
            "loadingInitializing" => "Инициализация рабочего пространства...",
            "loadingAlmostReady" => "Почти готово...",
            "loadingFeature1" => "✓ Профессиональное редактирование векторной графики",
            "loadingFeature2" => "✓ Кривые Безье и инструменты контуров",
            "loadingFeature3" => "✓ Слои и управление объектами",
            
            // Окно "О программе"
            "aboutTitle" => "Об Insait Draw H",
            "version" => "Версия",
            "description" => "Современный редактор векторной графики с интуитивным интерфейсом для создания иллюстраций, дизайнов и художественных работ.",
            "author" => "Автор",
            "close" => "Закрыть",
            "copyright" => "© 2026 Insait Draw H. Все права защищены.",
            
            // Ассоциация файлов
            "registerFileAssociation" => "Зарегистрировать ассоциацию .insd",
            "reRegisterFileAssociation" => "Перерегистрировать ассоциацию",
            "fileAssociationRegistered" => "✓ Ассоциация файлов зарегистрирована",
            "fileAssociationSuccess" => "✓ Ассоциация файлов успешно зарегистрирована! Файлы .insd теперь будут открываться в Insait Draw H.",
            "fileAssociationError" => "Ошибка регистрации ассоциации файлов",
            
            // Окно пользовательского соглашения
            "userAgreementTitle" => "Пользовательское соглашение",
            "privacyAndTerms" => "Конфиденциальность и условия использования",
            "localDataStorage" => "Локальное хранение данных",
            "localDataStorageText" => "Все ваши данные, включая проекты, настройки и параметры, хранятся локально на вашем компьютере. Никакие данные не передаются на внешние серверы или облачные сервисы. Ваша творческая работа остаётся полностью под вашим контролем и на вашем устройстве.",
            "providedAsIs" => "Предоставляется «Как Есть»",
            "providedAsIsText" => "Это приложение предоставляется «как есть» без каких-либо гарантий, явных или подразумеваемых. Автор не гарантирует, что программное обеспечение будет безошибочным или бесперебойным. Использование этого программного обеспечения на ваш собственный риск.",
            "acceptanceOfTerms" => "Принятие условий",
            "acceptanceOfTermsText" => "Используя Insait Draw H, вы подтверждаете, что прочитали и поняли эти условия. Автор не несёт ответственности за любые прямые, косвенные, случайные или последующие убытки, возникающие в результате использования этого программного обеспечения.",
            "iUnderstand" => "Понятно",
            "authorCopyright" => "© 2026 Олег Курило. Все права защищены.",
            
            _ => key
        };
    }

    private class Settings
    {
        public string Language { get; set; } = "en";
    }
}
