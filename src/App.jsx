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

  // Burning Paper with Glowing Embers and Sparks Simulation Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const topImg = new Image();
    topImg.src = '/assets/anime_layer.png';

    // Burn tracks and flying ember sparks
    let burnHoles = [];
    let emberParticles = [];
    let mouse = { x: -1000, y: -1000, prevX: -1000, prevY: -1000, isOver: false };
    let animId;
    let time = 0;

    // Offscreen mask canvas for organic jagged burned paper cutouts
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const maskCtx = maskCanvas.getContext('2d');

    // Generate ragged procedural noise for paper burning edge
    const getBurnRadius = (baseRadius, angle, seed) => {
      return baseRadius + 
        Math.sin(angle * 7 + seed) * 8 + 
        Math.cos(angle * 13 + seed * 2) * 5 + 
        Math.sin(angle * 23) * 3;
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
      mouse.isOver = true;

      // Spawn burning spots along mouse track
      const steps = Math.max(1, Math.min(6, Math.floor(dist / 12)));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const bx = x - dx * (1 - t) + (Math.random() - 0.5) * 8;
        const by = y - dy * (1 - t) + (Math.random() - 0.5) * 8;
        const radius = 68 + (Math.random() - 0.5) * 16;

        burnHoles.push({
          x: bx,
          y: by,
          radius: radius,
          seed: Math.random() * 50,
          life: 1.0,
          decay: 0.012 + Math.random() * 0.008
        });

        // Spawn flying burning sparks / embers from paper burn line
        for (let p = 0; p < 3; p++) {
          const sparkAngle = Math.random() * Math.PI * 2;
          const sparkDist = radius * 0.95;
          emberParticles.push({
            x: bx + Math.cos(sparkAngle) * sparkDist,
            y: by + Math.sin(sparkAngle) * sparkDist,
            vx: (Math.random() - 0.5) * 2.2,
            vy: -Math.random() * 2.8 - 1.2, // Float upwards like heat sparks
            size: Math.random() * 2.6 + 1.2,
            color: Math.random() > 0.4 ? '#FFA500' : (Math.random() > 0.5 ? '#FF4500' : '#FFF0A0'),
            life: 1.0,
            decay: Math.random() * 0.035 + 0.02
          });
        }
      }
    };

    const handleMouseLeave = () => {
      mouse.isOver = false;
      mouse.x = -1000;
      mouse.y = -1000;
      mouse.prevX = -1000;
      mouse.prevY = -1000;
    };

    topImg.onload = () => {
      const width = canvas.width;
      const height = canvas.height;

      const render = () => {
        time += 0.04;

        // 1. Draw burning jagged cutout mask
        maskCtx.clearRect(0, 0, width, height);

        // Update burn holes
        for (let i = burnHoles.length - 1; i >= 0; i--) {
          const hole = burnHoles[i];
          hole.life -= hole.decay;

          if (hole.life <= 0) {
            burnHoles.splice(i, 1);
            continue;
          }

          const curRadius = hole.radius * (0.7 + hole.life * 0.3);

          // Draw organic ragged paper burn shape
          maskCtx.fillStyle = 'rgba(255, 255, 255, 1)';
          maskCtx.beginPath();
          const points = 32;
          for (let p = 0; p <= points; p++) {
            const angle = (p / points) * Math.PI * 2;
            const r = getBurnRadius(curRadius, angle, hole.seed + time);
            const px = hole.x + Math.cos(angle) * r;
            const py = hole.y + Math.sin(angle) * r;
            if (p === 0) maskCtx.moveTo(px, py);
            else maskCtx.lineTo(px, py);
          }
          maskCtx.closePath();
          maskCtx.fill();
        }

        // Active burn spot at current cursor position
        if (mouse.isOver && mouse.x > 0 && mouse.y > 0) {
          const activeRadius = 78 + Math.sin(time * 6) * 5;
          maskCtx.fillStyle = 'rgba(255, 255, 255, 1)';
          maskCtx.beginPath();
          const points = 36;
          for (let p = 0; p <= points; p++) {
            const angle = (p / points) * Math.PI * 2;
            const r = getBurnRadius(activeRadius, angle, time * 2);
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

        // C. Draw Fiery Charred Embers along the Burnt Paper Edges
        ctx.globalCompositeOperation = 'source-over';

        const drawEmberEdge = (x, y, radius, seed, alpha) => {
          if (alpha <= 0.05) return;
          const points = 36;

          // 1. Burnt Charred Ash Edge (Black Carbon)
          ctx.save();
          ctx.beginPath();
          for (let p = 0; p <= points; p++) {
            const angle = (p / points) * Math.PI * 2;
            const r = getBurnRadius(radius + 4, angle, seed + time);
            const px = x + Math.cos(angle) * r;
            const py = y + Math.sin(angle) * r;
            if (p === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.strokeStyle = `rgba(18, 12, 10, ${Math.min(0.9, alpha)})`;
          ctx.lineWidth = 6;
          ctx.stroke();
          ctx.restore();

          // 2. Fiery Burning Embers Line (Glowing Orange & Red Fire)
          ctx.save();
          ctx.shadowColor = '#FF3B00';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          for (let p = 0; p <= points; p++) {
            const angle = (p / points) * Math.PI * 2;
            const r = getBurnRadius(radius + 1, angle, seed + time);
            const px = x + Math.cos(angle) * r;
            const py = y + Math.sin(angle) * r;
            if (p === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.strokeStyle = `rgba(255, 90, 0, ${alpha})`;
          ctx.lineWidth = 3.5;
          ctx.stroke();

          // 3. Blazing Golden Sparks Highlight on fire crests
          ctx.shadowColor = '#FFD700';
          ctx.shadowBlur = 8;
          ctx.strokeStyle = `rgba(255, 230, 120, ${alpha * 0.9})`;
          ctx.lineWidth = 1.8;
          ctx.stroke();
          ctx.restore();
        };

        // Draw ember edges for active burn holes
        for (let i = 0; i < burnHoles.length; i++) {
          const h = burnHoles[i];
          const curR = h.radius * (0.7 + h.life * 0.3);
          drawEmberEdge(h.x, h.y, curR, h.seed, h.life);
        }

        // Draw active ember edge at mouse
        if (mouse.isOver && mouse.x > 0 && mouse.y > 0) {
          const curR = 78 + Math.sin(time * 6) * 5;
          drawEmberEdge(mouse.x, mouse.y, curR, time * 2, 1.0);
        }

        // D. Draw Flying Fiery Sparks rising from the fire
        for (let i = emberParticles.length - 1; i >= 0; i--) {
          const spk = emberParticles[i];
          spk.x += spk.vx;
          spk.y += spk.vy;
          spk.life -= spk.decay;

          if (spk.life <= 0) {
            emberParticles.splice(i, 1);
            continue;
          }

          ctx.save();
          ctx.shadowColor = spk.color;
          ctx.shadowBlur = 6;
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

          {/* Top Layer: Burning Paper Canvas with Fiery Embers */}
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
