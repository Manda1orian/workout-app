import type { HundredState, SetRecord } from '../types'
import type { SessionPlan } from './types'

/** [min, max] (max = Infinity → 그 이상) */
type Range = [number, number]

interface WeekData {
  ranges: Range[]
  /** 요일별 휴식(초) */
  rest: number[]
  /** days[d][column] = 세트 배열. 마지막 원소는 최대 반복 세트의 최소 횟수 */
  days: number[][][]
}

const INF = Number.POSITIVE_INFINITY

// 출처: hundredpushups.com (Steve Speirs). 개인 비상업 용도.
export const PUSHUP_WEEKS: WeekData[] = [
  {
    ranges: [[0, 5], [6, 10], [11, 20]],
    rest: [60, 60, 60],
    days: [
      [[2, 3, 2, 2, 3], [6, 6, 4, 4, 5], [10, 12, 7, 7, 9]],
      [[3, 4, 2, 3, 4], [6, 8, 6, 6, 7], [10, 12, 8, 8, 12]],
      [[4, 5, 4, 4, 5], [8, 10, 7, 7, 10], [11, 15, 9, 9, 13]],
    ],
  },
  {
    ranges: [[0, 5], [6, 10], [11, 20]],
    rest: [60, 90, 120],
    days: [
      [[4, 6, 4, 4, 6], [9, 11, 8, 8, 11], [14, 14, 10, 10, 15]],
      [[5, 6, 4, 4, 7], [10, 12, 9, 9, 13], [14, 16, 12, 12, 17]],
      [[5, 7, 5, 5, 8], [12, 13, 10, 10, 15], [16, 17, 14, 14, 20]],
    ],
  },
  {
    ranges: [[16, 20], [21, 25], [26, INF]],
    rest: [60, 90, 120],
    days: [
      [[10, 12, 7, 7, 9], [12, 17, 13, 13, 17], [14, 18, 14, 14, 20]],
      [[10, 12, 8, 8, 12], [14, 19, 14, 14, 19], [20, 25, 15, 15, 25]],
      [[11, 13, 9, 9, 13], [16, 21, 15, 15, 21], [22, 30, 20, 20, 28]],
    ],
  },
  {
    ranges: [[16, 20], [21, 25], [26, INF]],
    rest: [60, 90, 120],
    days: [
      [[12, 14, 11, 10, 16], [18, 22, 16, 16, 25], [21, 25, 21, 21, 32]],
      [[14, 16, 12, 12, 18], [20, 25, 20, 20, 28], [25, 29, 25, 25, 36]],
      [[16, 18, 13, 13, 20], [23, 28, 23, 23, 33], [29, 33, 29, 29, 40]],
    ],
  },
  {
    ranges: [[31, 35], [36, 40], [41, INF]],
    rest: [60, 45, 45],
    days: [
      [[17, 19, 15, 15, 20], [28, 35, 25, 22, 35], [36, 40, 30, 24, 40]],
      [
        [10, 10, 13, 13, 10, 10, 9, 25],
        [18, 18, 20, 20, 14, 14, 16, 40],
        [19, 19, 22, 22, 18, 18, 22, 45],
      ],
      [
        [13, 13, 15, 15, 12, 12, 10, 30],
        [18, 18, 20, 20, 17, 17, 20, 45],
        [20, 20, 24, 24, 20, 20, 22, 50],
      ],
    ],
  },
  {
    ranges: [[46, 50], [51, 60], [61, INF]],
    rest: [60, 45, 45],
    days: [
      [[25, 30, 20, 15, 40], [40, 50, 25, 25, 50], [45, 55, 35, 30, 55]],
      [
        [14, 14, 15, 15, 14, 14, 10, 10, 44],
        [20, 20, 23, 23, 20, 20, 18, 18, 53],
        [22, 22, 30, 30, 24, 24, 18, 18, 58],
      ],
      [
        [13, 13, 17, 17, 16, 16, 14, 14, 50],
        [22, 22, 30, 30, 25, 25, 18, 18, 55],
        [26, 26, 33, 33, 26, 26, 22, 22, 60],
      ],
    ],
  },
]

// 출처: twohundredsquats.com (Steve Speirs). 개인 비상업 용도.
export const SQUAT_WEEKS: WeekData[] = [
  {
    ranges: [[0, 10], [11, 20], [21, 30]],
    rest: [60, 60, 60],
    days: [
      [[3, 4, 3, 3, 5], [8, 8, 5, 5, 7], [13, 16, 9, 9, 13]],
      [[5, 5, 3, 5, 5], [8, 11, 8, 8, 9], [13, 16, 13, 13, 16]],
      [[5, 6, 5, 5, 7], [11, 13, 10, 10, 13], [15, 20, 13, 13, 18]],
    ],
  },
  {
    ranges: [[0, 10], [11, 20], [21, 30]],
    rest: [60, 60, 60],
    days: [
      [[6, 8, 5, 5, 8], [13, 15, 11, 11, 15], [19, 19, 13, 13, 20]],
      [[6, 8, 5, 5, 10], [13, 16, 13, 13, 18], [19, 22, 16, 16, 23]],
      [[7, 11, 7, 7, 11], [16, 18, 13, 13, 21], [22, 22, 19, 19, 27]],
    ],
  },
  {
    ranges: [[21, 30], [31, 40], [41, INF]],
    rest: [60, 90, 120],
    days: [
      [[13, 16, 10, 10, 13], [16, 22, 17, 17, 22], [19, 24, 19, 19, 27]],
      [[13, 16, 11, 11, 16], [19, 25, 19, 19, 25], [27, 34, 21, 21, 34]],
      [[15, 18, 13, 13, 18], [22, 29, 20, 20, 29], [30, 38, 27, 27, 40]],
    ],
  },
  {
    ranges: [[21, 30], [31, 40], [41, INF]],
    rest: [60, 60, 60],
    days: [
      [[16, 19, 15, 13, 22], [24, 30, 22, 22, 34], [29, 34, 29, 29, 43]],
      [[19, 22, 16, 16, 24], [27, 28, 27, 27, 38], [34, 40, 34, 34, 49]],
      [[22, 24, 18, 18, 27], [31, 38, 31, 31, 45], [40, 45, 40, 40, 54]],
    ],
  },
  {
    ranges: [[41, 50], [51, 60], [61, INF]],
    rest: [60, 45, 45],
    days: [
      [[23, 27, 21, 21, 27], [38, 47, 34, 30, 47], [49, 54, 40, 32, 54]],
      [
        [13, 13, 18, 18, 13, 13, 13, 34],
        [24, 24, 27, 27, 19, 19, 22, 54],
        [27, 27, 32, 32, 24, 24, 30, 63],
      ],
      [
        [16, 16, 20, 20, 16, 16, 13, 40],
        [23, 23, 27, 27, 23, 23, 27, 60],
        [27, 27, 32, 32, 27, 27, 36, 67],
      ],
    ],
  },
  {
    ranges: [[75, 90], [91, 110], [111, INF]],
    rest: [60, 45, 45],
    days: [
      [[34, 40, 27, 20, 54], [54, 67, 34, 31, 67], [63, 76, 47, 40, 76]],
      [
        [19, 19, 21, 21, 19, 19, 13, 13, 59],
        [27, 27, 31, 31, 27, 27, 24, 24, 72],
        [30, 30, 40, 40, 32, 32, 29, 29, 81],
      ],
      [
        [18, 18, 23, 23, 22, 22, 19, 19, 67],
        [30, 30, 40, 40, 31, 31, 24, 24, 81],
        [35, 35, 45, 45, 35, 35, 30, 30, 100],
      ],
    ],
  },
]

export function weeksFor(exercise: 'pushup' | 'squat'): WeekData[] {
  return exercise === 'pushup' ? PUSHUP_WEEKS : SQUAT_WEEKS
}

export const GOAL: Record<'pushup' | 'squat', number> = { pushup: 100, squat: 200 }

/** 테스트(재테스트)가 있는 주: 이 주의 Day 3 이후 */
export const TEST_AFTER_WEEKS = [2, 4, 5]

export function rangeLabel(r: Range): string {
  if (r[1] === INF) return `${r[0]}개 이상`
  if (r[0] === 0) return `${r[1]}개 이하`
  return `${r[0]}~${r[1]}개`
}

/**
 * 테스트 결과로 주차·컬럼 결정.
 * 초기 테스트(week=1): 1주차 범위 초과 → 3주차로 시작.
 * 그 외: 다음 주차 범위에서 컬럼 결정. 최소 미만이면 belowRange.
 */
export function placeByTest(
  exercise: 'pushup' | 'squat',
  reps: number,
  targetWeek: number,
): { week: number; column: number; belowRange: boolean } {
  const weeks = weeksFor(exercise)
  let week = targetWeek
  if (targetWeek === 1 && reps > weeks[0].ranges[2][1]) week = 3
  const ranges = weeks[week - 1].ranges
  if (reps < ranges[0][0]) return { week, column: 0, belowRange: true }
  const idx = ranges.findIndex(([lo, hi]) => reps >= lo && reps <= hi)
  return { week, column: idx === -1 ? 2 : idx, belowRange: false }
}

export function initialHundredState(exercise: 'pushup' | 'squat'): HundredState {
  return { exercise, started: false, phase: 'test', week: 1, day: 1, column: 0, tests: [] }
}

export function trainingPlan(exercise: 'pushup' | 'squat', week: number, day: number, column: number): SessionPlan {
  const w = weeksFor(exercise)[week - 1]
  const sets = w.days[day - 1][column]
  const rest = w.rest[day - 1]
  const last = sets.length - 1
  return {
    key: `w${week}d${day}`,
    title: `${week}주차 Day ${day}`,
    description: `컬럼 ${column + 1} (${rangeLabel(w.ranges[column])}) · ${sets.length}세트 · 휴식 ${rest}초`,
    plannedSets: sets.length,
    setPlan(i) {
      if (i > last) return null
      if (i === last) return { target: sets[i], isMax: true }
      return { target: sets[i], isMax: false }
    },
    restAfter: () => rest,
  }
}

export function testPlan(exercise: 'pushup' | 'squat', kind: 'test' | 'retest' | 'final', state: HundredState): SessionPlan {
  const name = exercise === 'pushup' ? '푸시업' : '스쿼트'
  const title = kind === 'test' ? '초기 테스트' : kind === 'final' ? `최종 테스트 (${GOAL[exercise]}개 도전)` : `재테스트 (${state.week}주차 완료 후)`
  return {
    key: kind,
    title,
    description:
      kind === 'final'
        ? `정자세 ${name}을 쉬지 않고 ${GOAL[exercise]}개 도전합니다. 결과를 기록하세요.`
        : `정자세 ${name}을 더 할 수 없을 때까지 최대 반복 1세트. 결과로 다음 주차 컬럼이 정해집니다.`,
    plannedSets: 1,
    isTest: true,
    setPlan: (i) => (i === 0 ? { target: null, isMax: true, label: '최대 반복' } : null),
    restAfter: () => null,
  }
}

/** 상태에서 "다음에 할 세션" 결정 */
export function currentPlan(state: HundredState): SessionPlan | null {
  if (state.phase === 'test' || state.phase === 'retest' || state.phase === 'final') {
    return testPlan(state.exercise, state.phase, state)
  }
  if (state.phase === 'done') return null
  return trainingPlan(state.exercise, state.week, state.day, state.column)
}

/** 주어진 세션을 끝낸 뒤 상태 전이 */
export function advanceAfterSession(
  state: HundredState,
  planKey: string,
  sets: SetRecord[],
  decision?: 'advance' | 'repeat',
): { next: HundredState; message?: string } {
  const s: HundredState = { ...state, tests: [...state.tests] }
  const total = sets.reduce((a, b) => a + b.reps, 0)
  const today = new Date().toISOString().slice(0, 10)

  if (planKey === 'test' || planKey === 'retest') {
    const reps = sets[0]?.reps ?? 0
    const targetWeek = planKey === 'test' ? 1 : s.week + 1
    const placed = placeByTest(s.exercise, reps, targetWeek)
    s.tests.push({ date: today, reps, after: planKey === 'test' ? 'initial' : `w${s.week}` })
    s.lastTest = reps
    s.started = true
    s.startedOn = s.startedOn ?? today
    s.phase = 'train'
    s.day = 1
    if (placed.belowRange && planKey === 'retest') {
      // 범위 미달: 이번 주 반복 (컬럼은 유지)
      s.belowRange = true
      return {
        next: s,
        message: `${reps}개는 ${targetWeek}주차 최소 범위 미만입니다. ${s.week}주차를 한 번 더 반복합니다. 설정에서 바꿀 수 있어요.`,
      }
    }
    s.belowRange = false
    s.week = placed.week
    s.column = placed.column
    return { next: s, message: `${reps}개 → ${placed.week}주차 컬럼 ${placed.column + 1}로 시작합니다.` }
  }

  if (planKey === 'final') {
    const reps = sets[0]?.reps ?? 0
    s.tests.push({ date: today, reps, after: 'final' })
    s.lastTest = reps
    const goal = GOAL[s.exercise]
    if (reps >= goal) {
      s.phase = 'done'
      return { next: s, message: `${reps}개! 목표 ${goal}개 달성입니다.` }
    }
    s.phase = 'train'
    s.week = 6
    s.day = 1
    return { next: s, message: `${reps}개. 목표 ${goal}개까지 조금 더. 6주차를 반복합니다.` }
  }

  // 훈련 세션 (현재 상태의 세션을 끝낸 경우에만 진행)
  const m = /^w(\d)d(\d)$/.exec(planKey)
  if (!m) return { next: s }
  const week = Number(m[1])
  const day = Number(m[2])
  if (week !== s.week || day !== s.day) return { next: s } // 다른 세션을 임의로 한 경우 상태 유지

  if (day < 3) {
    s.day = day + 1
    return { next: s, message: `총 ${total}개. 다음은 ${s.week}주차 Day ${s.day}.` }
  }
  // Day 3 완료
  if (decision === 'repeat') {
    s.day = 1
    return { next: s, message: `${s.week}주차를 반복합니다.` }
  }
  if (TEST_AFTER_WEEKS.includes(week)) {
    s.phase = 'retest'
    return { next: s, message: `${week}주차 완료! 하루 이틀 쉬고 재테스트를 하세요.` }
  }
  if (week >= 6) {
    s.phase = 'final'
    return { next: s, message: `6주 완료! 쉬고 나서 최종 테스트에 도전하세요.` }
  }
  s.week = week + 1
  s.day = 1
  return { next: s, message: `${week}주차 완료! 다음은 ${s.week}주차 Day 1.` }
}

export function hundredStatusLine(state: HundredState): string {
  if (!state.started) return '시작 전 · 초기 테스트 필요'
  if (state.phase === 'done') return `완료! 목표 ${GOAL[state.exercise]}개 달성`
  if (state.phase === 'retest') return `${state.week}주차 완료 · 재테스트 대기`
  if (state.phase === 'final') return '6주 완료 · 최종 테스트 대기'
  return `${state.week}주차 Day ${state.day} · 컬럼 ${state.column + 1}`
}
