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

  // Living GPU WebGL Burning Paper Shader with Heat Shimmer, Flickering Embers & Curling Shadow
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }

    // Vertex Shader: Fullscreen Quad
    const vsSource = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = (a_position + 1.0) * 0.5;
        v_uv.y = 1.0 - v_uv.y; // Flip Y for WebGL texture orientation
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    // Fragment Shader: Living Burning Paper Shader with Heat Haze & Curling Paper Shadow
    const fsSource = `
      precision highp float;
      uniform sampler2D u_top;
      uniform sampler2D u_bottom;
      uniform vec2 u_mouse;
      uniform float u_radius;
      uniform float u_aspect;
      uniform float u_hover;
      uniform float u_time;
      varying vec2 v_uv;

      // 2D Simplex Noise generator
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

      // Fractal Brownian Motion for paper grain
      float fbm(vec2 p) {
        float f = 0.0;
        f += 0.5000 * snoise(p); p *= 2.02;
        f += 0.2500 * snoise(p); p *= 2.03;
        f += 0.1250 * snoise(p); p *= 2.01;
        f += 0.0625 * snoise(p);
        return f;
      }

      void main() {
        vec2 uv = v_uv;

        // If not hovered, render pristine paper layer
        if (u_hover <= 0.001) {
          gl_FragColor = texture2D(u_top, uv);
          return;
        }

        // Distance from cursor with aspect ratio correction
        vec2 diff = uv - u_mouse;
        diff.y *= u_aspect;
        float dist = length(diff);

        // Approximate burn influence for heat haze
        float approxBurn = 1.0 - smoothstep(0.0, u_radius * 1.3, dist);

        // Heat Refraction / Shimmer Wave (Heat mirage around the burning zone)
        vec2 heatHaze = vec2(
          sin(u_time * 10.0 + uv.y * 35.0),
          cos(u_time * 8.0 + uv.x * 35.0)
        ) * 0.0035 * approxBurn;

        vec2 distortedUv = uv + heatHaze;

        vec4 topColor = texture2D(u_top, distortedUv);
        vec4 bottomColor = texture2D(u_bottom, uv);

        // Organic fibrous paper grain noise with subtle heat breathing
        float noiseVal = fbm(uv * 18.0 + vec2(0.0, u_time * 0.03)) * 0.5 + 0.5;

        // Local burn progress strictly around hover cursor
        float burnMask = 1.0 - smoothstep(0.0, u_radius, dist);

        // Alive heat flicker along the burn contour
        float flicker = sin(u_time * 12.0) * 0.03 + cos(u_time * 24.0 + uv.x * 20.0) * 0.02;

        // Combine distance falloff with paper noise and flicker
        float burnProgress = burnMask * 1.35 - (1.0 - noiseVal) * 0.40 + flicker;

        // ZONE 1: Paper completely burned away (Reveals bottom photo with curling paper shadow)
        if (burnProgress > 0.82) {
          // Ambient drop shadow under curling burnt paper edge
          float edgeDist = burnProgress - 0.82;
          float shadowFactor = smoothstep(0.0, 0.08, edgeDist);
          vec3 shadowedBottom = mix(bottomColor.rgb * 0.45, bottomColor.rgb, shadowFactor);
          gl_FragColor = vec4(shadowedBottom, 1.0);
        }
        // ZONE 2: Smoldering glowing ember fire line (Actively pulsing, breathing living heat)
        else if (burnProgress > 0.72) {
          float t = (burnProgress - 0.72) / 0.10;
          // Pulse the heat intensity with u_time
          float pulse = 1.6 + sin(u_time * 9.0 + uv.x * 30.0) * 0.35 + cos(u_time * 17.0) * 0.2;
          // Blazing ember gradient from red-orange to white-hot golden core
          vec3 ember = mix(vec3(1.0, 0.18, 0.0), vec3(1.0, 0.95, 0.5), t);
          ember *= pulse;
          gl_FragColor = vec4(ember, 1.0);
        }
        // ZONE 3: Charred black carbon ash (Crisp burnt curled edge)
        else if (burnProgress > 0.57) {
          float t = (burnProgress - 0.57) / 0.15;
          vec3 carbonAsh = vec3(0.05, 0.025, 0.015);
          vec3 emberCreep = vec3(0.85, 0.12, 0.0);
          gl_FragColor = vec4(mix(carbonAsh, emberCreep, t * 0.7), 1.0);
        }
        // ZONE 4: Toasted brown scorched paper (Heat damage in paper fibers)
        else if (burnProgress > 0.41) {
          float t = (burnProgress - 0.41) / 0.16;
          vec3 scorch = vec3(0.24, 0.11, 0.04);
          gl_FragColor = vec4(mix(topColor.rgb * 0.75, scorch, t), 1.0);
        }
        // ZONE 5: Pristine unburned paper
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

    // Uniform locations
    const uTopLoc = gl.getUniformLocation(program, 'u_top');
    const uBottomLoc = gl.getUniformLocation(program, 'u_bottom');
    const uMouseLoc = gl.getUniformLocation(program, 'u_mouse');
    const uRadiusLoc = gl.getUniformLocation(program, 'u_radius');
    const uAspectLoc = gl.getUniformLocation(program, 'u_aspect');
    const uHoverLoc = gl.getUniformLocation(program, 'u_hover');
    const uTimeLoc = gl.getUniformLocation(program, 'u_time');

    gl.uniform1i(uTopLoc, 0);
    gl.uniform1i(uBottomLoc, 1);
    gl.uniform1f(uRadiusLoc, 0.24); // Burning zone strictly around hover
    gl.uniform1f(uAspectLoc, canvas.height / canvas.width);

    // Texture creation helper
    const createTexture = (unit, img) => {
      const tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
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

    // Smooth cursor interpolation (heat inertia)
    let targetMouse = { x: 0.5, y: 0.5 };
    let currentMouse = { x: 0.5, y: 0.5 };
    let isHovered = false;
    let hoverAmount = 0.0;
    let animId;
    let clock = 0;

    // Continuous 60fps render loop so the fire is actively alive and breathing
    const renderLoop = () => {
      clock += 0.035;

      // Smoothly interpolate hover and cursor position for organic fluid response
      currentMouse.x += (targetMouse.x - currentMouse.x) * 0.16;
      currentMouse.y += (targetMouse.y - currentMouse.y) * 0.16;
      hoverAmount += ((isHovered ? 1.0 : 0.0) - hoverAmount) * 0.12;

      if (topTexReady && bottomTexReady) {
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(uMouseLoc, currentMouse.x, currentMouse.y);
        gl.uniform1f(uHoverLoc, hoverAmount);
        gl.uniform1f(uTimeLoc, clock);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
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

      {/* 2. Immersive Hero Viewport (Living Burning Paper Shader) */}
      <main className="hero-viewport">
        <div className="art-stage-wrapper">
          <canvas 
            ref={canvasRef} 
            width={460} 
            height={680} 
            className="burning-shader-canvas"
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
