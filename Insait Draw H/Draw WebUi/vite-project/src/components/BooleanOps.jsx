import { Path, Group } from 'fabric';
import { useEditorStore, BOOLEAN_OPS } from '../stores/editorStore';
import { useLanguageStore } from '../stores/languageStore';
import { getHistoryManager } from '../hooks/useCanvasHistory';
import { getPageBounds } from '../hooks/useArtboard';
import { optimizeObjectForGPU, optimizeBatchForGPU, createOptimizedGroup } from '../utils/fabricGpuConfig';
import {
  getPathFromObject,
  intersectShapes,
  unionShapes,
  subtractShapes,
  polygonToSVGPath,
  getBoundingBox,
} from '../utils/booleanOps';
import './BooleanOps.css';

export function BooleanOps() {
  const { t } = useLanguageStore();
  const { canvas, addLayer, removeLayerByObjectId, fillColor, strokeColor, strokeWidth } = useEditorStore();

  const performBooleanOp = (operation) => {
    if (!canvas) return;
    
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length !== 2) {
      alert(t('selectTwoObjects'));
      return;
    }

    // Save history state before operation
    const historyManager = getHistoryManager();
    historyManager.saveState(true);

    const [obj1, obj2] = activeObjects;
    const points1 = getPathFromObject(obj1);
    const points2 = getPathFromObject(obj2);

    if (!points1 || !points2) {
      alert(t('operationOnlyForShapes'));
      return;
    }

    let resultPolygon;
    switch (operation) {
      case BOOLEAN_OPS.UNION:
        resultPolygon = unionShapes(points1, points2);
        break;
      case BOOLEAN_OPS.SUBTRACT:
        resultPolygon = subtractShapes(points1, points2);
        break;
      case BOOLEAN_OPS.INTERSECT:
        resultPolygon = intersectShapes(points1, points2);
        break;
      default:
        return;
    }

    if (!resultPolygon || resultPolygon.length === 0) {
      alert(t('emptyResult'));
      return;
    }

    // Створити новий Path з результату
    const pathString = polygonToSVGPath(resultPolygon);
    const bbox = getBoundingBox(resultPolygon);

    const newPath = new Path(pathString, {
      left: bbox.left,
      top: bbox.top,
      fill: fillColor,
      stroke: strokeColor,
      strokeWidth: strokeWidth,
      selectable: true,
      // GPU optimization settings
      objectCaching: true,
      noScaleCache: true,
      statefullCache: false,
    });

    // Apply GPU optimization
    optimizeObjectForGPU(newPath);

    // Disable auto-rendering for batch operations
    const wasRenderOnAddRemove = canvas.renderOnAddRemove;
    canvas.renderOnAddRemove = false;

    // Видалити оригінальні об'єкти та їх шари
    if (obj1.id) removeLayerByObjectId(obj1.id);
    if (obj2.id) removeLayerByObjectId(obj2.id);
    canvas.remove(obj1);
    canvas.remove(obj2);
    
    // Додати новий об'єкт
    canvas.add(newPath);
    canvas.setActiveObject(newPath);
    addLayer(newPath);
    
    // Restore rendering and do single render
    canvas.renderOnAddRemove = wasRenderOnAddRemove;
    canvas.requestRenderAll();
  };

  const handleGroupSelected = () => {
    if (!canvas) return;
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length < 2) {
      alert(t('selectMinTwoGroup'));
      return;
    }

    // Save history state before operation
    const historyManager = getHistoryManager();
    historyManager.saveState(true);

    // Disable auto-rendering for batch operations - GPU optimization
    const wasRenderOnAddRemove = canvas.renderOnAddRemove;
    canvas.renderOnAddRemove = false;

    // Apply GPU optimization to all objects before grouping
    activeObjects.forEach(obj => {
      optimizeObjectForGPU(obj);
    });

    // Create group with GPU-optimized settings
    const group = new Group(activeObjects, {
      selectable: true,
      // GPU optimization settings
      objectCaching: true,
      noScaleCache: true,
      statefullCache: false,
    });

    // Видалити оригінальні об'єкти та їх шари
    activeObjects.forEach((obj) => {
      if (obj.id) removeLayerByObjectId(obj.id);
      canvas.remove(obj);
    });
    canvas.add(group);
    canvas.setActiveObject(group);
    addLayer(group);
    
    // Restore rendering and do single render
    canvas.renderOnAddRemove = wasRenderOnAddRemove;
    canvas.requestRenderAll();
  };

  const handleUngroupSelected = () => {
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (!activeObject || activeObject.type !== 'group') {
      alert(t('selectGroup'));
      return;
    }

    // Save history state before operation
    const historyManager = getHistoryManager();
    historyManager.saveState(true);

    // Disable auto-rendering for batch operations - GPU optimization
    const wasRenderOnAddRemove = canvas.renderOnAddRemove;
    canvas.renderOnAddRemove = false;

    // Видалити шар групи
    if (activeObject.id) removeLayerByObjectId(activeObject.id);

    const items = activeObject.getObjects();
    activeObject._restoreObjectsState();
    canvas.remove(activeObject);
    
    // Apply GPU optimization to ungrouped items
    items.forEach((item) => {
      optimizeObjectForGPU(item);
      canvas.add(item);
      addLayer(item);
    });
    
    // Restore rendering and do single render
    canvas.renderOnAddRemove = wasRenderOnAddRemove;
    canvas.requestRenderAll();
  };

  const handleAlignLeft = () => alignObjects('left');
  const handleAlignCenter = () => alignObjects('center');
  const handleAlignRight = () => alignObjects('right');
  const handleAlignTop = () => alignObjects('top');
  const handleAlignMiddle = () => alignObjects('middle');
  const handleAlignBottom = () => alignObjects('bottom');

  /**
   * Smart alignment function:
   * - 1 object: align to page bounds
   * - 2+ objects: align relative to each other (or to the largest one)
   * - If one object contains another: align within container bounds
   */
  const alignObjects = (alignment) => {
    if (!canvas) return;
    const activeObjects = canvas.getActiveObjects();
    
    // Filter out page elements
    const filteredObjects = activeObjects.filter(obj => !obj.data?.isPageElement);
    
    if (filteredObjects.length === 0) {
      return;
    }

    // Save history state before alignment
    const historyManager = getHistoryManager();
    historyManager.saveState(true);

    // Single object - align to page
    if (filteredObjects.length === 1) {
      const obj = filteredObjects[0];
      const pageBounds = getPageBounds();
      
      // Get object bounds considering scale and origin
      const objWidth = obj.width * (obj.scaleX || 1);
      const objHeight = obj.height * (obj.scaleY || 1);
      
      switch (alignment) {
        case 'left':
          obj.set({ left: pageBounds.left });
          break;
        case 'center':
          obj.set({ left: pageBounds.left + (pageBounds.width - objWidth) / 2 });
          break;
        case 'right':
          obj.set({ left: pageBounds.right - objWidth });
          break;
        case 'top':
          obj.set({ top: pageBounds.top });
          break;
        case 'middle':
          obj.set({ top: pageBounds.top + (pageBounds.height - objHeight) / 2 });
          break;
        case 'bottom':
          obj.set({ top: pageBounds.bottom - objHeight });
          break;
      }
      obj.setCoords();
      canvas.renderAll();
      return;
    }

    // Multiple objects - check if one contains others
    const containerInfo = findContainerObject(filteredObjects);
    
    if (containerInfo.container) {
      // Align smaller objects within the container
      alignToContainer(filteredObjects, containerInfo.container, containerInfo.contained, alignment);
    } else {
      // Standard alignment - relative to selection bounds
      alignToSelection(filteredObjects, alignment);
    }
    
    canvas.renderAll();
  };

  /**
   * Finds if one object contains others (for alignment within container)
   */
  const findContainerObject = (objects) => {
    // Sort objects by area (largest first)
    const sortedByArea = [...objects].sort((a, b) => {
      const areaA = (a.width * (a.scaleX || 1)) * (a.height * (a.scaleY || 1));
      const areaB = (b.width * (b.scaleX || 1)) * (b.height * (b.scaleY || 1));
      return areaB - areaA;
    });

    const largest = sortedByArea[0];
    const largestBounds = getObjectBounds(largest);
    
    // Check if all other objects are within the largest object bounds
    const contained = [];
    let allContained = true;
    
    for (let i = 1; i < sortedByArea.length; i++) {
      const obj = sortedByArea[i];
      const objBounds = getObjectBounds(obj);
      
      if (isInsideBounds(objBounds, largestBounds)) {
        contained.push(obj);
      } else {
        allContained = false;
      }
    }
    
    // Only use container alignment if at least one object is inside
    if (contained.length > 0 && contained.length === sortedByArea.length - 1) {
      return { container: largest, contained };
    }
    
    return { container: null, contained: [] };
  };

  /**
   * Gets object bounds
   */
  const getObjectBounds = (obj) => {
    const width = obj.width * (obj.scaleX || 1);
    const height = obj.height * (obj.scaleY || 1);
    return {
      left: obj.left,
      top: obj.top,
      right: obj.left + width,
      bottom: obj.top + height,
      width: width,
      height: height,
      centerX: obj.left + width / 2,
      centerY: obj.top + height / 2,
    };
  };

  /**
   * Checks if bounds A is inside bounds B
   */
  const isInsideBounds = (a, b) => {
    return a.left >= b.left && 
           a.right <= b.right && 
           a.top >= b.top && 
           a.bottom <= b.bottom;
  };

  /**
   * Aligns objects within a container
   */
  const alignToContainer = (allObjects, container, contained, alignment) => {
    const containerBounds = getObjectBounds(container);
    
    contained.forEach((obj) => {
      const objWidth = obj.width * (obj.scaleX || 1);
      const objHeight = obj.height * (obj.scaleY || 1);
      
      switch (alignment) {
        case 'left':
          obj.set({ left: containerBounds.left });
          break;
        case 'center':
          obj.set({ left: containerBounds.left + (containerBounds.width - objWidth) / 2 });
          break;
        case 'right':
          obj.set({ left: containerBounds.right - objWidth });
          break;
        case 'top':
          obj.set({ top: containerBounds.top });
          break;
        case 'middle':
          obj.set({ top: containerBounds.top + (containerBounds.height - objHeight) / 2 });
          break;
        case 'bottom':
          obj.set({ top: containerBounds.bottom - objHeight });
          break;
      }
      obj.setCoords();
    });
  };

  /**
   * Standard alignment relative to selection bounds
   */
  const alignToSelection = (objects, alignment) => {
    const bounds = objects.map(obj => getObjectBounds(obj));

    const minLeft = Math.min(...bounds.map(b => b.left));
    const maxRight = Math.max(...bounds.map(b => b.right));
    const minTop = Math.min(...bounds.map(b => b.top));
    const maxBottom = Math.max(...bounds.map(b => b.bottom));
    const centerX = (minLeft + maxRight) / 2;
    const centerY = (minTop + maxBottom) / 2;

    objects.forEach((obj) => {
      const objWidth = obj.width * (obj.scaleX || 1);
      const objHeight = obj.height * (obj.scaleY || 1);
      
      switch (alignment) {
        case 'left':
          obj.set({ left: minLeft });
          break;
        case 'center':
          obj.set({ left: centerX - objWidth / 2 });
          break;
        case 'right':
          obj.set({ left: maxRight - objWidth });
          break;
        case 'top':
          obj.set({ top: minTop });
          break;
        case 'middle':
          obj.set({ top: centerY - objHeight / 2 });
          break;
        case 'bottom':
          obj.set({ top: maxBottom - objHeight });
          break;
      }
      obj.setCoords();
    });
  };

  return (
    <div className="boolean-ops">
      <div className="ops-section">
        <span className="ops-label">{t('combine')}</span>
        <div className="ops-buttons">
          <button
            className="ops-btn"
            onClick={() => performBooleanOp(BOOLEAN_OPS.UNION)}
            title={t('union')}
          >
            ⊕ {t('union')}
          </button>
          <button
            className="ops-btn"
            onClick={() => performBooleanOp(BOOLEAN_OPS.SUBTRACT)}
            title={t('subtract')}
          >
            ⊖ {t('subtract')}
          </button>
          <button
            className="ops-btn"
            onClick={() => performBooleanOp(BOOLEAN_OPS.INTERSECT)}
            title={t('intersect')}
          >
            ⊗ {t('intersect')}
          </button>
        </div>
      </div>

      <div className="ops-section">
        <span className="ops-label">{t('grouping')}</span>
        <div className="ops-buttons">
          <button
            className="ops-btn"
            onClick={handleGroupSelected}
            title={`${t('group')} (Ctrl+G)`}
          >
            📦 {t('group')}
          </button>
          <button
            className="ops-btn"
            onClick={handleUngroupSelected}
            title={`${t('ungroup')} (Ctrl+Shift+G)`}
          >
            📤 {t('ungroup')}
          </button>
        </div>
      </div>

      <div className="ops-section">
        <span className="ops-label">{t('alignment')}</span>
        <div className="ops-buttons align-buttons">
          <button className="ops-btn small" onClick={handleAlignLeft} title={t('alignLeft')}>
            ⬅️
          </button>
          <button className="ops-btn small" onClick={handleAlignCenter} title={t('alignCenter')}>
            ↔️
          </button>
          <button className="ops-btn small" onClick={handleAlignRight} title={t('alignRight')}>
            ➡️
          </button>
          <button className="ops-btn small" onClick={handleAlignTop} title={t('alignTop')}>
            ⬆️
          </button>
          <button className="ops-btn small" onClick={handleAlignMiddle} title={t('alignMiddle')}>
            ↕️
          </button>
          <button className="ops-btn small" onClick={handleAlignBottom} title={t('alignBottom')}>
            ⬇️
          </button>
        </div>
      </div>
    </div>
  );
}
