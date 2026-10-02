import React, { useState, useEffect, useRef } from 'react';
import './index.css';

export default function App() {
  const [navVisible, setNavVisible] = useState(true);

  const canvasRef = useRef(null);
  const particlesCanvasRef = useRef(null);
  const burnMapCanvasRef = useRef(null);
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

  // Photorealistic Living Paper Combustion with Temporary Self-Restoring Burn:
  // - Localized strictly to cursor hover
  // - Organic, jagged, fibrous boundary (NO CIRCLES!)
  // - Volumetric upward-licking flames
  // - Craggy black carbon edge with crumbling black paper ash flakes flying in the wind (hawa me udna)
  // - Auto-heals / restores back to pristine paper 0.7s - 1.0s after cursor moves away
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

    // Offscreen 2D Accumulation & Decay Buffer (Controls the 0.8s self-healing burn trail)
    const bCanvas = document.createElement('canvas');
    bCanvas.width = 512;
    bCanvas.height = 768;
    const bCtx = bCanvas.getContext('2d');
    bCtx.fillStyle = '#000000';
    bCtx.fillRect(0, 0, bCanvas.width, bCanvas.height);
    burnMapCanvasRef.current = bCanvas;

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

    // Fragment Shader: Organic Non-Circular Burn, Tall Flames, Black Crust & Self-Healing Dissolve
    const fsSource = `
      precision highp float;
      uniform sampler2D u_top;
      uniform sampler2D u_bottom;
      uniform sampler2D u_burnMap;
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

      // Multi-Octave Fractal Noise
      float fbm(vec2 p) {
        float f = 0.0;
        f += 0.5000 * snoise(p); p *= 2.03;
        f += 0.2500 * snoise(p); p *= 2.02;
        f += 0.1250 * snoise(p); p *= 2.01;
        f += 0.0625 * snoise(p);
        return f;
      }

      // Craggy Paper Fiber Noise (Breaks any circular look into jagged torn cellulose)
      float craggyNoise(vec2 p) {
        vec2 q = vec2(fbm(p), fbm(p + vec2(3.2, 1.6)));
        return fbm(p + 3.0 * q);
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

        // Read decaying burn map (fades back to 0.0 within 0.8s)
        float rawBurn = texture2D(u_burnMap, uv).r;

        // If no burn active in this area, render untouched paper
        if (rawBurn <= 0.002) {
          gl_FragColor = texture2D(u_top, uvTop);
          return;
        }

        // 1. Heat Mirage Shimmer around the burning area
        vec2 heatRefract = vec2(
          sin(u_time * 2.5 + uv.y * 22.0),
          cos(u_time * 2.0 + uv.x * 18.0)
        ) * 0.003 * smoothstep(0.0, 0.4, rawBurn);

        vec4 topColor = texture2D(u_top, uvTop + heatRefract);
        vec4 bottomColor = texture2D(u_bottom, uvBottom);

        // 2. Non-Circular Jagged Cellulose Paper Grain
        // Combines low-frequency crags with fine fibrous tears to ensure ZERO CIRCLES!
        float crags = craggyNoise(uv * 13.0) * 0.5 + 0.5;
        float fineFibers = snoise(uv * 52.0) * 0.09;
        float breathingGlow = sin(u_time * 2.4 + uv.x * 12.0) * 0.03;

        // Effective burn progress at this pixel
        float burnProgress = rawBurn * 1.58 - (1.0 - (crags + fineFibers)) * 0.44 + breathingGlow;

        // 3. Volumetric Upward Licking Fire Tongues
        // Flames rise vertically with convective velocity and turbulent curl
        vec2 flameUV = uv * vec2(14.0, 4.2);
        flameUV.y += u_time * 1.45; // Upward flame lick flow
        flameUV.x += sin(u_time * 1.2 + uv.y * 7.0) * 0.38; // Curl turbulence

        float flameNoise1 = fbm(flameUV);
        float flameNoise2 = fbm(flameUV * 2.2 + vec2(1.8, 3.9));
        float flameTurbulence = flameNoise1 * 0.65 + flameNoise2 * 0.35;

        // Active flame zone right around the burning border
        float flameBand = smoothstep(0.52, 0.70, burnProgress) * (1.0 - smoothstep(0.78, 0.96, burnProgress));
        float flameTongue = flameBand * pow(flameTurbulence + 0.15, 1.8) * 2.3;

        // ------------------ LAYER COMPOSITION ------------------

        // ZONE 1: Paper completely burnt away (Reveals bottom photo under the active flame)
        if (burnProgress > 0.83) {
          float shadowDist = burnProgress - 0.83;
          float shadowAmt = smoothstep(0.0, 0.10, shadowDist);
          vec3 revealed = mix(bottomColor.rgb * 0.30, bottomColor.rgb, shadowAmt);

          // Residual licking flame wash over the rim
          if (flameTongue > 0.1) {
            vec3 flameColor = mix(vec3(1.0, 0.35, 0.01), vec3(1.3, 0.95, 0.3), flameTongue);
            revealed = mix(revealed, flameColor, flameTongue * 0.45);
          }

          gl_FragColor = vec4(revealed, 1.0);
        }
        // ZONE 2: Active Blazing Incandescent Fireline
        else if (burnProgress > 0.68) {
          float t = (burnProgress - 0.68) / 0.15;

          // Pure fire spectrum: Deep Crimson -> Cadmium Orange -> Radiant Sun Gold -> White-Hot Core
          vec3 colCrimson = vec3(0.75, 0.06, 0.01);
          vec3 colOrange  = vec3(1.0, 0.38, 0.02);
          vec3 colYellow  = vec3(1.0, 0.85, 0.10);
          vec3 colWhite   = vec3(1.45, 1.40, 1.15);

          vec3 flameCol;
          if (t < 0.4) {
            flameCol = mix(colCrimson, colOrange, t / 0.4);
          } else if (t < 0.8) {
            flameCol = mix(colOrange, colYellow, (t - 0.4) / 0.4);
          } else {
            flameCol = mix(colYellow, colWhite, (t - 0.8) / 0.2);
          }

          flameCol *= (1.28 + sin(u_time * 2.8 + uv.x * 14.0) * 0.25);

          if (flameTongue > 0.06) {
            vec3 tongueCol = mix(vec3(1.0, 0.20, 0.01), vec3(1.35, 1.15, 0.5), flameTongue);
            flameCol = max(flameCol, tongueCol);
          }

          gl_FragColor = vec4(flameCol, 1.0);
        }
        // ZONE 3: Craggy Black Charcoal Ash Crust (Crumbling carbon edge)
        else if (burnProgress > 0.50) {
          float t = (burnProgress - 0.50) / 0.18;
          vec3 carbonDeep = vec3(0.02, 0.012, 0.01);
          vec3 carbonSoot = vec3(0.06, 0.035, 0.02);
          vec3 emberCling = vec3(0.75, 0.16, 0.02);

          float textureBump = snoise(uv * 65.0) * 0.5 + 0.5;
          vec3 crust = mix(carbonDeep, carbonSoot, textureBump);

          // Glowing ember specks embedded in the black char
          float emberSpeck = step(0.80, snoise(uv * 85.0 + vec2(u_time * 0.15)));
          crust = mix(crust, emberCling, pow(t, 2.5) * 0.70 + emberSpeck * 0.35);

          if (flameTongue > 0.12) {
            vec3 tongueCol = mix(vec3(0.9, 0.22, 0.01), vec3(1.25, 0.85, 0.2), flameTongue);
            crust = mix(crust, tongueCol, flameTongue * 0.70);
          }

          gl_FragColor = vec4(crust, 1.0);
        }
        // ZONE 4: Warm Scorched Sienna Halo (Thermal paper degradation)
        else if (burnProgress > 0.30) {
          float t = (burnProgress - 0.30) / 0.20;
          vec3 scorchSienna = vec3(0.28, 0.13, 0.05);
          vec3 toastedHalo = mix(topColor.rgb * 0.65, scorchSienna, t);

          // Curled paper lip highlight
          float lipHighlight = smoothstep(0.30, 0.35, burnProgress) * (1.0 - smoothstep(0.35, 0.42, burnProgress));
          toastedHalo += vec3(0.12, 0.09, 0.05) * lipHighlight;

          if (flameTongue > 0.22) {
            vec3 softTongue = vec3(1.0, 0.40, 0.05);
            toastedHalo = mix(toastedHalo, softTongue, (flameTongue - 0.22) * 0.45);
          }

          gl_FragColor = vec4(toastedHalo, 1.0);
        }
        // ZONE 5: Pristine Untouched Paper Sheet
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
    const uTimeLoc = gl.getUniformLocation(program, 'u_time');

    gl.uniform1i(uTopLoc, 0);
    gl.uniform1i(uBottomLoc, 1);
    gl.uniform1i(uBurnMapLoc, 2);

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

    // Dynamic Burn Texture (Unit 2)
    const burnTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, burnTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bCanvas);

    // ---------------- ASH FLAKES & FLYING EMBERS SIMULATION ----------------
    // Simulates the black charred paper crumbling and flying away into the wind (Hawa me udna)!
    const ashFlakes = [];
    const maxAshFlakes = 50;

    const sparks = [];
    const maxSparks = 60;

    const spawnAshFlake = (x, y) => {
      if (ashFlakes.length >= maxAshFlakes) return;
      ashFlakes.push({
        x: x + (Math.random() - 0.5) * 32,
        y: y + (Math.random() - 0.5) * 16,
        vx: (Math.random() - 0.45) * 2.2,
        vy: -Math.random() * 2.6 - 1.2, // Floats upward in thermal draft
        width: Math.random() * 8 + 4,
        height: Math.random() * 6 + 3,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.08,
        flipAngle: Math.random() * Math.PI * 2,
        flipSpeed: Math.random() * 0.06 + 0.02,
        life: 1.0,
        decay: Math.random() * 0.015 + 0.010,
        colorR: Math.floor(Math.random() * 15 + 18),
        colorG: Math.floor(Math.random() * 12 + 16),
        colorB: Math.floor(Math.random() * 10 + 14),
        hasEmberGlow: Math.random() < 0.45
      });
    };

    const spawnSpark = (x, y) => {
      if (sparks.length >= maxSparks) return;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 1.6 + 0.6;
      sparks.push({
        x: x + (Math.random() - 0.5) * 26,
        y: y + (Math.random() - 0.5) * 14,
        vx: Math.cos(angle) * speed + 0.2,
        vy: Math.sin(angle) * speed - (Math.random() * 2.0 + 1.2),
        size: Math.random() * 2.0 + 0.8,
        life: 1.0,
        decay: Math.random() * 0.016 + 0.012,
        heat: Math.random() * 0.35 + 0.65
      });
    };

    // Stamping an organic, jagged, non-circular flame patch at cursor
    const stampOrganicBurn = (nx, ny, speed = 1.0) => {
      const bx = nx * bCanvas.width;
      const by = ny * bCanvas.height;

      bCtx.save();
      bCtx.translate(bx, by);

      // Multiple overlapping jagged organic blobs with upward flame tongue bias
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 + Math.random() * 0.4;
        const dist = (Math.random() * 12 + 6);
        const ox = Math.cos(angle) * dist;
        const oy = Math.sin(angle) * dist - Math.random() * 14; // Upward flame reach!
        const r = Math.random() * 14 + 18;

        const grad = bCtx.createRadialGradient(ox, oy, 0, ox, oy, r);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        grad.addColorStop(0.45, 'rgba(255, 255, 255, 0.70)');
        grad.addColorStop(0.80, 'rgba(255, 255, 255, 0.20)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');

        bCtx.fillStyle = grad;
        bCtx.beginPath();
        bCtx.arc(ox, oy, r, 0, Math.PI * 2);
        bCtx.fill();
      }
      bCtx.restore();
    };

    let targetMouse = { x: 0.5, y: 0.5 };
    let currentMouse = { x: 0.5, y: 0.5 };
    let lastMousePos = { x: 0.5, y: 0.5 };
    let isHovered = false;
    let clock = 0;
    let animId;

    // Continuous 60fps Loop
    const renderLoop = () => {
      clock += 0.016;

      currentMouse.x += (targetMouse.x - currentMouse.x) * 0.16;
      currentMouse.y += (targetMouse.y - currentMouse.y) * 0.16;

      const dx = (currentMouse.x - lastMousePos.x) * W;
      const dy = (currentMouse.y - lastMousePos.y) * H;
      const speed = Math.sqrt(dx * dx + dy * dy);
      lastMousePos.x = currentMouse.x;
      lastMousePos.y = currentMouse.y;

      // 1. AUTO-RESTORE / HEALING DECAY:
      // Fades the burn map back to black (unburnt paper) in ~0.7s to 1.0s!
      bCtx.fillStyle = 'rgba(0, 0, 0, 0.045)';
      bCtx.fillRect(0, 0, bCanvas.width, bCanvas.height);

      // 2. If hovering, stamp organic non-circular flame patch at cursor
      if (isHovered) {
        stampOrganicBurn(currentMouse.x, currentMouse.y, speed);

        // Spawn crumbling black paper ash flakes & flying spark embers at hover spot
        if (Math.random() < 0.65) {
          spawnAshFlake(currentMouse.x * W, currentMouse.y * H);
        }
        if (Math.random() < 0.75) {
          spawnSpark(currentMouse.x * W, currentMouse.y * H);
        }
      }

      // Update WebGL burn texture with decaying buffer
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, burnTexture);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, bCanvas);

      // Render WebGL Shader
      if (topTexReady && bottomTexReady) {
        gl.viewport(0, 0, W, H);
        gl.uniform1f(uTimeLoc, clock);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      // Render Particles (Crumbling Black Paper Ash + Embers Flying Away)
      pCtx.clearRect(0, 0, W, H);

      // Draw tumbling black paper ash flakes
      for (let i = ashFlakes.length - 1; i >= 0; i--) {
        const a = ashFlakes[i];
        a.x += a.vx + Math.sin(clock * 1.8 + a.y * 0.02) * 0.6;
        a.y += a.vy;
        a.vy -= 0.014;
        a.rotation += a.rotSpeed;
        a.flipAngle += a.flipSpeed;
        a.life -= a.decay;

        if (a.life <= 0 || a.y < -30 || a.x < -30 || a.x > W + 30) {
          ashFlakes.splice(i, 1);
          continue;
        }

        const alpha = Math.min(1.0, a.life * 1.4);
        const flipScale = Math.abs(Math.cos(a.flipAngle));

        pCtx.save();
        pCtx.translate(a.x, a.y);
        pCtx.rotate(a.rotation);
        pCtx.scale(1.0, Math.max(0.2, flipScale));

        pCtx.beginPath();
        pCtx.rect(-a.width / 2, -a.height / 2, a.width, a.height);
        pCtx.fillStyle = `rgba(${a.colorR}, ${a.colorG}, ${a.colorB}, ${alpha * 0.92})`;
        pCtx.fill();

        if (a.hasEmberGlow && a.life > 0.4) {
          pCtx.strokeStyle = `rgba(255, 75, 10, ${alpha * (a.life - 0.3)})`;
          pCtx.lineWidth = 1.2;
          pCtx.stroke();
        }
        pCtx.restore();
      }

      // Draw fiery spark embers
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx + Math.sin(clock * 2.2 + s.y * 0.04) * 0.45;
        s.y += s.vy;
        s.vy -= 0.022;
        s.life -= s.decay;

        if (s.life <= 0 || s.y < -20 || s.x < -20 || s.x > W + 20) {
          sparks.splice(i, 1);
          continue;
        }

        const alpha = Math.min(1.0, s.life * 1.5);
        let r = 255, g = 180, b = 50;
        if (s.life > 0.65) {
          r = 255; g = Math.floor(225 * s.heat); b = Math.floor(130 * s.heat);
        } else if (s.life > 0.3) {
          r = 255; g = Math.floor(95 * s.life); b = 15;
        } else {
          r = Math.floor(200 * s.life); g = 20; b = 10;
        }

        pCtx.save();
        pCtx.beginPath();
        pCtx.arc(s.x, s.y, s.size * 2.0, 0, Math.PI * 2);
        pCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.28})`;
        pCtx.fill();

        pCtx.beginPath();
        pCtx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        pCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        pCtx.shadowColor = `rgb(${r}, ${g}, ${b})`;
        pCtx.shadowBlur = 6;
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

      {/* 2. Pure Clean Hero Viewport (Localized Burning Paper with Flying Ash & Self-Healing Restoration) */}
      <main className="hero-viewport">
        <div className="stage-outer-container">
          
          {/* Main Visual Artwork with Crisp 8px Frame */}
          <div className="art-stage-wrapper">
            <canvas 
              ref={canvasRef} 
              width={460} 
              height={680} 
              className="burning-shader-canvas"
            />

            {/* Overlaid Particle Canvas for Flying Black Paper Ash Flakes & Sparks */}
            <canvas 
              ref={particlesCanvasRef} 
              width={460} 
              height={680} 
              className="sparks-particle-canvas"
            />
          </div>

        </div>
      </main>

      {/* Minimal Scroll Demonstration Section */}
      <section id="about" className="scroll-demonstration-zone">
        <div className="minimal-zone-content">
          <span className="tiny-label">// MINIMAL PORTFOLIO 2026</span>
          <p className="minimal-instruction">
            Hover over the artwork to burn through with organic jagged flame licks, craggy carbon crust, 
            and crumbling black ash flakes that blow away in the wind. Moving the cursor restores the paper within ~0.8s.
          </p>
        </div>
      </section>
    </div>
  );
}
