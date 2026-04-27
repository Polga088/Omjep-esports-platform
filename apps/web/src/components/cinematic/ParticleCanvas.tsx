import { useEffect, useRef } from 'react'

const N = 3000

const VS = `#version 300 es
precision highp float;
in vec2 a_base;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_dpr;
out float v_intensity;
void main() {
  vec2 p = a_base;
  vec2 m = u_mouse;
  float d = distance(p, m);
  if (d < 0.9) {
    vec2 dir = p - m;
    float l = max(length(dir), 1e-4);
    p += (dir / l) * (0.15 / (d * 6.0 + 0.05));
  }
  p += 0.012 * vec2(
    sin(u_time * 0.4 + a_base.x * 6.0 + a_base.y * 2.0),
    cos(u_time * 0.35 + a_base.y * 5.0 - a_base.x * 1.5)
  );
  gl_Position = vec4(p, 0.0, 1.0);
  gl_PointSize = 2.2 * u_dpr;
  v_intensity = 0.55 + 0.45 * sin(u_time * 0.2 + a_base.x * 12.0);
}
`

const FS = `#version 300 es
precision highp float;
in float v_intensity;
uniform float u_theme;
out vec4 fragColor;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  if (dot(c, c) > 0.25) discard;
  vec3 darkCol = vec3(0.133, 0.773, 0.369);
  vec3 lightCol = vec3(0.376, 0.451, 0.404);
  vec3 col = mix(darkCol, lightCol, u_theme) * (0.75 + 0.25 * v_intensity);
  float a = mix(0.55, 0.28, u_theme) * v_intensity;
  fragColor = vec4(col, a);
}
`

function createProgram(gl: WebGL2RenderingContext) {
  const v = gl.createShader(gl.VERTEX_SHADER)
  const f = gl.createShader(gl.FRAGMENT_SHADER)
  if (!v || !f) return null
  gl.shaderSource(v, VS)
  gl.compileShader(v)
  gl.shaderSource(f, FS)
  gl.compileShader(f)
  const p = gl.createProgram()
  if (!p) return null
  gl.attachShader(p, v)
  gl.attachShader(p, f)
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    gl.deleteProgram(p)
    return null
  }
  return p
}

type ParticleCanvasProps = {
  className?: string
  /** Moins de particules + pas d’anim si true */
  reducedMotion: boolean
  theme?: 'dark' | 'light'
}

/**
 * 3000 particules émeraude (WebGL 2) — suivi souris, fond ciné.
 */
export default function ParticleCanvas({ className = '', reducedMotion, theme = 'dark' }: ParticleCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  const mouse = useRef({ x: -2, y: -2 })
  const raf = useRef<number>(0)

  useEffect(() => {
    if (reducedMotion) return
    const canvas = ref.current
    if (!canvas) return
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: true, powerPreference: 'low-power' })
    if (!gl) return
    const program = createProgram(gl)
    if (!program) return

    const locBase = gl.getAttribLocation(program, 'a_base')
    const uTime = gl.getUniformLocation(program, 'u_time')
    const uMouse = gl.getUniformLocation(program, 'u_mouse')
    const uDpr = gl.getUniformLocation(program, 'u_dpr')
    const uTheme = gl.getUniformLocation(program, 'u_theme')

    const data = new Float32Array(N * 2)
    for (let i = 0; i < N; i += 1) {
      const r = 0.12 + (i * 0.00037) % 0.88
      const t = (i * 0.6180339887) % 6.283
      data[i * 2] = r * Math.cos(t) * 0.95
      data[i * 2 + 1] = (r * Math.sin(t) * 0.95) * 0.7
    }

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)

    const handleResize = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    handleResize()
    const ro = new ResizeObserver(handleResize)
    ro.observe(canvas)

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1)
      mouse.current = { x, y }
    }
    const onLeave = () => {
      mouse.current = { x: -2, y: -2 }
    }
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerleave', onLeave)

    const t0 = performance.now()
    const loop = (now: number) => {
      const t = (now - t0) * 0.001
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
      gl.useProgram(program)
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.enableVertexAttribArray(locBase)
      gl.vertexAttribPointer(locBase, 2, gl.FLOAT, false, 0, 0)
      gl.uniform1f(uTime, t)
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      gl.uniform1f(uDpr, dpr)
      gl.uniform1f(uTheme, theme === 'light' ? 1 : 0)
      gl.uniform2f(uMouse, mouse.current.x, mouse.current.y)
      gl.drawArrays(gl.POINTS, 0, N)
      raf.current = requestAnimationFrame(loop)
    }
    raf.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf.current)
      ro.disconnect()
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerleave', onLeave)
      gl.deleteProgram(program)
      gl.deleteBuffer(buffer)
    }
  }, [reducedMotion, theme])

  if (reducedMotion) {
    return (
      <div
        className={`pointer-events-none absolute inset-0 ${theme === 'light' ? 'bg-[radial-gradient(ellipse_80%_60%_at_50%_30%,rgba(22,101,52,0.09),transparent_55%)]' : 'bg-[radial-gradient(ellipse_80%_60%_at_50%_30%,rgba(34,197,94,0.12),transparent_55%)]'} ${className}`.trim()}
        aria-hidden
      />
    )
  }

  return (
    <canvas
      ref={ref}
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`.trim()}
      aria-hidden
    />
  )
}
