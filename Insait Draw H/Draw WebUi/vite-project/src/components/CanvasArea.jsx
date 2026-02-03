import { useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { useFabricCanvas } from '../hooks/useFabricCanvas';
import { useArtboard, getPageBounds, zoomToPage100, zoomToFitPage } from '../hooks/useArtboard';
import { useEditorStore, TOOLS } from '../stores/editorStore';
import { getHistoryManager } from '../hooks/useCanvasHistory';
import { traceImage, TRACE_PRESETS } from '../utils/imageTracer';
import { optimizeObjectForGPU, optimizeBatchForGPU, DeferredRenderer } from '../utils/fabricGpuConfig';
import * as fabric from 'fabric';
import './CanvasArea.css';

export function CanvasArea() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const gridCanvasRef = useRef(null);
  const lastDimensionsRef = useRef({ width: 0, height: 0 });
  
  const { initCanvas } = useFabricCanvas(canvasRef, containerRef);
  const { zoomToPage } = useArtboard(); // Initialize artboard
  const gridSize = useEditorStore((state) => state.gridSize);
  const zoom = useEditorStore((state) => state.zoom);
  const pageSettings = useEditorStore((state) => state.pageSettings);
  
  // Grid drawing function - draws grid on entire workspace, page is white without grid
  const drawGrid = useCallback((forceRedraw = false) => {
    const gridCanvas = gridCanvasRef.current;
    const container = containerRef.current;
    const canvas = useEditorStore.getState().canvas;
    if (!gridCanvas || !container) return;
    
    const rect = container.getBoundingClientRect();
    const width = Math.floor(rect.width);
    const height = Math.floor(rect.height);
    
    if (width <= 0 || height <= 0) return;
    
    // Only resize canvas if dimensions changed (resizing clears the canvas)
    const dimensionsChanged = 
      lastDimensionsRef.current.width !== width || 
      lastDimensionsRef.current.height !== height;
    
    if (dimensionsChanged || forceRedraw) {
      lastDimensionsRef.current = { width, height };
      // Set both canvas attributes and CSS styles
      gridCanvas.width = width;
      gridCanvas.height = height;
      gridCanvas.style.width = `${width}px`;
      gridCanvas.style.height = `${height}px`;
    }
    
    const ctx = gridCanvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    
    // Fill with soft orange workspace background
    ctx.fillStyle = '#FFE4C4';
    ctx.fillRect(0, 0, width, height);
    
    // Get page bounds and viewport transform
    const pageBounds = getPageBounds();
    
    // Get viewport transform from canvas (for pan/zoom)
    let vpt = [1, 0, 0, 1, 0, 0];
    let currentZoom = zoom;
    if (canvas) {
      vpt = canvas.viewportTransform || vpt;
      currentZoom = canvas.getZoom() || zoom;
    }
    
    const scaledGridSize = Math.max(gridSize * currentZoom, 5); // Min 5px
    
    // Draw grid on entire workspace
    ctx.strokeStyle = 'rgba(180, 140, 100, 0.3)';
    ctx.lineWidth = 1;
    
    // Vertical lines
    for (let x = 0; x <= width; x += scaledGridSize) {
      ctx.beginPath();
      ctx.moveTo(Math.floor(x) + 0.5, 0);
      ctx.lineTo(Math.floor(x) + 0.5, height);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y <= height; y += scaledGridSize) {
      ctx.beginPath();
      ctx.moveTo(0, Math.floor(y) + 0.5);
      ctx.lineTo(width, Math.floor(y) + 0.5);
      ctx.stroke();
    }
    
    // If no page bounds, just draw the grid
    if (!pageBounds) return;
    
    // Calculate page position on screen considering viewport transform
    const pageLeft = pageBounds.left * currentZoom + vpt[4];
    const pageTop = pageBounds.top * currentZoom + vpt[5];
    const pageWidth = pageBounds.width * currentZoom;
    const pageHeight = pageBounds.height * currentZoom;
    
    // Draw shadow first (slightly offset)
    const shadowOffset = 6;
    const shadowBlur = 12;
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = shadowBlur;
    ctx.shadowOffsetX = shadowOffset;
    ctx.shadowOffsetY = shadowOffset;
    
    // Draw white page background with shadow
    ctx.fillStyle = 'white';
    ctx.fillRect(
      Math.floor(pageLeft),
      Math.floor(pageTop),
      Math.floor(pageWidth),
      Math.floor(pageHeight)
    );
    ctx.restore();
    
    // Draw page border (on top of shadow)
    ctx.strokeStyle = 'rgba(80, 80, 80, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      Math.floor(pageLeft) + 0.5,
      Math.floor(pageTop) + 0.5,
      Math.floor(pageWidth),
      Math.floor(pageHeight)
    );
  }, [gridSize, zoom, getPageBounds]);
  
  // Initialize canvas after mount
  useLayoutEffect(() => {
    const timer = setTimeout(() => {
      initCanvas();
    }, 50);
    
    return () => clearTimeout(timer);
  }, [initCanvas]);
  
  // Draw grid when gridSize or zoom changes
  useEffect(() => {
    drawGrid(true);
  }, [drawGrid]);
  
  // Handle resize with ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    let resizeTimeout;
    const resizeObserver = new ResizeObserver(() => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => drawGrid(true), 16);
    });
    
    resizeObserver.observe(container);
    
    // Initial draw with force redraw - multiple attempts
    const timer1 = setTimeout(() => drawGrid(true), 100);
    const timer2 = setTimeout(() => drawGrid(true), 300);
    const timer3 = setTimeout(() => drawGrid(true), 600);
    const timer4 = setTimeout(() => drawGrid(true), 1000);
    
    return () => {
      resizeObserver.disconnect();
      clearTimeout(resizeTimeout);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [drawGrid]);
  
  // Subscribe to store changes that might affect canvas and redraw grid
  useEffect(() => {
    const unsubscribe = useEditorStore.subscribe((state, prevState) => {
      // Redraw grid when canvas is set, zoom changes, or page settings change
      if (state.canvas !== prevState.canvas || 
          state.zoom !== prevState.zoom ||
          state.pageSettings !== prevState.pageSettings) {
        setTimeout(() => drawGrid(true), 50);
      }
    });
    
    return unsubscribe;
  }, [drawGrid]);
  
  // Subscribe to canvas events for pan redraw
  useEffect(() => {
    const canvas = useEditorStore.getState().canvas;
    if (!canvas) return;
    
    const handleViewportChange = () => {
      drawGrid(true);
    };
    
    // Listen for viewport changes (pan, zoom)
    canvas.on('mouse:move', handleViewportChange);
    canvas.on('mouse:wheel', handleViewportChange);
    
    return () => {
      canvas.off('mouse:move', handleViewportChange);
      canvas.off('mouse:wheel', handleViewportChange);
    };
  }, [drawGrid, pageSettings]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ігноруємо якщо фокус на input/textarea
      if (e.target.tagName.match(/INPUT|TEXTAREA/i)) return;
      
      const { setActiveTool, canvas, zoom, setZoom } = useEditorStore.getState();
      
      // Інструменти (тільки якщо не натиснуто Ctrl)
      if (!e.ctrlKey && !e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'v': setActiveTool(TOOLS.SELECT); break;
          case 'h': setActiveTool(TOOLS.PAN); break;
          case 'b': setActiveTool(TOOLS.BRUSH); break;
          case 'e': setActiveTool(TOOLS.ERASER); break;
          case 'l': setActiveTool(TOOLS.LINE); break;
          case 'r': setActiveTool(TOOLS.RECTANGLE); break;
          case 'c': setActiveTool(TOOLS.CIRCLE); break;
          case 't': setActiveTool(TOOLS.TEXT); break;
          case 'p': setActiveTool(TOOLS.PEN); break;
        }
      }
      
      // Escape - скасувати поточне малювання шляху
      if (e.key === 'Escape') {
        const { activeTool } = useEditorStore.getState();
        if (activeTool === TOOLS.PEN || activeTool === TOOLS.CURVATURE) {
          // Генеруємо подію для скасування шляху
          window.dispatchEvent(new CustomEvent('cancelPath'));
        }
      }
      
      // Enter - завершити поточний шлях
      if (e.key === 'Enter') {
        const { activeTool } = useEditorStore.getState();
        if (activeTool === TOOLS.PEN || activeTool === TOOLS.CURVATURE) {
          // Генеруємо подію для завершення шляху
          window.dispatchEvent(new CustomEvent('finalizePath'));
        }
      }
      
      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const { activeTool } = useEditorStore.getState();
        
        if (canvas) {
          const activeObjects = canvas.getActiveObjects();

          // If user selected path edit handles (anchor points), allow deleting them
          // regardless of the active tool (so it works without switching tools).
          const anchorHandles = activeObjects.filter(o =>
            o?.pointData && o.pointData.handleType === 'anchor'
          );

          if (anchorHandles.length > 0) {
            window.dispatchEvent(new CustomEvent('deleteAnchor', {
              detail: { handles: anchorHandles }
            }));
            return;
          }
          
          // (keep the activeTool variable for other potential tool-specific behaviors)
          void activeTool;

          if (activeObjects.length > 0) {
            // Filter out transient edit handles created by the path editor
            const objectsToDelete = activeObjects.filter(o => !(
              (o?.customData && o.customData.isEditHandle) ||
              // safety net: some helpers are only marked by excludeFromExport
              o?.excludeFromExport === true ||
              // point handles also have pointData
              !!o?.pointData
            ));

            // If user selected only handles, do nothing (don't break layers/history)
            if (objectsToDelete.length === 0) {
              return;
            }

            // Save history state before delete
            const historyManager = getHistoryManager();
            historyManager.saveState(true);
            
            const { layers, setLayers } = useEditorStore.getState();
            const objectIds = objectsToDelete.map(o => o.id);
            
            objectsToDelete.forEach(obj => canvas.remove(obj));
            canvas.discardActiveObject();
            canvas.renderAll();
            
            // Remove layers
            setLayers(layers.filter(l => !objectIds.includes(l.objectId)));
          }
        }
      }
      
      // Zoom з Ctrl
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          const newZoom = Math.min(zoom * 1.2, 10);
          setZoom(newZoom);
          if (canvas) {
            const center = canvas.getCenterPoint();
            canvas.zoomToPoint(center, newZoom);
            canvas.requestRenderAll();
          }
        }
        if (e.key === '-') {
          e.preventDefault();
          const newZoom = Math.max(zoom / 1.2, 0.1);
          setZoom(newZoom);
          if (canvas) {
            const center = canvas.getCenterPoint();
            canvas.zoomToPoint(center, newZoom);
            canvas.requestRenderAll();
          }
        }
        if (e.key === '0') {
          e.preventDefault();
          // Zoom to 100% and center on page (like CorelDRAW)
          zoomToPage100();
        }
        // Ctrl+1 - Fit page to view
        if (e.key === '1') {
          e.preventDefault();
          zoomToFitPage();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Image tracing handler
  useEffect(() => {
    const handleTraceImage = async () => {
      const canvas = useEditorStore.getState().canvas;
      if (!canvas) return;
      
      // Check if there's a selected image on canvas
      const activeObject = canvas.getActiveObject();
      
      if (activeObject && activeObject.type === 'image') {
        // Trace the selected image
        try {
          const result = await traceImage(activeObject, 'default');
          
          // Get position of original image
          const left = activeObject.left;
          const top = activeObject.top;
          
          // Save history
          const historyManager = getHistoryManager();
          historyManager.saveState(true);
          
          // Disable auto-rendering during batch add for GPU performance
          const wasRenderOnAddRemove = canvas.renderOnAddRemove;
          canvas.renderOnAddRemove = false;
          
          // Create a group of paths from traced result
          const { addLayer } = useEditorStore.getState();
          const createdPaths = [];
          
          // Use deferred rendering for large path counts
          const useDeferredRendering = result.paths.length > 50;
          let deferredRenderer = null;
          
          if (useDeferredRendering) {
            deferredRenderer = new DeferredRenderer(canvas, 20, 8);
          }
          
          result.paths.forEach((pathData, index) => {
            const createPath = () => {
              try {
                const path = new fabric.Path(pathData.d, {
                  left: left,
                  top: top,
                  fill: pathData.fill,
                  stroke: pathData.stroke !== 'none' ? pathData.stroke : null,
                  strokeWidth: pathData.strokeWidth || 0,
                  opacity: pathData.opacity,
                  selectable: true,
                  evented: true,
                  // GPU optimization settings
                  objectCaching: true,
                  noScaleCache: true,
                  statefullCache: false,
                });
                
                path.id = `traced_path_${Date.now()}_${index}`;
                path.name = 'Traced Path';
                path.customData = {
                  type: 'traced',
                  sourceType: 'image',
                };
                
                // Apply GPU optimization
                optimizeObjectForGPU(path);
                
                canvas.add(path);
                createdPaths.push(path);
                addLayer(path);
              } catch (err) {
                console.warn('Failed to create path:', err);
              }
            };
            
            if (useDeferredRendering) {
              deferredRenderer.add(createPath);
            } else {
              createPath();
            }
          });
          
          // Apply batch GPU optimization
          if (!useDeferredRendering && createdPaths.length > 10) {
            optimizeBatchForGPU(createdPaths, canvas);
          }
          
          // Restore auto-rendering and do single render
          canvas.renderOnAddRemove = wasRenderOnAddRemove;
          canvas.requestRenderAll();
          
          alert(`Image traced successfully! Created ${result.paths.length} paths.`);
          
        } catch (err) {
          console.error('Error tracing image:', err);
          alert('Failed to trace image: ' + err.message);
        }
      } else {
        // No image selected - open file picker
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          
          try {
            const result = await traceImage(file, 'default');
            
            // Save history
            const historyManager = getHistoryManager();
            historyManager.saveState(true);
            
            // Disable auto-rendering during batch add for GPU performance
            const wasRenderOnAddRemove = canvas.renderOnAddRemove;
            canvas.renderOnAddRemove = false;
            
            // Get center of canvas
            const center = canvas.getCenterPoint();
            const { addLayer } = useEditorStore.getState();
            const createdPaths = [];
            
            // Use deferred rendering for large path counts
            const useDeferredRendering = result.paths.length > 50;
            let deferredRenderer = null;
            
            if (useDeferredRendering) {
              deferredRenderer = new DeferredRenderer(canvas, 20, 8);
            }
            
            // Create paths from traced result
            result.paths.forEach((pathData, index) => {
              const createPath = () => {
                try {
                  const path = new fabric.Path(pathData.d, {
                    left: center.x - result.width / 2,
                    top: center.y - result.height / 2,
                    fill: pathData.fill,
                    stroke: pathData.stroke !== 'none' ? pathData.stroke : null,
                    strokeWidth: pathData.strokeWidth || 0,
                    opacity: pathData.opacity,
                    selectable: true,
                    evented: true,
                    // GPU optimization settings
                    objectCaching: true,
                    noScaleCache: true,
                    statefullCache: false,
                  });
                  
                  path.id = `traced_path_${Date.now()}_${index}`;
                  path.name = 'Traced Path';
                  path.customData = {
                    type: 'traced',
                    sourceType: 'file',
                  };
                  
                  // Apply GPU optimization
                  optimizeObjectForGPU(path);
                  
                  canvas.add(path);
                  createdPaths.push(path);
                  addLayer(path);
                } catch (err) {
                  console.warn('Failed to create path:', err);
                }
              };
              
              if (useDeferredRendering) {
                deferredRenderer.add(createPath);
              } else {
                createPath();
              }
            });
            
            // Apply batch GPU optimization
            if (!useDeferredRendering && createdPaths.length > 10) {
              optimizeBatchForGPU(createdPaths, canvas);
            }
            
            // Restore auto-rendering and do single render
            canvas.renderOnAddRemove = wasRenderOnAddRemove;
            canvas.requestRenderAll();
            
            alert(`Image traced successfully! Created ${result.paths.length} paths.`);
            
          } catch (err) {
            console.error('Error tracing image:', err);
            alert('Failed to trace image: ' + err.message);
          }
        };
        
        input.click();
      }
    };
    
    window.addEventListener('traceImage', handleTraceImage);
    return () => window.removeEventListener('traceImage', handleTraceImage);
  }, []);
  
  return (
    <div className="canvas-area" ref={containerRef}>
      <canvas
        ref={gridCanvasRef}
        className="grid-canvas"
      />
      <canvas ref={canvasRef} className="main-canvas" />
    </div>
  );
}
