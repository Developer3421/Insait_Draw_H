/**
 * Professional Path Editor Utility
 * Provides Bezier curve editing functionality similar to Adobe Illustrator / CorelDRAW
 */

import * as fabric from 'fabric';

const { Circle, Line, Path, Point, util } = fabric;

// Handle colors and styles
export const HANDLE_COLORS = {
  anchor: '#1E90FF',      // Anchor point (main point)
  anchorSelected: '#FF4500',  // Selected anchor point
  controlPoint: '#8A2BE2',    // Control point (bezier handle)
  controlLine: 'rgba(138, 43, 226, 0.5)',  // Line connecting anchor to control point
  hoverAnchor: '#FFD700',     // Hover state
};

export const HANDLE_SIZES = {
  anchorRadius: 5,
  controlRadius: 4,
  controlLineWidth: 1,
  hitTolerance: 8,  // Click tolerance for selecting points
};

/**
 * Parses path data and extracts all points with their types
 * @param {Path} pathObject - Fabric.js Path object
 * @returns {Array} Array of point objects with coordinates and types
 */
export function parsePathPoints(pathObject) {
  if (!pathObject || !pathObject.path) return [];
  
  const pathData = pathObject.path;
  const points = [];
  const matrix = pathObject.calcTransformMatrix();
  
  let currentX = 0;
  let currentY = 0;
  
  pathData.forEach((cmd, cmdIndex) => {
    if (!cmd || cmd.length === 0) return;
    
    const type = cmd[0];
    
    switch (type) {
      case 'M': {
        // Move to absolute
        const transformed = new Point(cmd[1], cmd[2]).transform(matrix);
        points.push({
          type: 'anchor',
          x: transformed.x,
          y: transformed.y,
          cmdIndex,
          cmdType: 'M',
          localX: cmd[1],
          localY: cmd[2],
        });
        currentX = cmd[1];
        currentY = cmd[2];
        break;
      }
      
      case 'L': {
        // Line to absolute
        const transformed = new Point(cmd[1], cmd[2]).transform(matrix);
        points.push({
          type: 'anchor',
          x: transformed.x,
          y: transformed.y,
          cmdIndex,
          cmdType: 'L',
          localX: cmd[1],
          localY: cmd[2],
        });
        currentX = cmd[1];
        currentY = cmd[2];
        break;
      }
      
      case 'Q': {
        // Quadratic Bezier curve
        // Control point
        const cp = new Point(cmd[1], cmd[2]).transform(matrix);
        // End point
        const ep = new Point(cmd[3], cmd[4]).transform(matrix);
        
        points.push({
          type: 'control',
          x: cp.x,
          y: cp.y,
          cmdIndex,
          cmdType: 'Q',
          paramIndex: 1,  // cmd[1], cmd[2]
          localX: cmd[1],
          localY: cmd[2],
          parentAnchorIndex: points.length + 1,  // Next point is the anchor
        });
        
        points.push({
          type: 'anchor',
          x: ep.x,
          y: ep.y,
          cmdIndex,
          cmdType: 'Q',
          paramIndex: 3,  // cmd[3], cmd[4]
          localX: cmd[3],
          localY: cmd[4],
          controlPointIndex: points.length - 1,  // Previous point is the control
        });
        
        currentX = cmd[3];
        currentY = cmd[4];
        break;
      }
      
      case 'C': {
        // Cubic Bezier curve
        // First control point
        const cp1 = new Point(cmd[1], cmd[2]).transform(matrix);
        // Second control point
        const cp2 = new Point(cmd[3], cmd[4]).transform(matrix);
        // End point
        const ep = new Point(cmd[5], cmd[6]).transform(matrix);
        
        // Control point 1 belongs to previous anchor
        points.push({
          type: 'control',
          x: cp1.x,
          y: cp1.y,
          cmdIndex,
          cmdType: 'C',
          paramIndex: 1,
          localX: cmd[1],
          localY: cmd[2],
          isOutgoing: true,  // Outgoing from previous anchor
        });
        
        // Control point 2 belongs to end anchor
        points.push({
          type: 'control',
          x: cp2.x,
          y: cp2.y,
          cmdIndex,
          cmdType: 'C',
          paramIndex: 3,
          localX: cmd[3],
          localY: cmd[4],
          isIncoming: true,  // Incoming to next anchor
          parentAnchorIndex: points.length + 1,
        });
        
        // End anchor
        points.push({
          type: 'anchor',
          x: ep.x,
          y: ep.y,
          cmdIndex,
          cmdType: 'C',
          paramIndex: 5,
          localX: cmd[5],
          localY: cmd[6],
          controlPointIndex: points.length - 1,  // Previous point is incoming control
        });
        
        currentX = cmd[5];
        currentY = cmd[6];
        break;
      }
      
      case 'Z':
      case 'z': {
        // Close path - no point to add
        break;
      }
    }
  });
  
  return points;
}

/**
 * Creates visual handles for editing a path
 * @param {Object} canvas - Fabric.js canvas
 * @param {Path} pathObject - Path to edit
 * @returns {Object} Object containing handles array and cleanup function
 */
export function createPathEditHandles(canvas, pathObject) {
  if (!canvas || !pathObject) return { handles: [], cleanup: () => {} };
  
  const points = parsePathPoints(pathObject);
  const handles = [];
  const controlLines = [];
  
  // First pass: create anchors and store their positions
  const anchorHandles = new Map();
  
  points.forEach((point, index) => {
    if (point.type === 'anchor') {
      const handle = new Circle({
        left: point.x,
        top: point.y,
        radius: HANDLE_SIZES.anchorRadius,
        fill: HANDLE_COLORS.anchor,
        stroke: '#FFFFFF',
        strokeWidth: 2,
        originX: 'center',
        originY: 'center',
        selectable: true,
        evented: true,
        hasControls: false,
        hasBorders: false,
        hoverCursor: 'pointer',
        moveCursor: 'move',
      });
      
      handle.pointData = {
        ...point,
        index,
        pathObject,
        handleType: 'anchor',
      };
      
      anchorHandles.set(index, handle);
      handles.push(handle);
    }
  });
  
  // Second pass: create control points and their lines
  points.forEach((point, index) => {
    if (point.type === 'control') {
      const handle = new Circle({
        left: point.x,
        top: point.y,
        radius: HANDLE_SIZES.controlRadius,
        fill: HANDLE_COLORS.controlPoint,
        stroke: '#FFFFFF',
        strokeWidth: 1.5,
        originX: 'center',
        originY: 'center',
        selectable: true,
        evented: true,
        hasControls: false,
        hasBorders: false,
        hoverCursor: 'pointer',
        moveCursor: 'move',
      });
      
      handle.pointData = {
        ...point,
        index,
        pathObject,
        handleType: 'control',
      };
      
      // Find the anchor this control point belongs to
      let anchorIndex = point.parentAnchorIndex;
      
      // If not specified, find the nearest anchor
      if (anchorIndex === undefined) {
        // Look for the previous anchor
        for (let i = index - 1; i >= 0; i--) {
          if (points[i].type === 'anchor') {
            anchorIndex = i;
            break;
          }
        }
      }
      
      // Create line from anchor to control point
      if (anchorIndex !== undefined && anchorHandles.has(anchorIndex)) {
        const anchorHandle = anchorHandles.get(anchorIndex);
        const line = new Line([anchorHandle.left, anchorHandle.top, point.x, point.y], {
          stroke: HANDLE_COLORS.controlLine,
          strokeWidth: HANDLE_SIZES.controlLineWidth,
          selectable: false,
          evented: false,
          strokeDashArray: [4, 4],
        });
        
        line.controlData = {
          anchorHandle,
          controlHandle: handle,
        };
        
        controlLines.push(line);
        handle.pointData.anchorHandle = anchorHandle;
        handle.pointData.controlLine = line;
      }
      
      handles.push(handle);
    }
  });
  
  // Add all elements to canvas (lines first, then handles on top)
  controlLines.forEach(line => canvas.add(line));
  handles.forEach(handle => canvas.add(handle));
  
  // Disable normal selection on the path being edited
  pathObject.set({
    selectable: false,
    evented: false,
    hasControls: false,
    hasBorders: true,
    borderColor: HANDLE_COLORS.anchor,
    borderDashArray: [5, 5],
  });
  
  canvas.renderAll();
  
  // Return cleanup function
  const cleanup = () => {
    controlLines.forEach(line => canvas.remove(line));
    handles.forEach(handle => canvas.remove(handle));
    
    // Restore path selection
    pathObject.set({
      selectable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
      borderColor: undefined,
      borderDashArray: undefined,
    });
    
    canvas.renderAll();
  };
  
  return { handles, controlLines, cleanup };
}

/**
 * Updates path data when a point is moved
 * @param {Object} handle - The handle that was moved
 * @param {Object} canvas - Fabric.js canvas
 */
export function updatePathPoint(handle, canvas) {
  if (!handle || !handle.pointData || !canvas) return;
  
  const { pathObject, cmdIndex, cmdType, paramIndex } = handle.pointData;
  if (!pathObject || !pathObject.path) return;
  
  // Get inverse transform matrix
  const matrix = pathObject.calcTransformMatrix();
  const invMatrix = util.invertTransform(matrix);
  
  // Transform handle position back to local path coordinates
  const localPoint = new Point(handle.left, handle.top).transform(invMatrix);
  
  // Update the path command
  const cmd = pathObject.path[cmdIndex];
  if (!cmd) return;
  
  // Determine which parameters to update based on command type and parameter index
  if (paramIndex !== undefined) {
    cmd[paramIndex] = localPoint.x;
    cmd[paramIndex + 1] = localPoint.y;
  } else if (cmdType === 'M' || cmdType === 'L') {
    cmd[1] = localPoint.x;
    cmd[2] = localPoint.y;
  }
  
  // Mark path as dirty and recalculate - use setCoords() instead of deprecated _setPositionDimensions
  pathObject.set({ dirty: true });
  pathObject.setCoords();
  
  // Update control line if this is a control point
  if (handle.pointData.controlLine && handle.pointData.anchorHandle) {
    const line = handle.pointData.controlLine;
    const anchor = handle.pointData.anchorHandle;
    line.set({
      x1: anchor.left,
      y1: anchor.top,
      x2: handle.left,
      y2: handle.top,
    });
  }
  
  canvas.renderAll();
}

/**
 * Converts a corner point to a smooth point by adding control handles
 * @param {Object} handle - The anchor handle to convert
 * @param {Object} canvas - Fabric.js canvas
 */
export function convertToSmooth(handle, canvas) {
  // TODO: Implement smooth point conversion
  console.log('Convert to smooth not yet implemented');
}

/**
 * Converts a smooth point to a corner point by removing control handles
 * @param {Object} handle - The anchor handle to convert
 * @param {Object} canvas - Fabric.js canvas
 */
export function convertToCorner(handle, canvas) {
  // TODO: Implement corner point conversion
  console.log('Convert to corner not yet implemented');
}

/**
 * Adds a new anchor point to a path at the specified location
 * @param {Path} pathObject - Path to modify
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} segmentIndex - Index of the segment to add point to
 * @param {Object} canvas - Fabric.js canvas
 */
export function addAnchorPoint(pathObject, x, y, segmentIndex, canvas) {
  // TODO: Implement anchor point addition
  console.log('Add anchor point not yet implemented');
}

/**
 * Removes an anchor point from a path
 * @param {Object} handle - The anchor handle to remove
 * @param {Object} canvas - Fabric.js canvas
 */
export function removeAnchorPoint(handle, canvas) {
  // TODO: Implement anchor point removal
  console.log('Remove anchor point not yet implemented');
}

/**
 * Creates smooth bezier path from array of points
 * Uses Catmull-Rom spline interpolation for natural curves
 * @param {Array} points - Array of {x, y} points
 * @param {boolean} closed - Whether path should be closed
 * @returns {string} SVG path data
 */
export function createSmoothPath(points, closed = false) {
  if (!points || points.length < 2) return '';
  
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }
  
  const tension = 0.3;  // Adjusts curvature (0 = straight, 1 = very curvy)
  
  let pathData = `M ${points[0].x} ${points[0].y}`;
  
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? (closed ? points.length - 1 : 0) : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 >= points.length ? (closed ? (i + 2) % points.length : points.length - 1) : i + 2];
    
    // Calculate control points using Catmull-Rom to Bezier conversion
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;
    
    pathData += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`;
  }
  
  if (closed) {
    pathData += ' Z';
  }
  
  return pathData;
}

/**
 * Creates a cubic bezier path from points with explicit control handles
 * @param {Array} points - Array of point objects with anchor and control handle info
 * @returns {string} SVG path data
 */
export function createBezierPath(points) {
  if (!points || points.length < 1) return '';
  
  let pathData = `M ${points[0].x} ${points[0].y}`;
  
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    
    // If points have control handles, use cubic bezier
    if (prev.controlOut && curr.controlIn) {
      pathData += ` C ${prev.controlOut.x} ${prev.controlOut.y} ${curr.controlIn.x} ${curr.controlIn.y} ${curr.x} ${curr.y}`;
    } else if (prev.controlOut) {
      // Quadratic bezier with single control point
      pathData += ` Q ${prev.controlOut.x} ${prev.controlOut.y} ${curr.x} ${curr.y}`;
    } else if (curr.controlIn) {
      // Quadratic bezier with single control point
      pathData += ` Q ${curr.controlIn.x} ${curr.controlIn.y} ${curr.x} ${curr.y}`;
    } else {
      // Straight line
      pathData += ` L ${curr.x} ${curr.y}`;
    }
  }
  
  return pathData;
}

export default {
  parsePathPoints,
  createPathEditHandles,
  updatePathPoint,
  convertToSmooth,
  convertToCorner,
  addAnchorPoint,
  removeAnchorPoint,
  createSmoothPath,
  createBezierPath,
  HANDLE_COLORS,
  HANDLE_SIZES,
};
