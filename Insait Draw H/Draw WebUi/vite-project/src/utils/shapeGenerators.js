/**
 * Professional Shape Generators for Insait Draw H
 * Генератори професійних фігур як в CorelDRAW / Adobe Illustrator
 */

/**
 * Generate a star shape
 * @param {number} cx - Center X
 * @param {number} cy - Center Y
 * @param {number} outerRadius - Outer radius (tips of star)
 * @param {number} innerRadius - Inner radius (inner points)
 * @param {number} points - Number of star points
 * @returns {string} SVG path data
 */
export function generateStarPath(cx, cy, outerRadius, innerRadius, points = 5) {
  const step = Math.PI / points;
  let path = '';
  
  for (let i = 0; i < 2 * points; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = i * step - Math.PI / 2; // Start from top
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    
    if (i === 0) {
      path = `M ${x} ${y}`;
    } else {
      path += ` L ${x} ${y}`;
    }
  }
  path += ' Z';
  
  return path;
}

/**
 * Generate a regular polygon
 * @param {number} cx - Center X
 * @param {number} cy - Center Y  
 * @param {number} radius - Radius
 * @param {number} sides - Number of sides
 * @returns {string} SVG path data
 */
export function generatePolygonPath(cx, cy, radius, sides = 6) {
  let path = '';
  const step = (2 * Math.PI) / sides;
  
  for (let i = 0; i < sides; i++) {
    const angle = i * step - Math.PI / 2; // Start from top
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    
    if (i === 0) {
      path = `M ${x} ${y}`;
    } else {
      path += ` L ${x} ${y}`;
    }
  }
  path += ' Z';
  
  return path;
}

/**
 * Generate an ellipse path
 * @param {number} cx - Center X
 * @param {number} cy - Center Y
 * @param {number} rx - Horizontal radius
 * @param {number} ry - Vertical radius
 * @returns {string} SVG path data
 */
export function generateEllipsePath(cx, cy, rx, ry) {
  // Create ellipse using bezier curves (approximation)
  const kappa = 0.5522848; // 4 * (sqrt(2) - 1) / 3
  const ox = rx * kappa;
  const oy = ry * kappa;
  
  return `M ${cx - rx} ${cy}
    C ${cx - rx} ${cy - oy} ${cx - ox} ${cy - ry} ${cx} ${cy - ry}
    C ${cx + ox} ${cy - ry} ${cx + rx} ${cy - oy} ${cx + rx} ${cy}
    C ${cx + rx} ${cy + oy} ${cx + ox} ${cy + ry} ${cx} ${cy + ry}
    C ${cx - ox} ${cy + ry} ${cx - rx} ${cy + oy} ${cx - rx} ${cy}
    Z`;
}

/**
 * Generate an arrow shape
 * @param {number} x1 - Start X
 * @param {number} y1 - Start Y
 * @param {number} x2 - End X
 * @param {number} y2 - End Y
 * @param {number} headLength - Arrow head length
 * @param {number} headWidth - Arrow head width
 * @param {number} shaftWidth - Arrow shaft width
 * @returns {string} SVG path data
 */
export function generateArrowPath(x1, y1, x2, y2, headLength = 30, headWidth = 20, shaftWidth = 8) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  if (length < headLength) {
    // Too short, just draw triangle head
    return generateTrianglePath(x1, y1, x2, y2, headWidth);
  }
  
  // Normalize direction
  const nx = dx / length;
  const ny = dy / length;
  
  // Perpendicular direction
  const px = -ny;
  const py = nx;
  
  // Arrow head base point
  const hx = x2 - nx * headLength;
  const hy = y2 - ny * headLength;
  
  // Calculate points
  const shaftHalf = shaftWidth / 2;
  const headHalf = headWidth / 2;
  
  return `M ${x1 + px * shaftHalf} ${y1 + py * shaftHalf}
    L ${hx + px * shaftHalf} ${hy + py * shaftHalf}
    L ${hx + px * headHalf} ${hy + py * headHalf}
    L ${x2} ${y2}
    L ${hx - px * headHalf} ${hy - py * headHalf}
    L ${hx - px * shaftHalf} ${hy - py * shaftHalf}
    L ${x1 - px * shaftHalf} ${y1 - py * shaftHalf}
    Z`;
}

function generateTrianglePath(x1, y1, x2, y2, width) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  const nx = dx / length;
  const ny = dy / length;
  const px = -ny;
  const py = nx;
  
  const half = width / 2;
  
  return `M ${x1 + px * half} ${y1 + py * half}
    L ${x2} ${y2}
    L ${x1 - px * half} ${y1 - py * half}
    Z`;
}

/**
 * Generate an Archimedean spiral
 * @param {number} cx - Center X
 * @param {number} cy - Center Y
 * @param {number} startRadius - Starting radius
 * @param {number} endRadius - Ending radius
 * @param {number} turns - Number of turns
 * @param {number} segments - Number of segments per turn
 * @returns {string} SVG path data
 */
export function generateSpiralPath(cx, cy, startRadius, endRadius, turns = 3, segments = 36) {
  const totalSegments = turns * segments;
  const radiusStep = (endRadius - startRadius) / totalSegments;
  const angleStep = (2 * Math.PI) / segments;
  
  let path = '';
  
  for (let i = 0; i <= totalSegments; i++) {
    const radius = startRadius + i * radiusStep;
    const angle = i * angleStep - Math.PI / 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    
    if (i === 0) {
      path = `M ${x} ${y}`;
    } else {
      // Use quadratic curve for smoother spiral
      const prevRadius = startRadius + (i - 1) * radiusStep;
      const prevAngle = (i - 1) * angleStep - Math.PI / 2;
      const midAngle = (prevAngle + angle) / 2;
      const midRadius = (prevRadius + radius) / 2;
      const cx1 = cx + midRadius * 1.1 * Math.cos(midAngle);
      const cy1 = cy + midRadius * 1.1 * Math.sin(midAngle);
      
      path += ` Q ${cx1} ${cy1} ${x} ${y}`;
    }
  }
  
  return path;
}

/**
 * Generate a heart shape
 * @param {number} cx - Center X
 * @param {number} cy - Center Y
 * @param {number} size - Heart size
 * @returns {string} SVG path data
 */
export function generateHeartPath(cx, cy, size) {
  const s = size / 2;
  
  // Heart using cubic bezier curves
  return `M ${cx} ${cy + s * 0.7}
    C ${cx - s * 0.1} ${cy + s * 0.5} ${cx - s * 0.5} ${cy + s * 0.2} ${cx - s * 0.5} ${cy - s * 0.1}
    C ${cx - s * 0.5} ${cy - s * 0.5} ${cx - s * 0.2} ${cy - s * 0.7} ${cx} ${cy - s * 0.4}
    C ${cx + s * 0.2} ${cy - s * 0.7} ${cx + s * 0.5} ${cy - s * 0.5} ${cx + s * 0.5} ${cy - s * 0.1}
    C ${cx + s * 0.5} ${cy + s * 0.2} ${cx + s * 0.1} ${cy + s * 0.5} ${cx} ${cy + s * 0.7}
    Z`;
}

/**
 * Generate a rounded rectangle path
 * @param {number} x - Left position
 * @param {number} y - Top position
 * @param {number} width - Width
 * @param {number} height - Height
 * @param {number} radius - Corner radius
 * @returns {string} SVG path data
 */
export function generateRoundedRectPath(x, y, width, height, radius) {
  // Limit radius to half of smallest dimension
  const r = Math.min(radius, width / 2, height / 2);
  
  return `M ${x + r} ${y}
    L ${x + width - r} ${y}
    Q ${x + width} ${y} ${x + width} ${y + r}
    L ${x + width} ${y + height - r}
    Q ${x + width} ${y + height} ${x + width - r} ${y + height}
    L ${x + r} ${y + height}
    Q ${x} ${y + height} ${x} ${y + height - r}
    L ${x} ${y + r}
    Q ${x} ${y} ${x + r} ${y}
    Z`;
}

/**
 * Generate a diamond/rhombus shape
 * @param {number} cx - Center X
 * @param {number} cy - Center Y
 * @param {number} width - Width
 * @param {number} height - Height
 * @returns {string} SVG path data
 */
export function generateDiamondPath(cx, cy, width, height) {
  const hw = width / 2;
  const hh = height / 2;
  
  return `M ${cx} ${cy - hh}
    L ${cx + hw} ${cy}
    L ${cx} ${cy + hh}
    L ${cx - hw} ${cy}
    Z`;
}

/**
 * Generate a hexagon
 * @param {number} cx - Center X
 * @param {number} cy - Center Y
 * @param {number} radius - Radius
 * @returns {string} SVG path data
 */
export function generateHexagonPath(cx, cy, radius) {
  return generatePolygonPath(cx, cy, radius, 6);
}

/**
 * Generate a cross/plus shape
 * @param {number} cx - Center X
 * @param {number} cy - Center Y
 * @param {number} size - Total size
 * @param {number} thickness - Arm thickness (0-1 ratio)
 * @returns {string} SVG path data
 */
export function generateCrossPath(cx, cy, size, thickness = 0.3) {
  const half = size / 2;
  const thick = half * thickness;
  
  return `M ${cx - thick} ${cy - half}
    L ${cx + thick} ${cy - half}
    L ${cx + thick} ${cy - thick}
    L ${cx + half} ${cy - thick}
    L ${cx + half} ${cy + thick}
    L ${cx + thick} ${cy + thick}
    L ${cx + thick} ${cy + half}
    L ${cx - thick} ${cy + half}
    L ${cx - thick} ${cy + thick}
    L ${cx - half} ${cy + thick}
    L ${cx - half} ${cy - thick}
    L ${cx - thick} ${cy - thick}
    Z`;
}

/**
 * Generate an arc path
 * @param {number} cx - Center X
 * @param {number} cy - Center Y
 * @param {number} radius - Radius
 * @param {number} startAngle - Start angle in radians
 * @param {number} endAngle - End angle in radians
 * @param {boolean} pie - If true, creates a pie slice (closed path to center)
 * @returns {string} SVG path data
 */
export function generateArcPath(cx, cy, radius, startAngle, endAngle, pie = false) {
  const startX = cx + radius * Math.cos(startAngle);
  const startY = cy + radius * Math.sin(startAngle);
  const endX = cx + radius * Math.cos(endAngle);
  const endY = cy + radius * Math.sin(endAngle);
  
  // Determine if arc is greater than 180 degrees
  const largeArc = (endAngle - startAngle) > Math.PI ? 1 : 0;
  
  let path = `M ${startX} ${startY}
    A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`;
  
  if (pie) {
    path += ` L ${cx} ${cy} Z`;
  }
  
  return path;
}

/**
 * Generate a callout/speech bubble shape
 * @param {number} x - Left position
 * @param {number} y - Top position
 * @param {number} width - Width
 * @param {number} height - Height
 * @param {number} tailX - Tail tip X position
 * @param {number} tailY - Tail tip Y position
 * @param {number} tailWidth - Width of tail at base
 * @returns {string} SVG path data
 */
export function generateCalloutPath(x, y, width, height, tailX, tailY, tailWidth = 20) {
  const r = Math.min(10, width / 4, height / 4); // Corner radius
  const right = x + width;
  const bottom = y + height;
  
  // Tail attaches at bottom center by default
  const tailBaseX = x + width / 2;
  const tailBaseY = bottom;
  const halfTail = tailWidth / 2;
  
  return `M ${x + r} ${y}
    L ${right - r} ${y}
    Q ${right} ${y} ${right} ${y + r}
    L ${right} ${bottom - r}
    Q ${right} ${bottom} ${right - r} ${bottom}
    L ${tailBaseX + halfTail} ${tailBaseY}
    L ${tailX} ${tailY}
    L ${tailBaseX - halfTail} ${tailBaseY}
    L ${x + r} ${bottom}
    Q ${x} ${bottom} ${x} ${bottom - r}
    L ${x} ${y + r}
    Q ${x} ${y} ${x + r} ${y}
    Z`;
}

/**
 * Generate a gear/cog shape
 * @param {number} cx - Center X
 * @param {number} cy - Center Y
 * @param {number} outerRadius - Outer radius (teeth tips)
 * @param {number} innerRadius - Inner radius (teeth base)
 * @param {number} holeRadius - Center hole radius
 * @param {number} teeth - Number of teeth
 * @returns {string} SVG path data
 */
export function generateGearPath(cx, cy, outerRadius, innerRadius, holeRadius, teeth = 8) {
  const toothAngle = (2 * Math.PI) / teeth;
  const halfTooth = toothAngle / 4;
  
  let path = '';
  
  // Outer gear shape
  for (let i = 0; i < teeth; i++) {
    const baseAngle = i * toothAngle - Math.PI / 2;
    
    // Tooth base start
    const x1 = cx + innerRadius * Math.cos(baseAngle);
    const y1 = cy + innerRadius * Math.sin(baseAngle);
    
    // Tooth tip start
    const x2 = cx + outerRadius * Math.cos(baseAngle + halfTooth);
    const y2 = cy + outerRadius * Math.sin(baseAngle + halfTooth);
    
    // Tooth tip end
    const x3 = cx + outerRadius * Math.cos(baseAngle + 2 * halfTooth);
    const y3 = cy + outerRadius * Math.sin(baseAngle + 2 * halfTooth);
    
    // Tooth base end
    const x4 = cx + innerRadius * Math.cos(baseAngle + 3 * halfTooth);
    const y4 = cy + innerRadius * Math.sin(baseAngle + 3 * halfTooth);
    
    if (i === 0) {
      path = `M ${x1} ${y1}`;
    } else {
      path += ` L ${x1} ${y1}`;
    }
    
    path += ` L ${x2} ${y2} L ${x3} ${y3} L ${x4} ${y4}`;
  }
  path += ' Z';
  
  // If hole radius specified, add inner circle (as cutout)
  if (holeRadius > 0) {
    // Create a separate inner circle path that forms the hole
    const holeKappa = 0.5522848;
    const hox = holeRadius * holeKappa;
    const hoy = holeRadius * holeKappa;
    
    // Draw inner circle counter-clockwise to create hole
    path += ` M ${cx - holeRadius} ${cy}
      C ${cx - holeRadius} ${cy + hoy} ${cx - hox} ${cy + holeRadius} ${cx} ${cy + holeRadius}
      C ${cx + hox} ${cy + holeRadius} ${cx + holeRadius} ${cy + hoy} ${cx + holeRadius} ${cy}
      C ${cx + holeRadius} ${cy - hoy} ${cx + hox} ${cy - holeRadius} ${cx} ${cy - holeRadius}
      C ${cx - hox} ${cy - holeRadius} ${cx - holeRadius} ${cy - hoy} ${cx - holeRadius} ${cy}
      Z`;
  }
  
  return path;
}

/**
 * Generate a double-headed arrow
 * @param {number} x1 - Start X
 * @param {number} y1 - Start Y
 * @param {number} x2 - End X
 * @param {number} y2 - End Y
 * @param {number} headLength - Arrow head length
 * @param {number} headWidth - Arrow head width
 * @param {number} shaftWidth - Arrow shaft width
 * @returns {string} SVG path data
 */
export function generateDoubleArrowPath(x1, y1, x2, y2, headLength = 25, headWidth = 18, shaftWidth = 6) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  if (length < headLength * 2) {
    // Too short, draw simple line
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }
  
  // Normalize direction
  const nx = dx / length;
  const ny = dy / length;
  
  // Perpendicular direction
  const px = -ny;
  const py = nx;
  
  // Arrow head base points
  const h1x = x1 + nx * headLength;
  const h1y = y1 + ny * headLength;
  const h2x = x2 - nx * headLength;
  const h2y = y2 - ny * headLength;
  
  // Calculate points
  const shaftHalf = shaftWidth / 2;
  const headHalf = headWidth / 2;
  
  return `M ${x1} ${y1}
    L ${h1x + px * headHalf} ${h1y + py * headHalf}
    L ${h1x + px * shaftHalf} ${h1y + py * shaftHalf}
    L ${h2x + px * shaftHalf} ${h2y + py * shaftHalf}
    L ${h2x + px * headHalf} ${h2y + py * headHalf}
    L ${x2} ${y2}
    L ${h2x - px * headHalf} ${h2y - py * headHalf}
    L ${h2x - px * shaftHalf} ${h2y - py * shaftHalf}
    L ${h1x - px * shaftHalf} ${h1y - py * shaftHalf}
    L ${h1x - px * headHalf} ${h1y - py * headHalf}
    Z`;
}

/**
 * Generate a cloud shape
 * @param {number} x - Left position
 * @param {number} y - Top position
 * @param {number} width - Width
 * @param {number} height - Height
 * @returns {string} SVG path data
 */
export function generateCloudPath(x, y, width, height) {
  const w = width;
  const h = height;
  
  // Cloud using arcs
  return `M ${x + w * 0.25} ${y + h * 0.6}
    A ${w * 0.2} ${h * 0.25} 0 1 1 ${x + w * 0.4} ${y + h * 0.35}
    A ${w * 0.22} ${h * 0.22} 0 1 1 ${x + w * 0.65} ${y + h * 0.25}
    A ${w * 0.25} ${h * 0.28} 0 1 1 ${x + w * 0.85} ${y + h * 0.5}
    A ${w * 0.18} ${h * 0.2} 0 1 1 ${x + w * 0.75} ${y + h * 0.75}
    Q ${x + w * 0.5} ${y + h * 0.9} ${x + w * 0.25} ${y + h * 0.75}
    A ${w * 0.2} ${h * 0.2} 0 0 1 ${x + w * 0.1} ${y + h * 0.55}
    A ${w * 0.15} ${h * 0.18} 0 0 1 ${x + w * 0.25} ${y + h * 0.6}
    Z`;
}

/**
 * Generate a lightning bolt shape
 * @param {number} x - Left position
 * @param {number} y - Top position  
 * @param {number} width - Width
 * @param {number} height - Height
 * @returns {string} SVG path data
 */
export function generateLightningPath(x, y, width, height) {
  return `M ${x + width * 0.55} ${y}
    L ${x + width * 0.3} ${y + height * 0.4}
    L ${x + width * 0.5} ${y + height * 0.4}
    L ${x + width * 0.35} ${y + height}
    L ${x + width * 0.7} ${y + height * 0.55}
    L ${x + width * 0.5} ${y + height * 0.55}
    L ${x + width * 0.75} ${y + height * 0.15}
    Z`;
}

/**
 * Default shape parameters for new shapes
 */
export const SHAPE_DEFAULTS = {
  star: {
    points: 5,
    innerRadiusRatio: 0.5, // Inner radius as ratio of outer
  },
  polygon: {
    sides: 6,
  },
  spiral: {
    turns: 3,
    startRadiusRatio: 0.1,
  },
  roundedRect: {
    cornerRadiusRatio: 0.15, // Corner radius as ratio of smallest dimension
  },
  cross: {
    thicknessRatio: 0.3,
  },
  gear: {
    teeth: 8,
    innerRadiusRatio: 0.7,
    holeRadiusRatio: 0.25,
  },
  arrow: {
    headLengthRatio: 0.25,
    headWidthRatio: 0.3,
    shaftWidthRatio: 0.1,
  },
  callout: {
    tailLengthRatio: 0.3,
    tailWidthRatio: 0.15,
  },
  arc: {
    startAngle: -Math.PI / 2,
    sweepAngle: Math.PI,  // 180 degrees by default
    pie: false,
  },
};
