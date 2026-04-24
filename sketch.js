let words = [];
let encouragements = []; 
let idleWords = []; // Array baru untuk pikiran liar di menu utama
let timer = 60;
let gameState = "START"; 
let score = 0;
let hearts = 3;
let isInvincible = false;
let invTimer = 0;
let paused = false;

const QUOTES = [
  "“Kamu nggak harus kuat setiap saat. Bertahan hari ini saja, itu sudah cukup.”",
  "“Pikiranmu mungkin ribut, tapi itu bukan berarti semuanya benar.”",
  "“Nafas pelan-pelan. Dunia tidak sedang mengejarmu secepat yang kamu kira.”",
  "“Kamu sudah sejauh ini. Jangan remehkan dirimu sendiri.”"
];

function setup() {
  let cnv = createCanvas(windowWidth, windowHeight - 42);
  cnv.parent('canvas-holder');
  noCursor();
  
  initControls(); 
  spawnIdleWords(); // Munculkan kata-kata saat pertama kali dimuat
}

function initControls() {
  const addAction = (id, func) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        func();
      };
    }
  };

  addAction('start-btn-action', startGame);
  addAction('retry-btn', startGame);
  addAction('win-btn', startGame);
  
  addAction('pause-btn', togglePause);
  addAction('resume-btn', togglePause);
  addAction('menu-btn-pause', backToMenu);
  addAction('menu-btn-over', backToMenu);

  const pauseScreen = document.getElementById('pause-screen');
  if (pauseScreen) {
    pauseScreen.onclick = function(e) {
      if (e.target === this && gameState === "PAUSED") togglePause();
    };
  }
}

// ---- FUNGSI UNTUK MENU IDLE SWARM ---- //
function spawnIdleWords() {
  idleWords = [];
  // Buat 15 kata negatif yang melayang di latar belakang
  for(let i = 0; i < 15; i++) {
    idleWords.push(new IdleWord(random(width), random(height)));
  }
}

// ---- GAME STATE FUNCTIONS ---- //

function startGame() {
  words = []; encouragements = []; hearts = 3; timer = 60; score = 0;
  idleWords = []; // Hilangkan kata-kata menu saat game mulai
  isInvincible = false; paused = false;
  gameState = "PLAYING";
  
  const hud = document.querySelector('.fn-hud');
  if (hud) hud.style.display = 'flex';
  
  showScreen('none');
  updateHTML_HUD();
}

function backToMenu() {
  words = []; encouragements = []; hearts = 3; timer = 60; score = 0;
  isInvincible = false; paused = false;
  gameState = "START";
  
  const hud = document.querySelector('.fn-hud');
  if (hud) hud.style.display = 'none';
  
  spawnIdleWords(); // Munculkan kembali kata-kata saat kembali ke menu
  showScreen('start');
  updateHTML_HUD();
}

function togglePause() {
  if (gameState === "PLAYING") {
    paused = true; gameState = "PAUSED";
    document.getElementById('pause-quote').textContent = random(QUOTES);
    showScreen('pause');
  } else if (gameState === "PAUSED") {
    paused = false; gameState = "PLAYING";
    showScreen('none');
  }
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  if(id !== 'none') {
    const target = document.getElementById(id + '-screen');
    if (target) target.classList.add('active');
  }
}

// ---- MAIN LOOP ---- //

function draw() {
  clear(); 
  let targetY = mouseY - 42; 

  let dot = document.getElementById('cursor-dot');
  if (dot) {
      dot.style.left = mouseX + 'px';
      dot.style.top = mouseY + 'px';
      dot.style.opacity = (isInvincible && frameCount % 10 < 5) ? 0 : 1;
  }

  // JIKA SEDANG DI MENU AWAL (IDLE)
  if (gameState === "START") {
    for (let iw of idleWords) {
      iw.update();
      iw.display();
    }
  } 
  // JIKA GAME SEDANG DIMAINKAN
  else if (gameState === "PLAYING") {
    handleSpawning();
    runLogic(targetY);
  }
}

function handleSpawning() {
  let timePassed = 60 - timer;
  
  // Kecepatan spawn (semakin kecil angkanya, semakin cepat munculnya)
  let spawnRate = floor(map(timePassed, 0, 60, 12, 5)); 

  if (frameCount % spawnRate === 0) {
    
    // --- PERUBAHAN JUMLAH SPAWN (AMT) ---
    // Sebelumnya: let amt = timePassed > 30 ? (timePassed > 45 ? 3 : 2) : 1;
    // Sekarang: Hanya muncul 1 kata, kecuali di 15 detik terakhir (timePassed > 45) baru muncul 2 kata.
    let amt = timePassed > 45 ? 2 : 1; 
    
    for(let i=0; i<amt; i++) {
      if (timePassed < 15) {
        // STAGE 1 (0-15 detik): Jatuh lurus dari atas
        words.push(new Word(random(width), -30, random(-1, 1), random(5, 8), false, false));
      } else if (timePassed < 30) {
        // STAGE 2 (15-30 detik): Menyebar dari tengah
        let angle = random(TWO_PI);
        let spd = random(5, 10);
        words.push(new Word(width/2, (height/2) - 42, cos(angle)*spd, sin(angle)*spd, false, false));
      } else {
        // STAGE 3 (30-60 detik): Kombinasi jatuh dan sedikit seeker
        let side = floor(random(4));
        let x, y;
        let isSeeker = false;
        
        // Hanya 30% kemungkinan kata menjadi seeker (mengejar kursor)
        if (random(1) < 0.3) {
            isSeeker = true;
        }

        if (side === 0) { x = random(width); y = -50; }
        else if (side === 1) { x = width + 50; y = random(height); }
        else if (side === 2) { x = random(width); y = height + 50; }
        else { x = -50; y = random(height); }
        
        // Jika bukan seeker, beri kecepatan awal agar mereka terbang lurus
        let vx = 0;
        let vy = 0;
        if (!isSeeker) {
            let steer = createVector(width/2 - x, height/2 - y);
            steer.normalize();
            steer.mult(random(3, 7)); // Kecepatan terbang lurus
            vx = steer.x;
            vy = steer.y;
        }
        
        words.push(new Word(x, y, vx, vy, isSeeker, false));
      }
    }
  }

  // Timer & Spawning "TENANG"
  if (frameCount % 60 === 0 && timer > 0) {
    timer--; updateHTML_HUD();
    if (timer % 15 === 0) spawnEncouragement();
  }
}

function runLogic(targetY) {
  for (let i = words.length - 1; i >= 0; i--) {
    words[i].update(targetY);
    words[i].display();
    if (!isInvincible && words[i].hitsPlayer(targetY)) {
      hearts--; isInvincible = true; invTimer = 60;
      words.splice(i, 1); updateHTML_HUD();
    } else if (words[i].offScreen()) {
      words.splice(i, 1); score++; updateHTML_HUD();
    }
  }

  for (let i = encouragements.length - 1; i >= 0; i--) {
    encouragements[i].update(targetY);
    encouragements[i].display();
    if (encouragements[i].hitsPlayer(targetY)) {
      if (hearts < 3) hearts++; 
      encouragements.splice(i, 1); 
      updateHTML_HUD();
    }
  }

  if (isInvincible) { invTimer--; if (invTimer <= 0) isInvincible = false; }
  
  if (hearts <= 0) { gameState = "GAMEOVER"; showScreen('over'); }
  if (timer <= 0) { gameState = "WIN"; showScreen('win'); }
}

function updateHTML_HUD() {
  const scoreEl = document.getElementById('hud-score');
  const progEl = document.getElementById('hud-progress');
  const heartEl = document.getElementById('hud-hearts');
  
  if (scoreEl) scoreEl.textContent = "avoided: " + score;
  if (progEl) progEl.style.width = ((timer/60)*100) + "%";
  
  if (heartEl) {
    let h = "FOKUS: ";
    for(let i=0; i<3; i++) h += (i < hearts) ? "♥ " : "♡ ";
    heartEl.textContent = h;
  }
}

function spawnEncouragement() {
  encouragements.push(new Word(random(width), random(height), 0, 0, true, true));
}

// ---- OBJECT CLASSES ---- //

// Kelas untuk kata-kata latar belakang di menu awal
class IdleWord {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(random(1, 2));
    this.text = random(["GAGAL", "TAKUT", "CEMAS", "SUSAH", "BINGUNG", "RAGU", "BODOH", "STUCK"]);
    this.size = random(24, 38);
    this.maxSpeed = random(1.5, 3);
  }

  update() {
    let d = dist(mouseX, mouseY, this.pos.x, this.pos.y);
    let steer = createVector(mouseX - this.pos.x, mouseY - this.pos.y);
    steer.normalize();
    
    // Menghindar sedikit jika terlalu dekat dengan kursor agar tidak menumpuk jadi satu titik
    if (d < 60) {
        steer.mult(-0.05); 
    } else {
        steer.mult(0.03); // Mendekat secara perlahan
    }
    
    this.vel.add(steer);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
  }

  display() {
    push();
    // Warna merah dengan transparansi (opacity) agar terasa seperti bayangan
    fill('rgba(139, 26, 26, 0.4)'); 
    textFont('Nanum Pen Script');
    textSize(this.size);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text(this.text, this.pos.x, this.pos.y);
    pop();
  }
}

// Kelas utama untuk peluru game
class Word {
  constructor(x, y, vx, vy, isSeeker, isPos) {
    this.pos = createVector(x, y);
    this.vel = createVector(vx, vy);
    this.isSeeker = isSeeker;
    this.isPos = isPos;
    this.text = isPos ? "TENANG" : random(["GAGAL", "TAKUT", "CEMAS", "SUSAH", "BINGUNG", "RAGU", "BODOH", "STUCK"]);
    this.baseSize = isPos ? 42 : random(26, 36);
    this.size = this.baseSize;
    this.pulseOffset = random(100);
  }

  update(targetY) {
    if (this.isSeeker) {
      let steer = createVector(mouseX - this.pos.x, targetY - this.pos.y);
      steer.normalize();
      steer.mult(this.isPos ? 0.04 : 0.15);
      this.vel.add(steer);
      this.vel.limit(this.isPos ? 2 : 5);
    }
    if (this.isPos) {
      this.size = this.baseSize + sin(frameCount * 0.1 + this.pulseOffset) * 5;
    }
    this.pos.add(this.vel);
  }

  display() {
    push();
    textFont('Nanum Pen Script');
    
    if (this.isPos) {
      drawingContext.shadowBlur = 15;
      drawingContext.shadowColor = color(26, 92, 42);
      fill(26, 92, 42);
    } else {
      fill('#8b1a1a');
    }
    
    textSize(this.size);
    textStyle(BOLD); 
    textAlign(LEFT, TOP);
    text(this.text, this.pos.x, this.pos.y);
    pop();
  }

  hitsPlayer(targetY) {
    let centerX = this.pos.x + (textWidth(this.text) / 2);
    let centerY = this.pos.y + (this.size / 2);
    let d = dist(mouseX, targetY, centerX, centerY);
    return d < (textWidth(this.text) / 1.7 + 10);
  }

  offScreen() {
    return this.pos.y > height + 100 || this.pos.y < -150 || this.pos.x < -250 || this.pos.x > width + 250;
  }
}

// ---- NATIVE BROWSER INPUTS ---- //

function keyPressed() { 
  if (key === ' ' || keyCode === 32) { togglePause(); return false; } 
}

function windowResized() { 
  resizeCanvas(windowWidth, windowHeight - 42); 
}