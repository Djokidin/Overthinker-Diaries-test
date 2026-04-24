let words = [];
let encouragements = []; 
let idleWords = []; 
let timer = 60;
let gameState = "START"; 
let score = 0;
let hearts = 3;
let isInvincible = false;
let invTimer = 0;
let paused = false;

// --- DEKLARASI AUDIO ---
const sfxClick = new Audio('Click.mp3');
const sfxHit = new Audio('Hit.mp3');
const sfxHeal = new Audio('Heal.mp3');

// BGM & Whispers
const bgm = new Audio('bgm.mp3');
bgm.loop = true;
bgm.volume = 0.3; // Volume BGM in-game

const sfxWhisper = new Audio('Whisper.mp3');
sfxWhisper.loop = true;
sfxWhisper.volume = 0.2; // Volume bisikan di menu & pause

// Atur volume SFX
sfxClick.volume = 0.5; 
sfxHit.volume = 0.7;
sfxHeal.volume = 0.6;

// Variabel Penampung Posisi Input
let playerX = 0;
let playerY = 0;
let screenX = 0;
let screenY = 0;

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

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
  
  playerX = width / 2;
  playerY = height / 2;
  screenX = width / 2;
  screenY = height / 2;
  
  initControls(); 
  spawnIdleWords(); 

  // TRICK BROWSER: Mencoba memutar bisikan saat interaksi (sentuhan/klik) pertama kali di layar
  document.addEventListener('pointerdown', () => {
      if (gameState === "START" && sfxWhisper.paused) {
          sfxWhisper.play().catch(e => console.log("Menunggu interaksi"));
      }
  }, { once: true });
}

function initControls() {
  const addAction = (id, func) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        sfxClick.currentTime = 0; 
        sfxClick.play().catch(e => {});
        
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

function touchMoved() {
    return false; 
}

function startGame() {
  words = []; encouragements = []; hearts = 3; timer = 60; score = 0;
  idleWords = []; 
  isInvincible = false; paused = false;
  gameState = "PLAYING";
  
  const hud = document.querySelector('.fn-hud');
  if (hud) hud.style.display = 'flex';
  
  // AUDIO LOGIC: Matikan bisikan, nyalakan BGM
  sfxWhisper.pause();
  bgm.currentTime = 0; // Mulai BGM dari awal
  bgm.play().catch(e => console.log("BGM tertunda"));
  
  showScreen('none');
  updateHTML_HUD();
}

function backToMenu() {
  words = []; encouragements = []; hearts = 3; timer = 60; score = 0;
  isInvincible = false; paused = false;
  gameState = "START";
  
  const hud = document.querySelector('.fn-hud');
  if (hud) hud.style.display = 'none';
  
  playerX = width / 2;
  playerY = height / 2;
  screenX = width / 2;
  screenY = height / 2;
  
  // AUDIO LOGIC: Matikan BGM, nyalakan kembali bisikan
  bgm.pause();
  sfxWhisper.play().catch(e => {});
  
  spawnIdleWords(); 
  showScreen('start');
  updateHTML_HUD();
}

function togglePause() {
  if (gameState === "PLAYING") {
    paused = true; gameState = "PAUSED";
    
    // AUDIO LOGIC JEDA: BGM diam, bisikan datang
    bgm.pause();
    sfxWhisper.play().catch(e => {});
    
    document.getElementById('pause-quote').textContent = random(QUOTES);
    showScreen('pause');
  } else if (gameState === "PAUSED") {
    paused = false; gameState = "PLAYING";
    
    // AUDIO LOGIC LANJUT: Bisikan hilang, BGM lanjut
    sfxWhisper.pause();
    bgm.play().catch(e => {});
    
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

function spawnIdleWords() {
  idleWords = [];
  for(let i = 0; i < 15; i++) {
    idleWords.push(new IdleWord(random(width), random(height)));
  }
}

function draw() {
  clear(); 
  updateInputPositions();

  let dot = document.getElementById('cursor-dot');
  if (dot) {
      dot.style.left = playerX + 'px';
      dot.style.top = (playerY + 42) + 'px';
      dot.style.opacity = (isInvincible && frameCount % 10 < 5) ? 0.3 : 1;
  }

  if (gameState === "START") {
    for (let iw of idleWords) {
      iw.update();
      iw.display();
    }
  } 
  else if (gameState === "PLAYING") {
    handleSpawning();
    runLogic();
  }
}

function updateInputPositions() {
  if (touches.length > 0) {
      screenX = touches[0].x;
      screenY = touches[0].y;
      playerX = touches[0].x;
      playerY = touches[0].y - 42 - 70; 
  } else if (!isMobile) {
      screenX = mouseX;
      screenY = mouseY;
      playerX = mouseX;
      playerY = mouseY - 42; 
  }
}

function handleSpawning() {
  let timePassed = 60 - timer;
  
  let baseRate = isMobile ? 22 : 12; 
  let minRate = isMobile ? 12 : 5;   
  let spawnRate = floor(map(timePassed, 0, 60, baseRate, minRate)); 

  if (frameCount % spawnRate === 0) {
    let amt = (timePassed > 45 && !isMobile) ? 2 : 1; 
    
    for(let i=0; i<amt; i++) {
      let isSeeker = false;
      let seekerChance = isMobile ? 0.1 : 0.3;
      if (timePassed > 30 && random(1) < seekerChance) isSeeker = true;

      spawnWord(timePassed, isSeeker);
    }
  }

  if (frameCount % 60 === 0 && timer > 0) {
    timer--; updateHTML_HUD();
    if (timer % 15 === 0) spawnEncouragement();
  }
}

function spawnWord(timePassed, isSeeker) {
  let x, y, vx = 0, vy = 0;
  
  if (timePassed < 15) {
    x = random(width); y = -30; vx = random(-1, 1);
    vy = isMobile ? random(3, 5) : random(4, 7); 
  } else if (timePassed < 30) {
    let angle = random(TWO_PI);
    let spd = isMobile ? random(3, 6) : random(5, 10); 
    x = width / 2; y = (height / 2) - 42; 
    vx = cos(angle) * spd; vy = sin(angle) * spd;
  } else {
    let side = floor(random(4));
    if (side === 0) { x = random(width); y = -50; }
    else if (side === 1) { x = width + 50; y = random(height); }
    else if (side === 2) { x = random(width); y = height + 50; }
    else { x = -50; y = random(height); }
    
    if (!isSeeker) {
        let steer = createVector(width/2 - x, height/2 - y).normalize();
        let spd = isMobile ? random(2.5, 5) : random(3, 6);
        steer.mult(spd);
        vx = steer.x; vy = steer.y;
    }
  }
  
  words.push(new Word(x, y, vx, vy, isSeeker, false));
}

function runLogic() {
  for (let i = words.length - 1; i >= 0; i--) {
    words[i].update();
    words[i].display();
    if (!isInvincible && words[i].hitsPlayer()) {
        
      sfxHit.currentTime = 0;
      sfxHit.play().catch(e => {});
      
      hearts--; isInvincible = true; invTimer = 60;
      words.splice(i, 1); updateHTML_HUD();
    } else if (words[i].offScreen()) {
      words.splice(i, 1); score++; updateHTML_HUD();
    }
  }

  for (let i = encouragements.length - 1; i >= 0; i--) {
    encouragements[i].update();
    encouragements[i].display();
    if (encouragements[i].hitsPlayer()) {
        
      sfxHeal.currentTime = 0;
      sfxHeal.play().catch(e => {});
      
      if (hearts < 3) hearts++; 
      encouragements.splice(i, 1); 
      updateHTML_HUD();
    }
  }

  if (isInvincible) { invTimer--; if (invTimer <= 0) isInvincible = false; }
  
  // AUDIO LOGIC GAME OVER / WIN: Matikan BGM saat game selesai
  if (hearts <= 0) { 
      bgm.pause(); 
      gameState = "GAMEOVER"; 
      showScreen('over'); 
  }
  if (timer <= 0) { 
      bgm.pause(); 
      gameState = "WIN"; 
      showScreen('win'); 
  }
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

class IdleWord {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(random(1, 2));
    this.text = random(["GAGAL", "TAKUT", "CEMAS", "SUSAH", "BINGUNG", "RAGU", "BODOH", "STUCK"]);
    
    this.size = isMobile ? random(18, 26) : random(24, 38);
    this.maxSpeed = random(1.5, 3);
  }

  update() {
    let d = dist(screenX, screenY, this.pos.x, this.pos.y);
    let steer = createVector(screenX - this.pos.x, screenY - this.pos.y);
    steer.normalize();
    
    if (d < 60) { steer.mult(-0.05); } 
    else { steer.mult(0.03); }
    
    this.vel.add(steer);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
  }

  display() {
    push();
    fill('rgba(139, 26, 26, 0.4)'); 
    textFont('Nanum Pen Script');
    textSize(this.size);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text(this.text, this.pos.x, this.pos.y);
    pop();
  }
}

class Word {
  constructor(x, y, vx, vy, isSeeker, isPos) {
    this.pos = createVector(x, y);
    this.vel = createVector(vx, vy);
    this.isSeeker = isSeeker;
    this.isPos = isPos;
    this.text = isPos ? "TENANG" : random(["GAGAL", "TAKUT", "CEMAS", "SUSAH", "BINGUNG", "RAGU", "BODOH", "STUCK"]);
    
    let posSize = isMobile ? 32 : 42; 
    let negMin = isMobile ? 18 : 26;  
    let negMax = isMobile ? 26 : 36;  
    
    this.baseSize = isPos ? posSize : random(negMin, negMax);
    this.size = this.baseSize;
    this.pulseOffset = random(100);
  }

  update() {
    if (this.isSeeker) {
      let steer = createVector(playerX - this.pos.x, playerY - this.pos.y);
      steer.normalize();
      let turnSpeed = isMobile ? 0.1 : 0.15;
      steer.mult(this.isPos ? 0.04 : turnSpeed);
      this.vel.add(steer);
      this.vel.limit(this.isPos ? 2 : (isMobile ? 3.5 : 5));
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

  hitsPlayer() {
    let centerX = this.pos.x + (textWidth(this.text) / 2);
    let centerY = this.pos.y + (this.size / 2);
    let d = dist(playerX, playerY, centerX, centerY);
    return d < (textWidth(this.text) / 1.7 + 10);
  }

  offScreen() {
    return this.pos.y > height + 100 || this.pos.y < -150 || this.pos.x < -250 || this.pos.x > width + 250;
  }
}

function keyPressed() { 
  if (key === ' ' || keyCode === 32) { togglePause(); return false; } 
}

function windowResized() { 
  resizeCanvas(windowWidth, windowHeight - 42); 
}
