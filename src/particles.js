/* ==========================================================================
   Background Particles & Sparkle Canvas Animation Engine
   ========================================================================== */

export class ParticleEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.sparklesCount = 45;
    this.celebrationMode = false;
    
    this.init();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);

    window.addEventListener('resize', () => this.resize());
  }

  init() {
    this.resize();
    this.createParticles();
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  createParticles() {
    this.particles = [];
    const count = this.celebrationMode ? this.sparklesCount * 2.2 : this.sparklesCount;
    
    for (let i = 0; i < count; i++) {
      this.particles.push(this.generateParticle());
    }
  }

  generateParticle() {
    const isGold = this.celebrationMode || Math.random() > 0.6;
    const isPink = Math.random() > 0.7;

    let color = '#d8b4fe'; // default lavender
    if (isGold) color = '#fbbf24';
    else if (isPink) color = '#fbcfe8';

    return {
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      radius: Math.random() * 2 + 0.8,
      color: color,
      alpha: Math.random() * 0.7 + 0.2,
      velocity: {
        x: (Math.random() - 0.5) * 0.4,
        y: -Math.random() * 0.6 - 0.2
      },
      pulseSpeed: Math.random() * 0.02 + 0.008,
      pulseFactor: Math.random() * Math.PI,
      isSparkleShape: Math.random() > 0.65
    };
  }

  setCelebrationMode(enabled) {
    this.celebrationMode = enabled;
    this.createParticles();
  }

  drawSparkle(ctx, x, y, size, color, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1;

    // 4-point star shape
    ctx.beginPath();
    ctx.moveTo(0, -size * 2);
    ctx.quadraticCurveTo(0, 0, size * 2, 0);
    ctx.quadraticCurveTo(0, 0, 0, size * 2);
    ctx.quadraticCurveTo(0, 0, -size * 2, 0);
    ctx.quadraticCurveTo(0, 0, 0, -size * 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  animate() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      // Update position
      p.x += p.velocity.x;
      p.y += p.velocity.y;

      // Wrap around screen boundaries smoothly
      if (p.y < -10) p.y = this.height + 10;
      if (p.x < -10) p.x = this.width + 10;
      if (p.x > this.width + 10) p.x = -10;

      // Pulse opacity
      p.pulseFactor += p.pulseSpeed;
      const currentAlpha = p.alpha * (0.6 + 0.4 * Math.sin(p.pulseFactor));

      if (p.isSparkleShape) {
        this.drawSparkle(this.ctx, p.x, p.y, p.radius, p.color, currentAlpha);
      } else {
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = p.color;
        this.ctx.globalAlpha = currentAlpha;
        this.ctx.shadowBlur = 8;
        this.ctx.shadowColor = p.color;
        this.ctx.fill();
        this.ctx.restore();
      }
    }

    requestAnimationFrame(this.animate);
  }
}
