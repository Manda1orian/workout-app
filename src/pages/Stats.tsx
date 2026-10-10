import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js'
import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { Bar, Line } from 'react-chartjs-2'
import { db } from '../db/db'
import { WEEKDAY_KO, addDays, formatShort, mondayOf, parseKey, todayKey } from '../lib/date'
import { usePrograms } from '../lib/hooks'
import { navigate } from '../lib/route'
import { buildView, isArmstrong, sessionTotal } from '../programs'
import { GOAL } from '../programs/hundred'
import { EXERCISE_NAME, PROGRAM_NAME, type ExerciseId, type HundredState, type Session } from '../types'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Filler)

const COLOR: Record<ExerciseId, string> = { pullup: '#2f6fed', pushup: '#d9480f', squat: '#0f9d8a' }
const COLOR_DARK: Record<ExerciseId, string> = { pullup: '#4f83ea', pushup: '#e35a17', squat: '#17a38f' }

function useThemeColors() {
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
  return {
    series: dark ? COLOR_DARK : COLOR,
    grid: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
    text: dark ? '#9aa1ad' : '#6b7280',
  }
}

export function StatsPage() {
  const [exercise, setExercise] = useState<ExerciseId>('pullup')
  const [month, setMonth] = useState(() => todayKey().slice(0, 7))
  const [selDay, setSelDay] = useState<string | null>(null)
  const programs = usePrograms()
  const theme = useThemeColors()

  const all = useLiveQuery(() => db.sessions.orderBy('date').toArray(), [])
  const sessions = useMemo(() => (all ?? []).filter((s) => s.exercise === exercise && s.completed), [all, exercise])

  if (!all || !programs) return <div className="page" />
  const state = programs.find((p) => p.exercise === exercise)!
  const color = theme.series[exercise]

  // ---- 요약 수치
  const tot = (s: Session) => sessionTotal(s.sets)
  const totals = sessions.map(tot)
  const maxSets = sessions.map((s) => Math.max(0, ...s.sets.map((x) => x.reps)))
  const bestSet = Math.max(0, ...maxSets)
  const bestSession = Math.max(0, ...totals)
  const allReps = totals.reduce((a, b) => a + b, 0)

  // ---- 일별 추이 (최근 30일치 기록이 있는 날)
  const daily = new Map<string, { total: number; maxSet: number }>()
  for (const s of sessions) {
    const cur = daily.get(s.date) ?? { total: 0, maxSet: 0 }
    cur.total += tot(s)
    cur.maxSet = Math.max(cur.maxSet, ...s.sets.map((x) => x.reps))
    daily.set(s.date, cur)
  }
  const recent = Array.from(daily.entries()).sort(([a], [b]) => (a < b ? -1 : 1)).slice(-30)
  const labels = recent.map(([d]) => formatShort(d))
  const baseOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { intersect: false, mode: 'index' as const } },
    scales: {
      x: { grid: { display: false }, ticks: { color: theme.text, maxTicksLimit: 6, font: { size: 11 } } },
      y: { beginAtZero: true, grid: { color: theme.grid }, ticks: { color: theme.text, precision: 0, font: { size: 11 } }, border: { display: false } },
    },
  }
  const lineData = (vals: number[]) => ({
    labels,
    datasets: [
      {
        data: vals,
        borderColor: color,
        backgroundColor: color,
        borderWidth: 2,
        pointRadius: vals.length > 15 ? 3 : 4,
        pointHoverRadius: 6,
        tension: 0.25,
      },
    ],
  })

  // ---- 주간 볼륨 (최근 8주)
  const thisMon = mondayOf()
  const weeks = Array.from({ length: 8 }, (_, k) => addDays(thisMon, -7 * (7 - k)))
  const weekly = weeks.map((mon) => {
    const end = addDays(mon, 7)
    return sessions.filter((s) => s.date >= mon && s.date < end).reduce((a, s) => a + tot(s), 0)
  })
  const barData = {
    labels: weeks.map((w) => formatShort(w)),
    datasets: [{ data: weekly, backgroundColor: color, borderRadius: 4, borderSkipped: 'bottom' as const, barPercentage: 0.6 }],
  }

  // ---- 달력
  const [y, m] = month.split('-').map(Number)
  const first = new Date(y, m - 1, 1)
  const daysInMonth = new Date(y, m, 0).getDate()
  const leading = (first.getDay() + 6) % 7 // 월요일 시작
  const byDate = new Map<string, Session[]>()
  for (const s of all) {
    if (!s.completed) continue
    const arr = byDate.get(s.date) ?? []
    arr.push(s)
    byDate.set(s.date, arr)
  }
  const shiftMonth = (d: number) => {
    const nd = new Date(y, m - 1 + d, 1)
    setMonth(todayKey(nd).slice(0, 7))
    setSelDay(null)
  }
  const selSessions = selDay ? (byDate.get(selDay) ?? []) : []

  // ---- 개인 기록
  const prBestSet = sessions.find((s) => Math.max(0, ...s.sets.map((x) => x.reps)) === bestSet)
  const prBestSession = sessions.find((s) => tot(s) === bestSession)
  const tests = !isArmstrong(state) ? (state as HundredState).tests : []

  return (
    <div className="page">
      <h1 className="page-title">통계</h1>
      <div className="segmented">
        {(['pullup', 'pushup', 'squat'] as ExerciseId[]).map((e) => (
          <button key={e} className={exercise === e ? 'active' : ''} onClick={() => setExercise(e)}>
            {EXERCISE_NAME[e]}
          </button>
        ))}
      </div>

      {/* 진행 상태 */}
      <div className="card">
        <div className="card-head">
          <div className="card-title"><span className={`dot ${exercise}`} />{PROGRAM_NAME[exercise]}</div>
        </div>
        <div style={{ fontWeight: 800, fontSize: 18 }}>{buildView(state).statusLine}</div>
        {!isArmstrong(state) && (state as HundredState).lastTest !== undefined && (
          <div className="muted small">
            최근 테스트 {(state as HundredState).lastTest}개 · 목표 {GOAL[exercise as 'pushup' | 'squat']}개
          </div>
        )}
        {isArmstrong(state) && state.startedOn && <div className="muted small">{state.startedOn} 시작</div>}
        <div className="stat-grid">
          <div className="stat"><span className="v">{sessions.length}</span><span className="k">세션</span></div>
          <div className="stat"><span className="v">{allReps}</span><span className="k">누적 횟수</span></div>
          <div className="stat"><span className="v">{bestSet}</span><span className="k">최대 세트</span></div>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="card"><div className="empty">아직 {EXERCISE_NAME[exercise]} 기록이 없어요.</div></div>
      ) : (
        <>
          <div className="card">
            <div className="card-title">일별 총 횟수</div>
            <div className="chart"><Line data={lineData(recent.map(([, v]) => v.total))} options={baseOpts} /></div>
          </div>
          <div className="card">
            <div className="card-title">일별 최대 세트</div>
            <div className="chart"><Line data={lineData(recent.map(([, v]) => v.maxSet))} options={baseOpts} /></div>
          </div>
          <div className="card">
            <div className="card-title">주간 볼륨 (최근 8주)</div>
            <div className="chart"><Bar data={barData} options={baseOpts} /></div>
          </div>
          <div className="card">
            <div className="card-title">개인 기록</div>
            <div className="list">
              <div className="item">
                <span>최대 세트</span>
                <span style={{ fontWeight: 800 }}>{bestSet}개 <span className="muted small">{prBestSet?.date}</span></span>
              </div>
              <div className="item">
                <span>최대 세션 총합</span>
                <span style={{ fontWeight: 800 }}>{bestSession}개 <span className="muted small">{prBestSession?.date}</span></span>
              </div>
              {tests.map((t, i) => (
                <div className="item" key={i}>
                  <span>테스트 ({t.after === 'initial' ? '초기' : t.after === 'final' ? '최종' : t.after.replace('w', '') + '주차 후'})</span>
                  <span style={{ fontWeight: 800 }}>{t.reps}개 <span className="muted small">{t.date}</span></span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* 달력 */}
      <div className="card">
        <div className="card-head">
          <button className="btn sm" onClick={() => shiftMonth(-1)}>‹</button>
          <div className="card-title">{y}년 {m}월</div>
          <button className="btn sm" onClick={() => shiftMonth(1)}>›</button>
        </div>
        <div className="cal">
          {['월', '화', '수', '목', '금', '토', '일'].map((d) => <div className="dow" key={d}>{d}</div>)}
          {Array.from({ length: leading }).map((_, i) => <div className="day empty" key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const key = `${month}-${String(i + 1).padStart(2, '0')}`
            const list = byDate.get(key) ?? []
            const ex = Array.from(new Set(list.map((s) => s.exercise)))
            return (
              <button
                key={key}
                className={`day ${key === todayKey() ? 'today' : ''} ${key === selDay ? 'sel' : ''}`}
                onClick={() => setSelDay(key === selDay ? null : key)}
              >
                {i + 1}
                <span className="dots">{ex.map((e) => <i key={e} style={{ background: theme.series[e] }} />)}</span>
              </button>
            )
          })}
        </div>
        {selDay && (
          <div className="list" style={{ marginTop: 6 }}>
            <div className="muted small" style={{ padding: '6px 0' }}>
              {selDay} ({WEEKDAY_KO[parseKey(selDay).getDay()]})
            </div>
            {selSessions.length === 0 && <div className="muted small">기록 없음</div>}
            {selSessions.map((s) => (
              <button className="item" key={s.id} onClick={() => navigate({ name: 'record', id: s.id! })} style={{ textAlign: 'left' }}>
                <span className="row"><span className={`dot ${s.exercise}`} /><span><b>{EXERCISE_NAME[s.exercise]}</b> · {s.planTitle}</span></span>
                <span className="muted small">{sessionTotal(s.sets)}개 · {s.sets.map((x) => x.reps).join(', ')} ›</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
