
class Tutorial2Manager {
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
        
        // Vertex label overlay layer
        this.tutorialLabelsLayer = document.getElementById('tutorial-vertex-labels');
        this.activeVertexTargets = null;

        // Bind events
        if(this.nextBtn) this.nextBtn.addEventListener('click', () => this.nextStep());
        
        // Listen for canvas interactions to validate steps and update vertex labels
        window.addEventListener('mouseup', () => { this.validateCurrentStep(); this.updateVertexLabels(); });
        window.addEventListener('touchend', () => { this.validateCurrentStep(); this.updateVertexLabels(); });
        
        // Listen for tool changes
        document.querySelectorAll('#tools-panel button').forEach(btn => {
            btn.addEventListener('click', () => setTimeout(() => this.validateCurrentStep(), 100));
        });

        // Clear vertex labels when canvas is cleared
        const clearBtn = document.getElementById('tool-clear');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearVertexLabels());
        }

        // Show container
        if (this.container) {
            this.container.style.display = 'block';
        }

        this.initSteps();
    }

    initSteps() {
        this.steps = [
            // BÖLÜM 1: DAR AÇILI ÜÇGEN (ACUTE TRIANGLE)
            {
                id: 'acute-intro',
                text: "<strong>Uygulama 2'ye Hoş Geldiniz!</strong><br>Bu bölümde üçgen çeşitlerini ve diklik merkezlerini keşfedeceğiz. Hazırsanız başlayalım.",
                type: 'info',
                onEnter: () => this.clearCanvas()
            },
            {
                id: 'acute-draw',
                text: "İlk göreviniz: <strong>'Çokgen Oluştur'</strong> aracını kullanarak şu koordinatlara sahip bir üçgen çizin:<br><strong>A(-4, -4)</strong>, <strong>B(6, -4)</strong>, <strong>C(1, 6)</strong><br><em>(Noktaları sırayla tıklayın ve şekli kapatmak için başladığınız noktaya tekrar tıklayın.)</em>",
                type: 'action',
                vertexTargets: [
                    { svgX: -4, svgY:  4, label: 'A', offX: -0.8, offY:  0.8 },
                    { svgX:  6, svgY:  4, label: 'B', offX:  0.8, offY:  0.8 },
                    { svgX:  1, svgY: -6, label: 'C', offX:  0.4, offY: -0.8 }
                ],
                validate: () => {
                    const poly = state.objects.find(o => o.type === 'polygon');
                    if (!poly) return false;
                    
                    // Hedef noktalar (Math Coords: y inverted relative to SVG)
                    // Math: (-4, -4) -> SVG: (-4, 4)
                    // Math: (6, -4) -> SVG: (6, 4)
                    // Math: (1, 6) -> SVG: (1, -6)
                    const targets = [
                        {x: -4, y: 4},
                        {x: 6, y: 4},
                        {x: 1, y: -6}
                    ];
                    
                    // Noktaların eşleşip eşleşmediğini kontrol et (sıra bağımsız)
                    let matchCount = 0;
                    // Basit bir kontrol: Her hedef nokta, poligonun bir köşesine yakın mı?
                    for (let t of targets) {
                        if (poly.points.some(p => Math.hypot(p.x - t.x, p.y - t.y) < 0.5)) {
                            matchCount++;
                        }
                    }
                    
                    if (matchCount < 3) {
                        this.showFeedback("Koordinatları doğru işaretlediğinizden emin olun: (-4, -4), (6, -4), (1, 6)", "error");
                        return false;
                    }
                    return true;
                },
                feedback: "Harika! Üçgeni oluşturdunuz."
            },
            {
                id: 'acute-identify',
                text: "Oluşturduğunuz bu üçgenin çeşidi nedir?",
                type: 'question',
                options: [
                    { text: "Dar Açılı Üçgen", value: "dar", correct: true },
                    { text: "Dik Açılı Üçgen", value: "dik", correct: false },
                    { text: "Geniş Açılı Üçgen", value: "genis", correct: false }
                ],
                correctFeedback: "Doğru! Tüm açıları 90 dereceden küçük olduğu için Dar Açılı Üçgendir.",
                wrongFeedback: "Tekrar düşünün. Tüm iç açıları 90 dereceden küçük görünüyor mu?"
            },
            {
                id: 'acute-lasers',
                text: "Şimdi <strong>'Lazer Ekle'</strong> aracını seçin.<br>Her bir köşeye bir lazer yerleştirin ve lazer ışınını <strong>karşı kenara dik (90°)</strong> olacak şekilde ayarlayın.",
                type: 'action',
                validate: () => {
                    const lasers = state.objects.filter(o => o.type === 'laser');
                    if (lasers.length < 3) return false;
                    
                    // Math Coords: A(-4, -4), B(6, -4), C(1, 6)
                    // SVG Coords: A(-4, 4), B(6, 4), C(1, -6)
                    
                    // A(-4, 4) -> Edge BC: (6, 4) to (1, -6). Slope = (-6-4)/(1-6) = -10/-5 = 2.
                    // Altitude from A: Perpendicular to BC (Slope 2). Target Slope = -0.5.
                    // Angle = atan(-0.5).
                    
                    // B(6, 4) -> Edge AC: (-4, 4) to (1, -6). Slope = (-6-4)/(1-(-4)) = -10/5 = -2.
                    // Altitude from B: Perpendicular to AC (Slope -2). Target Slope = 0.5.
                    // Angle = atan(0.5).
                    
                    // C(1, -6) -> Edge AB: (-4, 4) to (6, 4). Slope = 0.
                    // Altitude from C: Vertical. Angle = PI/2 or 3PI/2.
                    
                    const targets = [
                        { x: -4, y: 4, validAngles: [Math.atan(-0.5), Math.atan(-0.5) + Math.PI] },
                        { x: 6, y: 4, validAngles: [Math.atan(0.5), Math.atan(0.5) + Math.PI] },
                        { x: 1, y: -6, validAngles: [Math.PI/2, 3*Math.PI/2] }
                    ];
                    
                    let correctLasers = 0;
                    
                    lasers.forEach(l => {
                        // Hangi köşede?
                        const t = targets.find(t => Math.hypot(t.x - l.x, t.y - l.y) < 1.0);
                        if (t) {
                            // Açı kontrolü (radyan)
                            // Lazer açısını 0-2PI aralığına normalize et
                            let angle = l.angle % (2 * Math.PI);
                            if (angle < 0) angle += 2 * Math.PI;
                            
                            const isAngleValid = t.validAngles.some(targetAngle => {
                                let ta = targetAngle % (2 * Math.PI);
                                if (ta < 0) ta += 2 * Math.PI;
                                // Tolerans 0.2 radyan (~11 derece)
                                return Math.abs(angle - ta) < 0.2 || Math.abs(angle - ta) > (2 * Math.PI - 0.2);
                            });
                            
                            if (isAngleValid) correctLasers++;
                        }
                    });
                    
                    if (correctLasers < 3) {
                        this.showFeedback("Lazerlerin konumlarını ve açılarını kontrol edin. Köşelerde olmalı ve karşı kenara dik bakmalı.", "error");
                        return false;
                    }
                    return true;
                },
                feedback: "Mükemmel! Tüm yükseklikleri çizdiniz."
            },
            {
                id: 'acute-orthocenter',
                text: "Lazerlerin kesiştiği noktayı görüyor musunuz? Bu noktaya <strong>'Nokta Ekle'</strong> aracıyla bir nokta koyun. Bu nokta <strong>Diklik Merkezi</strong>dir.",
                type: 'action',
                validate: () => {
                    // Orthocenter for A(-4, -4), B(6, -4), C(1, 6) is (1, -1.5) (Math)
                    // SVG: (1, 1.5)
                    const targetX = 1;
                    const targetY = 1.5;
                    
                    const points = state.objects.filter(o => o.type === 'point');
                    // Tolerans 1 birim
                    return points.some(p => Math.hypot(p.x - targetX, p.y - targetY) < 1.0);
                },
                feedback: "Tebrikler! Dar açılı üçgenlerde diklik merkezi üçgenin İÇ BÖLGESİNDEDİR."
            },

            // BÖLÜM 2: DİK AÇILI ÜÇGEN (RIGHT TRIANGLE)
            {
                id: 'right-intro',
                text: "Sırada yeni bir üçgen çeşidi var. Bakalım burada diklik merkezi nerede çıkacak?",
                type: 'info',
                onEnter: () => this.clearCanvas()
            },
            {
                id: 'right-draw',
                text: "<strong>'Çokgen Oluştur'</strong> aracını kullanarak şu noktalardan geçen bir üçgen oluşturun:<br><strong>D(-6, -2)</strong>, <strong>E(4, -2)</strong>, <strong>F(-6, 6)</strong>",
                type: 'action',
                vertexTargets: [
                    { svgX: -6, svgY:  2, label: 'D', offX: -0.8, offY:  0.0 },
                    { svgX:  4, svgY:  2, label: 'E', offX:  0.8, offY:  0.7 },
                    { svgX: -6, svgY: -6, label: 'F', offX: -0.8, offY: -0.7 }
                ],
                validate: () => {
                    const poly = state.objects.find(o => o.type === 'polygon');
                    if (!poly) return false;
                    
                    // Math: D(-6, -2), E(4, -2), F(-6, 6)
                    // SVG: D(-6, 2), E(4, 2), F(-6, -6)
                    const targets = [
                        {x: -6, y: 2},
                        {x: 4, y: 2},
                        {x: -6, y: -6}
                    ];
                    
                    let matchCount = 0;
                    for (let t of targets) {
                        if (poly.points.some(p => Math.hypot(p.x - t.x, p.y - t.y) < 0.5)) {
                            matchCount++;
                        }
                    }
                    return matchCount >= 3;
                },
                feedback: "Güzel! Üçgeni çizdiniz."
            },
            {
                id: 'right-identify',
                text: "Bu üçgenin çeşidi nedir?",
                type: 'question',
                options: [
                    { text: "Dar Açılı Üçgen", value: "dar", correct: false },
                    { text: "Dik Açılı Üçgen", value: "dik", correct: true },
                    { text: "Geniş Açılı Üçgen", value: "genis", correct: false }
                ],
                correctFeedback: "Doğru! D köşesindeki açı 90 derecedir.",
                wrongFeedback: "Dikkatli bakın, köşelerden biri 90 derece olabilir mi?"
            },
            {
                id: 'right-lasers',
                text: "Şimdi yine köşelere lazer yerleştirip karşı kenarlara dik gönderelim.<br><em>İpucu: Dik kenarlarda lazerler kenar üzerinden gidecektir!</em>",
                type: 'action',
                validate: () => {
                    const lasers = state.objects.filter(o => o.type === 'laser');
                    if (lasers.length < 3) return false;
                    
                    // Math: D(-6, -2), E(4, -2), F(-6, 6)
                    // SVG: D(-6, 2), E(4, 2), F(-6, -6)
                    
                    const targets = [
                        { x: -6, y: 2, validAngles: [Math.atan(-1.25), Math.atan(-1.25) + Math.PI] },
                        // E(4, 2) noktasındaki lazer D(-6, 2) noktasına bakmalı (Sola doğru, 180 derece/PI)
                        { x: 4, y: 2, validAngles: [Math.PI] },
                        { x: -6, y: -6, validAngles: [Math.PI/2, 3*Math.PI/2] }
                    ];
                    
                    let correctLasers = 0;
                    let eLaserWrongDirection = false;

                    lasers.forEach(l => {
                        const t = targets.find(t => Math.hypot(t.x - l.x, t.y - l.y) < 1.0);
                        if (t) {
                            let angle = l.angle % (2 * Math.PI);
                            if (angle < 0) angle += 2 * Math.PI;
                            
                            const isAngleValid = t.validAngles.some(targetAngle => {
                                let ta = targetAngle % (2 * Math.PI);
                                if (ta < 0) ta += 2 * Math.PI;
                                return Math.abs(angle - ta) < 0.2 || Math.abs(angle - ta) > (2 * Math.PI - 0.2);
                            });
                            
                            if (isAngleValid) {
                                correctLasers++;
                            } else if (t.x === 4 && t.y === 2) {
                                // E noktasındaki lazer yanlış yöne bakıyorsa
                                eLaserWrongDirection = true;
                            }
                        }
                    });
                    
                    if (eLaserWrongDirection) {
                        this.showFeedback("Lazerler, karşılarındaki kenara dik olacak şekilde ayarlanmalı!", "error");
                        return false;
                    }
                    
                    if (correctLasers < 3) {
                         this.showFeedback("Lazerlerin açılarını kontrol edin. Dik kenarlara dikkat!", "error");
                         return false;
                    }
                    return true;
                },
                feedback: "Harika! Dik açılı üçgende iki yükseklik dik kenarların kendisidir."
            },
            {
                id: 'right-orthocenter',
                text: "<strong>'Nokta Ekle'</strong> aracıyla diklik merkezini (kesişim noktasını) işaretleyin.",
                type: 'action',
                validate: () => {
                    // Orthocenter is at D(-6, -2) (Math)
                    // SVG: (-6, 2)
                    const targetX = -6;
                    const targetY = 2;
                    const points = state.objects.filter(o => o.type === 'point');
                    return points.some(p => Math.hypot(p.x - targetX, p.y - targetY) < 1.0);
                },
                feedback: "Tebrikler! Dik açılı üçgenlerde diklik merkezi DİK AÇININ OLDUĞU KÖŞEDİR."
            },

            // BÖLÜM 3: GENİŞ AÇILI ÜÇGEN (OBTUSE TRIANGLE)
            {
                id: 'obtuse-intro',
                text: "Son olarak farklı bir üçgen çeşidini inceleyelim.",
                type: 'info',
                onEnter: () => this.clearCanvas()
            },
            {
                id: 'obtuse-draw',
                text: "<strong>'Çokgen Oluştur'</strong> aracını kullanarak şu noktalardan geçen bir üçgen oluşturun:<br><strong>G(-2, -2)</strong>, <strong>H(4, -2)</strong>, <strong>K(-4, 4)</strong>",
                type: 'action',
                vertexTargets: [
                    { svgX: -2, svgY:  2, label: 'G', offX:  0.0, offY:  0.8 },
                    { svgX:  4, svgY:  2, label: 'H', offX:  0.8, offY:  0.7 },
                    { svgX: -4, svgY: -4, label: 'K', offX: -0.8, offY: -0.7 }
                ],
                validate: () => {
                    const poly = state.objects.find(o => o.type === 'polygon');
                    if (!poly) return false;
                    
                    // Math: G(-2, -2), H(4, -2), K(-4, 4)
                    // SVG: G(-2, 2), H(4, 2), K(-4, -4)
                    const targets = [
                        {x: -2, y: 2},
                        {x: 4, y: 2},
                        {x: -4, y: -4}
                    ];
                    
                    let matchCount = 0;
                    for (let t of targets) {
                        if (poly.points.some(p => Math.hypot(p.x - t.x, p.y - t.y) < 0.5)) matchCount++;
                    }
                    return matchCount >= 3;
                },
                feedback: "Üçgen oluşturuldu."
            },
            {
                id: 'obtuse-identify',
                text: "Bu üçgenin çeşidi nedir?",
                type: 'question',
                options: [
                    { text: "Dar Açılı Üçgen", value: "dar", correct: false },
                    { text: "Dik Açılı Üçgen", value: "dik", correct: false },
                    { text: "Geniş Açılı Üçgen", value: "genis", correct: true }
                ],
                correctFeedback: "Doğru! Bir açısı 90 dereceden büyüktür.",
                wrongFeedback: "Geniş bir açı görüyor musunuz?"
            },
            {
                id: 'obtuse-extend-sides',
                text: "Geniş açılı üçgenlerde diklik merkezi dışarıda oluşur. Bunu görmek için geniş açının kollarını uzatmamız gerekiyor. <br><strong>'Doğrultu Çiz'</strong> aracını kullanarak geniş açının olduğu köşeden (G) geçen kenarların üzerine tıklayın.",
                type: 'action',
                validate: () => {
                    // G(-2, 2)
                    const g = {x: -2, y: 2};
                    const raysNearG = state.directionRays.filter(r => 
                        Math.hypot(r.x1 - g.x, r.y1 - g.y) < 1.0 || Math.hypot(r.x2 - g.x, r.y2 - g.y) < 1.0
                    );
                    
                    let hasHorizontal = false;
                    let hasSlope3 = false; // GK slope
                    
                    raysNearG.forEach(r => {
                        const dx = r.x2 - r.x1;
                        const dy = r.y2 - r.y1;
                        const angle = Math.atan2(dy, dx);
                        
                        // Horizontal (0 or PI)
                        if (Math.abs(Math.sin(angle)) < 0.1) hasHorizontal = true;
                        
                        // Slope 3 (Angle ~1.249 or -1.892)
                        // GK vector: (-2, -6) -> atan2(-6, -2) = -1.892 rad (-108 deg)
                        // KG vector: (2, 6) -> atan2(6, 2) = 1.249 rad (71.5 deg)
                        const targetAngle = 1.249; 
                        
                        // Check against targetAngle and targetAngle + PI (approx -1.892)
                        // Normalize angle to 0-2PI for comparison or use abs diff with PI mod
                        let a = angle;
                        if (a < 0) a += 2 * Math.PI;
                        let t = targetAngle;
                        if (t < 0) t += 2 * Math.PI;
                        
                        // Check parallelism (0 or 180 diff)
                        const diff = Math.abs(a - t);
                        const isParallel = diff < 0.2 || Math.abs(diff - Math.PI) < 0.2 || Math.abs(diff - 2*Math.PI) < 0.2;
                        
                        if (isParallel) hasSlope3 = true;
                    });
                    
                    if (!hasHorizontal) {
                        this.showFeedback("Geniş açının yatay kolunun (GH) uzantısını çizin.", "error");
                        return false;
                    }
                    if (!hasSlope3) {
                        this.showFeedback("Geniş açının diğer kolunun (GK) uzantısını çizin.", "error");
                        return false;
                    }
                    return true;
                },
                feedback: "Kenar uzantıları çizildi."
            },
            {
                id: 'obtuse-lasers',
                text: "Köşelere lazer yerleştirip karşı kenarlara dik gönderin. Dikkat: Karşı kenar kısa kalırsa, kenarın <strong>uzantısına</strong> dik inmeniz gerekir!",
                type: 'action',
                validate: () => {
                    const lasers = state.objects.filter(o => o.type === 'laser');
                    if (lasers.length < 3) return false;
                    
                    // Math: G(-2, -2), H(4, -2), K(-4, 4)
                    // SVG: G(-2, 2), H(4, 2), K(-4, -4)
                    
                    // G(-2, 2) -> HK: (4, 2) to (-4, -4). Slope = (-4-2)/(-4-4) = -6/-8 = 0.75.
                    // Altitude from G: Slope = -1/0.75 = -1.333 (-4/3).
                    
                    // H(4, 2) -> GK: (-2, 2) to (-4, -4). Slope = (-4-2)/(-4-(-2)) = -6/-2 = 3.
                    // Altitude from H: Slope = -1/3.
                    
                    // K(-4, -4) -> GH: (-2, 2) to (4, 2). Horizontal y=2.
                    // Altitude from K: Vertical.
                    
                    const targets = [
                        { x: -2, y: 2, validAngles: [Math.atan(-4/3), Math.atan(-4/3) + Math.PI] },
                        { x: 4, y: 2, validAngles: [Math.atan(-1/3), Math.atan(-1/3) + Math.PI] },
                        { x: -4, y: -4, validAngles: [Math.PI/2, 3*Math.PI/2] }
                    ];
                    
                    let correctLasers = 0;
                    lasers.forEach(l => {
                        const t = targets.find(t => Math.hypot(t.x - l.x, t.y - l.y) < 1.0);
                        if (t) {
                            let angle = l.angle % (2 * Math.PI);
                            if (angle < 0) angle += 2 * Math.PI;
                            const isAngleValid = t.validAngles.some(targetAngle => {
                                let ta = targetAngle % (2 * Math.PI);
                                if (ta < 0) ta += 2 * Math.PI;
                                return Math.abs(angle - ta) < 0.2 || Math.abs(angle - ta) > (2 * Math.PI - 0.2);
                            });
                            if (isAngleValid) correctLasers++;
                        }
                    });
                    
                    if (correctLasers < 3) {
                         this.showFeedback("Lazerler karşı kenara (veya uzantısına) dik olmalı.", "error");
                         return false;
                    }
                    return true;
                },
                feedback: "Mükemmel! Geniş açılı üçgende yüksekliklerin bazıları üçgenin dışına düşer."
            },
            {
                id: 'obtuse-extend-laser',
                text: "Geniş açının olduğu köşedeki (G) lazerin arkasına doğru uzantısını çizelim. <strong>'Doğrultu Çiz'</strong> aracını kullanarak bu lazere tıklayın.",
                type: 'action',
                validate: () => {
                    const g = {x: -2, y: 2};
                    const raysNearG = state.directionRays.filter(r => 
                        Math.hypot(r.x1 - g.x, r.y1 - g.y) < 1.0 || Math.hypot(r.x2 - g.x, r.y2 - g.y) < 1.0
                    );
                    
                    let hasLaserExtension = false;
                    raysNearG.forEach(r => {
                         const dx = r.x2 - r.x1;
                         const dy = r.y2 - r.y1;
                         const angle = Math.atan2(dy, dx);
                         
                         // Target slope -4/3. Angle atan(-1.333) = -0.927 rad.
                         let a = angle;
                         if (a < 0) a += 2 * Math.PI;
                         
                         const targetAngle = Math.atan(-4/3); 
                         let t = targetAngle;
                         if (t < 0) t += 2 * Math.PI; 
                         
                         const diff = Math.abs(a - t);
                         const isParallel = diff < 0.2 || Math.abs(diff - Math.PI) < 0.2 || Math.abs(diff - 2*Math.PI) < 0.2;
                         
                         if (isParallel) hasLaserExtension = true;
                    });
                    
                    if (!hasLaserExtension) {
                         this.showFeedback("G noktasındaki lazerin uzantısını çizin.", "error");
                         return false;
                    }
                    return true;
                },
                feedback: "Lazer uzantısı çizildi. Şimdi kesişim noktasını görebilirsiniz."
            },
            {
                id: 'obtuse-orthocenter',
                text: "<strong>'Nokta Ekle'</strong> aracıyla diklik merkezini (yüksekliklerin kesişim noktası) işaretleyin.",
                type: 'action',
                validate: () => {
                    // Math Orthocenter: (-4, -4.66)
                    // SVG Orthocenter: (-4, 4.66)
                    
                    const targetX = -4;
                    const targetY = 4.66;
                    const points = state.objects.filter(o => o.type === 'point');
                    return points.some(p => Math.hypot(p.x - targetX, p.y - targetY) < 1.0);
                },
                feedback: "Tebrikler! Geniş açılı üçgenlerde diklik merkezi üçgenin DIŞINDADIR."
            },
            
            // TEBRİKLER
            {
                id: 'finish',
                text: "Tebrikler! Tüm bölümleri başarıyla tamamladınız. Artık üçgen çeşitlerini ve diklik merkezlerini çok iyi biliyorsunuz.",
                type: 'info',
                isCheckpoint: true
            }
        ];
        
        this.renderStep();
    }

    renderStep() {
        const step = this.steps[this.currentStepIndex];
        
        // Update UI
        this.instructionEl.innerHTML = step.text;
        
        // Progress bar
        const progress = ((this.currentStepIndex) / (this.steps.length - 1)) * 100;
        this.progressBar.style.width = `${progress}%`;
        
        // Clear previous feedback
        this.feedbackEl.style.display = 'none';
        this.feedbackEl.className = 'tutorial-feedback';
        
        // Reset Question Area
        this.questionArea.innerHTML = '';
        
        // Setup Next Button
        this.nextBtn.style.display = 'none'; // Default hidden
        
        // If question type, render options
        if (step.type === 'question') {
            const btnGroup = document.createElement('div');
            btnGroup.className = 'tutorial-btn-group';
            
            step.options.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'tutorial-opt-btn';
                btn.textContent = opt.text;
                btn.onclick = () => this.checkAnswer(opt, btn);
                btnGroup.appendChild(btn);
            });
            
            this.questionArea.appendChild(btnGroup);
        } 
        else if (step.type === 'info') {
            this.nextBtn.style.display = 'block';
            this.nextBtn.disabled = false;
        }
        else if (step.type === 'action') {
            // Check immediately in case condition is already met
            this.validateCurrentStep();
        }

        // Execute onEnter
        if (step.onEnter) {
            step.onEnter();
        }
    }

    validateCurrentStep() {
        if (!this.isActive) return;
        const step = this.steps[this.currentStepIndex];
        if (step.type !== 'action') return;

        const isValid = step.validate();
        
        if (isValid) {
            // Persist vertex targets so labels survive beyond the draw step
            if (step.vertexTargets) {
                this.activeVertexTargets = step.vertexTargets;
            }
            this.showFeedback(step.feedback, "success");
            this.nextBtn.style.display = 'block';
            this.nextBtn.disabled = false;
            this.nextBtn.classList.add('pulse-anim');
        } else {
            // Keep hidden or disable
            // this.nextBtn.style.display = 'none';
        }
    }

    checkAnswer(option, btnElement) {
        const step = this.steps[this.currentStepIndex];
        
        // Disable all buttons
        const allBtns = this.questionArea.querySelectorAll('button');
        allBtns.forEach(b => b.disabled = true);
        
        if (option.correct) {
            btnElement.style.borderColor = 'var(--success-color)';
            btnElement.style.backgroundColor = '#d4edda';
            this.showFeedback(step.correctFeedback, "success");
            this.nextBtn.style.display = 'block';
            this.nextBtn.disabled = false;
        } else {
            btnElement.style.borderColor = 'var(--danger-color)';
            btnElement.style.backgroundColor = '#f8d7da';
            this.showFeedback(step.wrongFeedback, "error");
            
            // Enable buttons after short delay for retry
            setTimeout(() => {
                allBtns.forEach(b => b.disabled = false);
                this.feedbackEl.style.display = 'none';
            }, 2000);
        }
    }

    showFeedback(msg, type) {
        this.feedbackEl.textContent = msg;
        this.feedbackEl.className = `tutorial-feedback ${type}`;
        this.feedbackEl.style.display = 'block';
    }

    nextStep() {
        this.nextBtn.classList.remove('pulse-anim');
        if (this.currentStepIndex < this.steps.length - 1) {
            this.currentStepIndex++;
            this.renderStep();
        } else {
            // Last step (finish) – navigate to Section 3 (Quiz)
            if (typeof showSection === 'function') {
                showSection(3);
            }
        }
    }
    
    clearCanvas() {
        this.clearVertexLabels();
        if (typeof state !== 'undefined') {
            state.objects = [];
            state.directionRays = [];
            if (typeof renderObjects === 'function') renderObjects();
            else if (typeof render === 'function') render();
        }
    }

    clearVertexLabels() {
        this.activeVertexTargets = null;
        if (this.tutorialLabelsLayer) this.tutorialLabelsLayer.innerHTML = '';
    }

    updateVertexLabels() {
        if (!this.tutorialLabelsLayer) return;
        const step = this.steps[this.currentStepIndex];

        // Use current step's targets (while drawing) or persisted active targets (after draw)
        const targets = (step && step.vertexTargets) ? step.vertexTargets : this.activeVertexTargets;
        if (!targets) {
            this.tutorialLabelsLayer.innerHTML = '';
            return;
        }

        // Gather all placed points: completed polygon + in-progress tempObject
        let allPoints = [];
        if (typeof state !== 'undefined') {
            const poly = state.objects.find(o => o.type === 'polygon');
            if (poly) allPoints = [...poly.points];
            if (state.tempObject && state.tempObject.type === 'polygon') {
                allPoints = [...allPoints, ...state.tempObject.points];
            }
        }

        this.tutorialLabelsLayer.innerHTML = '';
        const SVG_NS = 'http://www.w3.org/2000/svg';
        const fontSize = (typeof state !== 'undefined' && state.viewWidth) ? state.viewWidth * 0.042 : 0.75;

        for (const vt of targets) {
            const matched = allPoints.some(p => Math.hypot(p.x - vt.svgX, p.y - vt.svgY) < 0.6);
            if (!matched) continue;

            const lx = vt.svgX + (vt.offX !== undefined ? vt.offX : 0.3);
            const ly = vt.svgY + (vt.offY !== undefined ? vt.offY : -0.5);

            const text = document.createElementNS(SVG_NS, 'text');
            text.setAttribute('x', lx);
            text.setAttribute('y', ly);
            text.setAttribute('font-size', fontSize);
            text.setAttribute('font-weight', 'bold');
            text.setAttribute('fill', '#d35400');
            text.setAttribute('stroke', 'white');
            text.setAttribute('stroke-width', '0.18');
            text.setAttribute('paint-order', 'stroke');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('pointer-events', 'none');
            text.textContent = vt.label;
            this.tutorialLabelsLayer.appendChild(text);
        }
    }
}
