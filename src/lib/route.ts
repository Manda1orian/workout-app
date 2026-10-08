import { useEffect, useState } from 'react'

export type Route =
  | { name: 'home' }
  | { name: 'session'; id: number }
  | { name: 'record'; id: number }
  | { name: 'stats' }
  | { name: 'settings' }

export function parseHash(hash: string): Route {
  const h = hash.replace(/^#\/?/, '')
  const [a, b] = h.split('/')
  if (a === 'session' && b) return { name: 'session', id: Number(b) }
  if (a === 'record' && b) return { name: 'record', id: Number(b) }
  if (a === 'stats') return { name: 'stats' }
  if (a === 'settings') return { name: 'settings' }
  return { name: 'home' }
}

export function toHash(r: Route): string {
  switch (r.name) {
    case 'home': return '#/'
    case 'session': return `#/session/${r.id}`
    case 'record': return `#/record/${r.id}`
    case 'stats': return '#/stats'
    case 'settings': return '#/settings'
  }
}

export function navigate(r: Route, replace = false) {
  const h = toHash(r)
  if (replace) history.replaceState(null, '', h)
  else location.hash = h
  if (replace) window.dispatchEvent(new HashChangeEvent('hashchange'))
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(location.hash))
  useEffect(() => {
    const on = () => setRoute(parseHash(location.hash))
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}
