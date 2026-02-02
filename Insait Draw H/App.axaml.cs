using Avalonia;
using Avalonia.Controls.ApplicationLifetimes;
using Avalonia.Markup.Xaml;
using WebViewControl;

namespace Insait_Draw_H;

public partial class App : Application
{
    public override void Initialize()
    {
        AvaloniaXamlLoader.Load(this);
        
        // Ініціалізуємо WebView налаштування
        WebView.Settings.OsrEnabled = false;
        
        // Додаємо аргументи для ігнорування помилок сертифікатів (для локального HTTPS сервера)
        WebView.Settings.AddCommandLineSwitch("ignore-certificate-errors", "1");
        WebView.Settings.AddCommandLineSwitch("allow-running-insecure-content", "1");
    }

    public override void OnFrameworkInitializationCompleted()
    {
        if (ApplicationLifetime is IClassicDesktopStyleApplicationLifetime desktop)
        {
            desktop.MainWindow = new MainWindow();
        }

        base.OnFrameworkInitializationCompleted();
    }
}