import { useEditorStore, useHistoryState } from '../stores/editorStore';
import { useLanguageStore } from '../stores/languageStore';
import { useCallback, useEffect } from 'react';
import { useCanvasHistory, getHistoryManager } from '../hooks/useCanvasHistory';
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
  const { undo, redo, canUndo, canRedo, saveState } = useCanvasHistory();
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
      canvas.clear();
      canvas.backgroundColor = 'transparent';
      canvas.renderAll();
      clearLayers();
    }
  };

  const handleSaveImage = () => {
    if (!canvas) return;
    const dataURL = canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2,
    });
    const link = document.createElement('a');
    link.download = `insait-draw-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
  };

  const handleSaveJSON = () => {
    if (!canvas) return;
    const json = JSON.stringify(canvas.toJSON(['id']), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `insait-draw-${Date.now()}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file || !canvas) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target.result);
          canvas.loadFromJSON(json, () => {
            canvas.renderAll();
            // Sync layers
            const { syncLayersFromCanvas } = useEditorStore.getState();
            syncLayersFromCanvas();
          });
        } catch (err) {
          alert(t('loadError') + err.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleDeleteSelected = useCallback(() => {
    if (!canvas) return;
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length === 0) return;
    
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
      const cloned = await activeObject.clone();
      clipboardStore.data = cloned;
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
