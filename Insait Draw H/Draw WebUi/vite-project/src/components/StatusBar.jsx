import { useEditorStore } from '../stores/editorStore';
import { useLanguageStore } from '../stores/languageStore';
import './StatusBar.css';

export function StatusBar() {
  const { t } = useLanguageStore();
  const { zoom, layers, activeTool, canvas } = useEditorStore();
  
  const selectedCount = canvas?.getActiveObjects()?.length || 0;
  
  return (
    <div className="status-bar">
      <div className="status-item">
        <span className="status-label">{t('tool')}:</span>
        <span className="status-value">{activeTool}</span>
      </div>
      
      <div className="status-item">
        <span className="status-label">{t('objects')}:</span>
        <span className="status-value">{layers.length}</span>
      </div>
      
      <div className="status-item">
        <span className="status-label">{t('selected')}:</span>
        <span className="status-value">{selectedCount}</span>
      </div>
      
      <div className="status-item">
        <span className="status-label">{t('zoom')}:</span>
        <span className="status-value">{Math.round(zoom * 100)}%</span>
      </div>
      
      <div className="status-spacer" />
      
      <div className="status-hints">
        <span>{t('mouseWheelZoom')}</span>
        <span>{t('altDragPan')}</span>
        <span>V: Select</span>
        <span>B: Brush</span>
        <span>R: Rect</span>
      </div>
    </div>
  );
}
