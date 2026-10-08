import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Sheet } from '../components/Sheet'
import { Stepper } from '../components/Stepper'
import { db, lastCompletedSession } from '../db/db'
import { WEEKDAY_KO, todayKey } from '../lib/date'
import { usePrograms, useSettings, useToast } from '../lib/hooks'
import { navigate } from '../lib/route'
import { setQueue, startSession, takeFlash } from '../lib/session'
import { buildView, isArmstrong, resolveFriday, sessionTotal } from '../programs'
import type { ArmstrongDay } from '../programs/armstrong'
import type { SessionPlan } from '../programs/types'
import { EXERCISE_NAME, PROGRAM_NAME, type ArmstrongState, type ExerciseId, type ProgramState, type Session } from '../types'
import { primeAudio } from '../lib/alert'

type Picker =
  | { kind: 'options'; exercise: ExerciseId }
  | { kind: 'friday'; exercise: 'pullup'; onPick?: (plan: SessionPlan) => void }
  | { kind: 'armstrongSetup'; then?: (state: ArmstrongState) => void }

export function Home() {
  const programs = usePrograms()
  const [settings] = useSettings()
  const [toast, showToast] = useToast()
  const [picker, setPicker] = useState<Picker | null>(null)
  const [setupReps, setSetupReps] = useState(3)

  const active = useLiveQuery(() => db.sessions.filter((s) => !s.completed).toArray(), [])
  const lastByExercise = useLiveQuery(async () => {
    const out: Partial<Record<ExerciseId, Session | undefined>> = {}
    for (const e of ['pullup', 'pushup', 'squat'] as ExerciseId[]) out[e] = await lastCompletedSession(e)
    return out
  }, [])

  useEffect(() => {
    const f = takeFlash()
    if (f) showToast(f)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!programs) return null
  const today = new Date()

  const begin = async (exercise: ExerciseId, plan: SessionPlan, state: ProgramState) => {
    primeAudio()
    // 암스트롱 미설정이면 먼저 트레이닝 세트 횟수 설정
    if (isArmstrong(state) && !state.started) {
      setSetupReps(state.trainingReps)
      setPicker({
        kind: 'armstrongSetup',
        then: async (st) => {
          const p = plan.key === 'fri' ? null : plan
          if (!p) {
            setPicker({ kind: 'friday', exercise: 'pullup', onPick: (fp) => void startSession('pullup', fp, st) })
            return
          }
          await startSession(exercise, p, st)
        },
      })
      return
    }
    if (plan.key === 'fri') {
      setPicker({ kind: 'friday', exercise: 'pullup', onPick: (fp) => void startSession('pullup', fp, state) })
      return
    }
    await startSession(exercise, plan, state)
  }

  const startAll = async () => {
    primeAudio()
    const order = settings.order.filter((e) => {
      const st = programs.find((p) => p.exercise === e)!
      return buildView(st, today).today !== null || isArmstrong(st)
    })
    if (order.length === 0) return
    const [first, ...rest] = order
    await setQueue(rest)
    const st = programs.find((p) => p.exercise === first)!
    const view = buildView(st, today)
    const plan = view.today ?? view.options[0]
    await begin(first, plan, st)
  }

  return (
    <div className="page">
      <div>
        <h1 className="page-title">오늘의 운동</h1>
        <p className="page-sub">
          {todayKey(today)} ({WEEKDAY_KO[today.getDay()]})
        </p>
      </div>

      {active && active.length > 0 && (
        <div className="card">
          <div className="card-title">진행 중인 세션</div>
          <div className="list">
            {active.map((s) => (
              <div className="item" key={s.id}>
                <div>
                  <div style={{ fontWeight: 700 }}>
                    {EXERCISE_NAME[s.exercise]} · {s.planTitle}
                  </div>
                  <div className="muted">
                    {s.date} · {s.sets.length}세트 기록됨
                  </div>
                </div>
                <button className="btn sm primary" onClick={() => navigate({ name: 'session', id: s.id! })}>
                  이어하기
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <button className="btn primary big block" onClick={startAll}>
        ▶ 전체 시작 ({settings.order.map((e) => EXERCISE_NAME[e]).join(' → ')})
      </button>

      {settings.order.map((exercise) => {
        const state = programs.find((p) => p.exercise === exercise)!
        const view = buildView(state, today)
        const last = lastByExercise?.[exercise]
        const plan = view.today
        return (
          <div className="card" key={exercise}>
            <div className="card-head">
              <div className="card-title">
                <span className={`dot ${exercise}`} />
                {EXERCISE_NAME[exercise]}
              </div>
              <span className="chip ghost">{PROGRAM_NAME[exercise]}</span>
            </div>
            <div className="muted">{view.statusLine}</div>
            {view.notice && <div className="notice">{view.notice}</div>}
            {plan ? (
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{plan.title}</div>
                <div className="muted">{plan.description}</div>
              </div>
            ) : (
              <div className="muted">{view.restReason}</div>
            )}
            {last && (
              <div className="small muted">
                지난번 ({last.date}) {last.planTitle}: 총 {sessionTotal(last.sets)}개 · {last.sets.map((s) => s.reps).join(', ')}
              </div>
            )}
            <div className="row">
              <button className="btn primary grow" disabled={!plan} onClick={() => plan && begin(exercise, plan, state)}>
                시작
              </button>
              <button className="btn" onClick={() => setPicker({ kind: 'options', exercise })}>
                다른 세션
              </button>
            </div>
          </div>
        )
      })}

      {picker?.kind === 'options' && (() => {
        const state = programs.find((p) => p.exercise === picker.exercise)!
        const view = buildView(state, today)
        return (
          <Sheet title={`${EXERCISE_NAME[picker.exercise]} 세션 선택`} onClose={() => setPicker(null)}>
            {view.options.map((o) => (
              <button
                key={o.key}
                className={`option ${view.today?.key === o.key ? 'active' : ''}`}
                onClick={() => {
                  setPicker(null)
                  void begin(picker.exercise, o, state)
                }}
              >
                <b>{o.title}</b>
                <span className="muted">{o.description}</span>
              </button>
            ))}
          </Sheet>
        )
      })()}

      {picker?.kind === 'friday' && (() => {
        const state = programs.find((p) => p.exercise === 'pullup')! as ArmstrongState
        const days: Exclude<ArmstrongDay, 'fri'>[] = ['mon', 'tue', 'wed', 'thu']
        return (
          <Sheet title="금요일: 어떤 요일을 반복할까요?" onClose={() => setPicker(null)}>
            {days.map((d) => {
              const p = resolveFriday(state, d)
              return (
                <button
                  key={d}
                  className="option"
                  onClick={() => {
                    setPicker(null)
                    picker.onPick?.(p)
                  }}
                >
                  <b>{p.title}</b>
                  <span className="muted">{p.description}</span>
                </button>
              )
            })}
          </Sheet>
        )
      })()}

      {picker?.kind === 'armstrongSetup' && (
        <Sheet title="암스트롱 시작 설정" onClose={() => setPicker(null)}>
          <p className="small muted">
            수·목요일 트레이닝 세트에서 매 세트 할 횟수입니다. 수요일 9세트를 모두 채울 수 있는 숫자로 정하세요. 보통 최대
            반복 횟수의 절반 정도가 적당합니다. 언제든 설정에서 바꿀 수 있어요.
          </p>
          <Stepper value={setupReps} onChange={setSetupReps} min={1} />
          <button
            className="btn primary big block"
            disabled={!setupReps || Number.isNaN(setupReps)}
            onClick={async () => {
              const cur = programs.find((p) => p.exercise === 'pullup')! as ArmstrongState
              const next: ArmstrongState = { ...cur, started: true, trainingReps: setupReps, startedOn: todayKey() }
              await db.programs.put(next)
              setPicker(null)
              picker.then?.(next)
            }}
          >
            {setupReps}개로 시작
          </button>
        </Sheet>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
