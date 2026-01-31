/**
 * Artboard/Page Manager
 * Creates and manages the page (artboard) in the center of the canvas workspace
 * Similar to CorelDRAW's page concept
 */

import { useCallback, useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import { useEditorStore, THEME_COLORS } from '../stores/editorStore';

const { Rect, Shadow } = fabric;

// Page settings
const PAGE_SHADOW_OFFSET = 8;
const PAGE_SHADOW_BLUR = 15;

/**
 * Hook for managing the artboard/page in the canvas
 */
export function useArtboard() {
  const pageRectRef = useRef(null);
  const shadowRectRef = useRef(null);
  const isInitialized = useRef(false);
  
  const canvas = useEditorStore((state) => state.canvas);
  const pageSettings = useEditorStore((state) => state.pageSettings);
  const setPageObject = useEditorStore((state) => state.setPageObject);
  
  /**
   * Creates the page rectangle on the canvas
   */
  const createPage = useCallback(() => {
    if (!canvas || isInitialized.current) return;
    
    const { width, height } = pageSettings;
    
    // Get canvas dimensions
    const canvasWidth = canvas.getWidth();
    const canvasHeight = canvas.getHeight();
    
    // Center the page in the canvas
    const left = (canvasWidth - width) / 2;
    const top = (canvasHeight - height) / 2;
    
    // Create shadow rectangle (under the page)
    const shadowRect = new Rect({
      left: left + PAGE_SHADOW_OFFSET,
      top: top + PAGE_SHADOW_OFFSET,
      width: width,
      height: height,
      fill: THEME_COLORS.pageShadow,
      selectable: false,
      evented: false,
      excludeFromExport: true,
      data: { type: 'page-shadow', isPageElement: true },
    });
    
    // Create page rectangle
    const pageRect = new Rect({
      left: left,
      top: top,
      width: width,
      height: height,
      fill: THEME_COLORS.page,
      stroke: '#CCCCCC',
      strokeWidth: 1,
      selectable: false,
      evented: false,
      excludeFromExport: true,
      data: { type: 'page', isPageElement: true },
    });
    
    // Add to canvas - shadow first, then page
    canvas.add(shadowRect);
    canvas.add(pageRect);
    
    // Send to back (below all other objects)
    canvas.sendObjectToBack(pageRect);
    canvas.sendObjectToBack(shadowRect);
    
    // Store references
    shadowRectRef.current = shadowRect;
    pageRectRef.current = pageRect;
    setPageObject(pageRect);
    
    isInitialized.current = true;
    
    canvas.renderAll();
  }, [canvas, pageSettings, setPageObject]);
  
  /**
   * Updates the page size and position
   */
  const updatePage = useCallback(() => {
    if (!canvas || !pageRectRef.current || !shadowRectRef.current) return;
    
    const { width, height } = pageSettings;
    
    // Get canvas dimensions
    const canvasWidth = canvas.getWidth();
    const canvasHeight = canvas.getHeight();
    
    // Center the page
    const left = (canvasWidth - width) / 2;
    const top = (canvasHeight - height) / 2;
    
    // Update page rectangle
    pageRectRef.current.set({
      left: left,
      top: top,
      width: width,
      height: height,
    });
    pageRectRef.current.setCoords();
    
    // Update shadow rectangle
    shadowRectRef.current.set({
      left: left + PAGE_SHADOW_OFFSET,
      top: top + PAGE_SHADOW_OFFSET,
      width: width,
      height: height,
    });
    shadowRectRef.current.setCoords();
    
    // Ensure they stay at the back
    canvas.sendObjectToBack(pageRectRef.current);
    canvas.sendObjectToBack(shadowRectRef.current);
    
    canvas.renderAll();
  }, [canvas, pageSettings]);
  
  /**
   * Gets the page bounds in canvas coordinates
   */
  const getPageBounds = useCallback(() => {
    if (!pageRectRef.current) {
      const canvas = useEditorStore.getState().canvas;
      const pageSettings = useEditorStore.getState().pageSettings;
      if (!canvas) return { left: 0, top: 0, width: 800, height: 600 };
      
      const canvasWidth = canvas.getWidth();
      const canvasHeight = canvas.getHeight();
      const { width, height } = pageSettings;
      
      return {
        left: (canvasWidth - width) / 2,
        top: (canvasHeight - height) / 2,
        width: width,
        height: height,
        right: (canvasWidth - width) / 2 + width,
        bottom: (canvasHeight - height) / 2 + height,
        centerX: canvasWidth / 2,
        centerY: canvasHeight / 2,
      };
    }
    
    const page = pageRectRef.current;
    return {
      left: page.left,
      top: page.top,
      width: page.width,
      height: page.height,
      right: page.left + page.width,
      bottom: page.top + page.height,
      centerX: page.left + page.width / 2,
      centerY: page.top + page.height / 2,
    };
  }, []);
  
  /**
   * Centers the viewport on the page and sets zoom to 100%
   */
  const zoomToPage = useCallback((fitToView = false) => {
    if (!canvas) return;
    
    const pageBounds = getPageBounds();
    const canvasWidth = canvas.getWidth();
    const canvasHeight = canvas.getHeight();
    
    if (fitToView) {
      // Calculate zoom to fit the page in the viewport with some padding
      const padding = 40;
      const zoomX = (canvasWidth - padding * 2) / pageBounds.width;
      const zoomY = (canvasHeight - padding * 2) / pageBounds.height;
      const zoom = Math.min(zoomX, zoomY, 2); // Max zoom 2x for fit
      
      // Calculate center offset
      const vpt = canvas.viewportTransform.slice();
      vpt[0] = zoom;
      vpt[3] = zoom;
      vpt[4] = canvasWidth / 2 - pageBounds.centerX * zoom;
      vpt[5] = canvasHeight / 2 - pageBounds.centerY * zoom;
      
      canvas.setViewportTransform(vpt);
      useEditorStore.getState().setZoom(zoom);
    } else {
      // Zoom to 100% and center on page
      const zoom = 1;
      const vpt = [1, 0, 0, 1, 0, 0];
      vpt[4] = canvasWidth / 2 - pageBounds.centerX;
      vpt[5] = canvasHeight / 2 - pageBounds.centerY;
      
      canvas.setViewportTransform(vpt);
      useEditorStore.getState().setZoom(zoom);
    }
    
    canvas.requestRenderAll();
  }, [canvas, getPageBounds]);
  
  // Initialize page when canvas is ready
  useEffect(() => {
    if (canvas && !isInitialized.current) {
      // Small delay to ensure canvas is fully ready
      const timer = setTimeout(() => {
        createPage();
        // Initial zoom to fit page
        setTimeout(() => zoomToPage(true), 100);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [canvas, createPage, zoomToPage]);
  
  // Update page when settings change
  useEffect(() => {
    if (isInitialized.current) {
      updatePage();
    }
  }, [pageSettings, updatePage]);
  
  // Handle canvas resize
  useEffect(() => {
    if (!canvas) return;
    
    const handleResize = () => {
      if (isInitialized.current) {
        updatePage();
      }
    };
    
    // Listen for canvas resize
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [canvas, updatePage]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (canvas && pageRectRef.current) {
        canvas.remove(pageRectRef.current);
        canvas.remove(shadowRectRef.current);
        pageRectRef.current = null;
        shadowRectRef.current = null;
        isInitialized.current = false;
      }
    };
  }, []);
  
  return {
    createPage,
    updatePage,
    getPageBounds,
    zoomToPage,
    pageRect: pageRectRef.current,
  };
}

/**
 * External function to get page bounds (for use outside React components)
 */
export function getPageBounds() {
  const { canvas, pageSettings, pageObject } = useEditorStore.getState();
  
  if (pageObject) {
    return {
      left: pageObject.left,
      top: pageObject.top,
      width: pageObject.width,
      height: pageObject.height,
      right: pageObject.left + pageObject.width,
      bottom: pageObject.top + pageObject.height,
      centerX: pageObject.left + pageObject.width / 2,
      centerY: pageObject.top + pageObject.height / 2,
    };
  }
  
  if (!canvas) {
    return {
      left: 0,
      top: 0,
      width: pageSettings.width,
      height: pageSettings.height,
      right: pageSettings.width,
      bottom: pageSettings.height,
      centerX: pageSettings.width / 2,
      centerY: pageSettings.height / 2,
    };
  }
  
  const canvasWidth = canvas.getWidth();
  const canvasHeight = canvas.getHeight();
  const { width, height } = pageSettings;
  
  return {
    left: (canvasWidth - width) / 2,
    top: (canvasHeight - height) / 2,
    width: width,
    height: height,
    right: (canvasWidth - width) / 2 + width,
    bottom: (canvasHeight - height) / 2 + height,
    centerX: canvasWidth / 2,
    centerY: canvasHeight / 2,
  };
}

/**
 * Centers viewport on page with 100% zoom
 */
export function zoomToPage100() {
  const { canvas, pageSettings, pageObject } = useEditorStore.getState();
  if (!canvas) return;
  
  const pageBounds = getPageBounds();
  const canvasWidth = canvas.getWidth();
  const canvasHeight = canvas.getHeight();
  
  const zoom = 1;
  const vpt = [1, 0, 0, 1, 0, 0];
  vpt[4] = canvasWidth / 2 - pageBounds.centerX;
  vpt[5] = canvasHeight / 2 - pageBounds.centerY;
  
  canvas.setViewportTransform(vpt);
  useEditorStore.getState().setZoom(zoom);
  canvas.requestRenderAll();
}

/**
 * Zooms to fit page in viewport
 */
export function zoomToFitPage() {
  const { canvas } = useEditorStore.getState();
  if (!canvas) return;
  
  const pageBounds = getPageBounds();
  const canvasWidth = canvas.getWidth();
  const canvasHeight = canvas.getHeight();
  
  const padding = 40;
  const zoomX = (canvasWidth - padding * 2) / pageBounds.width;
  const zoomY = (canvasHeight - padding * 2) / pageBounds.height;
  const zoom = Math.min(zoomX, zoomY, 2);
  
  const vpt = canvas.viewportTransform.slice();
  vpt[0] = zoom;
  vpt[3] = zoom;
  vpt[4] = canvasWidth / 2 - pageBounds.centerX * zoom;
  vpt[5] = canvasHeight / 2 - pageBounds.centerY * zoom;
  
  canvas.setViewportTransform(vpt);
  useEditorStore.getState().setZoom(zoom);
  canvas.requestRenderAll();
}

export default useArtboard;
