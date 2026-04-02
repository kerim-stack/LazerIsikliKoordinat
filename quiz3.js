class Quiz3Manager {
    constructor() {
        this.isActive = false;
        this.currentStep = 0;
        this.laserLocked = false; // prevent laser position change, only rotation
        this.overlayUpdateBound = null; // bound mousemove handler for overlay drawing
        this.questionMode = null; // 'sin' | 'tan' | null

        // UI Elements
        this.container = document.getElementById('quiz3-container');
        this.instructionEl = document.getElementById('quiz3-instruction');
        this.feedbackEl = document.getElementById('quiz3-feedback');
        this.questionArea = document.getElementById('quiz3-question-area');
        this.nextBtn = document.getElementById('quiz3-next-btn');
        this.progressBar = document.getElementById('quiz3-progress-bar');

        // SVG overlay layers (shared with tutorial)
        this.overlayLayer = document.getElementById('tutorial-overlay-layer');
        this.axesLayer = document.getElementById('tutorial-axes-layer');

        // Angle snap targets per question
        this.sinAngles = [10, 30, 45, 60, 90, 100];
        this.tanAngles = [20, 45, 75, 100];
        this.customSnapTargets = [];

        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => this.advanceStep());
        }

        // Patch laser movement: intercept drag to prevent position change
        this._patchLaserMovement();

        this.startQuiz();
    }

    // ═══════════ LIFECYCLE ═══════════

    startQuiz() {
        this.isActive = true;
        this.currentStep = 0;
        this.clearCanvas();
        if (this.container) this.container.style.display = 'block';
        this.renderStep();
    }

    deactivate() {
        this.stopOverlayUpdates();
        this.disableAngleSnapping();
        this.laserLocked = false;
        if (this.overlayLayer) this.overlayLayer.innerHTML = '';
        if (this.axesLayer) this.axesLayer.innerHTML = '';
        if (this.container) this.container.style.display = 'none';
        this.isActive = false;
    }

    advanceStep() {
        if (this.nextBtn) this.nextBtn.style.display = 'none';
        this.currentStep++;
        this.renderStep();
    }

    clearCanvas() {
        if (this.overlayLayer) this.overlayLayer.innerHTML = '';
        if (this.axesLayer) this.axesLayer.innerHTML = '';
        if (typeof state !== 'undefined') {
            state.objects = [];
            state.directionRays = [];
            state.selectedObject = null;
            state.tempObject = null;
            if (typeof renderObjects === 'function') renderObjects();
        }
    }

    setupScene() {
        this.clearCanvas();
        const unitCircle = new Circle(0, 0, 1);
        state.objects.push(unitCircle);

        state.viewWidth = 4;
        state.viewX = -2;
        state.viewY = -2;
        state.gridStep = 0.1;
        updateViewBox();

        const laser = new Laser(0, 0);
        laser.angle = 0;
        laser.size = 0.2;
        laser.x = 0 - Math.cos(laser.angle) * (laser.size / 2);
        laser.y = 0 - Math.sin(laser.angle) * (laser.size / 2);
        state.objects.push(laser);

        if (typeof setTool === 'function') setTool('move');
        renderObjects();
    }

    // ═══════════ LASER LOCK (prevent position change, rotation only) ═══════════

    _patchLaserMovement() {
        // Override state drag to prevent laser translation AND force origin position
        const self = this;
        const origSvg = document.getElementById('mainSvg');
        if (!origSvg) return;

        origSvg.addEventListener('mousemove', (e) => {
            if (!self.laserLocked) return;
            if (!state.selectedObject || state.selectedObject.type !== 'laser') return;

            const laser = state.selectedObject;

            if (state.isDragging && state.dragAction === 'move') {
                // Cancel the move by resetting drag start
                const CTM = origSvg.getScreenCTM();
                if (CTM) {
                    state.dragStartX = (e.clientX - CTM.e) / CTM.a;
                    state.dragStartY = (e.clientY - CTM.f) / CTM.d;
                }
            }

            // Force laser pivot (tip) to stay at origin
            // Laser tip = (x + cos(angle)*size/2, y + sin(angle)*size/2)
            // We want tip at (0,0), so:
            laser.x = 0 - Math.cos(laser.angle) * (laser.size / 2);
            laser.y = 0 - Math.sin(laser.angle) * (laser.size / 2);
        }, true); // capture phase — runs before script.js handler

        // Touch equivalent for laser lock
        origSvg.addEventListener('touchmove', (e) => {
            if (!self.laserLocked) return;
            if (!state.selectedObject || state.selectedObject.type !== 'laser') return;
            if (!e.touches || e.touches.length === 0) return;

            const laser = state.selectedObject;
            const touch = e.touches[0];

            if (state.isDragging && state.dragAction === 'move') {
                const CTM = origSvg.getScreenCTM();
                if (CTM) {
                    state.dragStartX = (touch.clientX - CTM.e) / CTM.a;
                    state.dragStartY = (touch.clientY - CTM.f) / CTM.d;
                }
            }

            laser.x = 0 - Math.cos(laser.angle) * (laser.size / 2);
            laser.y = 0 - Math.sin(laser.angle) * (laser.size / 2);
        }, true); // capture phase
    }

    // ═══════════ CUSTOM ANGLE SNAPPING ═══════════

    enableAngleSnapping(angleDegrees) {
        // Negate: math degrees to SVG radians (SVG y-axis is inverted)
        this.customSnapTargets = angleDegrees.map(d => -d * Math.PI / 180);
        // Monkey-patch getSnappedAngle to add custom targets
        if (!this._origGetSnappedAngle) {
            this._origGetSnappedAngle = window.getSnappedAngle;
        }
        const self = this;
        window.getSnappedAngle = function(currentAngle, obj) {
            let bestAngle = self._origGetSnappedAngle(currentAngle, obj);
            let minDiff = state.angleSnapThreshold;

            // Check if orig already snapped close
            const origDiff = Math.abs(Math.atan2(Math.sin(bestAngle - currentAngle), Math.cos(bestAngle - currentAngle)));

            for (const target of self.customSnapTargets) {
                const diff = Math.atan2(Math.sin(target - currentAngle), Math.cos(target - currentAngle));
                if (Math.abs(diff) < minDiff) {
                    minDiff = Math.abs(diff);
                    bestAngle = currentAngle + diff;
                }
            }
            return bestAngle;
        };
    }

    disableAngleSnapping() {
        if (this._origGetSnappedAngle) {
            window.getSnappedAngle = this._origGetSnappedAngle;
            this._origGetSnappedAngle = null;
        }
        this.customSnapTargets = [];
    }

    // ═══════════ LIVE OVERLAY DRAWING ═══════════

    startOverlayUpdates(mode) {
        this.questionMode = mode;
        this.stopOverlayUpdates();
        this.overlayUpdateBound = () => this.updateOverlay();

        // Use requestAnimationFrame poll for smooth updates
        const poll = () => {
            if (!this.overlayUpdateBound) return;
            this.updateOverlay();
            this._overlayRAF = requestAnimationFrame(poll);
        };
        this._overlayRAF = requestAnimationFrame(poll);
    }

    stopOverlayUpdates() {
        this.overlayUpdateBound = null;
        if (this._overlayRAF) {
            cancelAnimationFrame(this._overlayRAF);
            this._overlayRAF = null;
        }
    }

    updateOverlay() {
        const laser = state.objects.find(o => o.type === 'laser');
        if (!laser || !this.overlayLayer) return;

        // Convert SVG angle to math angle (negate because SVG y-axis is inverted)
        let angleDeg = -laser.angle * 180 / Math.PI;
        // Normalize to 0-360
        while (angleDeg < 0) angleDeg += 360;
        while (angleDeg >= 360) angleDeg -= 360;

        if (this.questionMode === 'sin') {
            this.drawSinOverlay(angleDeg);
        } else if (this.questionMode === 'tan') {
            this.drawTanOverlay(angleDeg);
        }
    }

    // ═══════════ SIN OVERLAY ═══════════

    drawSinOverlay(deg) {
        if (!this.overlayLayer) return;
        this.overlayLayer.innerHTML = '';

        const rad = deg * Math.PI / 180;
        const cosVal = Math.cos(rad);
        const sinVal = Math.sin(rad);
        const px = cosVal;
        const py = -sinVal; // SVG y inverted
        const NS = 'http://www.w3.org/2000/svg';

        // P point
        const pDot = document.createElementNS(NS, 'circle');
        pDot.setAttribute('cx', px);
        pDot.setAttribute('cy', py);
        pDot.setAttribute('r', 0.04);
        pDot.setAttribute('fill', '#e74c3c');
        this.overlayLayer.appendChild(pDot);

        const pLabel = document.createElementNS(NS, 'text');
        pLabel.setAttribute('x', px + 0.08);
        pLabel.setAttribute('y', py - 0.08);
        pLabel.setAttribute('font-size', '0.07');
        pLabel.setAttribute('fill', '#e74c3c');
        pLabel.setAttribute('font-weight', 'bold');
        pLabel.setAttribute('pointer-events', 'none');
        pLabel.textContent = 'P';
        this.overlayLayer.appendChild(pLabel);

        // Dashed vertical line P → x-axis
        const dashV = document.createElementNS(NS, 'line');
        dashV.setAttribute('x1', px);
        dashV.setAttribute('y1', py);
        dashV.setAttribute('x2', px);
        dashV.setAttribute('y2', 0);
        dashV.setAttribute('stroke', '#e74c3c');
        dashV.setAttribute('stroke-width', '1px');
        dashV.setAttribute('stroke-dasharray', '0.03 0.02');
        dashV.setAttribute('vector-effect', 'non-scaling-stroke');
        dashV.setAttribute('opacity', '0.5');
        this.overlayLayer.appendChild(dashV);

        // Dashed horizontal line P → y-axis
        const dashH = document.createElementNS(NS, 'line');
        dashH.setAttribute('x1', px);
        dashH.setAttribute('y1', py);
        dashH.setAttribute('x2', 0);
        dashH.setAttribute('y2', py);
        dashH.setAttribute('stroke', '#e74c3c');
        dashH.setAttribute('stroke-width', '1px');
        dashH.setAttribute('stroke-dasharray', '0.03 0.02');
        dashH.setAttribute('vector-effect', 'non-scaling-stroke');
        dashH.setAttribute('opacity', '0.4');
        this.overlayLayer.appendChild(dashH);

        // SOLID thick color on Y-axis: 0 → sin α
        if (Math.abs(sinVal) > 0.02) {
            const sinAxis = document.createElementNS(NS, 'line');
            sinAxis.setAttribute('x1', 0);
            sinAxis.setAttribute('y1', 0);
            sinAxis.setAttribute('x2', 0);
            sinAxis.setAttribute('y2', py);
            sinAxis.setAttribute('stroke', '#e74c3c');
            sinAxis.setAttribute('stroke-width', '5px');
            sinAxis.setAttribute('vector-effect', 'non-scaling-stroke');
            sinAxis.setAttribute('stroke-linecap', 'round');
            sinAxis.setAttribute('opacity', '0.85');
            this.overlayLayer.appendChild(sinAxis);

            const sinMark = document.createElementNS(NS, 'circle');
            sinMark.setAttribute('cx', 0);
            sinMark.setAttribute('cy', py);
            sinMark.setAttribute('r', 0.03);
            sinMark.setAttribute('fill', '#e74c3c');
            this.overlayLayer.appendChild(sinMark);

            // sin label on y-axis (no numeric value)
            const sinLabel = document.createElementNS(NS, 'text');
            sinLabel.setAttribute('x', -0.08);
            sinLabel.setAttribute('y', py / 2);
            sinLabel.setAttribute('font-size', '0.055');
            sinLabel.setAttribute('fill', '#e74c3c');
            sinLabel.setAttribute('font-weight', 'bold');
            sinLabel.setAttribute('text-anchor', 'end');
            sinLabel.setAttribute('dominant-baseline', 'middle');
            sinLabel.setAttribute('pointer-events', 'none');
            sinLabel.textContent = 'sin ' + Math.round(deg) + '°';
            this.overlayLayer.appendChild(sinLabel);
        }

        // Angle arc + label
        this._drawAngleArc(deg, NS);
    }

    // ═══════════ TAN OVERLAY ═══════════

    drawTanOverlay(deg) {
        if (!this.overlayLayer) return;
        this.overlayLayer.innerHTML = '';

        const rad = deg * Math.PI / 180;
        const cosVal = Math.cos(rad);
        const sinVal = Math.sin(rad);
        const tanVal = Math.tan(rad);
        const px = cosVal;
        const py = -sinVal;
        const NS = 'http://www.w3.org/2000/svg';

        // P point on unit circle
        const pDot = document.createElementNS(NS, 'circle');
        pDot.setAttribute('cx', px);
        pDot.setAttribute('cy', py);
        pDot.setAttribute('r', 0.04);
        pDot.setAttribute('fill', '#4361ee');
        this.overlayLayer.appendChild(pDot);

        const pLabel = document.createElementNS(NS, 'text');
        pLabel.setAttribute('x', px + 0.08);
        pLabel.setAttribute('y', py - 0.08);
        pLabel.setAttribute('font-size', '0.07');
        pLabel.setAttribute('fill', '#4361ee');
        pLabel.setAttribute('font-weight', 'bold');
        pLabel.setAttribute('pointer-events', 'none');
        pLabel.textContent = 'P';
        this.overlayLayer.appendChild(pLabel);

        // tan axis is already drawn in axesLayer

        if (Math.abs(cosVal) < 0.01) {
            // tan undefined at 90°/270°
            const undLabel = document.createElementNS(NS, 'text');
            undLabel.setAttribute('x', 0);
            undLabel.setAttribute('y', -1.3);
            undLabel.setAttribute('font-size', '0.07');
            undLabel.setAttribute('fill', '#e74c3c');
            undLabel.setAttribute('font-weight', 'bold');
            undLabel.setAttribute('text-anchor', 'middle');
            undLabel.setAttribute('pointer-events', 'none');
            undLabel.textContent = 'tan ' + Math.round(deg) + '° tanımsız!';
            this.overlayLayer.appendChild(undLabel);
            this._drawAngleArc(deg, NS);
            return;
        }

        const ty = -tanVal; // SVG y of T point on tan axis
        const needsExtension = cosVal < 0; // Q2/Q3

        const minY = state.viewY;
        const maxY = state.viewY + state.viewHeight;
        const inView = ty >= minY && ty <= maxY;

        // Colored tan segment on x=1 axis
        const segEndY = inView ? ty : (ty < minY ? minY : maxY);
        const tanSeg = document.createElementNS(NS, 'line');
        tanSeg.setAttribute('x1', 1);
        tanSeg.setAttribute('y1', 0);
        tanSeg.setAttribute('x2', 1);
        tanSeg.setAttribute('y2', segEndY);
        tanSeg.setAttribute('stroke', '#f39c12');
        tanSeg.setAttribute('stroke-width', '5px');
        tanSeg.setAttribute('vector-effect', 'non-scaling-stroke');
        tanSeg.setAttribute('stroke-linecap', 'round');
        tanSeg.setAttribute('opacity', '0.85');
        this.overlayLayer.appendChild(tanSeg);

        // Ray/Extension line from origin to T on tan axis
        if (needsExtension) {
            // Extension: dashed line from origin through to T
            const extLine = document.createElementNS(NS, 'line');
            extLine.setAttribute('x1', 0);
            extLine.setAttribute('y1', 0);
            extLine.setAttribute('x2', 1);
            extLine.setAttribute('y2', ty);
            extLine.setAttribute('stroke', 'rgba(243, 156, 18, 0.5)');
            extLine.setAttribute('stroke-width', '1.5px');
            extLine.setAttribute('stroke-dasharray', '0.05 0.03');
            extLine.setAttribute('vector-effect', 'non-scaling-stroke');
            this.overlayLayer.appendChild(extLine);
        } else if (inView) {
            const rayLine = document.createElementNS(NS, 'line');
            rayLine.setAttribute('x1', 0);
            rayLine.setAttribute('y1', 0);
            rayLine.setAttribute('x2', 1);
            rayLine.setAttribute('y2', ty);
            rayLine.setAttribute('stroke', 'rgba(243, 156, 18, 0.4)');
            rayLine.setAttribute('stroke-width', '1px');
            rayLine.setAttribute('stroke-dasharray', '0.03 0.02');
            rayLine.setAttribute('vector-effect', 'non-scaling-stroke');
            this.overlayLayer.appendChild(rayLine);
        }

        // T point and labels
        if (inView) {
            const tDot = document.createElementNS(NS, 'circle');
            tDot.setAttribute('cx', 1);
            tDot.setAttribute('cy', ty);
            tDot.setAttribute('r', 0.035);
            tDot.setAttribute('fill', '#f39c12');
            this.overlayLayer.appendChild(tDot);

            const tLabel = document.createElementNS(NS, 'text');
            tLabel.setAttribute('x', 1.1);
            tLabel.setAttribute('y', ty - 0.06);
            tLabel.setAttribute('font-size', '0.055');
            tLabel.setAttribute('fill', '#f39c12');
            tLabel.setAttribute('font-weight', 'bold');
            tLabel.setAttribute('dominant-baseline', 'middle');
            tLabel.setAttribute('pointer-events', 'none');
            tLabel.textContent = 'T';
            this.overlayLayer.appendChild(tLabel);

            // tan label (no numeric value)
            const tanLabel = document.createElementNS(NS, 'text');
            tanLabel.setAttribute('x', 1.1);
            tanLabel.setAttribute('y', ty + 0.06);
            tanLabel.setAttribute('font-size', '0.05');
            tanLabel.setAttribute('fill', '#e67e22');
            tanLabel.setAttribute('font-weight', 'bold');
            tanLabel.setAttribute('dominant-baseline', 'middle');
            tanLabel.setAttribute('pointer-events', 'none');
            tanLabel.textContent = 'tan ' + Math.round(deg) + '°';
            this.overlayLayer.appendChild(tanLabel);
        }

        // Angle arc
        this._drawAngleArc(deg, NS);
    }

    // ═══════════ TAN AXIS DRAWING ═══════════

    drawTanAxis() {
        if (!this.axesLayer) return;
        this.axesLayer.innerHTML = '';
        const NS = 'http://www.w3.org/2000/svg';

        const tanAxis = document.createElementNS(NS, 'line');
        tanAxis.setAttribute('x1', 1);
        tanAxis.setAttribute('y1', -2);
        tanAxis.setAttribute('x2', 1);
        tanAxis.setAttribute('y2', 2);
        tanAxis.setAttribute('stroke', '#f39c12');
        tanAxis.setAttribute('stroke-width', '2px');
        tanAxis.setAttribute('vector-effect', 'non-scaling-stroke');
        this.axesLayer.appendChild(tanAxis);

        const label = document.createElementNS(NS, 'text');
        label.setAttribute('x', 1.06);
        label.setAttribute('y', -1.85);
        label.setAttribute('font-size', '0.06');
        label.setAttribute('fill', '#f39c12');
        label.setAttribute('font-weight', 'bold');
        label.setAttribute('pointer-events', 'none');
        label.textContent = 'tan ekseni (x=1)';
        this.axesLayer.appendChild(label);
    }

    // ═══════════ ANGLE ARC HELPER ═══════════

    _drawAngleArc(deg, NS) {
        // Big angle label
        const angleDisplay = document.createElementNS(NS, 'text');
        const aLabelRad = (Math.min(deg, 90) / 2) * Math.PI / 180;
        const labelR = deg > 50 ? 0.28 : 0.22;
        angleDisplay.setAttribute('x', labelR * Math.cos(aLabelRad));
        angleDisplay.setAttribute('y', -labelR * Math.sin(aLabelRad));
        angleDisplay.setAttribute('font-size', '0.07');
        angleDisplay.setAttribute('fill', '#333');
        angleDisplay.setAttribute('font-weight', 'bold');
        angleDisplay.setAttribute('text-anchor', 'middle');
        angleDisplay.setAttribute('pointer-events', 'none');
        angleDisplay.textContent = Math.round(deg) + '°';
        this.overlayLayer.appendChild(angleDisplay);

        if (deg > 1) {
            const arcPath = this._makeArc(0, 0, 0.15, 0, deg);
            const arc = document.createElementNS(NS, 'path');
            arc.setAttribute('d', arcPath);
            arc.setAttribute('fill', 'none');
            arc.setAttribute('stroke', '#333');
            arc.setAttribute('stroke-width', '2px');
            arc.setAttribute('vector-effect', 'non-scaling-stroke');
            this.overlayLayer.appendChild(arc);
        }
    }

    _makeArc(cx, cy, r, startDeg, endDeg) {
        const startRad = startDeg * Math.PI / 180;
        const endRad = endDeg * Math.PI / 180;
        const x1 = cx + r * Math.cos(startRad);
        const y1 = cy - r * Math.sin(startRad);
        const x2 = cx + r * Math.cos(endRad);
        const y2 = cy - r * Math.sin(endRad);
        const largeArc = (endDeg - startDeg) > 180 ? 1 : 0;
        return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 0 ${x2} ${y2}`;
    }

    // ═══════════ STEP RENDERING ═══════════

    renderStep() {
        // Cleanup from previous step
        this.stopOverlayUpdates();
        this.disableAngleSnapping();
        this.laserLocked = false;
        if (this.overlayLayer) this.overlayLayer.innerHTML = '';
        if (this.axesLayer) this.axesLayer.innerHTML = '';

        // Reset UI
        this.feedbackEl.style.display = 'none';
        this.feedbackEl.className = 'tutorial-feedback';
        this.questionArea.innerHTML = '';
        if (this.nextBtn) this.nextBtn.style.display = 'none';

        // Progress bar
        const totalSteps = 6;
        const pct = (this.currentStep / (totalSteps - 1)) * 100;
        if (this.progressBar) this.progressBar.style.width = pct + '%';

        switch (this.currentStep) {
            case 0: this.renderIntro(); break;
            case 1: this.renderExploreSin(); break;
            case 2: this.renderOrderSin(); break;
            case 3: this.renderExploreTan(); break;
            case 4: this.renderOrderTan(); break;
            case 5: this.renderSuccess(); break;
        }
    }

    // ── Step 0: Introduction ──
    renderIntro() {
        this.instructionEl.innerHTML = `
            <strong>Değerlendirme Bölümüne Hoş Geldiniz!</strong><br><br>
            Bu bölümde birim çember üzerinde <strong>lazer aracını</strong> kullanarak trigonometrik 
            değerleri keşfedecek ve sıralama yapacaksınız.<br><br>
            <em>Aşağıdaki etkileşimli alanda lazeri döndürerek belirtilen açılardaki 
            sin ve tan değerlerini gözlemleyin. Ardından sıralama sorularını cevaplayın.</em>
        `;
        this.setupScene();

        if (this.nextBtn) {
            this.nextBtn.style.display = 'block';
            this.nextBtn.innerHTML = 'Başla <i class="fas fa-arrow-right"></i>';
        }
    }

    // ── Step 1: Explore sin values ──
    renderExploreSin() {
        this.instructionEl.innerHTML = `
            <strong>Soru 1 — Keşif Aşaması:</strong><br>
            Lazeri döndürerek aşağıdaki açılardaki <strong>sin</strong> değerlerini gözlemleyin.<br>
            <strong style="color:#e74c3c;">Y ekseni üzerindeki kırmızı bölge</strong> sin değerini göstermektedir.<br><br>
            <span style="display:inline-flex; gap:10px; flex-wrap:wrap;">
                <span class="angle-badge">10°</span>
                <span class="angle-badge">30°</span>
                <span class="angle-badge">45°</span>
                <span class="angle-badge">60°</span>
                <span class="angle-badge">90°</span>
                <span class="angle-badge">100°</span>
            </span><br><br>
            <em><i class="fas fa-lightbulb" style="color:#f39c12;"></i> İpucu: Lazeri seçin, sonra döndürme tutamacını (sarı nokta) sürükleyin. 
            Lazer belirtilen açılara otomatik olarak yapışacaktır.</em>
        `;

        this.laserLocked = true;
        this.enableAngleSnapping(this.sinAngles);
        this.startOverlayUpdates('sin');

        if (this.nextBtn) {
            this.nextBtn.style.display = 'block';
            this.nextBtn.innerHTML = 'Sıralamaya Geç <i class="fas fa-arrow-right"></i>';
        }
    }

    // ── Step 2: Order sin values (click-to-order) ──
    renderOrderSin() {
        this.laserLocked = true;
        this.enableAngleSnapping(this.sinAngles);
        this.startOverlayUpdates('sin');

        this.instructionEl.innerHTML = `
            <strong>Soru 1:</strong> Aşağıdaki sin değerlerini <strong>büyükten küçüğe</strong> doğru sıralayınız.<br>
            <em>Değerleri doğru sırayla tek tek tıklayın. Yanlış tıklarsanız sıfırlayabilirsiniz.</em>
        `;

        const items = [
            { id: 'sin10', label: 'sin 10°' },
            { id: 'sin30', label: 'sin 30°' },
            { id: 'sin45', label: 'sin 45°' },
            { id: 'sin60', label: 'sin 60°' },
            { id: 'sin90', label: 'sin 90°' },
            { id: 'sin100', label: 'sin 100°' }
        ];

        // Correct: sin90° > sin100° > sin60° > sin45° > sin30° > sin10°
        const correctOrder = ['sin90', 'sin100', 'sin60', 'sin45', 'sin30', 'sin10'];

        this.createClickToOrder(items, correctOrder, 'sin');
    }

    // ── Step 3: Explore tan values ──
    renderExploreTan() {
        this.instructionEl.innerHTML = `
            <strong>Soru 2 — Keşif Aşaması:</strong><br>
            Şimdi lazeri döndürerek aşağıdaki açılardaki <strong>tan</strong> değerlerini gözlemleyin.<br>
            <strong style="color:#f39c12;">Tan ekseni (x = 1)</strong> üzerindeki turuncu bölge tan değerini göstermektedir.<br><br>
            <span style="display:inline-flex; gap:10px; flex-wrap:wrap;">
                <span class="angle-badge">20°</span>
                <span class="angle-badge">45°</span>
                <span class="angle-badge">75°</span>
                <span class="angle-badge">100°</span>
            </span><br><br>
            <em><i class="fas fa-lightbulb" style="color:#f39c12;"></i> İpucu: 100° gibi II. bölge açılarında ışının <strong>uzantısı</strong> 
            (kesikli çizgi) tan eksenini keser. Tan değeri bu durumda <strong>negatif</strong> olur!</em>
        `;

        this.laserLocked = true;
        this.enableAngleSnapping(this.tanAngles);
        this.drawTanAxis();
        this.startOverlayUpdates('tan');

        if (this.nextBtn) {
            this.nextBtn.style.display = 'block';
            this.nextBtn.innerHTML = 'Sıralamaya Geç <i class="fas fa-arrow-right"></i>';
        }
    }

    // ── Step 4: Order tan values (click-to-order) ──
    renderOrderTan() {
        this.laserLocked = true;
        this.enableAngleSnapping(this.tanAngles);
        this.drawTanAxis();
        this.startOverlayUpdates('tan');

        this.instructionEl.innerHTML = `
            <strong>Soru 2:</strong> Aşağıdaki tan değerlerini <strong>küçükten büyüğe</strong> doğru sıralayınız.<br>
            <em>Değerleri doğru sırayla tek tek tıklayın. Yanlış tıklarsanız sıfırlayabilirsiniz.</em>
        `;

        const items = [
            { id: 'tan20', label: 'tan 20°' },
            { id: 'tan45', label: 'tan 45°' },
            { id: 'tan75', label: 'tan 75°' },
            { id: 'tan100', label: 'tan 100°' }
        ];

        // Correct: tan100° < tan20° < tan45° < tan75°
        const correctOrder = ['tan100', 'tan20', 'tan45', 'tan75'];

        this.createClickToOrder(items, correctOrder, 'tan');
    }

    // ── Step 5: Success ──
    renderSuccess() {
        this.laserLocked = false;
        this.instructionEl.innerHTML = `
            <strong>Tebrikler!</strong><br><br>
            Değerlendirmeyi başarıyla tamamladınız! Birim çember üzerinde trigonometrik fonksiyonların 
            nasıl değiştiğini doğru bir şekilde analiz ettiniz.
        `;
        this.feedbackEl.textContent = "Harika iş çıkardınız! Her iki soruyu da doğru yanıtladınız.";
        this.feedbackEl.className = "tutorial-feedback success";
        this.feedbackEl.style.display = 'block';
    }

    // ═══════════ CLICK-TO-ORDER SYSTEM ═══════════

    createClickToOrder(items, correctOrder, questionType) {
        const selectedOrder = [];

        const container = document.createElement('div');
        container.className = 'click-order-container';

        // Direction label
        const dirLabel = document.createElement('div');
        dirLabel.className = 'sort-direction';
        if (questionType === 'sin') {
            dirLabel.innerHTML = '<i class="fas fa-arrow-down"></i> Büyükten Küçüğe sıralayın';
        } else {
            dirLabel.innerHTML = '<i class="fas fa-arrow-up"></i> Küçükten Büyüğe sıralayın';
        }
        container.appendChild(dirLabel);

        // Order result slots
        const slotsRow = document.createElement('div');
        slotsRow.className = 'order-slots';
        for (let i = 0; i < items.length; i++) {
            const slot = document.createElement('div');
            slot.className = 'order-slot empty';
            slot.innerHTML = `<span class="slot-rank">${i + 1}</span><span class="slot-value">?</span>`;
            slotsRow.appendChild(slot);
        }
        container.appendChild(slotsRow);

        // Clickable value buttons (shuffled)
        const shuffled = [...items];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        const valuesRow = document.createElement('div');
        valuesRow.className = 'order-values';
        shuffled.forEach(item => {
            const btn = document.createElement('button');
            btn.className = 'order-value-btn';
            btn.textContent = item.label;
            btn.dataset.id = item.id;
            btn.addEventListener('click', () => {
                if (btn.disabled) return;
                selectedOrder.push(item.id);
                btn.disabled = true;
                btn.classList.add('selected');

                // Fill the next slot
                const slotIdx = selectedOrder.length - 1;
                const slots = slotsRow.querySelectorAll('.order-slot');
                slots[slotIdx].classList.remove('empty');
                slots[slotIdx].querySelector('.slot-value').textContent = item.label;

                // Check if all selected
                if (selectedOrder.length === items.length) {
                    this.checkClickOrder(selectedOrder, correctOrder, questionType, container, slotsRow, valuesRow);
                }
            });
            valuesRow.appendChild(btn);
        });
        container.appendChild(valuesRow);

        // Button row
        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex; gap:12px; margin-top:16px; flex-wrap:wrap;';

        // Reset button
        const resetBtn = document.createElement('button');
        resetBtn.className = 'btn-secondary';
        resetBtn.innerHTML = '<i class="fas fa-undo"></i> Sıfırla';
        resetBtn.addEventListener('click', () => {
            this.resetClickOrder(selectedOrder, slotsRow, valuesRow);
            this.feedbackEl.style.display = 'none';
        });
        btnRow.appendChild(resetBtn);

        container.appendChild(btnRow);
        this.questionArea.appendChild(container);
    }

    resetClickOrder(selectedOrder, slotsRow, valuesRow) {
        // Clear selected
        selectedOrder.length = 0;

        // Reset slots
        slotsRow.querySelectorAll('.order-slot').forEach(slot => {
            slot.classList.add('empty');
            slot.querySelector('.slot-value').textContent = '?';
            slot.style.borderColor = '';
            slot.style.backgroundColor = '';
        });

        // Re-enable buttons
        valuesRow.querySelectorAll('.order-value-btn').forEach(btn => {
            btn.disabled = false;
            btn.classList.remove('selected');
        });
    }

    checkClickOrder(selectedOrder, correctOrder, questionType, container, slotsRow, valuesRow) {
        const isCorrect = selectedOrder.every((id, i) => id === correctOrder[i]);
        const slots = slotsRow.querySelectorAll('.order-slot');

        if (isCorrect) {
            slots.forEach(slot => {
                slot.style.borderColor = 'var(--success-color)';
                slot.style.backgroundColor = '#d4edda';
            });
            this.showFeedback("Doğru! Harika, sıralamayı doğru yaptınız!", "success");

            if (this.nextBtn) {
                this.nextBtn.style.display = 'block';
                this.nextBtn.innerHTML = 'Devam Et <i class="fas fa-arrow-right"></i>';
            }
        } else {
            // Show which positions are correct/wrong
            slots.forEach((slot, i) => {
                if (selectedOrder[i] === correctOrder[i]) {
                    slot.style.borderColor = 'var(--success-color)';
                    slot.style.backgroundColor = '#d4edda';
                } else {
                    slot.style.borderColor = 'var(--danger-color)';
                    slot.style.backgroundColor = '#f8d7da';
                }
            });
            this.showFeedback("Sıralama yanlış. Yeşil kutular doğru yerde. 'Sıfırla' ile tekrar deneyin veya 'Tekrar Keşfet' ile değerleri gözlemleyin.", "error");
        }
    }

    showFeedback(msg, type) {
        this.feedbackEl.textContent = msg;
        this.feedbackEl.className = `tutorial-feedback ${type}`;
        this.feedbackEl.style.display = 'block';
    }
}
