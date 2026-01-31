import { useState, useCallback } from 'react';
import { useEditorStore, PAGE_PRESETS } from '../stores/editorStore';
import { useLanguageStore } from '../stores/languageStore';
import { zoomToPage100, zoomToFitPage } from '../hooks/useArtboard';
import './PageSettings.css';

export function PageSettings() {
  const { t } = useLanguageStore();
  const { pageSettings, setPagePreset, setCustomPageSize } = useEditorStore();
  const [customWidth, setCustomWidth] = useState(pageSettings.width);
  const [customHeight, setCustomHeight] = useState(pageSettings.height);
  const [showCustom, setShowCustom] = useState(false);

  const presetGroups = [
    {
      label: 'Paper',
      presets: [
        { key: 'A4', label: 'A4' },
        { key: 'A4_LANDSCAPE', label: 'A4 ↔' },
        { key: 'A3', label: 'A3' },
        { key: 'A3_LANDSCAPE', label: 'A3 ↔' },
        { key: 'LETTER', label: 'Letter' },
        { key: 'LETTER_LANDSCAPE', label: 'Letter ↔' },
      ],
    },
    {
      label: 'Screen',
      presets: [
        { key: 'HD', label: 'HD 1080p' },
        { key: 'HD_PORTRAIT', label: 'HD ↕' },
        { key: 'SQUARE', label: '□ Square' },
      ],
    },
  ];

  const handlePresetChange = useCallback((presetKey) => {
    setPagePreset(presetKey);
    setShowCustom(false);
    // Center view on new page
    setTimeout(() => zoomToFitPage(), 100);
  }, [setPagePreset]);

  const handleCustomSizeApply = useCallback(() => {
    const width = Math.max(100, parseInt(customWidth) || 800);
    const height = Math.max(100, parseInt(customHeight) || 600);
    setCustomPageSize(width, height);
    setTimeout(() => zoomToFitPage(), 100);
  }, [customWidth, customHeight, setCustomPageSize]);

  const handleZoom100 = useCallback(() => {
    zoomToPage100();
  }, []);

  const handleFitToView = useCallback(() => {
    zoomToFitPage();
  }, []);

  return (
    <div className="page-settings">
      <div className="settings-section">
        <span className="settings-label">📄 {t('page')}</span>
        
        <div className="preset-buttons">
          {presetGroups.map((group) => (
            <div key={group.label} className="preset-group">
              {group.presets.map((preset) => (
                <button
                  key={preset.key}
                  className={`preset-btn ${pageSettings.preset === preset.key ? 'active' : ''}`}
                  onClick={() => handlePresetChange(preset.key)}
                  title={PAGE_PRESETS[preset.key]?.name}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          ))}
        </div>
        
        <button
          className={`preset-btn custom-toggle ${showCustom ? 'active' : ''}`}
          onClick={() => setShowCustom(!showCustom)}
        >
          ⚙️ {t('custom')}
        </button>
        
        {showCustom && (
          <div className="custom-size">
            <div className="size-inputs">
              <label>
                <span>{t('width')}</span>
                <input
                  type="number"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(e.target.value)}
                  min="100"
                  max="10000"
                />
              </label>
              <span className="size-separator">×</span>
              <label>
                <span>{t('height')}</span>
                <input
                  type="number"
                  value={customHeight}
                  onChange={(e) => setCustomHeight(e.target.value)}
                  min="100"
                  max="10000"
                />
              </label>
              <button className="apply-btn" onClick={handleCustomSizeApply}>
                ✓
              </button>
            </div>
          </div>
        )}
        
        <div className="page-info">
          {pageSettings.width} × {pageSettings.height} px
        </div>
      </div>
      
      <div className="settings-section zoom-section">
        <div className="zoom-buttons">
          <button
            className="zoom-btn"
            onClick={handleFitToView}
            title={`${t('fitPageToView')} (Ctrl+1)`}
          >
            🔍 {t('fitPageToView')}
          </button>
          <button
            className="zoom-btn"
            onClick={handleZoom100}
            title={`${t('zoom100')} (Ctrl+0)`}
          >
            100%
          </button>
        </div>
      </div>
    </div>
  );
}
