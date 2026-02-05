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
    private DispatcherTimer? _loadingTimer;
    private int _loadingProgress = 0;
    private string? _pendingFileToOpen; // Файл для відкриття через асоціацію файлів
    private bool _fileAssociationRegistered = false; // Чи вже зареєстрована асоціація

    public MainWindow()
    {
        InitializeComponent();
        UpdateLoadingScreenTexts();
        
        // Перевіряємо чи є файл для відкриття через аргументи командного рядка
        CheckPendingFileFromArgs();
        
        InitializeWebView();
    }

    protected override void OnClosed(EventArgs e)
    {
        base.OnClosed(e);
        StopLocalServer();
    }

    /// <summary>
    /// Перевіряє чи є файл для відкриття через аргументи командного рядка
    /// </summary>
    private void CheckPendingFileFromArgs()
    {
        var args = Program.CommandLineArgs;
        if (args.Length > 0)
        {
            var filePath = args[0];
            if (!string.IsNullOrEmpty(filePath) && 
                filePath.EndsWith(".insd", StringComparison.OrdinalIgnoreCase) && 
                File.Exists(filePath))
            {
                _pendingFileToOpen = filePath;
                System.Diagnostics.Debug.WriteLine($"[FileOpen] Pending file to open: {filePath}");
            }
        }
    }

    /// <summary>
    /// Реєструє асоціацію файлів після першого збереження .insd файлу
    /// </summary>
    private void RegisterFileAssociationOnFirstSave()
    {
        if (!_fileAssociationRegistered)
        {
            _fileAssociationRegistered = true;
            FileAssociationHelper.RegisterFileAssociation();
            System.Diagnostics.Debug.WriteLine("[FileAssociation] Registered after first save");
        }
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
                // Використовуємо IPAddress.Loopback (127.0.0.1) для безпеки та уникнення проблем з firewall
                _tcpListener = new TcpListener(IPAddress.Loopback, port);
                _tcpListener.Start();
                _serverPort = port;
                System.Diagnostics.Debug.WriteLine($"[Server] Started HTTP server on port {port}");
                break;
            }
            catch (SocketException ex)
            {
                // Порт зайнятий, пробуємо наступний
                System.Diagnostics.Debug.WriteLine($"[Server] Port {port} unavailable: {ex.Message}");
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
            
            // Використовуємо HTTP без SSL для спрощення та кращої сумісності
            using var reader = new StreamReader(networkStream, Encoding.UTF8, leaveOpen: true);
            
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
                await networkStream.WriteAsync(langHeaderBytes, 0, langHeaderBytes.Length);
                await networkStream.WriteAsync(langBody, 0, langBody.Length);
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
                            var validLanguages = new[] { "en", "uk", "de", "tr", "ru" };
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
                await networkStream.WriteAsync(okHeaderBytes, 0, okHeaderBytes.Length);
                await networkStream.WriteAsync(okBody, 0, okBody.Length);
                return;
            }
            
            // API endpoint для отримання файлу, що потрібно відкрити (через асоціацію файлів)
            if (urlPath == "/api/pending-file" && method == "GET")
            {
                string jsonResponse;
                if (!string.IsNullOrEmpty(_pendingFileToOpen) && File.Exists(_pendingFileToOpen))
                {
                    try
                    {
                        var fileBytes = File.ReadAllBytes(_pendingFileToOpen);
                        var base64Content = Convert.ToBase64String(fileBytes);
                        var fileName = Path.GetFileName(_pendingFileToOpen);
                        jsonResponse = System.Text.Json.JsonSerializer.Serialize(new { 
                            success = true, 
                            fileName = fileName, 
                            content = base64Content,
                            fullPath = _pendingFileToOpen
                        });
                        
                        // Очищаємо pending файл після відправки
                        _pendingFileToOpen = null;
                    }
                    catch (Exception ex)
                    {
                        jsonResponse = System.Text.Json.JsonSerializer.Serialize(new { success = false, error = ex.Message });
                    }
                }
                else
                {
                    jsonResponse = System.Text.Json.JsonSerializer.Serialize(new { success = false, noPendingFile = true });
                }
                
                var pendingFileResponseBytes = Encoding.UTF8.GetBytes(jsonResponse);
                var pendingFileHeader = "HTTP/1.1 200 OK\r\n" +
                               "Content-Type: application/json\r\n" +
                               $"Content-Length: {pendingFileResponseBytes.Length}\r\n" +
                               "Connection: close\r\n" +
                               "Access-Control-Allow-Origin: *\r\n" +
                               "\r\n";
                var pendingFileHeaderBytes = Encoding.UTF8.GetBytes(pendingFileHeader);
                await networkStream.WriteAsync(pendingFileHeaderBytes, 0, pendingFileHeaderBytes.Length);
                await networkStream.WriteAsync(pendingFileResponseBytes, 0, pendingFileResponseBytes.Length);
                return;
            }
            
            // API endpoint для відкриття файлу проєкту через нативний діалог
            if (urlPath == "/api/open-file" && method == "POST")
            {
                string? fileContent = null;
                string? fileName = null;
                string? errorMessage = null;
                
                // Зчитуємо тіло запиту для отримання типу діалогу
                string dialogType = "project"; // за замовчуванням
                if (contentLength > 0)
                {
                    var bodyBuffer = new char[contentLength];
                    await reader.ReadBlockAsync(bodyBuffer, 0, contentLength);
                    var body = new string(bodyBuffer);
                    
                    try
                    {
                        var requestData = System.Text.Json.JsonSerializer.Deserialize<OpenFileRequest>(body);
                        if (requestData != null && !string.IsNullOrEmpty(requestData.Type))
                        {
                            dialogType = requestData.Type;
                        }
                    }
                    catch
                    {
                        // Ignore parsing errors
                    }
                }
                
                try
                {
                    await Dispatcher.UIThread.InvokeAsync(async () =>
                    {
                        var dialog = new Avalonia.Platform.Storage.FilePickerOpenOptions
                        {
                            AllowMultiple = false,
                        };
                        
                        var lang = LanguageManager.CurrentLanguage;
                        
                        if (dialogType == "image")
                        {
                            dialog.Title = lang switch
                            {
                                "uk" => "Імпорт зображення",
                                "de" => "Bild importieren",
                                "tr" => "Resim İçe Aktar",
                                "ru" => "Импорт изображения",
                                _ => "Import Image"
                            };
                            dialog.FileTypeFilter = new[]
                            {
                                new Avalonia.Platform.Storage.FilePickerFileType(lang switch
                                {
                                    "uk" => "Зображення",
                                    "de" => "Bilder",
                                    "tr" => "Resimler",
                                    "ru" => "Изображения",
                                    _ => "Images"
                                })
                                {
                                    Patterns = new[] { "*.png", "*.jpg", "*.jpeg", "*.gif", "*.webp", "*.bmp", "*.svg" },
                                    MimeTypes = new[] { "image/*" }
                                },
                                new Avalonia.Platform.Storage.FilePickerFileType(lang switch
                                {
                                    "uk" => "Усі файли",
                                    "de" => "Alle Dateien",
                                    "tr" => "Tüm Dosyalar",
                                    "ru" => "Все файлы",
                                    _ => "All Files"
                                })
                                {
                                    Patterns = new[] { "*.*" }
                                }
                            };
                        }
                        else
                        {
                            dialog.Title = lang switch
                            {
                                "uk" => "Відкрити проєкт",
                                "de" => "Projekt öffnen",
                                "tr" => "Projeyi Aç",
                                "ru" => "Открыть проект",
                                _ => "Open Project"
                            };
                            dialog.FileTypeFilter = new[]
                            {
                                new Avalonia.Platform.Storage.FilePickerFileType(lang switch
                                {
                                    "uk" => "Проєкти Insait Draw",
                                    "de" => "Insait Draw Projekte",
                                    "tr" => "Insait Draw Projeleri",
                                    "ru" => "Проекты Insait Draw",
                                    _ => "Insait Draw Projects"
                                })
                                {
                                    Patterns = new[] { "*.insd" }
                                },
                                new Avalonia.Platform.Storage.FilePickerFileType("JSON")
                                {
                                    Patterns = new[] { "*.json" },
                                    MimeTypes = new[] { "application/json" }
                                },
                                new Avalonia.Platform.Storage.FilePickerFileType(lang switch
                                {
                                    "uk" => "Усі файли",
                                    "de" => "Alle Dateien",
                                    "tr" => "Tüm Dosyalar",
                                    "ru" => "Все файлы",
                                    _ => "All Files"
                                })
                                {
                                    Patterns = new[] { "*.*" }
                                }
                            };
                        }
                        
                        var storageProvider = this.StorageProvider;
                        var result = await storageProvider.OpenFilePickerAsync(dialog);
                        
                        if (result != null && result.Count > 0)
                        {
                            var file = result[0];
                            fileName = file.Name;
                            
                            using var stream = await file.OpenReadAsync();
                            
                            if (dialogType == "image")
                            {
                                // Для зображень повертаємо base64
                                using var memoryStream = new MemoryStream();
                                await stream.CopyToAsync(memoryStream);
                                var bytes = memoryStream.ToArray();
                                var base64 = Convert.ToBase64String(bytes);
                                var mimeType = GetMimeTypeFromExtension(Path.GetExtension(fileName));
                                fileContent = $"data:{mimeType};base64,{base64}";
                            }
                            else
                            {
                                // Для проєктів повертаємо base64 (бо .insd - це ZIP)
                                using var memoryStream = new MemoryStream();
                                await stream.CopyToAsync(memoryStream);
                                var bytes = memoryStream.ToArray();
                                fileContent = Convert.ToBase64String(bytes);
                            }
                        }
                    });
                }
                catch (Exception ex)
                {
                    errorMessage = ex.Message;
                }
                
                string jsonResponse;
                if (errorMessage != null)
                {
                    jsonResponse = System.Text.Json.JsonSerializer.Serialize(new { success = false, error = errorMessage });
                }
                else if (fileContent != null)
                {
                    jsonResponse = System.Text.Json.JsonSerializer.Serialize(new { success = true, fileName, content = fileContent });
                }
                else
                {
                    jsonResponse = System.Text.Json.JsonSerializer.Serialize(new { success = false, cancelled = true });
                }
                
                var openFileResponseBodyBytes = Encoding.UTF8.GetBytes(jsonResponse);
                var openFileResponseHeader = "HTTP/1.1 200 OK\r\n" +
                               "Content-Type: application/json\r\n" +
                               $"Content-Length: {openFileResponseBodyBytes.Length}\r\n" +
                               "Connection: close\r\n" +
                               "Access-Control-Allow-Origin: *\r\n" +
                               "\r\n";
                var openFileResponseHeaderBytes = Encoding.UTF8.GetBytes(openFileResponseHeader);
                await networkStream.WriteAsync(openFileResponseHeaderBytes, 0, openFileResponseHeaderBytes.Length);
                await networkStream.WriteAsync(openFileResponseBodyBytes, 0, openFileResponseBodyBytes.Length);
                return;
            }
            
            // API endpoint для збереження файлу через нативний діалог
            if (urlPath == "/api/save-file" && method == "POST")
            {
                string? savedPath = null;
                string? errorMessage = null;
                
                try
                {
                    if (contentLength > 0)
                    {
                        var bodyBuffer = new char[contentLength];
                        await reader.ReadBlockAsync(bodyBuffer, 0, contentLength);
                        var body = new string(bodyBuffer);
                        
                        var saveRequest = System.Text.Json.JsonSerializer.Deserialize<SaveFileRequest>(body);
                        if (saveRequest != null && !string.IsNullOrEmpty(saveRequest.Content))
                        {
                            await Dispatcher.UIThread.InvokeAsync(async () =>
                            {
                                var lang = LanguageManager.CurrentLanguage;
                                var dialog = new Avalonia.Platform.Storage.FilePickerSaveOptions
                                {
                                    Title = lang == "uk" ? "Зберегти проєкт" : (lang == "de" ? "Projekt speichern" : "Save Project"),
                                    SuggestedFileName = saveRequest.FileName ?? "insait-draw-project",
                                    DefaultExtension = saveRequest.Extension ?? "insd",
                                    FileTypeChoices = new[]
                                    {
                                        new Avalonia.Platform.Storage.FilePickerFileType(lang == "uk" ? "Проєкт Insait Draw" : (lang == "de" ? "Insait Draw Projekt" : "Insait Draw Project"))
                                        {
                                            Patterns = new[] { "*.insd" }
                                        },
                                        new Avalonia.Platform.Storage.FilePickerFileType(lang == "uk" ? "Усі файли" : (lang == "de" ? "Alle Dateien" : "All Files"))
                                        {
                                            Patterns = new[] { "*.*" }
                                        }
                                    }
                                };
                                
                                var storageProvider = this.StorageProvider;
                                var result = await storageProvider.SaveFilePickerAsync(dialog);
                                
                                if (result != null)
                                {
                                    var bytes = Convert.FromBase64String(saveRequest.Content);
                                    using var stream = await result.OpenWriteAsync();
                                    await stream.WriteAsync(bytes, 0, bytes.Length);
                                    savedPath = result.Name;
                                    
                                    // Реєструємо асоціацію файлів після першого успішного збереження .insd
                                    if (savedPath.EndsWith(".insd", StringComparison.OrdinalIgnoreCase))
                                    {
                                        RegisterFileAssociationOnFirstSave();
                                    }
                                }
                            });
                        }
                    }
                }
                catch (Exception ex)
                {
                    errorMessage = ex.Message;
                }
                
                string jsonResponse;
                if (errorMessage != null)
                {
                    jsonResponse = System.Text.Json.JsonSerializer.Serialize(new { success = false, error = errorMessage });
                }
                else if (savedPath != null)
                {
                    jsonResponse = System.Text.Json.JsonSerializer.Serialize(new { success = true, path = savedPath });
                }
                else
                {
                    jsonResponse = System.Text.Json.JsonSerializer.Serialize(new { success = false, cancelled = true });
                }
                
                var saveFileResponseBodyBytes = Encoding.UTF8.GetBytes(jsonResponse);
                var saveFileResponseHeader = "HTTP/1.1 200 OK\r\n" +
                               "Content-Type: application/json\r\n" +
                               $"Content-Length: {saveFileResponseBodyBytes.Length}\r\n" +
                               "Connection: close\r\n" +
                               "Access-Control-Allow-Origin: *\r\n" +
                               "\r\n";
                var saveFileResponseHeaderBytes = Encoding.UTF8.GetBytes(saveFileResponseHeader);
                await networkStream.WriteAsync(saveFileResponseHeaderBytes, 0, saveFileResponseHeaderBytes.Length);
                await networkStream.WriteAsync(saveFileResponseBodyBytes, 0, saveFileResponseBodyBytes.Length);
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
                await networkStream.WriteAsync(corsHeaderBytes, 0, corsHeaderBytes.Length);
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
            await networkStream.WriteAsync(headerBytes, 0, headerBytes.Length);
            await networkStream.WriteAsync(responseBody, 0, responseBody.Length);
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
    
    private class OpenFileRequest
    {
        public string Type { get; set; } = "project"; // "project" or "image"
    }
    
    private class SaveFileRequest
    {
        public string? FileName { get; set; }
        public string? Extension { get; set; }
        public string Content { get; set; } = "";
    }
    
    private static string GetMimeTypeFromExtension(string extension)
    {
        return extension.ToLowerInvariant() switch
        {
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".gif" => "image/gif",
            ".webp" => "image/webp",
            ".bmp" => "image/bmp",
            ".svg" => "image/svg+xml",
            _ => "application/octet-stream"
        };
    }
}
