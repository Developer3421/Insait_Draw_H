import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

// Пресети розмірів аркушів (у пікселях при 96 DPI)
export const PAGE_PRESETS = {
  A4: { width: 794, height: 1123, name: 'A4' }, // 210x297 mm at 96 DPI
  A4_LANDSCAPE: { width: 1123, height: 794, name: 'A4 Landscape' },
  A3: { width: 1123, height: 1587, name: 'A3' }, // 297x420 mm at 96 DPI
  A3_LANDSCAPE: { width: 1587, height: 1123, name: 'A3 Landscape' },
  LETTER: { width: 816, height: 1056, name: 'Letter' }, // 8.5x11 in at 96 DPI
  LETTER_LANDSCAPE: { width: 1056, height: 816, name: 'Letter Landscape' },
  HD: { width: 1920, height: 1080, name: 'HD 1080p' },
  HD_PORTRAIT: { width: 1080, height: 1920, name: 'HD Portrait' },
  SQUARE: { width: 1000, height: 1000, name: 'Square' },
  CUSTOM: { width: 800, height: 600, name: 'Custom' },
};

// Кольори теми додатку
export const THEME_COLORS = {
  // Pasteboard (робочий простір за межами аркуша) - ніжно-оранжевий
  pasteboard: '#FFE4C4',
  // Аркуш (page/artboard)
  page: '#FFFFFF',
  pageShadow: 'rgba(100, 80, 60, 0.25)',
  background: '#16213e',
  backgroundDark: '#0f0f1a',
  surface: '#1a1a2e',
  surfaceLight: '#0f3460',
  surfaceLighter: '#1a4a7a',
  primary: '#4a90d9',
  primaryLight: '#6ab0ff',
  success: '#1e5128',
  successLight: '#2e7d32',
  text: 'rgba(255, 255, 255, 0.87)',
  textMuted: '#888',
  border: '#0f3460',
  canvasBackground: '#1a1a2e',
};

// Інструменти редактора
export const TOOLS = {
  SELECT: 'select',
  PAN: 'pan',
  BRUSH: 'brush',
  ERASER: 'eraser',
  LINE: 'line',
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle',
  TRIANGLE: 'triangle',
  POLYGON: 'polygon',
  TEXT: 'text',
  PATH: 'path',
  // Bezier/Path tools - як в Adobe Illustrator / CorelDRAW
  PEN: 'pen',                   // Перо - малювання кривих Безьє точка за точкою
  CURVATURE: 'curvature',       // Інструмент кривизни - автоматичні плавні криві
  ANCHOR_POINT: 'anchor_point', // Редагування опорних точок
  DIRECT_SELECT: 'direct_select', // Пряме виділення - вибір окремих точок/handles
};

// Типи boolean операцій
export const BOOLEAN_OPS = {
  UNION: 'union',
  SUBTRACT: 'subtract',
  INTERSECT: 'intersect',
};

// Створюємо базовий store
const createEditorStore = (set, get) => ({
  // Канвас Fabric.js
  canvas: null,
  setCanvas: (canvas) => set({ canvas }),
  
  // Аркуш (Page/Artboard) - як в CorelDRAW
  pageSettings: {
    width: PAGE_PRESETS.A4.width,
    height: PAGE_PRESETS.A4.height,
    name: PAGE_PRESETS.A4.name,
    preset: 'A4',
  },
  pageObject: null, // Reference to Fabric.Rect of the page
  setPageSettings: (settings) => set((state) => ({
    pageSettings: { ...state.pageSettings, ...settings }
  })),
  setPageObject: (obj) => set({ pageObject: obj }),
  setPagePreset: (presetKey) => {
    const preset = PAGE_PRESETS[presetKey];
    if (preset) {
      set({
        pageSettings: {
          width: preset.width,
          height: preset.height,
          name: preset.name,
          preset: presetKey,
        }
      });
    }
  },
  setCustomPageSize: (width, height) => {
    set({
      pageSettings: {
        width: Math.max(100, width),
        height: Math.max(100, height),
        name: 'Custom',
        preset: 'CUSTOM',
      }
    });
  },
  
  // Активний інструмент
  activeTool: TOOLS.SELECT,
  setActiveTool: (tool) => set({ activeTool: tool }),
  
  // Колір та розмір
  strokeColor: '#ffffff',
  fillColor: '#4a90d9',
  strokeWidth: 2,
  setStrokeColor: (color) => set({ strokeColor: color }),
  setFillColor: (color) => set({ fillColor: color }),
  setStrokeWidth: (width) => set({ strokeWidth: width }),
  
  // Шрифт для тексту
  fontFamily: 'Arial',
  fontSize: 24,
  setFontFamily: (font) => set({ fontFamily: font }),
  setFontSize: (size) => set({ fontSize: size }),
  
  // Масштаб та позиція канвасу
  zoom: 1,
  panOffset: { x: 0, y: 0 },
  setZoom: (zoom) => set({ zoom: Math.min(Math.max(zoom, 0.1), 10) }),
  setPanOffset: (offset) => set({ panOffset: offset }),
  
  // Сітка та прив'язка
  showGrid: true,
  snapToGrid: true,
  gridSize: 20,
  snapToObjects: true,
  setShowGrid: (show) => set({ showGrid: show }),
  setSnapToGrid: (snap) => set({ snapToGrid: snap }),
  setGridSize: (size) => set({ gridSize: size }),
  setSnapToObjects: (snap) => set({ snapToObjects: snap }),
  
  // Шари (Layers)
  layers: [],
  selectedLayerId: null,
  
  // Додати шар
  addLayer: (object) => {
    // Визначаємо ім'я об'єкта на основі типу
    let objectName = object.name || object.type || 'Object';
    
    // Покращене визначення типу
    if (object.type === 'path') {
      objectName = object.name || 'Path';
    } else if (object.type === 'rect') {
      objectName = 'Rectangle';
    } else if (object.type === 'circle') {
      objectName = 'Circle';
    } else if (object.type === 'triangle') {
      objectName = 'Triangle';
    } else if (object.type === 'line') {
      objectName = 'Line';
    } else if (object.type === 'i-text' || object.type === 'text') {
      objectName = 'Text';
    } else if (object.type === 'image') {
      objectName = 'Image';
    }
    
    const newLayer = {
      id: uuidv4(),
      objectId: object.id || uuidv4(),
      name: objectName,
      visible: true,
      locked: false,
      object: object,
    };
    object.id = newLayer.objectId;
    set((state) => ({
      layers: [...state.layers, newLayer],
      selectedLayerId: newLayer.id,
    }));
    return newLayer;
  },
  
  // Видалити шар
  removeLayer: (layerId) => {
    set((state) => {
      const layer = state.layers.find((l) => l.id === layerId);
      if (layer && state.canvas) {
        const obj = state.canvas.getObjects().find((o) => o.id === layer.objectId);
        if (obj) {
          state.canvas.remove(obj);
        }
      }
      return {
        layers: state.layers.filter((l) => l.id !== layerId),
        selectedLayerId: state.selectedLayerId === layerId ? null : state.selectedLayerId,
      };
    });
  },
  
  // Видалити шар по objectId
  removeLayerByObjectId: (objectId) => {
    set((state) => {
      const layer = state.layers.find((l) => l.objectId === objectId);
      if (!layer) return state;
      return {
        layers: state.layers.filter((l) => l.objectId !== objectId),
        selectedLayerId: state.selectedLayerId === layer.id ? null : state.selectedLayerId,
      };
    });
  },
  
  // Перейменувати шар
  renameLayer: (layerId, newName) => {
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === layerId ? { ...l, name: newName } : l
      ),
    }));
  },
  
  // Показати/приховати шар
  toggleLayerVisibility: (layerId) => {
    set((state) => {
      const layer = state.layers.find((l) => l.id === layerId);
      if (layer && state.canvas) {
        const obj = state.canvas.getObjects().find((o) => o.id === layer.objectId);
        if (obj) {
          obj.visible = !layer.visible;
          state.canvas.renderAll();
        }
      }
      return {
        layers: state.layers.map((l) =>
          l.id === layerId ? { ...l, visible: !l.visible } : l
        ),
      };
    });
  },
  
  // Заблокувати/розблокувати шар
  toggleLayerLock: (layerId) => {
    set((state) => {
      const layer = state.layers.find((l) => l.id === layerId);
      if (layer && state.canvas) {
        const obj = state.canvas.getObjects().find((o) => o.id === layer.objectId);
        if (obj) {
          const newLocked = !layer.locked;
          obj.selectable = !newLocked;
          obj.evented = !newLocked;
          state.canvas.renderAll();
        }
      }
      return {
        layers: state.layers.map((l) =>
          l.id === layerId ? { ...l, locked: !l.locked } : l
        ),
      };
    });
  },
  
  // Вибрати шар
  selectLayer: (layerId) => {
    const state = get();
    const layer = state.layers.find((l) => l.id === layerId);
    if (layer && state.canvas) {
      const obj = state.canvas.getObjects().find((o) => o.id === layer.objectId);
      if (obj && !layer.locked) {
        state.canvas.setActiveObject(obj);
        state.canvas.renderAll();
      }
    }
    set({ selectedLayerId: layerId });
  },
  
  // Змінити порядок шарів (Z-index)
  moveLayer: (layerId, direction) => {
    set((state) => {
      const index = state.layers.findIndex((l) => l.id === layerId);
      if (index === -1) return state;
      
      const newLayers = [...state.layers];
      const layer = newLayers[index];
      
      if (direction === 'up' && index < newLayers.length - 1) {
        newLayers.splice(index, 1);
        newLayers.splice(index + 1, 0, layer);
        
        // Оновити z-index в Fabric.js
        if (state.canvas) {
          const obj = state.canvas.getObjects().find((o) => o.id === layer.objectId);
          if (obj) {
            state.canvas.bringObjectForward(obj);
          }
        }
      } else if (direction === 'down' && index > 0) {
        newLayers.splice(index, 1);
        newLayers.splice(index - 1, 0, layer);
        
        if (state.canvas) {
          const obj = state.canvas.getObjects().find((o) => o.id === layer.objectId);
          if (obj) {
            state.canvas.sendObjectBackwards(obj);
          }
        }
      } else if (direction === 'top') {
        newLayers.splice(index, 1);
        newLayers.push(layer);
        
        if (state.canvas) {
          const obj = state.canvas.getObjects().find((o) => o.id === layer.objectId);
          if (obj) {
            state.canvas.bringObjectToFront(obj);
          }
        }
      } else if (direction === 'bottom') {
        newLayers.splice(index, 1);
        newLayers.unshift(layer);
        
        if (state.canvas) {
          const obj = state.canvas.getObjects().find((o) => o.id === layer.objectId);
          if (obj) {
            state.canvas.sendObjectToBack(obj);
          }
        }
      }
      
      return { layers: newLayers };
    });
  },
  
  // Синхронізувати шари з канвасом
  syncLayersFromCanvas: () => {
    const state = get();
    if (!state.canvas) return;
    
    const canvasObjects = state.canvas.getObjects();
    const existingIds = new Set(state.layers.map((l) => l.objectId));
    
    // Додати нові об'єкти як шари
    canvasObjects.forEach((obj) => {
      if (!obj.id) {
        obj.id = uuidv4();
      }
      if (!existingIds.has(obj.id)) {
        const newLayer = {
          id: uuidv4(),
          objectId: obj.id,
          name: obj.type || 'Object',
          visible: obj.visible !== false,
          locked: !obj.selectable,
          object: obj,
        };
        set((state) => ({
          layers: [...state.layers, newLayer],
        }));
      }
    });
  },
  
  // Очистити шари
  clearLayers: () => set({ layers: [], selectedLayerId: null }),
  
  // Оновити шари
  setLayers: (layers) => set({ layers }),
  
  // Стан історії (undo/redo)
  historyState: {
    canUndo: false,
    canRedo: false,
    pastCount: 0,
    futureCount: 0,
  },
  setHistoryState: (historyState) => set({ historyState }),
});

// Створюємо store без zundo (історія управляється через useCanvasHistory)
export const useEditorStore = create(createEditorStore);

// Хук для отримання стану історії
export const useHistoryState = () => useEditorStore((state) => state.historyState);

// Legacy export для сумісності (тепер використовуйте useCanvasHistory)
export const useTemporalStore = () => ({
  undo: () => console.warn('useTemporalStore is deprecated. Use useCanvasHistory instead.'),
  redo: () => console.warn('useTemporalStore is deprecated. Use useCanvasHistory instead.'),
  pastStates: [],
  futureStates: [],
});
