import { useState } from 'react'
import { Sheet } from '../components/Sheet'
import { db, exportAll, importAll, type Backup } from '../db/db'
import { todayKey, weekKey } from '../lib/date'
import { usePrograms, useSettings } from '../lib/hooks'
import { initialState, isArmstrong } from '../programs'
import { ARMSTRONG_DAY_KEYS, ARMSTRONG_DAY_TITLE } from '../programs/armstrong'
import { rangeLabel, weeksFor } from '../programs/hundred'
import { EXERCISE_NAME, PROGRAM_NAME, type ArmstrongState, type ExerciseId, type HundredPhase, type HundredState } from '../types'

const PHASES: { v: HundredPhase; label: string }[] = [
  { v: 'test', label: '초기 테스트 대기' },
  { v: 'train', label: '훈련 중' },
  { v: 'retest', label: '재테스트 대기' },
  { v: 'final', label: '최종 테스트 대기' },
  { v: 'done', label: '완료' },
]

export function SettingsPage() {
  const [settings, update] = useSettings()
  const programs = usePrograms()
  const [resetTarget, setResetTarget] = useState<ExerciseId | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [importData, setImportData] = useState<Backup | null>(null)

  if (!programs) return null

  const move = (e: ExerciseId, dir: -1 | 1) => {
    const o = [...settings.order]
    const i = o.indexOf(e)
    const j = i + dir
    if (j < 0 || j >= o.length) return
    ;[o[i], o[j]] = [o[j], o[i]]
    void update({ order: o })
  }

  const setRest = (key: string, v: string) => {
    const n = parseInt(v, 10)
    const next = { ...settings.restOverride }
    if (Number.isNaN(n) || v === '') delete next[key]
    else next[key] = Math.max(5, n)
    void update({ restOverride: next })
  }

  const doExport = async () => {
    const data = await exportAll()
    const text = JSON.stringify(data, null, 2)
    const file = new File([text], `workout-backup-${todayKey()}.json`, { type: 'application/json' })
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: '운동 기록 백업' })
        return
      }
    } catch {
      /* fall through */
    }
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  const pickImport = (f: File | undefined) => {
    if (!f) return
    f.text().then((t) => {
      try {
        const b = JSON.parse(t) as Backup
        if (!Array.isArray(b.sessions)) throw new Error()
        setImportData(b)
      } catch {
        setMsg('백업 파일을 읽을 수 없어요.')
      }
    })
  }

  return (
    <div className="page">
      <h1 className="page-title">설정</h1>

      <div className="card">
        <div className="card-title">전체 시작 순서</div>
        <div className="list">
          {settings.order.map((e, i) => (
            <div className="item" key={e}>
              <span className="row"><span className={`dot ${e}`} /> {EXERCISE_NAME[e]}</span>
              <span className="row">
                <button className="btn sm" disabled={i === 0} onClick={() => move(e, -1)}>↑</button>
                <button className="btn sm" disabled={i === settings.order.length - 1} onClick={() => move(e, 1)}>↓</button>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title">타이머 알림</div>
        <div className="item">
          <span>소리</span>
          <button className={`switch ${settings.sound ? 'on' : ''}`} onClick={() => update({ sound: !settings.sound })} aria-label="소리" />
        </div>
        <div className="item">
          <span>진동 <span className="muted small">(iOS Safari는 미지원)</span></span>
          <button className={`switch ${settings.vibrate ? 'on' : ''}`} onClick={() => update({ vibrate: !settings.vibrate })} aria-label="진동" />
        </div>
      </div>

      <div className="card">
        <div className="card-title">휴식 시간 덮어쓰기 (초)</div>
        <p className="muted small">비워두면 프로그램 권장값을 씁니다. 권장값이 없는 세션은 운동별 기본값(없으면 60초)을 씁니다.</p>
        {(['pullup', 'pushup', 'squat'] as ExerciseId[]).map((e) => (
          <div className="field" key={e}>
            <label>{EXERCISE_NAME[e]} 기본</label>
            <input type="number" inputMode="numeric" placeholder="프로그램 권장" value={settings.restOverride[e] ?? ''} onChange={(ev) => setRest(e, ev.target.value)} />
          </div>
        ))}
        <details>
          <summary className="small" style={{ fontWeight: 700, cursor: 'pointer' }}>암스트롱 요일별</summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {ARMSTRONG_DAY_KEYS.filter((d) => d !== 'fri').map((d) => (
              <div className="field" key={d}>
                <label>{ARMSTRONG_DAY_TITLE[d]}{d === 'tue' ? ' (기본: 직전 횟수×10초)' : ''}</label>
                <input type="number" inputMode="numeric" placeholder="권장값" value={settings.restOverride[`pullup:${d}`] ?? ''} onChange={(ev) => setRest(`pullup:${d}`, ev.target.value)} />
              </div>
            ))}
          </div>
        </details>
      </div>

      {programs.map((p) => (
        <div className="card" key={p.exercise}>
          <div className="card-head">
            <div className="card-title"><span className={`dot ${p.exercise}`} />{PROGRAM_NAME[p.exercise]}</div>
            <span className="chip ghost">{p.started ? '진행 중' : '시작 전'}</span>
          </div>
          {isArmstrong(p) ? <ArmstrongEditor state={p} /> : <HundredEditor state={p} />}
          <button className="btn danger sm" onClick={() => setResetTarget(p.exercise)}>프로그램 초기화 (기록은 유지)</button>
        </div>
      ))}

      <div className="card">
        <div className="card-title">백업</div>
        <p className="muted small">기록은 이 기기에만 저장됩니다. Safari 데이터 삭제나 기기 변경 전에 내보내 두세요.</p>
        <div className="row">
          <button className="btn grow" onClick={doExport}>JSON 내보내기</button>
          <label className="btn grow" style={{ cursor: 'pointer' }}>
            가져오기
            <input type="file" accept="application/json,.json" hidden onChange={(e) => pickImport(e.target.files?.[0])} />
          </label>
        </div>
      </div>

      <p className="muted small" style={{ textAlign: 'center' }}>
        프로그램 출처: Armstrong Pullup Program · hundredpushups.com · twohundredsquats.com (개인 비상업 용도)
      </p>

      {resetTarget && (
        <Sheet title={`${PROGRAM_NAME[resetTarget]} 초기화`} onClose={() => setResetTarget(null)}>
          <p className="small muted">진행 상태만 처음으로 돌아갑니다. 운동 기록과 통계는 그대로 남아요.</p>
          <button
            className="btn danger big block"
            onClick={async () => {
              await db.programs.put(initialState(resetTarget))
              setResetTarget(null)
            }}
          >
            초기화
          </button>
          <button className="btn block" onClick={() => setResetTarget(null)}>취소</button>
        </Sheet>
      )}

      {importData && (
        <Sheet title="백업을 가져올까요?" onClose={() => setImportData(null)}>
          <p className="small muted">
            {importData.exportedAt?.slice(0, 10)} 백업 · 세션 {importData.sessions.length}개. 현재 기기의 모든 기록과 진행 상태를 이 백업으로 교체합니다.
          </p>
          <button
            className="btn danger big block"
            onClick={async () => {
              await importAll(importData)
              setImportData(null)
              setMsg('가져오기 완료')
            }}
          >
            교체하고 가져오기
          </button>
          <button className="btn block" onClick={() => setImportData(null)}>취소</button>
        </Sheet>
      )}

      {msg && <div className="toast" onClick={() => setMsg(null)}>{msg}</div>}
    </div>
  )
}

function ArmstrongEditor({ state }: { state: ArmstrongState }) {
  return (
    <>
      <div className="field">
        <label>트레이닝 세트 횟수 (수·목)</label>
        <input
          type="number"
          inputMode="numeric"
          value={state.trainingReps}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10)
            if (Number.isNaN(n) || n < 1) return
            const next: ArmstrongState = { ...state, trainingReps: n, weekKey: weekKey(), lastAdjustment: `직접 ${n}개로 설정했어요.` }
            void db.programs.put(next)
          }}
        />
      </div>
      {state.lastAdjustment && <div className="muted small">{state.lastAdjustment}</div>}
    </>
  )
}

function HundredEditor({ state }: { state: HundredState }) {
  const weeks = weeksFor(state.exercise)
  const put = (patch: Partial<HundredState>) => db.programs.put({ ...state, ...patch, started: true })
  const sel = (label: string, value: number | string, opts: { v: number | string; label: string }[], on: (v: string) => void) => (
    <div className="field">
      <label>{label}</label>
      <select value={value} onChange={(e) => on(e.target.value)} className="btn" style={{ justifyContent: 'flex-start', appearance: 'auto' }}>
        {opts.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
      </select>
    </div>
  )
  return (
    <>
      {sel('단계', state.phase, PHASES.map((p) => ({ v: p.v, label: p.label })), (v) => put({ phase: v as HundredPhase }))}
      <div className="row">
        <div className="grow">{sel('주차', state.week, weeks.map((_, i) => ({ v: i + 1, label: `${i + 1}주차` })), (v) => put({ week: Number(v) }))}</div>
        <div className="grow">{sel('Day', state.day, [1, 2, 3].map((d) => ({ v: d, label: `Day ${d}` })), (v) => put({ day: Number(v) }))}</div>
      </div>
      {sel('컬럼', state.column, weeks[state.week - 1].ranges.map((r, i) => ({ v: i, label: `컬럼 ${i + 1} (${rangeLabel(r)})` })), (v) => put({ column: Number(v) }))}
      {state.tests.length > 0 && (
        <div className="muted small">테스트 이력: {state.tests.map((t) => `${t.date} ${t.reps}개`).join(' · ')}</div>
      )}
    </>
  )
}
