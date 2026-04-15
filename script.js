// Temel Yapılandırma
const svg = document.getElementById('mainSvg');
const gridLayer = document.getElementById('grid-layer');
const objectsLayer = document.getElementById('objects-layer');
const uiLayer = document.getElementById('ui-layer');


// Durum Yönetimi
const state = {
    // Görünüm Ayarları (ViewBox)
    viewX: -10,
    viewY: -10,
    viewWidth: 20,
    viewHeight: 20,
    
    // Etkileşim
    isDragging: false,
    dragAction: null, // 'pan', 'move', 'rotate', 'resize', 'create-line'
    dragStartX: 0,
    dragStartY: 0,
    
    selectedTool: 'move',
    selectedObject: null, // Veri modeli referansı
    tempObject: null, // Çizim esnasındaki geçici nesne
    
    objects: [], // Tüm nesnelerin veri modelleri
    
    // Snapping
    snapThreshold: 0.8, // Yakalama mesafesi (birim)
    angleSnapThreshold: 0.1, // Radyan (~5 derece)
    snappedPoint: null, // Şu an yakalanan nokta {x, y}
    gridStep: 1, // Grid aralığı (Varsayılan 1)
    directionRays: [],
    rotatePivot: null
};

// SVG Namespace
const SVG_NS = "http://www.w3.org/2000/svg";

// ==========================================
// GEOMETRİ VE YARDIMCI FONKSİYONLAR
// ==========================================

const Geometry = {
    dist: (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y),
    
    // İki doğru kesişimi (x1,y1)-(x2,y2) ve (x3,y3)-(x4,y4)
    // Doğrular sonsuz kabul edilir
    getLineIntersection: (l1, l2) => {
        const x1 = l1.x1, y1 = l1.y1, x2 = l1.x2, y2 = l1.y2;
        const x3 = l2.x1, y3 = l2.y1, x4 = l2.x2, y4 = l2.y2;
        
        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (Math.abs(denom) < 1e-6) return null; // Paralel
        
        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const px = x1 + t * (x2 - x1);
        const py = y1 + t * (y2 - y1);
        
        return { x: px, y: py };
    },
    
    // Doğru ve Çember kesişimi (Sonsuz doğru)
    getLineCircleIntersection: (line, circle) => {
        // Doğruyu ax + by + c = 0 formuna getir
        // y - y1 = m(x - x1) -> mx - y + (y1 - mx1) = 0
        // Dikeyse x - x1 = 0
        
        let a, b, c;
        if (Math.abs(line.x2 - line.x1) < 1e-6) { // Dikey
            a = 1; b = 0; c = -line.x1;
        } else {
            const m = (line.y2 - line.y1) / (line.x2 - line.x1);
            a = m; b = -1; c = line.y1 - m * line.x1;
        }
        
        // Çember merkezinin doğruya uzaklığı
        const dist = Math.abs(a * circle.x + b * circle.y + c) / Math.hypot(a, b);
        
        if (dist > circle.r) return [];
        if (Math.abs(dist - circle.r) < 1e-6) {
            // Teğet - tek nokta (izdüşüm)
            const x0 = (b * (b * circle.x - a * circle.y) - a * c) / (a * a + b * b);
            const y0 = (a * (-b * circle.x + a * circle.y) - b * c) / (a * a + b * b);
            return [{ x: x0, y: y0 }];
        }
        
        // İki nokta
        // Kesişim noktasını bulmak için geometrik yaklaşım:
        // İzdüşüm noktası (x0, y0)
        const x0 = (b * (b * circle.x - a * circle.y) - a * c) / (a * a + b * b);
        const y0 = (a * (-b * circle.x + a * circle.y) - b * c) / (a * a + b * b);
        
        const d = Math.sqrt(circle.r * circle.r - dist * dist);
        const mult = Math.sqrt(d * d / (a * a + b * b));
        
        return [
            { x: x0 + b * mult, y: y0 - a * mult },
            { x: x0 - b * mult, y: y0 + a * mult }
        ];
    },

    // İki çember kesişimi
    getCircleCircleIntersection: (c1, c2) => {
        const d = Math.hypot(c2.x - c1.x, c2.y - c1.y);
        if (d < 1e-6) return []; // Eş merkezli
        if (d > c1.r + c2.r + 1e-6) return []; // Dışta
        if (d < Math.abs(c1.r - c2.r) - 1e-6) return []; // Biri diğerinin içinde

        const a = (c1.r * c1.r - c2.r * c2.r + d * d) / (2 * d);
        const h2 = c1.r * c1.r - a * a;
        if (h2 < 0) return [];
        const h = Math.sqrt(h2);

        const px = c1.x + a * (c2.x - c1.x) / d;
        const py = c1.y + a * (c2.y - c1.y) / d;

        if (h < 1e-6) return [{ x: px, y: py }]; // Teğet

        return [
            { x: px + h * (c2.y - c1.y) / d, y: py - h * (c2.x - c1.x) / d },
            { x: px - h * (c2.y - c1.y) / d, y: py + h * (c2.x - c1.x) / d }
        ];
    },

    // Doğru ve Parabol kesişimi (Sonsuz doğru)
    // Parabol: y = V_y - a(x - V_x)^2
    getLineParabolaIntersection: (line, parabola) => {
        const x1 = line.x1, y1 = line.y1;
        const dx_line = line.x2 - line.x1;
        const dy_line = line.y2 - line.y1;
        
        // Normalize direction vector
        const len = Math.hypot(dx_line, dy_line);
        if (len < 1e-9) return [];
        const Dx = dx_line / len;
        const Dy = dy_line / len;
        
        // Parabol params
        const Vx = parabola.x;
        const Vy = parabola.y;
        const A_param = parabola.a;
        
        // Intersection of P + t*D with Parabola
        // t is distance from P (x1, y1)
        
        const dx_start = x1 - Vx;
        
        // Quadratic coefficients for t: At^2 + Bt + C = 0
        const A = A_param * Dx * Dx;
        const B = 2 * A_param * dx_start * Dx + Dy;
        const C = (y1 - Vy) + A_param * dx_start * dx_start;
        
        let ts = [];
        
        if (Math.abs(A) < 1e-9) {
            // Linear equation: Bt + C = 0
            if (Math.abs(B) > 1e-9) {
                ts.push(-C / B);
            }
        } else {
            const disc = B * B - 4 * A * C;
            if (disc >= 0) {
                const sqrtDisc = Math.sqrt(disc);
                ts.push((-B - sqrtDisc) / (2 * A));
                ts.push((-B + sqrtDisc) / (2 * A));
            }
        }
        
        return ts.map(t => ({
            x: x1 + t * Dx,
            y: y1 + t * Dy
        }));
    },
    
    // Lazer ışını (Yarı doğru) ile diğer nesnelerin kesişimi
    // Lazer (x, y) noktasından angle açısıyla çıkar
    getLaserIntersectionPoints: (laser, otherObj) => {
        // Lazeri çok uzun bir doğru parçası gibi düşünelim
        const endX = laser.x + 1000 * Math.cos(laser.angle);
        const endY = laser.y + 1000 * Math.sin(laser.angle);
        const laserLine = { x1: laser.x, y1: laser.y, x2: endX, y2: endY };
        
        // Helper to check if point is in laser direction (forward)
        const isForward = (pt) => {
            const dx = pt.x - laser.x;
            const dy = pt.y - laser.y;
            // Toleranslı kontrol
            const dot = dx * Math.cos(laser.angle) + dy * Math.sin(laser.angle);
            return dot > 1e-6; // Lazer kaynağının biraz önünde olmalı
        };

        // Helper to check if point is on line segment
        const isOnSegment = (pt, line) => {
            const minX = Math.min(line.x1, line.x2) - 1e-6;
            const maxX = Math.max(line.x1, line.x2) + 1e-6;
            const minY = Math.min(line.y1, line.y2) - 1e-6;
            const maxY = Math.max(line.y1, line.y2) + 1e-6;
            return pt.x >= minX && pt.x <= maxX && pt.y >= minY && pt.y <= maxY;
        };

        let points = [];

        if (otherObj.type === 'line') {
            const pt = Geometry.getLineIntersection(laserLine, otherObj);
            if (pt && isOnSegment(pt, otherObj)) points = [pt];
        } else if (otherObj.type === 'circle') {
            points = Geometry.getLineCircleIntersection(laserLine, otherObj);
        } else if (otherObj.type === 'parabola') {
            points = Geometry.getLineParabolaIntersection(laserLine, otherObj);
        }
        
        // Filter points that are in the forward direction of the laser
        return points.filter(isForward);
    }
};

// ==========================================
// SNAP (YAKALAMA) MANTIĞI
// ==========================================

function getSnappedPoint(x, y, excludeIds = []) {
    let bestPt = { x, y };
    let minD = state.snapThreshold;
    let snapped = false;

    // 1. Grid (Tamsayı veya GridStep) Yakalama
    // state.gridStep'e göre snap yap
    const step = state.gridStep;
    const gridX = Math.round(x / step) * step;
    const gridY = Math.round(y / step) * step;
    const dGrid = Math.hypot(x - gridX, y - gridY);
    
    // Snapping mesafesini de gridStep'e göre ölçekle (küçük gridde daha hassas olmalı)
    // Ancak her zaman yakalaması için yeterince büyük olmalı (0.5 * step yerine 0.8 * step gibi)
    const effectiveThreshold = state.snapThreshold * (step < 1 ? step : 1);

    if (dGrid < effectiveThreshold) {
        bestPt = { x: gridX, y: gridY };
        minD = dGrid;
        snapped = true;
    }

    // 2. Kesişim Noktaları Yakalama
    // Sahnedeki tüm doğrular, çemberler ve lazer ışınlarını topla
    const lines = state.objects.filter(o => o.type === 'line' && !excludeIds.includes(o.id));
    const circles = state.objects.filter(o => o.type === 'circle' && !excludeIds.includes(o.id));
    const lasers = state.objects.filter(o => o.type === 'laser' && !excludeIds.includes(o.id));
    const points = state.objects.filter(o => o.type === 'point' && !excludeIds.includes(o.id));
    const polygons = state.objects.filter(o => o.type === 'polygon' && !excludeIds.includes(o.id));
    const parabolaObjs = state.objects.filter(o => o.type === 'parabola' && !excludeIds.includes(o.id));

    let pointsToCheck = [];

    // Mevcut Noktalar (Point nesneleri ve Polygon köşeleri)
    for (let p of points) {
        pointsToCheck.push({ x: p.x, y: p.y });
    }
    for (let poly of polygons) {
        pointsToCheck.push(...poly.points);
    }

    // Çokgen kenarlarını doğru parçaları olarak topla
    const polyLines = [];
    for (let poly of polygons) {
        const pts = poly.points;
        const edgeCount = poly.isClosed ? pts.length : pts.length - 1;
        for (let i = 0; i < edgeCount; i++) {
            const p1 = pts[i];
            const p2 = pts[(i + 1) % pts.length];
            polyLines.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
        }
    }

    // Tüm doğru benzeri nesneler (doğrular + çokgen kenarları)
    const allLines = [...lines, ...polyLines];

    // Doğru - Doğru (çokgen kenarları dahil)
    for (let i = 0; i < allLines.length; i++) {
        for (let j = i + 1; j < allLines.length; j++) {
            const pt = Geometry.getLineIntersection(allLines[i], allLines[j]);
            if (pt) pointsToCheck.push(pt);
        }
        // Doğru - Çember
        for (let c of circles) {
            const pts = Geometry.getLineCircleIntersection(allLines[i], c);
            pointsToCheck.push(...pts);
        }
        // Doğru - Parabol
        for (let p of parabolaObjs) {
            const pts = Geometry.getLineParabolaIntersection(allLines[i], p);
            pointsToCheck.push(...pts);
        }
    }

    // Çember - Çember
    for (let i = 0; i < circles.length; i++) {
        for (let j = i + 1; j < circles.length; j++) {
            const pts = Geometry.getCircleCircleIntersection(circles[i], circles[j]);
            pointsToCheck.push(...pts);
        }
    }

    // Lazer Işını Kesişimleri
    for (let l of lasers) {
        // Lazerin kendi ışını bir doğrudur
        const endX = l.x + Math.cos(l.angle); // Yön vektörü için
        const endY = l.y + Math.sin(l.angle);
        const laserLine = { x1: l.x, y1: l.y, x2: endX, y2: endY }; // Sonsuz doğru olarak
        
        // Diğer doğrularla (çokgen kenarları dahil)
        for (let line of allLines) {
            const pt = Geometry.getLineIntersection(laserLine, line);
            if (pt) pointsToCheck.push(pt);
        }
        // Diğer çemberlerle
        for (let c of circles) {
            const pts = Geometry.getLineCircleIntersection(laserLine, c);
            pointsToCheck.push(...pts);
        }
        // Parabollarla
        for (let p of parabolaObjs) {
            const pts = Geometry.getLineParabolaIntersection(laserLine, p);
            pointsToCheck.push(...pts);
        }
        // Diğer lazerlerle
        for (let l2 of lasers) {
            if (l === l2) continue;
            const endX2 = l2.x + Math.cos(l2.angle);
            const endY2 = l2.y + Math.sin(l2.angle);
            const laserLine2 = { x1: l2.x, y1: l2.y, x2: endX2, y2: endY2 };
            const pt = Geometry.getLineIntersection(laserLine, laserLine2);
            if (pt) pointsToCheck.push(pt);
        }
    }

    // En yakın kesişim noktasını bul
    for (let pt of pointsToCheck) {
        const d = Math.hypot(x - pt.x, y - pt.y);
        if (d < minD) {
            minD = d;
            bestPt = pt;
            snapped = true;
        }
    }

    return { ...bestPt, snapped };
}

function getSnappedAngle(currentAngle, obj) {
    let bestAngle = currentAngle;
    let minDiff = state.angleSnapThreshold;

    // Yardımcı: İki açı arasındaki en küçük farkı bul (-PI ile PI arası)
    function getAngleDifference(target, current) {
        return Math.atan2(Math.sin(target - current), Math.cos(target - current));
    }

    const targets = [];

    // 1. Eksenlere Paralel (0, 90, 180, 270)
    targets.push(0, Math.PI/2, Math.PI, -Math.PI/2);

    // 2. Diğer doğrulara dik
    const lines = state.objects.filter(o => o.type === 'line' && o.id !== obj.id);
    const polygons = state.objects.filter(o => o.type === 'polygon' && o.id !== obj.id);
    const directionRays = state.directionRays || [];

    // Doğrular
    for (let line of lines) {
        const lineAngle = Math.atan2(line.y2 - line.y1, line.x2 - line.x1);
        targets.push(lineAngle + Math.PI/2);
        targets.push(lineAngle - Math.PI/2);
    }

    // Çokgen Kenarları
    for (let poly of polygons) {
        for (let i = 0; i < poly.points.length; i++) {
            const p1 = poly.points[i];
            const p2 = poly.points[(i + 1) % poly.points.length];
            
            // Eğer çokgen kapanmamışsa son kenarı atla
            if (!poly.isClosed && i === poly.points.length - 1) continue;

            const edgeAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            targets.push(edgeAngle + Math.PI/2);
            targets.push(edgeAngle - Math.PI/2);
        }
    }

    for (let ray of directionRays) {
        const rayAngle = Math.atan2(ray.y2 - ray.y1, ray.x2 - ray.x1);
        targets.push(rayAngle + Math.PI/2);
        targets.push(rayAngle - Math.PI/2);
    }

    // En yakın hedefi bul ve uygula
    for (let target of targets) {
        const diff = getAngleDifference(target, currentAngle);
        if (Math.abs(diff) < minDiff) {
            minDiff = Math.abs(diff);
            bestAngle = currentAngle + diff; // Mevcut açıya en kısa dönüşü ekle
        }
    }

    return bestAngle;
}

// ==========================================
// RENDER VE UI YARDIMCILARI
// ==========================================

// getBoundingClientRect() is 100% reliable on mobile (getScreenCTM is not)
function touchToSVG(clientX, clientY) {
    const rect = svg.getBoundingClientRect();
    return {
        x: state.viewX + (clientX - rect.left) * (state.viewWidth / rect.width),
        y: state.viewY + (clientY - rect.top) * (state.viewHeight / rect.height)
    };
}

function getMousePosition(evt) {
    if (evt.touches && evt.touches.length > 0) {
        return touchToSVG(evt.touches[0].clientX, evt.touches[0].clientY);
    }
    if (evt.changedTouches && evt.changedTouches.length > 0) {
        return touchToSVG(evt.changedTouches[0].clientX, evt.changedTouches[0].clientY);
    }
    // Mouse events only: getScreenCTM is reliable on desktop
    const CTM = svg.getScreenCTM();
    if (!CTM) return { x: 0, y: 0 };
    return {
        x: (evt.clientX - CTM.e) / CTM.a,
        y: (evt.clientY - CTM.f) / CTM.d
    };
}

function getClientPosition(evt) {
    if (evt.touches && evt.touches.length > 0) {
        return { clientX: evt.touches[0].clientX, clientY: evt.touches[0].clientY };
    } else if (evt.changedTouches && evt.changedTouches.length > 0) {
        return { clientX: evt.changedTouches[0].clientX, clientY: evt.changedTouches[0].clientY };
    }
    return { clientX: evt.clientX, clientY: evt.clientY };
}

function mathToSvg(x, y) { return { x: x, y: -y }; }
function svgToMath(x, y) { return { x: x, y: -y }; }

function updateViewBox() {
    if (svg.clientWidth === 0 || svg.clientHeight === 0) return;
    const aspect = svg.clientWidth / svg.clientHeight;
    state.viewHeight = state.viewWidth / aspect;
    svg.setAttribute('viewBox', `${state.viewX} ${state.viewY} ${state.viewWidth} ${state.viewHeight}`);
    drawGrid();
}

function createSVGElement(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [key, val] of Object.entries(attrs)) {
        el.setAttribute(key, val);
    }
    return el;
}

function drawGrid() {
    gridLayer.innerHTML = '';
    const minX = Math.floor(state.viewX);
    const maxX = Math.ceil(state.viewX + state.viewWidth);
    const minY = Math.floor(state.viewY);
    const maxY = Math.ceil(state.viewY + state.viewHeight);

    // Font boyutu: Ekran genişliğine göre sabit kalmalı
    // Normalde viewWidth=20 iken 0.3 iyiydi.
    // viewWidth=4 iken 0.3 çok büyük (5 kat).
    // Oran: 0.3 / 20 = 0.015
    const fontSize = Math.max(0.015 * state.viewWidth, 0.005); // Çok küçülmesin

    // Dikey Çizgiler
    const startX = Math.floor(state.viewX / state.gridStep) * state.gridStep;
    const endX = Math.ceil((state.viewX + state.viewWidth) / state.gridStep) * state.gridStep;

    for (let x = startX; x <= endX; x += state.gridStep) {
        const valX = Math.round(x * 100) / 100;
        
        const isAxis = Math.abs(valX) < 1e-6;
        const isMajor = Math.abs(valX % 1) < 1e-6;

        const line = createSVGElement('line', {
            x1: valX, y1: state.viewY, x2: valX, y2: state.viewY + state.viewHeight,
            class: isAxis ? 'axis-line' : 'grid-line'
        });
        
        if (!isAxis && !isMajor) {
            line.setAttribute('stroke-width', '0.5px');
        }

        gridLayer.appendChild(line);

        if (Math.abs(valX) > 1e-6) {
             // Grid çok sık ise her sayıyı yazma
             // Yaklaşık her 2-3 grid çizgisinde bir yaz veya min mesafe kontrolü yap
             // Şimdilik basitçe: Eğer gridStep < 1 ise 0.1, 0.2 hepsini yaz (viewWidth küçük olduğu için sığar)
             // Ama çok sıkışık olursa 0.5'te bir yaz
             
             let showLabel = true;
             // Eğer gridStep < 0.1 ise (örn 0.05 falan olursa) yine 0.5 kontrolü yap
             // Kullanıcı "0,1; 0,2; 0,3 yerine 0,2; 0,4; 0,6 gibi göster" dediği için
             // gridStep 0.1 olduğunda her 0.2'de bir yazdıralım.
             
             // Floating point modülüs hatasını önlemek için daha güvenli kontrol:
             const isMultipleOf02 = Math.abs((valX / 0.2) - Math.round(valX / 0.2)) < 1e-4;
             
             if (state.gridStep < 0.15 && !isMultipleOf02) showLabel = false;
             
             if (showLabel) {
                const text = createSVGElement('text', { x: valX, y: fontSize * 1.5, class: 'grid-text', 'font-size': fontSize });
                text.textContent = (Number.isInteger(valX) ? valX : valX.toFixed(1)).toString().replace('.', ',');
                gridLayer.appendChild(text);
             }
        }
    }

    // Yatay Çizgiler
    const startY = Math.floor(state.viewY / state.gridStep) * state.gridStep;
    const endY = Math.ceil((state.viewY + state.viewHeight) / state.gridStep) * state.gridStep;

    for (let y = startY; y <= endY; y += state.gridStep) {
        const valY = Math.round(y * 100) / 100;
        
        const isAxis = Math.abs(valY) < 1e-6;
        const isMajor = Math.abs(valY % 1) < 1e-6;

        const line = createSVGElement('line', {
            x1: state.viewX, y1: valY, x2: state.viewX + state.viewWidth, y2: valY,
            class: isAxis ? 'axis-line' : 'grid-line'
        });
        
        if (!isAxis && !isMajor) {
            line.setAttribute('stroke-width', '0.5px');
        }
        
        gridLayer.appendChild(line);

        if (Math.abs(valY) > 1e-6) {
             let showLabel = true;
             if (state.gridStep < 0.1 && Math.abs(valY % 0.5) > 1e-6) showLabel = false;

            if (showLabel) {
                const text = createSVGElement('text', {
                    x: fontSize * 1.5, y: valY, class: 'grid-text', 'alignment-baseline': 'middle', 'font-size': fontSize
                });
                text.textContent = (Number.isInteger(valY) ? -valY : (-valY).toFixed(1)).toString().replace('.', ',');
                gridLayer.appendChild(text);
            }
        }
    }
    
    const originText = createSVGElement('text', { x: -fontSize * 1.5, y: fontSize * 1.5, class: 'grid-text', 'font-size': fontSize });
    originText.textContent = "0";
    gridLayer.appendChild(originText);
}

// ==========================================
// NESNE SINIFLARI
// ==========================================

class Laser {
    constructor(x, y) {
        this.type = 'laser';
        this.x = x;
        this.y = y;
        this.angle = 0;
        this.id = 'laser-' + Date.now() + Math.random();
        
        // Boyut parametreleri (state.gridStep'e göre ayarlanabilir)
        // Standart boy: 1 birim. Birim çember modunda da 1 birim mantıklı.
        // Kullanıcı "boyutunu düzenle" dediğinde ne kastetti?
        // Muhtemelen ekranda çok büyük görünmemesi için orantılamak.
        // Ancak SVG scale ile zaten boyutlar göreceli. 
        // Birim çember (r=1) ekranı kaplıyor. Lazer (boy=1) de ekranın yarısı kadar olur.
        // Bu çok büyük. Lazer boyunu küçültelim.
        this.size = state.gridStep < 1 ? 0.2 : 1; 
    }
    render() {
        const group = createSVGElement('g', {
            id: this.id,
            transform: `translate(${this.x}, ${this.y}) rotate(${this.angle * 180 / Math.PI})`,
            class: 'selectable', 'data-id': this.id
        });
        // Gövde ve uç boyutlarını this.size'a göre ayarla
        const w = this.size;
        const h = this.size * 0.2;
        group.appendChild(createSVGElement('rect', { x: -w/2, y: -h/2, width: w, height: h, class: 'laser-body' }));
        group.appendChild(createSVGElement('rect', { x: w/2 - w*0.05, y: -h/2, width: w*0.05, height: h, fill: '#c0392b' }));
        group.appendChild(createSVGElement('line', { x1: w/2, y1: 0, x2: 100, y2: 0, class: 'laser-beam' }));
        group.appendChild(createSVGElement('line', {
            x1: w/2, y1: 0, x2: 100, y2: 0,
            stroke: 'transparent', 'stroke-width': '10px', 'vector-effect': 'non-scaling-stroke',
            class: 'selectable', 'data-id': this.id
        }));
        return group;
    }
}

class Point {
    constructor(x, y) {
        this.type = 'point';
        this.x = x;
        this.y = y;
        this.id = 'point-' + Date.now() + Math.random();
    }
    render() {
        return createSVGElement('line', {
            id: this.id, x1: this.x, y1: this.y, x2: this.x, y2: this.y,
            class: 'point selectable', 'data-id': this.id
        });
    }
}

class Line {
    constructor(x1, y1, x2, y2) {
        this.type = 'line';
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.id = 'line-' + Date.now() + Math.random();
    }
    render() {
        // Sonsuz doğru çizimi
        // İki noktadan geçen doğru denklemi ile sınırları hesapla veya çok uzun çiz
        // Basit yöntem: merkezden geçen çok uzun çizgi
        // Veya (x1,y1) ve (x2,y2)'den geçen ve ekran dışına taşan koordinatlar
        
        let dx = this.x2 - this.x1;
        let dy = this.y2 - this.y1;
        const len = Math.hypot(dx, dy);
        
        if (len < 1e-6) dx = 1; // Nokta gibiyse yatay varsay
        
        // Birim vektör
        const ux = dx / len;
        const uy = dy / len;
        
        // Çok uzak noktalar (Sonsuz görünümü için)
        const EXTREME = 1000;
        const pStart = { x: this.x1 - ux * EXTREME, y: this.y1 - uy * EXTREME };
        const pEnd = { x: this.x1 + ux * EXTREME, y: this.y1 + uy * EXTREME };

        const line = createSVGElement('line', {
            id: this.id,
            x1: pStart.x, y1: pStart.y,
            x2: pEnd.x, y2: pEnd.y,
            class: 'line selectable', 'data-id': this.id
        });
        
        const hitArea = createSVGElement('line', {
            x1: pStart.x, y1: pStart.y,
            x2: pEnd.x, y2: pEnd.y,
            stroke: 'transparent', 'stroke-width': '10px', 'vector-effect': 'non-scaling-stroke',
            class: 'selectable', 'data-id': this.id
        });
        
        const g = createSVGElement('g');
        g.appendChild(line);
        g.appendChild(hitArea);
        return g;
    }
}

class Circle {
    constructor(x, y, r) {
        this.type = 'circle';
        this.x = x;
        this.y = y;
        this.r = r;
        this.id = 'circle-' + Date.now() + Math.random();
    }
    render() {
        return createSVGElement('circle', {
            id: this.id, cx: this.x, cy: this.y, r: this.r,
            class: 'circle selectable', 'data-id': this.id
        });
    }
}

class Parabola {
    constructor(x, y) {
        this.type = 'parabola';
        this.x = x;
        this.y = y;
        this.a = 1;
        this.id = 'parabola-' + Date.now() + Math.random();
    }
    render() {
        let d = "";
        // Daha pürüzsüz görünüm için adım aralığını küçülttük (0.5 -> 0.1)
        for (let ix = -50; ix <= 50; ix += 0.1) {
            const px = this.x + ix;
            const py = this.y - this.a * ix * ix;
            if (d === "") d += `M ${px} ${py}`;
            else d += ` L ${px} ${py}`;
        }
        return createSVGElement('path', {
            id: this.id, d: d, class: 'parabola selectable',
            fill: 'none', 'data-id': this.id
        });
    }
}

class Polygon {
    constructor(points = []) {
        this.type = 'polygon';
        this.points = points;
        this.id = 'poly-' + Date.now() + Math.random();
        this.isClosed = false;
    }
    render() {
        const pts = this.points.map(p => `${p.x},${p.y}`).join(' ');
        const poly = createSVGElement(this.isClosed ? 'polygon' : 'polyline', {
            id: this.id, points: pts, class: 'polygon selectable', 'data-id': this.id
        });
        
        const g = createSVGElement('g', { 'data-id': this.id });
        g.appendChild(poly);

        for (let i = 0; i < this.points.length - 1; i++) {
            const p1 = this.points[i];
            const p2 = this.points[i + 1];
            const edge = createSVGElement('line', {
                x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
                stroke: 'transparent', 'stroke-width': '10px', 'vector-effect': 'non-scaling-stroke',
                class: 'polygon-edge', 'data-index': i, 'data-parent-id': this.id
            });
            g.appendChild(edge);
        }
        if (this.isClosed && this.points.length > 2) {
            const last = this.points[this.points.length - 1];
            const first = this.points[0];
            const edge = createSVGElement('line', {
                x1: last.x, y1: last.y, x2: first.x, y2: first.y,
                stroke: 'transparent', 'stroke-width': '10px', 'vector-effect': 'non-scaling-stroke',
                class: 'polygon-edge', 'data-index': this.points.length - 1, 'data-parent-id': this.id, 'data-closing': 'true'
            });
            g.appendChild(edge);
        }
        
        this.points.forEach((p, i) => {
            const dot = createSVGElement('line', {
                x1: p.x, y1: p.y, x2: p.x, y2: p.y,
                class: 'polygon-vertex', // Tıklama tespiti için sınıf
                'data-index': i,
                'data-parent-id': this.id
            });
            g.appendChild(dot);
        });
        return g;
    }
}

// ==========================================
// RENDER VE UI GÜNCELLEME
// ==========================================

// Lightweight rotation update for touch — avoids destroying UI elements
// This is critical: renderObjects→renderUI rebuilds DOM, killing the touch target
function touchRotateLaser(clientX, clientY) {
    const obj = state.selectedObject;
    const pivot = state.rotatePivot;
    if (!obj || obj.type !== 'laser' || !pivot) return;
    
    const pt = touchToSVG(clientX, clientY);
    let angle = Math.atan2(pt.y - pivot.y, pt.x - pivot.x);
    angle = getSnappedAngle(angle, obj);
    obj.angle = angle;
    obj.x = pivot.x - Math.cos(angle) * (obj.size / 2);
    obj.y = pivot.y - Math.sin(angle) * (obj.size / 2);
    
    // Re-render objects layer only (laser beam, reflections etc)
    objectsLayer.innerHTML = '';
    state.objects.forEach(o => objectsLayer.appendChild(o.render()));
    
    // Update handle positions in-place — do NOT rebuild uiLayer
    const handleDist = obj.size * 2.5;
    const hx = obj.x + handleDist * Math.cos(obj.angle);
    const hy = obj.y + handleDist * Math.sin(obj.angle);
    
    const hitArea = uiLayer.querySelector('.handle-hit-area');
    if (hitArea) { hitArea.setAttribute('cx', hx); hitArea.setAttribute('cy', hy); }
    
    const handle = uiLayer.querySelector('.handle');
    if (handle) {
        handle.setAttribute('x1', hx); handle.setAttribute('y1', hy);
        handle.setAttribute('x2', hx); handle.setAttribute('y2', hy);
    }
    
    // Update dashed line (first line child with stroke-dasharray)
    const lines = uiLayer.querySelectorAll('line');
    for (const ln of lines) {
        if (ln.getAttribute('stroke-dasharray')) {
            ln.setAttribute('x1', obj.x); ln.setAttribute('y1', obj.y);
            ln.setAttribute('x2', hx); ln.setAttribute('y2', hy);
            break;
        }
    }
    
    // Update selected-outline and move hit area
    const outline = uiLayer.querySelector('.selected-outline');
    if (outline) { outline.setAttribute('cx', obj.x); outline.setAttribute('cy', obj.y); }
    const moveArea = uiLayer.querySelector('.laser-move-area');
    if (moveArea) { moveArea.setAttribute('cx', obj.x); moveArea.setAttribute('cy', obj.y); }
}

// Lightweight circle resize update for touch — same approach as touchRotateLaser
function touchResizeCircle(clientX, clientY) {
    const obj = state.selectedObject;
    if (!obj || obj.type !== 'circle') return;

    const pt = touchToSVG(clientX, clientY);
    const newR = Math.hypot(pt.x - obj.x, pt.y - obj.y);
    if (newR < 0.1) return;
    obj.r = newR;

    // Re-render objects layer only
    objectsLayer.innerHTML = '';
    state.objects.forEach(o => objectsLayer.appendChild(o.render()));

    // Update handle and outline in-place
    const hx = obj.x + obj.r;
    const hy = obj.y;
    const handle = uiLayer.querySelector('.handle[data-action="resize"]');
    if (handle) {
        handle.setAttribute('x1', hx); handle.setAttribute('y1', hy);
        handle.setAttribute('x2', hx); handle.setAttribute('y2', hy);
    }
    const outline = uiLayer.querySelector('.selected-outline');
    if (outline) { outline.setAttribute('r', obj.r); }
}

// Lightweight parabola resize update for touch
function touchResizeParabola(clientX, clientY) {
    const obj = state.selectedObject;
    if (!obj || obj.type !== 'parabola') return;

    const pt = touchToSVG(clientX, clientY);
    obj.a = obj.y - pt.y;

    // Re-render objects layer only
    objectsLayer.innerHTML = '';
    state.objects.forEach(o => objectsLayer.appendChild(o.render()));

    // Update handle position in-place
    const hx = obj.x + 1;
    const hy = obj.y - obj.a;
    const handle = uiLayer.querySelector('.handle[data-action="resize-parabola"]');
    if (handle) {
        handle.setAttribute('x1', hx); handle.setAttribute('y1', hy);
        handle.setAttribute('x2', hx); handle.setAttribute('y2', hy);
    }
}

// Geometric distance from point to a finite line segment
function pointToSegmentDist(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < 1e-12) return Math.hypot(px - x1, py - y1);
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

// Geometric object finder — used when elementFromPoint is unreliable on mobile
function findObjectAtPoint(pt) {
    const threshold = state.viewWidth * 0.12;
    let bestObj = null, bestDist = threshold;
    for (const obj of state.objects) {
        let dist = Infinity;
        if (obj.type === 'point' || obj.type === 'laser' || obj.type === 'parabola') {
            dist = Math.hypot(pt.x - obj.x, pt.y - obj.y);
        } else if (obj.type === 'circle') {
            dist = Math.abs(Math.hypot(pt.x - obj.x, pt.y - obj.y) - obj.r);
        } else if (obj.type === 'line') {
            const dx = obj.x2 - obj.x1, dy = obj.y2 - obj.y1;
            const len = Math.hypot(dx, dy);
            dist = len < 1e-6 ? Math.hypot(pt.x - obj.x1, pt.y - obj.y1)
                              : Math.abs((pt.x - obj.x1) * dy - (pt.y - obj.y1) * dx) / len;
        } else if (obj.type === 'polygon') {
            const pts = obj.points;
            const edgeCount = obj.isClosed ? pts.length : pts.length - 1;
            for (let i = 0; i < edgeCount; i++) {
                const p1 = pts[i], p2 = pts[(i + 1) % pts.length];
                dist = Math.min(dist, pointToSegmentDist(pt.x, pt.y, p1.x, p1.y, p2.x, p2.y));
            }
        }
        if (dist < bestDist) { bestDist = dist; bestObj = obj; }
    }
    return bestObj;
}

// Lightweight object move for touch — avoids rebuilding uiLayer each frame
function touchMoveObject(clientX, clientY) {
    const obj = state.selectedObject;
    if (!obj) return;
    const pt = touchToSVG(clientX, clientY);
    const dx = pt.x - state.dragStartX;
    const dy = pt.y - state.dragStartY;
    state.dragStartX = pt.x;
    state.dragStartY = pt.y;

    if (obj.type === 'polygon') {
        obj.points.forEach(p => { p.x += dx; p.y += dy; });
    } else if (obj.type === 'line') {
        obj.x1 += dx; obj.y1 += dy; obj.x2 += dx; obj.y2 += dy;
    } else {
        obj.x += dx; obj.y += dy;
    }

    // Rebuild objects layer only
    objectsLayer.innerHTML = '';
    state.objects.forEach(o => objectsLayer.appendChild(o.render()));

    // Update uiLayer handles in-place (no DOM rebuild = no lost touch targets)
    const outline = uiLayer.querySelector('.selected-outline');
    if (obj.type === 'laser') {
        const handleDist = obj.size * 2.5;
        const hx = obj.x + handleDist * Math.cos(obj.angle);
        const hy = obj.y + handleDist * Math.sin(obj.angle);
        const hitArea = uiLayer.querySelector('.handle-hit-area');
        if (hitArea) { hitArea.setAttribute('cx', hx); hitArea.setAttribute('cy', hy); }
        const handle = uiLayer.querySelector('.handle');
        if (handle) { handle.setAttribute('x1', hx); handle.setAttribute('y1', hy); handle.setAttribute('x2', hx); handle.setAttribute('y2', hy); }
        const uiLines = uiLayer.querySelectorAll('line');
        for (const ln of uiLines) {
            if (ln.getAttribute('stroke-dasharray')) {
                ln.setAttribute('x1', obj.x); ln.setAttribute('y1', obj.y);
                ln.setAttribute('x2', hx); ln.setAttribute('y2', hy); break;
            }
        }
        if (outline) { outline.setAttribute('cx', obj.x); outline.setAttribute('cy', obj.y); }
        const moveArea = uiLayer.querySelector('.laser-move-area');
        if (moveArea) { moveArea.setAttribute('cx', obj.x); moveArea.setAttribute('cy', obj.y); }
    } else if (obj.type === 'circle') {
        if (outline) { outline.setAttribute('cx', obj.x); outline.setAttribute('cy', obj.y); }
        const handle = uiLayer.querySelector('.handle[data-action="resize"]');
        if (handle) { handle.setAttribute('x1', obj.x + obj.r); handle.setAttribute('y1', obj.y); handle.setAttribute('x2', obj.x + obj.r); handle.setAttribute('y2', obj.y); }
    } else if (obj.type === 'parabola') {
        if (outline) { outline.setAttribute('cx', obj.x); outline.setAttribute('cy', obj.y); }
        const handle = uiLayer.querySelector('.handle[data-action="resize-parabola"]');
        if (handle) { handle.setAttribute('x1', obj.x + 1); handle.setAttribute('y1', obj.y - obj.a); handle.setAttribute('x2', obj.x + 1); handle.setAttribute('y2', obj.y - obj.a); }
    } else if (obj.type === 'line') {
        const h1 = uiLayer.querySelector('.handle[data-action="move-p1"]');
        if (h1) { h1.setAttribute('x1', obj.x1); h1.setAttribute('y1', obj.y1); h1.setAttribute('x2', obj.x1); h1.setAttribute('y2', obj.y1); }
        const h2 = uiLayer.querySelector('.handle[data-action="move-p2"]');
        if (h2) { h2.setAttribute('x1', obj.x2); h2.setAttribute('y1', obj.y2); h2.setAttribute('x2', obj.x2); h2.setAttribute('y2', obj.y2); }
    }
    // point / polygon: no handles in uiLayer, nothing extra to update
}

function renderObjects() {
    objectsLayer.innerHTML = '';
    state.objects.forEach(obj => objectsLayer.appendChild(obj.render()));
    if (state.tempObject) {
        const el = state.tempObject.render();
        el.style.opacity = '0.5';
        objectsLayer.appendChild(el);
    }
    renderUI();
}

function renderUI() {
    uiLayer.innerHTML = '';
    
    // UI eleman boyutunu görünüme göre ayarla
    const uiMarkerSize = state.viewWidth * 0.015;
    
    // Snapping Göstergesi
    if (state.snappedPoint) {
        const snapMarker = createSVGElement('circle', {
            cx: state.snappedPoint.x, cy: state.snappedPoint.y,
            r: uiMarkerSize, fill: 'none', stroke: '#e74c3c', 'stroke-width': '2px', 'vector-effect': 'non-scaling-stroke'
        });
        uiLayer.appendChild(snapMarker);
    }

    if (state.directionRays.length) {
        state.directionRays.forEach(ray => {
            uiLayer.appendChild(createSVGElement('line', {
                x1: ray.x1, y1: ray.y1, x2: ray.x2, y2: ray.y2,
                class: 'direction-extension'
            }));
        });
    }

    if (!state.selectedObject) return;
    const obj = state.selectedObject;

    if (obj.type === 'laser') {
        const handleDist = obj.size * 2.5;
        const hx = obj.x + handleDist * Math.cos(obj.angle);
        const hy = obj.y + handleDist * Math.sin(obj.angle);
        // Dashed line from center to handle
        uiLayer.appendChild(createSVGElement('line', {
            x1: obj.x, y1: obj.y, x2: hx, y2: hy,
            stroke: '#f1c40f', 'stroke-width': '1px', 'stroke-dasharray': '4 4', 'vector-effect': 'non-scaling-stroke'
        }));
        // Invisible touch/mouse hit area — tight around the handle, NOT covering the laser body
        // On touch screens, make it slightly larger (but still not overlap the laser body)
        const isTouch = window.matchMedia('(pointer: coarse)').matches;
        const hitAreaRadius = isTouch ? obj.size * 1.0 : obj.size * 0.65;
        const hitArea = createSVGElement('circle', {
            cx: hx, cy: hy, r: hitAreaRadius,
            fill: 'rgba(255,200,0,0.01)', stroke: 'none',
            'pointer-events': 'all',
            class: 'handle-hit-area', 'data-action': 'rotate', cursor: 'grab'
        });
        hitArea.addEventListener('touchstart', function(te) {
            te.stopPropagation();
            te.preventDefault();
            if (te.touches.length !== 1) return;
            const currentObj = state.selectedObject;
            if (!currentObj || currentObj.type !== 'laser') return;
            state.isDragging = true;
            state.dragAction = 'rotate';
            const pt = touchToSVG(te.touches[0].clientX, te.touches[0].clientY);
            state.dragStartX = pt.x;
            state.dragStartY = pt.y;
            state.rotatePivot = {
                x: currentObj.x + Math.cos(currentObj.angle) * (currentObj.size / 2),
                y: currentObj.y + Math.sin(currentObj.angle) * (currentObj.size / 2)
            };
        }, { passive: false });
        uiLayer.appendChild(hitArea);
        // Visible handle dot
        const handleDot = createSVGElement('line', {
            x1: hx, y1: hy, x2: hx, y2: hy, class: 'handle', 'data-action': 'rotate'
        });
        handleDot.addEventListener('touchstart', function(te) {
            te.stopPropagation();
            te.preventDefault();
            if (te.touches.length !== 1) return;
            const currentObj = state.selectedObject;
            if (!currentObj || currentObj.type !== 'laser') return;
            state.isDragging = true;
            state.dragAction = 'rotate';
            const pt = touchToSVG(te.touches[0].clientX, te.touches[0].clientY);
            state.dragStartX = pt.x;
            state.dragStartY = pt.y;
            state.rotatePivot = {
                x: currentObj.x + Math.cos(currentObj.angle) * (currentObj.size / 2),
                y: currentObj.y + Math.sin(currentObj.angle) * (currentObj.size / 2)
            };
        }, { passive: false });
        uiLayer.appendChild(handleDot);
        // Invisible move hit area around laser body — direct touchstart for reliable mobile move
        const moveAreaRadius = isTouch ? obj.size * 1.2 : obj.size * 0.7;
        const moveHitArea = createSVGElement('circle', {
            cx: obj.x, cy: obj.y, r: moveAreaRadius,
            fill: 'rgba(0,0,0,0.01)', stroke: 'none',
            'pointer-events': 'all',
            class: 'laser-move-area', cursor: 'move'
        });
        moveHitArea.addEventListener('touchstart', function(te) {
            te.stopPropagation();
            te.preventDefault();
            if (te.touches.length !== 1) return;
            const currentObj = state.selectedObject;
            if (!currentObj || currentObj.type !== 'laser') return;
            state.isDragging = true;
            state.dragAction = 'move';
            const pt = touchToSVG(te.touches[0].clientX, te.touches[0].clientY);
            state.dragStartX = pt.x;
            state.dragStartY = pt.y;
        }, { passive: false });
        uiLayer.appendChild(moveHitArea);
        const selOutline = createSVGElement('circle', {
            cx: obj.x, cy: obj.y, r: obj.size * 0.6, class: 'selected-outline'
        });
        uiLayer.appendChild(selOutline);
    } else if (obj.type === 'circle') {
        const hx = obj.x + obj.r;
        const hy = obj.y;
        const circleHandle = createSVGElement('line', {
            x1: hx, y1: hy, x2: hx, y2: hy, class: 'handle', 'data-action': 'resize'
        });
        circleHandle.addEventListener('touchstart', function(te) {
            te.stopPropagation();
            te.preventDefault();
            if (te.touches.length !== 1) return;
            if (!state.selectedObject || state.selectedObject.type !== 'circle') return;
            state.isDragging = true;
            state.dragAction = 'resize';
        }, { passive: false });
        uiLayer.appendChild(circleHandle);
        uiLayer.appendChild(createSVGElement('circle', {
            cx: obj.x, cy: obj.y, r: obj.r, class: 'selected-outline'
        }));
    } else if (obj.type === 'parabola') {
        const hx = obj.x + 1;
        const hy = obj.y - obj.a;
        const parabolaHandle = createSVGElement('line', {
            x1: hx, y1: hy, x2: hx, y2: hy, class: 'handle', 'data-action': 'resize-parabola'
        });
        parabolaHandle.addEventListener('touchstart', function(te) {
            te.stopPropagation();
            te.preventDefault();
            if (te.touches.length !== 1) return;
            if (!state.selectedObject || state.selectedObject.type !== 'parabola') return;
            state.isDragging = true;
            state.dragAction = 'resize-parabola';
        }, { passive: false });
        uiLayer.appendChild(parabolaHandle);
        uiLayer.appendChild(createSVGElement('circle', {
            cx: obj.x, cy: obj.y, r: uiMarkerSize, class: 'selected-outline'
        }));
    } else if (obj.type === 'line') {
        uiLayer.appendChild(createSVGElement('line', { x1: obj.x1, y1: obj.y1, x2: obj.x1, y2: obj.y1, class: 'handle', 'data-action': 'move-p1' }));
        uiLayer.appendChild(createSVGElement('line', { x1: obj.x2, y1: obj.y2, x2: obj.x2, y2: obj.y2, class: 'handle', 'data-action': 'move-p2' }));
    }
    
}

// ==========================================
// EVENT LISTENERLAR
// ==========================================

function findObjectById(id) {
    if (!id) return null;
    return state.objects.find(o => o.id === id);
}

function setDirectionRays(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) {
        return;
    }
    const ux = dx / len;
    const uy = dy / len;
    const EXTREME = 1000;
    state.directionRays.push(
        { x1: p1.x, y1: p1.y, x2: p1.x - ux * EXTREME, y2: p1.y - uy * EXTREME },
        { x1: p2.x, y1: p2.y, x2: p2.x + ux * EXTREME, y2: p2.y + uy * EXTREME }
    );
}

function setLaserDirectionRay(laser) {
    const ux = Math.cos(laser.angle);
    const uy = Math.sin(laser.angle);
    const EXTREME = 1000;
    state.directionRays.push({
        x1: laser.x, y1: laser.y,
        x2: laser.x - ux * EXTREME, y2: laser.y - uy * EXTREME
    });
}

svg.addEventListener('mousedown', e => {
    e.preventDefault();
    handlePointerDown(e);
});

svg.addEventListener('mousemove', e => {
    e.preventDefault();
    handlePointerMove(e);
});

function handlePointerDown(e) {
    let pt = getMousePosition(e);
    
    // Snapping (Nokta Ekle, Çokgen, Doğru Uçları için)
    // Eğer tempObject varsa (çizim sırası) veya nokta/çokgen aracı seçiliyse snap yap
    if (['point', 'polygon', 'line', 'laser', 'circle'].includes(state.selectedTool) || state.dragAction === 'create-line') {
        // Düzenlenen nesneyi snap hesaplamasından hariç tut
        const exclude = state.selectedObject ? [state.selectedObject.id] : [];
        if (state.dragAction === 'create-line' && state.tempObject) {
            exclude.push(state.tempObject.id);
        }

        const snapped = getSnappedPoint(pt.x, pt.y, exclude);
        if (snapped.snapped) pt = snapped;
    }

    const target = e.target;
    
    // 0. Silme Aracı
    if (state.selectedTool === 'delete') {
        let clickedId = target.getAttribute('data-id') || target.parentElement?.getAttribute('data-id');
        if (clickedId) {
            state.objects = state.objects.filter(o => o.id !== clickedId);
            renderObjects();
        }
        return;
    }

    // 0b. Kopyalama Aracı
    if (state.selectedTool === 'copy') {
        let clickedId = target.getAttribute('data-id') || target.parentElement?.getAttribute('data-id');
        const obj = findObjectById(clickedId);
        if (obj) {
            const offset = state.gridStep;
            let newObj;
            if (obj.type === 'laser') {
                newObj = new Laser(obj.x + offset, obj.y + offset);
                newObj.angle = obj.angle;
                newObj.size = obj.size;
            } else if (obj.type === 'point') {
                newObj = new Point(obj.x + offset, obj.y + offset);
            } else if (obj.type === 'line') {
                newObj = new Line(obj.x1 + offset, obj.y1 + offset, obj.x2 + offset, obj.y2 + offset);
            } else if (obj.type === 'circle') {
                newObj = new Circle(obj.x + offset, obj.y + offset, obj.r);
            } else if (obj.type === 'parabola') {
                newObj = new Parabola(obj.x + offset, obj.y + offset);
                newObj.a = obj.a;
            } else if (obj.type === 'polygon') {
                newObj = new Polygon(obj.points.map(p => ({ x: p.x + offset, y: p.y + offset })));
                newObj.isClosed = obj.isClosed;
            }
            if (newObj) {
                state.objects.push(newObj);
                state.selectedObject = newObj;
                setTool('move');
                renderObjects();
            }
        }
        return;
    }

    if (state.selectedTool === 'direction') {
        let handled = false;
        if (target.classList.contains('polygon-edge')) {
            const idx = parseInt(target.getAttribute('data-index'));
            const parentId = target.getAttribute('data-parent-id');
            const isClosing = target.getAttribute('data-closing') === 'true';
            const poly = findObjectById(parentId);
            if (poly && poly.type === 'polygon') {
                let p1 = null;
                let p2 = null;
                if (isClosing) {
                    p1 = poly.points[poly.points.length - 1];
                    p2 = poly.points[0];
                } else if (idx >= 0 && idx < poly.points.length - 1) {
                    p1 = poly.points[idx];
                    p2 = poly.points[idx + 1];
                }
                if (p1 && p2) {
                    setDirectionRays(p1, p2);
                    handled = true;
                }
            }
        } else {
            let clickedId = target.getAttribute('data-id') || target.parentElement?.getAttribute('data-id');
            const obj = findObjectById(clickedId);
            if (obj && obj.type === 'line') {
                setDirectionRays({ x: obj.x1, y: obj.y1 }, { x: obj.x2, y: obj.y2 });
                handled = true;
            } else if (obj && obj.type === 'laser') {
                setLaserDirectionRay(obj);
                handled = true;
            }
        }
        if (handled) {
            renderObjects();
        }
        return;
    }

    // 1. Tutamaç (Handle) - handle ve handle-hit-area
    let isHandleHit = target.classList.contains('handle') || target.classList.contains('handle-hit-area');
    let handleAction = isHandleHit ? target.getAttribute('data-action') : null;

    // Geometric fallback for touch: if a laser is selected, check SVG-space distance to handle
    if (!isHandleHit && state.selectedObject && state.selectedObject.type === 'laser' && state.selectedTool === 'move') {
        const obj = state.selectedObject;
        const handleDist = obj.size * 2.5;
        const hx = obj.x + handleDist * Math.cos(obj.angle);
        const hy = obj.y + handleDist * Math.sin(obj.angle);
        const svgDist = Math.hypot(pt.x - hx, pt.y - hy);
        // Tight threshold — only the visible dot area
        const hitThreshold = obj.size * 0.65;
        if (svgDist < hitThreshold) {
            isHandleHit = true;
            handleAction = 'rotate';
        }
    }

    if (isHandleHit) {
        state.isDragging = true;
        state.dragAction = handleAction;
        state.dragStartX = pt.x;
        state.dragStartY = pt.y;
        if (state.dragAction === 'rotate' && state.selectedObject && state.selectedObject.type === 'laser') {
            const obj = state.selectedObject;
            const tipX = obj.x + Math.cos(obj.angle) * (obj.size / 2);
            const tipY = obj.y + Math.sin(obj.angle) * (obj.size / 2);
            state.rotatePivot = { x: tipX, y: tipY };
        }
        return;
    }
    
    // 2. Çokgen Kapatma Kontrolü
    if (state.selectedTool === 'polygon' && state.tempObject) {
        // Eğer tıklanan yer bir çokgen köşesiyse ve bu köşe ilk köşe ise (veya çok yakınsa)
        if (target.classList.contains('polygon-vertex')) {
            const idx = parseInt(target.getAttribute('data-index'));
            const parentId = target.getAttribute('data-parent-id');
            if (parentId === state.tempObject.id && idx === 0) {
                // Kapat
                state.tempObject.isClosed = true;
                state.objects.push(state.tempObject);
                state.tempObject = null;
                // Aracı sıfırlama, kullanıcı yeni çokgen çizebilir
                renderObjects();
                return;
            }
        }
        // İlk nokta yakınına tıklandı mı? (Snapping zaten yapıldı, koordinat kontrolü yeterli)
        const firstPt = state.tempObject.points[0];
        const closeThreshold = state.snapThreshold * (state.gridStep < 1 ? state.gridStep : 1);
        if (Math.hypot(pt.x - firstPt.x, pt.y - firstPt.y) < closeThreshold) {
            state.tempObject.isClosed = true;
            state.objects.push(state.tempObject);
            state.tempObject = null;
            renderObjects();
            return;
        }
    }

    // 3. Araç Kullanımı
    if (state.selectedTool !== 'move') {
        if (state.selectedTool === 'laser') {
            const obj = new Laser(pt.x, pt.y);
            obj.x = pt.x - Math.cos(obj.angle) * (obj.size / 2);
            obj.y = pt.y - Math.sin(obj.angle) * (obj.size / 2);
            state.objects.push(obj);
            state.selectedObject = obj;
            setTool('move');
        }
        else if (state.selectedTool === 'point') {
            const obj = new Point(pt.x, pt.y);
            state.objects.push(obj);
            setTool('move'); // Nokta tek tek konur genelde, ama seri istenirse bu kaldırılabilir.
            // Kullanıcı seri nokta koymak isterse setTool('move') kaldırılmalı.
            // Şimdilik tek tek kalsın.
        }
        else if (state.selectedTool === 'circle') {
            const obj = new Circle(pt.x, pt.y, 2);
            state.objects.push(obj);
            state.selectedObject = obj;
            setTool('move');
        }
        else if (state.selectedTool === 'parabola') {
            const obj = new Parabola(pt.x, pt.y);
            state.objects.push(obj);
            state.selectedObject = obj;
            setTool('move');
        }
        else if (state.selectedTool === 'line') {
            if (!state.tempObject) {
                // 1. tıklama: ilk noktayı belirle
                state.tempObject = new Line(pt.x, pt.y, pt.x, pt.y);
            } else {
                // 2. tıklama: ikinci noktayı belirle ve doğruyu tamamla
                state.tempObject.x2 = pt.x;
                state.tempObject.y2 = pt.y;
                if (Math.hypot(state.tempObject.x2 - state.tempObject.x1, state.tempObject.y2 - state.tempObject.y1) > 1e-6) {
                    state.objects.push(state.tempObject);
                }
                state.tempObject = null;
                setTool('move');
            }
        }
        else if (state.selectedTool === 'polygon') {
            if (!state.tempObject) {
                state.tempObject = new Polygon([ {x: pt.x, y: pt.y} ]);
            } else {
                state.tempObject.points.push({x: pt.x, y: pt.y});
            }
        }
        renderObjects();
        return;
    }
    
    // 4. Seçim ve Taşıma
    let clickedId = target.getAttribute('data-id') || target.parentElement?.getAttribute('data-id');
    let obj = findObjectById(clickedId);

    // Touch fallback: elementFromPoint is unreliable on mobile SVG.
    // Use geometric proximity search when DOM-based lookup fails.
    if (!obj && e.touches) {
        obj = findObjectAtPoint(pt);
    }
    
    if (obj) {
        state.selectedObject = obj;
        state.isDragging = true;
        
        // Touch rotation: when touching a laser, if finger is close to handle dot, rotate
        if (obj.type === 'laser' && e.touches) {
            const handleDist = obj.size * 2.5;
            const hx = obj.x + handleDist * Math.cos(obj.angle);
            const hy = obj.y + handleDist * Math.sin(obj.angle);
            const distToHandle = Math.hypot(pt.x - hx, pt.y - hy);
            const distToCenter = Math.hypot(pt.x - obj.x, pt.y - obj.y);
            // Only rotate if very close to the handle dot
            if (distToHandle < obj.size * 1.0 && distToHandle < distToCenter) {
                state.dragAction = 'rotate';
                const tipX = obj.x + Math.cos(obj.angle) * (obj.size / 2);
                const tipY = obj.y + Math.sin(obj.angle) * (obj.size / 2);
                state.rotatePivot = { x: tipX, y: tipY };
                state.dragStartX = pt.x;
                state.dragStartY = pt.y;
                renderObjects();
                return;
            }
        }
        
        state.dragAction = 'move';
        state.dragStartX = pt.x;
        state.dragStartY = pt.y;
        renderObjects();
    } else {
        if (state.selectedObject) {
            state.selectedObject = null;
            renderObjects();
        }
        state.isDragging = true;
        state.dragAction = 'pan';
        const client = getClientPosition(e);
        state.dragStartX = client.clientX;
        state.dragStartY = client.clientY;
    }
}

function handlePointerMove(e) {
    let pt = getMousePosition(e);
    
    // Snap Önizleme
    state.snappedPoint = null;
    if (['point', 'polygon', 'line', 'laser', 'circle'].includes(state.selectedTool) || 
        state.dragAction === 'move-p1' || 
        state.dragAction === 'move-p2') {
        
        // Düzenlenen nesneyi snap hesaplamasından hariç tut
        const exclude = state.selectedObject ? [state.selectedObject.id] : [];
        if (state.selectedTool === 'line' && state.tempObject) {
            exclude.push(state.tempObject.id);
        }
        
        const snapped = getSnappedPoint(pt.x, pt.y, exclude);
        if (snapped.snapped) {
            state.snappedPoint = snapped;
            pt = snapped; // İşlemlerde snapli noktayı kullan
        }
    }
    renderUI(); // Snap marker güncellemek için

    // Doğru çizimi iki tıklama arası önizleme (isDragging olmadan da çalışmalı)
    if (state.selectedTool === 'line' && state.tempObject) {
        state.tempObject.x2 = pt.x;
        state.tempObject.y2 = pt.y;
        renderObjects();
    }

    if (!state.isDragging) return;
    
    if (state.dragAction === 'pan') {
        const client = getClientPosition(e);
        const dx = (client.clientX - state.dragStartX) / (svg.clientWidth / state.viewWidth);
        const dy = (client.clientY - state.dragStartY) / (svg.clientHeight / state.viewHeight);
        state.viewX -= dx;
        state.viewY -= dy;
        state.dragStartX = client.clientX;
        state.dragStartY = client.clientY;
        updateViewBox();
        return;
    }
    
    if (state.selectedObject) {
        // Move işlemi delta kullanır
        // Ancak snap varsa, delta yerine doğrudan konuma gitmek gerekebilir.
        // Basitlik için move işleminde snap yapmıyoruz (serbest taşıma), sadece create/edit işlemlerinde.
        
        const rawPt = getMousePosition(e); // Snap'siz ham veri delta hesabı için
        
        if (state.dragAction === 'move') {
            const dx = rawPt.x - state.dragStartX;
            const dy = rawPt.y - state.dragStartY;
            
            if (state.selectedObject.type === 'polygon') {
                state.selectedObject.points.forEach(p => { p.x += dx; p.y += dy; });
            } else if (state.selectedObject.type === 'line') {
                state.selectedObject.x1 += dx; state.selectedObject.y1 += dy;
                state.selectedObject.x2 += dx; state.selectedObject.y2 += dy;
            } else {
                state.selectedObject.x += dx;
                state.selectedObject.y += dy;
            }
            state.dragStartX = rawPt.x;
            state.dragStartY = rawPt.y;
        }
        else if (state.dragAction === 'rotate') {
            // Lazer Açısı Snapping
            const obj = state.selectedObject;
            const pivot = state.rotatePivot;
            if (obj.type === 'laser' && pivot) {
                let angle = Math.atan2(pt.y - pivot.y, pt.x - pivot.x);
                angle = getSnappedAngle(angle, obj);
                obj.angle = angle;
                obj.x = pivot.x - Math.cos(angle) * (obj.size / 2);
                obj.y = pivot.y - Math.sin(angle) * (obj.size / 2);
            } else {
                let angle = Math.atan2(pt.y - obj.y, pt.x - obj.x);
                angle = getSnappedAngle(angle, obj);
                obj.angle = angle;
            }
        }
        else if (state.dragAction === 'resize') {
            state.selectedObject.r = Math.hypot(pt.x - state.selectedObject.x, pt.y - state.selectedObject.y);
        }
        else if (state.dragAction === 'resize-parabola') {
            state.selectedObject.a = state.selectedObject.y - pt.y;
        }
        else if (state.dragAction === 'move-p1') {
            state.selectedObject.x1 = pt.x;
            state.selectedObject.y1 = pt.y;
        }
        else if (state.dragAction === 'move-p2') {
            state.selectedObject.x2 = pt.x;
            state.selectedObject.y2 = pt.y;
        }
        
        renderObjects();
    }
    
}

window.addEventListener('mouseup', () => {
    state.isDragging = false;
    state.dragAction = null;
    state.rotatePivot = null;
});

// ==========================================
// TOUCH EVENT SUPPORT
// ==========================================

// Pinch-to-zoom state
let touchState = {
    lastPinchDist: 0,
    isPinching: false
};

function getTouchDistance(t1, t2) {
    return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
}

svg.addEventListener('touchstart', e => {
    e.preventDefault();

    // Pinch-to-zoom with two fingers
    if (e.touches.length === 2) {
        touchState.isPinching = true;
        touchState.lastPinchDist = getTouchDistance(e.touches[0], e.touches[1]);
        state.isDragging = false;
        state.dragAction = null;
        return;
    }

    const touch = e.touches[0];

    // DIRECT touch rotation/resize handle detection — pure coordinate math, no elementFromPoint
    // This is the PRIMARY method for touch handle detection (elementFromPoint is unreliable on mobile)
    if (state.selectedObject && state.selectedTool === 'move') {
        const { x: svgX, y: svgY } = touchToSVG(touch.clientX, touch.clientY);
        const obj = state.selectedObject;

        if (obj.type === 'laser') {
            const handleDist = obj.size * 2.5;
            const hx = obj.x + handleDist * Math.cos(obj.angle);
            const hy = obj.y + handleDist * Math.sin(obj.angle);
            const distToHandle = Math.hypot(svgX - hx, svgY - hy);
            const distToCenter = Math.hypot(svgX - obj.x, svgY - obj.y);
            // Tight threshold — must be close to the handle dot specifically
            if (distToHandle < obj.size * 1.0 && distToHandle < distToCenter) {
                state.isDragging = true;
                state.dragAction = 'rotate';
                state.dragStartX = svgX;
                state.dragStartY = svgY;
                const tipX = obj.x + Math.cos(obj.angle) * (obj.size / 2);
                const tipY = obj.y + Math.sin(obj.angle) * (obj.size / 2);
                state.rotatePivot = { x: tipX, y: tipY };
                return;
            }
        } else if (obj.type === 'circle') {
            const hx = obj.x + obj.r;
            const hy = obj.y;
            const distToHandle = Math.hypot(svgX - hx, svgY - hy);
            const distToCenter = Math.hypot(svgX - obj.x, svgY - obj.y);
            // Guard: only resize if closer to handle than to center (prevents vertex-tap from triggering resize)
            if (distToHandle < Math.max(1, state.viewWidth * 0.08) && distToHandle < distToCenter) {
                state.isDragging = true;
                state.dragAction = 'resize';
                state.dragStartX = svgX;
                state.dragStartY = svgY;
                return;
            }
        } else if (obj.type === 'parabola') {
            const hx = obj.x + 1;
            const hy = obj.y - obj.a;
            const distToHandle = Math.hypot(svgX - hx, svgY - hy);
            const distToVertex = Math.hypot(svgX - obj.x, svgY - obj.y);
            // Guard: only resize if closer to handle than to vertex
            if (distToHandle < Math.max(1, state.viewWidth * 0.08) && distToHandle < distToVertex) {
                state.isDragging = true;
                state.dragAction = 'resize-parabola';
                state.dragStartX = svgX;
                state.dragStartY = svgY;
                return;
            }
        }
    }

    // Single touch - forward to mousedown logic
    const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);

    // Create a synthetic event-like object
    const syntheticEvent = {
        preventDefault: () => {},
        clientX: touch.clientX,
        clientY: touch.clientY,
        touches: e.touches,
        target: targetEl || e.target
    };

    // Fire mousedown handler
    handlePointerDown(syntheticEvent);
}, { passive: false });

svg.addEventListener('touchmove', e => {
    e.preventDefault();

    // Pinch-to-zoom
    if (e.touches.length === 2 && touchState.isPinching) {
        const newDist = getTouchDistance(e.touches[0], e.touches[1]);
        if (touchState.lastPinchDist > 0) {
            const scale = touchState.lastPinchDist / newDist;
            // Zoom center: midpoint of two touches
            const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            const CTM = svg.getScreenCTM();
            if (CTM) {
                const svgMidX = (midX - CTM.e) / CTM.a;
                const svgMidY = (midY - CTM.f) / CTM.d;
                const newWidth = Math.max(2, Math.min(100, state.viewWidth * scale));
                const ratio = newWidth / state.viewWidth;
                state.viewX = svgMidX - (svgMidX - state.viewX) * ratio;
                state.viewY = svgMidY - (svgMidY - state.viewY) * ratio;
                state.viewWidth = newWidth;
                updateViewBox();
            }
        }
        touchState.lastPinchDist = newDist;
        return;
    }

    if (e.touches.length !== 1) return;

    // Touch rotation/resize: lightweight update, NO DOM rebuild
    if (state.isDragging && state.dragAction === 'rotate') {
        touchRotateLaser(e.touches[0].clientX, e.touches[0].clientY);
        return;
    }
    if (state.isDragging && state.dragAction === 'resize') {
        touchResizeCircle(e.touches[0].clientX, e.touches[0].clientY);
        return;
    }
    if (state.isDragging && state.dragAction === 'resize-parabola') {
        touchResizeParabola(e.touches[0].clientX, e.touches[0].clientY);
        return;
    }
    if (state.isDragging && state.dragAction === 'move') {
        touchMoveObject(e.touches[0].clientX, e.touches[0].clientY);
        return;
    }

    // Single touch move - forward to mousemove logic
    const syntheticEvent = {
        preventDefault: () => {},
        clientX: e.touches[0].clientX,
        clientY: e.touches[0].clientY,
        touches: e.touches,
        target: e.target
    };

    handlePointerMove(syntheticEvent);
}, { passive: false });

svg.addEventListener('touchend', e => {
    e.preventDefault();

    if (touchState.isPinching) {
        touchState.isPinching = false;
        touchState.lastPinchDist = 0;
        if (e.touches.length === 0) {
            state.isDragging = false;
            state.dragAction = null;
        }
        return;
    }

    const wasRotating = state.dragAction === 'rotate';
    const wasResizing = state.dragAction === 'resize' || state.dragAction === 'resize-parabola';
    const wasMoving = state.dragAction === 'move';
    state.isDragging = false;
    state.dragAction = null;
    state.rotatePivot = null;
    // Full rebuild after interaction ends to restore proper UI with touch listeners
    if (wasRotating || wasResizing || wasMoving) renderObjects();
}, { passive: false });

svg.addEventListener('touchcancel', () => {
    touchState.isPinching = false;
    touchState.lastPinchDist = 0;
    state.isDragging = false;
    state.dragAction = null;
    state.rotatePivot = null;
});

// Document-level touch handlers — safety net for when touch starts on handle elements
// (touchmove/touchend might not bubble to SVG on some mobile browsers)
document.addEventListener('touchmove', e => {
    if (!state.isDragging) return;
    if (!e.touches || e.touches.length !== 1) return;
    if (state.dragAction === 'rotate') {
        e.preventDefault();
        touchRotateLaser(e.touches[0].clientX, e.touches[0].clientY);
    } else if (state.dragAction === 'resize') {
        e.preventDefault();
        touchResizeCircle(e.touches[0].clientX, e.touches[0].clientY);
    } else if (state.dragAction === 'resize-parabola') {
        e.preventDefault();
        touchResizeParabola(e.touches[0].clientX, e.touches[0].clientY);
    } else if (state.dragAction === 'move') {
        e.preventDefault();
        touchMoveObject(e.touches[0].clientX, e.touches[0].clientY);
    }
}, { passive: false });

document.addEventListener('touchend', e => {
    if (!state.isDragging) return;
    const wasRotating = state.dragAction === 'rotate';
    const wasResizing = state.dragAction === 'resize' || state.dragAction === 'resize-parabola';
    const wasMoving = state.dragAction === 'move';
    state.isDragging = false;
    state.dragAction = null;
    state.rotatePivot = null;
    if (wasRotating || wasResizing || wasMoving) renderObjects();
}, { passive: false });

// UI Event Listeners
function setTool(tool) {
    state.selectedTool = tool;
    document.querySelectorAll('#tools-panel button').forEach(btn => btn.classList.remove('active'));
    const btn = document.getElementById(`tool-${tool}`);
    if (btn) btn.classList.add('active');
    
    state.tempObject = null;
    if (tool !== 'move') {
        state.selectedObject = null;
        renderObjects();
    }
}

['move', 'laser', 'point', 'circle', 'polygon', 'parabola', 'line', 'direction', 'copy', 'delete'].forEach(tool => {
    const btn = document.getElementById(`tool-${tool}`);
    if (btn) btn.addEventListener('click', () => setTool(tool));
});

const btnUnitCircle = document.getElementById('tool-unit-circle');
if (btnUnitCircle) {
    btnUnitCircle.addEventListener('click', () => {
        const obj = new Circle(0, 0, 1);
        state.objects.push(obj);
        
        // Zoom yap ve grid'i güncelle
        state.viewWidth = 4; // -2 ile +2 arası görünür
        state.viewX = -2;
        state.viewY = -2; 
        state.gridStep = 0.1; // Hassas grid
        
        // Snap threshold güncelle (0.1 grid için daha hassas olmalı)
        // state.snapThreshold'u değiştirmeyelim, çünkü getSnappedPoint'te zaten gridStep'e göre ölçekleniyor.
        // Eğer 0.05 yaparsak 0.1 * 0.05 = 0.005 gibi çok küçük bir değer oluyor ve snap zorlaşıyor.
        // O yüzden bunu kaldırıyoruz.
        // state.snapThreshold = 0.05;

        updateViewBox();
        setTool('move');
        renderObjects();
    });
}

document.getElementById('tool-clear').addEventListener('click', () => {
    if(confirm('Tüm sahne temizlensin mi?')) {
        state.objects = [];
        state.selectedObject = null;
        state.tempObject = null;
        state.directionRays = [];
        state.viewX = -10;
        state.viewY = -10;
        state.viewWidth = 20;
        state.gridStep = 1;
        updateViewBox();
        renderObjects();
    }
});

window.addEventListener('resize', updateViewBox);

// Prevent default touch behaviors on SVG canvas
svg.style.touchAction = 'none';

// Mouse wheel zoom
svg.addEventListener('wheel', e => {
    e.preventDefault();
    const scale = e.deltaY > 0 ? 1.1 : 0.9;
    const pt = getMousePosition(e);
    const newWidth = Math.max(2, Math.min(100, state.viewWidth * scale));
    const ratio = newWidth / state.viewWidth;
    state.viewX = pt.x - (pt.x - state.viewX) * ratio;
    state.viewY = pt.y - (pt.y - state.viewY) * ratio;
    state.viewWidth = newWidth;
    updateViewBox();
}, { passive: false });

updateViewBox();
renderObjects();
