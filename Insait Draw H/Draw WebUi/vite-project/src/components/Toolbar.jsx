import { useEditorStore, TOOLS } from '../stores/editorStore';
import { useLanguageStore } from '../stores/languageStore';
import './Toolbar.css';

const PRESET_COLORS = [
  '#ffffff', '#c0c0c0', '#808080', '#000000',
  '#ff0000', '#800000', '#ffff00', '#808000',
  '#00ff00', '#008000', '#00ffff', '#008080',
  '#0000ff', '#000080', '#ff00ff', '#800080',
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4',
  '#ffeaa7', '#dfe6e9', '#fd79a8', '#6c5ce7',
];

const FONTS = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Georgia',
  'Verdana',
  'Courier New',
  'Comic Sans MS',
  'Impact',
  'Trebuchet MS',
  'Palatino',
];

export function Toolbar() {
  const { t } = useLanguageStore();
  const {
    activeTool,
    setActiveTool,
    strokeColor,
    setStrokeColor,
    fillColor,
    setFillColor,
    strokeWidth,
    setStrokeWidth,
    fontFamily,
    setFontFamily,
    fontSize,
    setFontSize,
    zoom,
    setZoom,
    snapToGrid,
    setSnapToGrid,
    snapToObjects,
    setSnapToObjects,
    canvas,
  } = useEditorStore();

  const handleZoomIn = () => {
    const newZoom = Math.min(zoom * 1.2, 10);
    setZoom(newZoom);
    if (canvas) {
      // Zoom до центру canvas
      const center = canvas.getCenterPoint();
      canvas.zoomToPoint(center, newZoom);
      canvas.requestRenderAll();
    }
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom / 1.2, 0.1);
    setZoom(newZoom);
    if (canvas) {
      // Zoom до центру canvas
      const center = canvas.getCenterPoint();
      canvas.zoomToPoint(center, newZoom);
      canvas.requestRenderAll();
    }
  };

  const handleResetZoom = () => {
    setZoom(1);
    if (canvas) {
      canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      canvas.requestRenderAll();
    }
  };

  return (
    <div className="toolbar">
      {/* Tools */}
      <div className="tool-group">
        <span className="group-label">{t('tools')}</span>
        <div className="tools">
          <button
            className={`tool-btn ${activeTool === TOOLS.SELECT ? 'active' : ''}`}
            onClick={() => setActiveTool(TOOLS.SELECT)}
            title={`${t('select')} (V)`}
          >
            🔲
          </button>
          <button
            className={`tool-btn ${activeTool === TOOLS.PAN ? 'active' : ''}`}
            onClick={() => setActiveTool(TOOLS.PAN)}
            title={`${t('pan')} (H)`}
          >
            ✋
          </button>
          <button
            className={`tool-btn ${activeTool === TOOLS.BRUSH ? 'active' : ''}`}
            onClick={() => setActiveTool(TOOLS.BRUSH)}
            title={`${t('brush')} (B)`}
          >
            🖌️
          </button>
          <button
            className={`tool-btn ${activeTool === TOOLS.ERASER ? 'active' : ''}`}
            onClick={() => setActiveTool(TOOLS.ERASER)}
            title={`${t('eraser')} (E)`}
          >
            🧽
          </button>
        </div>
      </div>

      {/* Shapes */}
      <div className="tool-group">
        <span className="group-label">{t('shapes')}</span>
        <div className="tools">
          <button
            className={`tool-btn ${activeTool === TOOLS.LINE ? 'active' : ''}`}
            onClick={() => setActiveTool(TOOLS.LINE)}
            title={`${t('line')} (L)`}
          >
            📏
          </button>
          <button
            className={`tool-btn ${activeTool === TOOLS.RECTANGLE ? 'active' : ''}`}
            onClick={() => setActiveTool(TOOLS.RECTANGLE)}
            title={`${t('rectangle')} (R)`}
          >
            ⬜
          </button>
          <button
            className={`tool-btn ${activeTool === TOOLS.CIRCLE ? 'active' : ''}`}
            onClick={() => setActiveTool(TOOLS.CIRCLE)}
            title={`${t('circle')} (C)`}
          >
            ⭕
          </button>
          <button
            className={`tool-btn ${activeTool === TOOLS.TRIANGLE ? 'active' : ''}`}
            onClick={() => setActiveTool(TOOLS.TRIANGLE)}
            title={`${t('triangle')} (T)`}
          >
            🔺
          </button>
          <button
            className={`tool-btn ${activeTool === TOOLS.TEXT ? 'active' : ''}`}
            onClick={() => setActiveTool(TOOLS.TEXT)}
            title={t('textDoubleClick')}
          >
            📝
          </button>
        </div>
      </div>

      {/* Colors */}
      <div className="tool-group">
        <span className="group-label">{t('colors')}</span>
        <div className="color-section">
          <div className="color-pickers">
            <div className="color-input-group">
              <label>{t('fill')}</label>
              <input
                type="color"
                value={fillColor}
                onChange={(e) => setFillColor(e.target.value)}
                className="color-picker"
              />
            </div>
            <div className="color-input-group">
              <label>{t('stroke')}</label>
              <input
                type="color"
                value={strokeColor}
                onChange={(e) => setStrokeColor(e.target.value)}
                className="color-picker"
              />
            </div>
          </div>
          <div className="color-palette">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                className={`palette-color ${fillColor === c ? 'active' : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => setFillColor(c)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setStrokeColor(c);
                }}
                title={t('clickFillRightClickStroke')}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Stroke width */}
      <div className="tool-group">
        <span className="group-label">{t('strokeWidth')}: {strokeWidth}px</span>
        <input
          type="range"
          min="1"
          max="50"
          value={strokeWidth}
          onChange={(e) => setStrokeWidth(Number(e.target.value))}
          className="size-slider"
        />
      </div>

      {/* Text (when text tool is selected) */}
      {activeTool === TOOLS.TEXT && (
        <div className="tool-group">
          <span className="group-label">{t('textSettings')}</span>
          <div className="text-controls">
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="font-select"
            >
              {FONTS.map((font) => (
                <option key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              min="8"
              max="200"
              className="font-size-input"
            />
          </div>
        </div>
      )}

      {/* Zoom */}
      <div className="tool-group">
        <span className="group-label">{t('zoom')}: {Math.round(zoom * 100)}%</span>
        <div className="zoom-controls">
          <button className="zoom-btn" onClick={handleZoomOut} title={t('zoomOut')}>
            ➖
          </button>
          <button className="zoom-btn reset" onClick={handleResetZoom} title={t('resetZoom')}>
            🔄
          </button>
          <button className="zoom-btn" onClick={handleZoomIn} title={t('zoomIn')}>
            ➕
          </button>
        </div>
      </div>

      {/* Snapping */}
      <div className="tool-group">
        <span className="group-label">{t('snapping')}</span>
        <div className="snap-controls">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={snapToGrid}
              onChange={(e) => setSnapToGrid(e.target.checked)}
            />
            {t('toGrid')}
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={snapToObjects}
              onChange={(e) => setSnapToObjects(e.target.checked)}
            />
            {t('toObjects')}
          </label>
        </div>
      </div>
    </div>
  );
}
