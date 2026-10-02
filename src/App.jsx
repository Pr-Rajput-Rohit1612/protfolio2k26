import React, { useState, useEffect, useRef } from 'react';
import { Flame, Sparkles, RotateCcw } from 'lucide-react';
import './index.css';

export default function App() {
  const [navVisible, setNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [burnMode, setBurnMode] = useState('reveal'); // 'reveal' or 'torch'

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

  // Main Photorealistic GPU WebGL Burning Paper & Upward-Licking Flame Simulation
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
      for (let i = 0; i < 50; i++) {
        sparks.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 5,
          vy: -Math.random() * 4 - 2,
          size: Math.random() * 2.6 + 1.0,
          life: 1.0,
          decay: Math.random() * 0.02 + 0.015,
          heat: 1.0
        });
      }
    };

    // Vertex Shader: Fullscreen Quad
    const vsSource = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = (a_position + 1.0) * 0.5;
        v_uv.y = 1.0 - v_uv.y;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    // Fragment Shader: High-Realism Upward Flame Licks, Jagged Cellulose Char & Glowing Embers
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
      uniform int u_mode; // 0 = reveal, 1 = torch
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

      // 4-Octave Fractal Brownian Motion
      float fbm(vec2 p) {
        float f = 0.0;
        f += 0.5000 * snoise(p); p *= 2.04;
        f += 0.2500 * snoise(p); p *= 2.03;
        f += 0.1250 * snoise(p); p *= 2.01;
        f += 0.0625 * snoise(p);
        return f;
      }

      // Cellulose paper fiber grain (cellular fissures)
      float paperGrain(vec2 p) {
        vec2 q = vec2(fbm(p), fbm(p + vec2(4.3, 1.7)));
        return fbm(p + 3.0 * q);
      }

      // Cover UV mapping
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
          float mapVal = texture2D(u_burnMap, uv).r;
          float activeTip = (1.0 - smoothstep(0.0, u_radius * 0.85, dist)) * u_hover;
          burnStrength = max(mapVal, activeTip);
        } else {
          burnStrength = (1.0 - smoothstep(0.0, u_radius, dist)) * u_hover;
        }

        // Pristine paper if no burn
        if (burnStrength <= 0.001) {
          gl_FragColor = texture2D(u_top, uvTop);
          return;
        }

        // 1. Upward Heat Convection & Refraction Mirage
        vec2 heatRefract = vec2(
          sin(u_time * 9.0 + uv.y * 36.0),
          cos(u_time * 7.5 + uv.x * 28.0)
        ) * 0.003 * smoothstep(0.0, 0.5, burnStrength);

        vec4 topColor = texture2D(u_top, uvTop + heatRefract);
        vec4 bottomColor = texture2D(u_bottom, uvBottom);

        // 2. Realistic Paper Fiber Tear Noise (Jagged fibrous cellulose edges)
        float fiber = paperGrain(uv * 18.0) * 0.5 + 0.5;
        float microFiber = snoise(uv * 65.0) * 0.08;

        // 3. Temporal Smolder Flicker (Deep breathing coals + micro-crackles)
        float deepBreath = sin(u_time * 7.0 + uv.x * 20.0) * 0.04;
        float crackleJitter = cos(u_time * 28.0 + uv.y * 40.0) * 0.025;
        float temporalFlicker = deepBreath + crackleJitter;

        // Combined burn progress
        float burnProgress = burnStrength * 1.5 - (1.0 - (fiber + microFiber)) * 0.42 + temporalFlicker;

        // 4. Upward Licking Pyrolysis Flame Tongues (Real combustion fire licking upwards)
        vec2 flameCoord = uv * vec2(18.0, 8.0);
        flameCoord.y += u_time * 3.5; // Fast upward convective velocity
        flameCoord.x += sin(u_time * 4.0 + uv.y * 12.0) * 0.5; // Turbulent sideways curl

        float flameNoise = fbm(flameCoord) * 0.5 + 0.5;
        // Flame only ignites right along the active smoldering boundary (burnProgress between 0.65 and 0.88)
        float flameZone = smoothstep(0.62, 0.74, burnProgress) * (1.0 - smoothstep(0.82, 0.95, burnProgress));
        float flameTongue = flameZone * pow(flameNoise, 1.8) * 1.8 * (0.8 + 0.4 * sin(u_time * 12.0));

        // ------------------ REALISTIC LAYER COMPOSITION ------------------

        // ZONE 1: Paper completely burned away (Reveals bottom photo)
        if (burnProgress > 0.83) {
          // Physical curling paper drop-shadow cast onto photo
          float shadowDist = burnProgress - 0.83;
          float shadowAmt = smoothstep(0.0, 0.10, shadowDist);
          vec3 shadowedPhoto = mix(bottomColor.rgb * 0.32, bottomColor.rgb, shadowAmt);

          // Subtle residual flame lick over revealed edge
          if (flameTongue > 0.15) {
            vec3 flameColor = mix(vec3(1.0, 0.35, 0.0), vec3(1.2, 0.9, 0.3), flameTongue);
            shadowedPhoto = mix(shadowedPhoto, flameColor, flameTongue * 0.5);
          }

          gl_FragColor = vec4(shadowedPhoto, 1.0);
        }
        // ZONE 2: Active Smoldering Fireline & Blazing Ember Ridge
        else if (burnProgress > 0.69) {
          float t = (burnProgress - 0.69) / 0.14;
          
          // Realistic combustion color spectrum:
          // Blood Crimson -> Vivid Cadmium Orange -> Radiant Fire Gold -> Incandescent White Core
          vec3 emberCrimson = vec3(0.85, 0.08, 0.01);
          vec3 emberOrange = vec3(1.0, 0.42, 0.04);
          vec3 emberGold = vec3(1.0, 0.85, 0.22);
          vec3 emberWhiteHot = vec3(1.4, 1.35, 1.15);

          vec3 emberCol;
          if (t < 0.45) {
            emberCol = mix(emberCrimson, emberOrange, t / 0.45);
          } else if (t < 0.82) {
            emberCol = mix(emberOrange, emberGold, (t - 0.45) / 0.37);
          } else {
            emberCol = mix(emberGold, emberWhiteHot, (t - 0.82) / 0.18);
          }

          // Pulsing living heat + micro crackle sparks
          float heatPulse = 1.35 + sin(u_time * 10.0 + uv.x * 30.0) * 0.35;
          emberCol *= heatPulse;

          // Add upward licking flame tongue
          if (flameTongue > 0.1) {
            vec3 tongueCol = mix(vec3(1.0, 0.2, 0.0), vec3(1.3, 1.1, 0.6), flameTongue);
            emberCol = max(emberCol, tongueCol);
          }

          gl_FragColor = vec4(emberCol, 1.0);
        }
        // ZONE 3: Charred Carbon Ash (Brittle black charcoal with crack fissures)
        else if (burnProgress > 0.53) {
          float t = (burnProgress - 0.53) / 0.16;
          vec3 deepCarbon = vec3(0.025, 0.015, 0.012);
          vec3 emberFibers = vec3(0.7, 0.12, 0.02);

          // Fine burnt paper cracks where ember peeks through
          float crack = step(0.78, snoise(uv * 90.0));
          vec3 charredAsh = mix(deepCarbon, emberFibers, pow(t, 3.0) * 0.75 + crack * 0.35);

          gl_FragColor = vec4(charredAsh, 1.0);
        }
        // ZONE 4: Scorched Brown Thermal Halo (Heated cellulose fibers)
        else if (burnProgress > 0.35) {
          float t = (burnProgress - 0.35) / 0.18;
          vec3 scorchUmber = vec3(0.24, 0.11, 0.04);
          vec3 toastedHalo = mix(topColor.rgb * 0.68, scorchUmber, t);

          // Paper curl specular highlight right on the edge of the scorch
          float curlHighlight = smoothstep(0.35, 0.40, burnProgress) * (1.0 - smoothstep(0.40, 0.46, burnProgress));
          toastedHalo += vec3(0.12, 0.09, 0.05) * curlHighlight;

          gl_FragColor = vec4(toastedHalo, 1.0);
        }
        // ZONE 5: Pristine Untouched Paper
        else {
          gl_FragColor = topColor;
        }
      }
    `;

    // Shader compilation
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

    // Dynamic Sparks System
    const sparks = [];
    const maxSparks = 100;

    const spawnSpark = (x, y, speedMult = 1.0) => {
      if (sparks.length >= maxSparks) return;
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 2.4 + 0.8) * speedMult;
      sparks.push({
        x: x + (Math.random() - 0.5) * 22,
        y: y + (Math.random() - 0.5) * 22,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (Math.random() * 2.5 + 1.5), // Upward heat buoyancy
        size: Math.random() * 2.2 + 0.9,
        life: 1.0,
        decay: Math.random() * 0.02 + 0.014,
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

    // Stamp burn spot
    const stampBurn = (nx, ny, radius = 45) => {
      const bx = nx * bCanvas.width;
      const by = ny * bCanvas.height;

      const grad = bCtx.createRadialGradient(bx, by, 0, bx, by, radius);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
      grad.addColorStop(0.55, 'rgba(255, 255, 255, 0.92)');
      grad.addColorStop(0.85, 'rgba(255, 255, 255, 0.45)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');

      bCtx.fillStyle = grad;
      bCtx.beginPath();
      bCtx.arc(bx, by, radius, 0, Math.PI * 2);
      bCtx.fill();
      burnDirty = true;
    };

    // 60FPS Render Loop
    const renderLoop = () => {
      clock += 0.035;

      currentMouse.x += (targetMouse.x - currentMouse.x) * 0.18;
      currentMouse.y += (targetMouse.y - currentMouse.y) * 0.18;
      hoverAmount += ((isHovered ? 1.0 : 0.0) - hoverAmount) * 0.12;

      const dx = (currentMouse.x - lastMousePos.x) * W;
      const dy = (currentMouse.y - lastMousePos.y) * H;
      const speed = Math.sqrt(dx * dx + dy * dy);
      lastMousePos.x = currentMouse.x;
      lastMousePos.y = currentMouse.y;

      if (isHovered && burnMode === 'reveal') {
        const burnRadius = Math.min(56, Math.max(34, 38 + speed * 0.55));
        stampBurn(currentMouse.x, currentMouse.y, burnRadius);

        const sparkRate = Math.min(6, Math.max(1, Math.floor(speed * 0.35) + 1));
        for (let i = 0; i < sparkRate; i++) {
          spawnSpark(currentMouse.x * W, currentMouse.y * H, 1.0 + speed * 0.06);
        }
      } else if (isHovered && burnMode === 'torch') {
        if (Math.random() < 0.65) {
          spawnSpark(currentMouse.x * W, currentMouse.y * H, 0.9);
        }
      }

      if (burnDirty) {
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, burnTexture);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, bCanvas);
        burnDirty = false;
      }

      if (topTexReady && bottomTexReady) {
        gl.viewport(0, 0, W, H);
        gl.uniform2f(uMouseLoc, currentMouse.x, currentMouse.y);
        gl.uniform1f(uHoverLoc, hoverAmount);
        gl.uniform1f(uTimeLoc, clock);
        gl.uniform1i(uModeLoc, burnMode === 'reveal' ? 0 : 1);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      // Render Floating Sparks & Cinders
      pCtx.clearRect(0, 0, W, H);
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx + Math.sin(clock * 4.5 + s.y * 0.06) * 0.65;
        s.y += s.vy;
        s.vy -= 0.045; // Rising thermal acceleration
        s.vx *= 0.98;
        s.life -= s.decay;

        if (s.life <= 0 || s.y < -20 || s.x < -20 || s.x > W + 20) {
          sparks.splice(i, 1);
          continue;
        }

        const alpha = Math.min(1.0, s.life * 1.6);
        let r = 255, g = 180, b = 50;
        if (s.life > 0.65) {
          r = 255; g = Math.floor(230 * s.heat); b = Math.floor(140 * s.heat);
        } else if (s.life > 0.3) {
          r = 255; g = Math.floor(100 * s.life); b = 15;
        } else {
          r = Math.floor(210 * s.life); g = 20; b = 10;
        }

        pCtx.save();
        pCtx.beginPath();
        pCtx.arc(s.x, s.y, s.size * 2.2, 0, Math.PI * 2);
        pCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.35})`;
        pCtx.fill();

        pCtx.beginPath();
        pCtx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        pCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        pCtx.shadowColor = `rgb(${r}, ${g}, ${b})`;
        pCtx.shadowBlur = 9;
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
            <canvas 
              ref={canvasRef} 
              width={460} 
              height={680} 
              className="burning-shader-canvas"
            />

            <canvas 
              ref={particlesCanvasRef} 
              width={460} 
              height={680} 
              className="sparks-particle-canvas"
            />
          </div>

          {/* Minimal Icon-Only Floating Dock (No Text Names, Pure Sleek Icons) */}
          <div className="burn-controls-toolbar">
            <button 
              className={`icon-only-btn ${burnMode === 'reveal' ? 'active-icon-btn' : ''}`}
              onClick={() => setBurnMode('reveal')}
              aria-label="Burn to Reveal"
              title="Burn to Reveal"
            >
              <Flame size={19} />
            </button>

            <button 
              className={`icon-only-btn ${burnMode === 'torch' ? 'active-icon-btn' : ''}`}
              onClick={() => setBurnMode('torch')}
              aria-label="Torch Mode"
              title="Torch Mode"
            >
              <Sparkles size={19} />
            </button>

            <button 
              className="icon-only-btn reset-icon-btn"
              onClick={() => resetBurnRef.current && resetBurnRef.current()}
              aria-label="Reset Sheet"
              title="Reset Sheet"
            >
              <RotateCcw size={18} />
            </button>
          </div>

        </div>
      </main>

      {/* Minimal Scroll Demonstration Section */}
      <section id="about" className="scroll-demonstration-zone">
        <div className="minimal-zone-content">
          <span className="tiny-label">// MINIMAL PORTFOLIO 2026</span>
          <p className="minimal-instruction">
            Designed with living WebGL burning paper mechanics, cellulose fiber simulation, 
            pyrolysis flame licks, heat convection sparks, and curled paper shadows.
          </p>
        </div>
      </section>
    </div>
  );
}
