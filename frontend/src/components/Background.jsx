import React, { useEffect, useRef } from 'react'
import '../styles/background.css'

export default function Background() {
  const bgRef = useRef(null)

  useEffect(() => {
    const el = bgRef.current
    if (!el) return

    const onMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 6
      const y = (e.clientY / window.innerHeight - 0.5) * 4
      el.style.setProperty('--tx', `${x}px`)
      el.style.setProperty('--ty', `${y}px`)
    }

    window.addEventListener('mousemove', onMouseMove)
    return () => window.removeEventListener('mousemove', onMouseMove)
  }, [])

  return <div className="bg" ref={bgRef} aria-hidden="true" />
}
