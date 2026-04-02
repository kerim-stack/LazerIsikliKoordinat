class Tutorial3Manager {
    constructor() {
        this.steps = [];
        this.currentStepIndex = 0;
        this.isActive = true;

        // UI Elements
        this.container = document.getElementById('tutorial-container');
        this.instructionEl = document.getElementById('tutorial-instruction');
        this.feedbackEl = document.getElementById('tutorial-feedback');
        this.nextBtn = document.getElementById('tutorial-next-btn');
        this.progressBar = document.getElementById('tutorial-progress-bar');
        this.questionArea = document.getElementById('tutorial-question-area');

        // Extra SVG layers for tutorial overlays
        this.overlayLayer = document.getElementById('tutorial-overlay-layer');
        // Persistent axes layer (drawn once, stays)
        this.axesLayer = document.getElementById('tutorial-axes-layer');

        // Animation state
        this.animationId = null;
        this.animatingLaser = null;
        this.currentAnimFn = null; // store current anim function for replay
        this.isWrongAnswerReplay = false; // flag: animation replayed from wrong-answer context

        // Replay button (created once)
        this.btnRow = document.getElementById('tutorial-btn-row');

        this.replayBtn = document.createElement('button');
        this.replayBtn.innerHTML = '<i class="fas fa-rotate-right"></i> Yeniden Oynat';
        this.replayBtn.style.cssText = 'background:#fff;color:var(--primary-color);border:2px solid var(--primary-color);padding:10px 24px;border-radius:8px;font-weight:600;cursor:pointer;display:none;';
        this.replayBtn.addEventListener('click', () => this.replayAnimation());

        // Wrong-answer action buttons (shown on incorrect answer)
        this.retryBtn = document.createElement('button');
        this.retryBtn.innerHTML = '<i class="fas fa-redo"></i> Tekrar Dene';
        this.retryBtn.style.cssText = 'background:#fff;color:var(--danger-color);border:2px solid var(--danger-color);padding:10px 24px;border-radius:8px;font-weight:600;cursor:pointer;display:none;';
        this.retryBtn.addEventListener('click', () => this.retryQuestion());

        this.replayAnimBtn = document.createElement('button');
        this.replayAnimBtn.innerHTML = '<i class="fas fa-film"></i> Animasyonu Tekrar Oynat';
        this.replayAnimBtn.style.cssText = 'background:#fff;color:var(--primary-color);border:2px solid var(--primary-color);padding:10px 24px;border-radius:8px;font-weight:600;cursor:pointer;display:none;';
        this.replayAnimBtn.addEventListener('click', () => this.replayAnimForQuestion());

        // Bind events
        if (this.nextBtn) this.nextBtn.addEventListener('click', () => this.nextStep());

        // Show container
        if (this.container) {
            this.container.style.display = 'block';
        }

        this.initSteps();
    }

    // ===================== STEP DEFINITIONS =====================
    initSteps() {
        this.steps = [
            // ══════════ GİRİŞ ══════════
            {
                id: 'intro',
                text: "<strong>Birim Çember Uygulamasına Hoş Geldiniz!</strong><br>Bu bölümde birim çember üzerinde <em>sin</em>, <em>cos</em>, <em>tan</em> ve <em>cot</em> değerlerinin nasıl değiştiğini dört bölge boyunca keşfedeceğiz. Hazırsanız başlayalım!",
                type: 'info',
                onEnter: () => this.setupUnitCircleScene()
            },

            // ══════════ 1. BÖLGE (0° – 90°) ══════════
            // ── SIN ──
            {
                id: 'q1-sin-anim',
                text: "Orijine yerleştirilmiş lazer 0°'den 90°'ye doğru hareket ediyor. <strong>P</strong> noktasının <strong>y koordinatını</strong> (sin α) gözlemleyin. <span style='color:#e74c3c;font-weight:700'>Y ekseni üzerindeki kırmızı</span> bölgeye dikkat edin.",
                type: 'anim',
                animFn: () => this.animateLaser(0, 90, 'sin', () => this.showAnimButtons())
            },
            {
                id: 'q1-sin-q',
                text: "Lazer 0°'den 90°'ye dönerken <strong>sin α</strong> nasıl değişti?",
                type: 'question',
                options: [
                    { text: "0'dan 1'e arttı", correct: true },
                    { text: "1'den 0'a azaldı", correct: false },
                    { text: "Hep sabit kaldı", correct: false }
                ],
                correctFeedback: "Doğru! sin 0° = 0'dan sin 90° = 1'e kadar sürekli artar.",
                wrongFeedback: "Tekrar düşünün. P noktasının y koordinatı başta 0'da, sonda 1'de."
            },
            // ── COS ──
            {
                id: 'q1-cos-anim',
                text: "Şimdi aynı hareketi tekrar izleyelim ama bu sefer <strong>cos α</strong>'ya (P noktasının x koordinatı) odaklanın. <span style='color:#27ae60;font-weight:700'>X ekseni üzerindeki yeşil</span> bölgeye dikkat edin.",
                type: 'anim',
                animFn: () => this.animateLaser(0, 90, 'cos', () => this.showAnimButtons())
            },
            {
                id: 'q1-cos-q',
                text: "Lazer 0°'den 90°'ye dönerken <strong>cos α</strong> nasıl değişti?",
                type: 'question',
                options: [
                    { text: "0'dan 1'e arttı", correct: false },
                    { text: "1'den 0'a azaldı", correct: true },
                    { text: "Hep sabit kaldı", correct: false }
                ],
                correctFeedback: "Doğru! cos 0° = 1'den cos 90° = 0'a kadar sürekli azalır.",
                wrongFeedback: "Tekrar düşünün. P noktasının x koordinatı başta 1'de, sonda 0'da."
            },
            // ── TAN ──
            {
                id: 'q1-tan-intro',
                text: "Şimdi <strong>tan ekseni</strong>ni çizeceğiz. tan α, orijinden geçen ışının <strong style='color:#f39c12'>x = 1</strong> doğrusu üzerinde kestiği noktanın y koordinatı olarak tanımlanır.",
                type: 'info',
                onEnter: () => this.drawTanAxis()
            },
            {
                id: 'q1-tan-anim',
                text: "Lazer 0°'den 90°'ye dönerken, ışının <strong style='color:#f39c12'>tan ekseni</strong> (x = 1) üzerinde kestiği <strong>T</strong> noktasını gözlemleyin. <span style='color:#f39c12;font-weight:700'>Tan ekseni üzerindeki turuncu</span> bölgeye dikkat edin.",
                type: 'anim',
                animFn: () => this.animateLaserWithTan(0, 90, () => this.showAnimButtons())
            },
            {
                id: 'q1-tan-q',
                text: "Lazer 0°'den 90°'ye yaklaşırken <strong>tan α</strong> nasıl değişti?",
                type: 'question',
                options: [
                    { text: "0'dan sonsuza doğru arttı", correct: true },
                    { text: "1'den 0'a azaldı", correct: false },
                    { text: "Hep sabit kaldı", correct: false }
                ],
                correctFeedback: "Doğru! tan 0° = 0'dan başlar ve 90°'ye yaklaştıkça sonsuza gider (tanımsız olur).",
                wrongFeedback: "Tekrar düşünün. T noktası tan ekseni üzerinde yukarı doğru kayıyor ve 90°'de doğruyla kesişemiyor."
            },
            // ── COT ──
            {
                id: 'q1-cot-intro',
                text: "Şimdi <strong>cot ekseni</strong>ni çizeceğiz. cot α, orijinden geçen ışının <strong style='color:#9b59b6'>y = 1</strong> doğrusu üzerinde kestiği noktanın x koordinatı olarak tanımlanır.",
                type: 'info',
                onEnter: () => this.drawCotAxis()
            },
            {
                id: 'q1-cot-anim',
                text: "Lazer 0°'ye yakın açılardan 90°'ye dönerken, ışının <strong style='color:#9b59b6'>cot ekseni</strong> (y = 1) üzerinde kestiği <strong>C</strong> noktasını gözlemleyin. <span style='color:#9b59b6;font-weight:700'>Cot ekseni üzerindeki mor</span> bölgeye dikkat edin.",
                type: 'anim',
                animFn: () => this.animateLaserWithCot(5, 90, () => this.showAnimButtons())
            },
            {
                id: 'q1-cot-q',
                text: "Lazer 0°'ye yakın açılardan 90°'ye dönerken <strong>cot α</strong> nasıl değişti?",
                type: 'question',
                options: [
                    { text: "Sonsuzdan 0'a azaldı", correct: true },
                    { text: "0'dan sonsuza arttı", correct: false },
                    { text: "Hep sabit kaldı", correct: false }
                ],
                correctFeedback: "Doğru! 0°'ye yakınken cot α çok büyüktür (sonsuza gider), 90°'de ise cot 90° = 0 olur.",
                wrongFeedback: "Tekrar düşünün. C noktası başta çok sağda (sonsuz) ve 90°'de orijine gelir."
            },
            // ── 1. BÖLGE ÖZET ──
            {
                id: 'q1-finish',
                text: "<strong>1. Bölge Tamamlandı!</strong> 0° – 90° aralığında:<br>" +
                      "• <strong>sin α</strong>: 0 → 1 (artar)<br>" +
                      "• <strong>cos α</strong>: 1 → 0 (azalır)<br>" +
                      "• <strong>tan α</strong>: 0 → ∞ (artar, 90°'de tanımsız)<br>" +
                      "• <strong>cot α</strong>: ∞ → 0 (azalır, 0°'de tanımsız)",
                type: 'info',
                onEnter: () => { this.clearAxes(); this.clearOverlays(); }
            },

            // ══════════ 2. BÖLGE (90° – 180°) ══════════
            // ── SIN ──
            {
                id: 'q2-sin-anim',
                text: "<strong>2. Bölge</strong>'ye geçiyoruz. Lazer 90°'den 180°'ye hareket ediyor. <strong>sin α</strong>'yı (P noktasının y koordinatı) gözlemleyin. <span style='color:#e74c3c;font-weight:700'>Y ekseni üzerindeki kırmızı</span> bölgeye dikkat edin.",
                type: 'anim',
                animFn: () => this.animateLaser(90, 180, 'sin', () => this.showAnimButtons())
            },
            {
                id: 'q2-sin-q',
                text: "Lazer 90°'den 180°'ye dönerken <strong>sin α</strong> nasıl değişti?",
                type: 'question',
                options: [
                    { text: "1'den 0'a azaldı", correct: true },
                    { text: "0'dan 1'e arttı", correct: false },
                    { text: "Hep sabit kaldı", correct: false }
                ],
                correctFeedback: "Doğru! sin 90° = 1'den sin 180° = 0'a kadar sürekli azalır.",
                wrongFeedback: "Tekrar düşünün. P noktasının y koordinatı başta 1'de, sonda 0'da."
            },
            // ── COS ──
            {
                id: 'q2-cos-anim',
                text: "Şimdi <strong>cos α</strong>'ya odaklanın. <span style='color:#27ae60;font-weight:700'>X ekseni üzerindeki yeşil</span> bölgeye dikkat edin.",
                type: 'anim',
                animFn: () => this.animateLaser(90, 180, 'cos', () => this.showAnimButtons())
            },
            {
                id: 'q2-cos-q',
                text: "Lazer 90°'den 180°'ye dönerken <strong>cos α</strong> nasıl değişti?",
                type: 'question',
                options: [
                    { text: "0'dan −1'e azaldı", correct: true },
                    { text: "−1'den 0'a arttı", correct: false },
                    { text: "Hep sabit kaldı", correct: false }
                ],
                correctFeedback: "Doğru! cos 90° = 0'dan cos 180° = −1'e kadar sürekli azalır.",
                wrongFeedback: "Tekrar düşünün. P noktasının x koordinatı başta 0'da, sonda −1'de."
            },
            // ── TAN ──
            {
                id: 'q2-tan-intro',
                text: "2. bölgede lazer ışını <em>sola</em> doğru gider ve <strong style='color:#f39c12'>tan ekseni</strong> (x = 1) ile doğrudan kesişemez. Ancak ışının <em>uzantısı</em> (ters yöndeki kesikli çizgi) tan eksenini keser.",
                type: 'info',
                onEnter: () => this.drawTanAxis()
            },
            {
                id: 'q2-tan-anim',
                text: "Lazer 90°'den 180°'ye dönerken, ışının <em>uzantısının</em> <strong style='color:#f39c12'>tan ekseni</strong> üzerinde kestiği <strong>T</strong> noktasını gözlemleyin.",
                type: 'anim',
                animFn: () => this.animateLaserWithTan(90, 180, () => this.showAnimButtons())
            },
            {
                id: 'q2-tan-q',
                text: "Lazer 90°'den 180°'ye dönerken <strong>tan α</strong> nasıl değişti?",
                type: 'question',
                options: [
                    { text: "Eksi sonsuzdan 0'a doğru arttı", correct: true },
                    { text: "0'dan sonsuza arttı", correct: false },
                    { text: "Hep sabit kaldı", correct: false }
                ],
                correctFeedback: "Doğru! 90°'nin hemen sonrasında tan α = −∞'dan başlar ve 180°'ye yaklaştıkça 0'a doğru artar.",
                wrongFeedback: "Tekrar düşünün. T noktası çok aşağıdan başlayıp yavaşça yukarı çıkıyor."
            },
            // ── COT ──
            {
                id: 'q2-cot-intro',
                text: "2. bölgede lazer ışını yukarı doğru gider ve <strong style='color:#9b59b6'>cot ekseni</strong> (y = 1) ile doğrudan kesişir.",
                type: 'info',
                onEnter: () => this.drawCotAxis()
            },
            {
                id: 'q2-cot-anim',
                text: "Lazer 90°'den 180°'ye yakın açılara dönerken, ışının <strong style='color:#9b59b6'>cot ekseni</strong> üzerinde kestiği <strong>C</strong> noktasını gözlemleyin. <span style='color:#9b59b6;font-weight:700'>Cot ekseni üzerindeki mor</span> bölgeye dikkat edin.",
                type: 'anim',
                animFn: () => this.animateLaserWithCot(90, 180, () => this.showAnimButtons())
            },
            {
                id: 'q2-cot-q',
                text: "Lazer 90°'den 180°'ye yaklaşırken <strong>cot α</strong> nasıl değişti?",
                type: 'question',
                options: [
                    { text: "0'dan eksi sonsuza azaldı", correct: true },
                    { text: "Sonsuzdan 0'a azaldı", correct: false },
                    { text: "Hep sabit kaldı", correct: false }
                ],
                correctFeedback: "Doğru! cot 90° = 0'dan başlar ve 180°'ye yaklaştıkça −∞'a gider.",
                wrongFeedback: "Tekrar düşünün. C noktası orijinden başlayıp giderek sola kayıyor."
            },
            // ── 2. BÖLGE ÖZET ──
            {
                id: 'q2-finish',
                text: "<strong>2. Bölge Tamamlandı!</strong> 90° – 180° aralığında:<br>" +
                      "• <strong>sin α</strong>: 1 → 0 (azalır)<br>" +
                      "• <strong>cos α</strong>: 0 → −1 (azalır)<br>" +
                      "• <strong>tan α</strong>: −∞ → 0 (artar, 90°'de tanımsız)<br>" +
                      "• <strong>cot α</strong>: 0 → −∞ (azalır, 180°'de tanımsız)",
                type: 'info',
                onEnter: () => { this.clearAxes(); this.clearOverlays(); }
            },

            // ══════════ 3. BÖLGE (180° – 270°) ══════════
            // ── SIN ──
            {
                id: 'q3-sin-anim',
                text: "<strong>3. Bölge</strong>'ye geçiyoruz. Lazer 180°'den 270°'ye hareket ediyor. <strong>sin α</strong>'yı gözlemleyin. <span style='color:#e74c3c;font-weight:700'>Y ekseni üzerindeki kırmızı</span> bölgeye dikkat edin.",
                type: 'anim',
                animFn: () => this.animateLaser(180, 270, 'sin', () => this.showAnimButtons())
            },
            {
                id: 'q3-sin-q',
                text: "Lazer 180°'den 270°'ye dönerken <strong>sin α</strong> nasıl değişti?",
                type: 'question',
                options: [
                    { text: "0'dan −1'e azaldı", correct: true },
                    { text: "−1'den 0'a arttı", correct: false },
                    { text: "Hep sabit kaldı", correct: false }
                ],
                correctFeedback: "Doğru! sin 180° = 0'dan sin 270° = −1'e kadar sürekli azalır.",
                wrongFeedback: "Tekrar düşünün. P noktasının y koordinatı başta 0'da, sonda −1'de."
            },
            // ── COS ──
            {
                id: 'q3-cos-anim',
                text: "Şimdi <strong>cos α</strong>'ya odaklanın. <span style='color:#27ae60;font-weight:700'>X ekseni üzerindeki yeşil</span> bölgeye dikkat edin.",
                type: 'anim',
                animFn: () => this.animateLaser(180, 270, 'cos', () => this.showAnimButtons())
            },
            {
                id: 'q3-cos-q',
                text: "Lazer 180°'den 270°'ye dönerken <strong>cos α</strong> nasıl değişti?",
                type: 'question',
                options: [
                    { text: "−1'den 0'a arttı", correct: true },
                    { text: "0'dan −1'e azaldı", correct: false },
                    { text: "Hep sabit kaldı", correct: false }
                ],
                correctFeedback: "Doğru! cos 180° = −1'den cos 270° = 0'a kadar sürekli artar.",
                wrongFeedback: "Tekrar düşünün. P noktasının x koordinatı başta −1'de, sonda 0'da."
            },
            // ── TAN ──
            {
                id: 'q3-tan-intro',
                text: "3. bölgede de lazer ışını sola doğru gider ve <strong style='color:#f39c12'>tan ekseni</strong> ile doğrudan kesişemez. Yine ışının <em>uzantısı</em> tan eksenini keser.",
                type: 'info',
                onEnter: () => this.drawTanAxis()
            },
            {
                id: 'q3-tan-anim',
                text: "Lazer 180°'den 270°'ye dönerken, ışının <em>uzantısının</em> <strong style='color:#f39c12'>tan ekseni</strong> üzerinde kestiği <strong>T</strong> noktasını gözlemleyin.",
                type: 'anim',
                animFn: () => this.animateLaserWithTan(180, 270, () => this.showAnimButtons())
            },
            {
                id: 'q3-tan-q',
                text: "Lazer 180°'den 270°'ye yaklaşırken <strong>tan α</strong> nasıl değişti?",
                type: 'question',
                options: [
                    { text: "0'dan sonsuza doğru arttı", correct: true },
                    { text: "Eksi sonsuzdan 0'a arttı", correct: false },
                    { text: "Hep sabit kaldı", correct: false }
                ],
                correctFeedback: "Doğru! tan 180° = 0'dan başlar ve 270°'ye yaklaştıkça sonsuza gider.",
                wrongFeedback: "Tekrar düşünün. T noktası başta orijindeyken yukarı doğru kayıyor."
            },
            // ── COT ──
            {
                id: 'q3-cot-intro',
                text: "3. bölgede lazer ışını aşağı doğru gider ve <strong style='color:#9b59b6'>cot ekseni</strong> (y = 1) ile doğrudan kesişemez. Ancak ışının <em>uzantısı</em> cot eksenini keser.",
                type: 'info',
                onEnter: () => this.drawCotAxis()
            },
            {
                id: 'q3-cot-anim',
                text: "Lazer 180°'ye yakın açılardan 270°'ye dönerken, ışının <em>uzantısının</em> <strong style='color:#9b59b6'>cot ekseni</strong> üzerinde kestiği <strong>C</strong> noktasını gözlemleyin. <span style='color:#9b59b6;font-weight:700'>Cot ekseni üzerindeki mor</span> bölgeye dikkat edin.",
                type: 'anim',
                animFn: () => this.animateLaserWithCot(180, 270, () => this.showAnimButtons())
            },
            {
                id: 'q3-cot-q',
                text: "Lazer 180°'den 270°'ye dönerken <strong>cot α</strong> nasıl değişti?",
                type: 'question',
                options: [
                    { text: "Sonsuzdan 0'a azaldı", correct: true },
                    { text: "0'dan sonsuza arttı", correct: false },
                    { text: "Hep sabit kaldı", correct: false }
                ],
                correctFeedback: "Doğru! 180°'nin hemen sonrasında cot α çok büyüktür ve 270°'de cot α = 0 olur.",
                wrongFeedback: "Tekrar düşünün. C noktası başta çok sağda ve 270°'de orijine gelir."
            },
            // ── 3. BÖLGE ÖZET ──
            {
                id: 'q3-finish',
                text: "<strong>3. Bölge Tamamlandı!</strong> 180° – 270° aralığında:<br>" +
                      "• <strong>sin α</strong>: 0 → −1 (azalır)<br>" +
                      "• <strong>cos α</strong>: −1 → 0 (artar)<br>" +
                      "• <strong>tan α</strong>: 0 → ∞ (artar, 270°'de tanımsız)<br>" +
                      "• <strong>cot α</strong>: ∞ → 0 (azalır, 180°'de tanımsız)",
                type: 'info',
                onEnter: () => { this.clearAxes(); this.clearOverlays(); }
            },

            // ══════════ 4. BÖLGE (270° – 360°) ══════════
            // ── SIN ──
            {
                id: 'q4-sin-anim',
                text: "<strong>4. Bölge</strong>'ye geçiyoruz. Lazer 270°'den 360°'ye hareket ediyor. <strong>sin α</strong>'yı gözlemleyin. <span style='color:#e74c3c;font-weight:700'>Y ekseni üzerindeki kırmızı</span> bölgeye dikkat edin.",
                type: 'anim',
                animFn: () => this.animateLaser(270, 360, 'sin', () => this.showAnimButtons())
            },
            {
                id: 'q4-sin-q',
                text: "Lazer 270°'den 360°'ye dönerken <strong>sin α</strong> nasıl değişti?",
                type: 'question',
                options: [
                    { text: "−1'den 0'a arttı", correct: true },
                    { text: "0'dan −1'e azaldı", correct: false },
                    { text: "Hep sabit kaldı", correct: false }
                ],
                correctFeedback: "Doğru! sin 270° = −1'den sin 360° = 0'a kadar sürekli artar.",
                wrongFeedback: "Tekrar düşünün. P noktasının y koordinatı başta −1'de, sonda 0'da."
            },
            // ── COS ──
            {
                id: 'q4-cos-anim',
                text: "Şimdi <strong>cos α</strong>'ya odaklanın. <span style='color:#27ae60;font-weight:700'>X ekseni üzerindeki yeşil</span> bölgeye dikkat edin.",
                type: 'anim',
                animFn: () => this.animateLaser(270, 360, 'cos', () => this.showAnimButtons())
            },
            {
                id: 'q4-cos-q',
                text: "Lazer 270°'den 360°'ye dönerken <strong>cos α</strong> nasıl değişti?",
                type: 'question',
                options: [
                    { text: "0'dan 1'e arttı", correct: true },
                    { text: "1'den 0'a azaldı", correct: false },
                    { text: "Hep sabit kaldı", correct: false }
                ],
                correctFeedback: "Doğru! cos 270° = 0'dan cos 360° = 1'e kadar sürekli artar.",
                wrongFeedback: "Tekrar düşünün. P noktasının x koordinatı başta 0'da, sonda 1'de."
            },
            // ── TAN ──
            {
                id: 'q4-tan-intro',
                text: "4. bölgede lazer ışını sağa doğru gider ve <strong style='color:#f39c12'>tan ekseni</strong> (x = 1) ile doğrudan kesişir.",
                type: 'info',
                onEnter: () => this.drawTanAxis()
            },
            {
                id: 'q4-tan-anim',
                text: "Lazer 270°'den 360°'ye dönerken, ışının <strong style='color:#f39c12'>tan ekseni</strong> üzerinde kestiği <strong>T</strong> noktasını gözlemleyin. <span style='color:#f39c12;font-weight:700'>Tan ekseni üzerindeki turuncu</span> bölgeye dikkat edin.",
                type: 'anim',
                animFn: () => this.animateLaserWithTan(270, 360, () => this.showAnimButtons())
            },
            {
                id: 'q4-tan-q',
                text: "Lazer 270°'den 360°'ye dönerken <strong>tan α</strong> nasıl değişti?",
                type: 'question',
                options: [
                    { text: "Eksi sonsuzdan 0'a doğru arttı", correct: true },
                    { text: "0'dan sonsuza arttı", correct: false },
                    { text: "Hep sabit kaldı", correct: false }
                ],
                correctFeedback: "Doğru! 270°'nin hemen sonrasında tan α = −∞'dan başlar ve 360°'ye yaklaştıkça 0'a doğru artar.",
                wrongFeedback: "Tekrar düşünün. T noktası çok aşağıdan başlayıp yavaşça yukarı çıkıyor."
            },
            // ── COT ──
            {
                id: 'q4-cot-intro',
                text: "4. bölgede lazer ışını aşağı doğru gider ve <strong style='color:#9b59b6'>cot ekseni</strong> (y = 1) ile doğrudan kesişemez. Işının <em>uzantısı</em> cot eksenini keser.",
                type: 'info',
                onEnter: () => this.drawCotAxis()
            },
            {
                id: 'q4-cot-anim',
                text: "Lazer 270°'ye yakın açılardan 360°'ye dönerken, ışının <em>uzantısının</em> <strong style='color:#9b59b6'>cot ekseni</strong> üzerinde kestiği <strong>C</strong> noktasını gözlemleyin. <span style='color:#9b59b6;font-weight:700'>Cot ekseni üzerindeki mor</span> bölgeye dikkat edin.",
                type: 'anim',
                animFn: () => this.animateLaserWithCot(270, 360, () => this.showAnimButtons())
            },
            {
                id: 'q4-cot-q',
                text: "Lazer 270°'den 360°'ye yaklaşırken <strong>cot α</strong> nasıl değişti?",
                type: 'question',
                options: [
                    { text: "0'dan eksi sonsuza azaldı", correct: true },
                    { text: "Sonsuzdan 0'a azaldı", correct: false },
                    { text: "Hep sabit kaldı", correct: false }
                ],
                correctFeedback: "Doğru! cot 270° = 0'dan başlar ve 360°'ye yaklaştıkça −∞'a gider.",
                wrongFeedback: "Tekrar düşünün. C noktası orijinden başlayıp giderek sola kayıyor."
            },
            // ── 4. BÖLGE ÖZET ──
            {
                id: 'q4-finish',
                text: "<strong>4. Bölge Tamamlandı!</strong> 270° – 360° aralığında:<br>" +
                      "• <strong>sin α</strong>: −1 → 0 (artar)<br>" +
                      "• <strong>cos α</strong>: 0 → 1 (artar)<br>" +
                      "• <strong>tan α</strong>: −∞ → 0 (artar, 270°'de tanımsız)<br>" +
                      "• <strong>cot α</strong>: 0 → −∞ (azalır, 360°'de tanımsız)",
                type: 'info'
            },

            // ══════════ GENEL SONUÇ ══════════
            {
                id: 'finish',
                text: "<strong>Tebrikler!</strong> Birim çemberin tamamını (0° – 360°) keşfettiniz!<br><br>" +
                      "<table style='width:100%;text-align:center;border-collapse:collapse;font-size:0.92em;'>" +
                      "<tr style='background:#f8f9fa;font-weight:700;'><td style='padding:4px;border:1px solid #dee2e6;'>Bölge</td><td style='padding:4px;border:1px solid #dee2e6;'>sin</td><td style='padding:4px;border:1px solid #dee2e6;'>cos</td><td style='padding:4px;border:1px solid #dee2e6;'>tan</td><td style='padding:4px;border:1px solid #dee2e6;'>cot</td></tr>" +
                      "<tr><td style='padding:4px;border:1px solid #dee2e6;'>0°–90°</td><td style='padding:4px;border:1px solid #dee2e6;'>0→1 ↑</td><td style='padding:4px;border:1px solid #dee2e6;'>1→0 ↓</td><td style='padding:4px;border:1px solid #dee2e6;'>0→∞ ↑</td><td style='padding:4px;border:1px solid #dee2e6;'>∞→0 ↓</td></tr>" +
                      "<tr><td style='padding:4px;border:1px solid #dee2e6;'>90°–180°</td><td style='padding:4px;border:1px solid #dee2e6;'>1→0 ↓</td><td style='padding:4px;border:1px solid #dee2e6;'>0→−1 ↓</td><td style='padding:4px;border:1px solid #dee2e6;'>−∞→0 ↑</td><td style='padding:4px;border:1px solid #dee2e6;'>0→−∞ ↓</td></tr>" +
                      "<tr><td style='padding:4px;border:1px solid #dee2e6;'>180°–270°</td><td style='padding:4px;border:1px solid #dee2e6;'>0→−1 ↓</td><td style='padding:4px;border:1px solid #dee2e6;'>−1→0 ↑</td><td style='padding:4px;border:1px solid #dee2e6;'>0→∞ ↑</td><td style='padding:4px;border:1px solid #dee2e6;'>∞→0 ↓</td></tr>" +
                      "<tr><td style='padding:4px;border:1px solid #dee2e6;'>270°–360°</td><td style='padding:4px;border:1px solid #dee2e6;'>−1→0 ↑</td><td style='padding:4px;border:1px solid #dee2e6;'>0→1 ↑</td><td style='padding:4px;border:1px solid #dee2e6;'>−∞→0 ↑</td><td style='padding:4px;border:1px solid #dee2e6;'>0→−∞ ↓</td></tr>" +
                      "</table>",
                type: 'info',
                isFinal: true,
                onEnter: () => { this.clearAxes(); this.clearOverlays(); }
            }
        ];

        this.renderStep();
    }

    // ===================== SCENE SETUP =====================
    setupUnitCircleScene() {
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
        this.animatingLaser = laser;

        if (typeof setTool === 'function') setTool('move');
        renderObjects();
    }

    clearCanvas() {
        this.stopAnimation();
        this.clearOverlays();
        this.clearAxes();
        if (typeof state !== 'undefined') {
            state.objects = [];
            state.directionRays = [];
            state.selectedObject = null;
            state.tempObject = null;
            if (typeof renderObjects === 'function') renderObjects();
        }
    }

    clearOverlays() {
        if (this.overlayLayer) this.overlayLayer.innerHTML = '';
    }

    clearAxes() {
        if (this.axesLayer) this.axesLayer.innerHTML = '';
    }

    stopAnimation() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    // ===================== REPLAY / ANIM BUTTONS =====================
    showAnimButtons() {
        if (this.isWrongAnswerReplay) {
            this.isWrongAnswerReplay = false;
            // Animation was replayed from a wrong-answer state — restore wrong-answer UI
            this.feedbackEl.style.display = 'block';
            this.showWrongAnswerBtns();
            return;
        }

        this.nextBtn.style.display = 'block';
        this.nextBtn.disabled = false;
        this.nextBtn.classList.add('pulse-anim');
        this.nextBtn.textContent = 'Sonraki Adım';

        // Append replay button to the right side of the row
        if (!this.replayBtn.parentNode || this.replayBtn.parentNode !== this.btnRow) {
            this.btnRow.appendChild(this.replayBtn);
        }
        this.replayBtn.style.display = 'block';
    }

    hideReplayBtn() {
        this.replayBtn.style.display = 'none';
        if (this.replayBtn.parentNode) {
            this.replayBtn.parentNode.removeChild(this.replayBtn);
        }
    }

    replayAnimation() {
        if (this.currentAnimFn) {
            this.nextBtn.style.display = 'none';
            this.replayBtn.style.display = 'none';
            this.currentAnimFn();
        }
    }

    // ===================== ANIMATION HELPERS =====================
    animateLaser(fromDeg, toDeg, focus, onComplete) {
        this.stopAnimation();
        const laser = this.animatingLaser;
        if (!laser) return;

        this.clearOverlays();

        const duration = 3000;
        const startTime = performance.now();

        const tick = (now) => {
            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);

            const deg = fromDeg + (toDeg - fromDeg) * t;
            const rad = -deg * Math.PI / 180;

            laser.angle = rad;
            laser.x = 0 - Math.cos(rad) * (laser.size / 2);
            laser.y = 0 - Math.sin(rad) * (laser.size / 2);

            renderObjects();
            this.drawProjections(deg, focus);

            if (t < 1) {
                this.animationId = requestAnimationFrame(tick);
            } else {
                this.animationId = null;
                if (onComplete) onComplete();
            }
        };
        this.animationId = requestAnimationFrame(tick);
    }

    animateLaserWithTan(fromDeg, toDeg, onComplete) {
        this.stopAnimation();
        const laser = this.animatingLaser;
        if (!laser) return;

        this.clearOverlays();
        // Remove any previously persisted tan segment so the animation starts fresh
        if (this.axesLayer) {
            const old = this.axesLayer.querySelector('[data-tan-seg]');
            if (old) old.parentNode.removeChild(old);
        }

        const duration = 4000;
        const startTime = performance.now();

        const tick = (now) => {
            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);

            const deg = fromDeg + (toDeg - fromDeg) * t;
            const rad = -deg * Math.PI / 180;

            laser.angle = rad;
            laser.x = 0 - Math.cos(rad) * (laser.size / 2);
            laser.y = 0 - Math.sin(rad) * (laser.size / 2);

            renderObjects();
            this.drawProjections(deg, 'none');
            this.drawTanProjection(deg);

            if (t < 1) {
                this.animationId = requestAnimationFrame(tick);
            } else {
                this.animationId = null;
                // Persist final tan projection into axes layer so it doesn't disappear
                this.finalTanDeg = fromDeg + (toDeg - fromDeg) * 1;
                this.drawFinalTanProjection(this.finalTanDeg);
                if (onComplete) onComplete();
            }
        };
        this.animationId = requestAnimationFrame(tick);
    }

    animateLaserWithCot(fromDeg, toDeg, onComplete) {
        this.stopAnimation();
        const laser = this.animatingLaser;
        if (!laser) return;

        this.clearOverlays();

        const duration = 4000;
        const startTime = performance.now();

        const tick = (now) => {
            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);

            const deg = fromDeg + (toDeg - fromDeg) * t;
            const rad = -deg * Math.PI / 180;

            laser.angle = rad;
            laser.x = 0 - Math.cos(rad) * (laser.size / 2);
            laser.y = 0 - Math.sin(rad) * (laser.size / 2);

            renderObjects();
            this.drawProjections(deg, 'none');
            this.drawCotProjection(deg);

            if (t < 1) {
                this.animationId = requestAnimationFrame(tick);
            } else {
                this.animationId = null;
                if (onComplete) onComplete();
            }
        };
        this.animationId = requestAnimationFrame(tick);
    }

    // ===================== DRAWING OVERLAYS =====================

    /**
     * P point + projections.  focus = 'sin' | 'cos' | 'both'
     * No tiny numeric labels — instead, color the axis segments.
     */
    drawProjections(deg, focus) {
        if (!this.overlayLayer) return;
        this.overlayLayer.innerHTML = '';

        const rad = deg * Math.PI / 180;
        const cosVal = Math.cos(rad);
        const sinVal = Math.sin(rad);
        const px = cosVal;       // SVG x
        const py = -sinVal;      // SVG y (inverted)

        const NS = 'http://www.w3.org/2000/svg';
        const fontSize = 0.07;

        // ── P noktası ──
        const pDot = document.createElementNS(NS, 'circle');
        pDot.setAttribute('cx', px);
        pDot.setAttribute('cy', py);
        pDot.setAttribute('r', 0.04);
        pDot.setAttribute('fill', '#e74c3c');
        this.overlayLayer.appendChild(pDot);

        const pLabel = document.createElementNS(NS, 'text');
        pLabel.setAttribute('x', px + 0.08);
        pLabel.setAttribute('y', py - 0.08);
        pLabel.setAttribute('font-size', fontSize);
        pLabel.setAttribute('fill', '#e74c3c');
        pLabel.setAttribute('font-weight', 'bold');
        pLabel.setAttribute('pointer-events', 'none');
        pLabel.textContent = 'P';
        this.overlayLayer.appendChild(pLabel);

        // ── sin: colored Y-axis segment ──
        if (focus === 'sin' || focus === 'both') {
            // Dashed line: P → foot on x-axis
            const sinDash = document.createElementNS(NS, 'line');
            sinDash.setAttribute('x1', px);
            sinDash.setAttribute('y1', py);
            sinDash.setAttribute('x2', px);
            sinDash.setAttribute('y2', 0);
            sinDash.setAttribute('stroke', '#e74c3c');
            sinDash.setAttribute('stroke-width', '1px');
            sinDash.setAttribute('stroke-dasharray', '0.03 0.02');
            sinDash.setAttribute('vector-effect', 'non-scaling-stroke');
            sinDash.setAttribute('opacity', '0.5');
            this.overlayLayer.appendChild(sinDash);

            // Horizontal guide: P → y-axis
            const sinGuide = document.createElementNS(NS, 'line');
            sinGuide.setAttribute('x1', px);
            sinGuide.setAttribute('y1', py);
            sinGuide.setAttribute('x2', 0);
            sinGuide.setAttribute('y2', py);
            sinGuide.setAttribute('stroke', '#e74c3c');
            sinGuide.setAttribute('stroke-width', '1px');
            sinGuide.setAttribute('stroke-dasharray', '0.03 0.02');
            sinGuide.setAttribute('vector-effect', 'non-scaling-stroke');
            sinGuide.setAttribute('opacity', '0.4');
            this.overlayLayer.appendChild(sinGuide);

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

                // Dot at the sin mark on y-axis
                const sinMark = document.createElementNS(NS, 'circle');
                sinMark.setAttribute('cx', 0);
                sinMark.setAttribute('cy', py);
                sinMark.setAttribute('r', 0.03);
                sinMark.setAttribute('fill', '#e74c3c');
                this.overlayLayer.appendChild(sinMark);

                // "sin α" label next to y-axis segment
                const sinLabel = document.createElementNS(NS, 'text');
                sinLabel.setAttribute('x', -0.1);
                sinLabel.setAttribute('y', py / 2);
                sinLabel.setAttribute('font-size', fontSize * 0.75);
                sinLabel.setAttribute('fill', '#e74c3c');
                sinLabel.setAttribute('font-weight', 'bold');
                sinLabel.setAttribute('text-anchor', 'end');
                sinLabel.setAttribute('dominant-baseline', 'middle');
                sinLabel.setAttribute('pointer-events', 'none');
                sinLabel.textContent = 'sin α';
                this.overlayLayer.appendChild(sinLabel);
            }
        }

        // ── cos: colored X-axis segment ──
        if (focus === 'cos' || focus === 'both') {
            // Dashed line: P → foot on y-axis
            const cosDash = document.createElementNS(NS, 'line');
            cosDash.setAttribute('x1', px);
            cosDash.setAttribute('y1', py);
            cosDash.setAttribute('x2', 0);
            cosDash.setAttribute('y2', py);
            cosDash.setAttribute('stroke', '#27ae60');
            cosDash.setAttribute('stroke-width', '1px');
            cosDash.setAttribute('stroke-dasharray', '0.03 0.02');
            cosDash.setAttribute('vector-effect', 'non-scaling-stroke');
            cosDash.setAttribute('opacity', '0.5');
            this.overlayLayer.appendChild(cosDash);

            // Vertical guide: P → x-axis
            const cosGuide = document.createElementNS(NS, 'line');
            cosGuide.setAttribute('x1', px);
            cosGuide.setAttribute('y1', py);
            cosGuide.setAttribute('x2', px);
            cosGuide.setAttribute('y2', 0);
            cosGuide.setAttribute('stroke', '#27ae60');
            cosGuide.setAttribute('stroke-width', '1px');
            cosGuide.setAttribute('stroke-dasharray', '0.03 0.02');
            cosGuide.setAttribute('vector-effect', 'non-scaling-stroke');
            cosGuide.setAttribute('opacity', '0.4');
            this.overlayLayer.appendChild(cosGuide);

            // SOLID thick color on X-axis: 0 → cos α
            if (Math.abs(cosVal) > 0.02) {
                const cosAxis = document.createElementNS(NS, 'line');
                cosAxis.setAttribute('x1', 0);
                cosAxis.setAttribute('y1', 0);
                cosAxis.setAttribute('x2', px);
                cosAxis.setAttribute('y2', 0);
                cosAxis.setAttribute('stroke', '#27ae60');
                cosAxis.setAttribute('stroke-width', '5px');
                cosAxis.setAttribute('vector-effect', 'non-scaling-stroke');
                cosAxis.setAttribute('stroke-linecap', 'round');
                cosAxis.setAttribute('opacity', '0.85');
                this.overlayLayer.appendChild(cosAxis);

                // Dot at the cos mark on x-axis
                const cosMark = document.createElementNS(NS, 'circle');
                cosMark.setAttribute('cx', px);
                cosMark.setAttribute('cy', 0);
                cosMark.setAttribute('r', 0.03);
                cosMark.setAttribute('fill', '#27ae60');
                this.overlayLayer.appendChild(cosMark);

                // "cos α" label below x-axis segment
                const cosLabel = document.createElementNS(NS, 'text');
                cosLabel.setAttribute('x', px / 2);
                cosLabel.setAttribute('y', 0.12);
                cosLabel.setAttribute('font-size', fontSize * 0.75);
                cosLabel.setAttribute('fill', '#27ae60');
                cosLabel.setAttribute('font-weight', 'bold');
                cosLabel.setAttribute('text-anchor', 'middle');
                cosLabel.setAttribute('pointer-events', 'none');
                cosLabel.textContent = 'cos α';
                this.overlayLayer.appendChild(cosLabel);
            }
        }

        // ── Açı yayı + etiket ──
        const angleLabel = document.createElementNS(NS, 'text');
        const aLabelRad = (deg / 2) * Math.PI / 180;
        angleLabel.setAttribute('x', 0.22 * Math.cos(aLabelRad));
        angleLabel.setAttribute('y', -0.22 * Math.sin(aLabelRad));
        angleLabel.setAttribute('font-size', fontSize * 0.7);
        angleLabel.setAttribute('fill', '#555');
        angleLabel.setAttribute('text-anchor', 'middle');
        angleLabel.setAttribute('pointer-events', 'none');
        angleLabel.textContent = Math.round(deg) + '°';
        this.overlayLayer.appendChild(angleLabel);

        if (deg > 1) {
            const arcPath = this.makeArc(0, 0, 0.15, 0, deg);
            const arc = document.createElementNS(NS, 'path');
            arc.setAttribute('d', arcPath);
            arc.setAttribute('fill', 'none');
            arc.setAttribute('stroke', '#555');
            arc.setAttribute('stroke-width', '1px');
            arc.setAttribute('vector-effect', 'non-scaling-stroke');
            this.overlayLayer.appendChild(arc);
        }
    }

    // Draws the final tan segment persistently into axesLayer (called once when anim ends)
    drawFinalTanProjection(deg) {
        if (!this.axesLayer) return;
        const NS = 'http://www.w3.org/2000/svg';
        const rad = deg * Math.PI / 180;
        const cosVal = Math.cos(rad);
        const tanVal = Math.tan(rad);

        const minY = state.viewY;
        const maxY = state.viewY + state.viewHeight;
        let segEndY;
        if (!isFinite(tanVal) || Math.abs(cosVal) < 0.01) {
            // At 90° tan → ∞, draw segment all the way to top of viewport
            segEndY = minY;
        } else {
            const ty = -tanVal;
            segEndY = (ty >= minY && ty <= maxY) ? ty : (ty < minY ? minY : maxY);
        }

        // Remove any previous persistent tan segment
        const old = this.axesLayer.querySelector('[data-tan-seg]');
        if (old) old.remove();

        const tanSeg = document.createElementNS(NS, 'line');
        tanSeg.setAttribute('data-tan-seg', '1');
        tanSeg.setAttribute('x1', 1);
        tanSeg.setAttribute('y1', 0);
        tanSeg.setAttribute('x2', 1);
        tanSeg.setAttribute('y2', segEndY);
        tanSeg.setAttribute('stroke', '#f39c12');
        tanSeg.setAttribute('stroke-width', '5px');
        tanSeg.setAttribute('vector-effect', 'non-scaling-stroke');
        tanSeg.setAttribute('stroke-linecap', 'round');
        tanSeg.setAttribute('opacity', '0.85');
        this.axesLayer.appendChild(tanSeg);
    }

    drawTanProjection(deg) {
        if (!this.overlayLayer) return;

        const rad = deg * Math.PI / 180;
        const cosVal = Math.cos(rad);
        const tanVal = Math.tan(rad);
        const NS = 'http://www.w3.org/2000/svg';

        if (Math.abs(cosVal) < 0.01) return;

        const ty = -tanVal; // SVG y
        const needsExtension = cosVal < 0; // Q2/Q3: ray goes left, extension hits x=1

        // View bounds
        const minY = state.viewY;
        const maxY = state.viewY + state.viewHeight;
        const inView = ty >= minY && ty <= maxY;

        // Colored segment on tan axis: (1,0) → T (clamp to view edge)
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

        // Extension/ray line: always draw so the line of direction is always visible
        if (needsExtension) {
            // Extension: dashed line from origin through to T (real target, SVG clips automatically)
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
            // Dashed ray: origin → T on tan axis
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

        // T point and label only if within the visible area
        if (inView) {
            const tDot = document.createElementNS(NS, 'circle');
            tDot.setAttribute('cx', 1);
            tDot.setAttribute('cy', ty);
            tDot.setAttribute('r', 0.035);
            tDot.setAttribute('fill', '#f39c12');
            this.overlayLayer.appendChild(tDot);

            const tLabel = document.createElementNS(NS, 'text');
            tLabel.setAttribute('x', 1.1);
            tLabel.setAttribute('y', ty);
            tLabel.setAttribute('font-size', '0.055');
            tLabel.setAttribute('fill', '#f39c12');
            tLabel.setAttribute('font-weight', 'bold');
            tLabel.setAttribute('dominant-baseline', 'middle');
            tLabel.setAttribute('pointer-events', 'none');
            tLabel.textContent = 'T';
            this.overlayLayer.appendChild(tLabel);
        }
    }

    drawCotProjection(deg) {
        if (!this.overlayLayer) return;

        const rad = deg * Math.PI / 180;
        const sinVal = Math.sin(rad);
        const cotVal = Math.cos(rad) / Math.sin(rad);
        const NS = 'http://www.w3.org/2000/svg';

        if (Math.abs(sinVal) < 0.01) return;

        const cx = cotVal;
        const needsExtension = sinVal < 0; // Q3/Q4: ray goes down, extension hits y=1

        // View bounds
        const minX = state.viewX;
        const maxX = state.viewX + state.viewWidth;
        const inView = cx >= minX && cx <= maxX;

        // Colored segment on cot axis: (0,-1) → C (clamp to view edge)
        const segEndX = inView ? cx : (cx < minX ? minX : maxX);
        const cotSeg = document.createElementNS(NS, 'line');
        cotSeg.setAttribute('x1', 0);
        cotSeg.setAttribute('y1', -1);
        cotSeg.setAttribute('x2', segEndX);
        cotSeg.setAttribute('y2', -1);
        cotSeg.setAttribute('stroke', '#9b59b6');
        cotSeg.setAttribute('stroke-width', '5px');
        cotSeg.setAttribute('vector-effect', 'non-scaling-stroke');
        cotSeg.setAttribute('stroke-linecap', 'round');
        cotSeg.setAttribute('opacity', '0.85');
        this.overlayLayer.appendChild(cotSeg);

        // Extension/ray line: always draw so the line of direction is always visible
        if (needsExtension) {
            // Extension: dashed line from origin through to C (real target, SVG clips automatically)
            const extLine = document.createElementNS(NS, 'line');
            extLine.setAttribute('x1', 0);
            extLine.setAttribute('y1', 0);
            extLine.setAttribute('x2', cx);
            extLine.setAttribute('y2', -1);
            extLine.setAttribute('stroke', 'rgba(155, 89, 182, 0.5)');
            extLine.setAttribute('stroke-width', '1.5px');
            extLine.setAttribute('stroke-dasharray', '0.05 0.03');
            extLine.setAttribute('vector-effect', 'non-scaling-stroke');
            this.overlayLayer.appendChild(extLine);
        } else if (inView) {
            // Dashed ray: origin → C on cot axis
            const rayLine = document.createElementNS(NS, 'line');
            rayLine.setAttribute('x1', 0);
            rayLine.setAttribute('y1', 0);
            rayLine.setAttribute('x2', cx);
            rayLine.setAttribute('y2', -1);
            rayLine.setAttribute('stroke', 'rgba(155, 89, 182, 0.4)');
            rayLine.setAttribute('stroke-width', '1px');
            rayLine.setAttribute('stroke-dasharray', '0.03 0.02');
            rayLine.setAttribute('vector-effect', 'non-scaling-stroke');
            this.overlayLayer.appendChild(rayLine);
        }

        // C point and label only if within the visible area
        if (inView) {
            const cDot = document.createElementNS(NS, 'circle');
            cDot.setAttribute('cx', cx);
            cDot.setAttribute('cy', -1);
            cDot.setAttribute('r', 0.035);
            cDot.setAttribute('fill', '#9b59b6');
            this.overlayLayer.appendChild(cDot);

            const cLabel = document.createElementNS(NS, 'text');
            cLabel.setAttribute('x', cx);
            cLabel.setAttribute('y', -1.1);
            cLabel.setAttribute('font-size', '0.055');
            cLabel.setAttribute('fill', '#9b59b6');
            cLabel.setAttribute('font-weight', 'bold');
            cLabel.setAttribute('text-anchor', 'middle');
            cLabel.setAttribute('pointer-events', 'none');
            cLabel.textContent = 'C';
            this.overlayLayer.appendChild(cLabel);
        }
    }

    // ===================== PERSISTENT AXES =====================

    drawTanAxis() {
        if (!this.axesLayer) return;
        this.clearAxes();
        const NS = 'http://www.w3.org/2000/svg';
        this._appendTanAxisTo(this.axesLayer, NS);
        renderObjects();
    }

    drawCotAxis() {
        if (!this.axesLayer) return;
        this.clearAxes();
        const NS = 'http://www.w3.org/2000/svg';
        this._appendCotAxisTo(this.axesLayer, NS);
        renderObjects();
    }

    _appendTanAxisTo(layer, NS) {
        // tan ekseni: x = 1 dikey doğru
        const tanAxis = document.createElementNS(NS, 'line');
        tanAxis.setAttribute('x1', 1);
        tanAxis.setAttribute('y1', -2);
        tanAxis.setAttribute('x2', 1);
        tanAxis.setAttribute('y2', 2);
        tanAxis.setAttribute('stroke', '#f39c12');
        tanAxis.setAttribute('stroke-width', '2px');
        tanAxis.setAttribute('vector-effect', 'non-scaling-stroke');
        layer.appendChild(tanAxis);

        // Etiket
        const label = document.createElementNS(NS, 'text');
        label.setAttribute('x', 1.06);
        label.setAttribute('y', -1.85);
        label.setAttribute('font-size', '0.06');
        label.setAttribute('fill', '#f39c12');
        label.setAttribute('font-weight', 'bold');
        label.setAttribute('pointer-events', 'none');
        label.textContent = 'tan ekseni (x=1)';
        layer.appendChild(label);
    }

    _appendCotAxisTo(layer, NS) {
        // cot ekseni: y = 1 → SVG y = -1 yatay doğru
        const cotAxis = document.createElementNS(NS, 'line');
        cotAxis.setAttribute('x1', -2);
        cotAxis.setAttribute('y1', -1);
        cotAxis.setAttribute('x2', 2);
        cotAxis.setAttribute('y2', -1);
        cotAxis.setAttribute('stroke', '#9b59b6');
        cotAxis.setAttribute('stroke-width', '2px');
        cotAxis.setAttribute('vector-effect', 'non-scaling-stroke');
        layer.appendChild(cotAxis);

        // Etiket
        const label = document.createElementNS(NS, 'text');
        label.setAttribute('x', -1.9);
        label.setAttribute('y', -1.06);
        label.setAttribute('font-size', '0.06');
        label.setAttribute('fill', '#9b59b6');
        label.setAttribute('font-weight', 'bold');
        label.setAttribute('pointer-events', 'none');
        label.textContent = 'cot ekseni (y=1)';
        layer.appendChild(label);
    }

    // ===================== SVG HELPERS =====================
    makeArc(cx, cy, r, startDeg, endDeg) {
        const startRad = startDeg * Math.PI / 180;
        const endRad = endDeg * Math.PI / 180;
        const x1 = cx + r * Math.cos(startRad);
        const y1 = cy - r * Math.sin(startRad);
        const x2 = cx + r * Math.cos(endRad);
        const y2 = cy - r * Math.sin(endRad);
        const largeArc = (endDeg - startDeg) > 180 ? 1 : 0;
        return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 0 ${x2} ${y2}`;
    }

    // ===================== RENDERING =====================
    renderStep() {
        const step = this.steps[this.currentStepIndex];

        // Progress bar
        const progress = ((this.currentStepIndex) / (this.steps.length - 1)) * 100;
        this.progressBar.style.width = `${progress}%`;

        // Instruction
        this.instructionEl.innerHTML = step.text;

        // Clear feedback / question / buttons
        this.feedbackEl.style.display = 'none';
        this.feedbackEl.className = 'tutorial-feedback';
        this.questionArea.innerHTML = '';
        this.nextBtn.classList.remove('pulse-anim');
        this.hideReplayBtn();
        this.hideWrongAnswerBtns();
        this.currentAnimFn = null;

        if (step.type === 'question') {
            this.nextBtn.style.display = 'none';
            this.renderQuestion(step);
        } else if (step.type === 'info') {
            this.nextBtn.style.display = 'block';
            this.nextBtn.disabled = false;
            this.nextBtn.textContent = step.isFinal ? 'Tamamla' : 'Devam Et';
        } else if (step.type === 'anim') {
            this.nextBtn.style.display = 'none';
            this.nextBtn.disabled = true;
            this.nextBtn.textContent = 'Sonraki Adım';
            // Store animFn for replay
            this.currentAnimFn = step.animFn;
        }

        // onEnter (for info steps)
        if (step.onEnter) {
            step.onEnter();
        }
        // animFn for anim steps
        if (step.type === 'anim' && step.animFn) {
            step.animFn();
        }
    }

    renderQuestion(step) {
        const btnGroup = document.createElement('div');
        btnGroup.className = 'tutorial-btn-group';

        // Shuffle options so correct answer isn't always first
        const shuffled = [...step.options];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        shuffled.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'tutorial-opt-btn';
            btn.textContent = opt.text;
            btn.onclick = () => this.checkAnswer(opt, btn);
            btnGroup.appendChild(btn);
        });

        this.questionArea.appendChild(btnGroup);
    }

    checkAnswer(option, btnElement) {
        const step = this.steps[this.currentStepIndex];

        const allBtns = this.questionArea.querySelectorAll('button');
        allBtns.forEach(b => b.disabled = true);

        if (option.correct) {
            btnElement.style.borderColor = 'var(--success-color)';
            btnElement.style.backgroundColor = '#d4edda';
            this.showFeedback(step.correctFeedback, 'success');
            this.nextBtn.style.display = 'block';
            this.nextBtn.disabled = false;
            this.nextBtn.textContent = 'Devam Et';
            this.nextBtn.classList.add('pulse-anim');
        } else {
            btnElement.style.borderColor = 'var(--danger-color)';
            btnElement.style.backgroundColor = '#f8d7da';
            this.showFeedback(step.wrongFeedback, 'error');
            // Show retry + replay-animation buttons; keep question buttons disabled
            this.showWrongAnswerBtns();
        }
    }

    showWrongAnswerBtns() {
        if (!this.retryBtn.parentNode || this.retryBtn.parentNode !== this.btnRow) {
            this.btnRow.appendChild(this.retryBtn);
        }
        if (!this.replayAnimBtn.parentNode || this.replayAnimBtn.parentNode !== this.btnRow) {
            this.btnRow.appendChild(this.replayAnimBtn);
        }
        this.retryBtn.style.display = 'block';
        this.replayAnimBtn.style.display = 'block';
    }

    hideWrongAnswerBtns() {
        this.retryBtn.style.display = 'none';
        this.replayAnimBtn.style.display = 'none';
        if (this.retryBtn.parentNode) this.retryBtn.parentNode.removeChild(this.retryBtn);
        if (this.replayAnimBtn.parentNode) this.replayAnimBtn.parentNode.removeChild(this.replayAnimBtn);
    }

    retryQuestion() {
        this.hideWrongAnswerBtns();
        this.feedbackEl.style.display = 'none';
        // Re-enable all option buttons and reset their styles
        const allBtns = this.questionArea.querySelectorAll('button');
        allBtns.forEach(b => {
            b.disabled = false;
            b.style.borderColor = '';
            b.style.backgroundColor = '';
        });
    }

    replayAnimForQuestion() {
        this.hideWrongAnswerBtns();
        this.feedbackEl.style.display = 'none';
        // Find the nearest anim step before current question
        let animFn = null;
        for (let i = this.currentStepIndex - 1; i >= 0; i--) {
            if (this.steps[i].type === 'anim' && this.steps[i].animFn) {
                animFn = this.steps[i].animFn;
                break;
            }
        }
        if (animFn) {
            // Set flag so showAnimButtons() restores wrong-answer UI when done
            this.isWrongAnswerReplay = true;
            animFn();
        }
    }

    showFeedback(msg, type) {
        this.feedbackEl.textContent = msg;
        this.feedbackEl.className = `tutorial-feedback ${type}`;
        this.feedbackEl.style.display = 'block';
    }

    nextStep() {
        this.stopAnimation();
        this.nextBtn.classList.remove('pulse-anim');
        this.hideReplayBtn();

        if (this.currentStepIndex < this.steps.length - 1) {
            this.currentStepIndex++;
            this.renderStep();
        } else {
            if (typeof showSection === 'function') {
                showSection(3);
            }
        }
    }
}
