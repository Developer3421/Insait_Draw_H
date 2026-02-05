using System;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Interactivity;
using Avalonia.Media;

namespace Insait_Draw_H;

public partial class AboutWindow : Window
{
    public AboutWindow()
    {
        InitializeComponent();
        UpdateTexts();
        CheckFileAssociationStatus();
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
        
        var fileAssociationButton = this.FindControl<Button>("FileAssociationButton");
        if (fileAssociationButton != null)
            fileAssociationButton.Content = LanguageManager.GetText("registerFileAssociation");
    }

    private void CheckFileAssociationStatus()
    {
        var statusText = this.FindControl<TextBlock>("FileAssociationStatus");
        var button = this.FindControl<Button>("FileAssociationButton");
        
        if (statusText == null || button == null) return;
        
        if (FileAssociationHelper.IsRegistered())
        {
            statusText.Text = LanguageManager.GetText("fileAssociationRegistered");
            statusText.Foreground = new SolidColorBrush(Color.Parse("#4CAF50"));
            button.Content = LanguageManager.GetText("reRegisterFileAssociation");
        }
        else
        {
            statusText.Text = "";
        }
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

    private void FileAssociationButton_OnClick(object? sender, RoutedEventArgs e)
    {
        var statusText = this.FindControl<TextBlock>("FileAssociationStatus");
        var button = this.FindControl<Button>("FileAssociationButton");
        
        try
        {
            FileAssociationHelper.RegisterFileAssociation();
            
            if (statusText != null)
            {
                statusText.Text = LanguageManager.GetText("fileAssociationSuccess");
                statusText.Foreground = new SolidColorBrush(Color.Parse("#4CAF50"));
            }
            
            if (button != null)
            {
                button.Content = LanguageManager.GetText("reRegisterFileAssociation");
            }
        }
        catch (Exception ex)
        {
            if (statusText != null)
            {
                statusText.Text = LanguageManager.GetText("fileAssociationError") + ": " + ex.Message;
                statusText.Foreground = new SolidColorBrush(Color.Parse("#F44336"));
            }
        }
    }

    private void CloseButton_OnClick(object? sender, RoutedEventArgs e)
    {
        Close();
    }
}
