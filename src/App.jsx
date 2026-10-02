import React, { useState, useEffect, useRef } from 'react';
import { Flame, RotateCcw, Play, Pause } from 'lucide-react';
import './index.css';

export default function App() {
  const [navVisible, setNavVisible] = useState(true);
  const [isAutoBurning, setIsAutoBurning] = useState(false);

  const canvasRef = useRef(null);
  const particlesCanvasRef = useRef(null);
  const resetBurnRef = useRef(null);
  const triggerAutoBurnRef = useRef(null);
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

  // Realistic Paper Combustion Simulation:
  // Non-circular organic burn front, tall licking flames, black charred paper, 
  // and crumbling black ash flakes flying away in the wind (hawa me udna).
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

    // Vertex Shader: Fullscreen Quad
    const vsSource = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = (a_position + 1.0) * 0.5;
        v_uv.y = 1.0 - v_uv.y; // Correct WebGL texture coordinate
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    // Fragment Shader: Organic Creeping Fire Front (No Circles!), Tall Licking Flames & Charred Carbon
    const fsSource = `
      precision highp float;
      uniform sampler2D u_top;
      uniform sampler2D u_bottom;
      uniform float u_burnProgress; // 0.0 (unburnt) to 1.0 (fully burnt from bottom to top)
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

      // Multi-Octave Fractal Noise for Organic Paper Tear
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

        // If completely unburnt, show pristine paper
        if (u_burnProgress <= 0.001) {
          gl_FragColor = texture2D(u_top, uvTop);
          return;
        }

        // 1. Organic, Non-Circular Paper Burn Contour (Burns from bottom upward)
        // Irregular paper tear line: macro undulation + micro cellulose fibers
        float macroWave = fbm(vec2(uv.x * 3.5, 1.2)) * 0.14;
        float microTear = snoise(vec2(uv.x * 18.0, uv.y * 8.0)) * 0.04;
        float breathingFlame = sin(u_time * 2.2 + uv.x * 8.0) * 0.015;

        // Current organic height of the fire line
        // u_burnProgress goes 0 -> 1. Paper burns from Y = 1.0 (bottom) up to Y = 0.0 (top)
        float fireLineY = (1.0 - u_burnProgress * 1.18) + macroWave + microTear + breathingFlame;

        // Distance from current pixel to the fire line (positive = paper above flame, negative = burned below flame)
        float distToFire = uv.y - fireLineY;

        // 2. Rising Heat Mirage Shimmer above the fire
        float heatInfluence = smoothstep(0.35, 0.0, distToFire) * smoothstep(-0.15, 0.0, distToFire);
        vec2 heatRefract = vec2(
          sin(u_time * 2.5 + uv.y * 24.0),
          cos(u_time * 2.0 + uv.x * 18.0)
        ) * 0.0035 * heatInfluence;

        vec4 topColor = texture2D(u_top, uvTop + heatRefract);
        vec4 bottomColor = texture2D(u_bottom, uvBottom);

        // 3. Volumetric Upward Licking Fire Tongues (Real combustion flames)
        vec2 flameUV = uv * vec2(12.0, 4.0);
        flameUV.y += u_time * 1.4; // Upward convection velocity
        flameUV.x += sin(u_time * 1.2 + uv.y * 6.0) * 0.35; // Turbulent curl

        float flameNoise1 = fbm(flameUV);
        float flameNoise2 = fbm(flameUV * 2.2 + vec2(2.1, 4.7));
        float flameTurbulence = flameNoise1 * 0.65 + flameNoise2 * 0.35;

        // Flame zone extends upward from the burning edge (distToFire between -0.04 and 0.14)
        float flameMask = smoothstep(-0.04, 0.01, distToFire) * (1.0 - smoothstep(0.04, 0.16, distToFire));
        float flameTongue = flameMask * pow(flameTurbulence + 0.12, 1.7) * 2.4;

        // ------------------ LAYERED COMBUSTION REALISM ------------------

        // ZONE 1: Paper burned away and black ash has blown away into the air! (Reveals bottom photo)
        if (distToFire > 0.055) {
          // Contact drop-shadow cast by the curled burnt paper edge
          float shadowAmt = smoothstep(0.055, 0.14, distToFire);
          vec3 revealed = mix(bottomColor.rgb * 0.32, bottomColor.rgb, shadowAmt);
          gl_FragColor = vec4(revealed, 1.0);
        }
        // ZONE 2: Craggy Black Charred Carbon Edge (Ash about to crumble and blow away)
        else if (distToFire > 0.012) {
          float t = (distToFire - 0.012) / 0.043;
          vec3 carbonDeep = vec3(0.02, 0.012, 0.01);
          vec3 carbonSoot = vec3(0.07, 0.04, 0.02);
          vec3 emberCling = vec3(0.85, 0.18, 0.02);

          float textureBump = snoise(uv * 70.0) * 0.5 + 0.5;
          vec3 charredCrust = mix(carbonDeep, carbonSoot, textureBump);

          // Glowing red embers clinging to the black ash
          float emberGlow = step(0.78, snoise(uv * 90.0 + vec2(u_time * 0.15)));
          charredCrust = mix(charredCrust, emberCling, pow(1.0 - t, 2.5) * 0.85 + emberGlow * 0.4);

          // Add licking flame highlights
          if (flameTongue > 0.1) {
            vec3 tongueCol = mix(vec3(1.0, 0.3, 0.01), vec3(1.3, 0.9, 0.2), flameTongue);
            charredCrust = mix(charredCrust, tongueCol, flameTongue * 0.6);
          }

          gl_FragColor = vec4(charredCrust, 1.0);
        }
        // ZONE 3: Active Blazing Fireline (Intense white-hot core, vivid yellow & fire orange)
        else if (distToFire > -0.025) {
          float t = (distToFire - (-0.025)) / 0.037;

          // Pure fire spectrum: Deep Crimson -> Cadmium Orange -> Sun Gold -> White-Hot Core
          vec3 colCrimson = vec3(0.80, 0.08, 0.01);
          vec3 colOrange  = vec3(1.0, 0.40, 0.02);
          vec3 colYellow  = vec3(1.0, 0.88, 0.12);
          vec3 colWhite   = vec3(1.45, 1.40, 1.15);

          vec3 flameCol;
          if (t < 0.4) {
            flameCol = mix(colCrimson, colOrange, t / 0.4);
          } else if (t < 0.8) {
            flameCol = mix(colOrange, colYellow, (t - 0.4) / 0.4);
          } else {
            flameCol = mix(colYellow, colWhite, (t - 0.8) / 0.2);
          }

          // Living heat pulse
          flameCol *= (1.25 + sin(u_time * 2.8 + uv.x * 12.0) * 0.25);

          if (flameTongue > 0.05) {
            vec3 tongueCol = mix(vec3(1.0, 0.25, 0.02), vec3(1.4, 1.2, 0.5), flameTongue);
            flameCol = max(flameCol, tongueCol);
          }

          gl_FragColor = vec4(flameCol, 1.0);
        }
        // ZONE 4: Toasted Sienna Scorched Halo (Thermal damage & soot in paper)
        else if (distToFire > -0.12) {
          float t = (distToFire - (-0.12)) / 0.095;
          vec3 scorchSienna = vec3(0.30, 0.14, 0.05);
          vec3 toastedHalo = mix(topColor.rgb * 0.65, scorchSienna, t);

          // Curled paper lip highlight
          float lipHighlight = smoothstep(-0.06, -0.03, distToFire) * (1.0 - smoothstep(-0.03, 0.0, distToFire));
          toastedHalo += vec3(0.12, 0.09, 0.05) * lipHighlight;

          // Licking flame tips shooting into the scorched paper
          if (flameTongue > 0.2) {
            vec3 softFlame = vec3(1.0, 0.45, 0.05);
            toastedHalo = mix(toastedHalo, softFlame, (flameTongue - 0.2) * 0.5);
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
    const uBurnProgressLoc = gl.getUniformLocation(program, 'u_burnProgress');
    const uTimeLoc = gl.getUniformLocation(program, 'u_time');

    gl.uniform1i(uTopLoc, 0);
    gl.uniform1i(uBottomLoc, 1);

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

    // ---------------- ASH FLAKES & FLYING EMBERS SIMULATION ----------------
    // Simulates the black charred paper crumbling and flying away into the wind (Hawa me udna)!
    const ashFlakes = [];
    const maxAshFlakes = 65;

    const sparks = [];
    const maxSparks = 70;

    // Spawn tumbling black paper ash flakes that float in the wind
    const spawnAshFlake = (x, y) => {
      if (ashFlakes.length >= maxAshFlakes) return;
      ashFlakes.push({
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 15,
        vx: (Math.random() - 0.42) * 2.2, // Drift sideways with natural wind
        vy: -Math.random() * 2.5 - 1.0, // Float upward on hot thermal draft
        width: Math.random() * 9 + 5,
        height: Math.random() * 6 + 3,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.08,
        flipAngle: Math.random() * Math.PI * 2,
        flipSpeed: Math.random() * 0.06 + 0.02,
        life: 1.0,
        decay: Math.random() * 0.009 + 0.006, // Floats long into the air
        colorR: Math.floor(Math.random() * 15 + 18),
        colorG: Math.floor(Math.random() * 12 + 16),
        colorB: Math.floor(Math.random() * 10 + 14),
        hasEmberGlow: Math.random() < 0.45
      });
    };

    // Spawn bright fiery spark embers
    const spawnSpark = (x, y) => {
      if (sparks.length >= maxSparks) return;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 1.6 + 0.6;
      sparks.push({
        x: x + (Math.random() - 0.5) * 30,
        y: y + (Math.random() - 0.5) * 12,
        vx: Math.cos(angle) * speed + 0.3,
        vy: Math.sin(angle) * speed - (Math.random() * 2.0 + 1.2), // Rising updraft
        size: Math.random() * 2.0 + 0.8,
        life: 1.0,
        decay: Math.random() * 0.014 + 0.009,
        heat: Math.random() * 0.35 + 0.65
      });
    };

    // Burning state & interaction
    let currentBurn = 0.08; // Start with gentle bottom fire lit
    let targetBurn = 0.08;
    let isHovering = false;
    let autoBurn = false;
    let clock = 0;
    let animId;

    // Reset Sheet
    resetBurnRef.current = () => {
      targetBurn = 0.0;
      currentBurn = 0.0;
      setIsAutoBurning(false);
      autoBurn = false;
      // Burst of ash blowing away
      for (let i = 0; i < 40; i++) {
        spawnAshFlake(Math.random() * W, H * 0.85);
        spawnSpark(Math.random() * W, H * 0.85);
      }
    };

    // Auto-Burn Toggle
    triggerAutoBurnRef.current = () => {
      setIsAutoBurning(prev => {
        const next = !prev;
        autoBurn = next;
        return next;
      });
    };

    // Main 60fps Loop
    const renderLoop = () => {
      clock += 0.016;

      // Auto-burn progression if active
      if (autoBurn) {
        targetBurn = Math.min(1.0, targetBurn + 0.002);
      }

      // Smooth interpolation of burn progress
      currentBurn += (targetBurn - currentBurn) * 0.08;

      // Current screen Y coordinate of active fire line
      const currentFireScreenY = (1.0 - currentBurn * 1.15) * H;

      // If burning is active, continuously spawn crumbling black ash flakes & sparks along the fire front!
      if (currentBurn > 0.02 && currentBurn < 0.98) {
        if (Math.random() < 0.75) {
          const spawnX = Math.random() * W;
          spawnAshFlake(spawnX, currentFireScreenY);
        }
        if (Math.random() < 0.85) {
          const spawnX = Math.random() * W;
          spawnSpark(spawnX, currentFireScreenY);
        }
      }

      // Render WebGL Fire & Paper Dissolve
      if (topTexReady && bottomTexReady) {
        gl.viewport(0, 0, W, H);
        gl.uniform1f(uBurnProgressLoc, currentBurn);
        gl.uniform1f(uTimeLoc, clock);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      // Render Particle Canvas (Black Paper Ash Flakes + Sparks Flying Away in Wind)
      pCtx.clearRect(0, 0, W, H);

      // 1. Draw Crumbling Black Paper Ash Flakes (Hawa me udte hue kaale paper ke tukde)
      for (let i = ashFlakes.length - 1; i >= 0; i--) {
        const a = ashFlakes[i];
        a.x += a.vx + Math.sin(clock * 1.8 + a.y * 0.02) * 0.7; // Wind flutter
        a.y += a.vy;
        a.vy -= 0.015; // Gentle upward thermal lift
        a.rotation += a.rotSpeed;
        a.flipAngle += a.flipSpeed;
        a.life -= a.decay;

        if (a.life <= 0 || a.y < -30 || a.x < -30 || a.x > W + 30) {
          ashFlakes.splice(i, 1);
          continue;
        }

        const alpha = Math.min(1.0, a.life * 1.4);
        const flipScale = Math.abs(Math.cos(a.flipAngle)); // 3D tumbling perspective

        pCtx.save();
        pCtx.translate(a.x, a.y);
        pCtx.rotate(a.rotation);
        pCtx.scale(1.0, Math.max(0.2, flipScale));

        // Black carbon ash flake body
        pCtx.beginPath();
        pCtx.rect(-a.width / 2, -a.height / 2, a.width, a.height);
        pCtx.fillStyle = `rgba(${a.colorR}, ${a.colorG}, ${a.colorB}, ${alpha * 0.92})`;
        pCtx.fill();

        // Glowing red/orange ember edge on the black flake
        if (a.hasEmberGlow && a.life > 0.4) {
          pCtx.strokeStyle = `rgba(255, 75, 10, ${alpha * (a.life - 0.3)})`;
          pCtx.lineWidth = 1.2;
          pCtx.stroke();
        }
        pCtx.restore();
      }

      // 2. Draw Fiery Sparks & Embers
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx + Math.sin(clock * 2.2 + s.y * 0.04) * 0.5;
        s.y += s.vy;
        s.vy -= 0.022; // Rising draft
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

    // Interactive Hover: Moving mouse vertically guides the fire up the paper
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseY = (e.clientY - rect.top) / rect.height;
      // Moving mouse upward (smaller mouseY) burns paper further up!
      const burnFromHover = Math.max(0.08, Math.min(1.0, (1.0 - mouseY) * 1.1));
      targetBurn = Math.max(targetBurn, burnFromHover); // Stays burned like real paper
    };

    const handleMouseEnter = () => {
      isHovering = true;
    };

    const handleMouseLeave = () => {
      isHovering = false;
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

      {/* 2. Realistic Physical Paper Combustion Stage */}
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

            {/* Overlaid Particle Canvas for Flying Black Paper Ash & Sparks */}
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
              className={`icon-only-btn ${isAutoBurning ? 'active-icon-btn' : ''}`}
              onClick={() => triggerAutoBurnRef.current && triggerAutoBurnRef.current()}
              aria-label={isAutoBurning ? "Pause Fire" : "Burn Sheet"}
              title={isAutoBurning ? "Pause Fire" : "Burn Paper (Auto)"}
            >
              {isAutoBurning ? <Pause size={17} /> : <Flame size={18} />}
            </button>

            <button 
              className="icon-only-btn reset-icon-btn"
              onClick={() => resetBurnRef.current && resetBurnRef.current()}
              aria-label="Restore Sheet"
              title="Restore Sheet"
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
            Realistic physical paper combustion: natural creeping fire front (no circles), 
            tall upward-licking flames, craggy black carbon crust, and black paper ash flakes 
            crumbling and blowing away in the wind to reveal the portrait underneath.
          </p>
        </div>
      </section>
    </div>
  );
}
