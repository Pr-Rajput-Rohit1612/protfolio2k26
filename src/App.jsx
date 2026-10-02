import React, { useState, useEffect, useRef } from 'react';
import './index.css';

export default function App() {
  const [navVisible, setNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const canvasRef = useRef(null);

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

  // Bulletproof Direct Burning Paper Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const topImg = new Image();
    let isStarted = false;
    let animId;
    let time = 0;

    let mouse = { x: 230, y: 340, active: false };
    let burnSpots = [];
    let sparks = [];

    // Ragged procedural burning paper edge calculation
    const getBurnRadius = (baseR, angle, seed) => {
      return baseR + 
        Math.sin(angle * 5 + seed) * 11 + 
        Math.cos(angle * 12 + seed * 1.7) * 7 + 
        Math.sin(angle * 21) * 3;
    };

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      mouse.x = x;
      mouse.y = y;
      mouse.active = true;

      // Add a persistent burning burn spot along the path
      burnSpots.push({
        x,
        y,
        radius: 70 + (Math.random() - 0.5) * 16,
        seed: Math.random() * 30,
        life: 1.0,
        decay: 0.012
      });

      // Spawn fiery ember sparks
      for (let s = 0; s < 3; s++) {
        const sparkAngle = Math.random() * Math.PI * 2;
        const sparkDist = 65;
        sparks.push({
          x: x + Math.cos(sparkAngle) * sparkDist,
          y: y + Math.sin(sparkAngle) * sparkDist,
          vx: (Math.random() - 0.5) * 2.5,
          vy: -Math.random() * 3.5 - 1.0, // Float up with heat
          size: Math.random() * 3 + 1.2,
          color: Math.random() > 0.4 ? '#FFA500' : (Math.random() > 0.5 ? '#FF4500' : '#FFF070'),
          life: 1.0,
          decay: Math.random() * 0.04 + 0.02
        });
      }
    };

    const handleMouseEnter = () => {
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseenter', handleMouseEnter);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    const start = () => {
      if (isStarted) return;
      isStarted = true;

      const width = canvas.width;
      const height = canvas.height;

      const render = () => {
        time += 0.05;

        // 1. Draw intact Top Paper Layer
        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(topImg, 0, 0, width, height);

        // 2. Cut Burn Holes through Paper Layer using 'destination-out'
        ctx.globalCompositeOperation = 'destination-out';

        // Cut holes for lingering burn spots
        for (let i = burnSpots.length - 1; i >= 0; i--) {
          const b = burnSpots[i];
          b.life -= b.decay;

          if (b.life <= 0) {
            burnSpots.splice(i, 1);
            continue;
          }

          const curR = b.radius * (0.65 + b.life * 0.35);

          ctx.fillStyle = '#000000';
          ctx.beginPath();
          const points = 32;
          for (let p = 0; p <= points; p++) {
            const angle = (p / points) * Math.PI * 2;
            const r = getBurnRadius(curR, angle, b.seed + time);
            const px = b.x + Math.cos(angle) * r;
            const py = b.y + Math.sin(angle) * r;
            if (p === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
        }

        // Active burning hole at current mouse cursor
        if (mouse.active) {
          const activeR = 76 + Math.sin(time * 7) * 6;
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          const points = 36;
          for (let p = 0; p <= points; p++) {
            const angle = (p / points) * Math.PI * 2;
            const r = getBurnRadius(activeR, angle, time * 2);
            const px = mouse.x + Math.cos(angle) * r;
            const py = mouse.y + Math.sin(angle) * r;
            if (p === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
        }

        // 3. Draw Fiery Glowing Charcoal & Fire Embers around the Burn Rim
        ctx.globalCompositeOperation = 'source-over';

        const drawFieryRim = (x, y, radius, seed, alpha) => {
          if (alpha <= 0.05) return;
          const points = 36;

          // A. Charred Black Ash (Burnt Carbon Edge)
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
          ctx.strokeStyle = `rgba(18, 8, 6, ${Math.min(0.95, alpha)})`;
          ctx.lineWidth = 8;
          ctx.stroke();
          ctx.restore();

          // B. Glowing Fire Embers (Blazing Orange/Red Fire)
          ctx.save();
          ctx.shadowColor = '#FF3700';
          ctx.shadowBlur = 18;
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
          ctx.strokeStyle = `rgba(255, 80, 0, ${alpha})`;
          ctx.lineWidth = 4;
          ctx.stroke();

          // C. Golden Hot Heat Highlight
          ctx.shadowColor = '#FFD700';
          ctx.shadowBlur = 8;
          ctx.strokeStyle = `rgba(255, 235, 120, ${alpha * 0.95})`;
          ctx.lineWidth = 1.8;
          ctx.stroke();
          ctx.restore();
        };

        // Render fiery rims for burn spots
        for (let i = 0; i < burnSpots.length; i++) {
          const b = burnSpots[i];
          const curR = b.radius * (0.65 + b.life * 0.35);
          drawFieryRim(b.x, b.y, curR, b.seed, b.life);
        }

        // Render fiery rim at active mouse
        if (mouse.active) {
          const activeR = 76 + Math.sin(time * 7) * 6;
          drawFieryRim(mouse.x, mouse.y, activeR, time * 2, 1.0);
        }

        // 4. Render Rising Heat Sparks
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
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseenter', handleMouseEnter);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
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
        <div className="art-stage-wrapper">
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
