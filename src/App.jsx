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

  // Authentic Burning Paper Simulation Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const topImg = new Image();

    // Burn spots and rising sparks
    let burnSpots = [];
    let sparks = [];
    let flames = [];
    let mouse = { x: -1000, y: -1000, prevX: -1000, prevY: -1000, active: false };
    let animId;
    let time = 0;

    // Offscreen mask canvas for burning paper cutouts
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const maskCtx = maskCanvas.getContext('2d');

    // Procedural ragged torn/burned paper radius
    const getBurnRadius = (baseR, angle, seed) => {
      return baseR + 
        Math.sin(angle * 6 + seed) * 10 + 
        Math.cos(angle * 14 + seed * 1.5) * 6 + 
        Math.sin(angle * 22) * 3;
    };

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const dx = x - (mouse.prevX === -1000 ? x : mouse.prevX);
      const dy = y - (mouse.prevY === -1000 ? y : mouse.prevY);
      const dist = Math.hypot(dx, dy);

      mouse.x = x;
      mouse.y = y;
      mouse.prevX = x;
      mouse.prevY = y;
      mouse.active = true;

      // Spawn burn points along path
      const steps = Math.max(1, Math.min(6, Math.floor(dist / 10)));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const bx = x - dx * (1 - t) + (Math.random() - 0.5) * 6;
        const by = y - dy * (1 - t) + (Math.random() - 0.5) * 6;
        const radius = 64 + (Math.random() - 0.5) * 14;

        burnSpots.push({
          x: bx,
          y: by,
          radius: radius,
          seed: Math.random() * 40,
          life: 1.0,
          decay: 0.014 + Math.random() * 0.008
        });

        // Spawn flying burning sparks from the burning edge
        for (let s = 0; s < 3; s++) {
          const sparkAngle = Math.random() * Math.PI * 2;
          const sparkDist = radius * 0.9;
          sparks.push({
            x: bx + Math.cos(sparkAngle) * sparkDist,
            y: by + Math.sin(sparkAngle) * sparkDist,
            vx: (Math.random() - 0.5) * 2.5,
            vy: -Math.random() * 3.2 - 1.2, // Float upwards with heat
            size: Math.random() * 2.8 + 1.2,
            color: Math.random() > 0.4 ? '#FFA500' : (Math.random() > 0.5 ? '#FF4500' : '#FFF275'),
            life: 1.0,
            decay: Math.random() * 0.035 + 0.02
          });
        }

        // Spawn little flame tongues licking around the burn rim
        if (Math.random() < 0.7) {
          const flameAngle = Math.random() * Math.PI * 2;
          flames.push({
            x: bx + Math.cos(flameAngle) * (radius * 0.95),
            y: by + Math.sin(flameAngle) * (radius * 0.95),
            radius: Math.random() * 12 + 6,
            life: 1.0,
            decay: 0.08 + Math.random() * 0.05
          });
        }
      }
    };

    const handleMouseLeave = () => {
      mouse.active = false;
      mouse.x = -1000;
      mouse.y = -1000;
      mouse.prevX = -1000;
      mouse.prevY = -1000;
    };

    const startAnimation = () => {
      const width = canvas.width;
      const height = canvas.height;

      const render = () => {
        time += 0.045;

        // 1. Draw burning jagged cutout mask
        maskCtx.clearRect(0, 0, width, height);

        for (let i = burnSpots.length - 1; i >= 0; i--) {
          const spot = burnSpots[i];
          spot.life -= spot.decay;

          if (spot.life <= 0) {
            burnSpots.splice(i, 1);
            continue;
          }

          const curRadius = spot.radius * (0.65 + spot.life * 0.35);

          // Draw ragged burnt paper hole
          maskCtx.fillStyle = '#FFFFFF';
          maskCtx.beginPath();
          const points = 32;
          for (let p = 0; p <= points; p++) {
            const angle = (p / points) * Math.PI * 2;
            const r = getBurnRadius(curRadius, angle, spot.seed + time);
            const px = spot.x + Math.cos(angle) * r;
            const py = spot.y + Math.sin(angle) * r;
            if (p === 0) maskCtx.moveTo(px, py);
            else maskCtx.lineTo(px, py);
          }
          maskCtx.closePath();
          maskCtx.fill();
        }

        // Active burn spot at current cursor position
        if (mouse.active && mouse.x > 0 && mouse.y > 0) {
          const activeR = 75 + Math.sin(time * 7) * 5;
          maskCtx.fillStyle = '#FFFFFF';
          maskCtx.beginPath();
          const points = 36;
          for (let p = 0; p <= points; p++) {
            const angle = (p / points) * Math.PI * 2;
            const r = getBurnRadius(activeR, angle, time * 2);
            const px = mouse.x + Math.cos(angle) * r;
            const py = mouse.y + Math.sin(angle) * r;
            if (p === 0) maskCtx.moveTo(px, py);
            else maskCtx.lineTo(px, py);
          }
          maskCtx.closePath();
          maskCtx.fill();
        }

        // 2. Render Main Display Canvas
        ctx.clearRect(0, 0, width, height);

        // A. Draw Top Anime Image (Paper layer)
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(topImg, 0, 0, width, height);

        // B. Burn Hole through paper layer using destination-out
        ctx.globalCompositeOperation = 'destination-out';
        ctx.drawImage(maskCanvas, 0, 0);

        // C. Draw Fiery Charred Embers & Flames along the Burnt Paper Edges
        ctx.globalCompositeOperation = 'source-over';

        const drawBurntEdge = (x, y, radius, seed, alpha) => {
          if (alpha <= 0.05) return;
          const points = 36;

          // 1. Charred Black Ash Edge (burnt paper carbon)
          ctx.save();
          ctx.beginPath();
          for (let p = 0; p <= points; p++) {
            const angle = (p / points) * Math.PI * 2;
            const r = getBurnRadius(radius + 5, angle, seed + time);
            const px = x + Math.cos(angle) * r;
            const py = y + Math.sin(angle) * r;
            if (p === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.strokeStyle = `rgba(20, 10, 8, ${Math.min(0.95, alpha)})`;
          ctx.lineWidth = 7;
          ctx.stroke();
          ctx.restore();

          // 2. Glowing Fiery Orange & Red Ember Rim
          ctx.save();
          ctx.shadowColor = '#FF3700';
          ctx.shadowBlur = 16;
          ctx.beginPath();
          for (let p = 0; p <= points; p++) {
            const angle = (p / points) * Math.PI * 2;
            const r = getBurnRadius(radius + 1.5, angle, seed + time);
            const px = x + Math.cos(angle) * r;
            const py = y + Math.sin(angle) * r;
            if (p === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.strokeStyle = `rgba(255, 75, 0, ${alpha})`;
          ctx.lineWidth = 3.5;
          ctx.stroke();

          // 3. Blazing Golden Heat Crests
          ctx.shadowColor = '#FFD700';
          ctx.shadowBlur = 9;
          ctx.strokeStyle = `rgba(255, 235, 130, ${alpha * 0.9})`;
          ctx.lineWidth = 1.8;
          ctx.stroke();
          ctx.restore();
        };

        // Draw burnt edges for all burn spots
        for (let i = 0; i < burnSpots.length; i++) {
          const b = burnSpots[i];
          const curR = b.radius * (0.65 + b.life * 0.35);
          drawBurntEdge(b.x, b.y, curR, b.seed, b.life);
        }

        // Draw active burn edge at mouse
        if (mouse.active && mouse.x > 0 && mouse.y > 0) {
          const curR = 75 + Math.sin(time * 7) * 5;
          drawBurntEdge(mouse.x, mouse.y, curR, time * 2, 1.0);
        }

        // D. Draw little flame tongues
        for (let i = flames.length - 1; i >= 0; i--) {
          const fl = flames[i];
          fl.life -= fl.decay;
          fl.y -= 1.2;

          if (fl.life <= 0) {
            flames.splice(i, 1);
            continue;
          }

          ctx.save();
          ctx.shadowColor = '#FF4500';
          ctx.shadowBlur = 10;
          ctx.fillStyle = `rgba(255, ${Math.floor(100 + fl.life * 140)}, 0, ${fl.life * 0.75})`;
          ctx.beginPath();
          ctx.arc(fl.x, fl.y, fl.radius * fl.life, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // E. Draw Rising Fiery Sparks
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
          ctx.shadowBlur = 7;
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

    // Robust image loading check
    topImg.onload = startAnimation;
    topImg.src = '/assets/anime_layer.png';
    if (topImg.complete) {
      startAnimation();
    }

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

      {/* 2. Immersive Hero Viewport (Burning Paper Reveal) */}
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

          {/* Top Layer: Burning Paper Canvas with Glowing Fire Embers */}
          <canvas 
            ref={canvasRef} 
            width={460} 
            height={680} 
            className="burning-paper-canvas"
          />
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
