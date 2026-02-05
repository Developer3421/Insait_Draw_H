import { useEditorStore, TOOLS } from '../stores/editorStore';
import { useLanguageStore } from '../stores/languageStore';
import { FabricImage, loadSVGFromString, Group } from 'fabric';
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

  const handleImportImage = () => {
    if (!canvas) return;
    
    // Створюємо прихований file input для вибору файлів через браузерний діалог
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.svg';
    input.style.display = 'none';
    
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      try {
        const fileName = file.name || '';
        const isSvg = fileName.toLowerCase().endsWith('.svg') || file.type === 'image/svg+xml';
        
        if (isSvg) {
          // Імпорт SVG як векторного об'єкта
          try {
            const svgString = await file.text();
            
            // Завантажуємо SVG як векторний об'єкт
            const { objects, options } = await loadSVGFromString(svgString);
            
            if (objects && objects.length > 0) {
              // Групуємо всі об'єкти SVG
              const svgGroup = objects.length === 1 ? objects[0] : new Group(objects);
              
              svgGroup.set({
                left: 100,
                top: 100,
              });
              
              // Scale down if too large
              const maxSize = 800;
              const svgWidth = svgGroup.width || 100;
              const svgHeight = svgGroup.height || 100;
              if (svgWidth > maxSize || svgHeight > maxSize) {
                const scale = Math.min(maxSize / svgWidth, maxSize / svgHeight);
                svgGroup.scale(scale);
              }
              
              canvas.add(svgGroup);
              canvas.setActiveObject(svgGroup);
              canvas.requestRenderAll();
              
              // Add to layers
              const { addLayer } = useEditorStore.getState();
              addLayer(svgGroup);
            }
          } catch (svgErr) {
            console.error('Error loading SVG as vector, falling back to image:', svgErr);
            // Fallback: завантажуємо SVG як зображення
            await loadAsImage(file);
          }
        } else {
          // Завантаження як растрове зображення
          await loadAsImage(file);
        }
      } catch (err) {
        console.error('Error importing image:', err);
      }
      
      // Очищаємо input
      document.body.removeChild(input);
    };
    
    async function loadAsImage(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result;
          if (!dataUrl) {
            reject(new Error('Failed to read file'));
            return;
          }
          
          const imgElement = new Image();
          imgElement.onload = async () => {
            const fabricImage = new FabricImage(imgElement, {
              left: 100,
              top: 100,
            });
            
            // Scale down if image is too large (max 800px on any side)
            const maxSize = 800;
            if (fabricImage.width > maxSize || fabricImage.height > maxSize) {
              const scale = Math.min(maxSize / fabricImage.width, maxSize / fabricImage.height);
              fabricImage.scale(scale);
            }
            
            canvas.add(fabricImage);
            canvas.setActiveObject(fabricImage);
            canvas.requestRenderAll();
            
            // Add to layers
            const { addLayer } = useEditorStore.getState();
            addLayer(fabricImage);
            resolve();
          };
          imgElement.onerror = (err) => {
            console.error('Error loading image:', err);
            reject(err);
          };
          imgElement.src = dataUrl;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
    
    document.body.appendChild(input);
    input.click();
  };

  return (
    <div className="toolbar">
      {/* Tools */}
      <div className="tool-group">
        <span className="group-label">{t('tools')}</span>
        <div className="tools-grid">
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
        <div className="tools-grid shapes-grid">
          <button
            className={`tool-btn ${activeTool === TOOLS.LINE ? 'active' : ''}`}
            onClick={() => setActiveTool(TOOLS.LINE)}
            title={`${t('line')} (L)`}
          >
            📏
          </button>
          <button
            className={`tool-btn ${activeTool === TOOLS.ARROW ? 'active' : ''}`}
            onClick={() => setActiveTool(TOOLS.ARROW)}
            title={t('arrow') || 'Arrow'}
          >
            ➡️
          </button>
          <button
            className={`tool-btn ${activeTool === TOOLS.RECTANGLE ? 'active' : ''}`}
            onClick={() => setActiveTool(TOOLS.RECTANGLE)}
            title={`${t('rectangle')} (R)`}
          >
            ⬜
          </button>
          <button
            className={`tool-btn ${activeTool === TOOLS.ROUNDED_RECT ? 'active' : ''}`}
            onClick={() => setActiveTool(TOOLS.ROUNDED_RECT)}
            title={t('roundedRect') || 'Rounded Rectangle'}
          >
            ▢
          </button>
          <button
            className={`tool-btn ${activeTool === TOOLS.CIRCLE ? 'active' : ''}`}
            onClick={() => setActiveTool(TOOLS.CIRCLE)}
            title={`${t('circle')} (C)`}
          >
            ⭕
          </button>
          <button
            className={`tool-btn ${activeTool === TOOLS.ELLIPSE ? 'active' : ''}`}
            onClick={() => setActiveTool(TOOLS.ELLIPSE)}
            title={t('ellipse') || 'Ellipse'}
          >
            ⬭
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
          <button
            className="tool-btn import-btn"
            onClick={handleImportImage}
            title={t('importImageTitle')}
          >
            📥
          </button>
        </div>
      </div>

      {/* Pro Shapes - Professional drawing shapes */}
      <div className="tool-group">
        <span className="group-label">{t('proShapes') || 'Pro Shapes'}</span>
        <div className="tools-grid shapes-grid">
          <button
            className={`tool-btn ${activeTool === TOOLS.STAR ? 'active' : ''}`}
            onClick={() => setActiveTool(TOOLS.STAR)}
            title={t('star') || 'Star (5 points)'}
          >
            ⭐
          </button>
          <button
            className={`tool-btn ${activeTool === TOOLS.POLYGON ? 'active' : ''}`}
            onClick={() => setActiveTool(TOOLS.POLYGON)}
            title={t('polygon') || 'Polygon (6 sides)'}
          >
            ⬡
          </button>
          <button
            className={`tool-btn ${activeTool === TOOLS.HEXAGON ? 'active' : ''}`}
            onClick={() => setActiveTool(TOOLS.HEXAGON)}
            title={t('hexagon') || 'Hexagon'}
          >
            ⎔
          </button>
          <button
            className={`tool-btn ${activeTool === TOOLS.DIAMOND ? 'active' : ''}`}
            onClick={() => setActiveTool(TOOLS.DIAMOND)}
            title={t('diamond') || 'Diamond / Rhombus'}
          >
            ◇
          </button>
          <button
            className={`tool-btn ${activeTool === TOOLS.HEART ? 'active' : ''}`}
            onClick={() => setActiveTool(TOOLS.HEART)}
            title={t('heart') || 'Heart'}
          >
            ❤️
          </button>
          <button
            className={`tool-btn ${activeTool === TOOLS.SPIRAL ? 'active' : ''}`}
            onClick={() => setActiveTool(TOOLS.SPIRAL)}
            title={t('spiral') || 'Spiral'}
          >
            🌀
          </button>
          <button
            className={`tool-btn ${activeTool === TOOLS.CROSS ? 'active' : ''}`}
            onClick={() => setActiveTool(TOOLS.CROSS)}
            title={t('cross') || 'Cross / Plus'}
          >
            ✚
          </button>
          <button
            className={`tool-btn ${activeTool === TOOLS.ARC ? 'active' : ''}`}
            onClick={() => setActiveTool(TOOLS.ARC)}
            title={t('arc') || 'Arc'}
          >
            ⌒
          </button>
          <button
            className={`tool-btn ${activeTool === TOOLS.GEAR ? 'active' : ''}`}
            onClick={() => setActiveTool(TOOLS.GEAR)}
            title={t('gear') || 'Gear / Cog'}
          >
            ⚙️
          </button>
          <button
            className={`tool-btn ${activeTool === TOOLS.CALLOUT ? 'active' : ''}`}
            onClick={() => setActiveTool(TOOLS.CALLOUT)}
            title={t('callout') || 'Callout / Speech Bubble'}
          >
            💬
          </button>
        </div>
      </div>

      {/* Bezier / Path Tools */}
      <div className="tool-group">
        <span className="group-label">{t('pathTools') || 'Path Tools'}</span>
        <div className="tools-grid">
          <button
            className={`tool-btn ${activeTool === TOOLS.PEN ? 'active' : ''}`}
            onClick={() => setActiveTool(TOOLS.PEN)}
            title={`${t('penTool') || 'Pen Tool'} (P) - Draw Bezier curves`}
          >
            ✒️
          </button>
          <button
            className={`tool-btn ${activeTool === TOOLS.CURVATURE ? 'active' : ''}`}
            onClick={() => setActiveTool(TOOLS.CURVATURE)}
            title={`${t('curvatureTool') || 'Curvature Tool'} - Auto-smooth curves`}
          >
            〰️
          </button>
          <button
            className="tool-btn"
            onClick={() => window.dispatchEvent(new CustomEvent('traceImage'))}
            title={t('traceImage') || 'Trace Image to SVG - Convert raster to vector'}
          >
            🎨
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
    </div>
  );
}
