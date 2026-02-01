using System;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Interactivity;

namespace Insait_Draw_H;

public partial class LanguageSelectionWindow : Window
{
    public string SelectedLanguage { get; private set; } = "en";

    public LanguageSelectionWindow()
    {
        InitializeComponent();
        SelectedLanguage = LanguageManager.CurrentLanguage;
        UpdateTexts();
        SetComboBoxSelection();
    }

    private void UpdateTexts()
    {
        Title = LanguageManager.GetText("languageSelection");
        
        var headerText = this.FindControl<TextBlock>("HeaderText");
        if (headerText != null)
            headerText.Text = LanguageManager.GetText("languageSelection");
        
        var selectLanguageText = this.FindControl<TextBlock>("SelectLanguageText");
        if (selectLanguageText != null)
            selectLanguageText.Text = LanguageManager.GetText("selectInterfaceLanguage");
    }

    private void SetComboBoxSelection()
    {
        var comboBox = this.FindControl<ComboBox>("LanguageComboBox");
        if (comboBox == null) return;

        for (int i = 0; i < comboBox.Items.Count; i++)
        {
            if (comboBox.Items[i] is ComboBoxItem item && item.Tag?.ToString() == SelectedLanguage)
            {
                comboBox.SelectedIndex = i;
                break;
            }
        }
    }

    private void HeaderPanel_OnPointerPressed(object? sender, PointerPressedEventArgs e)
    {
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

    private void LanguageComboBox_SelectionChanged(object? sender, SelectionChangedEventArgs e)
    {
        var comboBox = sender as ComboBox;
        if (comboBox?.SelectedItem is ComboBoxItem selectedItem && selectedItem.Tag is string languageCode)
        {
            SelectedLanguage = languageCode;
            LanguageManager.CurrentLanguage = languageCode;
            UpdateTexts();
        }
    }
}
