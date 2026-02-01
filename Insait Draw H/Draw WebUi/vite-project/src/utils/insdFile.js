/**
 * Insait Draw File Format (.insd) - Open Packaging Conventions (OPC) based format
 * 
 * Структура файлу:
 * ├── [Content_Types].xml     - Типи вмісту (OPC стандарт)
 * ├── _rels/
 * │   └── .rels               - Зв'язки пакету
 * ├── document/
 * │   ├── document.json       - Основний документ (канвас Fabric.js)
 * │   ├── settings.json       - Налаштування сторінки та редактора
 * │   └── layers.json         - Інформація про шари
 * ├── media/                  - Медіа-файли (зображення, тощо)
 * │   └── *.png, *.jpg
 * └── thumbnail.png           - Мініатюра документа
 */

import JSZip from 'jszip';
import { v4 as uuidv4 } from 'uuid';

// Версія формату
const FORMAT_VERSION = '1.0.0';
const FORMAT_MIME_TYPE = 'application/vnd.insait.draw.document';

/**
 * Генерує [Content_Types].xml для OPC
 */
function generateContentTypes() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="json" ContentType="application/json"/>
  <Default Extension="png" ContentType="image/png"/>
  <Default Extension="jpg" ContentType="image/jpeg"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Override PartName="/document/document.json" ContentType="application/vnd.insait.draw.canvas+json"/>
  <Override PartName="/document/settings.json" ContentType="application/vnd.insait.draw.settings+json"/>
  <Override PartName="/document/layers.json" ContentType="application/vnd.insait.draw.layers+json"/>
  <Override PartName="/thumbnail.png" ContentType="image/png"/>
</Types>`;
}

/**
 * Генерує _rels/.rels для OPC
 */
function generateRels() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.insait.com/draw/2024/relationships/document" Target="document/document.json"/>
  <Relationship Id="rId2" Type="http://schemas.insait.com/draw/2024/relationships/settings" Target="document/settings.json"/>
  <Relationship Id="rId3" Type="http://schemas.insait.com/draw/2024/relationships/layers" Target="document/layers.json"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/thumbnail" Target="thumbnail.png"/>
</Relationships>`;
}

/**
 * Витягує зображення з канвасу та зберігає їх в медіа
 * @param {fabric.Canvas} canvas 
 * @returns {Promise<{images: Map, canvasJson: object}>}
 */
async function extractImages(canvas) {
  const canvasJson = canvas.toJSON(['id', 'data']);
  const images = new Map();
  
  // Проходимо по всіх об'єктах та замінюємо base64 на посилання
  const processObjects = (objects) => {
    return objects.map(obj => {
      if (obj.type === 'image' && obj.src && obj.src.startsWith('data:')) {
        const imageId = `image_${uuidv4()}`;
        const mimeMatch = obj.src.match(/data:([^;]+);/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
        const extension = mimeType.split('/')[1] || 'png';
        const filename = `${imageId}.${extension}`;
        
        // Зберігаємо base64 дані
        const base64Data = obj.src.split(',')[1];
        images.set(filename, { data: base64Data, mimeType });
        
        // Замінюємо на посилання
        return { ...obj, src: `media/${filename}` };
      }
      
      // Рекурсивно обробляємо групи
      if (obj.objects && Array.isArray(obj.objects)) {
        return { ...obj, objects: processObjects(obj.objects) };
      }
      
      return obj;
    });
  };
  
  if (canvasJson.objects) {
    canvasJson.objects = processObjects(canvasJson.objects);
  }
  
  return { images, canvasJson };
}

/**
 * Відновлює зображення з медіа-файлів
 * @param {object} canvasJson 
 * @param {Map} images 
 * @returns {object}
 */
function restoreImages(canvasJson, images) {
  const processObjects = (objects) => {
    return objects.map(obj => {
      if (obj.type === 'image' && obj.src && obj.src.startsWith('media/')) {
        const filename = obj.src.replace('media/', '');
        const imageData = images.get(filename);
        if (imageData) {
          return { ...obj, src: `data:${imageData.mimeType};base64,${imageData.data}` };
        }
      }
      
      if (obj.objects && Array.isArray(obj.objects)) {
        return { ...obj, objects: processObjects(obj.objects) };
      }
      
      return obj;
    });
  };
  
  if (canvasJson.objects) {
    canvasJson.objects = processObjects(canvasJson.objects);
  }
  
  return canvasJson;
}

/**
 * Зберігає документ у форматі .insd
 * @param {fabric.Canvas} canvas - Fabric.js канвас
 * @param {object} pageSettings - Налаштування сторінки
 * @param {Array} layers - Інформація про шари
 * @param {object} options - Додаткові опції
 * @returns {Promise<Blob>} - Файл у форматі .insd
 */
export async function saveAsINSD(canvas, pageSettings, layers, options = {}) {
  const zip = new JSZip();
  
  // Метадані документу
  const metadata = {
    formatVersion: FORMAT_VERSION,
    mimeType: FORMAT_MIME_TYPE,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    application: 'Insait Draw',
    applicationVersion: '1.0.0',
    documentId: options.documentId || uuidv4(),
    title: options.title || 'Untitled',
    author: options.author || '',
  };
  
  // Витягуємо зображення з канвасу
  const { images, canvasJson } = await extractImages(canvas);
  
  // Додаємо метадані до документу
  canvasJson.metadata = metadata;
  
  // Налаштування
  const settings = {
    page: pageSettings,
    editor: {
      zoom: options.zoom || 1,
      panOffset: options.panOffset || { x: 0, y: 0 },
      showGrid: options.showGrid ?? true,
      snapToGrid: options.snapToGrid ?? true,
      gridSize: options.gridSize || 20,
    },
    metadata,
  };
  
  // Шари (без циклічних посилань)
  const layersData = layers.map(layer => ({
    id: layer.id,
    objectId: layer.objectId,
    name: layer.name,
    visible: layer.visible,
    locked: layer.locked,
  }));
  
  // Додаємо OPC файли
  zip.file('[Content_Types].xml', generateContentTypes());
  zip.folder('_rels').file('.rels', generateRels());
  
  // Додаємо документи
  const docFolder = zip.folder('document');
  docFolder.file('document.json', JSON.stringify(canvasJson, null, 2));
  docFolder.file('settings.json', JSON.stringify(settings, null, 2));
  docFolder.file('layers.json', JSON.stringify(layersData, null, 2));
  
  // Додаємо медіа-файли
  if (images.size > 0) {
    const mediaFolder = zip.folder('media');
    for (const [filename, imageInfo] of images) {
      mediaFolder.file(filename, imageInfo.data, { base64: true });
    }
  }
  
  // Генеруємо мініатюру
  try {
    const thumbnail = canvas.toDataURL({
      format: 'png',
      quality: 0.7,
      multiplier: 0.25, // Зменшуємо розмір
    });
    const thumbnailBase64 = thumbnail.split(',')[1];
    zip.file('thumbnail.png', thumbnailBase64, { base64: true });
  } catch (e) {
    console.warn('Could not generate thumbnail:', e);
  }
  
  // Генеруємо файл
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
    mimeType: FORMAT_MIME_TYPE,
  });
  
  return blob;
}

/**
 * Завантажує документ з формату .insd
 * @param {Blob|File} file - Файл .insd
 * @returns {Promise<{canvasJson: object, settings: object, layers: Array, thumbnail?: string}>}
 */
export async function loadFromINSD(file) {
  const zip = await JSZip.loadAsync(file);
  
  // Читаємо основні файли
  const documentFile = zip.file('document/document.json');
  const settingsFile = zip.file('document/settings.json');
  const layersFile = zip.file('document/layers.json');
  
  if (!documentFile) {
    throw new Error('Invalid .insd file: missing document.json');
  }
  
  const documentContent = await documentFile.async('string');
  let canvasJson = JSON.parse(documentContent);
  
  // Читаємо налаштування
  let settings = null;
  if (settingsFile) {
    const settingsContent = await settingsFile.async('string');
    settings = JSON.parse(settingsContent);
  }
  
  // Читаємо шари
  let layers = [];
  if (layersFile) {
    const layersContent = await layersFile.async('string');
    layers = JSON.parse(layersContent);
  }
  
  // Читаємо медіа-файли
  const images = new Map();
  const mediaFolder = zip.folder('media');
  if (mediaFolder) {
    const mediaFiles = mediaFolder.filter(() => true);
    for (const mediaFile of mediaFiles) {
      if (!mediaFile.dir) {
        const filename = mediaFile.name.replace('media/', '');
        const extension = filename.split('.').pop()?.toLowerCase();
        const mimeType = extension === 'jpg' || extension === 'jpeg' 
          ? 'image/jpeg' 
          : `image/${extension || 'png'}`;
        
        const data = await mediaFile.async('base64');
        images.set(filename, { data, mimeType });
      }
    }
  }
  
  // Відновлюємо зображення
  canvasJson = restoreImages(canvasJson, images);
  
  // Читаємо мініатюру
  let thumbnail = null;
  const thumbnailFile = zip.file('thumbnail.png');
  if (thumbnailFile) {
    const thumbnailBase64 = await thumbnailFile.async('base64');
    thumbnail = `data:image/png;base64,${thumbnailBase64}`;
  }
  
  return { canvasJson, settings, layers, thumbnail };
}

/**
 * Завантажує файл і повертає Blob
 * @param {File} file 
 * @returns {Promise<Blob>}
 */
export function fileToBlob(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Blob([reader.result]));
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Викачує Blob як файл
 * @param {Blob} blob 
 * @param {string} filename 
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Перевіряє чи файл є валідним .insd
 * @param {Blob|File} file 
 * @returns {Promise<boolean>}
 */
export async function isValidINSD(file) {
  try {
    const zip = await JSZip.loadAsync(file);
    const hasContentTypes = !!zip.file('[Content_Types].xml');
    const hasDocument = !!zip.file('document/document.json');
    return hasContentTypes && hasDocument;
  } catch {
    return false;
  }
}

/**
 * Отримує метадані з .insd файлу без повного завантаження
 * @param {Blob|File} file 
 * @returns {Promise<object>}
 */
export async function getINSDMetadata(file) {
  const zip = await JSZip.loadAsync(file);
  
  const settingsFile = zip.file('document/settings.json');
  if (settingsFile) {
    const settingsContent = await settingsFile.async('string');
    const settings = JSON.parse(settingsContent);
    return settings.metadata || {};
  }
  
  return {};
}

/**
 * Отримує мініатюру з .insd файлу
 * @param {Blob|File} file 
 * @returns {Promise<string|null>} - Data URL мініатюри
 */
export async function getINSDThumbnail(file) {
  const zip = await JSZip.loadAsync(file);
  
  const thumbnailFile = zip.file('thumbnail.png');
  if (thumbnailFile) {
    const base64 = await thumbnailFile.async('base64');
    return `data:image/png;base64,${base64}`;
  }
  
  return null;
}

export default {
  saveAsINSD,
  loadFromINSD,
  downloadBlob,
  isValidINSD,
  getINSDMetadata,
  getINSDThumbnail,
  FORMAT_VERSION,
  FORMAT_MIME_TYPE,
};
