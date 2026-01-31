// Утиліти для Boolean операцій (об'єднання, віднімання, перетин фігур)
// Використовуємо polygon-clipping для точних операцій
import polygonClipping from 'polygon-clipping';

/**
 * Отримати точки полігону з Fabric.js об'єкта
 */
export function getPathFromObject(obj) {
  if (!obj) return null;
  
  const points = [];
  
  // Отримуємо матрицю трансформації об'єкта
  const matrix = obj.calcTransformMatrix();
  
  // Функція для трансформації точки
  const transformPoint = (x, y) => {
    const tx = matrix[0] * x + matrix[2] * y + matrix[4];
    const ty = matrix[1] * x + matrix[3] * y + matrix[5];
    return { x: tx, y: ty };
  };
  
  if (obj.type === 'rect') {
    const w = obj.width;
    const h = obj.height;
    const hw = w / 2;
    const hh = h / 2;
    
    // Кути прямокутника відносно центру
    const corners = [
      { x: -hw, y: -hh },
      { x: hw, y: -hh },
      { x: hw, y: hh },
      { x: -hw, y: hh }
    ];
    
    corners.forEach(corner => {
      points.push(transformPoint(corner.x, corner.y));
    });
  } else if (obj.type === 'triangle') {
    const w = obj.width;
    const h = obj.height;
    const hw = w / 2;
    const hh = h / 2;
    
    // Точки трикутника відносно центру
    const vertices = [
      { x: 0, y: -hh },      // Верхня точка
      { x: hw, y: hh },      // Права нижня
      { x: -hw, y: hh }      // Ліва нижня
    ];
    
    vertices.forEach(vertex => {
      points.push(transformPoint(vertex.x, vertex.y));
    });
  } else if (obj.type === 'circle' || obj.type === 'ellipse') {
    const rx = obj.type === 'circle' ? obj.radius : obj.rx;
    const ry = obj.type === 'circle' ? obj.radius : obj.ry;
    const segments = 64; // Більше сегментів для кращої точності
    
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.cos(angle) * rx;
      const y = Math.sin(angle) * ry;
      points.push(transformPoint(x, y));
    }
  } else if (obj.type === 'polygon') {
    // Для полігонів використовуємо їх точки
    if (obj.points && obj.points.length > 0) {
      obj.points.forEach(pt => {
        points.push(transformPoint(pt.x - obj.width / 2, pt.y - obj.height / 2));
      });
    }
  } else if (obj.type === 'path') {
    // Для path витягуємо точки з path data
    const pathPoints = getPointsFromPath(obj);
    if (pathPoints.length > 0) {
      pathPoints.forEach(pt => {
        points.push(transformPoint(pt.x, pt.y));
      });
    }
  }
  
  return points.length >= 3 ? points : null;
}

/**
 * Витягти точки з Path об'єкта
 */
function getPointsFromPath(pathObj) {
  const points = [];
  
  if (!pathObj.path) return points;
  
  pathObj.path.forEach(cmd => {
    const [type, ...coords] = cmd;
    if (type === 'M' || type === 'L') {
      points.push({ x: coords[0], y: coords[1] });
    } else if (type === 'C') {
      // Для Bezier кривих беремо кінцеву точку
      points.push({ x: coords[4], y: coords[5] });
    } else if (type === 'Q') {
      // Для квадратичних кривих
      points.push({ x: coords[2], y: coords[3] });
    }
  });
  
  return points;
}

/**
 * Конвертувати точки у формат для polygon-clipping
 * polygon-clipping очікує [[[x,y], [x,y], ...]] формат
 */
function pointsToPolygon(points) {
  if (!points || points.length < 3) return null;
  
  const ring = points.map(p => [p.x, p.y]);
  // Замикаємо полігон якщо він не замкнутий
  if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
    ring.push([...ring[0]]);
  }
  return [ring];
}

/**
 * Перетин фігур (intersection)
 */
export function intersectShapes(shape1Points, shape2Points) {
  const poly1 = pointsToPolygon(shape1Points);
  const poly2 = pointsToPolygon(shape2Points);
  
  if (!poly1 || !poly2) return null;
  
  try {
    return polygonClipping.intersection(poly1, poly2);
  } catch (e) {
    console.error('Intersection error:', e);
    return null;
  }
}

/**
 * Об'єднання фігур (union)
 */
export function unionShapes(shape1Points, shape2Points) {
  const poly1 = pointsToPolygon(shape1Points);
  const poly2 = pointsToPolygon(shape2Points);
  
  if (!poly1 || !poly2) return null;
  
  try {
    return polygonClipping.union(poly1, poly2);
  } catch (e) {
    console.error('Union error:', e);
    return null;
  }
}

/**
 * Віднімання фігур (difference) - shape1 мінус shape2
 */
export function subtractShapes(shape1Points, shape2Points) {
  const poly1 = pointsToPolygon(shape1Points);
  const poly2 = pointsToPolygon(shape2Points);
  
  if (!poly1 || !poly2) return null;
  
  try {
    return polygonClipping.difference(poly1, poly2);
  } catch (e) {
    console.error('Subtract error:', e);
    return null;
  }
}

/**
 * Конвертація результату polygon-clipping (MultiPolygon) у SVG path
 */
export function polygonToSVGPath(multipolygon) {
  if (!multipolygon || multipolygon.length === 0) return '';
  
  return multipolygon.map(polygon => {
    return polygon.map(ring => {
      if (ring.length === 0) return '';
      const start = `M ${ring[0][0]} ${ring[0][1]}`;
      const points = ring.slice(1).map(p => `L ${p[0]} ${p[1]}`).join(' ');
      return `${start} ${points} Z`;
    }).join(' ');
  }).join(' ');
}

/**
 * Обчислення bounding box для MultiPolygon
 */
export function getBoundingBox(multipolygon) {
  if (!multipolygon || multipolygon.length === 0) return null;
  
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  
  multipolygon.forEach(polygon => {
    polygon.forEach(ring => {
      ring.forEach(([x, y]) => {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      });
    });
  });
  
  return {
    left: minX,
    top: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
