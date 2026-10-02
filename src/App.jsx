import React, { useState, useEffect, useRef } from 'react';
import { Flame, Sparkles, RotateCcw } from 'lucide-react';
import './index.css';

export default function App() {
  const [navVisible, setNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [burnMode, setBurnMode] = useState('reveal'); // 'reveal' (permanent burn) or 'torch' (hover spotlight)

  const canvasRef = useRef(null);
  const particlesCanvasRef = useRef(null);
  const burnMapCanvasRef = useRef(null);
  const resetBurnRef = useRef(null);

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

  // Main Living GPU WebGL Burning Paper Engine + Particle Spark Simulator
  useEffect(() => {
    const canvas = canvasRef.current;
    const pCanvas = particlesCanvasRef.current;
    if (!canvas || !pCanvas) return;

    const gl = canvas.getContext('webgl', { alpha: false, antialias: true, depth: false }) || 
               canvas.getContext('experimental-webgl');
    const pCtx = pCanvas.getContext('2d');
    if (!gl || !pCtx) {
      console.error('WebGL/Canvas not supported');
      return;
    }

    const W = canvas.width;
    const H = canvas.height;
    pCanvas.width = W;
    pCanvas.height = H;

    // Offscreen 2D Accumulation Canvas for Permanent Burn Trail
    const bCanvas = document.createElement('canvas');
    bCanvas.width = 512;
    bCanvas.height = 768;
    const bCtx = bCanvas.getContext('2d');
    bCtx.fillStyle = '#000000';
    bCtx.fillRect(0, 0, bCanvas.width, bCanvas.height);
    burnMapCanvasRef.current = bCanvas;

    // Reset function exposed
    resetBurnRef.current = () => {
      bCtx.fillStyle = '#000000';
      bCtx.fillRect(0, 0, bCanvas.width, bCanvas.height);
      // Spawn bursting ash embers
      for (let i = 0; i < 45; i++) {
        sparks.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 5,
          vy: -Math.random() * 4 - 1.5,
          size: Math.random() * 2.8 + 1.2,
          life: 1.0,
          decay: Math.random() * 0.02 + 0.015,
          heat: 1.0
        });
      }
    };

    // Vertex Shader: Fullscreen Quad with correct UV mapping
    const vsSource = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = (a_position + 1.0) * 0.5;
        v_uv.y = 1.0 - v_uv.y;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    // Fragment Shader: High-Fidelity Living Burning Paper Simulation
    const fsSource = `
      precision highp float;
      uniform sampler2D u_top;
      uniform sampler2D u_bottom;
      uniform sampler2D u_burnMap;
      uniform vec2 u_mouse;
      uniform float u_radius;
      uniform float u_aspect;
      uniform float u_hover;
      uniform float u_time;
      uniform int u_mode; // 0 = reveal (persistent map), 1 = torch (spotlight)
      varying vec2 v_uv;

      // 2D Simplex Noise
      vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
      float snoise(vec2 v){
        const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                 -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy) );
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod(i, 289.0);
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
        + i.x + vec3(0.0, i1.x, 1.0 ));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
          dot(x12.zw,x12.zw)), 0.0);
        m = m*m ;
        m = m*m ;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      // Domain Warped Fractal Brownian Motion for authentic shredded paper fibers
      float fbm(vec2 p) {
        float f = 0.0;
        f += 0.5000 * snoise(p); p *= 2.04;
        f += 0.2500 * snoise(p); p *= 2.03;
        f += 0.1250 * snoise(p); p *= 2.01;
        f += 0.0625 * snoise(p);
        return f;
      }

      // High-frequency cellular paper grain
      float fiberGrain(vec2 p) {
        vec2 q = vec2(fbm(p + vec2(0.0, 0.0)), fbm(p + vec2(5.2, 1.3)));
        vec2 r = vec2(fbm(p + 4.0 * q + vec2(1.7, 9.2)), fbm(p + 4.0 * q + vec2(8.3, 2.8)));
        return fbm(p + 4.0 * r);
      }

      // Distortion-free cover UV calculation
      vec2 coverUV(vec2 uv, vec2 imgSize, vec2 canvasSize) {
        float imgAspect = imgSize.x / imgSize.y;
        float canvasAspect = canvasSize.x / canvasSize.y;
        vec2 scale = vec2(1.0);
        vec2 offset = vec2(0.0);
        if (canvasAspect > imgAspect) {
          scale = vec2(1.0, imgAspect / canvasAspect);
          offset = vec2(0.0, (1.0 - scale.y) * 0.5);
        } else {
          scale = vec2(canvasAspect / imgAspect, 1.0);
          offset = vec2((1.0 - scale.x) * 0.5, 0.0);
        }
        return uv * scale + offset;
      }

      void main() {
        vec2 uv = v_uv;
        vec2 canvasSize = vec2(460.0, 680.0);
        vec2 topSize = vec2(576.0, 1024.0);
        vec2 bottomSize = vec2(800.0, 1200.0);

        vec2 uvTop = coverUV(uv, topSize, canvasSize);
        vec2 uvBottom = coverUV(uv, bottomSize, canvasSize);

        // Distance from active hover cursor
        vec2 diff = uv - u_mouse;
        diff.y *= u_aspect;
        float dist = length(diff);

        // Determine base burn amount
        float burnStrength = 0.0;

        if (u_mode == 0) {
          // Reveal Mode: Read from persistent accumulation burn map + active hover tip
          float mapVal = texture2D(u_burnMap, uv).r;
          float activeTip = (1.0 - smoothstep(0.0, u_radius * 0.85, dist)) * u_hover;
          burnStrength = max(mapVal, activeTip);
        } else {
          // Torch Mode: Follows hover position dynamically
          burnStrength = (1.0 - smoothstep(0.0, u_radius, dist)) * u_hover;
        }

        // If no burn anywhere, render pristine paper artwork
        if (burnStrength <= 0.001) {
          gl_FragColor = texture2D(u_top, uvTop);
          return;
        }

        // Rising Heat Mirage Refraction Wave
        vec2 heatRefraction = vec2(
          sin(u_time * 8.0 + uv.y * 30.0),
          cos(u_time * 6.5 + uv.x * 25.0)
        ) * 0.0035 * smoothstep(0.0, 0.6, burnStrength);

        vec4 topColor = texture2D(u_top, uvTop + heatRefraction);
        vec4 bottomColor = texture2D(u_bottom, uvBottom);

        // Organic fibrous paper fiber noise with domain-warped cellulose threads
        float paperFibers = fiberGrain(uv * 14.0 + vec2(0.0, u_time * 0.015)) * 0.5 + 0.5;

        // Temporal smolder flicker (living breathing ember crackle)
        float smolderFlicker = (sin(u_time * 14.0 + uv.x * 40.0) * 0.04) + 
                               (cos(u_time * 26.0 + uv.y * 35.0) * 0.03);

        // Organic burn calculation
        float burnProgress = burnStrength * 1.45 - (1.0 - paperFibers) * 0.38 + smolderFlicker;

        // ZONE 1: Burnt Away Hole (Reveals underlying photo with 3D curled paper shadow)
        if (burnProgress > 0.82) {
          // Ambient occlusion drop shadow cast by curled paper edge
          float edgeDist = burnProgress - 0.82;
          float shadow = smoothstep(0.0, 0.12, edgeDist);
          vec3 curledShadowed = mix(bottomColor.rgb * 0.38, bottomColor.rgb, shadow);
          gl_FragColor = vec4(curledShadowed, 1.0);
        }
        // ZONE 2: Incandescent Glowing Ember Fireline (Living, crackling white-gold to orange-red heat)
        else if (burnProgress > 0.68) {
          float t = (burnProgress - 0.68) / 0.14;
          // Temporal heat breathing pulse
          float pulse = 1.4 + sin(u_time * 11.0 + uv.x * 25.0) * 0.35 + cos(u_time * 19.0) * 0.25;
          // Micro-crackle sparkle along the ember rim
          float crackle = step(0.85, fract(sin(dot(uv + vec2(u_time * 0.1), vec2(12.9898, 78.233))) * 43758.5453)) * 0.4;
          
          // Color ramp: Deep Blood Crimson -> Blazing Cadmium Orange -> Radiant Incandescent Gold -> White-Hot Core
          vec3 emberDeep = vec3(0.9, 0.12, 0.02);
          vec3 emberGold = vec3(1.0, 0.82, 0.25);
          vec3 emberWhite = vec3(1.3, 1.25, 1.1);

          vec3 emberColor = mix(emberDeep, emberGold, t);
          emberColor = mix(emberColor, emberWhite, smoothstep(0.7, 1.0, t) + crackle);
          emberColor *= pulse;

          gl_FragColor = vec4(emberColor, 1.0);
        }
        // ZONE 3: Charred Carbon Ash Edge (Brittle black charcoal with burnt fiber flecks)
        else if (burnProgress > 0.52) {
          float t = (burnProgress - 0.52) / 0.16;
          vec3 carbonBlack = vec3(0.035, 0.02, 0.015);
          vec3 emberSmolder = vec3(0.75, 0.15, 0.02);
          vec3 charred = mix(carbonBlack, emberSmolder, pow(t, 2.5) * 0.8);
          gl_FragColor = vec4(charred, 1.0);
        }
        // ZONE 4: Scorched Toasted Brown Ring (Thermal cellulose degradation)
        else if (burnProgress > 0.36) {
          float t = (burnProgress - 0.36) / 0.16;
          vec3 scorchColor = vec3(0.28, 0.14, 0.06);
          vec3 toastedPaper = mix(topColor.rgb * 0.72, scorchColor, t);
          gl_FragColor = vec4(toastedPaper, 1.0);
        }
        // ZONE 5: Pristine Unburnt Paper Layer
        else {
          gl_FragColor = topColor;
        }
      }
    `;

    // Shader compilation helpers
    const createShader = (gl, type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Quad Buffer
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Uniform Locations
    const uTopLoc = gl.getUniformLocation(program, 'u_top');
    const uBottomLoc = gl.getUniformLocation(program, 'u_bottom');
    const uBurnMapLoc = gl.getUniformLocation(program, 'u_burnMap');
    const uMouseLoc = gl.getUniformLocation(program, 'u_mouse');
    const uRadiusLoc = gl.getUniformLocation(program, 'u_radius');
    const uAspectLoc = gl.getUniformLocation(program, 'u_aspect');
    const uHoverLoc = gl.getUniformLocation(program, 'u_hover');
    const uTimeLoc = gl.getUniformLocation(program, 'u_time');
    const uModeLoc = gl.getUniformLocation(program, 'u_mode');

    gl.uniform1i(uTopLoc, 0);
    gl.uniform1i(uBottomLoc, 1);
    gl.uniform1i(uBurnMapLoc, 2);
    gl.uniform1f(uRadiusLoc, 0.22);
    gl.uniform1f(uAspectLoc, H / W);

    // Texture creation helper
    const createTexture = (unit, source) => {
      const tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      return tex;
    };

    let topTexReady = false;
    let bottomTexReady = false;

    const topImg = new Image();
    const bottomImg = new Image();

    topImg.onload = () => {
      createTexture(0, topImg);
      topTexReady = true;
    };
    topImg.src = '/assets/anime_layer.png';
    if (topImg.complete) {
      createTexture(0, topImg);
      topTexReady = true;
    }

    bottomImg.onload = () => {
      createTexture(1, bottomImg);
      bottomTexReady = true;
    };
    bottomImg.src = '/assets/real_layer.jpg';
    if (bottomImg.complete) {
      createTexture(1, bottomImg);
      bottomTexReady = true;
    }

    // Dynamic Burn Map Texture (Unit 2)
    const burnTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, burnTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bCanvas);

    // Particle Sparks System
    const sparks = [];
    const maxSparks = 90;

    const spawnSpark = (x, y, speedMult = 1.0) => {
      if (sparks.length >= maxSparks) return;
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 2.2 + 0.8) * speedMult;
      sparks.push({
        x: x + (Math.random() - 0.5) * 24,
        y: y + (Math.random() - 0.5) * 24,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (Math.random() * 2.2 + 1.2), // Rising thermal draft
        size: Math.random() * 2.4 + 1.0,
        life: 1.0,
        decay: Math.random() * 0.022 + 0.014,
        heat: Math.random() * 0.4 + 0.6
      });
    };

    // Cursor tracking
    let targetMouse = { x: 0.5, y: 0.5 };
    let currentMouse = { x: 0.5, y: 0.5 };
    let lastMousePos = { x: 0.5, y: 0.5 };
    let isHovered = false;
    let hoverAmount = 0.0;
    let animId;
    let clock = 0;
    let burnDirty = false;

    // Stamp burn spot into accumulation map
    const stampBurn = (nx, ny, radius = 45) => {
      const bx = nx * bCanvas.width;
      const by = ny * bCanvas.height;

      const grad = bCtx.createRadialGradient(bx, by, 0, bx, by, radius);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
      grad.addColorStop(0.55, 'rgba(255, 255, 255, 0.9)');
      grad.addColorStop(0.85, 'rgba(255, 255, 255, 0.4)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');

      bCtx.fillStyle = grad;
      bCtx.beginPath();
      bCtx.arc(bx, by, radius, 0, Math.PI * 2);
      bCtx.fill();
      burnDirty = true;
    };

    // Main 60FPS Render Loop
    const renderLoop = () => {
      clock += 0.035;

      // Smooth cursor lerp
      currentMouse.x += (targetMouse.x - currentMouse.x) * 0.18;
      currentMouse.y += (targetMouse.y - currentMouse.y) * 0.18;
      hoverAmount += ((isHovered ? 1.0 : 0.0) - hoverAmount) * 0.12;

      // Mouse velocity
      const dx = (currentMouse.x - lastMousePos.x) * W;
      const dy = (currentMouse.y - lastMousePos.y) * H;
      const speed = Math.sqrt(dx * dx + dy * dy);
      lastMousePos.x = currentMouse.x;
      lastMousePos.y = currentMouse.y;

      // If hovered in reveal mode, continuously stamp burn into canvas
      if (isHovered && burnMode === 'reveal') {
        const burnRadius = Math.min(58, Math.max(34, 38 + speed * 0.6));
        stampBurn(currentMouse.x, currentMouse.y, burnRadius);

        // Spawn dynamic sparks along the burning cursor
        const sparkRate = Math.min(5, Math.max(1, Math.floor(speed * 0.3) + 1));
        for (let i = 0; i < sparkRate; i++) {
          spawnSpark(currentMouse.x * W, currentMouse.y * H, 1.0 + speed * 0.05);
        }
      } else if (isHovered && burnMode === 'torch') {
        // In torch mode, spawn embers around current spot
        if (Math.random() < 0.6) {
          spawnSpark(currentMouse.x * W, currentMouse.y * H, 0.8);
        }
      }

      // Update WebGL burn texture if modified
      if (burnDirty) {
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, burnTexture);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, bCanvas);
        burnDirty = false;
      }

      // Render WebGL Shader
      if (topTexReady && bottomTexReady) {
        gl.viewport(0, 0, W, H);
        gl.uniform2f(uMouseLoc, currentMouse.x, currentMouse.y);
        gl.uniform1f(uHoverLoc, hoverAmount);
        gl.uniform1f(uTimeLoc, clock);
        gl.uniform1i(uModeLoc, burnMode === 'reveal' ? 0 : 1);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      // Render Particle Canvas (Floating Sparks & Embers)
      pCtx.clearRect(0, 0, W, H);
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx + Math.sin(clock * 4.0 + s.y * 0.05) * 0.6; // Heat turbulence
        s.y += s.vy;
        s.vy -= 0.04; // Rising updraft acceleration
        s.vx *= 0.98; // Air resistance
        s.life -= s.decay;

        if (s.life <= 0 || s.y < -20 || s.x < -20 || s.x > W + 20) {
          sparks.splice(i, 1);
          continue;
        }

        // Color transition based on life & heat
        const alpha = Math.min(1.0, s.life * 1.5);
        let r = 255, g = 180, b = 50;
        if (s.life > 0.65) {
          // White-hot gold spark
          r = 255; g = Math.floor(220 * s.heat); b = Math.floor(130 * s.heat);
        } else if (s.life > 0.3) {
          // Vivid fiery orange
          r = 255; g = Math.floor(95 * s.life); b = 15;
        } else {
          // Dying deep crimson cinder
          r = Math.floor(200 * s.life); g = 20; b = 10;
        }

        // Glow halo
        pCtx.save();
        pCtx.beginPath();
        pCtx.arc(s.x, s.y, s.size * 2.2, 0, Math.PI * 2);
        pCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.35})`;
        pCtx.fill();

        // Core bright ember
        pCtx.beginPath();
        pCtx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        pCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        pCtx.shadowColor = `rgb(${r}, ${g}, ${b})`;
        pCtx.shadowBlur = 8;
        pCtx.fill();
        pCtx.restore();
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      targetMouse.x = Math.max(0, Math.min(1, x));
      targetMouse.y = Math.max(0, Math.min(1, y));
      isHovered = true;
    };

    const handleMouseEnter = () => {
      isHovered = true;
    };

    const handleMouseLeave = () => {
      isHovered = false;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseenter', handleMouseEnter);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseenter', handleMouseEnter);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [burnMode]);

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

      {/* 2. Interactive Burning Paper Stage with Flying Embers */}
      <main className="hero-viewport">
        <div className="stage-outer-container">
          
          {/* Main Visual Artwork with Shader + Particle Overlay */}
          <div className="art-stage-wrapper">
            {/* GPU WebGL Burning Paper Canvas */}
            <canvas 
              ref={canvasRef} 
              width={460} 
              height={680} 
              className="burning-shader-canvas"
            />

            {/* Overlaid Particle Canvas for Flying Living Sparks & Ash */}
            <canvas 
              ref={particlesCanvasRef} 
              width={460} 
              height={680} 
              className="sparks-particle-canvas"
            />

            {/* Subtle Interactive Instruction Pill */}
            <div className="burn-interaction-hint">
              <Flame size={13} className="flame-pulse-icon" />
              <span>{burnMode === 'reveal' ? 'Hover & drag cursor to burn through paper' : 'Hover to guide glowing smolder torch'}</span>
            </div>
          </div>

          {/* Interactive Burning Paper Control Bar */}
          <div className="burn-controls-toolbar">
            <button 
              className={`mode-btn ${burnMode === 'reveal' ? 'active-mode' : ''}`}
              onClick={() => setBurnMode('reveal')}
              title="Permanently burn through paper revealing the portrait beneath"
            >
              <Flame size={14} />
              <span>Burn to Reveal</span>
            </button>

            <button 
              className={`mode-btn ${burnMode === 'torch' ? 'active-mode' : ''}`}
              onClick={() => setBurnMode('torch')}
              title="Dynamic glowing heat torch following cursor"
            >
              <Sparkles size={14} />
              <span>Torch Mode</span>
            </button>

            <button 
              className="mode-btn reset-btn"
              onClick={() => resetBurnRef.current && resetBurnRef.current()}
              title="Restore pristine paper sheet"
            >
              <RotateCcw size={14} />
              <span>Reset Sheet</span>
            </button>
          </div>

        </div>
      </main>

      {/* Minimal Scroll Demonstration Section */}
      <section id="about" className="scroll-demonstration-zone">
        <div className="minimal-zone-content">
          <span className="tiny-label">// MINIMAL PORTFOLIO 2026</span>
          <p className="minimal-instruction">
            Designed with living WebGL burning paper mechanics, organic cellulose fiber simulation, 
            heat convection spark particles, and curled drop shadows.
          </p>
        </div>
      </section>
    </div>
  );
}
