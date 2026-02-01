using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Interactivity;
using Avalonia.Layout;
using Avalonia.Media;
using WebViewControl;

namespace Insait_Draw_H;

public partial class MainWindow : Window
{
    private WebView? _webView;
    private string? _distFolder;
    private TcpListener? _tcpListener;
    private CancellationTokenSource? _serverCts;
    private int _serverPort = 8765;

    public MainWindow()
    {
        InitializeComponent();
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


    private void InitializeWebView()
    {
        var host = this.FindControl<ContentControl>("WebViewHost");
        if (host is null)
        {
            return;
        }

        try
        {
            // Отримуємо шлях до dist папки Vite проекту
            _distFolder = GetDistFolder();
            var localHtmlPath = _distFolder != null ? Path.Combine(_distFolder, "index.html") : null;
            
            if (string.IsNullOrEmpty(_distFolder) || !File.Exists(localHtmlPath))
            {
                // Якщо dist не існує, показуємо повідомлення
                host.Content = new TextBlock
                {
                    Text = $"React build not found.\nPlease run 'npm run build' in the vite-project folder.\nExpected path: {localHtmlPath}",
                    TextWrapping = TextWrapping.Wrap,
                    Foreground = Brushes.DimGray,
                    HorizontalAlignment = HorizontalAlignment.Center,
                    VerticalAlignment = VerticalAlignment.Center,
                    Margin = new Thickness(24)
                };
                return;
            }

            // Запускаємо локальний HTTP сервер
            StartLocalServer();

            _webView = new WebView
            {
                HorizontalAlignment = HorizontalAlignment.Stretch,
                VerticalAlignment = VerticalAlignment.Stretch
            };
            
            host.Content = _webView;
            
            // Навігуємо на локальний сервер
            _webView.Address = $"http://127.0.0.1:{_serverPort}/";
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
                    _ = Task.Run(() => HandleClient(client));
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

    private void StopLocalServer()
    {
        _serverCts?.Cancel();
        _tcpListener?.Stop();
    }

    private void HandleClient(TcpClient client)
    {
        try
        {
            using var stream = client.GetStream();
            using var reader = new StreamReader(stream, Encoding.UTF8);
            
            // Читаємо HTTP запит
            var requestLine = reader.ReadLine();
            if (string.IsNullOrEmpty(requestLine)) return;

            // Зчитуємо заголовки та тіло запиту
            var headers = new System.Collections.Generic.Dictionary<string, string>();
            string? headerLine;
            int contentLength = 0;
            while (!string.IsNullOrEmpty(headerLine = reader.ReadLine()))
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
                stream.Write(langHeaderBytes, 0, langHeaderBytes.Length);
                stream.Write(langBody, 0, langBody.Length);
                return;
            }
            
            if (urlPath == "/api/language" && method == "POST")
            {
                // Зчитуємо тіло запиту
                if (contentLength > 0)
                {
                    var bodyBuffer = new char[contentLength];
                    reader.ReadBlock(bodyBuffer, 0, contentLength);
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
                stream.Write(okHeaderBytes, 0, okHeaderBytes.Length);
                stream.Write(okBody, 0, okBody.Length);
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
                stream.Write(corsHeaderBytes, 0, corsHeaderBytes.Length);
                return;
            }
            
            if (urlPath == "/") urlPath = "/index.html";
            
            // Декодуємо URL
            urlPath = Uri.UnescapeDataString(urlPath.Split('?')[0]);

            var localPath = Path.Combine(_distFolder!, urlPath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));

            byte[] responseBody;
            string statusLine;
            string contentType;

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
            stream.Write(headerBytes, 0, headerBytes.Length);
            stream.Write(responseBody, 0, responseBody.Length);
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
        var exeDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
        
        if (string.IsNullOrEmpty(exeDir))
        {
            return null;
        }

        // Шукаємо dist папку відносно exe файлу
        var possiblePaths = new[]
        {
            // Для release/production - wwwroot поруч з exe
            Path.Combine(exeDir, "wwwroot"),
            // Для розробки - шукаємо відносно проекту
            Path.GetFullPath(Path.Combine(exeDir, "..", "..", "..", "Draw WebUi", "vite-project", "dist"))
        };

        foreach (var path in possiblePaths)
        {
            var fullPath = Path.GetFullPath(path);
            var indexPath = Path.Combine(fullPath, "index.html");
            if (File.Exists(indexPath))
            {
                return fullPath;
            }
        }

        return null;
    }
    
    private class LanguageRequest
    {
        public string Language { get; set; } = "en";
    }
}