using System;
using System.IO;
using System.Net;
using System.Net.Security;
using System.Net.Sockets;
using System.Reflection;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Interactivity;
using Avalonia.Layout;
using Avalonia.Media;
using Avalonia.Threading;
using WebViewControl;

namespace Insait_Draw_H;

public partial class MainWindow : Window
{
    private WebView? _webView;
    private string? _distFolder;
    private TcpListener? _tcpListener;
    private CancellationTokenSource? _serverCts;
    private int _serverPort = 8765;
    private X509Certificate2? _certificate;
    private DispatcherTimer? _loadingTimer;
    private int _loadingProgress = 0;

    public MainWindow()
    {
        InitializeComponent();
        UpdateLoadingScreenTexts();
        InitializeWebView();
    }

    protected override void OnClosed(EventArgs e)
    {
        base.OnClosed(e);
        StopLocalServer();
    }

    private void TitleBar_OnPointerPressed(object? sender, PointerPressedEventArgs e)
    {
        // Підтримка перетягування вікна як мишею, так і тачем на Windows планшетах
        if (e.GetCurrentPoint(this).Properties.IsLeftButtonPressed || 
            e.GetCurrentPoint(this).Properties.PointerUpdateKind == PointerUpdateKind.LeftButtonPressed)
        {
            BeginMoveDrag(e);
        }
    }

    private void MinimizeButton_OnClick(object? sender, RoutedEventArgs e)
    {
        WindowState = WindowState.Minimized;
    }

    private void MaximizeButton_OnClick(object? sender, RoutedEventArgs e)
    {
        WindowState = WindowState == WindowState.Maximized ? WindowState.Normal : WindowState.Maximized;
    }

    private void CloseButton_OnClick(object? sender, RoutedEventArgs e)
    {
        Close();
    }

    private async void UserAgreementButton_OnClick(object? sender, RoutedEventArgs e)
    {
        var dialog = new UserAgreementWindow();
        await dialog.ShowDialog(this);
    }

    private async void AboutButton_OnClick(object? sender, RoutedEventArgs e)
    {
        var dialog = new AboutWindow();
        await dialog.ShowDialog(this);
    }

    private async void LanguageButton_OnClick(object? sender, RoutedEventArgs e)
    {
        var dialog = new LanguageSelectionWindow();
        await dialog.ShowDialog(this);
    }

    private void UpdateLoadingScreenTexts()
    {
        var loadingStatus = this.FindControl<TextBlock>("LoadingStatusText");
        var feature1 = this.FindControl<TextBlock>("LoadingFeature1");
        var feature2 = this.FindControl<TextBlock>("LoadingFeature2");
        var feature3 = this.FindControl<TextBlock>("LoadingFeature3");
        
        if (loadingStatus != null)
            loadingStatus.Text = LanguageManager.GetText("loadingEditor");
        if (feature1 != null)
            feature1.Text = LanguageManager.GetText("loadingFeature1");
        if (feature2 != null)
            feature2.Text = LanguageManager.GetText("loadingFeature2");
        if (feature3 != null)
            feature3.Text = LanguageManager.GetText("loadingFeature3");
    }

    private void StartLoadingAnimation()
    {
        _loadingProgress = 0;
        _loadingTimer = new DispatcherTimer
        {
            Interval = TimeSpan.FromMilliseconds(30)
        };
        
        _loadingTimer.Tick += (s, e) =>
        {
            _loadingProgress += 2;
            UpdateLoadingProgress(_loadingProgress);
            
            if (_loadingProgress >= 30)
            {
                UpdateLoadingStatus(LanguageManager.GetText("loadingInitializing"));
            }
            
            if (_loadingProgress >= 70)
            {
                UpdateLoadingStatus(LanguageManager.GetText("loadingAlmostReady"));
            }
        };
        
        _loadingTimer.Start();
    }

    private void UpdateLoadingProgress(int progress)
    {
        var progressBar = this.FindControl<Border>("LoadingProgressBar");
        if (progressBar != null)
        {
            var targetWidth = Math.Min(progress, 100) * 2; // 200 max width
            progressBar.Width = targetWidth;
        }
    }

    private void UpdateLoadingStatus(string status)
    {
        var statusText = this.FindControl<TextBlock>("LoadingStatusText");
        if (statusText != null)
        {
            statusText.Text = status;
        }
    }

    private void HideLoadingScreen()
    {
        _loadingTimer?.Stop();
        _loadingTimer = null;
        
        var loadingScreen = this.FindControl<Border>("LoadingScreen");
        if (loadingScreen != null)
        {
            loadingScreen.IsVisible = false;
        }
    }

    private bool _useEmbeddedResources;

    private void InitializeWebView()
    {
        // Start loading animation
        StartLoadingAnimation();
        
        var host = this.FindControl<ContentControl>("WebViewHost");
        if (host is null)
        {
            return;
        }

        try
        {
            // Спочатку перевіряємо embedded resources (для production exe)
            var hasEmbedded = EmbeddedResourceHelper.HasEmbeddedWebRoot();
            var hasIndex = EmbeddedResourceHelper.ResourceExists("index.html");
            _useEmbeddedResources = hasEmbedded && hasIndex;
            
            // Діагностика (можна прибрати пізніше)
            System.Diagnostics.Debug.WriteLine($"[WebView] HasEmbeddedWebRoot: {hasEmbedded}");
            System.Diagnostics.Debug.WriteLine($"[WebView] ResourceExists(index.html): {hasIndex}");
            System.Diagnostics.Debug.WriteLine($"[WebView] UseEmbeddedResources: {_useEmbeddedResources}");
            System.Diagnostics.Debug.WriteLine(EmbeddedResourceHelper.GetDiagnosticInfo());

            if (!_useEmbeddedResources)
            {
                // Якщо немає embedded resources, шукаємо на файловій системі
                _distFolder = GetDistFolder();
                var localHtmlPath = _distFolder != null ? Path.Combine(_distFolder, "index.html") : null;
                System.Diagnostics.Debug.WriteLine($"[WebView] Fallback to filesystem: {_distFolder}");
                
                if (string.IsNullOrEmpty(_distFolder) || !File.Exists(localHtmlPath))
                {
                    // Якщо dist не існує, показуємо повідомлення
                    var diagInfo = EmbeddedResourceHelper.GetDiagnosticInfo();
                    host.Content = new TextBlock
                    {
                        Text = $"React build not found.\nPlease run 'npm run build' in the vite-project folder.\nExpected path: {localHtmlPath}\n\nDiagnostic Info:\n{diagInfo}",
                        TextWrapping = TextWrapping.Wrap,
                        Foreground = Brushes.DimGray,
                        HorizontalAlignment = HorizontalAlignment.Center,
                        VerticalAlignment = VerticalAlignment.Center,
                        Margin = new Thickness(24)
                    };
                    return;
                }
            }

            // Запускаємо локальний HTTP сервер
            StartLocalServer();

            _webView = new WebView
            {
                HorizontalAlignment = HorizontalAlignment.Stretch,
                VerticalAlignment = VerticalAlignment.Stretch
            };
            
            // Add handler for when page finishes loading
            _webView.Navigated += (_, _) =>
            {
                Dispatcher.UIThread.InvokeAsync(() =>
                {
                    // Complete loading animation
                    UpdateLoadingProgress(100);
                    
                    // Small delay to show complete progress bar
                    Task.Delay(500).ContinueWith(_ =>
                    {
                        Dispatcher.UIThread.InvokeAsync(HideLoadingScreen);
                    });
                });
            };
            
            host.Content = _webView;
            
            // Навігуємо на локальний HTTPS сервер
            _webView.Address = $"https://127.0.0.1:{_serverPort}/";
        }
        catch (Exception ex)
        {
            host.Content = new TextBlock
            {
                Text = $"Failed to initialize WebView: {ex.Message}",
                TextWrapping = TextWrapping.Wrap,
                Foreground = Brushes.DimGray,
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center,
                Margin = new Thickness(24)
            };
        }
    }

    private void StartLocalServer()
    {
        _serverCts = new CancellationTokenSource();
        
        // Генеруємо самопідписаний SSL сертифікат
        _certificate = GenerateSelfSignedCertificate();
        
        // Шукаємо вільний порт
        for (int port = 8765; port < 9000; port++)
        {
            try
            {
                // IPAddress.Any дозволяє приймати з'єднання з будь-якого мережевого інтерфейсу
                _tcpListener = new TcpListener(IPAddress.Any, port);
                _tcpListener.Start();
                _serverPort = port;
                break;
            }
            catch (SocketException)
            {
                // Порт зайнятий, пробуємо наступний
                continue;
            }
        }
        
        if (_tcpListener == null)
        {
            throw new Exception("Could not find an available port");
        }
        
        Task.Run(async () =>
        {
            while (!_serverCts.Token.IsCancellationRequested)
            {
                try
                {
                    var client = await _tcpListener.AcceptTcpClientAsync(_serverCts.Token);
                    _ = Task.Run(() => HandleClientAsync(client));
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (SocketException)
                {
                    break;
                }
            }
        }, _serverCts.Token);
    }

    private static X509Certificate2 GenerateSelfSignedCertificate()
    {
        using var rsa = RSA.Create(2048);
        var request = new CertificateRequest(
            "CN=localhost",
            rsa,
            HashAlgorithmName.SHA256,
            RSASignaturePadding.Pkcs1);

        // Додаємо розширення для самопідписаного сертифіката
        request.CertificateExtensions.Add(
            new X509BasicConstraintsExtension(false, false, 0, true));
        request.CertificateExtensions.Add(
            new X509KeyUsageExtension(
                X509KeyUsageFlags.DigitalSignature | X509KeyUsageFlags.KeyEncipherment,
                true));
        request.CertificateExtensions.Add(
            new X509EnhancedKeyUsageExtension(
                new OidCollection { new Oid("1.3.6.1.5.5.7.3.1") }, // Server Authentication
                true));

        // Subject Alternative Names (SAN)
        var sanBuilder = new SubjectAlternativeNameBuilder();
        sanBuilder.AddIpAddress(IPAddress.Parse("127.0.0.1"));
        sanBuilder.AddDnsName("localhost");
        request.CertificateExtensions.Add(sanBuilder.Build());

        var certificate = request.CreateSelfSigned(
            DateTimeOffset.Now.AddDays(-1),
            DateTimeOffset.Now.AddYears(10));

        // Експортуємо та імпортуємо з приватним ключем для Windows
        var pfxBytes = certificate.Export(X509ContentType.Pfx);
#pragma warning disable SYSLIB0057
        return new X509Certificate2(
            pfxBytes,
            (string?)null,
            X509KeyStorageFlags.Exportable | X509KeyStorageFlags.PersistKeySet);
#pragma warning restore SYSLIB0057
    }

    private void StopLocalServer()
    {
        _serverCts?.Cancel();
        _tcpListener?.Stop();
    }

    private async Task HandleClientAsync(TcpClient client)
    {
        try
        {
            using var networkStream = client.GetStream();
            using var sslStream = new SslStream(networkStream, false);
            
            // Виконуємо SSL handshake
            await sslStream.AuthenticateAsServerAsync(_certificate!, false, 
                System.Security.Authentication.SslProtocols.Tls12 | System.Security.Authentication.SslProtocols.Tls13, 
                false);
            
            using var reader = new StreamReader(sslStream, Encoding.UTF8, leaveOpen: true);
            
            // Читаємо HTTP запит
            var requestLine = await reader.ReadLineAsync();
            if (string.IsNullOrEmpty(requestLine)) return;

            // Зчитуємо заголовки та тіло запиту
            var headers = new System.Collections.Generic.Dictionary<string, string>();
            string? headerLine;
            int contentLength = 0;
            while (!string.IsNullOrEmpty(headerLine = await reader.ReadLineAsync()))
            {
                var colonIndex = headerLine.IndexOf(':');
                if (colonIndex > 0)
                {
                    var key = headerLine.Substring(0, colonIndex).Trim().ToLowerInvariant();
                    var value = headerLine.Substring(colonIndex + 1).Trim();
                    headers[key] = value;
                    if (key == "content-length")
                    {
                        int.TryParse(value, out contentLength);
                    }
                }
            }

            // Парсимо шлях
            var parts = requestLine.Split(' ');
            if (parts.Length < 2) return;
            
            var method = parts[0];
            var urlPath = parts[1];
            
            // API endpoints для налаштувань мови
            if (urlPath == "/api/language" && method == "GET")
            {
                // Повертаємо поточну мову
                var langJson = $"{{\"language\":\"{LanguageManager.CurrentLanguage}\"}}";
                var langBody = Encoding.UTF8.GetBytes(langJson);
                var langHeader = "HTTP/1.1 200 OK\r\n" +
                                 "Content-Type: application/json\r\n" +
                                 $"Content-Length: {langBody.Length}\r\n" +
                                 "Connection: close\r\n" +
                                 "Access-Control-Allow-Origin: *\r\n" +
                                 "\r\n";
                var langHeaderBytes = Encoding.UTF8.GetBytes(langHeader);
                await sslStream.WriteAsync(langHeaderBytes, 0, langHeaderBytes.Length);
                await sslStream.WriteAsync(langBody, 0, langBody.Length);
                return;
            }
            
            if (urlPath == "/api/language" && method == "POST")
            {
                // Зчитуємо тіло запиту
                if (contentLength > 0)
                {
                    var bodyBuffer = new char[contentLength];
                    await reader.ReadBlockAsync(bodyBuffer, 0, contentLength);
                    var body = new string(bodyBuffer);
                    
                    try
                    {
                        var langData = System.Text.Json.JsonSerializer.Deserialize<LanguageRequest>(body);
                        if (langData != null && !string.IsNullOrEmpty(langData.Language))
                        {
                            // Валідуємо мову
                            var validLanguages = new[] { "en", "uk", "de" };
                            if (Array.IndexOf(validLanguages, langData.Language) >= 0)
                            {
                                LanguageManager.CurrentLanguage = langData.Language;
                            }
                        }
                    }
                    catch
                    {
                        // Ignore parsing errors
                    }
                }
                
                var okBody = Encoding.UTF8.GetBytes("{\"success\":true}");
                var okHeader = "HTTP/1.1 200 OK\r\n" +
                               "Content-Type: application/json\r\n" +
                               $"Content-Length: {okBody.Length}\r\n" +
                               "Connection: close\r\n" +
                               "Access-Control-Allow-Origin: *\r\n" +
                               "\r\n";
                var okHeaderBytes = Encoding.UTF8.GetBytes(okHeader);
                await sslStream.WriteAsync(okHeaderBytes, 0, okHeaderBytes.Length);
                await sslStream.WriteAsync(okBody, 0, okBody.Length);
                return;
            }
            
            // CORS preflight для API
            if (method == "OPTIONS" && urlPath.StartsWith("/api/"))
            {
                var corsHeader = "HTTP/1.1 204 No Content\r\n" +
                                 "Access-Control-Allow-Origin: *\r\n" +
                                 "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n" +
                                 "Access-Control-Allow-Headers: Content-Type\r\n" +
                                 "Connection: close\r\n" +
                                 "\r\n";
                var corsHeaderBytes = Encoding.UTF8.GetBytes(corsHeader);
                await sslStream.WriteAsync(corsHeaderBytes, 0, corsHeaderBytes.Length);
                return;
            }
            
            if (urlPath == "/") urlPath = "/index.html";
            
            // Декодуємо URL
            urlPath = Uri.UnescapeDataString(urlPath.Split('?')[0]);

            byte[] responseBody;
            string statusLine;
            string contentType;

            // Спочатку пробуємо embedded resources, потім файлову систему
            if (_useEmbeddedResources)
            {
                var resourceData = EmbeddedResourceHelper.GetResource(urlPath);
                if (resourceData != null)
                {
                    responseBody = resourceData;
                    statusLine = "HTTP/1.1 200 OK";
                    contentType = GetMimeType(urlPath);
                }
                else
                {
                    responseBody = Encoding.UTF8.GetBytes("404 Not Found");
                    statusLine = "HTTP/1.1 404 Not Found";
                    contentType = "text/plain";
                }
            }
            else
            {
                var localPath = Path.Combine(_distFolder!, urlPath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));

                if (File.Exists(localPath))
                {
                    responseBody = File.ReadAllBytes(localPath);
                    statusLine = "HTTP/1.1 200 OK";
                    contentType = GetMimeType(localPath);
                }
                else
                {
                    responseBody = Encoding.UTF8.GetBytes("404 Not Found");
                    statusLine = "HTTP/1.1 404 Not Found";
                    contentType = "text/plain";
                }
            }

            var responseHeader = $"{statusLine}\r\n" +
                                 $"Content-Type: {contentType}\r\n" +
                                 $"Content-Length: {responseBody.Length}\r\n" +
                                 "Connection: close\r\n" +
                                 "Access-Control-Allow-Origin: *\r\n" +
                                 "Cache-Control: no-cache, no-store, must-revalidate\r\n" +
                                 "Pragma: no-cache\r\n" +
                                 "Expires: 0\r\n" +
                                 "\r\n";

            var headerBytes = Encoding.UTF8.GetBytes(responseHeader);
            await sslStream.WriteAsync(headerBytes, 0, headerBytes.Length);
            await sslStream.WriteAsync(responseBody, 0, responseBody.Length);
        }
        catch
        {
            // Ignore errors
        }
        finally
        {
            client.Close();
        }
    }

    private static string GetMimeType(string filePath)
    {
        var ext = Path.GetExtension(filePath).ToLowerInvariant();
        return ext switch
        {
            ".html" => "text/html",
            ".htm" => "text/html",
            ".js" => "application/javascript",
            ".mjs" => "application/javascript",
            ".css" => "text/css",
            ".json" => "application/json",
            ".png" => "image/png",
            ".jpg" => "image/jpeg",
            ".jpeg" => "image/jpeg",
            ".gif" => "image/gif",
            ".svg" => "image/svg+xml",
            ".ico" => "image/x-icon",
            ".woff" => "font/woff",
            ".woff2" => "font/woff2",
            ".ttf" => "font/ttf",
            ".eot" => "application/vnd.ms-fontobject",
            _ => "application/octet-stream"
        };
    }

    private static string? GetDistFolder()
    {
        // Отримуємо директорію виконуваного файлу
        // Використовуємо AppContext.BaseDirectory бо він працює коректно при single-file publish
        var exeDir = AppContext.BaseDirectory;
        
        // Fallback на Assembly.Location якщо потрібно
        if (string.IsNullOrEmpty(exeDir))
        {
            exeDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
        }
        
        if (string.IsNullOrEmpty(exeDir))
        {
            return null;
        }

        // Шукаємо dist папку відносно exe файлу
        var possiblePaths = new[]
        {
            // Для release/production - wwwroot поруч з exe
            Path.Combine(exeDir, "wwwroot"),
            // Для розробки - шукаємо відносно проекту (з bin/Debug/net10.0)
            Path.GetFullPath(Path.Combine(exeDir, "..", "..", "..", "Draw WebUi", "vite-project", "dist")),
            // Альтернативний шлях для розробки
            Path.GetFullPath(Path.Combine(exeDir, "..", "..", "..", "..", "Insait Draw H", "Draw WebUi", "vite-project", "dist"))
        };

        foreach (var path in possiblePaths)
        {
            try
            {
                var fullPath = Path.GetFullPath(path);
                var indexPath = Path.Combine(fullPath, "index.html");
                if (Directory.Exists(fullPath) && File.Exists(indexPath))
                {
                    return fullPath;
                }
            }
            catch
            {
                // Ігноруємо помилки при перевірці шляхів
                continue;
            }
        }

        return null;
    }
    
    private class LanguageRequest
    {
        public string Language { get; set; } = "en";
    }
}