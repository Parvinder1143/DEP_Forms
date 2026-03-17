'use client'

import { useEffect, useRef } from 'react'

/**
 * Full-page canvas background with an interactive dot grid.
 *
 * Shape behaviour:
 *   • Cursor at screen centre  → perfect sphere (rx = ry)
 *   • Cursor near left/right   → oval squished horizontally (rx shrinks)
 *   • Cursor near top/bottom   → oval squished vertically   (ry shrinks)
 *   • The transition is continuous and fully smooth.
 *
 * Per-dot 3-D effect (ellipsoidal hemisphere):
 *   • Dot at the "pole" (under cursor) scales up, darkens, fully opaque.
 *   • Dots towards the "equator" are pushed outward, mimicking a curved surface.
 *   • Everything lerps smoothly on mouse move and dissolves on mouse leave.
 */
export default function DotGridBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // ── tuneable constants ────────────────────────────────────────────────────
    const SPACING    = 30     // px between dot centres
    const BASE_R     = 2.2    // dot radius at res
    const SPHERE_R   = 150    // base influence radius used when cursor is at centre
    const PUSH_SCALE = 0.22   // how far dots shift outward along ellipsoid surface
    const MAX_SQUISH = 0.52   // max axis reduction at screen edge (0 = no squish, 1 = flat)
    const EASE       = 0.10   // lerp speed for smooth mouse follow / leave

    // resting dot colour
    const BC = { r: 195, g: 200, b: 208 }
    // active (pole) dot colour
    const AC = { r: 40,  g: 50,  b: 65  }
    // ─────────────────────────────────────────────────────────────────────────

    let W = 0, H = 0
    const resize = () => {
      W = canvas.width  = window.innerWidth
      H = canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const target  = { x: -9999, y: -9999 }
    const current = { x: -9999, y: -9999 }

    const onMove  = (e: MouseEvent) => { target.x = e.clientX; target.y = e.clientY }
    const onLeave = ()              => { target.x = -9999;     target.y = -9999 }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseleave', onLeave)

    let raf = 0
    const draw = () => {
      current.x += (target.x - current.x) * EASE
      current.y += (target.y - current.y) * EASE

      ctx.clearRect(0, 0, W, H)

      const mx = current.x
      const my = current.y

      // ── dynamic ellipse axes ──────────────────────────────────────────────
      // offX/offY: how far cursor is from screen centre, normalised to -1…+1
      const screenCX = W / 2
      const screenCY = H / 2
      const offX = (mx - screenCX) / (screenCX || 1)   // -1 (left) … +1 (right)
      const offY = (my - screenCY) / (screenCY || 1)   // -1 (top)  … +1 (bottom)

      // At centre offX=offY=0 → rx=ry=SPHERE_R (perfect sphere billboard)
      // At edges the axis in the cursor's direction shrinks → oval
      const rx = SPHERE_R * (1 - Math.abs(offX) * MAX_SQUISH)
      const ry = SPHERE_R * (1 - Math.abs(offY) * MAX_SQUISH)
      // ─────────────────────────────────────────────────────────────────────

      const cols = Math.ceil(W / SPACING) + 2
      const rows = Math.ceil(H / SPACING) + 2

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const gx = col * SPACING
          const gy = row * SPACING

          const dx = gx - mx
          const dy = gy - my

          // Normalised elliptic distance (0 = pole, 1 = equator/boundary, >1 = outside)
          const ux = dx / rx
          const uy = dy / ry
          const ellipDist2 = ux * ux + uy * uy   // squared, avoids sqrt when only checking

          let dotX  = gx
          let dotY  = gy
          let dotR  = BASE_R
          let alpha = 0.32
          let cr = BC.r, cg = BC.g, cb = BC.b

          if (ellipDist2 < 1) {
            // Height on the ellipsoidal hemisphere: 1 at pole, 0 at equator
            const zNorm = Math.sqrt(1 - ellipDist2)

            // Push each dot outward along the ellipsoid surface.
            // Direction: radial from cursor.  Magnitude: proportional to height.
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist > 0.5) {
              const pushMag = zNorm * SPHERE_R * PUSH_SCALE
              dotX = gx + (dx / dist) * pushMag
              dotY = gy + (dy / dist) * pushMag
            }

            dotR  = BASE_R * (1 + zNorm * 1.3)
            alpha = 0.32 + zNorm * 0.68

            cr = Math.round(BC.r + (AC.r - BC.r) * zNorm)
            cg = Math.round(BC.g + (AC.g - BC.g) * zNorm)
            cb = Math.round(BC.b + (AC.b - BC.b) * zNorm)
          }

          ctx.beginPath()
          ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`
          ctx.fill()
        }
      }

      raf = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{ zIndex: 0 }}
    />
  )
}
