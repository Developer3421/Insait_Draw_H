import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  },
};

export const useLanguageStore = create(
  persist(
    (set, get) => ({
      language: 'en',
      setLanguage: (lang) => set({ language: lang }),
      t: (key) => {
        const lang = get().language;
        return translations[lang]?.[key] || translations.en[key] || key;
      },
    }),
    {
      name: 'insait-draw-language',
    }
  )
);
