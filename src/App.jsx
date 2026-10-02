import React, { useState, useEffect, useRef } from 'react';
import { Flame, Sparkles, RotateCcw } from 'lucide-react';
import './index.css';

export default function App() {
  const [navVisible, setNavVisible] = useState(true);
  const [burnMode, setBurnMode] = useState('reveal'); // 'reveal' or 'torch'

  const canvasRef = useRef(null);
  const particlesCanvasRef = useRef(null);
  const burnMapCanvasRef = useRef(null);
  const resetBurnRef = useRef(null);
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

  // Photorealistic Burning Paper Engine matching exact reference:
  // Tall licking fire tongues, craggy charred carbon crust, warm scorched halo, and floating embers
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
      for (let i = 0; i < 40; i++) {
        sparks.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 2.0,
          vy: -Math.random() * 2.2 - 0.8,
          size: Math.random() * 2.2 + 0.8,
          life: 1.0,
          decay: Math.random() * 0.012 + 0.008,
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

    // Fragment Shader: Volumetric Upward Licking Fire, Thick Craggy Carbon Crust & Scorched Halos
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

      // Multi-Octave Fractal Noise
      float fbm(vec2 p) {
        float f = 0.0;
        f += 0.5000 * snoise(p); p *= 2.03;
        f += 0.2500 * snoise(p); p *= 2.02;
        f += 0.1250 * snoise(p); p *= 2.01;
        f += 0.0625 * snoise(p);
        return f;
      }

      // Craggy Charcoal Crust Noise (Thick irregular carbon chunks)
      float craggyNoise(vec2 p) {
        vec2 q = vec2(fbm(p), fbm(p + vec2(2.8, 1.3)));
        return fbm(p + 3.0 * q);
      }

      // Aspect-Ratio Cover UV Mapping
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

        // Distance from cursor
        vec2 diff = uv - u_mouse;
        diff.y *= u_aspect;
        float dist = length(diff);

        // Base Burn Accumulation
        float burnStrength = 0.0;
        if (u_mode == 0) {
          float mapVal = texture2D(u_burnMap, uv).r;
          float activeTip = (1.0 - smoothstep(0.0, u_radius * 0.95, dist)) * u_hover;
          burnStrength = max(mapVal, activeTip);
        } else {
          burnStrength = (1.0 - smoothstep(0.0, u_radius, dist)) * u_hover;
        }

        // Pristine paper if no burn anywhere
        if (burnStrength <= 0.001) {
          gl_FragColor = texture2D(u_top, uvTop);
          return;
        }

        // 1. Slow, Gentle Heat Shimmer Wave (Optical mirage around fire)
        vec2 heatRefract = vec2(
          sin(u_time * 2.5 + uv.y * 20.0),
          cos(u_time * 2.0 + uv.x * 16.0)
        ) * 0.003 * smoothstep(0.0, 0.5, burnStrength);

        vec4 topColor = texture2D(u_top, uvTop + heatRefract);
        vec4 bottomColor = texture2D(u_bottom, uvBottom);

        // 2. Thick, Craggy Charcoal Crust & Jagged Paper Edge Noise
        float crag = craggyNoise(uv * 12.0) * 0.5 + 0.5;
        float fineFibers = snoise(uv * 48.0) * 0.09;

        // Slow organic smolder breathing
        float breathingEmbers = sin(u_time * 2.4 + uv.x * 10.0) * 0.035;

        // Progress thresholding
        float burnProgress = burnStrength * 1.52 - (1.0 - (crag + fineFibers)) * 0.44 + breathingEmbers;

        // 3. Volumetric Upward Licking Fire Tongues (Matching Reference Photo)
        // Flames lick vertically upward with natural convection velocity and turbulent curl
        vec2 flameUV = uv * vec2(10.0, 3.8);
        flameUV.y += u_time * 1.35; // Gentle upward flame flow
        flameUV.x += sin(u_time * 1.2 + uv.y * 7.0) * 0.4; // Curl turbulence

        float flameNoise1 = fbm(flameUV);
        float flameNoise2 = fbm(flameUV * 2.1 + vec2(1.7, 4.3));
        float flameShape = flameNoise1 * 0.65 + flameNoise2 * 0.35;

        // Flame zone: intense along the active smoldering boundary, licking tall into the charred paper
        float flameBand = smoothstep(0.56, 0.72, burnProgress) * (1.0 - smoothstep(0.80, 0.96, burnProgress));
        float flameTongue = flameBand * pow(flameShape + 0.15, 1.8) * 2.2;
        flameTongue *= (0.85 + 0.25 * sin(u_time * 3.0 + uv.x * 8.0));

        // ------------------ PHOTO-MATCHED LAYER COMPOSITION ------------------

        // ZONE 1: Paper completely burned away (Reveals bottom photo with curled paper drop shadow)
        if (burnProgress > 0.83) {
          float shadowDist = burnProgress - 0.83;
          float shadowAmt = smoothstep(0.0, 0.10, shadowDist);
          // Dark ambient occlusion under the curled burnt edge
          vec3 shadowedPhoto = mix(bottomColor.rgb * 0.30, bottomColor.rgb, shadowAmt);

          // Licking flame wash over the burn hole rim
          if (flameTongue > 0.10) {
            vec3 flameColor = mix(vec3(1.0, 0.35, 0.01), vec3(1.3, 0.95, 0.3), flameTongue);
            shadowedPhoto = mix(shadowedPhoto, flameColor, flameTongue * 0.5);
          }

          gl_FragColor = vec4(shadowedPhoto, 1.0);
        }
        // ZONE 2: Blazing Incandescent Fire Seam (Intense Yellow-White Core to Fiery Orange)
        else if (burnProgress > 0.68) {
          float t = (burnProgress - 0.68) / 0.15;

          // Reference-accurate fire color ramp:
          // Deep Blood Crimson -> Blazing Fiery Orange -> Radiant Sun Yellow -> Incandescent White Core
          vec3 colCrimson = vec3(0.75, 0.06, 0.01);
          vec3 colOrange  = vec3(1.0, 0.38, 0.02);
          vec3 colYellow  = vec3(1.0, 0.85, 0.10);
          vec3 colWhite   = vec3(1.45, 1.40, 1.15);

          vec3 flameCol;
          if (t < 0.40) {
            flameCol = mix(colCrimson, colOrange, t / 0.40);
          } else if (t < 0.80) {
            flameCol = mix(colOrange, colYellow, (t - 0.40) / 0.40);
          } else {
            flameCol = mix(colYellow, colWhite, (t - 0.80) / 0.20);
          }

          // Gentle natural heat breathing
          float heatPulse = 1.30 + sin(u_time * 2.6 + uv.x * 14.0) * 0.25;
          flameCol *= heatPulse;

          // Blend tall upward licking flames
          if (flameTongue > 0.06) {
            vec3 tongueCol = mix(vec3(1.0, 0.20, 0.01), vec3(1.35, 1.15, 0.5), flameTongue);
            flameCol = max(flameCol, tongueCol);
          }

          gl_FragColor = vec4(flameCol, 1.0);
        }
        // ZONE 3: Craggy Black Charcoal Ash Crust (Thick, textured soot & brittle carbon)
        else if (burnProgress > 0.50) {
          float t = (burnProgress - 0.50) / 0.18;
          vec3 carbonDeep = vec3(0.02, 0.012, 0.01);
          vec3 carbonSoot = vec3(0.06, 0.035, 0.02);
          vec3 emberCling = vec3(0.75, 0.16, 0.02);

          // Craggy texture variation
          float textureBump = snoise(uv * 60.0) * 0.5 + 0.5;
          vec3 crust = mix(carbonDeep, carbonSoot, textureBump);

          // Glowing ember specks embedded in the black char
          float emberSpeck = step(0.82, snoise(uv * 85.0 + vec2(u_time * 0.1)));
          crust = mix(crust, emberCling, pow(t, 2.5) * 0.70 + emberSpeck * 0.35);

          // Add tall licking flame tongues over the black crust! (Just like in the reference photo)
          if (flameTongue > 0.15) {
            vec3 tongueCol = mix(vec3(0.9, 0.22, 0.01), vec3(1.25, 0.85, 0.2), flameTongue);
            crust = mix(crust, tongueCol, flameTongue * 0.75);
          }

          gl_FragColor = vec4(crust, 1.0);
        }
        // ZONE 4: Warm Scorched Sienna Halo (Thermal paper degradation & soot)
        else if (burnProgress > 0.32) {
          float t = (burnProgress - 0.32) / 0.18;
          // Exact toasted sienna brown from reference photo:
          vec3 scorchSienna = vec3(0.28, 0.13, 0.05);
          vec3 toastedHalo = mix(topColor.rgb * 0.65, scorchSienna, t);

          // Curled paper lip highlight
          float lipHighlight = smoothstep(0.32, 0.37, burnProgress) * (1.0 - smoothstep(0.37, 0.44, burnProgress));
          toastedHalo += vec3(0.12, 0.09, 0.05) * lipHighlight;

          // Rising soft flame tongue tips licking onto the toasted paper
          if (flameTongue > 0.25) {
            vec3 softTongue = vec3(1.0, 0.40, 0.05);
            toastedHalo = mix(toastedHalo, softTongue, (flameTongue - 0.25) * 0.45);
          }

          gl_FragColor = vec4(toastedHalo, 1.0);
        }
        // ZONE 5: Pristine Paper Sheet
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
    gl.uniform1f(uRadiusLoc, 0.16); // Refined burn tip radius
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

    // Floating Sparks & Cinders System (Gentle Campfire Drift)
    const sparks = [];
    const maxSparks = 80;

    const spawnSpark = (x, y, speedMult = 1.0) => {
      if (sparks.length >= maxSparks) return;
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 1.4 + 0.5) * speedMult;
      sparks.push({
        x: x + (Math.random() - 0.5) * 18,
        y: y + (Math.random() - 0.5) * 18,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (Math.random() * 1.6 + 0.9), // Gentle upward thermal draft
        size: Math.random() * 2.2 + 0.8,
        life: 1.0,
        decay: Math.random() * 0.011 + 0.008, // Slow, peaceful decay
        heat: Math.random() * 0.35 + 0.65
      });
    };

    // Smooth cursor tracking
    let targetMouse = { x: 0.5, y: 0.5 };
    let currentMouse = { x: 0.5, y: 0.5 };
    let lastMousePos = { x: 0.5, y: 0.5 };
    let isHovered = false;
    let hoverAmount = 0.0;
    let animId;
    let clock = 0;
    let burnDirty = false;

    // Stamp burn spot
    const stampBurn = (nx, ny, radius = 30) => {
      const bx = nx * bCanvas.width;
      const by = ny * bCanvas.height;

      const grad = bCtx.createRadialGradient(bx, by, 0, bx, by, radius);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
      grad.addColorStop(0.55, 'rgba(255, 255, 255, 0.92)');
      grad.addColorStop(0.85, 'rgba(255, 255, 255, 0.40)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');

      bCtx.fillStyle = grad;
      bCtx.beginPath();
      bCtx.arc(bx, by, radius, 0, Math.PI * 2);
      bCtx.fill();
      burnDirty = true;
    };

    // Continuous 60fps Render Loop
    const renderLoop = () => {
      clock += 0.016; // Natural, hypnotic time progression

      currentMouse.x += (targetMouse.x - currentMouse.x) * 0.14;
      currentMouse.y += (targetMouse.y - currentMouse.y) * 0.14;
      hoverAmount += ((isHovered ? 1.0 : 0.0) - hoverAmount) * 0.09;

      const dx = (currentMouse.x - lastMousePos.x) * W;
      const dy = (currentMouse.y - lastMousePos.y) * H;
      const speed = Math.sqrt(dx * dx + dy * dy);
      lastMousePos.x = currentMouse.x;
      lastMousePos.y = currentMouse.y;

      if (isHovered && burnMode === 'reveal') {
        const burnRadius = Math.min(40, Math.max(24, 28 + speed * 0.35));
        stampBurn(currentMouse.x, currentMouse.y, burnRadius);

        if (Math.random() < 0.75) {
          spawnSpark(currentMouse.x * W, currentMouse.y * H, 1.0);
        }
      } else if (isHovered && burnMode === 'torch') {
        if (Math.random() < 0.45) {
          spawnSpark(currentMouse.x * W, currentMouse.y * H, 0.85);
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

      // Render Floating Embers & Sparks
      pCtx.clearRect(0, 0, W, H);
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx + Math.sin(clock * 2.2 + s.y * 0.04) * 0.45;
        s.y += s.vy;
        s.vy -= 0.022; // Gentle upward thermal draft
        s.vx *= 0.985;
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
        pCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.30})`;
        pCtx.fill();

        pCtx.beginPath();
        pCtx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        pCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        pCtx.shadowColor = `rgb(${r}, ${g}, ${b})`;
        pCtx.shadowBlur = 7;
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

      {/* 2. Interactive Burning Paper Stage with Reference-Matched Fire Aesthetic */}
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

            <canvas 
              ref={particlesCanvasRef} 
              width={460} 
              height={680} 
              className="sparks-particle-canvas"
            />
          </div>

          {/* Minimal Icon-Only Floating Dock (No Text Names) */}
          <div className="burn-controls-toolbar">
            <button 
              className={`icon-only-btn ${burnMode === 'reveal' ? 'active-icon-btn' : ''}`}
              onClick={() => setBurnMode('reveal')}
              aria-label="Burn to Reveal"
              title="Burn to Reveal"
            >
              <Flame size={18} />
            </button>

            <button 
              className={`icon-only-btn ${burnMode === 'torch' ? 'active-icon-btn' : ''}`}
              onClick={() => setBurnMode('torch')}
              aria-label="Torch Mode"
              title="Torch Mode"
            >
              <Sparkles size={18} />
            </button>

            <button 
              className="icon-only-btn reset-icon-btn"
              onClick={() => resetBurnRef.current && resetBurnRef.current()}
              aria-label="Reset Sheet"
              title="Reset Sheet"
            >
              <RotateCcw size={17} />
            </button>
          </div>

        </div>
      </main>

      {/* Minimal Scroll Demonstration Section */}
      <section id="about" className="scroll-demonstration-zone">
        <div className="minimal-zone-content">
          <span className="tiny-label">// MINIMAL PORTFOLIO 2026</span>
          <p className="minimal-instruction">
            Realistic volumetric burning paper simulation: craggy black charcoal crust, 
            rising flame tongues, warm scorched sienna halos, and gentle convection embers.
          </p>
        </div>
      </section>
    </div>
  );
}
