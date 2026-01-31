import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

// Кольори теми додатку
export const THEME_COLORS = {
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
    const newLayer = {
      id: uuidv4(),
      objectId: object.id || uuidv4(),
      name: object.type || 'Object',
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
