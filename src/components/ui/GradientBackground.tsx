import { useEffect, useRef } from 'react'

// Subtle animated particle field behind the dashboard's hero stat card.
// Three.js is imported dynamically so pages that never render this
// component (register, forms, scan/audit) never fetch the bundle.
export function GradientBackground({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let cleanup = () => {}
    let cancelled = false

    import('three').then((THREE) => {
      if (cancelled || !container) return

      const width = container.clientWidth
      const height = container.clientHeight

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(width, height)
      container.appendChild(renderer.domElement)

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100)
      camera.position.z = 12

      const count = 160
      const positions = new Float32Array(count * 3)
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 16
        positions[i * 3 + 1] = (Math.random() - 0.5) * 10
        positions[i * 3 + 2] = (Math.random() - 0.5) * 6
      }
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

      // Soft circular sprite generated on the fly — a plain PointsMaterial
      // dot renders as a hard square, this reads as a soft glowing speck.
      const canvas = document.createElement('canvas')
      canvas.width = 64
      canvas.height = 64
      const ctx = canvas.getContext('2d')!
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
      gradient.addColorStop(0, 'rgba(255,255,255,1)')
      gradient.addColorStop(0.4, 'rgba(255,255,255,0.6)')
      gradient.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, 64, 64)
      const sprite = new THREE.CanvasTexture(canvas)

      const material = new THREE.PointsMaterial({
        map: sprite,
        size: 0.55,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
      const points = new THREE.Points(geometry, material)
      scene.add(points)

      let raf = 0
      const animate = () => {
        if (!reducedMotion) {
          points.rotation.y += 0.0009
          points.rotation.x += 0.0003
        }
        renderer.render(scene, camera)
        raf = requestAnimationFrame(animate)
      }
      animate()

      const resize = () => {
        if (!container) return
        const w = container.clientWidth
        const h = container.clientHeight
        renderer.setSize(w, h)
        camera.aspect = w / h
        camera.updateProjectionMatrix()
      }
      const observer = new ResizeObserver(resize)
      observer.observe(container)

      cleanup = () => {
        cancelAnimationFrame(raf)
        observer.disconnect()
        geometry.dispose()
        material.dispose()
        sprite.dispose()
        renderer.dispose()
        renderer.domElement.remove()
      }
    })

    return () => {
      cancelled = true
      cleanup()
    }
  }, [])

  return <div ref={containerRef} className={className} aria-hidden />
}
