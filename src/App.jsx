import React, { useState, useEffect, useRef } from 'react';
import './index.css';

export default function App() {
  const [navVisible, setNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const canvasRef = useRef(null);
  const resetTriggerRef = useRef(null);

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

  // Creeping Smolder Burning Paper Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const topImg = new Image();
    let isStarted = false;
    let animId;
    let time = 0;

    // Array of creeping burning fire centers
    let ignitions = [];
    let sparks = [];

    // Reset paper function exposed to button
    resetTriggerRef.current = () => {
      ignitions = [];
      sparks = [];
    };

    // Jagged organic burn contour simulation (procedural paper fiber burning)
    const getBurnContour = (baseRadius, angle, seed, t) => {
      return baseRadius + 
        Math.sin(angle * 6 + seed) * (baseRadius * 0.12 + 6) + 
        Math.cos(angle * 14 + seed * 1.5) * (baseRadius * 0.08 + 4) + 
        Math.sin(angle * 22 + t * 2) * 3;
    };

    // Spawn a creeping fire at (x, y)
    const igniteAt = (x, y) => {
      // Avoid spawning too many fires in the same spot
      for (const ig of ignitions) {
        if (Math.hypot(ig.x - x, ig.y - y) < 40 && ig.radius < 60) return;
      }

      ignitions.push({
        x,
        y,
        radius: 4,
        maxRadius: 260 + Math.random() * 80,
        speed: 0.55 + Math.random() * 0.35, // Slow, realistic creeping burn speed
        seed: Math.random() * 80,
        active: true
      });
    };

    const handleCanvasClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      igniteAt(x, y);
    };

    const handleMouseMove = (e) => {
      // If mouse is moving over canvas, ignite along the path
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (e.buttons === 1 || Math.random() < 0.25) {
        igniteAt(x, y);
      }
    };

    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('mousemove', handleMouseMove);

    const start = () => {
      if (isStarted) return;
      isStarted = true;

      // Start with a gentle auto-ignite near center so it showcases immediately!
      igniteAt(230, 290);

      const width = canvas.width;
      const height = canvas.height;

      const render = () => {
        time += 0.04;

        // 1. Draw top intact anime paper layer
        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(topImg, 0, 0, width, height);

        // Update ignitions: expand creeping burn radius
        for (let i = 0; i < ignitions.length; i++) {
          const ig = ignitions[i];
          if (ig.radius < ig.maxRadius) {
            ig.radius += ig.speed;

            // Spawn rising sparks along the burning perimeter
            if (Math.random() < 0.5) {
              const sparkAngle = Math.random() * Math.PI * 2;
              const r = getBurnContour(ig.radius, sparkAngle, ig.seed, time);
              sparks.push({
                x: ig.x + Math.cos(sparkAngle) * r,
                y: ig.y + Math.sin(sparkAngle) * r,
                vx: (Math.random() - 0.5) * 2.2,
                vy: -Math.random() * 3.0 - 1.2, // Float upwards
                size: Math.random() * 2.5 + 1.2,
                color: Math.random() > 0.4 ? '#FFA500' : (Math.random() > 0.5 ? '#FF4500' : '#FFF090'),
                life: 1.0,
                decay: 0.035 + Math.random() * 0.025
              });
            }
          }
        }

        // 2. STAGE 1: Scorched Brown Heat Ring (before paper burns away)
        for (let i = 0; i < ignitions.length; i++) {
          const ig = ignitions[i];
          const points = 44;

          // Scorched toasted brown fiber ring
          ctx.save();
          ctx.beginPath();
          for (let p = 0; p <= points; p++) {
            const angle = (p / points) * Math.PI * 2;
            const r = getBurnContour(ig.radius + 16, angle, ig.seed, time);
            const px = ig.x + Math.cos(angle) * r;
            const py = ig.y + Math.sin(angle) * r;
            if (p === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.strokeStyle = 'rgba(65, 30, 10, 0.7)';
          ctx.lineWidth = 14;
          ctx.stroke();

          // Black Charred Carbon Ash Edge
          ctx.beginPath();
          for (let p = 0; p <= points; p++) {
            const angle = (p / points) * Math.PI * 2;
            const r = getBurnContour(ig.radius + 6, angle, ig.seed, time);
            const px = ig.x + Math.cos(angle) * r;
            const py = ig.y + Math.sin(angle) * r;
            if (p === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.strokeStyle = 'rgba(12, 6, 4, 0.95)';
          ctx.lineWidth = 8;
          ctx.stroke();
          ctx.restore();
        }

        // 3. STAGE 2: Burn Away the Paper inside the hole using destination-out!
        ctx.globalCompositeOperation = 'destination-out';

        for (let i = 0; i < ignitions.length; i++) {
          const ig = ignitions[i];
          const points = 44;

          ctx.fillStyle = '#000000';
          ctx.beginPath();
          for (let p = 0; p <= points; p++) {
            const angle = (p / points) * Math.PI * 2;
            const r = getBurnContour(ig.radius, angle, ig.seed, time);
            const px = ig.x + Math.cos(angle) * r;
            const py = ig.y + Math.sin(angle) * r;
            if (p === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
        }

        // 4. STAGE 3: Creeping Glowing Ember Fire Line (The blazing fire rim)
        ctx.globalCompositeOperation = 'source-over';

        for (let i = 0; i < ignitions.length; i++) {
          const ig = ignitions[i];
          const points = 44;

          // Glowing Fiery Orange & Red Ember Rim
          ctx.save();
          ctx.shadowColor = '#FF3B00';
          ctx.shadowBlur = 18;
          ctx.beginPath();
          for (let p = 0; p <= points; p++) {
            const angle = (p / points) * Math.PI * 2;
            const r = getBurnContour(ig.radius + 1.5, angle, ig.seed, time);
            const px = ig.x + Math.cos(angle) * r;
            const py = ig.y + Math.sin(angle) * r;
            if (p === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.strokeStyle = '#FF5500';
          ctx.lineWidth = 4;
          ctx.stroke();

          // Intense Golden Hot Core Fire Line
          ctx.shadowColor = '#FFD700';
          ctx.shadowBlur = 9;
          ctx.strokeStyle = '#FFF090';
          ctx.lineWidth = 1.8;
          ctx.stroke();
          ctx.restore();
        }

        // 5. STAGE 4: Flying Rising Heat Sparks
        for (let i = sparks.length - 1; i >= 0; i--) {
          const spk = sparks[i];
          spk.x += spk.vx;
          spk.y += spk.vy;
          spk.life -= spk.decay;

          if (spk.life <= 0) {
            sparks.splice(i, 1);
            continue;
          }

          ctx.save();
          ctx.shadowColor = spk.color;
          ctx.shadowBlur = 8;
          ctx.fillStyle = spk.color;
          ctx.globalAlpha = spk.life;
          ctx.beginPath();
          ctx.arc(spk.x, spk.y, spk.size * spk.life, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        animId = requestAnimationFrame(render);
      };

      render();
    };

    topImg.onload = start;
    topImg.src = '/assets/anime_layer.png';
    if (topImg.complete) {
      start();
    }

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('click', handleCanvasClick);
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const handleResetPaper = () => {
    if (resetTriggerRef.current) {
      resetTriggerRef.current();
    }
  };

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

      {/* 2. Immersive Hero Viewport (Creeping Smolder Burning Paper) */}
      <main className="hero-viewport">
        <div className="art-stage-wrapper">
          {/* Base Layer: Real Photo Underneath */}
          <div className="base-photo-layer">
            <img 
              src="/assets/real_layer.jpg" 
              alt="Real Face" 
              className="stage-img"
            />
          </div>

          {/* Top Layer: Creeping Smolder Burning Paper Canvas */}
          <canvas 
            ref={canvasRef} 
            width={460} 
            height={680} 
            className="burning-paper-canvas"
          />
        </div>

        {/* Minimal Controls beneath the artwork */}
        <div className="burning-controls-dock">
          <span className="dock-hint">🔥 Click / Drag anywhere on artwork to ignite paper</span>
          <button onClick={handleResetPaper} className="reset-paper-btn">
            ↺ Reset Paper
          </button>
        </div>
      </main>

      {/* Demo Scroll Content to test Navbar Auto-Hide */}
      <section id="about" className="scroll-demonstration-zone">
        <div className="minimal-zone-content">
          <span className="tiny-label">// SCROLL TEST ZONE</span>
          <p className="minimal-instruction">
            Scroll down to watch the transparent navbar automatically vanish.
            Scroll up to make it glide back.
          </p>
        </div>
      </section>
    </div>
  );
}
