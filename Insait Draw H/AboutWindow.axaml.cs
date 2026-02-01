using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Interactivity;

namespace Insait_Draw_H;

public partial class AboutWindow : Window
{
    public AboutWindow()
    {
        InitializeComponent();
        UpdateTexts();
    }

    private void UpdateTexts()
    {
        Title = LanguageManager.GetText("aboutTitle");
        
        var versionLabel = this.FindControl<TextBlock>("VersionLabel");
        if (versionLabel != null)
            versionLabel.Text = LanguageManager.GetText("version") + " 1.0.0";
        
        var descriptionText = this.FindControl<TextBlock>("DescriptionText");
        if (descriptionText != null)
            descriptionText.Text = LanguageManager.GetText("description");
        
        var authorLabel = this.FindControl<TextBlock>("AuthorLabel");
        if (authorLabel != null)
            authorLabel.Text = LanguageManager.GetText("author");
        
        var copyrightText = this.FindControl<TextBlock>("CopyrightText");
        if (copyrightText != null)
            copyrightText.Text = LanguageManager.GetText("copyright");
        
        var closeButton = this.FindControl<Button>("CloseButton");
        if (closeButton != null)
            closeButton.Content = LanguageManager.GetText("close");
    }

    private void LogoPanel_OnPointerPressed(object? sender, PointerPressedEventArgs e)
    {
        // Підтримка перетягування вікна за логотип (лівою кнопкою миші або тачем)
        if (e.GetCurrentPoint(this).Properties.IsLeftButtonPressed || 
            e.GetCurrentPoint(this).Properties.PointerUpdateKind == PointerUpdateKind.LeftButtonPressed)
        {
            BeginMoveDrag(e);
        }
    }

    private void CloseButton_OnClick(object? sender, RoutedEventArgs e)
    {
        Close();
    }
}
