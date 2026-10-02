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

  // Photorealistic GPU WebGL Burning Paper Dissolve Shader Engine
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

    // Fragment Shader: Realistic Burning Paper Dissolve Shader
    const fsSource = `
      precision highp float;
      uniform sampler2D u_top;
      uniform sampler2D u_bottom;
      uniform vec2 u_mouse;
      uniform float u_radius;
      uniform float u_aspect;
      uniform float u_hover;
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

      // Fractal Brownian Motion for authentic paper fiber burning patterns
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
        vec4 topColor = texture2D(u_top, uv);
        vec4 bottomColor = texture2D(u_bottom, uv);

        if (u_hover <= 0.01) {
          gl_FragColor = topColor;
          return;
        }

        // Exact distance from mouse with aspect ratio correction
        vec2 diff = uv - u_mouse;
        diff.y *= u_aspect;
        float dist = length(diff);

        // Organic fibrous paper grain noise
        float noiseVal = fbm(uv * 18.0) * 0.5 + 0.5;

        // Burn falls off strictly with cursor hover (does not spread everywhere!)
        float burnMask = 1.0 - smoothstep(0.0, u_radius, dist);

        // Combine distance falloff with paper fiber noise
        float burnProgress = burnMask * 1.35 - (1.0 - noiseVal) * 0.42;

        // ZONE 1: Paper completely consumed by fire (reveals bottom photo)
        if (burnProgress > 0.82) {
          gl_FragColor = bottomColor;
        }
        // ZONE 2: Smoldering glowing ember fire line (hot glowing orange/red embers)
        else if (burnProgress > 0.72) {
          float t = (burnProgress - 0.72) / 0.10;
          // Blazing ember gradient from red-orange to hot golden white
          vec3 ember = mix(vec3(1.0, 0.22, 0.0), vec3(1.0, 0.92, 0.45), t);
          ember *= 1.85; // High emission heat glow
          gl_FragColor = vec4(ember, 1.0);
        }
        // ZONE 3: Charred black carbon ash (burnt crisp paper border)
        else if (burnProgress > 0.58) {
          float t = (burnProgress - 0.58) / 0.14;
          vec3 carbonAsh = vec3(0.06, 0.03, 0.02);
          vec3 emberCreep = vec3(0.85, 0.15, 0.0);
          gl_FragColor = vec4(mix(carbonAsh, emberCreep, t * 0.65), 1.0);
        }
        // ZONE 4: Toasted brown scorched paper (heat discoloration on paper)
        else if (burnProgress > 0.42) {
          float t = (burnProgress - 0.42) / 0.16;
          vec3 scorch = vec3(0.24, 0.11, 0.05);
          gl_FragColor = vec4(mix(topColor.rgb * 0.75, scorch, t), 1.0);
        }
        // ZONE 5: Intact unburned paper
        else {
          gl_FragColor = topColor;
        }
      }
    `;

    // Shader compilation helper
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

    gl.uniform1i(uTopLoc, 0);
    gl.uniform1i(uBottomLoc, 1);
    gl.uniform1f(uRadiusLoc, 0.22); // Burn radius strictly around hover
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

    const checkReadyAndDraw = () => {
      if (topTexReady && bottomTexReady) {
        drawFrame();
      }
    };

    topImg.onload = () => {
      createTexture(0, topImg);
      topTexReady = true;
      checkReadyAndDraw();
    };
    topImg.src = '/assets/anime_layer.png';
    if (topImg.complete) {
      createTexture(0, topImg);
      topTexReady = true;
    }

    bottomImg.onload = () => {
      createTexture(1, bottomImg);
      bottomTexReady = true;
      checkReadyAndDraw();
    };
    bottomImg.src = '/assets/real_layer.jpg';
    if (bottomImg.complete) {
      createTexture(1, bottomImg);
      bottomTexReady = true;
    }

    // Mouse Tracking: Normalized (0 to 1) coordinates
    let mouseNorm = { x: 0.5, y: 0.5 };
    let isHovered = false;

    const drawFrame = () => {
      if (!topTexReady || !bottomTexReady) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uMouseLoc, mouseNorm.x, mouseNorm.y);
      gl.uniform1f(uHoverLoc, isHovered ? 1.0 : 0.0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      mouseNorm.x = Math.max(0, Math.min(1, x));
      mouseNorm.y = Math.max(0, Math.min(1, y));
      isHovered = true;
      drawFrame();
    };

    const handleMouseEnter = () => {
      isHovered = true;
      drawFrame();
    };

    const handleMouseLeave = () => {
      isHovered = false;
      drawFrame();
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseenter', handleMouseEnter);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
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

      {/* 2. Immersive Hero Viewport (Photorealistic Burning Paper Shader) */}
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
