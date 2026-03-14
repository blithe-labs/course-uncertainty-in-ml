(function () {
  // Full-viewport canvas, fixed on top of everything
  var canvas = document.createElement("canvas");
  canvas.style.cssText = [
    "position:fixed",
    "top:0", "left:0",
    "width:100vw", "height:100vh",
    "pointer-events:none",
    "z-index:9999",
    "display:block"
  ].join(";");
  document.body.appendChild(canvas);

  // Sanity check: briefly flash red so we know the canvas is live
  canvas.style.background = "rgba(255,0,0,0.4)";
  setTimeout(function () { canvas.style.background = ""; }, 800);

  var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  if (!gl) { console.error("smoke.js: WebGL not available"); return; }

  var vert = [
    "attribute vec2 a_pos;",
    "void main(){gl_Position=vec4(a_pos,0.0,1.0);}"
  ].join("\n");

  var frag = [
    "precision highp float;",
    "uniform float u_time;",
    "uniform vec2  u_res;",

    "float hash(vec2 p){",
    "  p=fract(p*vec2(127.1,311.7));",
    "  p+=dot(p,p+43.21);",
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
    "  vec2 q=vec2(fbm(uv+t),fbm(uv+vec2(5.2,1.3)));",
    "  vec2 r=vec2(fbm(uv+3.5*q+vec2(1.7,9.2)+0.14*t),",
    "              fbm(uv+3.5*q+vec2(8.3,2.8)+0.11*t));",
    "  float f=fbm(uv+3.0*r+0.04*t);",
    "  vec2 c=uv-vec2(0.5);",
    "  float vign=1.0-smoothstep(0.2,0.9,length(c));",
    "  f=pow(f,1.4);",
    "  float alpha=clamp(f*vign*1.2,0.0,0.7);",
    "  gl_FragColor=vec4(0.0,0.0,0.0,alpha);", // black smoke
    "}"
  ].join("\n");

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error("smoke.js shader error:", gl.getShaderInfoLog(s));
    }
    return s;
  }

  var prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, vert));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error("smoke.js link error:", gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  var aPos = gl.getAttribLocation(prog, "a_pos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  var uTime = gl.getUniformLocation(prog, "u_time");
  var uRes  = gl.getUniformLocation(prog, "u_res");

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

  var start = performance.now();
  var active = true;

  // Only show smoke on title slide (index 0)
  function onSlideChange(e) {
    var idx = e.indexh !== undefined ? e.indexh : 0;
    active = (idx === 0);
    canvas.style.opacity = active ? "1" : "0";
  }

  if (window.Reveal) {
    Reveal.on("slidechanged", onSlideChange);
  }

  function render() {
    requestAnimationFrame(render);
    if (!active) return;
    var t = (performance.now() - start) / 1000;
    gl.uniform1f(uTime, t);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  render();
})();
