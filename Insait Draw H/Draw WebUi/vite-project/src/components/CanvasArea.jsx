import { useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { useFabricCanvas } from '../hooks/useFabricCanvas';
import { useArtboard, getPageBounds, zoomToPage100, zoomToFitPage } from '../hooks/useArtboard';
import { useEditorStore, TOOLS } from '../stores/editorStore';
import { getHistoryManager } from '../hooks/useCanvasHistory';
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
  
  // Grid drawing function - draws grid only within the page bounds
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
    
    // Get page bounds and viewport transform
    const pageBounds = getPageBounds();
    if (!pageBounds) return;
    
    // Get viewport transform from canvas (for pan/zoom)
    let vpt = [1, 0, 0, 1, 0, 0];
    let currentZoom = zoom;
    if (canvas) {
      vpt = canvas.viewportTransform || vpt;
      currentZoom = canvas.getZoom() || zoom;
    }
    
    // Calculate page position on screen considering viewport transform
    const pageLeft = pageBounds.left * currentZoom + vpt[4];
    const pageTop = pageBounds.top * currentZoom + vpt[5];
    const pageWidth = pageBounds.width * currentZoom;
    const pageHeight = pageBounds.height * currentZoom;
    
    // Only draw grid if page is visible
    if (pageLeft > width || pageTop > height || 
        pageLeft + pageWidth < 0 || pageTop + pageHeight < 0) {
      return;
    }
    
    // Clip to page bounds
    ctx.save();
    ctx.beginPath();
    ctx.rect(
      Math.max(0, pageLeft),
      Math.max(0, pageTop),
      Math.min(pageWidth, width - pageLeft),
      Math.min(pageHeight, height - pageTop)
    );
    ctx.clip();
    
    const scaledGridSize = Math.max(gridSize * currentZoom, 5); // Min 5px
    
    // Calculate grid start positions (aligned to page, not canvas)
    const gridStartX = pageLeft;
    const gridStartY = pageTop;
    
    // Draw minor grid lines - subtle gray on white background
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.6)';
    ctx.lineWidth = 1;
    
    // Vertical lines
    for (let x = gridStartX; x <= pageLeft + pageWidth && x <= width; x += scaledGridSize) {
      if (x >= 0) {
        ctx.beginPath();
        ctx.moveTo(Math.floor(x) + 0.5, Math.max(0, pageTop));
        ctx.lineTo(Math.floor(x) + 0.5, Math.min(height, pageTop + pageHeight));
        ctx.stroke();
      }
    }
    
    // Horizontal lines
    for (let y = gridStartY; y <= pageTop + pageHeight && y <= height; y += scaledGridSize) {
      if (y >= 0) {
        ctx.beginPath();
        ctx.moveTo(Math.max(0, pageLeft), Math.floor(y) + 0.5);
        ctx.lineTo(Math.min(width, pageLeft + pageWidth), Math.floor(y) + 0.5);
        ctx.stroke();
      }
    }
    
    // Draw major grid lines (every 5 cells) - darker
    ctx.strokeStyle = 'rgba(150, 150, 150, 0.7)';
    ctx.lineWidth = 1;
    
    for (let x = gridStartX; x <= pageLeft + pageWidth && x <= width; x += scaledGridSize * 5) {
      if (x >= 0) {
        ctx.beginPath();
        ctx.moveTo(Math.floor(x) + 0.5, Math.max(0, pageTop));
        ctx.lineTo(Math.floor(x) + 0.5, Math.min(height, pageTop + pageHeight));
        ctx.stroke();
      }
    }
    
    for (let y = gridStartY; y <= pageTop + pageHeight && y <= height; y += scaledGridSize * 5) {
      if (y >= 0) {
        ctx.beginPath();
        ctx.moveTo(Math.max(0, pageLeft), Math.floor(y) + 0.5);
        ctx.lineTo(Math.min(width, pageLeft + pageWidth), Math.floor(y) + 0.5);
        ctx.stroke();
      }
    }
    
    ctx.restore();
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
        }
      }
      
      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (canvas) {
          const activeObjects = canvas.getActiveObjects();
          if (activeObjects.length > 0) {
            // Save history state before delete
            const historyManager = getHistoryManager();
            historyManager.saveState(true);
            
            const { layers, setLayers } = useEditorStore.getState();
            const objectIds = activeObjects.map(o => o.id);
            
            activeObjects.forEach(obj => canvas.remove(obj));
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
