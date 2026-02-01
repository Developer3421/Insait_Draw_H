import { useEditorStore, useHistoryState } from '../stores/editorStore';
import { useLanguageStore } from '../stores/languageStore';
import { useCallback, useEffect } from 'react';
import { useCanvasHistory, getHistoryManager } from '../hooks/useCanvasHistory';
import { getPageBounds } from '../hooks/useArtboard';
import { saveAsINSD, loadFromINSD, downloadBlob } from '../utils/insdFile';
import './ActionsBar.css';

// Clipboard storage outside component to persist between renders
const clipboardStore = {
  data: null,
  pasteOffset: 0,
};

export function ActionsBar() {
  const { t } = useLanguageStore();
  const {
    canvas,
    clearLayers,
  } = useEditorStore();
  
  // Use new canvas history hook
  const { undo, redo, canUndo, canRedo } = useCanvasHistory();
  // Get history state from store for reactivity
  const historyState = useHistoryState();

  const handleUndo = useCallback(async () => {
    await undo();
  }, [undo]);

  const handleRedo = useCallback(async () => {
    await redo();
  }, [redo]);

  const handleClearCanvas = () => {
    if (!canvas) return;
    if (confirm(t('clearConfirm'))) {
      // Save history state before clear
      const historyManager = getHistoryManager();
      historyManager.saveState(true);
      
      // Get all objects except page elements
      const objectsToRemove = canvas.getObjects().filter(obj => !obj.data?.isPageElement);
      
      // Remove only user objects, keep page/shadow
      objectsToRemove.forEach(obj => canvas.remove(obj));
      
      canvas.discardActiveObject();
      canvas.renderAll();
      clearLayers();
    }
  };

  const handleSaveImage = () => {
    if (!canvas) return;
    
    // Get page bounds for cropping
    const pageBounds = getPageBounds();
    
    // Temporarily hide page elements for export
    const pageElements = canvas.getObjects().filter(obj => obj.data?.isPageElement);
    pageElements.forEach(obj => obj.set('visible', false));
    
    // Export only the page area
    const dataURL = canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2,
      left: pageBounds.left,
      top: pageBounds.top,
      width: pageBounds.width,
      height: pageBounds.height,
    });
    
    // Restore page elements visibility
    pageElements.forEach(obj => obj.set('visible', true));
    canvas.renderAll();
    
    const link = document.createElement('a');
    link.download = `insait-draw-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
  };

  const handleSaveJSON = async () => {
    if (!canvas) return;
    
    try {
      const { pageSettings, layers, zoom, panOffset, showGrid, snapToGrid, gridSize } = useEditorStore.getState();
      
      // Зберігаємо у форматі .insd (OPC)
      const blob = await saveAsINSD(canvas, pageSettings, layers, {
        zoom,
        panOffset,
        showGrid,
        snapToGrid,
        gridSize,
        title: `insait-draw-${Date.now()}`,
      });
      
      downloadBlob(blob, `insait-draw-${Date.now()}.insd`);
    } catch (err) {
      console.error('Error saving document:', err);
      alert(t('saveError') + (err.message || err));
    }
  };

  const handleLoadJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.insd,.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file || !canvas) return;
      
      try {
        // Перевіряємо розширення файлу
        const isInsd = file.name.toLowerCase().endsWith('.insd');
        
        if (isInsd) {
          // Завантажуємо .insd файл
          const { canvasJson, settings } = await loadFromINSD(file);
          
          await new Promise((resolve) => {
            canvas.loadFromJSON(canvasJson, () => {
              canvas.renderAll();
              resolve();
            }, (obj, error) => {
              if (error) console.warn('Object load warning:', error);
            });
          });
          
          // Застосовуємо налаштування
          if (settings) {
            const { setPageSettings, setZoom, setPanOffset, setShowGrid, setSnapToGrid, setGridSize } = useEditorStore.getState();
            
            if (settings.page) {
              setPageSettings(settings.page);
            }
            if (settings.editor) {
              if (settings.editor.zoom) setZoom(settings.editor.zoom);
              if (settings.editor.panOffset) setPanOffset(settings.editor.panOffset);
              if (typeof settings.editor.showGrid === 'boolean') setShowGrid(settings.editor.showGrid);
              if (typeof settings.editor.snapToGrid === 'boolean') setSnapToGrid(settings.editor.snapToGrid);
              if (settings.editor.gridSize) setGridSize(settings.editor.gridSize);
            }
          }
          
          // Синхронізуємо шари
          const { syncLayersFromCanvas } = useEditorStore.getState();
          syncLayersFromCanvas();
          
        } else {
          // Завантажуємо старий JSON формат для сумісності
          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              const json = JSON.parse(event.target.result);
              canvas.loadFromJSON(json, () => {
                canvas.renderAll();
                const { syncLayersFromCanvas } = useEditorStore.getState();
                syncLayersFromCanvas();
              });
            } catch (err) {
              alert(t('loadError') + err.message);
            }
          };
          reader.readAsText(file);
        }
      } catch (err) {
        console.error('Error loading document:', err);
        alert(t('loadError') + (err.message || err));
      }
    };
    input.click();
  };

  const handleDeleteSelected = useCallback(() => {
    if (!canvas) return;
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length === 0) return;
    
    // Save history state before delete
    const historyManager = getHistoryManager();
    historyManager.saveState(true);
    
    const { layers, setLayers } = useEditorStore.getState();
    const objectIds = activeObjects.map(o => o.id);
    
    activeObjects.forEach((obj) => canvas.remove(obj));
    canvas.discardActiveObject();
    canvas.renderAll();
    
    // Видалити шари
    setLayers(layers.filter(l => !objectIds.includes(l.objectId)));
  }, [canvas]);

  const handleCopySelected = useCallback(async () => {
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;
    
    try {
      // Fabric.js v7 uses async clone
      clipboardStore.data = await activeObject.clone();
      clipboardStore.pasteOffset = 0; // Reset offset on new copy
    } catch (err) {
      console.error('Error copying object:', err);
    }
  }, [canvas]);

  const handlePaste = useCallback(async () => {
    if (!canvas || !clipboardStore.data) return;
    
    try {
      // Fabric.js v7 uses async clone
      const clonedObj = await clipboardStore.data.clone();
      
      // Increment offset for multiple pastes
      clipboardStore.pasteOffset += 20;
      
      canvas.discardActiveObject();
      
      clonedObj.set({
        left: clonedObj.left + clipboardStore.pasteOffset,
        top: clonedObj.top + clipboardStore.pasteOffset,
        evented: true,
      });
      
      if (clonedObj.type === 'activeSelection' || clonedObj.type === 'activeselection') {
        // Handle multiple selected objects
        clonedObj.canvas = canvas;
        const objects = clonedObj.getObjects ? clonedObj.getObjects() : [];
        clonedObj.destroy ? clonedObj.destroy() : null;
        
        objects.forEach((obj) => {
          canvas.add(obj);
          const { addLayer } = useEditorStore.getState();
          addLayer(obj);
        });
        
        // Select all pasted objects
        if (objects.length > 0) {
          canvas.setActiveObject(canvas.getActiveSelection ? 
            canvas.getActiveSelection().add(...objects) : 
            objects[0]);
        }
      } else {
        canvas.add(clonedObj);
        const { addLayer } = useEditorStore.getState();
        addLayer(clonedObj);
        canvas.setActiveObject(clonedObj);
      }
      
      canvas.requestRenderAll();
    } catch (err) {
      console.error('Error pasting object:', err);
    }
  }, [canvas]);

  // Keyboard shortcuts for copy/paste/delete
  useEffect(() => {
    const handleKeyDown = async (e) => {
      // Ignore if focus is on input/textarea
      if (e.target.tagName.match(/INPUT|TEXTAREA/i)) return;
      
      const { canvas } = useEditorStore.getState();
      if (!canvas) return;
      
      // Ctrl+C - Copy
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        await handleCopySelected();
      }
      
      // Ctrl+V - Paste
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        await handlePaste();
      }
      
      // Ctrl+X - Cut
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        e.preventDefault();
        await handleCopySelected();
        handleDeleteSelected();
      }
      
      // Ctrl+D - Duplicate
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        await handleCopySelected();
        await handlePaste();
      }
      
      // Ctrl+Z - Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      
      // Ctrl+Shift+Z or Ctrl+Y - Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCopySelected, handlePaste, handleDeleteSelected, handleUndo, handleRedo]);

  // Use historyState from store for reactive UI updates
  const canUndoBtn = historyState?.canUndo ?? canUndo;
  const canRedoBtn = historyState?.canRedo ?? canRedo;

  return (
    <div className="actions-bar">
      <div className="actions-group">
        <span className="actions-label">{t('history')}</span>
        <div className="actions-buttons">
          <button
            className="action-btn"
            onClick={handleUndo}
            disabled={!canUndoBtn}
            title={`${t('undo')} (Ctrl+Z)`}
          >
            ↩️ {t('undo')}
          </button>
          <button
            className="action-btn"
            onClick={handleRedo}
            disabled={!canRedoBtn}
            title={`${t('redo')} (Ctrl+Y)`}
          >
            ↪️ {t('redo')}
          </button>
        </div>
      </div>

      <div className="actions-group">
        <span className="actions-label">{t('editing')}</span>
        <div className="actions-buttons">
          <button
            className="action-btn"
            onClick={handleCopySelected}
            title={`${t('copy')} (Ctrl+C)`}
          >
            📋 {t('copy')}
          </button>
          <button
            className="action-btn"
            onClick={handlePaste}
            title={`${t('paste')} (Ctrl+V)`}
          >
            📥 {t('paste')}
          </button>
          <button
            className="action-btn danger"
            onClick={handleDeleteSelected}
            title={`${t('delete')} (Delete)`}
          >
            🗑️ {t('delete')}
          </button>
        </div>
      </div>

      <div className="actions-group">
        <span className="actions-label">{t('file')}</span>
        <div className="actions-buttons">
          <button
            className="action-btn success"
            onClick={handleSaveImage}
            title={t('savePNG')}
          >
            🖼️ {t('savePNG')}
          </button>
          <button
            className="action-btn"
            onClick={handleSaveJSON}
            title={t('save')}
          >
            💾 {t('save')}
          </button>
          <button
            className="action-btn"
            onClick={handleLoadJSON}
            title={t('open')}
          >
            📂 {t('open')}
          </button>
          <button
            className="action-btn danger"
            onClick={handleClearCanvas}
            title={t('clear')}
          >
            🧹 {t('clear')}
          </button>
        </div>
      </div>
    </div>
  );
}
