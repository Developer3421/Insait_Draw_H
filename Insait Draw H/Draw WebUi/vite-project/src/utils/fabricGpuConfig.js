/**
 * Fabric.js GPU Acceleration Configuration
 * Optimizes performance for large operations like image tracing grouping
 * Supports AMD, Intel, and NVIDIA GPUs with memory leak prevention
 */

import * as fabric from 'fabric';

// RequestIdleCallback polyfill for browsers that don't support it
const requestIdleCallback = window.requestIdleCallback || 
  function(callback, options) {
    const start = Date.now();
    return setTimeout(() => {
      callback({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
      });
    }, options?.timeout || 1);
  };

const cancelIdleCallback = window.cancelIdleCallback ||
  function(id) {
    clearTimeout(id);
  };

// GPU-specific texture size limits to prevent memory leaks
const GPU_TEXTURE_LIMITS = {
  // NVIDIA GPUs - typically handle larger textures well
  nvidia: {
    textureSize: 4096,
    perfLimitSizeTotal: 4194304, // 4Mpx
    maxCacheSideLimit: 4096,
  },
  // AMD GPUs - some older models have issues with large textures
  amd: {
    textureSize: 2048,
    perfLimitSizeTotal: 2097152, // 2Mpx
    maxCacheSideLimit: 2048,
  },
  // Intel integrated GPUs - more conservative limits
  intel: {
    textureSize: 2048,
    perfLimitSizeTotal: 1572864, // 1.5Mpx
    maxCacheSideLimit: 2048,
  },
  // Default/unknown GPUs - safe conservative limits
  default: {
    textureSize: 2048,
    perfLimitSizeTotal: 2097152, // 2Mpx
    maxCacheSideLimit: 2048,
  },
};

// Detect GPU vendor from WebGL context
function detectGPU() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
      console.warn('[FabricGPU] WebGL not available, using default settings');
      return { vendor: 'default', renderer: 'unknown', isWebGLAvailable: false };
    }
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    let vendor = 'default';
    let renderer = 'unknown';
    
    if (debugInfo) {
      renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
      const vendorString = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
      
      const rendererLower = renderer.toLowerCase();
      const vendorLower = vendorString.toLowerCase();
      
      if (rendererLower.includes('nvidia') || vendorLower.includes('nvidia')) {
        vendor = 'nvidia';
      } else if (rendererLower.includes('amd') || rendererLower.includes('radeon') || 
                 vendorLower.includes('amd') || vendorLower.includes('ati')) {
        vendor = 'amd';
      } else if (rendererLower.includes('intel') || vendorLower.includes('intel')) {
        vendor = 'intel';
      }
    }
    
    // Check WebGL capabilities
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const maxViewportDims = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
    
    // Cleanup
    const loseContext = gl.getExtension('WEBGL_lose_context');
    if (loseContext) {
      loseContext.loseContext();
    }
    canvas.width = 1;
    canvas.height = 1;
    
    return {
      vendor,
      renderer,
      isWebGLAvailable: true,
      maxTextureSize,
      maxViewportDims,
    };
  } catch (e) {
    console.error('[FabricGPU] Error detecting GPU:', e);
    return { vendor: 'default', renderer: 'unknown', isWebGLAvailable: false };
  }
}

// WebGL context tracking for memory leak prevention
const webGLContexts = new WeakMap();
let totalContextCount = 0;
const MAX_CONTEXTS = 8; // Browser limit is usually 8-16

function trackWebGLContext(canvas, gl) {
  if (gl) {
    webGLContexts.set(canvas, gl);
    totalContextCount++;
  }
}

function releaseWebGLContext(canvas) {
  const gl = webGLContexts.get(canvas);
  if (gl) {
    // Properly release WebGL resources
    const loseContext = gl.getExtension('WEBGL_lose_context');
    if (loseContext) {
      loseContext.loseContext();
    }
    webGLContexts.delete(canvas);
    totalContextCount--;
  }
}

// Texture cache management
const textureCache = new Map();
const MAX_TEXTURE_CACHE_SIZE = 50;
const TEXTURE_CACHE_TTL = 60000; // 60 seconds

function cleanupTextureCache() {
  const now = Date.now();
  const toDelete = [];
  
  textureCache.forEach((value, key) => {
    if (now - value.timestamp > TEXTURE_CACHE_TTL) {
      toDelete.push(key);
    }
  });
  
  toDelete.forEach(key => {
    const entry = textureCache.get(key);
    if (entry && entry.texture && entry.gl) {
      try {
        entry.gl.deleteTexture(entry.texture);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    textureCache.delete(key);
  });
  
  // If still over limit, remove oldest entries
  if (textureCache.size > MAX_TEXTURE_CACHE_SIZE) {
    const entries = Array.from(textureCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toRemove = entries.slice(0, textureCache.size - MAX_TEXTURE_CACHE_SIZE);
    toRemove.forEach(([key, entry]) => {
      if (entry.texture && entry.gl) {
        try {
          entry.gl.deleteTexture(entry.texture);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      textureCache.delete(key);
    });
  }
}

// Configure Fabric.js for GPU acceleration
export function configureFabricGPU() {
  const gpuInfo = detectGPU();
  const limits = GPU_TEXTURE_LIMITS[gpuInfo.vendor] || GPU_TEXTURE_LIMITS.default;
  
  console.log(`[FabricGPU] Detected GPU: ${gpuInfo.renderer} (${gpuInfo.vendor})`);
  console.log(`[FabricGPU] WebGL available: ${gpuInfo.isWebGLAvailable}`);
  console.log(`[FabricGPU] Applying limits:`, limits);
  
  // Apply safe texture size based on actual GPU capabilities
  let safeTextureSize = limits.textureSize;
  if (gpuInfo.maxTextureSize) {
    safeTextureSize = Math.min(limits.textureSize, gpuInfo.maxTextureSize / 2);
  }
  
  // Configure Fabric.js
  fabric.config.configure({
    // Enable WebGL filtering for GPU acceleration
    enableGLFiltering: gpuInfo.isWebGLAvailable,
    
    // Texture size for WebGL - GPU specific
    textureSize: safeTextureSize,
    
    // Cache limits - GPU specific to prevent memory issues
    perfLimitSizeTotal: limits.perfLimitSizeTotal,
    maxCacheSideLimit: limits.maxCacheSideLimit,
    minCacheSideLimit: 256,
    
    // Performance optimizations
    devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2), // Cap at 2x for performance
    
    // Force putImageData for better compatibility with some GPUs
    forceGLPutImageData: gpuInfo.vendor === 'intel', // Intel iGPUs sometimes need this
  });
  
  // Start texture cache cleanup interval
  setInterval(cleanupTextureCache, 30000); // Every 30 seconds
  
  return {
    gpuInfo,
    limits: {
      ...limits,
      textureSize: safeTextureSize,
    },
  };
}

// Optimized object caching settings for traced paths
export function optimizeObjectForGPU(fabricObject, options = {}) {
  if (!fabricObject) return;
  
  const {
    enableCaching = true,
    noScaleCache = true,
    statefullCache = false,
  } = options;
  
  // Enable object caching for GPU rendering
  fabricObject.objectCaching = enableCaching;
  
  // Don't regenerate cache on scale - improves performance
  fabricObject.noScaleCache = noScaleCache;
  
  // Disable stateful cache comparison for performance
  fabricObject.statefullCache = statefullCache;
  
  // Set cache dimensions based on object complexity
  if (fabricObject.path && fabricObject.path.length > 100) {
    // Complex paths - use smaller cache
    fabricObject.cacheProperties = ['fill', 'stroke', 'strokeWidth'];
  }
  
  // Mark for re-render
  fabricObject.dirty = true;
}

// Batch optimization for multiple objects (like after tracing)
export function optimizeBatchForGPU(objects, canvas) {
  if (!objects || !Array.isArray(objects) || objects.length === 0) return;
  
  // Temporarily disable rendering for batch operations
  const wasRenderOnAddRemove = canvas?.renderOnAddRemove;
  if (canvas) {
    canvas.renderOnAddRemove = false;
  }
  
  // Optimize each object
  objects.forEach(obj => {
    optimizeObjectForGPU(obj, {
      enableCaching: true,
      noScaleCache: true,
      statefullCache: false,
    });
  });
  
  // Restore rendering and do a single render
  if (canvas) {
    canvas.renderOnAddRemove = wasRenderOnAddRemove !== false;
    canvas.requestRenderAll();
  }
}

// Memory-safe group creation for traced paths
export function createOptimizedGroup(objects, canvas, options = {}) {
  if (!objects || objects.length === 0) return null;
  
  const {
    interactive = false,
    subTargetCheck = false,
  } = options;
  
  // Temporarily disable rendering
  const wasRenderOnAddRemove = canvas?.renderOnAddRemove;
  if (canvas) {
    canvas.renderOnAddRemove = false;
  }
  
  try {
    // Optimize objects before grouping
    objects.forEach(obj => {
      optimizeObjectForGPU(obj);
    });
    
    // Create group with optimized settings
    const group = new fabric.Group(objects, {
      interactive,
      subTargetCheck,
      objectCaching: true,
      noScaleCache: true,
      statefullCache: false,
    });
    
    return group;
  } finally {
    // Restore rendering
    if (canvas) {
      canvas.renderOnAddRemove = wasRenderOnAddRemove !== false;
    }
  }
}

// Force cleanup of GPU resources (call when component unmounts)
export function cleanupGPUResources(canvas) {
  // Clean texture cache
  textureCache.forEach((entry, key) => {
    if (entry.texture && entry.gl) {
      try {
        entry.gl.deleteTexture(entry.texture);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });
  textureCache.clear();
  
  // Release WebGL context if canvas provided
  if (canvas) {
    releaseWebGLContext(canvas.lowerCanvasEl);
    releaseWebGLContext(canvas.upperCanvasEl);
  }
  
  // Force garbage collection hint (browser may ignore)
  if (typeof window !== 'undefined' && window.gc) {
    try {
      window.gc();
    } catch (e) {
      // gc not available in most browsers
    }
  }
}

// Deferred rendering utility for heavy operations
// Uses requestIdleCallback to process operations during idle time
export class DeferredRenderer {
  constructor(canvas, batchSize = 10, frameDelay = 16) {
    this.canvas = canvas;
    this.batchSize = batchSize;
    this.frameDelay = frameDelay;
    this.queue = [];
    this.isProcessing = false;
    this.idleCallbackId = null;
    this.useIdleCallback = true; // Can be disabled for immediate processing
  }
  
  add(operation) {
    this.queue.push(operation);
    this.scheduleProcessing();
  }
  
  scheduleProcessing() {
    if (this.isProcessing || this.queue.length === 0) return;
    
    if (this.useIdleCallback) {
      // Use idle callback for non-blocking processing
      this.idleCallbackId = requestIdleCallback(
        (deadline) => this.processWithDeadline(deadline),
        { timeout: 100 } // Fallback timeout
      );
    } else {
      this.processQueue();
    }
  }
  
  async processWithDeadline(deadline) {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    
    // Disable auto-rendering during batch processing
    const wasRenderOnAddRemove = this.canvas?.renderOnAddRemove;
    if (this.canvas) {
      this.canvas.renderOnAddRemove = false;
    }
    
    let processedCount = 0;
    
    // Process operations while we have time remaining
    while (this.queue.length > 0 && (deadline.timeRemaining() > 5 || processedCount < this.batchSize)) {
      const operation = this.queue.shift();
      try {
        await operation();
        processedCount++;
      } catch (e) {
        console.error('[DeferredRenderer] Operation error:', e);
      }
    }
    
    // Render after batch
    if (this.canvas && processedCount > 0) {
      this.canvas.requestRenderAll();
    }
    
    // Continue processing if there are more items
    if (this.queue.length > 0) {
      // Yield to browser then schedule next batch
      await new Promise(resolve => setTimeout(resolve, this.frameDelay));
      this.isProcessing = false;
      this.scheduleProcessing();
    } else {
      // Restore auto-rendering
      if (this.canvas) {
        this.canvas.renderOnAddRemove = wasRenderOnAddRemove !== false;
      }
      this.isProcessing = false;
    }
  }
  
  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    
    // Disable auto-rendering during batch processing
    const wasRenderOnAddRemove = this.canvas?.renderOnAddRemove;
    if (this.canvas) {
      this.canvas.renderOnAddRemove = false;
    }
    
    while (this.queue.length > 0) {
      // Process batch
      const batch = this.queue.splice(0, this.batchSize);
      
      for (const operation of batch) {
        try {
          await operation();
        } catch (e) {
          console.error('[DeferredRenderer] Operation error:', e);
        }
      }
      
      // Yield to browser for UI responsiveness
      await new Promise(resolve => setTimeout(resolve, this.frameDelay));
      
      // Single render after batch
      if (this.canvas) {
        this.canvas.requestRenderAll();
      }
    }
    
    // Restore auto-rendering
    if (this.canvas) {
      this.canvas.renderOnAddRemove = wasRenderOnAddRemove !== false;
    }
    
    this.isProcessing = false;
  }
  
  clear() {
    if (this.idleCallbackId) {
      cancelIdleCallback(this.idleCallbackId);
      this.idleCallbackId = null;
    }
    this.queue = [];
    this.isProcessing = false;
  }
}

// Export GPU detection for external use
export function getGPUInfo() {
  return detectGPU();
}

export default {
  configureFabricGPU,
  optimizeObjectForGPU,
  optimizeBatchForGPU,
  createOptimizedGroup,
  cleanupGPUResources,
  DeferredRenderer,
  getGPUInfo,
};
