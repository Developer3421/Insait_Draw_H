import { useCallback, useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import { useEditorStore, TOOLS, THEME_COLORS } from '../stores/editorStore';
import { useLanguageStore } from '../stores/languageStore';

const { Canvas, Rect, Circle, Triangle, Line, IText, PencilBrush } = fabric;

export function useFabricCanvas(canvasRef, containerRef) {
  const fabricCanvasRef = useRef(null);
  const isPanning = useRef(false);
  const lastPosX = useRef(0);
  const lastPosY = useRef(0);
  const isDrawingShape = useRef(false);
  const shapeStartPoint = useRef(null);
  const currentShape = useRef(null);
  const isInitialized = useRef(false);
  
  // Ініціалізація канвасу
  const initCanvas = useCallback(() => {
    if (!canvasRef.current || isInitialized.current) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    // Використовуємо requestAnimationFrame для гарантії що DOM готовий
    requestAnimationFrame(() => {
      const rect = container.getBoundingClientRect();
      const width = rect.width || window.innerWidth;
      const height = rect.height || window.innerHeight - 200;
      
      if (width <= 0 || height <= 0) return;
      
      try {
        const canvas = new Canvas(canvasRef.current, {
          width,
          height,
          backgroundColor: 'transparent', // Прозорий фон - сітка і pasteboard малюються на grid-canvas
          selection: true,
          preserveObjectStacking: true,
          enableRetinaScaling: true,
          allowTouchScrolling: false,
          stopContextMenu: true,
          fireRightClick: true,
        });
        
        // Встановлюємо пензель
        canvas.freeDrawingBrush = new PencilBrush(canvas);
        canvas.freeDrawingBrush.color = '#ffffff';
        canvas.freeDrawingBrush.width = 5;
        
        fabricCanvasRef.current = canvas;
        isInitialized.current = true;
        
        // Зберігаємо в store
        useEditorStore.getState().setCanvas(canvas);
        
        // Підписуємось на події
        setupCanvasEvents(canvas);
        
        // Trigger render
        canvas.renderAll();
      } catch (error) {
        console.error('Error initializing fabric canvas:', error);
      }
    });
  }, [canvasRef, containerRef]);
  
  // Налаштування подій канвасу
  const setupCanvasEvents = useCallback((canvas) => {
    if (!canvas) return;
    
    // Функція для отримання позиції миші (сумісна з v7)
    const getPointerPosition = (opt, canvas) => {
      // opt містить e (Event) та pointer/scenePoint
      const e = opt.e;
      
      // Fabric.js v7 може надавати scenePoint або pointer напряму в opt
      if (opt.scenePoint) {
        return opt.scenePoint;
      }
      if (opt.pointer) {
        return opt.pointer;
      }
      
      // Спробуємо використати методи canvas
      try {
        if (typeof canvas.getScenePoint === 'function') {
          return canvas.getScenePoint(e);
        }
        if (typeof canvas.getPointer === 'function') {
          return canvas.getPointer(e);
        }
      } catch (err) {
        console.warn('Error getting pointer position:', err);
      }
      
      // Fallback - вручну обчислюємо позицію
      const canvasEl = canvas.upperCanvasEl || canvas.getElement();
      const rect = canvasEl?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const zoom = canvas.getZoom();
      const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
      
      return {
        x: (clientX - rect.left - vpt[4]) / zoom,
        y: (clientY - rect.top - vpt[5]) / zoom
      };
    };
    
    // Mouse wheel для zoom
    canvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY;
      let newZoom = canvas.getZoom() * (0.999 ** delta);
      newZoom = Math.min(Math.max(newZoom, 0.1), 10);
      canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, newZoom);
      useEditorStore.getState().setZoom(newZoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });
    
    // Mouse down
    canvas.on('mouse:down', (opt) => {
      const { activeTool, snapToGrid, gridSize } = useEditorStore.getState();
      
      const snapValue = (val) => snapToGrid ? Math.round(val / gridSize) * gridSize : val;
      
      // Pan mode
      if (activeTool === TOOLS.PAN || opt.e.altKey) {
        isPanning.current = true;
        canvas.selection = false;
        const clientX = opt.e.touches ? opt.e.touches[0].clientX : opt.e.clientX;
        const clientY = opt.e.touches ? opt.e.touches[0].clientY : opt.e.clientY;
        lastPosX.current = clientX;
        lastPosY.current = clientY;
        canvas.setCursor('grabbing');
        return;
      }
      
      // In SELECT mode, let Fabric.js handle object selection and movement natively
      if (activeTool === TOOLS.SELECT) {
        return;
      }
      
      // Drawing shapes - only start if not clicking on an existing object
      if ([TOOLS.RECTANGLE, TOOLS.CIRCLE, TOOLS.TRIANGLE, TOOLS.LINE].includes(activeTool)) {
        // Check if clicking on an existing object
        if (opt.target) {
          // If there's a target object, don't start drawing - let Fabric handle selection
          return;
        }
        isDrawingShape.current = true;
        const pointer = getPointerPosition(opt, canvas);
        shapeStartPoint.current = {
          x: snapValue(pointer.x),
          y: snapValue(pointer.y),
        };
      }
    });
    
    // Mouse move
    canvas.on('mouse:move', (opt) => {
      const { activeTool, snapToGrid, gridSize, strokeColor, fillColor, strokeWidth } = useEditorStore.getState();
      
      const snapValue = (val) => snapToGrid ? Math.round(val / gridSize) * gridSize : val;
      
      // Pan
      if (isPanning.current) {
        const vpt = canvas.viewportTransform;
        const clientX = opt.e.touches ? opt.e.touches[0].clientX : opt.e.clientX;
        const clientY = opt.e.touches ? opt.e.touches[0].clientY : opt.e.clientY;
        vpt[4] += clientX - lastPosX.current;
        vpt[5] += clientY - lastPosY.current;
        lastPosX.current = clientX;
        lastPosY.current = clientY;
        canvas.requestRenderAll();
        return;
      }
      
      // Малювання фігур
      if (isDrawingShape.current && shapeStartPoint.current) {
        const pointer = getPointerPosition(opt, canvas);
        const endX = snapValue(pointer.x);
        const endY = snapValue(pointer.y);
        const startX = shapeStartPoint.current.x;
        const startY = shapeStartPoint.current.y;
        
        if (currentShape.current) {
          canvas.remove(currentShape.current);
        }
        
        let shape = null;
        
        if (activeTool === TOOLS.RECTANGLE) {
          const width = Math.abs(endX - startX);
          const height = Math.abs(endY - startY);
          if (width > 1 && height > 1) {
            shape = new Rect({
              left: Math.min(startX, endX),
              top: Math.min(startY, endY),
              width: width,
              height: height,
              fill: fillColor,
              stroke: strokeColor,
              strokeWidth: strokeWidth,
              selectable: false,
              evented: false,
            });
          }
        } else if (activeTool === TOOLS.CIRCLE) {
          const width = Math.abs(endX - startX);
          const height = Math.abs(endY - startY);
          const radius = Math.max(width, height) / 2;
          if (radius > 1) {
            shape = new Circle({
              left: startX + (endX - startX) / 2 - radius,
              top: startY + (endY - startY) / 2 - radius,
              radius: radius,
              fill: fillColor,
              stroke: strokeColor,
              strokeWidth: strokeWidth,
              selectable: false,
              evented: false,
            });
          }
        } else if (activeTool === TOOLS.TRIANGLE) {
          const width = Math.abs(endX - startX);
          const height = Math.abs(endY - startY);
          if (width > 1 && height > 1) {
            shape = new Triangle({
              left: Math.min(startX, endX),
              top: Math.min(startY, endY),
              width: width,
              height: height,
              fill: fillColor,
              stroke: strokeColor,
              strokeWidth: strokeWidth,
              selectable: false,
              evented: false,
            });
          }
        } else if (activeTool === TOOLS.LINE) {
          const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
          if (length > 1) {
            shape = new Line([startX, startY, endX, endY], {
              stroke: strokeColor,
              strokeWidth: strokeWidth,
              selectable: false,
              evented: false,
            });
          }
        }
        
        if (shape) {
          canvas.add(shape);
          currentShape.current = shape;
          canvas.renderAll();
        }
      }
    });
    
    // Mouse up
    canvas.on('mouse:up', () => {
      const { activeTool, addLayer } = useEditorStore.getState();
      
      if (isPanning.current) {
        isPanning.current = false;
        canvas.selection = activeTool === TOOLS.SELECT;
        canvas.setCursor(activeTool === TOOLS.PAN ? 'grab' : 'default');
        return;
      }
      
      if (isDrawingShape.current && currentShape.current) {
        currentShape.current.set({
          selectable: true,
          evented: true,
        });
        
        addLayer(currentShape.current);
        canvas.setActiveObject(currentShape.current);
        canvas.renderAll();
        
        currentShape.current = null;
        shapeStartPoint.current = null;
        isDrawingShape.current = false;
      }
    });
    
    // Double click for text
    canvas.on('mouse:dblclick', (opt) => {
      const { activeTool, fontFamily, fontSize, fillColor, snapToGrid, gridSize, addLayer } = useEditorStore.getState();
      const { t } = useLanguageStore.getState();
      
      if (activeTool !== TOOLS.TEXT) return;
      
      const snapValue = (val) => snapToGrid ? Math.round(val / gridSize) * gridSize : val;
      const pointer = getPointerPosition(opt, canvas);
      
      const text = new IText(t('defaultText'), {
        left: snapValue(pointer.x),
        top: snapValue(pointer.y),
        fontFamily: fontFamily,
        fontSize: fontSize,
        fill: fillColor,
        editable: true,
      });
      
      canvas.add(text);
      addLayer(text);
      canvas.setActiveObject(text);
      text.enterEditing();
      canvas.renderAll();
    });
    
    // Path created (для пензля)
    canvas.on('path:created', (opt) => {
      const { addLayer } = useEditorStore.getState();
      if (opt.path) {
        addLayer(opt.path);
      }
    });
  }, []);
  
  // Оновлення режиму малювання при зміні інструменту
  useEffect(() => {
    // Функція для оновлення стану canvas
    const updateCanvasState = (state) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      
      // Режим пензля
      if (state.activeTool === TOOLS.BRUSH) {
        canvas.isDrawingMode = true;
        if (!canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush = new PencilBrush(canvas);
        }
        canvas.freeDrawingBrush.color = state.strokeColor;
        canvas.freeDrawingBrush.width = state.strokeWidth;
        canvas.selection = false;
        canvas.defaultCursor = 'crosshair';
        canvas.hoverCursor = 'crosshair';
      } else if (state.activeTool === TOOLS.ERASER) {
        canvas.isDrawingMode = true;
        if (!canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush = new PencilBrush(canvas);
        }
        canvas.freeDrawingBrush.color = '#1a1a2e';
        canvas.freeDrawingBrush.width = state.strokeWidth * 2;
        canvas.selection = false;
        canvas.defaultCursor = 'crosshair';
        canvas.hoverCursor = 'crosshair';
      } else {
        canvas.isDrawingMode = false;
        canvas.selection = state.activeTool === TOOLS.SELECT;
        
        if (state.activeTool === TOOLS.PAN) {
          canvas.defaultCursor = 'grab';
          canvas.hoverCursor = 'grab';
        } else if ([TOOLS.RECTANGLE, TOOLS.CIRCLE, TOOLS.TRIANGLE, TOOLS.LINE].includes(state.activeTool)) {
          canvas.defaultCursor = 'crosshair';
          canvas.hoverCursor = 'crosshair';
        } else if (state.activeTool === TOOLS.TEXT) {
          canvas.defaultCursor = 'text';
          canvas.hoverCursor = 'text';
        } else {
          canvas.defaultCursor = 'default';
          canvas.hoverCursor = 'move';
        }
      }
      
      canvas.renderAll();
    };
    
    // Підписуємось на зміни store
    const unsubscribe = useEditorStore.subscribe((state) => {
      updateCanvasState(state);
    });
    
    // Оновлюємо стан при першому рендері
    const checkAndUpdate = setInterval(() => {
      if (fabricCanvasRef.current) {
        updateCanvasState(useEditorStore.getState());
        clearInterval(checkAndUpdate);
      }
    }, 100);
    
    return () => {
      unsubscribe();
      clearInterval(checkAndUpdate);
    };
  }, []);
  
  // Обробка resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = fabricCanvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        canvas.setDimensions({
          width: rect.width,
          height: rect.height,
        });
        canvas.renderAll();
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // Також викликаємо resize після невеликої затримки для гарантії
    const timeout = setTimeout(handleResize, 100);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeout);
    };
  }, [containerRef]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
        isInitialized.current = false;
      }
    };
  }, []);
  
  return {
    initCanvas,
    fabricCanvas: fabricCanvasRef,
  };
}
