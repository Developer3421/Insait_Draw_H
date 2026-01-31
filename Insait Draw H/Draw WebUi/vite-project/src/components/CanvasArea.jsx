import { useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { useFabricCanvas } from '../hooks/useFabricCanvas';
import { useEditorStore, TOOLS } from '../stores/editorStore';
import './CanvasArea.css';

export function CanvasArea() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const gridCanvasRef = useRef(null);
  const lastDimensionsRef = useRef({ width: 0, height: 0 });
  
  const { initCanvas } = useFabricCanvas(canvasRef, containerRef);
  const gridSize = useEditorStore((state) => state.gridSize);
  const zoom = useEditorStore((state) => state.zoom);
  
  // Grid drawing function
  const drawGrid = useCallback((forceRedraw = false) => {
    const gridCanvas = gridCanvasRef.current;
    const container = containerRef.current;
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
    
    const scaledGridSize = Math.max(gridSize * zoom, 5); // Min 5px
    
    // Draw minor grid lines - dark color for light background
    ctx.strokeStyle = 'rgba(180, 160, 130, 0.35)';
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
    
    // Draw major grid lines (every 5 cells) - darker
    ctx.strokeStyle = 'rgba(150, 130, 100, 0.55)';
    ctx.lineWidth = 1;
    
    for (let x = 0; x <= width; x += scaledGridSize * 5) {
      ctx.beginPath();
      ctx.moveTo(Math.floor(x) + 0.5, 0);
      ctx.lineTo(Math.floor(x) + 0.5, height);
      ctx.stroke();
    }
    
    for (let y = 0; y <= height; y += scaledGridSize * 5) {
      ctx.beginPath();
      ctx.moveTo(0, Math.floor(y) + 0.5);
      ctx.lineTo(width, Math.floor(y) + 0.5);
      ctx.stroke();
    }
  }, [gridSize, zoom]);
  
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
      // Redraw grid when canvas is set or zoom changes
      if (state.canvas !== prevState.canvas || state.zoom !== prevState.zoom) {
        setTimeout(() => drawGrid(true), 50);
      }
    });
    
    return unsubscribe;
  }, [drawGrid]);
  
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
          activeObjects.forEach(obj => canvas.remove(obj));
          canvas.discardActiveObject();
          canvas.renderAll();
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
          setZoom(1);
          if (canvas) {
            canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
            canvas.requestRenderAll();
          }
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
