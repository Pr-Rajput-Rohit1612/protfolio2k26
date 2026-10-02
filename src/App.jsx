import React, { useState, useEffect, useRef } from 'react';
import './index.css';

export default function App() {
  const [navVisible, setNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Auto-hide transparent navbar on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > 30 && currentScrollY > lastScrollY) {
        setNavVisible(false);
      } else {
        setNavVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Broken Half-Centimeter Boxes Dissolve Effect:
  // Doctor Doom mask on top -> dissolves into sparking broken boxes on hover -> reveals Robert Downey Jr. underneath!
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const topImg = new Image();
    topImg.src = '/assets/dr_doom_overlay.jpg';

    // 0.5cm is ~18px to 20px on standard screen resolution
    const BOX_SIZE = 18; 
    let animId;
    let mouse = { x: -1000, y: -1000, targetX: -1000, targetY: -1000 };
    let isHovering = false;
    let hoverRadius = 140; // Area of effect around cursor

    // Electrical / Mystic Doom Green & Gold Sparks
    const sparks = [];
    const maxSparks = 45;

    const createSpark = (x, y) => {
      if (sparks.length >= maxSparks) return;
      sparks.push({
        x: x + (Math.random() - 0.5) * BOX_SIZE,
        y: y + (Math.random() - 0.5) * BOX_SIZE,
        vx: (Math.random() - 0.5) * 4.5,
        vy: (Math.random() - 0.5) * 4.5,
        size: Math.random() * 2.5 + 1.2,
        life: 1.0,
        decay: Math.random() * 0.04 + 0.025,
        color: Math.random() > 0.4 ? 'rgba(0, 255, 136, 0.95)' : 'rgba(255, 215, 0, 0.95)' // Doom Green & Gold
      });
    };

    // Resize canvas to match display size
    const resizeCanvas = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Main render loop
    const render = () => {
      // Smooth lerp mouse coordinates
      mouse.x += (mouse.targetX - mouse.x) * 0.18;
      mouse.y += (mouse.targetY - mouse.y) * 0.18;

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      if (topImg.complete && topImg.naturalWidth > 0) {
        const cols = Math.ceil(width / BOX_SIZE);
        const rows = Math.ceil(height / BOX_SIZE);

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const bx = c * BOX_SIZE;
            const by = r * BOX_SIZE;
            const centerX = bx + BOX_SIZE / 2;
            const centerY = by + BOX_SIZE / 2;

            // Distance from mouse center
            const dx = centerX - mouse.x;
            const dy = centerY - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (isHovering && dist < hoverRadius) {
              // Normalized break intensity (0 = edge, 1 = direct center of cursor)
              const breakIntensity = 1 - (dist / hoverRadius);

              // Inside active cursor core: completely dissolved to reveal RDJ underneath!
              if (breakIntensity > 0.65) {
                // Occasional spark along breaking seam
                if (Math.random() < 0.12) {
                  createSpark(centerX, centerY);
                }
                continue;
              }

              // In the breaking perimeter edge: sparking broken fractured square
              ctx.save();
              ctx.translate(centerX, centerY);

              // Jitter/break angle and shrink
              const jitterScale = 1 - breakIntensity * 0.55;
              const jitterX = (Math.sin(c * 17 + r * 13) * 6) * breakIntensity;
              const jitterY = (Math.cos(c * 11 + r * 19) * 6) * breakIntensity;

              ctx.translate(jitterX, jitterY);
              ctx.scale(jitterScale, jitterScale);

              // Draw partial broken tile with fading opacity
              ctx.globalAlpha = Math.max(0.1, 1 - breakIntensity * 1.1);

              // Source image crop
              const sW = (BOX_SIZE / width) * topImg.naturalWidth;
              const sH = (BOX_SIZE / height) * topImg.naturalHeight;
              const sX = (bx / width) * topImg.naturalWidth;
              const sY = (by / height) * topImg.naturalHeight;

              ctx.drawImage(
                topImg, 
                sX, sY, sW, sH, 
                -BOX_SIZE / 2, -BOX_SIZE / 2, BOX_SIZE, BOX_SIZE
              );

              // Draw sparking neon box borders on broken pieces (Doom Emerald Green & Gold)
              ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(0, 255, 136, 0.85)' : 'rgba(255, 215, 0, 0.85)';
              ctx.lineWidth = 1.5;
              ctx.strokeRect(-BOX_SIZE / 2, -BOX_SIZE / 2, BOX_SIZE, BOX_SIZE);

              ctx.restore();

            } else {
              // Outside cursor radius: draw normal intact box
              const sW = (BOX_SIZE / width) * topImg.naturalWidth;
              const sH = (BOX_SIZE / height) * topImg.naturalHeight;
              const sX = (bx / width) * topImg.naturalWidth;
              const sY = (by / height) * topImg.naturalHeight;

              ctx.drawImage(
                topImg, 
                sX, sY, sW, sH, 
                bx, by, BOX_SIZE, BOX_SIZE
              );
            }
          }
        }

        // Render micro electrical sparks
        for (let i = sparks.length - 1; i >= 0; i--) {
          const s = sparks[i];
          s.x += s.vx;
          s.y += s.vy;
          s.life -= s.decay;

          if (s.life <= 0) {
            sparks.splice(i, 1);
            continue;
          }

          ctx.fillStyle = s.color;
          ctx.globalAlpha = s.life;
          ctx.fillRect(s.x, s.y, s.size, s.size);
        }

        ctx.globalAlpha = 1.0;
        animId = requestAnimationFrame(render);
      } else {
        animId = requestAnimationFrame(render);
      }
    };

    topImg.onload = () => {
      animId = requestAnimationFrame(render);
    };

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mouse.targetX = e.clientX - rect.left;
      mouse.targetY = e.clientY - rect.top;
      isHovering = true;
    };

    const handleMouseEnter = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mouse.targetX = e.clientX - rect.left;
      mouse.targetY = e.clientY - rect.top;
      mouse.x = mouse.targetX;
      mouse.y = mouse.targetY;
      isHovering = true;
    };

    const handleMouseLeave = () => {
      isHovering = false;
      mouse.targetX = -1000;
      mouse.targetY = -1000;
    };

    const containerEl = containerRef.current;
    if (containerEl) {
      containerEl.addEventListener('mousemove', handleMouseMove);
      containerEl.addEventListener('mouseenter', handleMouseEnter);
      containerEl.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resizeCanvas);
      if (containerEl) {
        containerEl.removeEventListener('mousemove', handleMouseMove);
        containerEl.removeEventListener('mouseenter', handleMouseEnter);
        containerEl.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, []);

  return (
    <div className="portfolio-root">
      {/* 1. Pure Transparent Navbar (Zero Background, No Name) */}
      <header className={`pure-navbar ${navVisible ? 'nav-visible' : 'nav-hidden'}`}>
        <div className="nav-container">
          <nav className="nav-menu">
            <a href="#about" className="clean-nav-link">About</a>
            <a href="#projects" className="clean-nav-link">Projects</a>
            <a href="#contact" className="clean-nav-link">Contact</a>
            <a 
              href="https://github.com/Pr-Rajput-Rohit1612/protfolio2k26" 
              target="_blank" 
              rel="noreferrer" 
              className="clean-nav-link github-link"
            >
              GitHub ↗
            </a>
          </nav>
        </div>
      </header>

      {/* 2. Hero Viewport: Doctor Doom Mask with Broken Boxes Revealing Robert Downey Jr. */}
      <main className="hero-viewport">
        <div className="art-stage-wrapper" ref={containerRef}>
          {/* Underneath Layer: Robert Downey Jr. (Matching Pose) */}
          <img 
            src="/assets/rdj_underlay.jpg" 
            alt="Robert Downey Jr." 
            className="stage-img"
          />

          {/* Top Layer Canvas: Doctor Doom Mask breaking into half-centimeter boxes */}
          <canvas 
            ref={canvasRef} 
            className="boxes-dissolve-canvas"
          />
        </div>
      </main>

      {/* Demo Scroll Content to test Navbar Auto-Hide */}
      <section id="about" className="scroll-demonstration-zone">
        <div className="minimal-zone-content">
          <span className="tiny-label">// DOCTOR DOOM // ROBERT DOWNEY JR.</span>
          <p className="minimal-instruction">
            Hover over Doctor Doom's mask to shatter the iron visage into sparking broken boxes, 
            revealing Robert Downey Jr. underneath.
          </p>
        </div>
      </section>
    </div>
  );
}
