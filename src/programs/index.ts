import type { ArmstrongState, ExerciseId, HundredState, ProgramState, SetRecord, Session } from '../types'
import { weekday } from '../lib/date'
import {
  ARMSTRONG_DAY_KEYS,
  armstrongPlan,
  armstrongSessionMessage,
  armstrongStatusLine,
  fridayPlan,
  initialArmstrongState,
  type ArmstrongDay,
} from './armstrong'
import { advanceAfterSession, currentPlan, hundredStatusLine, initialHundredState, testPlan, trainingPlan, weeksFor } from './hundred'
import type { ProgramView, SessionPlan } from './types'

export function initialState(exercise: ExerciseId): ProgramState {
  return exercise === 'pullup' ? initialArmstrongState() : initialHundredState(exercise)
}

export function isArmstrong(s: ProgramState): s is ArmstrongState {
  return s.exercise === 'pullup'
}

const WEEKDAY_TO_DAY: Record<number, ArmstrongDay | undefined> = { 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri' }

export function buildView(state: ProgramState, now = new Date()): ProgramView {
  if (isArmstrong(state)) {
    const reps = state.trainingReps
    const options: SessionPlan[] = ARMSTRONG_DAY_KEYS.map((d) => armstrongPlan(d, reps))
    const todayDay = WEEKDAY_TO_DAY[weekday(now)]
    const today = todayDay ? options.find((o) => o.key === todayDay)! : null
    return {
      exercise: 'pullup',
      today,
      restReason: today ? undefined : '주말은 휴식일. 원하면 아무 요일 세션이나 고를 수 있어요.',
      options,
      statusLine: armstrongStatusLine(state),
      notice: state.lastAdjustment,
    }
  }
  const h = state as HundredState
  const today = currentPlan(h)
  const options: SessionPlan[] = []
  if (h.started) {
    options.push(testPlan(h.exercise, 'retest', h))
    options.push(testPlan(h.exercise, 'final', h))
  } else {
    options.push(testPlan(h.exercise, 'test', h))
  }
  const weeks = weeksFor(h.exercise)
  for (let w = 1; w <= weeks.length; w++) {
    for (let d = 1; d <= 3; d++) {
      // 다른 주차를 고를 때는 그 주차 범위 내에서 현재 컬럼 유지
      options.push(trainingPlan(h.exercise, w, d, h.column))
    }
  }
  return {
    exercise: h.exercise,
    today,
    restReason: today ? undefined : '프로그램을 완료했어요. 설정에서 다시 시작할 수 있습니다.',
    options,
    statusLine: hundredStatusLine(h),
  }
}

/** 금요일 선택 시 플랜 생성 */
export function resolveFriday(state: ArmstrongState, of: Exclude<ArmstrongDay, 'fri'>): SessionPlan {
  return fridayPlan(of, state.trainingReps)
}

/** 플랜 키로 다시 플랜 객체 복원 (세션 이어하기용) */
export function planFromKey(state: ProgramState, planKey: string): SessionPlan | null {
  if (isArmstrong(state)) {
    if (planKey.startsWith('fri:')) return fridayPlan(planKey.slice(4) as Exclude<ArmstrongDay, 'fri'>, state.trainingReps)
    if ((ARMSTRONG_DAY_KEYS as readonly string[]).includes(planKey)) return armstrongPlan(planKey as ArmstrongDay, state.trainingReps)
    return null
  }
  const h = state as HundredState
  if (planKey === 'test' || planKey === 'retest' || planKey === 'final') return testPlan(h.exercise, planKey, h)
  const m = /^w(\d)d(\d)$/.exec(planKey)
  if (m) return trainingPlan(h.exercise, Number(m[1]), Number(m[2]), h.column)
  return null
}

/** 세션 완료 후 상태 전이 + 메시지 */
export function completeSession(
  state: ProgramState,
  session: Session,
  decision?: 'advance' | 'repeat',
): { next: ProgramState; message?: string } {
  if (isArmstrong(state)) {
    const next: ArmstrongState = { ...state, started: true, startedOn: state.startedOn ?? session.date }
    return { next, message: armstrongSessionMessage(next, session.planKey, session.sets) }
  }
  return advanceAfterSession(state as HundredState, session.planKey, session.sets, decision)
}

/** Day 3 완료 시 "다음 주 / 반복" 선택이 필요한지 */
export function needsWeekDecision(state: ProgramState, planKey: string): boolean {
  if (isArmstrong(state)) return false
  const h = state as HundredState
  const m = /^w(\d)d(\d)$/.exec(planKey)
  return !!m && Number(m[1]) === h.week && Number(m[2]) === h.day && h.day === 3
}

export function sessionTotal(sets: SetRecord[]): number {
  return sets.reduce((a, b) => a + b.reps, 0)
}
