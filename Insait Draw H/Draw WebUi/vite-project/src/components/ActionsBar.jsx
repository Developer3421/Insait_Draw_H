import { useEditorStore, useHistoryState } from '../stores/editorStore';
import { useLanguageStore } from '../stores/languageStore';
import { useCallback, useEffect } from 'react';
import { useCanvasHistory, getHistoryManager } from '../hooks/useCanvasHistory';
import { getPageBounds } from '../hooks/useArtboard';
import { saveAsINSD, loadFromINSD } from '../utils/insdFile';
import { optimizeBatchForGPU } from '../utils/fabricGpuConfig';
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

  const handleSaveJSON = useCallback(async () => {
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
      
      // Конвертуємо blob в base64 для передачі через API
      const arrayBuffer = await blob.arrayBuffer();
      const base64Content = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      // Спробуємо використати нативний діалог збереження (Avalonia)
      // Це також реєструє асоціацію файлів при першому збереженні
      try {
        const response = await fetch('/api/save-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: `insait-draw-${Date.now()}`,
            extension: 'insd',
            content: base64Content,
          }),
        });
        
        const result = await response.json();
        
        if (result.success) {
          console.log('File saved via native dialog:', result.path);
          return; // Успішно збережено через нативний діалог
        } else if (result.cancelled) {
          console.log('Save cancelled by user');
          return; // Користувач скасував
        }
        // Якщо помилка - fallback до браузерного завантаження
      } catch (apiError) {
        console.warn('Native save dialog not available, using browser download:', apiError);
      }
      
      // Fallback: завантажуємо через браузер
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `insait-draw-${Date.now()}.insd`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('Error saving document:', err);
      alert(t('saveError') + (err.message || err));
    }
  }, [canvas, t]);

  const handleLoadJSON = async () => {
    if (!canvas) return;
    
    // Створюємо прихований file input для вибору файлів через браузерний діалог
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.insd,.json';
    input.style.display = 'none';
    
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      try {
        const fileName = file.name;
        const isInsd = fileName.toLowerCase().endsWith('.insd');
        
        if (isInsd) {
          // Завантажуємо .insd файл
          const { canvasJson, settings } = await loadFromINSD(file);
          
          // Disable auto-rendering during load for GPU optimization
          const wasRenderOnAddRemove = canvas.renderOnAddRemove;
          canvas.renderOnAddRemove = false;
          
          await new Promise((resolve) => {
            canvas.loadFromJSON(canvasJson, () => {
              // Apply GPU optimization to loaded objects
              const loadedObjects = canvas.getObjects().filter(obj => !obj.data?.isPageElement);
              if (loadedObjects.length > 10) {
                optimizeBatchForGPU(loadedObjects, canvas);
              }
              resolve();
            }, (obj, error) => {
              if (error) console.warn('Object load warning:', error);
            });
          });
          
          // Restore rendering and render
          canvas.renderOnAddRemove = wasRenderOnAddRemove;
          canvas.requestRenderAll();
          
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
          const text = await file.text();
          const json = JSON.parse(text);
          
          // Disable auto-rendering during load for GPU optimization
          const wasRenderOnAddRemove = canvas.renderOnAddRemove;
          canvas.renderOnAddRemove = false;
          
          canvas.loadFromJSON(json, () => {
            // Apply GPU optimization to loaded objects
            const loadedObjects = canvas.getObjects().filter(obj => !obj.data?.isPageElement);
            if (loadedObjects.length > 10) {
              optimizeBatchForGPU(loadedObjects, canvas);
            }
            
            // Restore rendering and render
            canvas.renderOnAddRemove = wasRenderOnAddRemove;
            canvas.requestRenderAll();
            
            const { syncLayersFromCanvas } = useEditorStore.getState();
            syncLayersFromCanvas();
          });
        }
      } catch (err) {
        console.error('Error loading document:', err);
        alert(t('loadError') + (err.message || err));
      }
      
      // Очищаємо input
      document.body.removeChild(input);
    };
    
    document.body.appendChild(input);
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
      
      // Ctrl+S - Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveJSON();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCopySelected, handlePaste, handleDeleteSelected, handleUndo, handleRedo, handleSaveJSON]);

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
