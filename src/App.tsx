import { useEffect } from 'react'
import { db } from './db/db'
import { addDays, mondayOf, weekKey } from './lib/date'
import { navigate, useRoute } from './lib/route'
import { rolloverArmstrong } from './programs/armstrong'
import { Home } from './pages/Home'
import { RecordPage } from './pages/Record'
import { SessionPage } from './pages/Session'
import { SettingsPage } from './pages/Settings'
import { StatsPage } from './pages/Stats'
import type { ArmstrongState } from './types'

/** 주가 바뀌었으면 암스트롱 트레이닝 세트 횟수 조정 */
async function rollover() {
  const st = (await db.programs.get('pullup')) as ArmstrongState | undefined
  if (!st || !st.started || st.weekKey === weekKey()) return
  const thisMonday = mondayOf()
  const lastMonday = addDays(thisMonday, -7)
  const lastWeek = await db.sessions
    .where('exercise').equals('pullup')
    .filter((s) => s.date >= lastMonday && s.date < thisMonday)
    .toArray()
  await db.programs.put(rolloverArmstrong(st, lastWeek))
}

export default function App() {
  const route = useRoute()
  useEffect(() => {
    void rollover()
    const onVis = () => document.visibilityState === 'visible' && void rollover()
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const showTabs = route.name !== 'session'
  return (
    <div className="app">
      {route.name === 'home' && <Home />}
      {route.name === 'session' && <SessionPage id={route.id} />}
      {route.name === 'record' && <RecordPage id={route.id} />}
      {route.name === 'stats' && <StatsPage />}
      {route.name === 'settings' && <SettingsPage />}
      {showTabs && (
        <nav className="tabbar">
          <button className={route.name === 'home' ? 'active' : ''} onClick={() => navigate({ name: 'home' })}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-6h-6v6H5a2 2 0 0 1-2-2z"/></svg>
            오늘
          </button>
          <button className={route.name === 'stats' || route.name === 'record' ? 'active' : ''} onClick={() => navigate({ name: 'stats' })}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/></svg>
            통계
          </button>
          <button className={route.name === 'settings' ? 'active' : ''} onClick={() => navigate({ name: 'settings' })}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>
            설정
          </button>
        </nav>
      )}
    </div>
  )
}
