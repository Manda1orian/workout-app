import { db } from '../db/db'
import { completeSession, isArmstrong } from '../programs'
import type { SessionPlan } from '../programs/types'
import type { ExerciseId, ProgramState, Session } from '../types'
import { todayKey } from './date'
import { navigate } from './route'

/** 전체 시작 큐 (남은 운동 순서) */
export async function setQueue(q: ExerciseId[]) {
  await db.kv.put({ key: 'queue', value: q })
}
export async function getQueue(): Promise<ExerciseId[]> {
  return ((await db.kv.get('queue'))?.value as ExerciseId[]) ?? []
}

export function setFlash(msg: string | undefined) {
  if (msg) sessionStorage.setItem('flash', msg)
}
export function takeFlash(): string | null {
  const m = sessionStorage.getItem('flash')
  sessionStorage.removeItem('flash')
  return m
}

export async function startSession(exercise: ExerciseId, plan: SessionPlan, state: ProgramState): Promise<number> {
  // 같은 운동의 미완료 세션 정리: 빈 세션은 삭제, 기록이 있으면 이어하기
  const pending = await db.sessions.where('exercise').equals(exercise).filter((s) => !s.completed).toArray()
  const resumable = pending.find((s) => s.sets.length > 0 && s.planKey === plan.key)
  for (const s of pending) {
    if (s !== resumable && s.sets.length === 0) await db.sessions.delete(s.id!)
  }
  if (resumable) {
    setFlash('기록 중이던 세션을 이어서 합니다.')
    navigate({ name: 'session', id: resumable.id! })
    return resumable.id!
  }
  const meta: Session['meta'] = isArmstrong(state)
    ? { trainingReps: state.trainingReps }
    : { week: state.week, day: state.day, column: state.column, phase: state.phase }
  const id = await db.sessions.add({
    exercise,
    date: todayKey(),
    startedAt: Date.now(),
    planKey: plan.key,
    planTitle: plan.title,
    sets: [],
    completed: false,
    meta,
  })
  navigate({ name: 'session', id: id as number })
  return id as number
}

export async function finishSession(session: Session, state: ProgramState, decision?: 'advance' | 'repeat') {
  const { next, message } = completeSession(state, session, decision)
  await db.transaction('rw', db.sessions, db.programs, async () => {
    await db.sessions.update(session.id!, { completed: true, finishedAt: Date.now() })
    await db.programs.put(next)
  })
  return message
}

export async function discardSession(id: number) {
  await db.sessions.delete(id)
}
