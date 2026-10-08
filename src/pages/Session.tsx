import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { RestTimer } from '../components/RestTimer'
import { Sheet } from '../components/Sheet'
import { Stepper } from '../components/Stepper'
import { db, lastCompletedSession } from '../db/db'
import { primeAudio } from '../lib/alert'
import { useProgram, useSettings, resolveRest } from '../lib/hooks'
import { navigate } from '../lib/route'
import { discardSession, finishSession, getQueue, setFlash, setQueue, startSession } from '../lib/session'
import { buildView, needsWeekDecision, planFromKey, sessionTotal } from '../programs'
import type { SetPlan } from '../types'
import { EXERCISE_NAME, type SetRecord } from '../types'

export function SessionPage({ id }: { id: number }) {
  const session = useLiveQuery(() => db.sessions.get(id), [id])
  const state = useProgram(session?.exercise ?? 'pullup')
  const [settings] = useSettings()
  const last = useLiveQuery(
    () => (session ? lastCompletedSession(session.exercise, session.planKey) : undefined),
    [session?.exercise, session?.planKey],
  )

  const [reps, setReps] = useState<number>(NaN)
  const [rest, setRest] = useState<{ seconds: number; next: string } | null>(null)
  const [extraMode, setExtraMode] = useState(false)
  const [confirm, setConfirm] = useState<'finish' | 'discard' | 'week' | null>(null)

  const plan = useMemo(() => (session && state ? planFromKey(state, session.planKey) : null), [session, state])
  const sets = session?.sets ?? []
  const i = sets.length
  const planned: SetPlan | null = plan ? plan.setPlan(i, sets) : null
  const current: SetPlan | null = planned ?? (extraMode ? { target: null, isMax: false } : null)
  const lastSets = last?.sets ?? []

  // 현재 세트 입력 기본값: 권장 횟수 → 지난번 같은 세트 → 빈칸
  useEffect(() => {
    if (!current) return
    if (current.target !== null && !current.isMax) setReps(current.target)
    else if (lastSets[i]) setReps(lastSets[i].reps)
    else if (current.isMax && current.target !== null) setReps(current.target)
    else setReps(NaN)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, session?.planKey, extraMode, !!current])

  if (session === undefined || !state) return <div className="page" />
  if (session === null) return <div className="page"><div className="empty">세션을 찾을 수 없어요.</div></div>
  if (!plan) return <div className="page"><div className="empty">세션 종류를 해석할 수 없어요.</div></div>

  const exercise = session.exercise

  const commitSet = async () => {
    if (!current || Number.isNaN(reps)) return
    primeAudio()
    const rec: SetRecord = { target: current.target, isMax: current.isMax, label: current.label, reps, extra: !planned }
    const newSets = [...sets, rec]
    await db.sessions.update(id, { sets: newSets })
    setExtraMode(false)
    const nextPlan = plan.setPlan(newSets.length, newSets)
    if (plan.isTest) return
    if (nextPlan) {
      const programRest = plan.restAfter(newSets.length - 1, newSets)
      const sec = resolveRest(settings, exercise, plan.key, programRest)
      setRest({ seconds: sec, next: describe(nextPlan, newSets.length) })
    }
  }

  const describe = (p: SetPlan, idx: number) => {
    const n = `세트 ${idx + 1}`
    const label = p.label ? ` · ${p.label}` : ''
    if (p.isMax) return `${n}${label} · 최대 반복${p.target ? ` (최소 ${p.target}개)` : ''}`
    return `${n}${label} · ${p.target}개`
  }

  const removeLast = async () => {
    if (sets.length === 0) return
    await db.sessions.update(id, { sets: sets.slice(0, -1) })
  }

  const doFinish = async (decision?: 'advance' | 'repeat') => {
    const msg = await finishSession(session, state, decision)
    const queue = await getQueue()
    if (queue.length > 0) {
      const [nextEx, ...restQ] = queue
      await setQueue(restQ)
      const nextState = (await db.programs.get(nextEx)) ?? null
      if (nextState) {
        const view = buildView(nextState)
        const nextPlan = view.today ?? view.options[0]
        if (nextPlan && nextPlan.key !== 'fri') {
          setFlash(msg)
          await startSession(nextEx, nextPlan, nextState)
          return
        }
      }
    }
    setFlash(msg)
    navigate({ name: 'home' }, true)
  }

  const requestFinish = () => {
    if (needsWeekDecision(state, session.planKey)) setConfirm('week')
    else setConfirm('finish')
  }

  const total = sessionTotal(sets)
  const canFinish = sets.length > 0

  return (
    <div className="page">
      <div className="topbar">
        <button className="back" onClick={() => navigate({ name: 'home' })} aria-label="홈">‹</button>
        <div className="grow">
          <div className={`exercise-tag ${exercise}`}>{EXERCISE_NAME[exercise]}</div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>{plan.title}</div>
        </div>
        <button className="btn sm danger" onClick={() => setConfirm('discard')}>버리기</button>
      </div>
      <p className="muted small">{plan.description}</p>

      {/* 완료된 세트 */}
      {(sets.length > 0 || lastSets.length > 0) && (
        <div className="card">
          <div className="sets">
            <div className="setrow head"><span>세트</span><span>종류</span><span className="tgt">지난번</span><span className="reps">횟수</span></div>
            {sets.map((s, idx) => (
              <div className={`setrow ${s.extra ? 'extra' : ''}`} key={idx}>
                <span className="n">{idx + 1}</span>
                <span className="muted small">{s.label ?? (s.isMax ? '최대' : s.target !== null ? `${s.target}개` : '자유')}</span>
                <span className="last">{lastSets[idx]?.reps ?? '–'}</span>
                <span className="reps">{s.reps}</span>
              </div>
            ))}
            {current && (
              <div className="setrow current">
                <span className="n">{i + 1}</span>
                <span className="small" style={{ fontWeight: 700 }}>
                  {current.label ?? (current.isMax ? '최대 반복' : current.target !== null ? `${current.target}개` : '직접 입력')}
                </span>
                <span className="last">{lastSets[i]?.reps ?? '–'}</span>
                <span className="reps muted">…</span>
              </div>
            )}
          </div>
          <div className="row between small muted">
            <span>총 {total}개{plan.plannedSets ? ` · 권장 ${plan.plannedSets}세트` : ''}</span>
            {sets.length > 0 && <button className="btn sm" onClick={removeLast}>마지막 세트 취소</button>}
          </div>
        </div>
      )}

      {/* 현재 세트 입력 */}
      {current ? (
        <div className="card current-set">
          <div className="label">
            세트 {i + 1}
            {current.label ? ` · ${current.label}` : ''}
          </div>
          <div style={{ fontWeight: 800, fontSize: 20 }}>
            {current.isMax
              ? `최대 반복${current.target ? ` (최소 ${current.target}개)` : ''}`
              : current.target !== null
                ? `권장 ${current.target}개`
                : '횟수 직접 입력'}
          </div>
          <Stepper value={reps} onChange={setReps} />
          {lastSets[i] && <div className="hint">지난번 이 세트: {lastSets[i].reps}개</div>}
          <button className="btn primary big block" disabled={Number.isNaN(reps)} onClick={commitSet}>
            세트 완료
          </button>
        </div>
      ) : (
        <div className="card">
          <div style={{ fontWeight: 800 }}>권장 세트를 모두 마쳤어요 · 총 {total}개</div>
          <div className="muted small">더 하려면 세트를 추가하고, 끝났으면 세션을 종료하세요.</div>
          <div className="row">
            <button className="btn grow" onClick={() => setExtraMode(true)}>+ 세트 추가</button>
            <button className="btn primary grow" onClick={requestFinish}>세션 종료</button>
          </div>
        </div>
      )}

      {current && canFinish && (
        <button className="btn block" onClick={requestFinish}>
          여기까지만 하고 세션 종료
        </button>
      )}

      {rest && (
        <RestTimer
          seconds={rest.seconds}
          nextLabel={rest.next}
          sound={settings.sound}
          vibrateOn={settings.vibrate}
          onDone={() => setRest(null)}
          onSkip={() => setRest(null)}
        />
      )}

      {confirm === 'finish' && (
        <Sheet title="세션을 종료할까요?" onClose={() => setConfirm(null)}>
          <p className="small muted">{sets.length}세트 · 총 {total}개가 기록됩니다.</p>
          <button className="btn primary big block" onClick={() => doFinish()}>종료하고 저장</button>
          <button className="btn block" onClick={() => setConfirm(null)}>계속하기</button>
        </Sheet>
      )}

      {confirm === 'week' && (
        <Sheet title="이번 주를 통과했나요?" onClose={() => setConfirm(null)}>
          <p className="small muted">
            Day 3까지 마쳤어요. 권장 횟수를 대체로 채웠다면 다음 단계로, 많이 못 미쳤다면 이번 주를 반복하는 것이 원본 프로그램의
            권장입니다.
          </p>
          <button className="btn primary big block" onClick={() => doFinish('advance')}>다음 단계로</button>
          <button className="btn block" onClick={() => doFinish('repeat')}>이번 주 반복</button>
        </Sheet>
      )}

      {confirm === 'discard' && (
        <Sheet title="이 세션을 버릴까요?" onClose={() => setConfirm(null)}>
          <p className="small muted">기록된 {sets.length}세트가 삭제되고 프로그램 진행에는 반영되지 않습니다.</p>
          <button
            className="btn danger big block"
            onClick={async () => {
              await discardSession(id)
              await setQueue([])
              navigate({ name: 'home' }, true)
            }}
          >
            버리기
          </button>
          <button className="btn block" onClick={() => setConfirm(null)}>취소</button>
        </Sheet>
      )}
    </div>
  )
}
