import React, { useEffect, useMemo, useRef, useState } from 'react'
import '../styles/background.css'

export default function Background() {
  const bgRef = useRef(null)
  const leavesRef = useRef(null)
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark'
    return window.localStorage.getItem('pp-theme') || 'dark'
  })

  // Parallax for both backgrounds (sets --tx/--ty on bg)
  useEffect(() => {
    const el = bgRef.current
    if (!el) return
    const onMouseMove = (e) => {
      // Небольшой параллакс по X и Y. Амплитуду по Y держим меньше, чтобы не появлялись «полосы» по краям.
      const x = (e.clientX / window.innerWidth - 0.5) * 6
      const y = (e.clientY / window.innerHeight - 0.5) * 4
      el.style.setProperty('--tx', `${x}px`)
      el.style.setProperty('--ty', `${y}px`)
    }
    window.addEventListener('mousemove', onMouseMove)
    return () => window.removeEventListener('mousemove', onMouseMove)
  }, [])

  // Observe .pp-root class changes to switch theme without reloading.
  // If .pp-root isn't in DOM yet (because Routes render after <Background/>),
  // we first observe body subtree to detect when it appears, then attach class observer.
  useEffect(() => {
    let classObserver = null
    let bodyObserver = null

    const attachClassObserver = (root) => {
      if (!root) return
      const updateFromClass = () => {
        const isLight = root.classList.contains('theme-light')
        setTheme(isLight ? 'light' : 'dark')
      }
      // initial sync
      updateFromClass()
      classObserver = new MutationObserver(updateFromClass)
      classObserver.observe(root, { attributes: true, attributeFilter: ['class'] })
    }

    const existing = document.querySelector('.pp-root')
    if (existing) {
      attachClassObserver(existing)
    } else {
      // Wait for .pp-root to be added
      bodyObserver = new MutationObserver(() => {
        const root = document.querySelector('.pp-root')
        if (root) {
          attachClassObserver(root)
          if (bodyObserver) {
            bodyObserver.disconnect()
            bodyObserver = null
          }
        }
      })
      bodyObserver.observe(document.body, { childList: true, subtree: true })
    }

    return () => {
      if (classObserver) classObserver.disconnect()
      if (bodyObserver) bodyObserver.disconnect()
    }
  }, [])

  // Sync with localStorage changes (e.g., if theme is persisted elsewhere)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'pp-theme' && e.newValue) {
        const val = e.newValue === 'light' ? 'light' : 'dark'
        setTheme(val)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Observe <html> (documentElement) class changes as an additional source of truth
  useEffect(() => {
    const html = document.documentElement
    const applyFromHtml = () => {
      const isLight = html.classList.contains('theme-light')
      const isDark = html.classList.contains('theme-dark')
      if (isLight) setTheme('light')
      else if (isDark) setTheme('dark')
    }
    // initial sync
    applyFromHtml()
    const obs = new MutationObserver(applyFromHtml)
    obs.observe(html, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  // Leaves SVG templates (adapted from attached app.js)
  const leafSvgs = useMemo(() => [
    (stroke, stroke2) => `
      <svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(25)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="${stroke2}" stroke-width="1" opacity="0.35"/>
          </pattern>
        </defs>
        <path d="M50 6 C48 16 43 22 35 26 C41 28 44 32 44 38 C37 35 30 35 24 40 C31 44 34 50 32 58 C26 54 19 54 14 58 C22 65 26 74 24 84 C33 80 41 83 46 90 C45 82 47 76 50 71 C53 76 55 82 54 90 C59 83 67 80 76 84 C74 74 78 65 86 58 C81 54 74 54 68 58 C66 50 69 44 76 40 C70 35 63 35 56 38 C56 32 59 28 65 26 C57 22 52 16 50 6Z" fill="url(#hatch)" stroke="${stroke}" stroke-width="2.2" stroke-linejoin="round" />
        <path d="M50 14 C49 34 49 52 50 70 C51 84 51 98 50 112" stroke="${stroke2}" stroke-width="2" fill="none" opacity="0.55" stroke-linecap="round"/>
      </svg>` ,
    (stroke, stroke2) => `
      <svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <pattern id="hatch2" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <line x1="0" y1="0" x2="0" y2="7" stroke="${stroke2}" stroke-width="1" opacity="0.30"/>
          </pattern>
        </defs>
        <path d="M50 8 C32 20 18 40 18 64 C18 92 34 116 50 132 C66 116 82 92 82 64 C82 40 68 20 50 8Z" fill="url(#hatch2)" stroke="${stroke}" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M50 18 C49 42 49 74 50 106 C51 118 51 126 50 134" stroke="${stroke2}" stroke-width="2" fill="none" opacity="0.55" stroke-linecap="round"/>
        <path d="M50 78 C40 70 32 64 24 56" stroke="${stroke2}" stroke-width="1.5" opacity="0.35" fill="none" stroke-linecap="round"/>
        <path d="M50 78 C60 70 68 64 76 56" stroke="${stroke2}" stroke-width="1.5" opacity="0.35" fill="none" stroke-linecap="round"/>
      </svg>`
  ], [])

  // Utility randomizers
  const rnd = (a, b) => a + Math.random() * (b - a)
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

  // Create one leaf element (as a div with innerHTML of SVG)
  const createLeaf = () => {
    const el = document.createElement('div')
    el.className = 'leaf'

    const w = rnd(22, 38)
    const h = w * rnd(1.3, 1.7)
    const x = rnd(-8, 108)
    // Для светлой темы повышаем базовую непрозрачность листьев для лучшей видимости
    const op = theme === 'light' ? rnd(0.20, 0.38) : rnd(0.14, 0.28)
    const r = rnd(-55, 55)
    const fallDur = rnd(28, 55)
    const swayDur = rnd(7.0, 12.5)
    const spinDur = rnd(8.0, 14.0)
    const delay = rnd(-55, 0)
    const dx = rnd(120, 420)
    const sway = rnd(-10, 14)
    const spin = rnd(-18, 22)

    el.style.setProperty('--w', `${w}px`)
    el.style.setProperty('--h', `${h}px`)
    el.style.setProperty('--x', `${x}vw`)
    el.style.setProperty('--op', op.toFixed(2))
    el.style.setProperty('--r', `${r}deg`)
    el.style.setProperty('--fallDur', `${fallDur.toFixed(2)}s`)
    el.style.setProperty('--swayDur', `${swayDur.toFixed(2)}s`)
    el.style.setProperty('--spinDur', `${spinDur.toFixed(2)}s`)
    el.style.setProperty('--delay', `${delay.toFixed(2)}s`)
    el.style.setProperty('--dx', dx.toFixed(0))
    el.style.setProperty('--sway', sway.toFixed(0))
    el.style.setProperty('--spin', spin.toFixed(0))

    const getVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

    // For light theme: vary green stroke slightly per leaf to add diversity.
    // Keep dark theme using CSS variables as-is.
    let stroke, stroke2
    if (theme === 'light') {
      // Base green around 130° hue, vary a bit per leaf
      const hue = rnd(118, 136) // small hue variation
      const sat = rnd(38, 52)   // saturation variation
      const light = rnd(28, 40) // lightness variation
      // Чуть выше прозрачность контуров для повышения читаемости на светлом фоне
      const alpha1 = 0.72
      const alpha2 = 0.46
      stroke = `hsl(${hue} ${sat}% ${light}% / ${alpha1})`
      // Slightly darker, less saturated for inner hatch/veins
      stroke2 = `hsl(${hue} ${Math.max(28, sat - 10)}% ${Math.max(20, light - 8)}% / ${alpha2})`
    } else {
      stroke = getVar('--leaf-stroke') || 'rgba(34, 102, 44, .55)'
      stroke2 = getVar('--leaf-stroke-2') || 'rgba(22, 74, 33, .32)'
    }

    el.innerHTML = pick(leafSvgs)(stroke, stroke2)
    return el
  }

  // Manage leaves when theme is light
  useEffect(() => {
    const root = leavesRef.current
    if (!root || theme !== 'light') return

    // seed leaves
    const LEAF_COUNT = 18
    const frag = document.createDocumentFragment()
    for (let i = 0; i < LEAF_COUNT; i++) frag.appendChild(createLeaf())
    root.appendChild(frag)

    // parallax easing specifically for leaves (sets --mx/--my)
    let mx = 0, my = 0, tx = 0, ty = 0, rafId = 0
    const onMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5)
      const y = (e.clientY / window.innerHeight - 0.5)
      tx = x * 10
      ty = y * 7
    }
    const tick = () => {
      mx += (tx - mx) * 0.06
      my += (ty - my) * 0.06
      root.style.setProperty('--mx', `${mx.toFixed(2)}px`)
      root.style.setProperty('--my', `${my.toFixed(2)}px`)
      rafId = requestAnimationFrame(tick)
    }
    window.addEventListener('mousemove', onMouseMove)
    rafId = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      cancelAnimationFrame(rafId)
      // cleanup leaves
      root.innerHTML = ''
    }
  }, [theme])

  if (theme === 'light') {
    return (
      <div className="bg bg--light" ref={bgRef} aria-hidden="true">
        <div className="leaves" ref={leavesRef} />
      </div>
    )
  }

  return <div className="bg" ref={bgRef} aria-hidden="true" />
}
