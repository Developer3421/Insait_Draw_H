/**
 * Canvas History Manager
 * Manages undo/redo history for Fabric.js canvas with proper state snapshots
 */

import { useCallback, useRef, useEffect } from 'react';
import { useEditorStore } from '../stores/editorStore';

// History configuration
const MAX_HISTORY_SIZE = 50;
const DEBOUNCE_DELAY = 300;

// Global history storage (persists between component renders)
const historyState = {
  past: [],
  future: [],
  isPerformingUndoRedo: false,
  lastSavedState: null,
  initialized: false,
};

/**
 * Serializes canvas state for history storage
 * @param {fabric.Canvas} canvas 
 * @returns {string} JSON string of canvas state
 */
function serializeCanvas(canvas) {
  if (!canvas) return null;
  
  try {
    // toJSON with custom properties to preserve
    const json = canvas.toJSON([
      'id', 
      'selectable', 
      'evented', 
      'name',
      'data', // custom data
    ]);
    return JSON.stringify(json);
  } catch (err) {
    console.error('Error serializing canvas:', err);
    return null;
  }
}

/**
 * Deserializes and loads canvas state from history
 * @param {fabric.Canvas} canvas 
 * @param {string} stateJson 
 * @returns {Promise<void>}
 */
async function deserializeCanvas(canvas, stateJson) {
  if (!canvas || !stateJson) return;
  
  try {
    const state = JSON.parse(stateJson);
    
    // Clear current objects
    canvas.clear();
    
    // Load from JSON - fabric.js v7 uses async loadFromJSON
    await canvas.loadFromJSON(state);
    
    // Ensure all objects are selectable and evented
    canvas.getObjects().forEach(obj => {
      if (obj.selectable === undefined) obj.selectable = true;
      if (obj.evented === undefined) obj.evented = true;
    });
    
    canvas.renderAll();
    
    // Sync layers with store
    syncLayersWithCanvas(canvas);
  } catch (err) {
    console.error('Error deserializing canvas:', err);
  }
}

/**
 * Syncs the store layers with canvas objects after undo/redo
 * @param {fabric.Canvas} canvas 
 */
function syncLayersWithCanvas(canvas) {
  if (!canvas) return;
  
  const { setLayers } = useEditorStore.getState();
  const objects = canvas.getObjects();
  
  const newLayers = objects.map((obj, index) => {
    // Generate id if not present
    if (!obj.id) {
      obj.id = `obj_${Date.now()}_${index}`;
    }
    
    return {
      id: `layer_${obj.id}`,
      objectId: obj.id,
      name: obj.name || obj.type || 'Object',
      visible: obj.visible !== false,
      locked: obj.selectable === false,
      object: obj,
    };
  });
  
  setLayers(newLayers);
}

/**
 * Hook for managing canvas history (undo/redo)
 */
export function useCanvasHistory() {
  const debounceTimerRef = useRef(null);
  const canvas = useEditorStore(state => state.canvas);
  
  /**
   * Saves current canvas state to history
   */
  const saveState = useCallback((immediate = false) => {
    if (historyState.isPerformingUndoRedo) return;
    
    const canvas = useEditorStore.getState().canvas;
    if (!canvas) return;
    
    const doSave = () => {
      const currentState = serializeCanvas(canvas);
      if (!currentState) return;
      
      // Don't save duplicate states
      if (currentState === historyState.lastSavedState) return;
      
      // Clear future states when new action is performed
      historyState.future = [];
      
      // Add current state to past
      if (historyState.lastSavedState) {
        historyState.past.push(historyState.lastSavedState);
        
        // Limit history size
        if (historyState.past.length > MAX_HISTORY_SIZE) {
          historyState.past.shift();
        }
      }
      
      historyState.lastSavedState = currentState;
      
      // Notify store about history change (for UI update)
      updateHistoryState();
    };
    
    if (immediate) {
      clearTimeout(debounceTimerRef.current);
      doSave();
    } else {
      // Debounce saves to avoid too many history entries
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(doSave, DEBOUNCE_DELAY);
    }
  }, []);
  
  /**
   * Performs undo operation
   */
  const undo = useCallback(async () => {
    if (historyState.past.length === 0) return;
    if (historyState.isPerformingUndoRedo) return;
    
    const canvas = useEditorStore.getState().canvas;
    if (!canvas) return;
    
    historyState.isPerformingUndoRedo = true;
    
    try {
      // Save current state to future
      const currentState = serializeCanvas(canvas);
      if (currentState) {
        historyState.future.push(currentState);
        
        // Limit future size
        if (historyState.future.length > MAX_HISTORY_SIZE) {
          historyState.future.shift();
        }
      }
      
      // Get previous state
      const previousState = historyState.past.pop();
      historyState.lastSavedState = previousState;
      
      // Restore previous state
      await deserializeCanvas(canvas, previousState);
      
      // Update UI
      updateHistoryState();
    } finally {
      historyState.isPerformingUndoRedo = false;
    }
  }, []);
  
  /**
   * Performs redo operation
   */
  const redo = useCallback(async () => {
    if (historyState.future.length === 0) return;
    if (historyState.isPerformingUndoRedo) return;
    
    const canvas = useEditorStore.getState().canvas;
    if (!canvas) return;
    
    historyState.isPerformingUndoRedo = true;
    
    try {
      // Save current state to past
      const currentState = serializeCanvas(canvas);
      if (currentState) {
        historyState.past.push(currentState);
        
        // Limit history size
        if (historyState.past.length > MAX_HISTORY_SIZE) {
          historyState.past.shift();
        }
      }
      
      // Get future state
      const futureState = historyState.future.pop();
      historyState.lastSavedState = futureState;
      
      // Restore future state
      await deserializeCanvas(canvas, futureState);
      
      // Update UI
      updateHistoryState();
    } finally {
      historyState.isPerformingUndoRedo = false;
    }
  }, []);
  
  /**
   * Clears all history
   */
  const clearHistory = useCallback(() => {
    historyState.past = [];
    historyState.future = [];
    historyState.lastSavedState = null;
    updateHistoryState();
  }, []);
  
  /**
   * Initializes history with current canvas state
   */
  const initHistory = useCallback(() => {
    const canvas = useEditorStore.getState().canvas;
    if (!canvas || historyState.initialized) return;
    
    const currentState = serializeCanvas(canvas);
    if (currentState) {
      historyState.lastSavedState = currentState;
      historyState.initialized = true;
      updateHistoryState();
    }
  }, []);
  
  // Initialize history when canvas is ready
  useEffect(() => {
    if (canvas && !historyState.initialized) {
      // Small delay to ensure canvas is fully ready
      const timer = setTimeout(() => {
        initHistory();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [canvas, initHistory]);
  
  // Setup canvas event listeners for automatic history saving
  useEffect(() => {
    if (!canvas) return;
    
    const events = [
      'object:added',
      'object:removed',
      'object:modified',
      'object:scaled',
      'object:rotated',
      'object:skewed',
      'object:moved',
      'path:created',
    ];
    
    const handleCanvasChange = () => {
      saveState();
    };
    
    // Add event listeners
    events.forEach(eventName => {
      canvas.on(eventName, handleCanvasChange);
    });
    
    return () => {
      // Remove event listeners
      events.forEach(eventName => {
        canvas.off(eventName, handleCanvasChange);
      });
    };
  }, [canvas, saveState]);
  
  return {
    undo,
    redo,
    saveState,
    clearHistory,
    canUndo: historyState.past.length > 0,
    canRedo: historyState.future.length > 0,
    pastCount: historyState.past.length,
    futureCount: historyState.future.length,
  };
}

/**
 * Updates store with current history state
 */
function updateHistoryState() {
  const { setHistoryState } = useEditorStore.getState();
  if (setHistoryState) {
    setHistoryState({
      canUndo: historyState.past.length > 0,
      canRedo: historyState.future.length > 0,
      pastCount: historyState.past.length,
      futureCount: historyState.future.length,
    });
  }
}

/**
 * External function to get history functions (for use outside React components)
 */
export function getHistoryManager() {
  return {
    saveState: (immediate = false) => {
      if (historyState.isPerformingUndoRedo) return;
      
      const canvas = useEditorStore.getState().canvas;
      if (!canvas) return;
      
      const currentState = serializeCanvas(canvas);
      if (!currentState) return;
      
      if (currentState === historyState.lastSavedState) return;
      
      historyState.future = [];
      
      if (historyState.lastSavedState) {
        historyState.past.push(historyState.lastSavedState);
        if (historyState.past.length > MAX_HISTORY_SIZE) {
          historyState.past.shift();
        }
      }
      
      historyState.lastSavedState = currentState;
      updateHistoryState();
    },
    
    undo: async () => {
      if (historyState.past.length === 0 || historyState.isPerformingUndoRedo) return;
      
      const canvas = useEditorStore.getState().canvas;
      if (!canvas) return;
      
      historyState.isPerformingUndoRedo = true;
      
      try {
        const currentState = serializeCanvas(canvas);
        if (currentState) {
          historyState.future.push(currentState);
          if (historyState.future.length > MAX_HISTORY_SIZE) {
            historyState.future.shift();
          }
        }
        
        const previousState = historyState.past.pop();
        historyState.lastSavedState = previousState;
        
        await deserializeCanvas(canvas, previousState);
        updateHistoryState();
      } finally {
        historyState.isPerformingUndoRedo = false;
      }
    },
    
    redo: async () => {
      if (historyState.future.length === 0 || historyState.isPerformingUndoRedo) return;
      
      const canvas = useEditorStore.getState().canvas;
      if (!canvas) return;
      
      historyState.isPerformingUndoRedo = true;
      
      try {
        const currentState = serializeCanvas(canvas);
        if (currentState) {
          historyState.past.push(currentState);
          if (historyState.past.length > MAX_HISTORY_SIZE) {
            historyState.past.shift();
          }
        }
        
        const futureState = historyState.future.pop();
        historyState.lastSavedState = futureState;
        
        await deserializeCanvas(canvas, futureState);
        updateHistoryState();
      } finally {
        historyState.isPerformingUndoRedo = false;
      }
    },
    
    canUndo: () => historyState.past.length > 0,
    canRedo: () => historyState.future.length > 0,
  };
}

export default useCanvasHistory;
