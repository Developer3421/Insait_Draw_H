import { Path, Group } from 'fabric';
import { useEditorStore, BOOLEAN_OPS } from '../stores/editorStore';
import { useLanguageStore } from '../stores/languageStore';
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
    });

    // Видалити оригінальні об'єкти та їх шари
    if (obj1.id) removeLayerByObjectId(obj1.id);
    if (obj2.id) removeLayerByObjectId(obj2.id);
    canvas.remove(obj1);
    canvas.remove(obj2);
    
    // Додати новий об'єкт
    canvas.add(newPath);
    canvas.setActiveObject(newPath);
    addLayer(newPath);
    canvas.renderAll();
  };

  const handleGroupSelected = () => {
    if (!canvas) return;
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length < 2) {
      alert(t('selectMinTwoGroup'));
      return;
    }

    const group = new Group(activeObjects, {
      selectable: true,
    });

    // Видалити оригінальні об'єкти та їх шари
    activeObjects.forEach((obj) => {
      if (obj.id) removeLayerByObjectId(obj.id);
      canvas.remove(obj);
    });
    canvas.add(group);
    canvas.setActiveObject(group);
    addLayer(group);
    canvas.renderAll();
  };

  const handleUngroupSelected = () => {
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (!activeObject || activeObject.type !== 'group') {
      alert(t('selectGroup'));
      return;
    }

    // Видалити шар групи
    if (activeObject.id) removeLayerByObjectId(activeObject.id);

    const items = activeObject.getObjects();
    activeObject._restoreObjectsState();
    canvas.remove(activeObject);
    
    items.forEach((item) => {
      canvas.add(item);
      addLayer(item);
    });
    
    canvas.renderAll();
  };

  const handleAlignLeft = () => alignObjects('left');
  const handleAlignCenter = () => alignObjects('center');
  const handleAlignRight = () => alignObjects('right');
  const handleAlignTop = () => alignObjects('top');
  const handleAlignMiddle = () => alignObjects('middle');
  const handleAlignBottom = () => alignObjects('bottom');

  const alignObjects = (alignment) => {
    if (!canvas) return;
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length < 2) {
      alert(t('selectMinTwoAlign'));
      return;
    }

    const bounds = activeObjects.map(obj => ({
      left: obj.left,
      top: obj.top,
      right: obj.left + obj.width * obj.scaleX,
      bottom: obj.top + obj.height * obj.scaleY,
      centerX: obj.left + (obj.width * obj.scaleX) / 2,
      centerY: obj.top + (obj.height * obj.scaleY) / 2,
    }));

    const minLeft = Math.min(...bounds.map(b => b.left));
    const maxRight = Math.max(...bounds.map(b => b.right));
    const minTop = Math.min(...bounds.map(b => b.top));
    const maxBottom = Math.max(...bounds.map(b => b.bottom));
    const centerX = (minLeft + maxRight) / 2;
    const centerY = (minTop + maxBottom) / 2;

    activeObjects.forEach((obj, i) => {
      switch (alignment) {
        case 'left':
          obj.set({ left: minLeft });
          break;
        case 'center':
          obj.set({ left: centerX - (obj.width * obj.scaleX) / 2 });
          break;
        case 'right':
          obj.set({ left: maxRight - obj.width * obj.scaleX });
          break;
        case 'top':
          obj.set({ top: minTop });
          break;
        case 'middle':
          obj.set({ top: centerY - (obj.height * obj.scaleY) / 2 });
          break;
        case 'bottom':
          obj.set({ top: maxBottom - obj.height * obj.scaleY });
          break;
      }
      obj.setCoords();
    });

    canvas.renderAll();
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
