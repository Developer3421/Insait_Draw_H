import { useCallback, useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import { useEditorStore, TOOLS } from '../stores/editorStore';
import { useLanguageStore } from '../stores/languageStore';

const { Canvas, Rect, Circle, Triangle, Line, IText, PencilBrush, Path } = fabric;

export function useFabricCanvas(canvasRef, containerRef) {
  const fabricCanvasRef = useRef(null);
  const isPanning = useRef(false);
  const lastPosX = useRef(0);
  const lastPosY = useRef(0);
  const isDrawingShape = useRef(false);
  const shapeStartPoint = useRef(null);
  const currentShape = useRef(null);
  const isInitialized = useRef(false);
  
  // Bezier/Path tool refs
  const isDrawingPath = useRef(false);
  const pathPoints = useRef([]);
  const currentPath = useRef(null);
  const controlHandles = useRef([]);
  
  // Допоміжна функція для оновлення попереднього перегляду шляху
  const updatePathPreview = useCallback((canvas, strokeColor, strokeWidth, smooth = false) => {
    if (!canvas || pathPoints.current.length === 0) return;
    
    // Видаляємо попередній шлях
    if (currentPath.current) {
      canvas.remove(currentPath.current);
    }
    
    // Видаляємо контрольні точки
    controlHandles.current.forEach(handle => canvas.remove(handle));
    controlHandles.current = [];
    
    // Генеруємо SVG шлях
    let pathData = '';
    const points = pathPoints.current;
    
    if (points.length === 1) {
      // Одна точка - показуємо маленьке коло
      const p = points[0];
      const handle = new Circle({
        left: p.x - 5,
        top: p.y - 5,
        radius: 5,
        fill: '#4a90d9',
        stroke: '#ffffff',
        strokeWidth: 2,
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'center',
      });
      handle.set({ left: p.x, top: p.y });
      canvas.add(handle);
      controlHandles.current.push(handle);
      canvas.renderAll();
      return;
    }
    
    if (smooth) {
      // Плавна крива (curvature tool)
      pathData = `M ${points[0].x} ${points[0].y}`;
      
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        
        if (i === 1) {
          pathData += ` L ${curr.x} ${curr.y}`;
        } else {
          // Використовуємо квадратичну криву з попередньою точкою як контрольною
          const cpX = prev.x;
          const cpY = prev.y;
          pathData += ` Q ${cpX} ${cpY} ${curr.x} ${curr.y}`;
        }
      }
    } else {
      // Прямі лінії (pen tool - базова версія)
      pathData = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        pathData += ` L ${points[i].x} ${points[i].y}`;
      }
    }
    
    try {
      const path = new Path(pathData, {
        fill: 'transparent',
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        selectable: false,
        evented: false,
      });
      
      canvas.add(path);
      currentPath.current = path;
      
      // Додаємо контрольні точки для кожної вершини
      points.forEach((p, i) => {
        const isLast = i === points.length - 1;
        const handle = new Circle({
          left: p.x,
          top: p.y,
          radius: 5,
          fill: isLast ? '#ff6b00' : '#4a90d9',
          stroke: '#ffffff',
          strokeWidth: 2,
          selectable: false,
          evented: false,
          originX: 'center',
          originY: 'center',
        });
        canvas.add(handle);
        controlHandles.current.push(handle);
      });
      
      canvas.renderAll();
    } catch (e) {
      console.warn('Error creating path:', e);
    }
  }, []);
  
  // Функція для завершення шляху
  const finalizePath = useCallback((canvas) => {
    if (!canvas || pathPoints.current.length < 2) {
      // Недостатньо точок - очищаємо
      if (currentPath.current) {
        canvas?.remove(currentPath.current);
        currentPath.current = null;
      }
      controlHandles.current.forEach(handle => canvas?.remove(handle));
      controlHandles.current = [];
      pathPoints.current = [];
      isDrawingPath.current = false;
      canvas?.renderAll();
      return;
    }
    
    const { strokeColor, strokeWidth, fillColor, addLayer } = useEditorStore.getState();
    
    // Видаляємо попередній preview
    if (currentPath.current) {
      canvas.remove(currentPath.current);
    }
    controlHandles.current.forEach(handle => canvas.remove(handle));
    controlHandles.current = [];
    
    // Створюємо фінальний шлях
    let pathData = `M ${pathPoints.current[0].x} ${pathPoints.current[0].y}`;
    const points = pathPoints.current;
    
    const isSmooth = points.some(p => p.type === 'smooth');
    
    if (isSmooth && points.length > 2) {
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        
        if (i === 1) {
          pathData += ` L ${curr.x} ${curr.y}`;
        } else {
          const cpX = prev.x;
          const cpY = prev.y;
          pathData += ` Q ${cpX} ${cpY} ${curr.x} ${curr.y}`;
        }
      }
    } else {
      for (let i = 1; i < points.length; i++) {
        pathData += ` L ${points[i].x} ${points[i].y}`;
      }
    }
    
    try {
      const finalPath = new Path(pathData, {
        fill: fillColor === 'transparent' ? 'transparent' : fillColor,
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
        lockUniScaling: false,
      });
      
      // Генеруємо унікальний ID
      finalPath.id = `path_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Встановлюємо властивості для розпізнавання в LayersPanel
      finalPath.type = 'path';
      finalPath.name = isSmooth ? 'Curve' : 'Path';
      
      // Зберігаємо оригінальні точки для можливості редагування
      finalPath.customData = {
        type: 'bezierPath',
        originalPoints: [...points],
      };
      
      canvas.add(finalPath);
      addLayer(finalPath);
      canvas.setActiveObject(finalPath);
      canvas.renderAll();
    } catch (e) {
      console.warn('Error finalizing path:', e);
    }
    
    // Очищаємо стан
    pathPoints.current = [];
    currentPath.current = null;
    isDrawingPath.current = false;
  }, []);

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
      
      // PEN tool - Bezier curves
      if (activeTool === TOOLS.PEN) {
        const { strokeColor, strokeWidth } = useEditorStore.getState();
        const pointer = getPointerPosition(opt, canvas);
        const x = snapValue(pointer.x);
        const y = snapValue(pointer.y);
        
        // Додаємо нову точку
        pathPoints.current.push({ x, y, type: 'point' });
        
        // Створюємо або оновлюємо шлях
        updatePathPreview(canvas, strokeColor, strokeWidth);
        
        // Відмічаємо що малюємо шлях
        isDrawingPath.current = true;
        
        return;
      }
      
      // CURVATURE tool - Auto-smooth curves
      if (activeTool === TOOLS.CURVATURE) {
        const { strokeColor, strokeWidth } = useEditorStore.getState();
        const pointer = getPointerPosition(opt, canvas);
        const x = snapValue(pointer.x);
        const y = snapValue(pointer.y);
        
        // Додаємо точку з плавним переходом
        pathPoints.current.push({ x, y, type: 'smooth' });
        
        // Оновлюємо попередній перегляд
        updatePathPreview(canvas, strokeColor, strokeWidth, true);
        
        isDrawingPath.current = true;
        return;
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
    
    // Double click for text or to finish path
    canvas.on('mouse:dblclick', (opt) => {
      const { activeTool, fontFamily, fontSize, fillColor, snapToGrid, gridSize, addLayer } = useEditorStore.getState();
      const { t } = useLanguageStore.getState();
      
      // Завершуємо шлях при подвійному кліку для PEN/CURVATURE
      if ((activeTool === TOOLS.PEN || activeTool === TOOLS.CURVATURE) && isDrawingPath.current) {
        finalizePath(canvas);
        return;
      }
      
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
        } else if ([TOOLS.PEN, TOOLS.CURVATURE].includes(state.activeTool)) {
          canvas.defaultCursor = 'crosshair';
          canvas.hoverCursor = 'crosshair';
          canvas.selection = false;
        } else if (state.activeTool === TOOLS.ANCHOR_POINT) {
          canvas.defaultCursor = 'crosshair';
          canvas.hoverCursor = 'pointer';
          canvas.selection = false;
        } else if (state.activeTool === TOOLS.DIRECT_SELECT) {
          canvas.defaultCursor = 'default';
          canvas.hoverCursor = 'pointer';
          canvas.selection = true;
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
  
  // Обробка подій клавіатури для шляхів (Escape/Enter)
  useEffect(() => {
    const handleCancelPath = () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      
      // Очищаємо шлях без збереження
      if (currentPath.current) {
        canvas.remove(currentPath.current);
        currentPath.current = null;
      }
      controlHandles.current.forEach(handle => canvas.remove(handle));
      controlHandles.current = [];
      pathPoints.current = [];
      isDrawingPath.current = false;
      canvas.renderAll();
    };
    
    const handleFinalizePath = () => {
      const canvas = fabricCanvasRef.current;
      if (canvas && isDrawingPath.current) {
        finalizePath(canvas);
      }
    };
    
    window.addEventListener('cancelPath', handleCancelPath);
    window.addEventListener('finalizePath', handleFinalizePath);
    
    return () => {
      window.removeEventListener('cancelPath', handleCancelPath);
      window.removeEventListener('finalizePath', handleFinalizePath);
    };
  }, [finalizePath]);
  
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
