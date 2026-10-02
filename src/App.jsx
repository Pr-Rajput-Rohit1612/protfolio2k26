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

  // Organic Fluid Liquid Mask Reveal Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const topImg = new Image();
    topImg.src = '/assets/anime_layer.png';

    // Fluid droplets buffer with organic fluid physics
    let fluidDrops = [];
    let mouse = { x: -1000, y: -1000, prevX: -1000, prevY: -1000, speed: 0, isMoving: false };
    let animId;
    let time = 0;

    // Offscreen mask canvas for fluid metaball rendering
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const maskCtx = maskCanvas.getContext('2d');

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
      mouse.speed = dist;
      mouse.isMoving = true;

      // Spawn organic fluid droplets along the cursor path
      const steps = Math.max(1, Math.min(8, Math.floor(dist / 8)));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const dropX = x - dx * (1 - t) + (Math.random() - 0.5) * 14;
        const dropY = y - dy * (1 - t) + (Math.random() - 0.5) * 14;
        const baseRadius = 60 + Math.min(50, dist * 0.9) + (Math.random() - 0.5) * 18;

        fluidDrops.push({
          x: dropX,
          y: dropY,
          vx: dx * 0.08 + (Math.random() - 0.5) * 2,
          vy: dy * 0.08 + (Math.random() - 0.5) * 2,
          radius: baseRadius,
          life: 1.0,
          decay: 0.015 + Math.random() * 0.012
        });
      }
    };

    const handleMouseLeave = () => {
      mouse.isMoving = false;
      mouse.x = -1000;
      mouse.y = -1000;
      mouse.prevX = -1000;
      mouse.prevY = -1000;
    };

    topImg.onload = () => {
      const width = canvas.width;
      const height = canvas.height;

      const render = () => {
        time += 0.035;

        // 1. Render organic fluid droplet simulation on the mask
        maskCtx.clearRect(0, 0, width, height);

        // Update each fluid drop with viscosity and surface-tension wobble
        for (let i = fluidDrops.length - 1; i >= 0; i--) {
          const drop = fluidDrops[i];
          drop.x += drop.vx;
          drop.y += drop.vy;
          drop.vx *= 0.94; // Viscous friction
          drop.vy *= 0.94;
          drop.life -= drop.decay;

          if (drop.life <= 0) {
            fluidDrops.splice(i, 1);
            continue;
          }

          // Liquid ripple wobble
          const wobble = Math.sin(time * 4 + i) * 6;
          const currentRadius = Math.max(10, drop.radius * (0.6 + drop.life * 0.4) + wobble);

          // Soft organic radial density for fluid blending
          const grad = maskCtx.createRadialGradient(
            drop.x, drop.y, currentRadius * 0.2,
            drop.x, drop.y, currentRadius
          );
          grad.addColorStop(0, `rgba(255, 255, 255, ${Math.min(1, drop.life * 1.6)})`);
          grad.addColorStop(0.75, `rgba(255, 255, 255, ${Math.min(0.9, drop.life)})`);
          grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

          maskCtx.fillStyle = grad;
          maskCtx.beginPath();
          maskCtx.arc(drop.x, drop.y, currentRadius, 0, Math.PI * 2);
          maskCtx.fill();
        }

        // Active fluid presence right at mouse cursor
        if (mouse.isMoving && mouse.x > 0 && mouse.y > 0) {
          const cursorRadius = 80 + Math.sin(time * 6) * 8;
          const cursorGrad = maskCtx.createRadialGradient(
            mouse.x, mouse.y, cursorRadius * 0.2,
            mouse.x, mouse.y, cursorRadius
          );
          cursorGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
          cursorGrad.addColorStop(0.8, 'rgba(255, 255, 255, 0.9)');
          cursorGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

          maskCtx.fillStyle = cursorGrad;
          maskCtx.beginPath();
          maskCtx.arc(mouse.x, mouse.y, cursorRadius, 0, Math.PI * 2);
          maskCtx.fill();
        }

        // 2. Composite onto primary display canvas
        ctx.clearRect(0, 0, width, height);

        // Draw top anime layer
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(topImg, 0, 0, width, height);

        // Fluid destination-out: melted liquid areas erase the top layer!
        ctx.globalCompositeOperation = 'destination-out';
        ctx.drawImage(maskCanvas, 0, 0);

        ctx.globalCompositeOperation = 'source-over';

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
      {/* 1. Pure Transparent Navbar (Zero Background, Name Removed) */}
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

      {/* 2. Immersive Hero Viewport (Clean, Liquid Fluid Reveal) */}
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

          {/* Top Layer: Fluid Liquid Melt Canvas */}
          <canvas 
            ref={canvasRef} 
            width={460} 
            height={680} 
            className="fluid-melt-canvas"
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
