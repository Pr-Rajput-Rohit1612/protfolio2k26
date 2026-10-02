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

  // Broken Half-Centimeter Boxes Interactive Canvas Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const topImg = new Image();
    topImg.src = '/assets/anime_layer.png';

    let mouse = { x: -1000, y: -1000, active: false };
    let animId;
    let sparks = [];

    // Half centimeter in screen pixels is approx 18-20px
    const BOX_SIZE = 18;
    const BREAK_RADIUS = 110;

    // Track mouse coordinates on canvas
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;

      // Spawn random micro sparks on mouse move
      if (Math.random() < 0.6) {
        sparks.push({
          x: mouse.x + (Math.random() - 0.5) * BREAK_RADIUS * 1.2,
          y: mouse.y + (Math.random() - 0.5) * BREAK_RADIUS * 1.2,
          size: Math.random() * 3 + 1,
          color: Math.random() > 0.4 ? '#38BDF8' : '#FB7185',
          vx: (Math.random() - 0.5) * 3,
          vy: (Math.random() - 0.5) * 3,
          life: 1.0,
          decay: Math.random() * 0.05 + 0.03
        });
      }
    };

    const handleMouseLeave = () => {
      mouse.active = false;
      mouse.x = -1000;
      mouse.y = -1000;
    };

    topImg.onload = () => {
      // Set canvas dimensions matching container
      const width = canvas.width;
      const height = canvas.height;

      const cols = Math.ceil(width / BOX_SIZE);
      const rows = Math.ceil(height / BOX_SIZE);

      const render = () => {
        ctx.clearRect(0, 0, width, height);

        // Render each half-centimeter box
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const bx = c * BOX_SIZE;
            const by = r * BOX_SIZE;
            const centerX = bx + BOX_SIZE / 2;
            const centerY = by + BOX_SIZE / 2;

            const dist = Math.hypot(mouse.x - centerX, mouse.y - centerY);

            if (mouse.active && dist < BREAK_RADIUS) {
              // Normalized breakdown factor: 1.0 at center, 0.0 at radius edge
              const breakIntensity = 1 - (dist / BREAK_RADIUS);

              // Inside center: tile is completely dissolved/broken away
              if (breakIntensity > 0.65) {
                continue; // Don't draw top layer tile -> reveals bottom real photo!
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

              // Draw sparking neon box borders on broken pieces
              ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(56, 189, 248, 0.85)' : 'rgba(244, 63, 94, 0.85)';
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
      };

      render();
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      cancelAnimationFrame(animId);
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, []);

  return (
    <div className="portfolio-root">
      {/* 1. Ultra-clean Simple Transparent Navbar (Zero Background) */}
      <header className={`pure-navbar ${navVisible ? 'nav-visible' : 'nav-hidden'}`}>
        <div className="nav-container">
          <div className="nav-logo">
            <span>ROHIT</span>
          </div>

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
              GitHub â†—
            </a>
          </nav>
        </div>
      </header>

      {/* 2. Immersive Hero Stage (Clean, No Clutter Text) */}
      <main className="hero-viewport">
        <div className="art-stage-wrapper" ref={containerRef}>
          {/* Base Layer: Real Photo Underneath */}
          <div className="base-photo-layer">
            <img 
              src="/assets/real_layer.jpg" 
              alt="Real Face" 
              className="stage-img"
            />
          </div>

          {/* Top Layer: Broken Sparks Box Canvas (Destructible Half-cm squares) */}
          <canvas 
            ref={canvasRef} 
            width={460} 
            height={680} 
            className="sparks-breakout-canvas"
          />
        </div>
      </main>

      {/* Minimalist Scroll Demonstration Area */}
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
