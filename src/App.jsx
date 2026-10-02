import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Eye, EyeOff, Compass, 
  ArrowUpRight, Layers, Sliders, Move 
} from 'lucide-react';
import './index.css';

export default function App() {
  // Navigation auto-hide on scroll
  const [navVisible, setNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Spotlight mouse coordinates (relative to the image frame)
  const [mousePos, setMousePos] = useState({ x: 250, y: 350 });
  const [isHovered, setIsHovered] = useState(false);
  const [spotlightRadius, setSpotlightRadius] = useState(130);
  const [feather, setFeather] = useState(35);

  const frameRef = useRef(null);

  // Smart Navbar: disappears on scroll down, reappears on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > 40 && currentScrollY > lastScrollY) {
        // Scrolling down -> hide navbar
        setNavVisible(false);
      } else {
        // Scrolling up or at top -> show navbar
        setNavVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Track mouse over the avatar frame
  const handleMouseMove = (e) => {
    if (!frameRef.current) return;
    const rect = frameRef.current.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    setMousePos({ x, y });
  };

  // Mask string calculation
  // When hovered: circular cutout hole at cursor (transparent inside, opaque black outside)
  const maskStyle = isHovered
    ? {
        WebkitMaskImage: `radial-gradient(circle ${spotlightRadius}px at ${mousePos.x}px ${mousePos.y}px, transparent 0%, transparent ${Math.max(0, spotlightRadius - feather)}px, black ${spotlightRadius}px)`,
        maskImage: `radial-gradient(circle ${spotlightRadius}px at ${mousePos.x}px ${mousePos.y}px, transparent 0%, transparent ${Math.max(0, spotlightRadius - feather)}px, black ${spotlightRadius}px)`,
        transition: 'none'
      }
    : {
        WebkitMaskImage: 'none',
        maskImage: 'none',
        transition: 'mask-image 0.5s ease, -webkit-mask-image 0.5s ease'
      };

  return (
    <div className="app-container">
      {/* 1. Smart Auto-Hiding Navbar */}
      <header className={`smart-navbar ${navVisible ? 'nav-visible' : 'nav-hidden'}`}>
        <div className="nav-inner">
          <div className="nav-brand">
            <span className="brand-dot"></span>
            <span className="brand-name">ROHIT<span className="accent-text">.DEV</span></span>
          </div>

          <nav className="nav-links">
            <a href="#hero" className="nav-item active">Identity</a>
            <a href="#about" className="nav-item">About</a>
            <a href="#projects" className="nav-item">Projects</a>
            <a href="#skills" className="nav-item">Arsenal</a>
            <a href="#contact" className="nav-item">Contact</a>
          </nav>

          <div className="nav-actions">
            <a 
              href="https://github.com/Pr-Rajput-Rohit1612/protfolio2k26" 
              target="_blank" 
              rel="noreferrer" 
              className="github-pill-btn"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              <span>GitHub</span>
              <ArrowUpRight size={13} />
            </a>
          </div>
        </div>
      </header>

      {/* 2. Hero Stage: Spotlight Dual Identity Reveal */}
      <main id="hero" className="hero-stage">
        {/* Ambient Glow Orbs matching anime color palette */}
        <div className="ambient-glow glow-crimson"></div>
        <div className="ambient-glow glow-cyan"></div>

        <div className="hero-grid">
          {/* Left Column: Conceptual Storytelling & Controls */}
          <div className="hero-info-col">
            <div className="hero-badge">
              <Sparkles size={13} className="badge-icon" />
              <span>INTERACTIVE DUAL IDENTITY PROTOTYPE</span>
            </div>

            <h1 className="hero-title">
              The Persona <br />
              <span className="gradient-text">& The Architect</span> <br />
              Behind The Code.
            </h1>

            <p className="hero-desc">
              Beneath the artistic avatar lies the real engineer. Hover your cursor anywhere 
              over the artwork to reveal the person underneath in real time.
            </p>

            {/* Interactive Spotlight Controls */}
            <div className="spotlight-controls-card">
              <div className="controls-header">
                <div className="controls-title">
                  <Sliders size={15} />
                  <span>Spotlight Radius Dial</span>
                </div>
                <span className="radius-indicator">{spotlightRadius}px</span>
              </div>

              <input 
                type="range" 
                min="60" 
                max="220" 
                value={spotlightRadius}
                onChange={(e) => setSpotlightRadius(Number(e.target.value))}
                className="spotlight-slider"
              />

              <div className="quick-tips-row">
                <span className="tip-pill">
                  <Move size={12} />
                  <span>Move mouse over image</span>
                </span>
                <span className="tip-pill">
                  <Layers size={12} />
                  <span>Real-time CSS Mask</span>
                </span>
              </div>
            </div>

            <div className="hero-cta-row">
              <a href="#about" className="primary-cta-btn">
                <span>Test Scroll Down</span>
                <ArrowUpRight size={16} />
              </a>
              <button 
                onClick={() => setSpotlightRadius(spotlightRadius === 130 ? 190 : 130)} 
                className="secondary-cta-btn"
              >
                <span>{spotlightRadius > 150 ? 'Compact Beam' : 'Expand Beam'}</span>
              </button>
            </div>
          </div>

          {/* Right Column: The Spotlight Canvas Stage */}
          <div className="hero-avatar-col">
            <div 
              ref={frameRef}
              onMouseMove={handleMouseMove}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="avatar-viewport-frame"
            >
              {/* LAYER 1 (Bottom): Real Person Image */}
              <div className="layer-underlay">
                <img 
                  src="/assets/real_layer.jpg" 
                  alt="Real Identity" 
                  className="layer-img underlay-img"
                />
                <div className="underlay-watermark">
                  <span>REAL IDENTITY UNVEILED</span>
                </div>
              </div>

              {/* LAYER 2 (Top): Anime / Character Image (With Dynamic Hole Mask) */}
              <div 
                className="layer-overlay"
                style={maskStyle}
              >
                <img 
                  src="/assets/anime_layer.png" 
                  alt="Anime Character Persona" 
                  className="layer-img overlay-img"
                />
              </div>

              {/* Glowing Lens Ring Tracking Cursor */}
              {isHovered && (
                <div 
                  className="spotlight-lens-ring"
                  style={{
                    left: `${mousePos.x}px`,
                    top: `${mousePos.y}px`,
                    width: `${spotlightRadius * 2}px`,
                    height: `${spotlightRadius * 2}px`,
                  }}
                >
                  <div className="reticle-center-crosshair"></div>
                  <div className="reticle-pulse-halo"></div>
                </div>
              )}

              {/* Interactive Floating Hint */}
              {!isHovered && (
                <div className="hover-guide-pill">
                  <span className="pulse-beacon"></span>
                  <span>Hover to unmask identity</span>
                </div>
              )}

              {/* Coordinates HUD */}
              <div className="hud-telemetry-pill">
                <span>X: {mousePos.x}</span>
                <span className="hud-divider">|</span>
                <span>Y: {mousePos.y}</span>
                <span className="hud-divider">|</span>
                <span>STATE: {isHovered ? 'UNMASKED' : 'CONCEALED'}</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Demo Scroll Content to test Navbar Auto-Hide */}
      <section id="about" className="content-section">
        <div className="section-inner">
          <span className="section-tag">NAVBAR SCROLL BEHAVIOR</span>
          <h2 className="section-heading">Scroll down to see the Navbar disappear</h2>
          <p className="section-paragraph">
            Jaise hi aap thoda sa neeche scroll karenge, top navbar smoothly slide-up hokar gayab ho jayega.
            Aur jaise hi aap wapis upar scroll karenge, navbar turant smoothly wapis reveal ho jayega!
          </p>
        </div>
      </section>
    </div>
  );
}
