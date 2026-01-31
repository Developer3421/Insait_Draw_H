import { useEditorStore } from '../stores/editorStore';
import { useLanguageStore } from '../stores/languageStore';
import './LayersPanel.css';

export function LayersPanel() {
  const { t } = useLanguageStore();
  const {
    layers,
    selectedLayerId,
    selectLayer,
    toggleLayerVisibility,
    toggleLayerLock,
    removeLayer,
    moveLayer,
    renameLayer,
  } = useEditorStore();

  const handleRename = (layerId, currentName) => {
    const newName = prompt(t('enterNewName'), currentName);
    if (newName && newName.trim()) {
      renameLayer(layerId, newName.trim());
    }
  };

  return (
    <div className="layers-panel">
      <div className="layers-header">
        <h3>📚 {t('layers')}</h3>
        <span className="layers-count">{layers.length}</span>
      </div>
      
      <div className="layers-list">
        {layers.length === 0 ? (
          <div className="layers-empty">
            {t('noObjects')}
          </div>
        ) : (
          [...layers].reverse().map((layer, index) => (
            <div
              key={layer.id}
              className={`layer-item ${selectedLayerId === layer.id ? 'selected' : ''} ${layer.locked ? 'locked' : ''} ${!layer.visible ? 'hidden' : ''}`}
              onClick={() => selectLayer(layer.id)}
            >
              <div className="layer-controls">
                <button
                  className="layer-btn visibility-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLayerVisibility(layer.id);
                  }}
                  title={layer.visible ? t('hide') : t('show')}
                >
                  {layer.visible ? '👁️' : '🚫'}
                </button>
                
                <button
                  className="layer-btn lock-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLayerLock(layer.id);
                  }}
                  title={layer.locked ? t('unlock') : t('lock')}
                >
                  {layer.locked ? '🔒' : '🔓'}
                </button>
              </div>
              
              <div 
                className="layer-name"
                onDoubleClick={() => handleRename(layer.id, layer.name)}
                title={t('doubleClickRename')}
              >
                {layer.name}
              </div>
              
              <div className="layer-actions">
                <button
                  className="layer-btn move-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveLayer(layer.id, 'up');
                  }}
                  disabled={index === 0}
                  title={t('up')}
                >
                  ⬆️
                </button>
                
                <button
                  className="layer-btn move-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveLayer(layer.id, 'down');
                  }}
                  disabled={index === layers.length - 1}
                  title={t('down')}
                >
                  ⬇️
                </button>
                
                <button
                  className="layer-btn delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeLayer(layer.id);
                  }}
                  title={t('deleteLayer')}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className="layers-footer">
        <button
          className="layer-action-btn"
          onClick={() => {
            const layer = layers.find(l => l.id === selectedLayerId);
            if (layer) moveLayer(layer.id, 'top');
          }}
          disabled={!selectedLayerId}
          title={t('toFront')}
        >
          ⏫ {t('up')}
        </button>
        <button
          className="layer-action-btn"
          onClick={() => {
            const layer = layers.find(l => l.id === selectedLayerId);
            if (layer) moveLayer(layer.id, 'bottom');
          }}
          disabled={!selectedLayerId}
          title={t('toBack')}
        >
          ⏬ {t('down')}
        </button>
      </div>
    </div>
  );
}
