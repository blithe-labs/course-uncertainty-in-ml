(function () {
  var canvas = document.createElement("canvas");
  canvas.style.cssText = [
    "position:fixed", "top:0", "left:0",
    "width:100vw", "height:100vh",
    "pointer-events:none",
    "z-index:9999",
    "display:block"
  ].join(";");
  document.body.appendChild(canvas);

  var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  if (!gl) { console.error("smoke.js: WebGL not available"); return; }

  // ── Shaders ───────────────────────────────────────────────────────────────

  var vert = [
    "attribute vec2 a_pos;",
    "void main(){gl_Position=vec4(a_pos,0.0,1.0);}"
  ].join("\n");

  var frag = [
    "precision highp float;",
    "uniform float u_time;",
    "uniform float u_blow;",
    "uniform vec2  u_res;",

    "float hash(vec2 p){",
    "  p=fract(p*vec2(127.1,311.7));p+=dot(p,p+43.21);",
    "  return fract(p.x*p.y);",
    "}",
    "float noise(vec2 p){",
    "  vec2 i=floor(p),f=fract(p);",
    "  f=f*f*(3.0-2.0*f);",
    "  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),",
    "             mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);",
    "}",
    "float fbm(vec2 p){",
    "  float v=0.0,a=0.5;",
    "  mat2 r=mat2(1.6,1.2,-1.2,1.6);",
    "  for(int i=0;i<7;i++){v+=a*noise(p);p=r*p;a*=0.5;}",
    "  return v;",
    "}",
    "void main(){",
    "  vec2 uv=gl_FragCoord.xy/u_res;",
    "  float t=u_time*0.07;",
    "  float wind=u_blow*u_blow*6.0;",
    "  vec2 wd=vec2(1.0,0.15);",
    "  vec2 q=vec2(fbm(uv+wd*wind*0.2+t),fbm(uv+vec2(5.2,1.3)+wd*wind*0.1));",
    "  vec2 r=vec2(fbm(uv+3.5*q+vec2(1.7,9.2)+0.14*t+wd*wind*0.5),",
    "              fbm(uv+3.5*q+vec2(8.3,2.8)+0.11*t+wd*wind*0.4));",
    "  float f=fbm(uv+3.0*r+0.04*t+wd*wind);",
    "  vec2 c=uv-vec2(0.5);",
    "  float vign=1.0-smoothstep(0.2,0.9,length(c));",
    "  float dissipate=1.0-smoothstep(0.25,1.0,u_blow);",
    "  float alpha=clamp(pow(f,1.4)*vign*1.2*dissipate,0.0,0.7);",
    "  gl_FragColor=vec4(0.0,0.0,0.0,alpha);",
    "}"
  ].join("\n");

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
      console.error("smoke shader error:", gl.getShaderInfoLog(s));
    return s;
  }

  var glProg = gl.createProgram();
  gl.attachShader(glProg, compile(gl.VERTEX_SHADER, vert));
  gl.attachShader(glProg, compile(gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(glProg);
  gl.useProgram(glProg);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
  var aPos = gl.getAttribLocation(glProg, "a_pos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  var uTime = gl.getUniformLocation(glProg, "u_time");
  var uBlow = gl.getUniformLocation(glProg, "u_blow");
  var uRes  = gl.getUniformLocation(glProg, "u_res");

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener("resize", resize);

  // ── Blow state ────────────────────────────────────────────────────────────

  var blow      = 0.0;
  var blowFrom  = 0.0;
  var blowTo    = 0.0;
  var blowT0    = null;
  var DURATION  = 1500; // ms
  var onTitle   = true;

  function startBlow(to) {
    blowFrom = blow;
    blowTo   = to;
    blowT0   = performance.now();
  }

  function easeInOutCubic(x) {
    return x < 0.5 ? 4*x*x*x : 1 - Math.pow(-2*x+2,3)/2;
  }

  // ── Slide change listener ─────────────────────────────────────────────────

  function handleSlideChange(indexh) {
    console.log("smoke: slide changed to", indexh, "onTitle:", onTitle);
    var goingToTitle = (indexh === 0);
    if (goingToTitle && !onTitle) {
      onTitle = true;
      canvas.style.display = "block";
      startBlow(0.0);
    } else if (!goingToTitle && onTitle) {
      onTitle = false;
      startBlow(1.0);
    }
  }

  // Reveal dispatches DOM events on .reveal element — works regardless of API version
  function attachRevealEvents() {
    // DOM event on .reveal element (most reliable)
    var revealEl = document.querySelector(".reveal");
    if (revealEl) {
      revealEl.addEventListener("slidechanged", function (e) {
        console.log("smoke: slidechanged", e.detail);
        handleSlideChange(e.detail ? e.detail.indexh : 0);
      });
      console.log("smoke.js: attached via DOM .reveal listener");
    }
    // Also try Reveal global as fallback
    if (window.Reveal && Reveal.on) {
      Reveal.on("slidechanged", function (e) { handleSlideChange(e.indexh); });
    }
  }

  attachRevealEvents();

  // ── Render loop ───────────────────────────────────────────────────────────

  var start = performance.now();

  function render() {
    requestAnimationFrame(render);

    // Update blow animation
    if (blowT0 !== null) {
      var elapsed = (performance.now() - blowT0) / DURATION;
      if (elapsed >= 1.0) {
        blow = blowTo;
        blowT0 = null;
        // Hide canvas after blowing away
        if (blowTo === 1.0) canvas.style.display = "none";
      } else {
        blow = blowFrom + (blowTo - blowFrom) * easeInOutCubic(elapsed);
      }
    }

    if (canvas.style.display === "none") return;

    var t = (performance.now() - start) / 1000;
    gl.uniform1f(uTime, t);
    gl.uniform1f(uBlow, blow);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  render();
})();
