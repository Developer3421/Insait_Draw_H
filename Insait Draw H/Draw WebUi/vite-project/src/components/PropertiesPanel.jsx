import { useState, useEffect, useCallback } from 'react';
import { useEditorStore } from '../stores/editorStore';
import { useLanguageStore } from '../stores/languageStore';
import './PropertiesPanel.css';

const PRESET_COLORS = [
  '#ffffff', '#c0c0c0', '#808080', '#000000',
  '#ff0000', '#800000', '#ffff00', '#808000',
  '#00ff00', '#008000', '#00ffff', '#008080',
  '#0000ff', '#000080', '#ff00ff', '#800080',
];

const FONTS = [
  'Arial', 'Helvetica', 'Times New Roman', 'Georgia',
  'Verdana', 'Courier New', 'Comic Sans MS', 'Impact',
];

export function PropertiesPanel() {
  const { t } = useLanguageStore();
  const { canvas, layers, selectedLayerId } = useEditorStore();
  
  const [selectedObject, setSelectedObject] = useState(null);
  const [properties, setProperties] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    scaleX: 1,
    scaleY: 1,
    angle: 0,
    opacity: 1,
    fill: '',
    stroke: '',
    strokeWidth: 0,
    // Text properties
    fontFamily: 'Arial',
    fontSize: 24,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'left',
    // Circle specific
    radius: 0,
  });

  // Update properties from selected object
  const updatePropertiesFromObject = useCallback((obj) => {
    if (!obj) {
      setSelectedObject(null);
      return;
    }
    
    setSelectedObject(obj);
    setProperties({
      left: Math.round(obj.left || 0),
      top: Math.round(obj.top || 0),
      width: Math.round(obj.width * (obj.scaleX || 1)),
      height: Math.round(obj.height * (obj.scaleY || 1)),
      scaleX: Number((obj.scaleX || 1).toFixed(2)),
      scaleY: Number((obj.scaleY || 1).toFixed(2)),
      angle: Math.round(obj.angle || 0),
      opacity: Number((obj.opacity ?? 1).toFixed(2)),
      fill: obj.fill || 'transparent',
      stroke: obj.stroke || '#000000',
      strokeWidth: obj.strokeWidth || 0,
      // Text properties
      fontFamily: obj.fontFamily || 'Arial',
      fontSize: obj.fontSize || 24,
      fontWeight: obj.fontWeight || 'normal',
      fontStyle: obj.fontStyle || 'normal',
      textAlign: obj.textAlign || 'left',
      // Circle specific
      radius: obj.radius ? Math.round(obj.radius) : 0,
    });
  }, []);

  // Listen to canvas selection changes
  useEffect(() => {
    if (!canvas) return;
    
    const handleSelectionCreated = (e) => {
      const activeObj = e.selected?.[0] || canvas.getActiveObject();
      updatePropertiesFromObject(activeObj);
    };
    
    const handleSelectionUpdated = (e) => {
      const activeObj = e.selected?.[0] || canvas.getActiveObject();
      updatePropertiesFromObject(activeObj);
    };
    
    const handleSelectionCleared = () => {
      setSelectedObject(null);
    };
    
    const handleObjectModified = (e) => {
      if (e.target === selectedObject) {
        updatePropertiesFromObject(e.target);
      }
    };
    
    const handleObjectScaling = (e) => {
      if (e.target === selectedObject) {
        updatePropertiesFromObject(e.target);
      }
    };
    
    const handleObjectMoving = (e) => {
      if (e.target === selectedObject) {
        updatePropertiesFromObject(e.target);
      }
    };
    
    const handleObjectRotating = (e) => {
      if (e.target === selectedObject) {
        updatePropertiesFromObject(e.target);
      }
    };
    
    canvas.on('selection:created', handleSelectionCreated);
    canvas.on('selection:updated', handleSelectionUpdated);
    canvas.on('selection:cleared', handleSelectionCleared);
    canvas.on('object:modified', handleObjectModified);
    canvas.on('object:scaling', handleObjectScaling);
    canvas.on('object:moving', handleObjectMoving);
    canvas.on('object:rotating', handleObjectRotating);
    
    // Get current selection if any
    const activeObj = canvas.getActiveObject();
    if (activeObj) {
      updatePropertiesFromObject(activeObj);
    }
    
    return () => {
      canvas.off('selection:created', handleSelectionCreated);
      canvas.off('selection:updated', handleSelectionUpdated);
      canvas.off('selection:cleared', handleSelectionCleared);
      canvas.off('object:modified', handleObjectModified);
      canvas.off('object:scaling', handleObjectScaling);
      canvas.off('object:moving', handleObjectMoving);
      canvas.off('object:rotating', handleObjectRotating);
    };
  }, [canvas, selectedObject, updatePropertiesFromObject]);

  // Sync with layer selection
  useEffect(() => {
    if (!canvas || !selectedLayerId) return;
    
    const layer = layers.find(l => l.id === selectedLayerId);
    if (layer) {
      const obj = canvas.getObjects().find(o => o.id === layer.objectId);
      if (obj) {
        updatePropertiesFromObject(obj);
      }
    }
  }, [canvas, selectedLayerId, layers, updatePropertiesFromObject]);

  // Apply property change to object
  const applyProperty = useCallback((propName, value) => {
    if (!selectedObject || !canvas) return;
    
    // Handle special cases
    if (propName === 'width') {
     const newScaleX = value / selectedObject.width;
      selectedObject.set({ scaleX: newScaleX });
    } else if (propName === 'height') {
      const newScaleY = value / selectedObject.height;
      selectedObject.set({ scaleY: newScaleY });
    } else if (propName === 'fill' && value === '') {
      selectedObject.set({ fill: 'transparent' });
    } else {
      selectedObject.set({ [propName]: value });
    }
    
    selectedObject.setCoords();
    canvas.requestRenderAll();
    
    // Update local state
    updatePropertiesFromObject(selectedObject);
  }, [selectedObject, canvas, updatePropertiesFromObject]);

  const handleInputChange = (propName, value, type = 'number') => {
    let parsedValue = value;
    
    if (type === 'number') {
      parsedValue = parseFloat(value);
      if (isNaN(parsedValue)) return;
    }
    
    setProperties(prev => ({ ...prev, [propName]: parsedValue }));
  };

  const handleInputBlur = (propName) => {
    applyProperty(propName, properties[propName]);
  };

  const handleKeyDown = (e, propName) => {
    if (e.key === 'Enter') {
      applyProperty(propName, properties[propName]);
      e.target.blur();
    }
  };

  const getObjectType = () => {
    if (!selectedObject) return '';
    const type = selectedObject.type || '';
    if (type === 'i-text' || type === 'text') return 'text';
    if (type === 'circle') return 'circle';
    if (type === 'rect') return 'rectangle';
    if (type === 'triangle') return 'triangle';
    if (type === 'line') return 'line';
    if (type === 'path') return 'path';
    if (type === 'image') return 'image';
    return type;
  };

  const isTextObject = getObjectType() === 'text';
  const isCircleObject = getObjectType() === 'circle';
  const isLineObject = getObjectType() === 'line';
  const objectType = getObjectType();

  if (!selectedObject) {
    return (
      <div className="properties-panel">
        <div className="properties-header">
          <h3>🎨 {t('properties') || 'Properties'}</h3>
        </div>
        <div className="properties-empty">
          {t('selectObject') || 'Select an object to edit its properties'}
        </div>
      </div>
    );
  }

  return (
    <div className="properties-panel">
      <div className="properties-header">
        <h3>🎨 {t('properties') || 'Properties'}</h3>
        <span className="object-type-badge">{objectType}</span>
      </div>

      <div className="properties-content">
        {/* Position */}
        <div className="property-section">
          <div className="section-title">{t('position') || 'Position'}</div>
          <div className="property-row">
            <div className="property-field">
              <label>X</label>
              <input
                type="number"
                value={properties.left}
                onChange={(e) => handleInputChange('left', e.target.value)}
                onBlur={() => handleInputBlur('left')}
                onKeyDown={(e) => handleKeyDown(e, 'left')}
              />
            </div>
            <div className="property-field">
              <label>Y</label>
              <input
                type="number"
                value={properties.top}
                onChange={(e) => handleInputChange('top', e.target.value)}
                onBlur={() => handleInputBlur('top')}
                onKeyDown={(e) => handleKeyDown(e, 'top')}
              />
            </div>
          </div>
        </div>

        {/* Size */}
        <div className="property-section">
          <div className="section-title">{t('size') || 'Size'}</div>
          <div className="property-row">
            {isCircleObject ? (
              <div className="property-field full-width">
                <label>{t('radius') || 'Radius'}</label>
                <input
                  type="number"
                  value={properties.radius}
                  onChange={(e) => handleInputChange('radius', e.target.value)}
                  onBlur={() => handleInputBlur('radius')}
                  onKeyDown={(e) => handleKeyDown(e, 'radius')}
                  min="1"
                />
              </div>
            ) : (
              <>
                <div className="property-field">
                  <label>{t('width') || 'W'}</label>
                  <input
                    type="number"
                    value={properties.width}
                    onChange={(e) => handleInputChange('width', e.target.value)}
                    onBlur={() => handleInputBlur('width')}
                    onKeyDown={(e) => handleKeyDown(e, 'width')}
                    min="1"
                  />
                </div>
                <div className="property-field">
                  <label>{t('height') || 'H'}</label>
                  <input
                    type="number"
                    value={properties.height}
                    onChange={(e) => handleInputChange('height', e.target.value)}
                    onBlur={() => handleInputBlur('height')}
                    onKeyDown={(e) => handleKeyDown(e, 'height')}
                    min="1"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Rotation & Opacity */}
        <div className="property-section">
          <div className="section-title">{t('transform') || 'Transform'}</div>
          <div className="property-row">
            <div className="property-field">
              <label>{t('angle') || '°'}</label>
              <input
                type="number"
                value={properties.angle}
                onChange={(e) => handleInputChange('angle', e.target.value)}
                onBlur={() => handleInputBlur('angle')}
                onKeyDown={(e) => handleKeyDown(e, 'angle')}
                min="-360"
                max="360"
              />
            </div>
            <div className="property-field">
              <label>{t('opacity') || 'α'}</label>
              <input
                type="number"
                value={properties.opacity}
                onChange={(e) => handleInputChange('opacity', e.target.value)}
                onBlur={() => handleInputBlur('opacity')}
                onKeyDown={(e) => handleKeyDown(e, 'opacity')}
                min="0"
                max="1"
                step="0.1"
              />
            </div>
          </div>
        </div>

        {/* Fill & Stroke (not for lines) */}
        {!isLineObject && (
          <div className="property-section">
            <div className="section-title">{t('fill') || 'Fill'}</div>
            <div className="property-row colors-row">
              <div className="color-field">
                <input
                  type="color"
                  value={properties.fill === 'transparent' ? '#ffffff' : properties.fill}
                  onChange={(e) => {
                    setProperties(prev => ({ ...prev, fill: e.target.value }));
                    applyProperty('fill', e.target.value);
                  }}
                  className="color-input"
                />
                <button
                  className={`transparent-btn ${properties.fill === 'transparent' ? 'active' : ''}`}
                  onClick={() => applyProperty('fill', 'transparent')}
                  title={t('transparent') || 'No Fill'}
                >
                  ∅
                </button>
              </div>
              <div className="color-presets">
                {PRESET_COLORS.slice(0, 8).map(color => (
                  <button
                    key={color}
                    className={`preset-color ${properties.fill === color ? 'active' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      setProperties(prev => ({ ...prev, fill: color }));
                      applyProperty('fill', color);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="property-section">
          <div className="section-title">{t('stroke') || 'Stroke'}</div>
          <div className="property-row colors-row">
            <div className="color-field">
              <input
                type="color"
                value={properties.stroke || '#000000'}
                onChange={(e) => {
                  setProperties(prev => ({ ...prev, stroke: e.target.value }));
                  applyProperty('stroke', e.target.value);
                }}
                className="color-input"
              />
            </div>
            <div className="property-field stroke-width">
              <label>{t('width') || 'W'}</label>
              <input
                type="number"
                value={properties.strokeWidth}
                onChange={(e) => handleInputChange('strokeWidth', e.target.value)}
                onBlur={() => handleInputBlur('strokeWidth')}
                onKeyDown={(e) => handleKeyDown(e, 'strokeWidth')}
                min="0"
                max="100"
              />
            </div>
          </div>
        </div>

        {/* Text Properties */}
        {isTextObject && (
          <div className="property-section">
            <div className="section-title">{t('textSettings') || 'Text'}</div>
            <div className="property-row">
              <div className="property-field full-width">
                <label>{t('font') || 'Font'}</label>
                <select
                  value={properties.fontFamily}
                  onChange={(e) => {
                    setProperties(prev => ({ ...prev, fontFamily: e.target.value }));
                    applyProperty('fontFamily', e.target.value);
                  }}
                  className="font-select"
                >
                  {FONTS.map(font => (
                    <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="property-row">
              <div className="property-field">
                <label>{t('fontSize') || 'Size'}</label>
                <input
                  type="number"
                  value={properties.fontSize}
                  onChange={(e) => handleInputChange('fontSize', e.target.value)}
                  onBlur={() => handleInputBlur('fontSize')}
                  onKeyDown={(e) => handleKeyDown(e, 'fontSize')}
                  min="8"
                  max="200"
                />
              </div>
              <div className="property-field">
                <label>{t('textAlign') || 'Align'}</label>
                <select
                  value={properties.textAlign}
                  onChange={(e) => {
                    setProperties(prev => ({ ...prev, textAlign: e.target.value }));
                    applyProperty('textAlign', e.target.value);
                  }}
                >
                  <option value="left">←</option>
                  <option value="center">↔</option>
                  <option value="right">→</option>
                </select>
              </div>
            </div>
            <div className="property-row text-style-row">
              <button
                className={`style-btn ${properties.fontWeight === 'bold' ? 'active' : ''}`}
                onClick={() => {
                  const newWeight = properties.fontWeight === 'bold' ? 'normal' : 'bold';
                  setProperties(prev => ({ ...prev, fontWeight: newWeight }));
                  applyProperty('fontWeight', newWeight);
                }}
              >
                <b>B</b>
              </button>
              <button
                className={`style-btn ${properties.fontStyle === 'italic' ? 'active' : ''}`}
                onClick={() => {
                  const newStyle = properties.fontStyle === 'italic' ? 'normal' : 'italic';
                  setProperties(prev => ({ ...prev, fontStyle: newStyle }));
                  applyProperty('fontStyle', newStyle);
                }}
              >
                <i>I</i>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
