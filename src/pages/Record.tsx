import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Sheet } from '../components/Sheet'
import { db } from '../db/db'
import { navigate } from '../lib/route'
import { sessionTotal } from '../programs'
import { EXERCISE_NAME } from '../types'

export function RecordPage({ id }: { id: number }) {
  const session = useLiveQuery(() => db.sessions.get(id), [id])
  const [confirmDel, setConfirmDel] = useState(false)

  if (session === undefined) return <div className="page" />
  if (!session) return <div className="page"><div className="empty">기록이 없어요.</div></div>

  const updateReps = async (idx: number, v: string) => {
    const n = parseInt(v, 10)
    const sets = session.sets.map((s, j) => (j === idx ? { ...s, reps: Number.isNaN(n) ? 0 : Math.max(0, n) } : s))
    await db.sessions.update(id, { sets })
  }
  const removeSet = async (idx: number) => {
    await db.sessions.update(id, { sets: session.sets.filter((_, j) => j !== idx) })
  }
  const addSet = async () => {
    await db.sessions.update(id, { sets: [...session.sets, { target: null, isMax: false, reps: 0, extra: true }] })
  }
  const updateDate = async (v: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) await db.sessions.update(id, { date: v })
  }

  return (
    <div className="page">
      <div className="topbar">
        <button className="back" onClick={() => history.back()} aria-label="뒤로">‹</button>
        <div className="grow">
          <div className={`exercise-tag ${session.exercise}`}>{EXERCISE_NAME[session.exercise]}</div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>{session.planTitle}</div>
        </div>
        {!session.completed && <span className="chip">미완료</span>}
      </div>

      <div className="card">
        <div className="field">
          <label>날짜</label>
          <input type="date" defaultValue={session.date} onChange={(e) => updateDate(e.target.value)} className="btn" style={{ justifyContent: 'flex-start' }} />
        </div>
        <div className="muted small">총 {sessionTotal(session.sets)}개 · {session.sets.length}세트</div>
      </div>

      <div className="card">
        <div className="sets">
          <div className="setrow head"><span>세트</span><span>종류</span><span className="tgt"></span><span className="reps">횟수</span></div>
          {session.sets.map((s, idx) => (
            <div className={`setrow ${s.extra ? 'extra' : ''}`} key={idx}>
              <span className="n">{idx + 1}</span>
              <span className="muted small">{s.label ?? (s.isMax ? '최대' : s.target !== null ? `${s.target}개` : '자유')}</span>
              <button className="btn sm" onClick={() => removeSet(idx)} style={{ justifySelf: 'end' }}>삭제</button>
              <input
                type="number"
                inputMode="numeric"
                defaultValue={s.reps}
                onBlur={(e) => updateReps(idx, e.target.value)}
                style={{ width: 64, textAlign: 'right', fontWeight: 800, background: 'transparent', border: '1px solid var(--line)', borderRadius: 8, padding: '4px 6px' }}
              />
            </div>
          ))}
        </div>
        <button className="btn sm" onClick={addSet}>+ 세트 추가</button>
      </div>

      {!session.completed && (
        <button className="btn primary block" onClick={() => navigate({ name: 'session', id })}>이어서 하기</button>
      )}
      <button className="btn danger block" onClick={() => setConfirmDel(true)}>이 세션 삭제</button>

      {confirmDel && (
        <Sheet title="세션을 삭제할까요?" onClose={() => setConfirmDel(false)}>
          <p className="small muted">기록만 삭제되고 프로그램 진행 상태는 바뀌지 않습니다. 필요하면 설정에서 조정하세요.</p>
          <button
            className="btn danger big block"
            onClick={async () => {
              await db.sessions.delete(id)
              navigate({ name: 'stats' }, true)
            }}
          >
            삭제
          </button>
          <button className="btn block" onClick={() => setConfirmDel(false)}>취소</button>
        </Sheet>
      )}
    </div>
  )
}
