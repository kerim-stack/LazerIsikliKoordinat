class Quiz2Manager {
    constructor() {
        this.isActive = false;
        this.currentStep = 0;
        this.triangleData = null;
        
        // UI Elements
        this.container = document.getElementById('quiz-container');
        this.instructionEl = document.getElementById('quiz-instruction');
        this.feedbackEl = document.getElementById('quiz-feedback');
        this.questionArea = document.getElementById('quiz-question-area');
        this.nextBtn = document.getElementById('quiz-next-btn');

        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => this.advanceStep());
        }
        
        // Bind events

        // Listen for interactions to auto-validate or enable buttons
        window.addEventListener('mouseup', () => {
            if (this.isActive) this.checkStepConditions();
        });
        window.addEventListener('touchend', () => {
            if (this.isActive) this.checkStepConditions();
        });
        
        // Listen for tool changes
        document.querySelectorAll('#tools-panel button').forEach(btn => {
            btn.addEventListener('click', () => setTimeout(() => {
                if (this.isActive) this.checkStepConditions();
            }, 100));
        });
    }

    startQuiz() {
        this.isActive = true;
        this.currentStep = 0;
        this.triangleData = null;
        this.clearCanvas();
        if (this.nextBtn) this.nextBtn.style.display = 'none';
        this.renderStep();
    }

    advanceStep() {
        if (this.nextBtn) this.nextBtn.style.display = 'none';
        this.currentStep++;
        this.renderStep();
    }

    clearCanvas() {
        if (typeof state !== 'undefined') {
            state.objects = [];
            state.directionRays = [];
            if (typeof renderObjects === 'function') renderObjects();
            else if (typeof render === 'function') render();
        }
    }

    renderStep() {
        // Reset UI
        this.feedbackEl.style.display = 'none';
        this.feedbackEl.className = 'tutorial-feedback';
        this.questionArea.innerHTML = '';
        if (this.nextBtn) this.nextBtn.style.display = 'none';

        // Update progress bar
        const totalSteps = 4;
        const pct = (this.currentStep / (totalSteps - 1)) * 100;
        const bar = document.getElementById('quiz-progress-bar');
        if (bar) bar.style.width = pct + '%';
        switch (this.currentStep) {
            case 0: // Draw Triangle
                this.instructionEl.innerHTML = "<strong>Adım 1:</strong> Lazer ışıklı koordinat düzlemi materyali üzerinde belirlediğiniz üç noktayı köşe kabul eden bir üçgen çiziniz. <br><em>(Çokgen Oluştur aracını kullanınız.)</em>";
                break;

            case 1: // Identify Type
                this.instructionEl.innerHTML = "<strong>Adım 2:</strong> Bu üçgenin açılarına göre hangi tür üçgen olduğunu söyleyiniz.";
                
                const btnGroup = document.createElement('div');
                btnGroup.className = 'tutorial-btn-group';
                
                const options = [
                    { text: "Dar Açılı Üçgen", value: "acute" },
                    { text: "Dik Açılı Üçgen", value: "right" },
                    { text: "Geniş Açılı Üçgen", value: "obtuse" }
                ];
                
                options.forEach(opt => {
                    const btn = document.createElement('button');
                    btn.className = 'tutorial-opt-btn';
                    btn.textContent = opt.text;
                    btn.onclick = () => this.checkTriangleType(opt.value, btn);
                    btnGroup.appendChild(btn);
                });
                this.questionArea.appendChild(btnGroup);
                break;

            case 2: // Mark Orthocenter
                this.instructionEl.innerHTML = "<strong>Adım 3:</strong> Bu üçgenin kenarlarına ait yükseklikleri çizerek <strong>diklik merkezini</strong> işaretleyiniz.<br><em>(Nokta Ekle aracını kullanınız. Noktanın yerini hassas belirleyiniz.)</em>";
                break;
                
            case 3: // Success
                this.instructionEl.innerHTML = "<strong>Tebrikler!</strong> Değerlendirmeyi başarıyla tamamladınız.";
                this.feedbackEl.textContent = "Harika iş çıkardınız! Diklik merkezini doğru buldunuz.";
                this.feedbackEl.className = "quiz-feedback success";
                this.feedbackEl.style.display = 'block';
                
        }
        
        this.checkStepConditions();
    }

    checkStepConditions() {
        if (!this.isActive) return;

        if (this.currentStep === 0) {
            const poly = state.objects.find(o => o.type === 'polygon');
            if (poly && poly.isClosed) {
                if (poly.points.length === 3) {
                    this.triangleData = this.analyzeTriangle(poly);
                    this.showFeedback("Üçgen çizildi. Devam etmek için 'Devam Et'e tıklayın.", "success");
                    if (this.nextBtn) this.nextBtn.style.display = 'block';
                    return;
                }
                if (poly.points.length > 3) {
                    this.showFeedback("Üçgen çizmelisiniz. Lütfen 3 köşe kullanın.", "error");
                    return;
                }
            }
            this.feedbackEl.style.display = 'none';
        }

        if (this.currentStep === 2) {
            this.validateOrthocenter(true);
        }
    }

    analyzeTriangle(poly) {
        // Convert SVG points to Math points for calculation
        // script.js: svgToMath(x, y) returns {x, y} with inverted Y
        const points = poly.points.map(p => svgToMath(p.x, p.y));
        const A = points[0];
        const B = points[1];
        const C = points[2];
        
        // Calculate squared side lengths
        const distSq = (p1, p2) => (p1.x - p2.x)**2 + (p1.y - p2.y)**2;
        
        const a2 = distSq(B, C); // Side a (opposite A)
        const b2 = distSq(A, C); // Side b (opposite B)
        const c2 = distSq(A, B); // Side c (opposite C)
        
        const sides = [a2, b2, c2].sort((x, y) => x - y);
        const [s1, s2, longest] = sides;
        
        let type = "acute";
        // Tolerance for float comparison
        const epsilon = 0.1; 
        
        // Check triangle type
        if (Math.abs(s1 + s2 - longest) < epsilon) {
            type = "right";
        } else if (s1 + s2 < longest) {
            type = "obtuse";
        } else {
            type = "acute";
        }

        // Calculate Orthocenter H
        // H is intersection of altitudes.
        // Altitude from A is line through A perpendicular to BC.
        // Vector BC = (C.x - B.x, C.y - B.y)
        // This vector is normal to Altitude A.
        // Equation of Alt A: BC.x * (x - A.x) + BC.y * (y - A.y) = 0
        // => BC.x * x + BC.y * y = BC.x * A.x + BC.y * A.y
        
        const getAltCoeffs = (P, V1, V2) => {
            const dx = V2.x - V1.x;
            const dy = V2.y - V1.y;
            return {
                a: dx,
                b: dy,
                c: dx * P.x + dy * P.y
            };
        };
        
        const L1 = getAltCoeffs(A, B, C); // Alt from A to BC
        const L2 = getAltCoeffs(B, A, C); // Alt from B to AC
        
        // Cramer's rule for intersection
        // a1 x + b1 y = c1
        // a2 x + b2 y = c2
        const det = L1.a * L2.b - L2.a * L1.b;
        
        let H = { x: 0, y: 0 };
        if (Math.abs(det) > 1e-9) {
            H.x = (L1.c * L2.b - L2.c * L1.b) / det;
            H.y = (L1.a * L2.c - L2.a * L1.c) / det;
        } else {
            // Should not happen for a valid triangle
            H = A; 
        }
        
        return { type, orthocenter: H };
    }

    checkTriangleType(selectedType, btnElement) {
        if (!this.triangleData) return;
        
        // Disable buttons temporarily
        const allBtns = this.questionArea.querySelectorAll('button');
        allBtns.forEach(b => b.disabled = true);

        if (selectedType === this.triangleData.type) {
            btnElement.style.borderColor = 'var(--success-color)';
            btnElement.style.backgroundColor = '#d4edda';
            btnElement.style.color = '#155724';
            this.showFeedback("Doğru! Bir sonraki adıma geçmek için 'Devam Et'e tıklayın.", "success");
            if (this.nextBtn) {
                this.nextBtn.style.display = 'block';
            }
        } else {
            btnElement.style.borderColor = 'var(--danger-color)';
            btnElement.style.backgroundColor = '#f8d7da';
            btnElement.style.color = '#721c24';
            this.showFeedback("Yanlış. Açıları tekrar kontrol edin veya çiziminize bakın.", "error");
            
            setTimeout(() => {
                allBtns.forEach(b => {
                    b.disabled = false;
                    // Reset styles if not correct
                    if (b !== btnElement) {
                        // Keep others as is
                    }
                });
                // Reset clicked button style after delay? Or keep it red?
                // Let's keep it red but enable retry.
                this.feedbackEl.style.display = 'none';
            }, 1500);
        }
    }

    validateOrthocenter(isAuto = false) {
        const points = state.objects.filter(o => o.type === 'point');
        if (points.length === 0) {
            if (!isAuto) {
                this.showFeedback("Lütfen diklik merkezine bir nokta ekleyin.", "error");
            }
            return;
        }
        
        const target = this.triangleData.orthocenter;
        
        // Find best matching point
        let bestDist = Infinity;
        points.forEach(p => {
            // User point is in SVG coords. Convert to Math coords to compare with target.
            const mathP = svgToMath(p.x, p.y);
            const dist = Math.hypot(mathP.x - target.x, mathP.y - target.y);
            
            if (dist < bestDist) {
                bestDist = dist;
            }
        });
        
        // Tolerance: 0.3 units
        const TOLERANCE = 0.3;
        
        if (bestDist <= TOLERANCE) {
            this.showFeedback("Harika! Diklik merkezini doğru buldunuz. Devam etmek için 'Devam Et'e tıklayın.", "success");
            if (this.nextBtn) {
                this.nextBtn.style.display = 'block';
            }
        } else {
            this.showFeedback(`Nokta doğru yerde değil. (Sapma: ${bestDist.toFixed(2)} birim). Daha hassas olmalısınız.`, "error");
        }
    }

    showFeedback(msg, type) {
        this.feedbackEl.textContent = msg;
        this.feedbackEl.className = `tutorial-feedback ${type}`;
        this.feedbackEl.style.display = 'block';
    }
}
