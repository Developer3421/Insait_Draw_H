import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Supported languages
const SUPPORTED_LANGUAGES = ['en', 'uk', 'de'];
const DEFAULT_LANGUAGE = 'en';

// Safe localStorage wrapper that handles errors gracefully
const safeStorage = {
  getItem: (name) => {
    try {
      const value = localStorage.getItem(name);
      if (value === null) return null;
      
      // Try to parse and validate the stored value
      const parsed = JSON.parse(value);
      
      // Validate that it has a valid language
      if (parsed && parsed.state && parsed.state.language) {
        if (SUPPORTED_LANGUAGES.includes(parsed.state.language)) {
          return value;
        }
      }
      
      // If validation fails, remove corrupted data and return null
      localStorage.removeItem(name);
      return null;
    } catch (error) {
      // If parsing fails, remove corrupted data
      try {
        localStorage.removeItem(name);
      } catch {
        // Ignore removal errors
      }
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch (error) {
      // Handle quota exceeded or other storage errors
      console.warn('Failed to save language preference:', error);
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch (error) {
      // Ignore removal errors
    }
  },
};

// Translations
export const translations = {
  en: {
    // Tools
    tools: 'Tools',
    select: 'Selection',
    pan: 'Pan Canvas',
    brush: 'Brush',
    eraser: 'Eraser',
    
    // Shapes
    shapes: 'Shapes',
    line: 'Line',
    rectangle: 'Rectangle',
    circle: 'Circle',
    triangle: 'Triangle',
    text: 'Text',
    textDoubleClick: 'Text (Double-click to add)',
    
    // Path/Bezier tools
    pathTools: 'Path Tools',
    penTool: 'Pen Tool',
    curvatureTool: 'Curvature',
    anchorPointTool: 'Anchor Point',
    directSelectTool: 'Direct Select',
    
    // Colors
    colors: 'Colors',
    fill: 'Fill',
    stroke: 'Stroke',
    clickFillRightClickStroke: 'Click - fill, Right-click - stroke',
    
    // Stroke
    strokeWidth: 'Stroke',
    
    // Text settings
    textSettings: 'Text',
    
    // Zoom
    zoom: 'Zoom',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    resetZoom: 'Reset',
    
    // Snapping
    snapping: 'Snapping',
    grid: 'Grid',
    toGrid: 'To Grid',
    toObjects: 'To Objects',
    
    // Actions
    history: 'History',
    undo: 'Undo',
    redo: 'Redo',
    
    // Editing
    editing: 'Editing',
    copy: 'Copy',
    paste: 'Paste',
    delete: 'Delete',
    
    // File
    file: 'File',
    savePNG: 'PNG',
    save: 'Save',
    open: 'Open',
    clear: 'Clear',
    clearConfirm: 'Are you sure you want to clear the canvas?',
    loadError: 'Error loading file: ',
    saveError: 'Error saving file: ',
    
    // Layers
    layers: 'Layers',
    noObjects: 'No objects',
    enterNewName: 'Enter new layer name:',
    hide: 'Hide',
    show: 'Show',
    lock: 'Lock',
    unlock: 'Unlock',
    up: 'Up',
    down: 'Down',
    deleteLayer: 'Delete',
    toFront: 'To Front',
    toBack: 'To Back',
    doubleClickRename: 'Double-click to rename',
    
    // Boolean operations
    combine: 'Combine',
    union: 'Union',
    subtract: 'Subtract',
    intersect: 'Intersect',
    
    // Grouping
    grouping: 'Grouping',
    group: 'Group',
    ungroup: 'Ungroup',
    
    // Alignment
    alignment: 'Alignment',
    alignLeft: 'Align Left',
    alignCenter: 'Align Center',
    alignRight: 'Align Right',
    alignTop: 'Align Top',
    alignMiddle: 'Align Middle',
    alignBottom: 'Align Bottom',
    
    // Alerts
    selectTwoObjects: 'Select exactly 2 objects for Boolean operation',
    operationOnlyForShapes: 'Operation is only supported for basic shapes',
    emptyResult: 'Operation result is empty',
    selectMinTwoGroup: 'Select at least 2 objects to group',
    selectGroup: 'Select a group to ungroup',
    selectMinTwoAlign: 'Select at least 2 objects to align',
    
    // Status bar
    tool: 'Tool',
    objects: 'Objects',
    selected: 'Selected',
    mouseWheelZoom: 'Mouse wheel: Zoom',
    altDragPan: 'Alt+Drag: Pan',
    
    // Default text
    defaultText: 'Text',
    
    // Language
    language: 'Language',
    
    // Page settings
    page: 'Page',
    pageSize: 'Page Size',
    portrait: 'Portrait',
    landscape: 'Landscape',
    custom: 'Custom',
    width: 'Width',
    height: 'Height',
    fitPageToView: 'Fit to View',
    zoom100: 'Zoom 100%',
    alignToPage: 'Align to Page',
    
    // Import
    importImage: 'Import',
    importImageTitle: 'Import image (PNG, JPEG, GIF, WebP, BMP, SVG)',
    
    // Properties Panel
    properties: 'Properties',
    selectObject: 'Select an object to edit its properties',
    position: 'Position',
    size: 'Size',
    transform: 'Transform',
    angle: 'Angle',
    opacity: 'Opacity',
    radius: 'Radius',
    transparent: 'Transparent',
    font: 'Font',
    fontSize: 'Size',
    textAlign: 'Align',
  },
  uk: {
    // Інструменти
    tools: 'Інструменти',
    select: 'Виділення',
    pan: 'Переміщення полотна',
    brush: 'Пензель',
    eraser: 'Гумка',
    
    // Фігури
    shapes: 'Фігури',
    line: 'Лінія',
    rectangle: 'Прямокутник',
    circle: 'Коло',
    triangle: 'Трикутник',
    text: 'Текст',
    textDoubleClick: 'Текст (Подвійний клік для додавання)',
    
    // Інструменти контурів/Безьє
    pathTools: 'Контури',
    penTool: 'Перо',
    curvatureTool: 'Кривизна',
    anchorPointTool: 'Опорні точки',
    directSelectTool: 'Пряме виділення',
    
    // Кольори
    colors: 'Кольори',
    fill: 'Заливка',
    stroke: 'Обводка',
    clickFillRightClickStroke: 'Клік - заливка, ПКМ - обводка',
    
    // Обводка
    strokeWidth: 'Обводка',
    
    // Налаштування тексту
    textSettings: 'Текст',
    
    // Масштаб
    zoom: 'Масштаб',
    zoomIn: 'Збільшити',
    zoomOut: 'Зменшити',
    resetZoom: 'Скинути',
    
    // Прив'язки
    snapping: 'Прив\'язки',
    grid: 'Сітка',
    toGrid: 'До сітки',
    toObjects: 'До об\'єктів',
    
    // Дії
    history: 'Історія',
    undo: 'Назад',
    redo: 'Вперед',
    
    // Редагування
    editing: 'Редагування',
    copy: 'Копіювати',
    paste: 'Вставити',
    delete: 'Видалити',
    
    // Файл
    file: 'Файл',
    savePNG: 'PNG',
    save: 'Зберегти',
    open: 'Відкрити',
    clear: 'Очистити',
    clearConfirm: 'Ви впевнені, що хочете очистити полотно?',
    loadError: 'Помилка завантаження файлу: ',
    saveError: 'Помилка збереження файлу: ',
    
    // Шари
    layers: 'Шари',
    noObjects: 'Немає об\'єктів',
    enterNewName: 'Введіть нову назву шару:',
    hide: 'Приховати',
    show: 'Показати',
    lock: 'Заблокувати',
    unlock: 'Розблокувати',
    up: 'Вгору',
    down: 'Вниз',
    deleteLayer: 'Видалити',
    toFront: 'На передній план',
    toBack: 'На задній план',
    doubleClickRename: 'Подвійний клік для перейменування',
    
    // Boolean операції
    combine: 'Комбінування',
    union: 'Об\'єднати',
    subtract: 'Відняти',
    intersect: 'Перетин',
    
    // Групування
    grouping: 'Групування',
    group: 'Групувати',
    ungroup: 'Розгрупувати',
    
    // Вирівнювання
    alignment: 'Вирівнювання',
    alignLeft: 'По лівому краю',
    alignCenter: 'По центру (горизонтально)',
    alignRight: 'По правому краю',
    alignTop: 'По верхньому краю',
    alignMiddle: 'По центру (вертикально)',
    alignBottom: 'По нижньому краю',
    
    // Сповіщення
    selectTwoObjects: 'Виберіть рівно 2 об\'єкти для Boolean операції',
    operationOnlyForShapes: 'Операція підтримується тільки для базових фігур',
    emptyResult: 'Результат операції порожній',
    selectMinTwoGroup: 'Виберіть мінімум 2 об\'єкти для групування',
    selectGroup: 'Виберіть групу для розгрупування',
    selectMinTwoAlign: 'Виберіть мінімум 2 об\'єкти для вирівнювання',
    
    // Рядок стану
    tool: 'Інструмент',
    objects: 'Об\'єкти',
    selected: 'Вибрано',
    mouseWheelZoom: 'Колесо миші: Zoom',
    altDragPan: 'Alt+Drag: Pan',
    
    // Текст за замовчуванням
    defaultText: 'Текст',
    
    // Мова
    language: 'Мова',
    
    // Налаштування сторінки
    page: 'Сторінка',
    pageSize: 'Розмір сторінки',
    portrait: 'Портрет',
    landscape: 'Альбом',
    custom: 'Власний',
    width: 'Ширина',
    height: 'Висота',
    fitPageToView: 'Вмістити в вікно',
    zoom100: 'Масштаб 100%',
    alignToPage: 'Вирівняти до сторінки',
    
    // Імпорт
    importImage: 'Імпорт',
    importImageTitle: 'Імпорт зображення (PNG, JPEG, GIF, WebP, BMP, SVG)',
    
    // Панель властивостей
    properties: 'Властивості',
    selectObject: 'Виберіть об\'єкт для редагування',
    position: 'Позиція',
    size: 'Розмір',
    transform: 'Трансформація',
    angle: 'Кут',
    opacity: 'Прозорість',
    radius: 'Радіус',
    transparent: 'Прозорий',
    font: 'Шрифт',
    fontSize: 'Розмір',
    textAlign: 'Вирівнювання',
  },
  de: {
    // Werkzeuge
    tools: 'Werkzeuge',
    select: 'Auswahl',
    pan: 'Leinwand verschieben',
    brush: 'Pinsel',
    eraser: 'Radiergummi',
    
    // Formen
    shapes: 'Formen',
    line: 'Linie',
    rectangle: 'Rechteck',
    circle: 'Kreis',
    triangle: 'Dreieck',
    text: 'Text',
    textDoubleClick: 'Text (Doppelklick zum Hinzufügen)',
    
    // Farben
    colors: 'Farben',
    fill: 'Füllung',
    stroke: 'Kontur',
    clickFillRightClickStroke: 'Klick - Füllung, Rechtsklick - Kontur',
    
    // Kontur
    strokeWidth: 'Kontur',
    
    // Texteinstellungen
    textSettings: 'Text',
    
    // Zoom
    zoom: 'Zoom',
    zoomIn: 'Vergrößern',
    zoomOut: 'Verkleinern',
    resetZoom: 'Zurücksetzen',
    
    // Einrasten
    snapping: 'Einrasten',
    grid: 'Raster',
    toGrid: 'Am Raster',
    toObjects: 'An Objekten',
    
    // Aktionen
    history: 'Verlauf',
    undo: 'Rückgängig',
    redo: 'Wiederholen',
    
    // Bearbeiten
    editing: 'Bearbeiten',
    copy: 'Kopieren',
    paste: 'Einfügen',
    delete: 'Löschen',
    
    // Datei
    file: 'Datei',
    savePNG: 'PNG',
    save: 'Speichern',
    open: 'Öffnen',
    clear: 'Löschen',
    clearConfirm: 'Sind Sie sicher, dass Sie die Leinwand löschen möchten?',
    loadError: 'Fehler beim Laden der Datei: ',
    saveError: 'Fehler beim Speichern der Datei: ',
    
    // Ebenen
    layers: 'Ebenen',
    noObjects: 'Keine Objekte',
    enterNewName: 'Neuen Ebenennamen eingeben:',
    hide: 'Ausblenden',
    show: 'Anzeigen',
    lock: 'Sperren',
    unlock: 'Entsperren',
    up: 'Nach oben',
    down: 'Nach unten',
    deleteLayer: 'Löschen',
    toFront: 'In den Vordergrund',
    toBack: 'In den Hintergrund',
    doubleClickRename: 'Doppelklick zum Umbenennen',
    
    // Boolean-Operationen
    combine: 'Kombinieren',
    union: 'Vereinigen',
    subtract: 'Subtrahieren',
    intersect: 'Schnittmenge',
    
    // Gruppierung
    grouping: 'Gruppierung',
    group: 'Gruppieren',
    ungroup: 'Gruppierung aufheben',
    
    // Ausrichtung
    alignment: 'Ausrichtung',
    alignLeft: 'Links ausrichten',
    alignCenter: 'Horizontal zentrieren',
    alignRight: 'Rechts ausrichten',
    alignTop: 'Oben ausrichten',
    alignMiddle: 'Vertikal zentrieren',
    alignBottom: 'Unten ausrichten',
    
    // Benachrichtigungen
    selectTwoObjects: 'Wählen Sie genau 2 Objekte für Boolean-Operation',
    operationOnlyForShapes: 'Operation wird nur für Grundformen unterstützt',
    emptyResult: 'Operationsergebnis ist leer',
    selectMinTwoGroup: 'Wählen Sie mindestens 2 Objekte zum Gruppieren',
    selectGroup: 'Wählen Sie eine Gruppe zum Aufheben der Gruppierung',
    selectMinTwoAlign: 'Wählen Sie mindestens 2 Objekte zum Ausrichten',
    
    // Statusleiste
    tool: 'Werkzeug',
    objects: 'Objekte',
    selected: 'Ausgewählt',
    mouseWheelZoom: 'Mausrad: Zoom',
    altDragPan: 'Alt+Ziehen: Verschieben',
    
    // Standardtext
    defaultText: 'Text',
    
    // Sprache
    language: 'Sprache',
    
    // Seiteneinstellungen
    page: 'Seite',
    pageSize: 'Seitengröße',
    portrait: 'Hochformat',
    landscape: 'Querformat',
    custom: 'Benutzerdefiniert',
    width: 'Breite',
    height: 'Höhe',
    fitPageToView: 'An Ansicht anpassen',
    zoom100: 'Zoom 100%',
    alignToPage: 'An Seite ausrichten',
    
    // Import
    importImage: 'Importieren',
    importImageTitle: 'Bild importieren (PNG, JPEG, GIF, WebP, BMP, SVG)',
    
    // Eigenschaftenpanel
    properties: 'Eigenschaften',
    selectObject: 'Objekt auswählen zum Bearbeiten',
    position: 'Position',
    size: 'Größe',
    transform: 'Transformation',
    angle: 'Winkel',
    opacity: 'Deckkraft',
    radius: 'Radius',
    transparent: 'Transparent',
    font: 'Schriftart',
    fontSize: 'Größe',
    textAlign: 'Ausrichtung',
  },
};

// Function to sync language with Avalonia backend (for Microsoft Store compatibility)
const syncLanguageToBackend = async (lang) => {
  try {
    await fetch('/api/language', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: lang }),
    });
  } catch (error) {
    // Silently fail - backend may not be available (e.g., in browser dev mode)
  }
};

// Function to fetch initial language from Avalonia backend
const fetchLanguageFromBackend = async () => {
  try {
    const response = await fetch('/api/language');
    if (response.ok) {
      const data = await response.json();
      if (data && SUPPORTED_LANGUAGES.includes(data.language)) {
        return data.language;
      }
    }
  } catch (error) {
    // Silently fail - backend may not be available
  }
  return null;
};

export const useLanguageStore = create(
  persist(
    (set, get) => ({
      language: DEFAULT_LANGUAGE,
      setLanguage: (lang) => {
        // Validate that the language is supported
        const validLang = SUPPORTED_LANGUAGES.includes(lang) ? lang : DEFAULT_LANGUAGE;
        set({ language: validLang });
        // Also sync to backend for Microsoft Store persistence
        syncLanguageToBackend(validLang);
      },
      t: (key) => {
        const lang = get().language;
        // Fallback chain: current language -> English -> key itself
        return translations[lang]?.[key] || translations.en[key] || key;
      },
      // Initialize language from backend (call this on app startup)
      initializeFromBackend: async () => {
        const backendLang = await fetchLanguageFromBackend();
        if (backendLang) {
          set({ language: backendLang });
        }
      },
    }),
    {
      name: 'insait-draw-language',
      storage: createJSONStorage(() => safeStorage),
      // Handle hydration errors by falling back to default language
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn('Failed to rehydrate language store, using default language');
          return;
        }
        // Validate rehydrated language
        if (state && !SUPPORTED_LANGUAGES.includes(state.language)) {
          state.language = DEFAULT_LANGUAGE;
        }
      },
    }
  )
);
