// === Polished Shooter (single-file) ============================================
// Drop this in a <script> tag on a blank page. It builds its own DOM.

(function () {
  'use strict';

  // ---- Utilities -------------------------------------------------------------
  const animate =
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    function (cb) { window.setTimeout(cb, 1000 / 60); };

  const rand  = (a, b) => a + Math.random() * (b - a);
  const randi = (a, b) => Math.floor(rand(a, b));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lerp  = (a, b, t) => a + (b - a) * t;

  function getRandomColor() {
    const h = randi(0, 360);
    return `hsl(${h},80%,60%)`;
  }

  // ---- Constants / state -----------------------------------------------------
  const WIDTH = 500;
  const HEIGHT = 800;
  const BAR_H = 30;

  // Persisted progression
  const SAVE_KEY = 'polished_shooter_save_v1';
  const defaultSave = {
    level: 0, skill: 0, exp: 0, maxexp: 4,
    maxhp: 10, damage: 1, rate: 2, size: 3, accuracy: 2, speed: 5,
    highScore: 0,
  };
  let save = loadSave();

  function loadSave() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      return Object.assign({}, defaultSave, s || {});
    } catch (e) { return Object.assign({}, defaultSave); }
  }
  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
  }

  // Live game stats (copied from save so we can tweak in-run)
  let level   = save.level;
  let skill   = save.skill;
  let exp     = save.exp;
  let maxexp  = save.maxexp;
  let maxhp   = save.maxhp;
  let hp      = maxhp;
  let damage  = save.damage;
  let rate    = save.rate;
  let shotSize = save.size;
  let accuracy = save.accuracy;
  let speed    = save.speed;

  let score = 0;
  let combo = 0;
  let comboTimer = 0;
  let timing = 0;
  let shake = 0;
  let paused = false;
  let rapidFireTimer = 0;
  let displayHp = hp, displayExp = exp;

  // ---- DOM scaffolding -------------------------------------------------------
  const wrap = document.createElement('div');
  wrap.style.cssText =
    'display:flex;align-items:flex-start;gap:14px;padding:14px;background:#0b0d12;' +
    'min-height:100vh;font-family:"Courier New",monospace;color:#cfd6e4;';

  const gameCol = document.createElement('div');
  gameCol.style.cssText = 'display:flex;flex-direction:column;gap:0;box-shadow:0 0 30px #000;';

  const title = document.createElement('div');
  title.textContent = '◤ STARBLASTER ◢';
  title.style.cssText =
    'width:' + WIDTH + 'px;background:#11151d;color:#7df9ff;text-align:center;' +
    'font-weight:bold;letter-spacing:3px;padding:6px 0;border-bottom:1px solid #1d2433;';

  const canvas1 = document.createElement('canvas'); // hp bar
  const canvas  = document.createElement('canvas'); // play field
  const canvas2 = document.createElement('canvas'); // exp bar
  const canvas3 = document.createElement('canvas'); // menu
  const hint = document.createElement('div');
  hint.innerHTML =
    'Move: <b>WASD/Arrows</b> &nbsp;•&nbsp; Pause: <b>P / Space</b> &nbsp;•&nbsp; ' +
    'Aim helps shots track; spend <b>skill points</b> on the right.';
  hint.style.cssText =
    'width:' + WIDTH + 'px;background:#11151d;color:#8390a8;text-align:center;' +
    'font-size:12px;padding:6px 0;border-top:1px solid #1d2433;';

  canvas.width  = WIDTH;  canvas.height  = HEIGHT;
  canvas1.width = WIDTH;  canvas1.height = BAR_H;
  canvas2.width = WIDTH;  canvas2.height = BAR_H;
  canvas3.width = 360;    canvas3.height = HEIGHT + BAR_H * 2 + 12 + 12;

  [canvas, canvas1, canvas2].forEach(c => c.style.display = 'block');
  canvas3.style.cssText = 'display:block;border-radius:6px;box-shadow:0 0 30px #000;';

  const ctx    = canvas.getContext('2d');
  const hpbar  = canvas1.getContext('2d');
  const expbar = canvas2.getContext('2d');
  const menu   = canvas3.getContext('2d');

  window.addEventListener('load', () => {
    document.body.style.margin = '0';
    document.body.appendChild(wrap);
    wrap.appendChild(gameCol);
    gameCol.appendChild(title);
    gameCol.appendChild(canvas1);
    gameCol.appendChild(canvas);
    gameCol.appendChild(canvas2);
    gameCol.appendChild(hint);
    wrap.appendChild(canvas3);
    animate(step);
  });

  // ---- Input -----------------------------------------------------------------
  const keys = Object.create(null);
  const mouse = { x: WIDTH / 2, y: HEIGHT - 60, inside: false, down: false };

  window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === ' ' || e.key.toLowerCase() === 'p') { paused = !paused; e.preventDefault(); }
    if (e.key.toLowerCase() === 'r' && e.shiftKey) { resetSave(); }
  });
  window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

  function bindCanvasMouse(c) {
    c.addEventListener('mousemove', e => {
      const r = c.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
      mouse.inside = true;
    });
    c.addEventListener('mouseleave', () => { mouse.inside = false; });
  }
  // bind after creation (canvas exists already)
  bindCanvasMouse(canvas);

  // ---- Entities --------------------------------------------------------------
  class Star {
    constructor() { this.reset(true); }
    reset(initial) {
      this.x = Math.random() * WIDTH;
      this.y = initial ? Math.random() * HEIGHT : -2;
      this.speed = rand(0.3, 2.2);
      this.size  = this.speed > 1.5 ? 2 : 1;
      this.alpha = rand(0.3, 1);
    }
    update() {
      this.y += this.speed;
      if (this.y > HEIGHT) this.reset(false);
    }
    render() {
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = '#cfe4ff';
      ctx.fillRect(this.x, this.y, this.size, this.size);
      ctx.globalAlpha = 1;
    }
  }
  const stars = Array.from({ length: 90 }, () => new Star());

  class Shot {
    constructor(x, y) {
      this.x = x; this.y = y;
      const spread = (rand(-1, 1) * speed) / Math.max(1, accuracy);
      this.vx = spread;
      this.vy = -speed - 2;
      this.size = shotSize;
      this.color = '#7df9ff';
      this.trail = [];
      this.crit = Math.random() < 0.08; // 8% crit
      if (this.crit) this.color = '#ffd166';
    }
    update() {
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > 6) this.trail.shift();
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < -10 || this.x > WIDTH + 10 || this.y < -10) return 1;
      if (enemy.alive && this.x > enemy.x - enemy.r && this.x < enemy.x + enemy.r &&
          this.y > enemy.y - enemy.r && this.y < enemy.y + enemy.r) {
        return 2;
      }
      return 0;
    }
    render() {
      // trail
      for (let i = 0; i < this.trail.length; i++) {
        const p = this.trail[i];
        ctx.globalAlpha = (i / this.trail.length) * 0.5;
        ctx.fillStyle = this.color;
        ctx.fillRect(p.x - this.size / 2, p.y - this.size / 2, this.size, this.size);
      }
      ctx.globalAlpha = 1;
      // glow
      ctx.shadowColor = this.color;
      ctx.shadowBlur = this.crit ? 18 : 10;
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);
      ctx.shadowBlur = 0;
    }
  }

  class Particle {
    constructor(x, y, color, big) {
      this.x = x; this.y = y;
      const a = rand(0, Math.PI * 2);
      const s = rand(1, big ? 6 : 3);
      this.vx = Math.cos(a) * s;
      this.vy = Math.sin(a) * s;
      this.life = big ? 50 : 28;
      this.maxLife = this.life;
      this.color = color;
      this.size = big ? rand(2, 4) : rand(1, 2.5);
    }
    update() {
      this.x += this.vx; this.y += this.vy;
      this.vx *= 0.94; this.vy *= 0.94;
      this.life--;
      return this.life <= 0;
    }
    render() {
      ctx.globalAlpha = clamp(this.life / this.maxLife, 0, 1);
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x, this.y, this.size, this.size);
      ctx.globalAlpha = 1;
    }
  }

  class Popup {
    constructor(x, y, text, color) {
      this.x = x; this.y = y; this.text = text;
      this.color = color || '#ffffff'; this.life = 50; this.maxLife = 50;
    }
    update() { this.y -= 0.8; this.life--; return this.life <= 0; }
    render() {
      ctx.globalAlpha = clamp(this.life / this.maxLife, 0, 1);
      ctx.font = 'bold 16px Courier New';
      ctx.fillStyle = this.color;
      ctx.textAlign = 'center';
      ctx.fillText(this.text, this.x, this.y);
      ctx.globalAlpha = 1;
    }
  }

  class Powerup {
    constructor(x, y) {
      this.x = x; this.y = y;
      this.type = ['heal', 'exp', 'rapid'][randi(0, 3)];
      this.color = { heal: '#ff6b9d', exp: '#7df97d', rapid: '#7df9ff' }[this.type];
      this.size = 10; this.life = 360; this.bob = 0;
    }
    update() {
      this.y += 1.2;
      this.bob += 0.1;
      this.life--;
      // pickup if touches player
      if (Math.abs(this.x - guy.x) < 18 && Math.abs(this.y - guy.y) < 22) {
        if (this.type === 'heal') {
          hp = clamp(hp + Math.ceil(maxhp * 0.4), 0, maxhp);
          popups.push(new Popup(guy.x, guy.y - 30, '+HP', this.color));
        } else if (this.type === 'exp') {
          exp += 2; popups.push(new Popup(guy.x, guy.y - 30, '+EXP', this.color));
          checkLevel();
        } else if (this.type === 'rapid') {
          rapidFireTimer = 360;
          popups.push(new Popup(guy.x, guy.y - 30, 'RAPID!', this.color));
        }
        return true;
      }
      return this.life <= 0 || this.y > HEIGHT + 20;
    }
    render() {
      const y = this.y + Math.sin(this.bob) * 2;
      ctx.shadowColor = this.color; ctx.shadowBlur = 14;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0b0d12';
      ctx.font = 'bold 12px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText(this.type === 'heal' ? '+' : this.type === 'exp' ? 'E' : 'R', this.x, y + 4);
    }
  }

  class Guy {
    constructor(x, y) { this.x = x; this.y = y; this.color = '#7df9ff'; this.flash = 0; }
    render() {
      const c = this.flash > 0 ? '#ff5577' : this.color;
      // ship body
      ctx.shadowColor = c; ctx.shadowBlur = 14;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - 22);
      ctx.lineTo(this.x + 14, this.y + 16);
      ctx.lineTo(this.x + 6,  this.y + 10);
      ctx.lineTo(this.x - 6,  this.y + 10);
      ctx.lineTo(this.x - 14, this.y + 16);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      // cockpit
      ctx.fillStyle = '#0b0d12';
      ctx.beginPath();
      ctx.arc(this.x, this.y - 4, 4, 0, Math.PI * 2);
      ctx.fill();
      // thruster
      ctx.fillStyle = 'rgba(125,249,255,0.5)';
      const flameLen = 8 + Math.sin(Date.now() / 60) * 3;
      ctx.fillRect(this.x - 3, this.y + 16, 6, flameLen);
      if (this.flash > 0) this.flash--;
    }
  }

  class Enemy {
    constructor() { this.respawn(true); this.r = 28; this.eyeT = 0; }
    respawn(first) {
      this.x = WIDTH / 2;
      this.y = 80;
      this.vx = rand(1, 1.8) * (Math.random() < 0.5 ? -1 : 1);
      this.vy = rand(0.2, 0.7);
      this.maxhp = 3 + level * 2;
      this.hp = this.maxhp;
      this.color = getRandomColor();
      this.alive = true;
      this.hitFlash = first ? 0 : 6;
    }
    update() {
      if (!this.alive) return;
      this.eyeT += 0.04;
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < this.r || this.x > WIDTH - this.r) this.vx *= -1;
      if (this.y > 220 || this.y < 40) this.vy *= -1;
      if (this.hitFlash > 0) this.hitFlash--;
    }
    render() {
      if (!this.alive) return;
      // hp bar
      const w = this.r * 2, h = 5;
      ctx.fillStyle = '#222';
      ctx.fillRect(this.x - this.r, this.y - this.r - 12, w, h);
      ctx.fillStyle = '#ff4d6d';
      ctx.fillRect(this.x - this.r, this.y - this.r - 12, w * (this.hp / this.maxhp), h);

      // body
      const c = this.hitFlash > 0 ? '#ffffff' : this.color;
      ctx.shadowColor = this.color; ctx.shadowBlur = 18;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      // eye
      ctx.fillStyle = '#0b0d12';
      ctx.beginPath();
      ctx.arc(this.x, this.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff5577';
      const ex = Math.cos(this.eyeT) * 3;
      const ey = Math.sin(this.eyeT * 1.3) * 2;
      ctx.beginPath();
      ctx.arc(this.x + ex, this.y + ey, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---- World -----------------------------------------------------------------
  const shots = [];
  const particles = [];
  const popups = [];
  const powerups = [];
  const guy = new Guy(WIDTH / 2, HEIGHT - 60);
  const enemy = new Enemy();

  // ---- Game logic ------------------------------------------------------------
  function spawnParticles(x, y, color, n, big) {
    for (let i = 0; i < n; i++) particles.push(new Particle(x, y, color, big));
  }

  function checkLevel() {
    while (exp >= maxexp) {
      exp -= maxexp;
      level++;
      skill++;
      maxexp = Math.ceil(maxexp * 1.4 + 1);
      maxhp += 2;
      hp = maxhp;
      popups.push(new Popup(guy.x, guy.y - 40, 'LEVEL UP!', '#7df97d'));
      spawnParticles(guy.x, guy.y, '#7df97d', 30, true);
    }
  }

  function hitEnemy(crit) {
    const dmg = damage * (crit ? 3 : 1);
    enemy.hp -= dmg;
    enemy.hitFlash = 6;
    spawnParticles(enemy.x, enemy.y, enemy.color, crit ? 16 : 8);
    popups.push(new Popup(enemy.x + rand(-10, 10), enemy.y - 20,
      crit ? 'CRIT ' + dmg : '-' + dmg,
      crit ? '#ffd166' : '#ffffff'));
    combo++; comboTimer = 90;
    score += dmg * (1 + Math.floor(combo / 5));
    if (enemy.hp <= 0) defeatEnemy();
  }

  function defeatEnemy() {
    spawnParticles(enemy.x, enemy.y, enemy.color, 40, true);
    popups.push(new Popup(enemy.x, enemy.y, '+' + (1 + Math.floor(combo / 3)) + ' EXP', '#7df97d'));
    exp += 1 + Math.floor(combo / 3);
    score += 50 + level * 10;
    if (Math.random() < 0.35) powerups.push(new Powerup(enemy.x, enemy.y));
    checkLevel();
    enemy.respawn(false);
  }

  function takeDamage(amount) {
    hp -= amount;
    guy.flash = 8;
    shake = 12;
    spawnParticles(guy.x, guy.y, '#ff5577', 14);
    if (hp <= 0) {
      // death: lose some score, full heal, partial combo loss
      popups.push(new Popup(guy.x, guy.y - 30, 'DOWN!', '#ff5577'));
      spawnParticles(guy.x, guy.y, '#ff5577', 40, true);
      hp = maxhp;
      score = Math.max(0, score - 100);
      combo = 0;
    }
  }

  // ---- Menu (right panel) ---------------------------------------------------
  const upgrades = [
    { key: 'damage',   label: 'Damage',     get: () => damage,   apply: () => damage++,   color: '#ff6b6b', desc: 'More damage per shot' },
    { key: 'rate',     label: 'Fire Rate',  get: () => rate,     apply: () => rate++,     color: '#ffd166', desc: 'Shots per second' },
    { key: 'size',     label: 'Shot Size',  get: () => shotSize, apply: () => shotSize++, color: '#7df9ff', desc: 'Bigger projectiles' },
    { key: 'accuracy', label: 'Accuracy',   get: () => accuracy, apply: () => accuracy++, color: '#a78bfa', desc: 'Tighter spread' },
    { key: 'speed',    label: 'Shot Speed', get: () => speed,    apply: () => speed++,    color: '#7df97d', desc: 'Faster shots' },
  ];

  const menuRowH = 56;
  const menuStartY = 90;
  let hoverRow = -1;
  const menuMouse = { x: -1, y: -1 };

  canvas3.addEventListener('mousemove', e => {
    const r = canvas3.getBoundingClientRect();
    menuMouse.x = e.clientX - r.left;
    menuMouse.y = e.clientY - r.top;
    hoverRow = -1;
    for (let i = 0; i < upgrades.length; i++) {
      const y = menuStartY + i * menuRowH;
      if (menuMouse.y > y && menuMouse.y < y + menuRowH - 6) hoverRow = i;
    }
  });
  canvas3.addEventListener('mouseleave', () => { hoverRow = -1; });
  canvas3.addEventListener('click', () => {
    if (skill <= 0 || hoverRow < 0) return;
    upgrades[hoverRow].apply();
    skill--;
    popups.push(new Popup(guy.x, guy.y - 30, upgrades[hoverRow].label + '+', upgrades[hoverRow].color));
    persistAll();
  });

  function persistAll() {
    save.level = level; save.skill = skill; save.exp = exp; save.maxexp = maxexp;
    save.maxhp = maxhp; save.damage = damage; save.rate = rate; save.size = shotSize;
    save.accuracy = accuracy; save.speed = speed;
    if (score > save.highScore) save.highScore = score;
    persist();
  }

  function resetSave() {
    save = Object.assign({}, defaultSave);
    level = 0; skill = 0; exp = 0; maxexp = save.maxexp;
    maxhp = save.maxhp; hp = maxhp;
    damage = save.damage; rate = save.rate; shotSize = save.size;
    accuracy = save.accuracy; speed = save.speed;
    score = 0; combo = 0;
    persist();
  }

  // ---- Main loop -------------------------------------------------------------
  function update() {
    if (paused) return;

    // player movement
    const ms = 4.5;
    if (keys['a'] || keys['arrowleft'])  guy.x -= ms;
    if (keys['d'] || keys['arrowright']) guy.x += ms;
    if (keys['w'] || keys['arrowup'])    guy.y -= ms;
    if (keys['s'] || keys['arrowdown'])  guy.y += ms;
    // mouse drift assist when over canvas (subtle)
    if (mouse.inside) {
      guy.x = lerp(guy.x, mouse.x, 0.15);
      guy.y = lerp(guy.y, clamp(mouse.y, HEIGHT * 0.4, HEIGHT - 30), 0.15);
    }
    guy.x = clamp(guy.x, 16, WIDTH - 16);
    guy.y = clamp(guy.y, HEIGHT * 0.4, HEIGHT - 30);

    // stars
    for (let i = 0; i < stars.length; i++) stars[i].update();

    // shots (iterate backwards to splice safely)
    for (let i = shots.length - 1; i >= 0; i--) {
      const r = shots[i].update();
      if (r === 1) { shots.splice(i, 1); }
      else if (r === 2) { const s = shots[i]; shots.splice(i, 1); hitEnemy(s.crit); }
    }

    // fire (rapid fire doubles rate)
    const effectiveRate = rate * (rapidFireTimer > 0 ? 2.5 : 1);
    timing++;
    if (timing > 60 / effectiveRate) {
      shots.push(new Shot(guy.x, guy.y - 22));
      timing = 0;
    }
    if (rapidFireTimer > 0) rapidFireTimer--;

    // enemy
    enemy.update();

    // enemy "shoots" by damaging the player periodically at low rate
    if (Math.random() < 0.004 + level * 0.0005) {
      takeDamage(1);
    }

    // particles
    for (let i = particles.length - 1; i >= 0; i--) {
      if (particles[i].update()) particles.splice(i, 1);
    }
    // popups
    for (let i = popups.length - 1; i >= 0; i--) {
      if (popups[i].update()) popups.splice(i, 1);
    }
    // powerups
    for (let i = powerups.length - 1; i >= 0; i--) {
      if (powerups[i].update()) powerups.splice(i, 1);
    }

    // combo decay
    if (comboTimer > 0) comboTimer--;
    else combo = 0;

    if (shake > 0) shake--;

    // smooth bars
    displayHp  = lerp(displayHp,  hp,  0.15);
    displayExp = lerp(displayExp, exp, 0.15);

    // periodic autosave
    if ((Date.now() & 1023) === 0) persistAll();
  }

  function renderHpBar() {
    hpbar.fillStyle = '#11151d';
    hpbar.fillRect(0, 0, WIDTH, BAR_H);
    const p = clamp(displayHp / maxhp, 0, 1);
    const grad = hpbar.createLinearGradient(0, 0, WIDTH, 0);
    grad.addColorStop(0, '#ff4d6d');
    grad.addColorStop(1, '#ff8a5b');
    hpbar.fillStyle = grad;
    hpbar.fillRect(0, 0, WIDTH * p, BAR_H);
    hpbar.fillStyle = 'rgba(255,255,255,0.08)';
    hpbar.fillRect(0, 0, WIDTH * p, BAR_H / 2);
    hpbar.font = 'bold 18px Courier New';
    hpbar.fillStyle = '#fff';
    hpbar.textAlign = 'center';
    hpbar.fillText('HP ' + Math.max(0, Math.ceil(hp)) + ' / ' + maxhp, WIDTH / 2, 21);
  }

  function renderExpBar() {
    expbar.fillStyle = '#11151d';
    expbar.fillRect(0, 0, WIDTH, BAR_H);
    const p = clamp(displayExp / maxexp, 0, 1);
    const grad = expbar.createLinearGradient(0, 0, WIDTH, 0);
    grad.addColorStop(0, '#3ddc97');
    grad.addColorStop(1, '#7df9ff');
    expbar.fillStyle = grad;
    expbar.fillRect(0, 0, WIDTH * p, BAR_H);
    expbar.fillStyle = 'rgba(255,255,255,0.08)';
    expbar.fillRect(0, 0, WIDTH * p, BAR_H / 2);
    expbar.font = 'bold 18px Courier New';
    expbar.fillStyle = '#fff';
    expbar.textAlign = 'center';
    expbar.fillText('LV ' + level + '   EXP ' + Math.floor(exp) + ' / ' + maxexp, WIDTH / 2, 21);
  }

  function renderField() {
    ctx.save();
    if (shake > 0) ctx.translate(rand(-shake, shake) * 0.5, rand(-shake, shake) * 0.5);

    // background gradient + stars
    const g = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    g.addColorStop(0, '#070912');
    g.addColorStop(1, '#0b0d12');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    for (let i = 0; i < stars.length; i++) stars[i].render();

    // entities
    for (let i = 0; i < shots.length; i++) shots[i].render();
    for (let i = 0; i < powerups.length; i++) powerups[i].render();
    enemy.render();
    guy.render();
    for (let i = 0; i < particles.length; i++) particles[i].render();
    for (let i = 0; i < popups.length; i++) popups[i].render();

    // HUD overlays
    ctx.font = 'bold 16px Courier New';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#cfd6e4';
    ctx.fillText('Score: ' + score, 10, 22);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#8390a8';
    ctx.fillText('Best: ' + Math.max(save.highScore, score), WIDTH - 10, 22);

    if (combo > 1) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 22px Courier New';
      ctx.fillStyle = '#ffd166';
      ctx.fillText('x' + combo + ' COMBO', WIDTH / 2, 48);
    }
    if (rapidFireTimer > 0) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 14px Courier New';
      ctx.fillStyle = '#7df9ff';
      ctx.fillText('RAPID FIRE ' + Math.ceil(rapidFireTimer / 60) + 's', WIDTH / 2, 70);
    }

    ctx.restore();

    if (paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = '#7df9ff';
      ctx.textAlign = 'center';
      ctx.font = 'bold 40px Courier New';
      ctx.fillText('PAUSED', WIDTH / 2, HEIGHT / 2);
      ctx.font = '16px Courier New';
      ctx.fillStyle = '#cfd6e4';
      ctx.fillText('Press P or Space to resume', WIDTH / 2, HEIGHT / 2 + 30);
      ctx.fillText('Shift+R to reset progression', WIDTH / 2, HEIGHT / 2 + 54);
    }
  }

  function renderMenu() {
    // bg
    menu.fillStyle = '#11151d';
    menu.fillRect(0, 0, canvas3.width, canvas3.height);

    // header
    menu.fillStyle = '#7df9ff';
    menu.font = 'bold 18px Courier New';
    menu.textAlign = 'left';
    menu.fillText('⚙ UPGRADES', 16, 28);

    menu.fillStyle = skill > 0 ? '#ffd166' : '#8390a8';
    menu.font = 'bold 14px Courier New';
    menu.fillText('Skill Points: ' + skill, 16, 52);
    if (skill > 0) {
      menu.fillStyle = '#7df97d';
      menu.fillText('← click a row to spend', 16, 72);
    } else {
      menu.fillStyle = '#666c7a';
      menu.fillText('Defeat enemies to earn points', 16, 72);
    }

    // rows
    for (let i = 0; i < upgrades.length; i++) {
      const up = upgrades[i];
      const y = menuStartY + i * menuRowH;
      const hovering = hoverRow === i && skill > 0;
      menu.fillStyle = hovering ? '#1d2433' : '#161b26';
      roundRect(menu, 10, y, canvas3.width - 20, menuRowH - 8, 8, true);

      // accent strip
      menu.fillStyle = up.color;
      menu.fillRect(10, y, 4, menuRowH - 8);

      menu.font = 'bold 16px Courier New';
      menu.textAlign = 'left';
      menu.fillStyle = '#cfd6e4';
      menu.fillText(up.label, 22, y + 22);

      menu.font = '12px Courier New';
      menu.fillStyle = '#8390a8';
      menu.fillText(up.desc, 22, y + 40);

      menu.font = 'bold 20px Courier New';
      menu.textAlign = 'right';
      menu.fillStyle = up.color;
      menu.fillText('Lv ' + up.get(), canvas3.width - 18, y + 30);

      if (hovering) {
        menu.fillStyle = '#7df97d';
        menu.font = 'bold 11px Courier New';
        menu.textAlign = 'right';
        menu.fillText('CLICK TO UPGRADE', canvas3.width - 18, y + 46);
      }
    }

    // footer
    const fy = menuStartY + upgrades.length * menuRowH + 16;
    menu.fillStyle = '#161b26';
    roundRect(menu, 10, fy, canvas3.width - 20, 90, 8, true);
    menu.fillStyle = '#7df9ff';
    menu.font = 'bold 14px Courier New';
    menu.textAlign = 'left';
    menu.fillText('STATS', 22, fy + 22);
    menu.fillStyle = '#cfd6e4';
    menu.font = '13px Courier New';
    menu.fillText('Score:     ' + score, 22, fy + 42);
    menu.fillText('High:      ' + Math.max(save.highScore, score), 22, fy + 60);
    menu.fillText('Enemies:   level ' + level + ' (HP ' + enemy.maxhp + ')', 22, fy + 78);
  }

  function roundRect(c, x, y, w, h, r, fill) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
    if (fill) c.fill();
  }

  function render() {
    renderHpBar();
    renderExpBar();
    renderField();
    renderMenu();
  }

  function step() {
    update();
    render();
    animate(step);
  }
})();
