/**
 * Image to SVG Tracer Utility
 * Converts raster images to SVG paths using imagetracerjs
 */

import ImageTracer from 'imagetracerjs';

/**
 * Tracing presets for different use cases
 */
export const TRACE_PRESETS = {
  default: {
    // Default tracing options
    ltres: 1,
    qtres: 1,
    pathomit: 8,
    colorsampling: 2,
    numberofcolors: 16,
    mincolorratio: 0,
    colorquantcycles: 3,
    blurradius: 0,
    blurdelta: 20,
    strokewidth: 1,
    linefilter: false,
    scale: 1,
    roundcoords: 1,
    viewbox: false,
    desc: false,
    lcpr: 0,
    qcpr: 0,
  },
  
  // High quality - more colors, finer details
  detailed: {
    ltres: 0.5,
    qtres: 0.5,
    pathomit: 4,
    colorsampling: 2,
    numberofcolors: 64,
    mincolorratio: 0,
    colorquantcycles: 5,
    blurradius: 0,
    blurdelta: 10,
    strokewidth: 0,
    linefilter: false,
    scale: 1,
    roundcoords: 2,
    viewbox: false,
    desc: false,
    lcpr: 0,
    qcpr: 0,
  },
  
  // Simple - fewer colors, smoother paths
  simple: {
    ltres: 2,
    qtres: 2,
    pathomit: 16,
    colorsampling: 1,
    numberofcolors: 8,
    mincolorratio: 0.02,
    colorquantcycles: 2,
    blurradius: 2,
    blurdelta: 30,
    strokewidth: 0,
    linefilter: false,
    scale: 1,
    roundcoords: 0,
    viewbox: false,
    desc: false,
    lcpr: 0,
    qcpr: 0,
  },
  
  // Black and white / Line art
  blackAndWhite: {
    ltres: 1,
    qtres: 1,
    pathomit: 8,
    colorsampling: 0,
    numberofcolors: 2,
    mincolorratio: 0,
    colorquantcycles: 1,
    blurradius: 0,
    blurdelta: 20,
    strokewidth: 1,
    linefilter: true,
    scale: 1,
    roundcoords: 1,
    viewbox: false,
    desc: false,
    lcpr: 0,
    qcpr: 0,
  },
  
  // Posterized - cartoon-like effect
  posterized: {
    ltres: 1.5,
    qtres: 1.5,
    pathomit: 10,
    colorsampling: 2,
    numberofcolors: 6,
    mincolorratio: 0.01,
    colorquantcycles: 3,
    blurradius: 3,
    blurdelta: 40,
    strokewidth: 2,
    linefilter: false,
    scale: 1,
    roundcoords: 1,
    viewbox: false,
    desc: false,
    lcpr: 0,
    qcpr: 0,
  },
};

/**
 * Load an image from file input and return as ImageData
 * @param {File} file - Image file
 * @returns {Promise<{imageData: ImageData, width: number, height: number}>}
 */
export async function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        
        resolve({
          imageData,
          width: img.width,
          height: img.height,
        });
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = e.target.result;
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Load an image from URL and return as ImageData
 * @param {string} url - Image URL
 * @returns {Promise<{imageData: ImageData, width: number, height: number}>}
 */
export async function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      
      resolve({
        imageData,
        width: img.width,
        height: img.height,
      });
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image from URL'));
    };
    
    img.src = url;
  });
}

/**
 * Load an image from a Fabric.js Image object
 * @param {Object} fabricImage - Fabric.js Image object
 * @returns {Promise<{imageData: ImageData, width: number, height: number}>}
 */
export async function loadImageFromFabricObject(fabricImage) {
  if (!fabricImage || !fabricImage._element) {
    throw new Error('Invalid Fabric.js image object');
  }
  
  const img = fabricImage._element;
  const canvas = document.createElement('canvas');
  canvas.width = img.width || img.naturalWidth;
  canvas.height = img.height || img.naturalHeight;
  
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  return {
    imageData,
    width: canvas.width,
    height: canvas.height,
  };
}

/**
 * Trace an image and return SVG string
 * @param {ImageData} imageData - Image data to trace
 * @param {string} preset - Preset name from TRACE_PRESETS
 * @param {Object} customOptions - Custom options to override preset
 * @returns {string} SVG string
 */
export function traceImageToSvg(imageData, preset = 'default', customOptions = {}) {
  const presetOptions = TRACE_PRESETS[preset] || TRACE_PRESETS.default;
  const options = { ...presetOptions, ...customOptions };
  
  // Use imagetracerjs to trace the image
  const svgString = ImageTracer.imagedataToSVG(imageData, options);
  
  return svgString;
}

/**
 * Trace an image and return path data array
 * @param {ImageData} imageData - Image data to trace
 * @param {string} preset - Preset name from TRACE_PRESETS
 * @param {Object} customOptions - Custom options to override preset
 * @returns {Array} Array of path data objects
 */
export function traceImageToPaths(imageData, preset = 'default', customOptions = {}) {
  const presetOptions = TRACE_PRESETS[preset] || TRACE_PRESETS.default;
  const options = { ...presetOptions, ...customOptions };
  
  // Get traced image data
  const traceData = ImageTracer.imagedataToTracedata(imageData, options);
  
  return traceData;
}

/**
 * Parse SVG string and extract path elements
 * @param {string} svgString - SVG string
 * @returns {Array<{d: string, fill: string, stroke: string}>} Array of path objects
 */
export function extractPathsFromSvg(svgString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const paths = doc.querySelectorAll('path');
  
  const result = [];
  
  paths.forEach(path => {
    const d = path.getAttribute('d');
    const fill = path.getAttribute('fill') || 'none';
    const stroke = path.getAttribute('stroke') || 'none';
    const strokeWidth = path.getAttribute('stroke-width') || '1';
    const opacity = path.getAttribute('opacity') || '1';
    
    if (d) {
      result.push({
        d,
        fill,
        stroke,
        strokeWidth: parseFloat(strokeWidth),
        opacity: parseFloat(opacity),
      });
    }
  });
  
  return result;
}

/**
 * Complete trace workflow: load image, trace, return paths
 * @param {File|string|Object} source - Image file, URL, or Fabric image object
 * @param {string} preset - Preset name
 * @param {Object} customOptions - Custom options
 * @returns {Promise<{svgString: string, paths: Array, width: number, height: number}>}
 */
export async function traceImage(source, preset = 'default', customOptions = {}) {
  let imageInfo;
  
  if (source instanceof File) {
    imageInfo = await loadImageFromFile(source);
  } else if (typeof source === 'string') {
    imageInfo = await loadImageFromUrl(source);
  } else if (source && source._element) {
    imageInfo = await loadImageFromFabricObject(source);
  } else {
    throw new Error('Invalid image source');
  }
  
  const { imageData, width, height } = imageInfo;
  
  const svgString = traceImageToSvg(imageData, preset, customOptions);
  const paths = extractPathsFromSvg(svgString);
  
  return {
    svgString,
    paths,
    width,
    height,
  };
}

export default {
  TRACE_PRESETS,
  loadImageFromFile,
  loadImageFromUrl,
  loadImageFromFabricObject,
  traceImageToSvg,
  traceImageToPaths,
  extractPathsFromSvg,
  traceImage,
};
