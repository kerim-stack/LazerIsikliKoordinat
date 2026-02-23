
class TutorialManager {
    constructor() {
        this.steps = [];
        this.currentStepIndex = 0;
        this.isActive = false;
        
        // UI Elements
        this.container = document.getElementById('tutorial-container');
        this.instructionEl = document.getElementById('tutorial-instruction');
        this.feedbackEl = document.getElementById('tutorial-feedback');
        this.nextBtn = document.getElementById('tutorial-next-btn');
        this.progressBar = document.getElementById('tutorial-progress-bar');
        this.questionArea = document.getElementById('tutorial-question-area');
        
        // Bind events
        this.nextBtn.addEventListener('click', () => this.nextStep());
        
        // Listen for canvas interactions to validate steps
        window.addEventListener('mouseup', () => this.validateCurrentStep());
        window.addEventListener('touchend', () => this.validateCurrentStep());
        
        // Listen for tool changes
        // We can hook into the existing buttons or add a listener to the tool buttons
        document.querySelectorAll('#tools-panel button').forEach(btn => {
            btn.addEventListener('click', () => setTimeout(() => this.validateCurrentStep(), 100));
        });

        this.initSteps();
    }

    initSteps() {
        this.steps = [
            // TASK 1: LINE (DOĞRU)
            {
                id: 'task1-intro',
                text: "Hoş geldiniz! Şimdi <strong>Doğru (Line)</strong> grafiğinin bir fonksiyon olup olmadığını test edeceğiz. Hazırsanız başlayalım.",
                type: 'info',
                onEnter: () => this.clearCanvas()
            },
            {
                id: 'task1-draw',
                text: "Araç panelinden <strong>'Doğru Çiz'</strong> aracını seçin ve sahneye bir doğru çizin.",
                type: 'action',
                validate: () => {
                    // Check forbidden objects (sadece Doğru)
                    const allowedTypes = ['line', 'laser'];
                    const forbidden = state.objects.some(o => !allowedTypes.includes(o.type));
                    if (forbidden) {
                        this.showFeedback("Lütfen sadece Doğru çizimi yapın. Diğer şekilleri silin.", "error");
                        return false;
                    }

                    const lines = state.objects.filter(o => o.type === 'line');
                    if (lines.length === 0) return false;
                    
                    // Check if vertical (Fonksiyon örneği için dikey olmayan doğru istiyoruz)
                    const line = lines[0];
                    if (Math.abs(line.x1 - line.x2) < 0.1) {
                        this.showFeedback("Lütfen dikey olmayan bir doğru çizin (Fonksiyon örneği için).", "error");
                        return false;
                    }
                    return true;
                },
                feedback: "Harika! Bir doğru çizdiniz."
            },
            {
                id: 'task1-laser',
                text: "Şimdi <strong>'Lazer Ekle'</strong> aracını seçin. Çizdiğiniz doğrunun üzerine, lazerler <strong>DİKEY (90° veya 270°)</strong> olacak şekilde en az 3 tane lazer yerleştirin. Lazerler grafiği kesmeli!",
                type: 'action',
                validate: () => {
                    // Check forbidden objects
                    const allowedTypes = ['line', 'laser'];
                    const forbidden = state.objects.some(o => !allowedTypes.includes(o.type));
                    if (forbidden) {
                        this.showFeedback("Lütfen sadece Doğru ve Lazer kullanın. Diğer şekilleri silin.", "error");
                        return false;
                    }

                    const lasers = state.objects.filter(o => o.type === 'laser');
                    const line = state.objects.find(o => o.type === 'line');
                    
                    if (lasers.length < 3) return false;
                    
                    // Check verticality
                    const isVertical = (angle) => {
                        const deg = (angle * 180 / Math.PI) % 360;
                        return Math.abs(Math.abs(deg) - 90) < 3 || Math.abs(Math.abs(deg) - 270) < 3;
                    };
                    
                    const verticalLasers = lasers.filter(l => isVertical(l.angle));
                    if (verticalLasers.length < 3) {
                        this.showFeedback("Lazerlerin açısı dikey olmalı! (90°)", "error");
                        return false;
                    }

                    // Check intersection
                    if (line) {
                        // Kapsamlı kesişim kontrolü (Sonsuz Doğru Varsayımı ile)
                        let validLasers = 0;
                        
                        // Doğru denklemi parametreleri
                        const dx = line.x2 - line.x1;
                        const dy = line.y2 - line.y1;
                        
                        // Doğru çok dikse (neredeyse dikey)
                        const isLineVertical = Math.abs(dx) < 0.001;
                        
                        for(let l of verticalLasers) {
                            // Eğer doğru da dikeyse ve lazerle çakışmıyorsa kesişmez (paralel)
                            if (isLineVertical) {
                                // Dikey doğru ve dikey lazer paraleldir, kesişmez (üst üste değilse)
                                // Bu durumda validLasers artmaz
                                continue; 
                            }

                            // Kesişim Y noktası hesabı (y = mx + c)
                            const m = dy / dx;
                            const targetY = line.y1 + m * (l.x - line.x1);

                            // Lazerin baktığı yön kontrolü
                            const sinVal = Math.sin(l.angle);
                            const isPointingDown = sinVal > 0.1; 
                            const isPointingUp = sinVal < -0.1;

                            // Lazerin konumu ile Hedef Y karşılaştırması
                            // Lazer yukarı bakıyorsa (Up), hedef Y lazerin Y'sinden küçük olmalı (daha yukarıda)
                            // Lazer aşağı bakıyorsa (Down), hedef Y lazerin Y'sinden büyük olmalı (daha aşağıda)
                            // Tolerans (epsilon) ekleyelim
                            const epsilon = 0.1;

                            if (isPointingUp && targetY < (l.y + epsilon)) {
                                validLasers++;
                            } else if (isPointingDown && targetY > (l.y - epsilon)) {
                                validLasers++;
                            }
                        }

                        if (validLasers < verticalLasers.length) {
                            this.showFeedback("Tüm lazerler doğruyu kesmeli! Lazerlerin yönünü ve konumunu kontrol edin.", "error");
                            return false;
                        }
                    }

                    return true;
                },
                feedback: "Süper! Dikey lazerleri yerleştirdiniz."
            },
            {
                id: 'task1-question',
                text: "Lazer ışınları grafiği (doğruyu) her seferinde <strong>YALNIZCA BİR</strong> noktada mı kesti?",
                type: 'question',
                options: [
                    { text: "Evet", value: true, correct: true },
                    { text: "Hayır", value: false, correct: false }
                ],
                correctFeedback: "Doğru! Her dikey doğru grafiği tek noktada kesiyor.",
                wrongFeedback: "Tekrar bakın. Dikey doğrular (lazerler) grafiği birden fazla noktada mı kesiyor? Hayır, sadece bir.",
                onEnter: () => {
                     // Auto-select 'move' tool to prevent accidental laser placement
                     if(typeof setTool === 'function') setTool('move');
                }
            },
            {
                id: 'task1-conclusion',
                text: "Tebrikler! Düşey Doğru Testi'ne göre: Eğer her dikey doğru grafiği en fazla bir noktada kesiyorsa, bu grafik bir <strong>FONKSİYON</strong> belirtir.",
                type: 'info',
                isCheckpoint: true
            },

            // TASK 2: CIRCLE (ÇEMBER)
            {
                id: 'task2-intro',
                text: "Sırada <strong>Çember</strong> var. Bakalım çember bir fonksiyon mu?",
                type: 'info',
                onEnter: () => this.clearCanvas()
            },
            {
                id: 'task2-draw',
                text: "Araç panelinden <strong>'Çember Çiz'</strong> aracını seçin ve sahneye bir çember çizin.",
                type: 'action',
                validate: () => {
                    // Check forbidden objects
                    const allowedTypes = ['circle', 'laser'];
                    const forbidden = state.objects.some(o => !allowedTypes.includes(o.type));
                    if (forbidden) {
                        this.showFeedback("Lütfen sadece Çember çizin. Diğer şekilleri silin.", "error");
                        return false;
                    }
                    return state.objects.some(o => o.type === 'circle');
                },
                feedback: "Güzel! Bir çember oluşturdunuz."
            },
            {
                id: 'task2-laser',
                text: "Şimdi <strong>'Lazer Ekle'</strong> aracını kullanarak, çemberin üzerinden geçecek şekilde en az 1 tane <strong>DİKEY</strong> lazer yerleştirin. Lazer çemberi İKİ noktada kesmeli!",
                type: 'action',
                validate: () => {
                    // Check forbidden objects
                    const allowedTypes = ['circle', 'laser'];
                    const forbidden = state.objects.some(o => !allowedTypes.includes(o.type));
                    if (forbidden) {
                        this.showFeedback("Lütfen sadece Çember ve Lazer kullanın. Diğer şekilleri silin.", "error");
                        return false;
                    }
                    const lasers = state.objects.filter(o => o.type === 'laser');
                    const circle = state.objects.find(o => o.type === 'circle');
                    if (lasers.length < 1 || !circle) return false;
                    
                    // Check verticality
                    const isVertical = (angle) => {
                        const deg = (angle * 180 / Math.PI) % 360;
                        return Math.abs(Math.abs(deg) - 90) < 3 || Math.abs(Math.abs(deg) - 270) < 3;
                    };
                    
                    const verticalLasers = lasers.filter(l => isVertical(l.angle));
                    if (verticalLasers.length < 1) {
                         this.showFeedback("Lazeri dikey (90°) yerleştirmelisiniz.", "error");
                         return false;
                    }

                    // Check intersection count = 2
                    const twoPointLasers = verticalLasers.filter(l => Geometry.getLaserIntersectionPoints(l, circle).length === 2);
                    
                    if (twoPointLasers.length < 1) {
                        this.showFeedback("Lazer çemberi 2 noktada kesmeli! Lazeri çemberin dışından tutun.", "error");
                        return false;
                    }

                    return true;
                },
                feedback: "Lazer yerleştirildi. Kesişim noktalarına dikkat edin."
            },
            {
                id: 'task2-question',
                text: "Dikey lazer ışını çemberi kaç noktada kesti?",
                type: 'question',
                options: [
                    { text: "1 Noktada", value: 1, correct: false },
                    { text: "2 Noktada", value: 2, correct: true },
                    { text: "Kesmedi", value: 0, correct: false }
                ],
                correctFeedback: "Evet, 2 noktada kesti!",
                wrongFeedback: "Dikkatli bakın. Lazer ışını çemberin hem üst hem alt kısmından geçiyor.",
                 onEnter: () => {
                     if(typeof setTool === 'function') setTool('move');
                }
            },
            {
                id: 'task2-question-2',
                text: "Bir dikey doğru grafiği birden fazla noktada kesiyorsa, bu bir fonksiyon mudur?",
                type: 'question',
                options: [
                    { text: "Evet", value: true, correct: false },
                    { text: "Hayır", value: false, correct: true }
                ],
                correctFeedback: "Doğru! Bu bir fonksiyon DEĞİLDİR.",
                wrongFeedback: "Tanım gereği, bir girdinin (x) tek bir çıktısı (y) olmalıdır. Burada bir x değeri için iki y değeri var."
            },

            // TASK 3: PARABOLA (PARABOL)
            {
                id: 'task3-intro',
                text: "Son olarak <strong>Parabol</strong> grafiğini inceleyelim.",
                type: 'info',
                onEnter: () => this.clearCanvas()
            },
            {
                id: 'task3-draw',
                text: "Araç panelinden <strong>'Parabol Çiz'</strong> aracını seçin ve sahneye bir parabol ekleyin.",
                type: 'action',
                validate: () => {
                    // Check forbidden objects
                    const allowedTypes = ['parabola', 'laser'];
                    const forbidden = state.objects.some(o => !allowedTypes.includes(o.type));
                    if (forbidden) {
                        this.showFeedback("Lütfen sadece Parabol çizin. Diğer şekilleri silin.", "error");
                        return false;
                    }
                    return state.objects.some(o => o.type === 'parabola');
                },
                feedback: "Parabol eklendi."
            },
            {
                id: 'task3-laser',
                text: "Parabolün kolları arasına ve dışına rastgele <strong>DİKEY</strong> lazerler yerleştirin (En az 2 tane). Lazerler parabolü kesmeli!",
                type: 'action',
                validate: () => {
                    // Check forbidden objects
                    const allowedTypes = ['parabola', 'laser'];
                    const forbidden = state.objects.some(o => !allowedTypes.includes(o.type));
                    if (forbidden) {
                        this.showFeedback("Lütfen sadece Parabol ve Lazer kullanın. Diğer şekilleri silin.", "error");
                        return false;
                    }

                    const lasers = state.objects.filter(o => o.type === 'laser');
                    const parabola = state.objects.find(o => o.type === 'parabola');
                    
                    if (lasers.length < 2 || !parabola) return false;
                    
                     const isVertical = (angle) => {
                        const deg = (angle * 180 / Math.PI) % 360;
                        return Math.abs(Math.abs(deg) - 90) < 3 || Math.abs(Math.abs(deg) - 270) < 3;
                    };
                    const verticalLasers = lasers.filter(l => isVertical(l.angle));
                    if (verticalLasers.length < 2) return false;

                    // Check intersection
                    const intersecting = verticalLasers.filter(l => Geometry.getLaserIntersectionPoints(l, parabola).length > 0);
                    if (intersecting.length < 2) {
                        this.showFeedback("Lazerler parabolü kesmeli!", "error");
                        return false;
                    }
                    
                    return true;
                },
                feedback: "Lazerler yerleştirildi."
            },
            {
                id: 'task3-question',
                text: "Lazerleri sağa sola hareket ettirdiğinizde, grafiği birden fazla noktada kestiği bir yer var mı?",
                type: 'question',
                options: [
                    { text: "Evet, var", value: true, correct: false },
                    { text: "Hayır, hep 1 noktada kesiyor", value: false, correct: true }
                ],
                correctFeedback: "Harika! Parabol (dikey eksenli) bir fonksiyondur.",
                wrongFeedback: "Tekrar inceleyin. Kolları yukarı/aşağı bakan bir parabolde dikey doğrular asla 2 noktada kesmez.",
                 onEnter: () => {
                     if(typeof setTool === 'function') setTool('move');
                }
            },
            {
                id: 'conclusion',
                text: "Tebrikler! Tüm görevleri başarıyla tamamladınız. Düşey Doğru Testi mantığını kavradınız.",
                type: 'info',
                isFinal: true
            }
        ];
        
        this.renderStep();
    }

    clearCanvas() {
        if (state) {
            state.objects = [];
            state.selectedObject = null;
            if (typeof updateViewBox === 'function') updateViewBox();
            if (typeof renderObjects === 'function') renderObjects();
        }
    }

    renderStep() {
        const step = this.steps[this.currentStepIndex];
        
        // Update Progress
        const progress = ((this.currentStepIndex + 1) / this.steps.length) * 100;
        this.progressBar.style.width = `${progress}%`;
        
        // Update Instruction
        this.instructionEl.innerHTML = step.text;
        
        // Clear previous question/feedback
        this.questionArea.innerHTML = '';
        this.feedbackEl.textContent = '';
        this.feedbackEl.className = 'tutorial-feedback';
        
        // Handle Step Types
        if (step.type === 'question') {
            this.renderQuestion(step);
            this.nextBtn.style.display = 'none'; // Hide next button, logic handles progression
        } else {
            this.nextBtn.style.display = 'block';
            if (step.type === 'info') {
                this.nextBtn.disabled = false;
                this.nextBtn.textContent = step.isFinal ? "Tamamla" : "Devam Et";
            } else {
                this.nextBtn.disabled = true;
                this.nextBtn.textContent = "Sonraki Adım";
                // Initial validation check (in case conditions already met)
                this.validateCurrentStep();
            }
        }
        
        if (step.onEnter) {
            step.onEnter();
        }
    }

    renderQuestion(step) {
        const btnGroup = document.createElement('div');
        btnGroup.className = 'tutorial-btn-group';
        
        step.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'tutorial-opt-btn';
            btn.textContent = opt.text;
            btn.onclick = () => this.handleAnswer(opt, step);
            btnGroup.appendChild(btn);
        });
        
        this.questionArea.appendChild(btnGroup);
    }

    handleAnswer(option, step) {
        if (option.correct) {
            this.showFeedback(step.correctFeedback || "Doğru!", "success");
            // Disable buttons
            const btns = this.questionArea.querySelectorAll('button');
            btns.forEach(b => b.disabled = true);
            
            // Auto advance after short delay
            setTimeout(() => this.nextStep(), 1500);
        } else {
            this.showFeedback(step.wrongFeedback || "Yanlış, tekrar deneyin.", "error");
        }
    }

    validateCurrentStep() {
        const step = this.steps[this.currentStepIndex];
        if (step.type !== 'action') return;
        
        const isValid = step.validate();
        
        if (isValid) {
            this.nextBtn.disabled = false;
            this.nextBtn.classList.add('pulse-anim');
            if (step.feedback) {
                this.showFeedback(step.feedback, "success");
            }
        } else {
            this.nextBtn.disabled = true;
            this.nextBtn.classList.remove('pulse-anim');
        }
    }

    showFeedback(msg, type) {
        this.feedbackEl.textContent = msg;
        this.feedbackEl.className = `tutorial-feedback ${type}`;
    }

    nextStep() {
        if (this.currentStepIndex < this.steps.length - 1) {
            this.currentStepIndex++;
            this.renderStep();
        } else {
            // Finished
            alert("Uygulama tamamlandı!");
            // Maybe reset or go to main menu
            this.currentStepIndex = 0;
            this.renderStep();
        }
    }
}

// Initialize when page loads (or when section 2 is active)
let tutorialManager = null;
function initTutorial() {
    if (!tutorialManager) {
        tutorialManager = new TutorialManager();
    }
}
