import type { ArmstrongState, SetRecord, Session } from '../types'
import { weekKey } from '../lib/date'
import type { SessionPlan } from './types'

export const ARMSTRONG_DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri'] as const
export type ArmstrongDay = (typeof ARMSTRONG_DAY_KEYS)[number]

export const ARMSTRONG_DAY_TITLE: Record<ArmstrongDay, string> = {
  mon: '월 · 최대 반복 5세트',
  tue: '화 · 피라미드',
  wed: '수 · 트레이닝 세트 3그립',
  thu: '목 · 트레이닝 세트 최대',
  fri: '금 · 가장 힘든 요일 반복',
}

export const GRIPS = ['일반 그립', '언더 그립(친업)', '와이드 그립']

export function initialArmstrongState(): ArmstrongState {
  return { exercise: 'pullup', started: false, trainingReps: 3, weekKey: weekKey() }
}

export function armstrongPlan(day: ArmstrongDay, trainingReps: number): SessionPlan {
  switch (day) {
    case 'mon':
      return {
        key: 'mon',
        title: ARMSTRONG_DAY_TITLE.mon,
        description: '5세트 모두 실패 지점까지. 세트 사이 휴식 90초.',
        plannedSets: 5,
        setPlan: (i) => (i < 5 ? { target: null, isMax: true } : null),
        restAfter: () => 90,
      }
    case 'tue':
      return {
        key: 'tue',
        title: ARMSTRONG_DAY_TITLE.tue,
        description:
          '1개, 2개, 3개… 한 개씩 늘려가며 목표를 못 채우는 세트까지. 그 다음 최대 반복 1세트. 휴식은 직전 세트 횟수 × 10초.',
        setPlan: (i, done) => {
          // 실패 세트가 나왔는지 확인
          const failIdx = done.findIndex((s) => !s.isMax && s.target !== null && s.reps < s.target)
          if (failIdx === -1) return { target: i + 1, isMax: false }
          if (i === failIdx + 1) return { target: null, isMax: true, label: '최대 반복' }
          return null
        },
        restAfter: (_i, done) => Math.max(10, (done.at(-1)?.reps ?? 1) * 10),
      }
    case 'wed':
      return {
        key: 'wed',
        title: ARMSTRONG_DAY_TITLE.wed,
        description: `세 가지 그립으로 ${trainingReps}개씩 3세트 = 9세트. 휴식 60초.`,
        plannedSets: 9,
        setPlan: (i) => (i < 9 ? { target: trainingReps, isMax: false, label: GRIPS[Math.floor(i / 3)] } : null),
        restAfter: () => 60,
      }
    case 'thu':
      return {
        key: 'thu',
        title: ARMSTRONG_DAY_TITLE.thu,
        description: `${trainingReps}개씩 할 수 있는 만큼 세트를 이어갑니다. 9세트를 넘기면 다음 주 +1. 휴식 60초.`,
        setPlan: () => ({ target: trainingReps, isMax: false }),
        restAfter: () => 60,
      }
    case 'fri':
      // 금요일은 선택한 요일 플랜을 그대로 쓰되 key만 fri:<day>
      return {
        key: 'fri',
        title: ARMSTRONG_DAY_TITLE.fri,
        description: '월~목 중 가장 힘들었던 요일을 골라 반복합니다.',
        setPlan: () => null,
        restAfter: () => null,
      }
  }
}

/** 금요일: 선택한 요일 플랜을 금요일 키로 감싸기 */
export function fridayPlan(of: Exclude<ArmstrongDay, 'fri'>, trainingReps: number): SessionPlan {
  const base = armstrongPlan(of, trainingReps)
  return { ...base, key: `fri:${of}`, title: `금 · ${base.title.slice(4)} 반복` }
}

export function parsePlanDay(planKey: string): ArmstrongDay | null {
  const k = planKey.startsWith('fri:') ? planKey.slice(4) : planKey
  return (ARMSTRONG_DAY_KEYS as readonly string[]).includes(k) ? (k as ArmstrongDay) : null
}

/** 트레이닝 세트 횟수를 모두 채운 세트 수 */
export function fullSets(sets: SetRecord[], reps: number): number {
  return sets.filter((s) => s.reps >= reps).length
}

/**
 * 주가 바뀌었을 때 지난 주 수·목 결과로 트레이닝 세트 횟수 조정.
 * - 목요일 9세트 이상 → +1
 * - 아니고 수요일 9세트 미달 → -1
 * - 그 외 유지
 */
export function rolloverArmstrong(
  state: ArmstrongState,
  lastWeekSessions: Session[],
  nowKey = weekKey(),
): ArmstrongState {
  if (!state.started || state.weekKey === nowKey) return state
  const reps = state.trainingReps
  const thu = lastWeekSessions.filter((s) => s.completed && parsePlanDay(s.planKey) === 'thu')
  const wed = lastWeekSessions.filter((s) => s.completed && parsePlanDay(s.planKey) === 'wed')
  const bestThu = Math.max(0, ...thu.map((s) => fullSets(s.sets, reps)))
  const bestWed = Math.max(0, ...wed.map((s) => fullSets(s.sets, reps)))

  let next = reps
  let why: string
  if (thu.length && bestThu >= 9) {
    next = reps + 1
    why = `지난주 목요일 ${bestThu}세트 성공 → 트레이닝 세트 ${reps}개에서 ${next}개로 올렸어요.`
  } else if (wed.length && bestWed < 9) {
    next = Math.max(1, reps - 1)
    why = `지난주 수요일 ${bestWed}세트만 완수 → 트레이닝 세트 ${reps}개에서 ${next}개로 내렸어요.`
  } else if (thu.length || wed.length) {
    why = `지난주 결과로는 트레이닝 세트 ${reps}개를 유지합니다.`
  } else {
    why = `지난주 수·목 기록이 없어 트레이닝 세트 ${reps}개를 유지합니다.`
  }
  return { ...state, trainingReps: next, weekKey: nowKey, lastAdjustment: why }
}

/** 수·목 완료 직후 보여줄 메시지 */
export function armstrongSessionMessage(state: ArmstrongState, planKey: string, sets: SetRecord[]): string | undefined {
  const day = parsePlanDay(planKey)
  const total = sets.reduce((a, b) => a + b.reps, 0)
  const full = fullSets(sets, state.trainingReps)
  if (day === 'thu') {
    return full >= 9
      ? `${full}세트 성공! 다음 주 트레이닝 세트가 ${state.trainingReps + 1}개로 올라갑니다.`
      : `${full}세트 완수. 다음 주는 ${state.trainingReps}개 유지.`
  }
  if (day === 'wed') {
    return full >= 9
      ? `9세트 모두 완수. 총 ${total}개.`
      : `${full}/9세트 완수. 목요일 결과에 따라 다음 주 횟수가 조정될 수 있어요.`
  }
  if (day === 'mon') return `총 ${total}개 · 최대 세트 ${Math.max(0, ...sets.map((s) => s.reps))}개.`
  if (day === 'tue') {
    const peak = Math.max(0, ...sets.filter((s) => !s.isMax).map((s) => s.reps))
    return `피라미드 정점 ${peak}개 · 총 ${total}개.`
  }
  return undefined
}

export function armstrongStatusLine(state: ArmstrongState): string {
  if (!state.started) return '시작 전 · 트레이닝 세트 횟수 설정 필요'
  return `트레이닝 세트 ${state.trainingReps}개 · ${state.weekKey.replace('-W', '년 ')}주`
}
