const canvas = document.getElementById('sim-canvas');
const ctx = canvas.getContext('2d');

let width, height;
let pixelRatio = window.devicePixelRatio || 1;

function resize() {
    width = canvas.parentElement.clientWidth;
    height = canvas.parentElement.clientHeight;
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
}
window.addEventListener('resize', resize);
resize();

// UI Elements
const btnCompleteDna = document.getElementById('btn-complete-dna');
const btnTranscribeTop = document.getElementById('btn-transcribe-top');
const btnTranscribeBottom = document.getElementById('btn-transcribe-bottom');
const btnTranslate = document.getElementById('btn-translate');
const panelDna = document.getElementById('panel-dna');
const panelTranscription = document.getElementById('panel-transcription');
const panelTranslation = document.getElementById('panel-translation');
const btnPlayPause = document.getElementById('btn-play-pause');
const btnReset = document.getElementById('btn-reset');
const toast = document.getElementById('status-toast');
const btnThemeDark = document.getElementById('btn-theme-dark');
const btnThemeLight = document.getElementById('btn-theme-light');
const btnMenuCollapse = document.getElementById('btn-menu-collapse');
const btnMenuExpand = document.getElementById('btn-menu-expand');
const leftMenu = document.getElementById('left-menu');
const app = document.getElementById('app');

function showToast(msg) {
    toast.innerText = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

// State
let state = {
    mode: 'basic', // 'basic' or 'advanced'
    phase: 'dna', // dna, dna-complete, transcription, transcription-complete, translation, translation-complete
    dna1: [], // Upper strand (Coding)
    dna2: [], // Lower strand (Template)
    mrna: [], // Messenger RNA
    protein: [], // Amino acids
    camera: { x: 200, y: height / 2, zoom: 0.8 },
    targetCamera: { x: 200, y: height / 2, zoom: 0.8 },
    animProgress: 0,
    isPaused: false,
    templateStrand: 'bottom' // 'top' or 'bottom'
};

// Data & Colors
const COMPLEMENT = { A: 'T', T: 'A', G: 'C', C: 'G' };
const RNA_COMPLEMENT = { A: 'U', T: 'A', G: 'C', C: 'G' }; // Template DNA to mRNA

const COLORS = {
    A: { top: '#FF6B81', bottom: '#FF4757', glow: 'rgba(255, 71, 87, 0.5)' },
    T: { top: '#70A1FF', bottom: '#1E90FF', glow: 'rgba(30, 144, 255, 0.5)' },
    G: { top: '#7BED9F', bottom: '#2ED573', glow: 'rgba(46, 213, 115, 0.5)' },
    C: { top: '#ECCC68', bottom: '#FFA502', glow: 'rgba(255, 165, 2, 0.5)' },
    U: { top: '#D980FA', bottom: '#9C88FF', glow: 'rgba(156, 136, 255, 0.5)' }
};

// Complete Codon Table
function getAminoAcid(codon) {
    const table = {
        'UUU': ['Phe', '페닐알라닌'], 'UUC': ['Phe', '페닐알라닌'], 'UUA': ['Leu', '류신'], 'UUG': ['Leu', '류신'],
        'CUU': ['Leu', '류신'], 'CUC': ['Leu', '류신'], 'CUA': ['Leu', '류신'], 'CUG': ['Leu', '류신'],
        'AUU': ['Ile', '이소류신'], 'AUC': ['Ile', '이소류신'], 'AUA': ['Ile', '이소류신'], 'AUG': ['Met', '메티오닌'],
        'GUU': ['Val', '발린'], 'GUC': ['Val', '발린'], 'GUA': ['Val', '발린'], 'GUG': ['Val', '발린'],
        'UCU': ['Ser', '세린'], 'UCC': ['Ser', '세린'], 'UCA': ['Ser', '세린'], 'UCG': ['Ser', '세린'],
        'CCU': ['Pro', '프롤린'], 'CCC': ['Pro', '프롤린'], 'CCA': ['Pro', '프롤린'], 'CCG': ['Pro', '프롤린'],
        'ACU': ['Thr', '트레오닌'], 'ACC': ['Thr', '트레오닌'], 'ACA': ['Thr', '트레오닌'], 'ACG': ['Thr', '트레오닌'],
        'GCU': ['Ala', '알라닌'], 'GCC': ['Ala', '알라닌'], 'GCA': ['Ala', '알라닌'], 'GCG': ['Ala', '알라닌'],
        'UAU': ['Tyr', '티로신'], 'UAC': ['Tyr', '티로신'], 'UAA': ['STOP', '종결'], 'UAG': ['STOP', '종결'],
        'CAU': ['His', '히스티딘'], 'CAC': ['His', '히스티딘'], 'CAA': ['Gln', '글루타민'], 'CAG': ['Gln', '글루타민'],
        'AAU': ['Asn', '아스파라긴'], 'AAC': ['Asn', '아스파라긴'], 'AAA': ['Lys', '라이신'], 'AAG': ['Lys', '라이신'],
        'GAU': ['Asp', '아스파르트산'], 'GAC': ['Asp', '아스파르트산'], 'GAA': ['Glu', '글루탐산'], 'GAG': ['Glu', '글루탐산'],
        'UGU': ['Cys', '시스테인'], 'UGC': ['Cys', '시스테인'], 'UGA': ['STOP', '종결'], 'UGG': ['Trp', '트립토판'],
        'CGU': ['Arg', '아르기닌'], 'CGC': ['Arg', '아르기닌'], 'CGA': ['Arg', '아르기닌'], 'CGG': ['Arg', '아르기닌'],
        'AGU': ['Ser', '세린'], 'AGC': ['Ser', '세린'], 'AGA': ['Arg', '아르기닌'], 'AGG': ['Arg', '아르기닌'],
        'GGU': ['Gly', '글리신'], 'GGC': ['Gly', '글리신'], 'GGA': ['Gly', '글리신'], 'GGG': ['Gly', '글리신']
    };
    
    const aa = table[codon];
    if(!aa) return { name: 'Unknown', color: '#999' };
    
    if (aa[0] === 'STOP') return { name: 'STOP\n(종결)', color: '#ee5253' };
    if (aa[0] === 'Met') return { name: 'Met\n(메티오닌)', color: '#10ac84' };
    
    const hash = aa[0].charCodeAt(0) + aa[0].charCodeAt(1);
    const hue = (hash * 137.5) % 360;
    return { name: `${aa[0]}\n(${aa[1]})`, color: `hsl(${hue}, 70%, 55%)` };
}

// Input Handling (Pan & Zoom)
let isDragging = false;
let lastP = { x: 0, y: 0 };
let pinchStartDist = 0;
let pointers = [];

canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    pointers.push(e);
    if(pointers.length === 1) {
        isDragging = true;
        lastP = { x: e.clientX, y: e.clientY };
    } else if(pointers.length === 2) {
        isDragging = false;
        pinchStartDist = Math.hypot(pointers[0].clientX - pointers[1].clientX, pointers[0].clientY - pointers[1].clientY);
    }
});

canvas.addEventListener('pointermove', e => {
    e.preventDefault();
    const idx = pointers.findIndex(p => p.pointerId === e.pointerId);
    if(idx !== -1) pointers[idx] = e;

    if(isDragging && pointers.length === 1) {
        state.targetCamera.x -= (e.clientX - lastP.x) / state.camera.zoom;
        state.targetCamera.y -= (e.clientY - lastP.y) / state.camera.zoom;
        lastP = { x: e.clientX, y: e.clientY };
    } else if(pointers.length === 2) {
        const dist = Math.hypot(pointers[0].clientX - pointers[1].clientX, pointers[0].clientY - pointers[1].clientY);
        const delta = dist - pinchStartDist;
        state.targetCamera.zoom *= (1 + delta * 0.005);
        pinchStartDist = dist;
    }
});

function removePointer(e) {
    pointers = pointers.filter(p => p.pointerId !== e.pointerId);
    if(pointers.length === 0) isDragging = false;
}
canvas.addEventListener('pointerup', removePointer);
canvas.addEventListener('pointercancel', removePointer);
canvas.addEventListener('pointerout', removePointer);

canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    state.targetCamera.zoom *= zoomFactor;
    // Clamp zoom
    state.targetCamera.zoom = Math.max(0.2, Math.min(state.targetCamera.zoom, 3));
}, { passive: false });

document.getElementById('btn-zoom-in').onclick = () => state.targetCamera.zoom *= 1.2;
document.getElementById('btn-zoom-out').onclick = () => state.targetCamera.zoom *= 0.8;
document.getElementById('btn-zoom-reset').onclick = () => {
    state.targetCamera.zoom = 0.8;
    state.targetCamera.y = height / 2;
};

// UI Interactions
document.querySelectorAll('.base-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if(state.phase !== 'dna') return;
        const base = btn.getAttribute('data-base');
        state.dna1.push(base);
        state.dna2.push(COMPLEMENT[base]);
        
        // Auto pan
        const targetX = (state.dna1.length * 100) - width/2 / state.camera.zoom + 200;
        if(targetX > state.targetCamera.x) {
            state.targetCamera.x = targetX;
        }
    });
});

document.getElementById('btn-mode-basic').addEventListener('click', () => {
    state.mode = 'basic';
    document.getElementById('btn-mode-basic').classList.remove('outline');
    document.getElementById('btn-mode-adv').classList.add('outline');
    document.getElementById('btn-reset').click();
});
document.getElementById('btn-mode-adv').addEventListener('click', () => {
    state.mode = 'advanced';
    document.getElementById('btn-mode-adv').classList.remove('outline');
    document.getElementById('btn-mode-basic').classList.add('outline');
    document.getElementById('btn-reset').click();
});

document.getElementById('btn-undo-dna').addEventListener('click', () => {
    if(state.phase !== 'dna' || state.dna1.length === 0) return;
    state.dna1.pop();
    state.dna2.pop();
    const targetX = (state.dna1.length * 100) - width/2 / state.camera.zoom + 200;
    state.targetCamera.x = targetX < 200 ? 200 : targetX;
});

btnCompleteDna.addEventListener('click', () => {
    if(state.dna1.length < 9) {
        showToast("원활한 시뮬레이션을 위해 최소 9개 이상의 염기를 추가해주세요.");
    }
    state.phase = 'dna-complete';
    panelDna.classList.add('disabled');
    panelTranscription.classList.remove('disabled');
    
    // Auto-center DNA strand
    const spacing = 100;
    const strandCenter = ((state.dna1.length - 1) * spacing) / 2;
    state.targetCamera.x = strandCenter;
    const strandWidth = state.dna1.length * spacing + 200;
    state.targetCamera.zoom = Math.min(0.8, (width - 100) / strandWidth);
    
    showToast("DNA 합성 완료! 전사 단계를 시작할 수 있습니다.");
});

btnTranscribeTop.addEventListener('click', () => startTranscription('top'));
btnTranscribeBottom.addEventListener('click', () => startTranscription('bottom'));

document.getElementById('btn-reset-transcription').addEventListener('click', () => {
    if(state.phase === 'dna' || state.phase === 'dna-complete') return;
    state.phase = 'dna-complete';
    state.mrna = [];
    state.protein = [];
    state.animProgress = 0;
    state.targetCamera.x = 200;
    state.targetCamera.y = height / 2;
    state.isPaused = false;
    btnPlayPause.innerText = "일시정지";
    panelTranslation.classList.add('disabled');
    showToast("전사 단계가 초기화되었습니다. 주형 가닥을 다시 선택해주세요.");
});

function startTranscription(strand) {
    if(state.phase !== 'dna-complete') return;
    state.phase = 'transcription';
    state.templateStrand = strand;
    state.animProgress = 0;
    
    // Auto-center DNA strand
    const spacing = 100;
    const strandCenter = ((state.dna1.length - 1) * spacing) / 2;
    state.targetCamera.x = strandCenter;
    const strandWidth = state.dna1.length * spacing + 200;
    state.targetCamera.zoom = Math.min(0.8, (width - 100) / strandWidth);
    
    showToast(`전사 시작: ${strand === 'top' ? '위쪽' : '아래쪽'} 가닥을 주형으로 mRNA를 합성합니다.`);
}

btnTranslate.addEventListener('click', () => {
    if(state.phase !== 'transcription-complete') return;
    state.phase = 'translation';
    state.animProgress = 0;
    
    // Auto-center DNA/RNA strand horizontally
    const spacing = 100;
    const strandCenter = ((state.dna1.length - 1) * spacing) / 2;
    state.targetCamera.x = strandCenter;
    
    // Center vertically to fit DNA (0), RNA (350), and Protein (610)
    state.targetCamera.y = 300;
    
    // Adjust zoom to fit both horizontally and vertically
    const strandWidth = state.dna1.length * spacing + 200;
    const horizontalZoom = (width - 100) / strandWidth;
    const verticalZoom = (height - 100) / 900;
    state.targetCamera.zoom = Math.min(0.8, horizontalZoom, verticalZoom);
    
    showToast("번역 시작: 리보솜이 코돈을 읽어 단백질을 합성합니다.");
});

btnPlayPause.addEventListener('click', () => {
    state.isPaused = !state.isPaused;
    btnPlayPause.innerText = state.isPaused ? "재생" : "일시정지";
});

btnReset.addEventListener('click', () => {
    const prevMode = state.mode;
    state = {
        mode: prevMode,
        phase: 'dna', dna1: [], dna2: [], mrna: [], protein: [],
        camera: { x: 200, y: height / 2, zoom: 0.8 },
        targetCamera: { x: 200, y: height / 2, zoom: 0.8 },
        animProgress: 0, isPaused: false, templateStrand: 'bottom'
    };
    panelDna.classList.remove('disabled');
    panelTranscription.classList.add('disabled');
    panelTranslation.classList.add('disabled');
    btnPlayPause.innerText = "일시정지";
    showToast("시뮬레이션이 초기화되었습니다.");
});

document.getElementById('btn-codon').onclick = () => {
    document.getElementById('codon-modal').classList.toggle('hidden');
};
document.getElementById('btn-close-codon').onclick = () => {
    document.getElementById('codon-modal').classList.add('hidden');
};

// Theme Toggle Logic
btnThemeDark.addEventListener('click', () => {
    document.body.classList.remove('light-mode');
    btnThemeDark.classList.add('active');
    btnThemeLight.classList.remove('active');
    localStorage.setItem('theme', 'dark');
});

btnThemeLight.addEventListener('click', () => {
    document.body.classList.add('light-mode');
    btnThemeLight.classList.add('active');
    btnThemeDark.classList.remove('active');
    localStorage.setItem('theme', 'light');
});

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'dark';
if (savedTheme === 'light') {
    btnThemeLight.classList.add('active');
    btnThemeDark.classList.remove('active');
    document.body.classList.add('light-mode');
} else {
    btnThemeDark.classList.add('active');
    btnThemeLight.classList.remove('active');
    document.body.classList.remove('light-mode');
}

// Sidebar Collapse Logic
btnMenuCollapse.addEventListener('click', () => {
    leftMenu.classList.add('collapsed');
    app.classList.add('menu-collapsed');
    btnMenuExpand.classList.remove('hidden');
});

btnMenuExpand.addEventListener('click', () => {
    leftMenu.classList.remove('collapsed');
    app.classList.remove('menu-collapsed');
    btnMenuExpand.classList.add('hidden');
});

// Resize canvas when sidebar transitions end
leftMenu.addEventListener('transitionend', () => {
    resize();
});

// Helper to draw rounded rects
function roundRect(x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function drawBase(x, y, base, isTop, isRNA = false) {
    const w = 70, h = 50;
    const isLight = document.body.classList.contains('light-mode');
    
    // Choose dynamic high-contrast base colors for canvas drawing
    const c = isLight ? {
        A: { top: '#ff4d6d', bottom: '#c9184a', glow: 'rgba(201, 24, 74, 0.15)' },
        T: { top: '#3a86ff', bottom: '#0056b3', glow: 'rgba(0, 86, 179, 0.15)' },
        G: { top: '#2ecc71', bottom: '#27ae60', glow: 'rgba(39, 174, 96, 0.15)' },
        C: { top: '#f39c12', bottom: '#d35400', glow: 'rgba(211, 84, 0, 0.15)' },
        U: { top: '#a29bfe', bottom: '#6c5ce7', glow: 'rgba(108, 92, 231, 0.15)' }
    }[base] : COLORS[base];
    
    // Glow
    ctx.shadowColor = c.glow;
    ctx.shadowBlur = isLight ? 5 : 15;
    
    // Body
    const grad = ctx.createLinearGradient(x, y - h/2, x, y + h/2);
    grad.addColorStop(0, c.top);
    grad.addColorStop(1, c.bottom);
    ctx.fillStyle = grad;
    
    ctx.beginPath();
    if(isTop) {
        ctx.roundRect(x - w/2, y - h/2, w, h, [10, 10, 2, 2]);
    } else {
        ctx.roundRect(x - w/2, y - h/2, w, h, [2, 2, 10, 10]);
    }
    ctx.fill();
    ctx.shadowBlur = 0; // reset
    
    // Text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 26px Outfit, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(base, x, y);
    
    // Backbone Line
    ctx.strokeStyle = isRNA ? '#D980FA' : (isLight ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.3)');
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    const bY = isTop ? y - h/2 - 15 : y + h/2 + 15;
    ctx.beginPath();
    ctx.moveTo(x - w/2 - 15, bY);
    ctx.lineTo(x + w/2 + 15, bY);
    ctx.stroke();

    // RNA specific marker
    if(isRNA) {
        ctx.fillStyle = '#D980FA';
        ctx.beginPath();
        ctx.arc(x, isTop ? bY - 10 : bY + 10, 4, 0, Math.PI*2);
        ctx.fill();
    }
}

// Main Loop
let lastTime = performance.now();
function loop(time) {
    requestAnimationFrame(loop);
    const dt = Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;

    // Smooth camera
    state.camera.x += (state.targetCamera.x - state.camera.x) * 10 * dt;
    state.camera.y += (state.targetCamera.y - state.camera.y) * 10 * dt;
    state.camera.zoom += (state.targetCamera.zoom - state.camera.zoom) * 10 * dt;

    if(!state.isPaused) update(dt);
    render();
}

function update(dt) {
    const speed = 2.5; // items per second

    if(state.phase === 'transcription') {
        state.animProgress += dt * speed;
        
        let px = (state.animProgress * 100) + 100;
        if (state.mode === 'advanced' && state.templateStrand === 'top') {
            px = (state.dna1.length - state.animProgress) * 100 + 100;
        }
        // Camera remains stationary in the center of the DNA strand

        if(Math.floor(state.animProgress) > state.dna2.length + 1) {
            state.phase = 'transcription-complete';
            // Do not disable the transcription panel so the user can click the reset button
            panelTranslation.classList.remove('disabled');
            showToast("전사 완료! 번역 단계를 시작할 수 있습니다.");
        } else {
            const currentIdx = Math.floor(state.animProgress);
            if(currentIdx > 0 && currentIdx <= state.dna1.length && state.mrna.length < currentIdx) {
                if (state.mode === 'advanced' && state.templateStrand === 'top') {
                    const rightToLeftIdx = state.dna1.length - currentIdx;
                    state.mrna.push(RNA_COMPLEMENT[state.dna1[rightToLeftIdx]]);
                } else {
                    const templateArr = state.templateStrand === 'top' ? state.dna1 : state.dna2;
                    state.mrna.push(RNA_COMPLEMENT[templateArr[currentIdx-1]]);
                }
            }
        }
    } else if(state.phase === 'translation') {
        state.animProgress += dt * (speed * 0.8);
        
        const currentCodonIdx = Math.floor(state.animProgress / 3);
        
        let rx = state.animProgress * 100;
        if (state.mode === 'advanced' && state.templateStrand === 'top') {
            rx = (state.dna1.length - 1 - state.animProgress) * 100;
        }
        // Camera remains stationary in the center of the DNA/RNA strand

        if(currentCodonIdx * 3 >= state.mrna.length + 3) { // Let it run off
            state.phase = 'translation-complete';
            showToast("번역 완료! 단백질 합성이 끝났습니다.");
        } else {
            if(currentCodonIdx > 0 && currentCodonIdx * 3 <= state.mrna.length + 2 && state.protein.length < currentCodonIdx) {
                const codon = state.mrna.slice((currentCodonIdx-1)*3, currentCodonIdx*3).join('');
                if(codon.length === 3) {
                    const aa = getAminoAcid(codon);
                    if (aa.name.includes('STOP')) {
                        state.phase = 'translation-complete';
                        showToast("종결 코돈 도달: 단백질 합성이 종료되었습니다.");
                    } else {
                        state.protein.push(aa);
                    }
                }
            }
        }
    }
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    
    // Apply transforms
    ctx.scale(pixelRatio, pixelRatio);
    ctx.translate(width/2, height/2);
    ctx.scale(state.camera.zoom, state.camera.zoom);
    ctx.translate(-state.camera.x, -state.camera.y);

    const spacing = 100;
    const dnaY = 0;
    
    // Draw H-Bonds background
    const isLight = document.body.classList.contains('light-mode');
    for(let i=0; i<state.dna1.length; i++) {
        const x = i * spacing;
        ctx.strokeStyle = isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 4;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(x, dnaY - 40);
        ctx.lineTo(x, dnaY + 40);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // 1. Draw DNA
    for(let i=0; i<state.dna1.length; i++) {
        const x = i * spacing;
        let yOff = 0;

        // Transcription separation logic
        if(state.phase === 'transcription') {
            const virtualI = (state.mode === 'advanced' && state.templateStrand === 'top') ? (state.dna1.length - 1 - i) : i;
            const dist = virtualI - state.animProgress;
            // Bubble around polymerase
            if(dist > -4 && dist < 1) {
                const bubble = Math.sin((dist + 4) / 5 * Math.PI);
                yOff = bubble * -45; 
            }
        }

        // Coding strand (top)
        drawBase(x, dnaY - 50 + yOff, state.dna1[i], true);
        
        // Template strand (bottom)
        // Remains mostly flat, mRNA binds to it
        drawBase(x, dnaY + 50 - yOff, state.dna2[i], false);
    }

    // 2. RNA Polymerase
    if(state.phase === 'transcription') {
        let px = state.animProgress * spacing - spacing/2;
        let isReversed = false;
        if (state.mode === 'advanced' && state.templateStrand === 'top') {
            px = (state.dna1.length - state.animProgress) * spacing - spacing/2;
            isReversed = true;
        }
        ctx.save();
        if (isReversed) {
            ctx.translate(px, 0);
            ctx.scale(-1, 1);
            ctx.translate(-px, 0);
        }
        ctx.fillStyle = isLight ? 'rgba(217, 119, 6, 0.08)' : 'rgba(245, 158, 11, 0.15)'; // Orange tint
        ctx.strokeStyle = isLight ? 'rgba(217, 119, 6, 0.8)' : 'rgba(245, 158, 11, 0.6)';
        ctx.lineWidth = 4;
        ctx.shadowColor = isLight ? 'rgba(217, 119, 6, 0.15)' : 'rgba(245, 158, 11, 0.3)';
        ctx.shadowBlur = 30;
        
        ctx.beginPath();
        ctx.moveTo(px - 180, dnaY - 40);
        ctx.bezierCurveTo(px - 150, dnaY - 180, px + 150, dnaY - 180, px + 180, dnaY - 40);
        ctx.bezierCurveTo(px + 220, dnaY + 50, px + 150, dnaY + 180, px + 30, dnaY + 160);
        ctx.bezierCurveTo(px - 100, dnaY + 200, px - 220, dnaY + 100, px - 180, dnaY - 40);
        ctx.fill();
        ctx.stroke();
        ctx.restore(); // Remove horizontal flip for text
        
        ctx.save();
        ctx.fillStyle = isLight ? '#D97706' : '#FBBF24';
        ctx.shadowBlur = 0;
        ctx.font = 'bold 26px Noto Sans KR';
        ctx.textAlign = 'center';
        ctx.fillText('RNA 중합효소', px, dnaY - 140);
        ctx.restore();
    }

    // 3. Draw mRNA
    let mrnaBaseY = dnaY + 200; 
    if(state.phase === 'translation' || state.phase === 'translation-complete') {
        mrnaBaseY = dnaY + 350; // Move mRNA completely down for translation
    }

    for(let i=0; i<state.mrna.length; i++) {
        let visualIndex = i;
        if (state.mode === 'advanced' && state.templateStrand === 'top') {
            visualIndex = state.dna1.length - 1 - i;
        }
        const x = visualIndex * spacing;
        let y = mrnaBaseY;

        if(state.phase === 'transcription') {
            const age = state.animProgress - i;
            // Synthesizing at the template strand then dropping down
            if(age < 2) {
                const drop = Math.max(0, age - 1);
                const templateY = state.templateStrand === 'top' ? (dnaY - 50) : (dnaY + 50);
                y = templateY + drop * (mrnaBaseY - templateY);
            }
        }
        
        drawBase(x, y, state.mrna[i], true, true); // RNA
    }

    // Draw Codon Grouping (Dashed Box)
    if(state.phase === 'translation' || state.phase === 'translation-complete') {
        ctx.save();
        ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 8]);
        
        for(let i=0; i<state.mrna.length; i+=3) {
            if(i + 2 < state.mrna.length) {
                let startX = i * spacing - 45;
                if (state.mode === 'advanced' && state.templateStrand === 'top') {
                    const leftmostVisualIdx = state.dna1.length - 1 - (i + 2);
                    startX = leftmostVisualIdx * spacing - 45;
                }
                const boxWidth = spacing * 2 + 90;
                ctx.beginPath();
                ctx.roundRect(startX, mrnaBaseY - 50, boxWidth, 100, 16);
                ctx.stroke();
                
                // Label "코돈"
                ctx.fillStyle = isLight ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.5)';
                ctx.font = 'bold 16px Noto Sans KR';
                ctx.textAlign = 'center';
                ctx.fillText('코돈', startX + boxWidth/2, mrnaBaseY - 65);
            }
        }
        ctx.restore();
    }

    // 4. Translation & Ribosome
    if(state.phase === 'translation' || state.phase === 'translation-complete') {
        let rx = state.animProgress * spacing;
        if (state.mode === 'advanced' && state.templateStrand === 'top') {
            rx = (state.dna1.length - 1 - state.animProgress) * spacing;
        }
        const transY = mrnaBaseY; // Base Y for translation elements
        
        // Ribosome Drawing
        if(state.phase === 'translation') {
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 20;

            // Large Subunit (Top)
            const gradL = ctx.createRadialGradient(rx - 100, transY - 80, 20, rx - 50, transY - 60, 250);
            gradL.addColorStop(0, isLight ? '#57606f' : '#4b6584');
            gradL.addColorStop(1, isLight ? '#2f3542' : '#2d3436');
            ctx.fillStyle = gradL;
            ctx.beginPath();
            ctx.ellipse(rx - spacing, transY - 70, 220, 110, 0, 0, Math.PI * 2);
            ctx.fill();

            // Small Subunit (Bottom)
            const gradS = ctx.createRadialGradient(rx - 100, transY + 60, 10, rx - 50, transY + 60, 180);
            gradS.addColorStop(0, isLight ? '#a4b0be' : '#a5b1c2');
            gradS.addColorStop(1, isLight ? '#747d8c' : '#4b6584');
            ctx.fillStyle = gradS;
            ctx.beginPath();
            ctx.ellipse(rx - spacing, transY + 60, 160, 60, 0, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = isLight ? '#2f3542' : '#fff';
            ctx.font = 'bold 24px Noto Sans KR';
            ctx.fillText('리보솜 대단위체', rx - spacing, transY - 110);
            ctx.fillText('리보솜 소단위체', rx - spacing, transY + 140);
            ctx.restore();
        }

        // Protein Chain
        const pStartY = transY + 260; // Below RNA, adjusted for larger radius

        // 1. Draw all bonds first to avoid overlapping text
        for(let i=1; i<state.protein.length; i++) {
            let visualIdx = i * 3 + 1;
            let prevVisualIdx = (i-1) * 3 + 1;
            if (state.mode === 'advanced' && state.templateStrand === 'top') {
                visualIdx = state.dna1.length - 1 - visualIdx;
                prevVisualIdx = state.dna1.length - 1 - prevVisualIdx;
            }
            const px = visualIdx * spacing;
            const prevX = prevVisualIdx * spacing;
            ctx.strokeStyle = isLight ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.7)';
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.moveTo(prevX, pStartY);
            ctx.lineTo(px, pStartY);
            ctx.stroke();
        }

        // 2. Draw all amino acid circles and text on top
        for(let i=0; i<state.protein.length; i++) {
            const aa = state.protein[i];
            let visualIdx = i * 3 + 1;
            if (state.mode === 'advanced' && state.templateStrand === 'top') {
                visualIdx = state.dna1.length - 1 - visualIdx;
            }
            const px = visualIdx * spacing;

            // Amino Acid circle
            ctx.save();
            ctx.shadowColor = aa.color;
            ctx.shadowBlur = 20;
            ctx.fillStyle = aa.color;
            ctx.beginPath();
            ctx.arc(px, pStartY, 80, 0, Math.PI*2); // Doubled size
            ctx.fill();
            
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 4;
            ctx.stroke();
            ctx.shadowBlur = 0;

            const lines = aa.name.split('\n');
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 24px Outfit, Noto Sans KR';
            ctx.fillText(lines[0], px, pStartY - 10);
            if(lines.length > 1) {
                ctx.font = 'bold 18px Noto Sans KR';
                ctx.fillText(lines[1], px, pStartY + 18);
            }
            ctx.restore();

            // tRNA for the current codon being read
            if(state.phase === 'translation' && i === state.protein.length - 1) {
                ctx.save();
                ctx.strokeStyle = isLight ? '#0c8569' : '#10ac84';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(px, pStartY - 80); // Bottom of amino acid is aligned
                ctx.lineTo(px, transY + 30);  // Bottom of RNA
                ctx.stroke();

                ctx.fillStyle = isLight ? '#10ac84' : '#1dd1a1';
                roundRect(px - 30, transY + 60, 60, 60, 10);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 16px Outfit';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('tRNA', px, transY + 90);
                ctx.restore();
            }
        }
    }

    ctx.restore();

    // Draw Fixed UI Labels
    ctx.save();
    ctx.scale(pixelRatio, pixelRatio);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = 'bold 22px Outfit, Noto Sans KR';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    // 5' and 3' direction labels in advanced mode
    if (state.mode === 'advanced' && state.dna1.length > 0) {
        const leftX = (state.camera.zoom * (-state.camera.x - 40)) + width/2;
        const rightWorldX = state.dna1.length * spacing - spacing + 40;
        const rightX = (state.camera.zoom * (rightWorldX - state.camera.x)) + width/2;
        const screenDnaTopY = (dnaY - 50 - state.camera.y) * state.camera.zoom + height/2;
        const screenDnaBotY = (dnaY + 50 - state.camera.y) * state.camera.zoom + height/2;
        
        ctx.fillStyle = isLight ? '#2f3542' : '#fff';
        ctx.textAlign = 'center';
        
        if(screenDnaTopY > -50 && screenDnaTopY < height + 50) {
            ctx.fillText("5'", leftX, screenDnaTopY);
            ctx.fillText("3'", rightX, screenDnaTopY);
        }
        if(screenDnaBotY > -50 && screenDnaBotY < height + 50) {
            ctx.fillText("3'", leftX, screenDnaBotY);
            ctx.fillText("5'", rightX, screenDnaBotY);
        }

        if (state.phase !== 'dna' && state.phase !== 'dna-complete' && state.mrna.length > 0) {
            let rnaWorldY = dnaY + 200;
            if(state.phase === 'translation' || state.phase === 'translation-complete') rnaWorldY = dnaY + 350;
            const screenRnaY = (rnaWorldY - state.camera.y) * state.camera.zoom + height/2;
            
            if(screenRnaY > -50 && screenRnaY < height + 50) {
                if (state.templateStrand === 'top') {
                    ctx.fillText("3'", leftX, screenRnaY);
                    ctx.fillText("5'", rightX, screenRnaY);
                } else {
                    ctx.fillText("5'", leftX, screenRnaY);
                    ctx.fillText("3'", rightX, screenRnaY);
                }
            }
        }
    }

    ctx.textAlign = 'left'; // reset text align
    
    // Tag drawing helper
    function drawTag(text, y) {
        ctx.fillStyle = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.roundRect(20, y - 20, 100, 40, 8);
        ctx.fill();
        ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = isLight ? '#10ac84' : '#7BED9F';
        ctx.fillText(text, 35, y);
    }
    
    const screenDnaY = (dnaY - state.camera.y) * state.camera.zoom + height/2;
    if(screenDnaY > -50 && screenDnaY < height + 50) drawTag('DNA', screenDnaY);
    
    if(state.phase !== 'dna' && state.phase !== 'dna-complete') {
        let rnaWorldY = dnaY + 200;
        if(state.phase === 'translation' || state.phase === 'translation-complete') rnaWorldY = dnaY + 350;
        const screenRnaY = (rnaWorldY - state.camera.y) * state.camera.zoom + height/2;
        if(screenRnaY > -50 && screenRnaY < height + 50) drawTag('RNA', screenRnaY);
    }
    
    if(state.phase === 'translation' || state.phase === 'translation-complete') {
        const protWorldY = dnaY + 350 + 260; // RNA + 260 (pStartY)
        const screenProtY = (protWorldY - state.camera.y) * state.camera.zoom + height/2;
        if(screenProtY > -50 && screenProtY < height + 50) drawTag('단백질', screenProtY);
    }
    ctx.restore();
}

requestAnimationFrame(loop);
