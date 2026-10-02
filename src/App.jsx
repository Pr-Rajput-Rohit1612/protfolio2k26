import React, { useState, useEffect, useRef } from 'react';
import './index.css';

export default function App() {
  const [navVisible, setNavVisible] = useState(true);

  const canvasRef = useRef(null);
  const particlesCanvasRef = useRef(null);
  const lastScrollY = useRef(0);

  // Smooth, zero-jank scroll navbar toggle
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY;
          if (currentY > 40 && currentY > lastScrollY.current) {
            setNavVisible(false);
          } else if (currentY < lastScrollY.current || currentY <= 40) {
            setNavVisible(true);
          }
          lastScrollY.current = currentY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Liquid Chromatic Reality Lens Shader Engine:
  // - High-end fluid glass refraction with RGB chromatic aberration
  // - Organic fluid surface tension (zero crude circles)
  // - Revealing the real portrait photo through liquid ripple aperture
  // - Delicate cyan floral spores / luminous dust floating in fluid wake
  // - Smooth 0.8s elastic restoration when cursor moves away
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

    // Decay Trail Buffer (smooth 0.8s fluid healing)
    const trailCanvas = document.createElement('canvas');
    trailCanvas.width = 512;
    trailCanvas.height = 768;
    const tCtx = trailCanvas.getContext('2d');
    tCtx.fillStyle = '#000000';
    tCtx.fillRect(0, 0, trailCanvas.width, trailCanvas.height);

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

    // Fragment Shader: Liquid Glass Fluid Refraction, Chromatic Aberration & Prismatic Caustics
    const fsSource = `
      precision highp float;
      uniform sampler2D u_top;
      uniform sampler2D u_bottom;
      uniform sampler2D u_trail;
      uniform float u_time;
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

      // 4-Octave FBM
      float fbm(vec2 p) {
        float f = 0.0;
        f += 0.5000 * snoise(p); p *= 2.02;
        f += 0.2500 * snoise(p); p *= 2.03;
        f += 0.1250 * snoise(p); p *= 2.01;
        f += 0.0625 * snoise(p);
        return f;
      }

      // Aspect-Ratio Cover Mapping
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

        // Read decaying fluid intensity (0.0 = untouched, 1.0 = deep fluid aperture)
        float trailVal = texture2D(u_trail, uv).r;

        // If no hover interaction, render pristine artwork
        if (trailVal <= 0.002) {
          gl_FragColor = texture2D(u_top, uvTop);
          return;
        }

        // 1. Organic Fluid Viscosity & Surface Tension Noise
        // Breaks any circular look with fluid eddies and curl waves
        vec2 curlCoord = uv * 6.0 + vec2(u_time * 0.08, -u_time * 0.06);
        float fluidNoise = fbm(curlCoord) * 0.5 + 0.5;
        float microRipple = snoise(uv * 28.0 + vec2(u_time * 0.15)) * 0.05;

        // Organic fluid aperture threshold
        float fluidAperture = trailVal * 1.5 - (1.0 - (fluidNoise + microRipple)) * 0.35;
        fluidAperture = clamp(fluidAperture, 0.0, 1.0);

        // 2. Liquid Surface Refraction Vector
        vec2 fluidNormal = vec2(
          snoise(uv * 18.0 + vec2(1.2, u_time * 0.1)),
          snoise(uv * 18.0 + vec2(u_time * 0.1, 3.4))
        );
        vec2 refraction = fluidNormal * 0.025 * smoothstep(0.0, 0.8, fluidAperture);

        // 3. Chromatic Aberration on revealed photo (RGB Prism Split)
        float chromaOffset = 0.012 * (1.0 - fluidAperture) * smoothstep(0.1, 0.8, fluidAperture);
        float r = texture2D(u_bottom, uvBottom + refraction + vec2(chromaOffset, 0.0)).r;
        float g = texture2D(u_bottom, uvBottom + refraction).g;
        float b = texture2D(u_bottom, uvBottom + refraction - vec2(chromaOffset, 0.0)).b;
        vec3 bottomChroma = vec3(r, g, b);

        // Top artwork sampling with gentle surface distortion
        vec4 topSample = texture2D(u_top, uvTop + refraction * 0.4);

        // 4. Luminous Cyan Liquid Edge Rim (Matching the cyan flowers in the artwork)
        float rimFactor = smoothstep(0.2, 0.55, fluidAperture) * (1.0 - smoothstep(0.55, 0.88, fluidAperture));
        vec3 cyanGlow = vec3(0.1, 0.85, 1.0) * rimFactor * 1.6;
        vec3 silverShine = vec3(0.9, 0.95, 1.0) * pow(rimFactor, 2.0) * 1.2;

        // 5. Smooth Liquid Blending
        float revealFactor = smoothstep(0.40, 0.78, fluidAperture);
        vec3 blended = mix(topSample.rgb, bottomChroma, revealFactor);

        // Add iridescent cyan liquid rim & glass specular highlight
        blended += cyanGlow + silverShine;

        gl_FragColor = vec4(blended, 1.0);
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
    const uTrailLoc = gl.getUniformLocation(program, 'u_trail');
    const uTimeLoc = gl.getUniformLocation(program, 'u_time');

    gl.uniform1i(uTopLoc, 0);
    gl.uniform1i(uBottomLoc, 1);
    gl.uniform1i(uTrailLoc, 2);

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

    // Dynamic Trail Texture (Unit 2)
    const trailTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, trailTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, trailCanvas);

    // ---------------- CYAN LUMINOUS SPORES & PARTICLES ----------------
    // Floating cyan flower spores / prismatic dust that swirl with fluid movement
    const spores = [];
    const maxSpores = 45;

    const spawnSpore = (x, y, vx, vy) => {
      if (spores.length >= maxSpores) return;
      spores.push({
        x: x + (Math.random() - 0.5) * 24,
        y: y + (Math.random() - 0.5) * 24,
        vx: vx * 0.35 + (Math.random() - 0.5) * 1.5,
        vy: vy * 0.35 + (Math.random() - 0.5) * 1.5 - 0.5,
        size: Math.random() * 2.5 + 1.0,
        life: 1.0,
        decay: Math.random() * 0.02 + 0.012,
        hue: Math.random() < 0.75 ? 188 : 210 // Cyan to electric blue
      });
    };

    // Stamping fluid liquid dab at cursor (Organic fluid splat, NO geometric circle)
    const stampLiquid = (nx, ny, speed) => {
      const bx = nx * trailCanvas.width;
      const by = ny * trailCanvas.height;

      tCtx.save();
      tCtx.translate(bx, by);

      // Multiple overlapping fluid droplets forming an organic liquid aperture
      const count = 3;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
        const dist = Math.random() * 12 + 6;
        const ox = Math.cos(angle) * dist;
        const oy = Math.sin(angle) * dist;
        const r = Math.min(42, Math.max(22, 26 + speed * 0.4));

        const grad = tCtx.createRadialGradient(ox, oy, 0, ox, oy, r);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.75)');
        grad.addColorStop(0.85, 'rgba(255, 255, 255, 0.2)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');

        tCtx.fillStyle = grad;
        tCtx.beginPath();
        tCtx.arc(ox, oy, r, 0, Math.PI * 2);
        tCtx.fill();
      }
      tCtx.restore();
    };

    let targetMouse = { x: 0.5, y: 0.5 };
    let currentMouse = { x: 0.5, y: 0.5 };
    let lastMousePos = { x: 0.5, y: 0.5 };
    let isHovered = false;
    let clock = 0;
    let animId;

    // Continuous 60fps Loop
    const renderLoop = () => {
      clock += 0.02;

      currentMouse.x += (targetMouse.x - currentMouse.x) * 0.16;
      currentMouse.y += (targetMouse.y - currentMouse.y) * 0.16;

      const dx = (currentMouse.x - lastMousePos.x) * W;
      const dy = (currentMouse.y - lastMousePos.y) * H;
      const speed = Math.sqrt(dx * dx + dy * dy);
      lastMousePos.x = currentMouse.x;
      lastMousePos.y = currentMouse.y;

      // 1. AUTO-HEALING FLUID RESTORATION:
      // Fades the fluid trail back to untouched state in ~0.8s!
      tCtx.fillStyle = 'rgba(0, 0, 0, 0.045)';
      tCtx.fillRect(0, 0, trailCanvas.width, trailCanvas.height);

      // 2. If hovering, stamp organic liquid aperture & spawn luminous cyan spores
      if (isHovered) {
        stampLiquid(currentMouse.x, currentMouse.y, speed);

        if (Math.random() < 0.7) {
          spawnSpore(currentMouse.x * W, currentMouse.y * H, dx * 0.1, dy * 0.1);
        }
      }

      // Update WebGL trail texture with decaying buffer
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, trailTexture);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, trailCanvas);

      // Render WebGL Shader
      if (topTexReady && bottomTexReady) {
        gl.viewport(0, 0, W, H);
        gl.uniform1f(uTimeLoc, clock);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      // Render Particles (Cyan Spores / Luminous Dust)
      pCtx.clearRect(0, 0, W, H);
      for (let i = spores.length - 1; i >= 0; i--) {
        const s = spores[i];
        s.x += s.vx + Math.sin(clock * 3.0 + s.y * 0.05) * 0.4;
        s.y += s.vy;
        s.vx *= 0.96;
        s.vy *= 0.96;
        s.life -= s.decay;

        if (s.life <= 0 || s.y < -20 || s.x < -20 || s.x > W + 20) {
          spores.splice(i, 1);
          continue;
        }

        const alpha = Math.min(1.0, s.life * 1.5);

        pCtx.save();
        pCtx.beginPath();
        pCtx.arc(s.x, s.y, s.size * 2.2, 0, Math.PI * 2);
        pCtx.fillStyle = `hsla(${s.hue}, 100%, 65%, ${alpha * 0.28})`;
        pCtx.fill();

        pCtx.beginPath();
        pCtx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        pCtx.fillStyle = `hsla(${s.hue}, 100%, 80%, ${alpha})`;
        pCtx.shadowColor = `hsla(${s.hue}, 100%, 60%, 0.8)`;
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

      {/* 2. Prismatic Reality Lens Viewport (Clean, Minimal, Zero Clutter) */}
      <main className="hero-viewport">
        <div className="stage-outer-container">
          
          {/* Main Visual Artwork with Crisp 8px Frame */}
          <div className="art-stage-wrapper">
            <canvas 
              ref={canvasRef} 
              width={460} 
              height={680} 
              className="shader-canvas"
            />

            {/* Overlaid Particle Canvas for Luminous Cyan Spores */}
            <canvas 
              ref={particlesCanvasRef} 
              width={460} 
              height={680} 
              className="spores-canvas"
            />
          </div>

        </div>
      </main>

      {/* Minimal Scroll Demonstration Section */}
      <section id="about" className="scroll-demonstration-zone">
        <div className="minimal-zone-content">
          <span className="tiny-label">// MINIMAL PORTFOLIO 2026</span>
          <p className="minimal-instruction">
            Move cursor over the artwork to part the digital veil through a liquid chromatic lens, 
            revealing the portrait beneath with cyan floral spores. Auto-restores smoothly in 0.8s.
          </p>
        </div>
      </section>
    </div>
  );
}
