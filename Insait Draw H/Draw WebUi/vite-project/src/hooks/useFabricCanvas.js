import { useCallback, useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import { useEditorStore, TOOLS } from '../stores/editorStore';
import { useLanguageStore } from '../stores/languageStore';
import { 
  parsePathPoints, 
  createPathEditHandles, 
  updatePathPoint, 
  createSmoothPath,
  createBezierPath,
  HANDLE_COLORS,
  HANDLE_SIZES 
} from '../utils/pathEditor';

const { Canvas, Rect, Circle, Triangle, Line, IText, PencilBrush, Path, Point, util } = fabric;

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
  const draggedControlHandle = useRef(null);
  const lastAnchorIndex = useRef(-1);
  
  // Path editing refs (for DIRECT_SELECT and ANCHOR_POINT tools)
  const editingPath = useRef(null);
  const editingPathHandles = useRef([]);
  const selectedAnchorIndex = useRef(null);
  const isDraggingAnchor = useRef(false);
  
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
    
    const points = pathPoints.current;
    
    if (points.length === 1) {
      // Одна точка - показуємо маленьке коло (anchor point style)
      const p = points[0];
      const handle = new Circle({
        left: p.x,
        top: p.y,
        radius: HANDLE_SIZES.anchorRadius || 5,
        fill: HANDLE_COLORS.anchor || '#1E90FF',
        stroke: '#ffffff',
        strokeWidth: 2,
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'center',
      });
      canvas.add(handle);
      controlHandles.current.push(handle);
      canvas.renderAll();
      return;
    }
    
    // Генеруємо SVG шлях
    let pathData = '';
    
    if (smooth && points.length > 2) {
      // Use Catmull-Rom to Bezier conversion for smooth curves
      pathData = createSmoothPath(points, false);
    } else if (points.some(p => p.controlOut || p.controlIn)) {
      // If points have control handles, use them for cubic bezier
      pathData = createBezierPath(points);
    } else {
      // Default: straight lines
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
      
      // Додаємо контрольні точки та лінії для кожної вершини
      points.forEach((p, i) => {
        const isLast = i === points.length - 1;
        const isFirst = i === 0;
        
        // Anchor point
        const anchorHandle = new Circle({
          left: p.x,
          top: p.y,
          radius: HANDLE_SIZES.anchorRadius || 5,
          fill: isLast ? (HANDLE_COLORS.anchorSelected || '#FF4500') : (HANDLE_COLORS.anchor || '#1E90FF'),
          stroke: '#ffffff',
          strokeWidth: 2,
          selectable: false,
          evented: false,
          originX: 'center',
          originY: 'center',
        });
        canvas.add(anchorHandle);
        controlHandles.current.push(anchorHandle);
        
        // Draw control handles if they exist
        if (p.controlOut) {
          // Control line
          const controlLine = new Line(
            [p.x, p.y, p.controlOut.x, p.controlOut.y],
            {
              stroke: HANDLE_COLORS.controlLine || 'rgba(138, 43, 226, 0.5)',
              strokeWidth: 1,
              strokeDashArray: [4, 4],
              selectable: false,
              evented: false,
            }
          );
          canvas.add(controlLine);
          controlHandles.current.push(controlLine);
          
          // Control point
          const controlHandle = new Circle({
            left: p.controlOut.x,
            top: p.controlOut.y,
            radius: HANDLE_SIZES.controlRadius || 4,
            fill: HANDLE_COLORS.controlPoint || '#8A2BE2',
            stroke: '#ffffff',
            strokeWidth: 1.5,
            selectable: false,
            evented: false,
            originX: 'center',
            originY: 'center',
          });
          canvas.add(controlHandle);
          controlHandles.current.push(controlHandle);
        }
        
        if (p.controlIn && !isFirst) {
          // Control line
          const controlLine = new Line(
            [p.x, p.y, p.controlIn.x, p.controlIn.y],
            {
              stroke: HANDLE_COLORS.controlLine || 'rgba(138, 43, 226, 0.5)',
              strokeWidth: 1,
              strokeDashArray: [4, 4],
              selectable: false,
              evented: false,
            }
          );
          canvas.add(controlLine);
          controlHandles.current.push(controlLine);
          
          // Control point
          const controlHandle = new Circle({
            left: p.controlIn.x,
            top: p.controlIn.y,
            radius: HANDLE_SIZES.controlRadius || 4,
            fill: HANDLE_COLORS.controlPoint || '#8A2BE2',
            stroke: '#ffffff',
            strokeWidth: 1.5,
            selectable: false,
            evented: false,
            originX: 'center',
            originY: 'center',
          });
          canvas.add(controlHandle);
          controlHandles.current.push(controlHandle);
        }
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
      draggedControlHandle.current = null;
      lastAnchorIndex.current = -1;
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
    
    const points = pathPoints.current;
    
    // Check if we have control handles (bezier curves)
    const hasBezierHandles = points.some(p => p.controlOut || p.controlIn);
    const isSmooth = points.some(p => p.type === 'smooth');
    
    // Create path data
    let pathData = `M ${points[0].x} ${points[0].y}`;
    
    if (hasBezierHandles) {
      // Create cubic bezier path using control handles
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        
        // Get control points
        const cp1 = prev.controlOut || { x: prev.x, y: prev.y };
        const cp2 = curr.controlIn || { x: curr.x, y: curr.y };
        
        // Create cubic bezier curve
        pathData += ` C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${curr.x} ${curr.y}`;
      }
    } else if (isSmooth && points.length > 2) {
      // Create smooth path using Catmull-Rom spline conversion
      pathData = createSmoothPath(points, false);
    } else {
      // Create straight line segments
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
      finalPath.name = hasBezierHandles ? 'Bezier Curve' : (isSmooth ? 'Smooth Curve' : 'Path');
      
      // Зберігаємо оригінальні точки для можливості редагування
      finalPath.customData = {
        type: 'bezierPath',
        originalPoints: [...points],
        hasBezierHandles,
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
    draggedControlHandle.current = null;
    lastAnchorIndex.current = -1;
  }, []);

  // Функція для входу в режим редагування шляху
  const enterPathEditMode = useCallback((canvas, pathObject) => {
    if (!canvas || !pathObject) return;
    
    // Якщо вже редагуємо інший шлях - вийти
    if (editingPath.current && editingPath.current !== pathObject) {
      exitPathEditMode(canvas);
    }
    
    editingPath.current = pathObject;
    
    // Use professional path editor from utility
    const { handles, controlLines, cleanup } = createPathEditHandles(canvas, pathObject);
    
    // Store all handles for later cleanup
    editingPathHandles.current = [...handles, ...(controlLines || [])];
    editingPath.current._cleanupEditMode = cleanup;
    
    // Setup handle events for interactive editing
    handles.forEach(handle => {
      // Hover effects
      handle.on('mouseover', () => {
        if (handle.pointData && handle.pointData.handleType === 'anchor') {
          handle.set({ fill: HANDLE_COLORS.hoverAnchor || '#FFD700' });
        }
        canvas.renderAll();
      });
      
      handle.on('mouseout', () => {
        if (handle.pointData && handle.pointData.handleType === 'anchor') {
          const isSelected = selectedAnchorIndex.current === handle.pointData.index;
          handle.set({ 
            fill: isSelected ? (HANDLE_COLORS.anchorSelected || '#FF4500') : (HANDLE_COLORS.anchor || '#1E90FF')
          });
        }
        canvas.renderAll();
      });
      
      // Update path when handle is moved
      handle.on('moving', () => {
        if (handle.pointData) {
          updatePathPoint(handle, canvas);
        }
      });
      
      // Save history when move is complete
      handle.on('moved', () => {
        if (handle.pointData) {
          updatePathPoint(handle, canvas);
        }
      });
    });
    
    canvas.renderAll();
  }, []);

  // Функція для виходу з режиму редагування шляху  
  const exitPathEditMode = useCallback((canvas) => {
    if (!canvas) return;
    
    // Use cleanup function from path editor if available
    if (editingPath.current && editingPath.current._cleanupEditMode) {
      editingPath.current._cleanupEditMode();
      editingPath.current._cleanupEditMode = null;
    } else {
      // Fallback: manually remove handles
      editingPathHandles.current.forEach(h => canvas.remove(h));
    }
    
    editingPathHandles.current = [];
    editingPath.current = null;
    selectedAnchorIndex.current = null;
    isDraggingAnchor.current = false;
    
    canvas.renderAll();
  }, []);

  // Функція для оновлення позиції anchor точки
  const updateAnchorPosition = useCallback((handle, canvas) => {
    if (!handle || !handle.anchorData || !canvas) return;
    
    const { pathObject, cmdIndex, type } = handle.anchorData;
    if (!pathObject || !pathObject.path) return;
    
    // Отримуємо інверсну матрицю для перетворення з canvas в path координати
    const matrix = pathObject.calcTransformMatrix();
    const invMatrix = util.invertTransform(matrix);
    
    // Перетворюємо позицію handle назад у path координати
    const localPoint = new Point(handle.left, handle.top).transform(invMatrix);
    
    // Оновлюємо координати в path data
    const cmd = pathObject.path[cmdIndex];
    if (!cmd) return;
    
    if (type === 'M' || type === 'L') {
      cmd[1] = localPoint.x;
      cmd[2] = localPoint.y;
    } else if (type === 'Q') {
      cmd[3] = localPoint.x;
      cmd[4] = localPoint.y;
    } else if (type === 'C') {
      cmd[5] = localPoint.x;
      cmd[6] = localPoint.y;
    }
    
    // Оновлюємо path - use setCoords() instead of deprecated _setPositionDimensions
    pathObject.set({ dirty: true });
    pathObject.setCoords();
    canvas.renderAll();
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
      
      // PEN tool - Bezier curves (with drag support for control handles)
      if (activeTool === TOOLS.PEN) {
        const { strokeColor, strokeWidth } = useEditorStore.getState();
        const pointer = getPointerPosition(opt, canvas);
        const x = snapValue(pointer.x);
        const y = snapValue(pointer.y);
        
        // Add new anchor point
        const newPoint = { 
          x, 
          y, 
          type: 'point',
          controlIn: null,  // Incoming control handle
          controlOut: null  // Outgoing control handle  
        };
        
        pathPoints.current.push(newPoint);
        lastAnchorIndex.current = pathPoints.current.length - 1;
        
        // Mark that we're starting to drag (for creating control handles)
        draggedControlHandle.current = {
          anchorIndex: lastAnchorIndex.current,
          startX: x,
          startY: y
        };
        
        // Update path preview
        updatePathPreview(canvas, strokeColor, strokeWidth);
        
        // Mark that we're drawing a path
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
      
      // DIRECT_SELECT tool - select and edit path anchor points
      if (activeTool === TOOLS.DIRECT_SELECT) {
        const target = opt.target;
        
        // Перевіряємо чи клікнули на anchor handle
        if (target && target.anchorData) {
          // Клікнули на anchor точку - виділяємо її
          selectedAnchorIndex.current = target.anchorData.pointIndex;
          isDraggingAnchor.current = true;
          target.set({ fill: '#ff6b00' }); // Виділений колір
          canvas.renderAll();
          return;
        }
        
        // Перевіряємо чи клікнули на path
        if (target && target.type === 'path') {
          // Вхід в режим редагування шляху
          enterPathEditMode(canvas, target);
          return;
        }
        
        // Клікнули на порожнє місце - вихід з режиму редагування
        if (editingPath.current) {
          exitPathEditMode(canvas);
        }
        return;
      }
      
      // ANCHOR_POINT tool - add/remove anchor points
      if (activeTool === TOOLS.ANCHOR_POINT) {
        const target = opt.target;
        
        // Клікнули на anchor - видаляємо його (TODO: реалізувати видалення точки)
        if (target && target.anchorData) {
          // Поки що просто виділяємо
          selectedAnchorIndex.current = target.anchorData.pointIndex;
          target.set({ fill: '#ff0000' });
          canvas.renderAll();
          return;
        }
        
        // Клікнули на path - додаємо нову точку (TODO: реалізувати додавання точки)
        if (target && target.type === 'path') {
          enterPathEditMode(canvas, target);
        }
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
      
      // PEN tool - drag to create bezier control handles
      if (activeTool === TOOLS.PEN && draggedControlHandle.current && isDrawingPath.current) {
        const pointer = getPointerPosition(opt, canvas);
        const x = snapValue(pointer.x);
        const y = snapValue(pointer.y);
        const anchorIndex = draggedControlHandle.current.anchorIndex;
        const anchor = pathPoints.current[anchorIndex];
        
        if (anchor) {
          // Calculate distance from anchor
          const dx = x - anchor.x;
          const dy = y - anchor.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Only create handles if dragged at least a minimum distance
          if (distance > 5) {
            // Set outgoing control handle (in direction of drag)
            anchor.controlOut = { x, y };
            
            // Set incoming control handle (mirrored/opposite direction)
            anchor.controlIn = { 
              x: anchor.x - dx, 
              y: anchor.y - dy 
            };
            
            // Update preview
            updatePathPreview(canvas, strokeColor, strokeWidth);
          }
        }
        return;
      }
      
      // DIRECT_SELECT - оновлення позиції anchor при перетягуванні
      if (activeTool === TOOLS.DIRECT_SELECT && isDraggingAnchor.current && opt.target && opt.target.anchorData) {
        updateAnchorPosition(opt.target, canvas);
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
    canvas.on('mouse:up', (opt) => {
      const { activeTool, addLayer } = useEditorStore.getState();
      
      if (isPanning.current) {
        isPanning.current = false;
        canvas.selection = activeTool === TOOLS.SELECT;
        canvas.setCursor(activeTool === TOOLS.PAN ? 'grab' : 'default');
        return;
      }
      
      // PEN tool - stop dragging control handle
      if (activeTool === TOOLS.PEN && draggedControlHandle.current) {
        draggedControlHandle.current = null;
        return;
      }
      
      // DIRECT_SELECT - завершення перетягування anchor
      if (activeTool === TOOLS.DIRECT_SELECT && isDraggingAnchor.current) {
        isDraggingAnchor.current = false;
        // Скидаємо колір handle
        if (opt.target && opt.target.anchorData) {
          opt.target.set({ fill: '#4a90d9' });
          canvas.renderAll();
        }
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
        canvas.freeDrawingBrush.color = '#ffffff';
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
      draggedControlHandle.current = null;
      lastAnchorIndex.current = -1;
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
