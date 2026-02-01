using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Interactivity;

namespace Insait_Draw_H;

public partial class UserAgreementWindow : Window
{
    public UserAgreementWindow()
    {
        InitializeComponent();
        UpdateTexts();
    }

    private void UpdateTexts()
    {
        Title = LanguageManager.GetText("userAgreementTitle");
        
        var titleText = this.FindControl<TextBlock>("TitleText");
        if (titleText != null)
            titleText.Text = LanguageManager.GetText("userAgreementTitle");
        
        var subtitleText = this.FindControl<TextBlock>("SubtitleText");
        if (subtitleText != null)
            subtitleText.Text = LanguageManager.GetText("privacyAndTerms");
        
        var localStorageTitle = this.FindControl<TextBlock>("LocalStorageTitle");
        if (localStorageTitle != null)
            localStorageTitle.Text = LanguageManager.GetText("localDataStorage");
        
        var localStorageText = this.FindControl<TextBlock>("LocalStorageText");
        if (localStorageText != null)
            localStorageText.Text = LanguageManager.GetText("localDataStorageText");
        
        var asIsTitle = this.FindControl<TextBlock>("AsIsTitle");
        if (asIsTitle != null)
            asIsTitle.Text = LanguageManager.GetText("providedAsIs");
        
        var asIsText = this.FindControl<TextBlock>("AsIsText");
        if (asIsText != null)
            asIsText.Text = LanguageManager.GetText("providedAsIsText");
        
        var acceptanceTitle = this.FindControl<TextBlock>("AcceptanceTitle");
        if (acceptanceTitle != null)
            acceptanceTitle.Text = LanguageManager.GetText("acceptanceOfTerms");
        
        var acceptanceText = this.FindControl<TextBlock>("AcceptanceText");
        if (acceptanceText != null)
            acceptanceText.Text = LanguageManager.GetText("acceptanceOfTermsText");
        
        var copyrightText = this.FindControl<TextBlock>("CopyrightText");
        if (copyrightText != null)
            copyrightText.Text = LanguageManager.GetText("authorCopyright");
        
        var closeButton = this.FindControl<Button>("CloseButton");
        if (closeButton != null)
            closeButton.Content = LanguageManager.GetText("iUnderstand");
    }

    private void HeaderPanel_OnPointerPressed(object? sender, PointerPressedEventArgs e)
    {
        // Підтримка перетягування вікна за заголовок (лівою кнопкою миші або тачем)
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
