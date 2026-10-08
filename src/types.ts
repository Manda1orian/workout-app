export type ExerciseId = 'pullup' | 'pushup' | 'squat'

export const EXERCISES: ExerciseId[] = ['pullup', 'pushup', 'squat']

export const EXERCISE_NAME: Record<ExerciseId, string> = {
  pullup: '풀업',
  pushup: '푸시업',
  squat: '스쿼트',
}

export const PROGRAM_NAME: Record<ExerciseId, string> = {
  pullup: '암스트롱 풀업',
  pushup: 'Hundred Pushups',
  squat: 'Two Hundred Squats',
}

/** 한 세트에 대한 권장 사항 */
export interface SetPlan {
  /** 권장 횟수. isMax이면 최소 횟수(없으면 null) */
  target: number | null
  /** 최대 반복 세트인지 */
  isMax: boolean
  /** 세트 라벨 (예: 와이드 그립) */
  label?: string
}

/** 기록된 한 세트 */
export interface SetRecord {
  target: number | null
  isMax: boolean
  label?: string
  reps: number
  /** 권장 세트 범위 밖에서 사용자가 추가한 세트 */
  extra?: boolean
}

export interface Session {
  id?: number
  exercise: ExerciseId
  /** yyyy-mm-dd */
  date: string
  startedAt: number
  finishedAt?: number
  /** 세션 종류 키 (예: mon, w3d2, test) */
  planKey: string
  planTitle: string
  sets: SetRecord[]
  completed: boolean
  /** 그 시점의 프로그램 상태 스냅샷 */
  meta: Record<string, number | string | boolean | undefined>
}

/** 암스트롱 상태 */
export interface ArmstrongState {
  exercise: 'pullup'
  started: boolean
  /** 수·목 트레이닝 세트 횟수 */
  trainingReps: number
  /** trainingReps가 적용된 주 (yyyy-Www) */
  weekKey: string
  /** 마지막 자동 조정 설명 */
  lastAdjustment?: string
  /** 시작한 날짜 */
  startedOn?: string
}

export type HundredPhase = 'test' | 'train' | 'retest' | 'final' | 'done'

/** Hundred Pushups / Two Hundred Squats 상태 */
export interface HundredState {
  exercise: 'pushup' | 'squat'
  started: boolean
  phase: HundredPhase
  week: number // 1..6
  day: number // 1..3
  column: number // 0..2
  lastTest?: number
  tests: { date: string; reps: number; after: string }[]
  startedOn?: string
  /** 직전 재테스트 결과가 범위 미달이었는지 */
  belowRange?: boolean
}

export type ProgramState = ArmstrongState | HundredState

export interface Settings {
  /** 전체 시작 순서 */
  order: ExerciseId[]
  /** 휴식 시간 덮어쓰기 (초). key: `${exercise}` 또는 `${exercise}:${planKey}` */
  restOverride: Record<string, number>
  sound: boolean
  vibrate: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  order: ['pullup', 'pushup', 'squat'],
  restOverride: {},
  sound: true,
  vibrate: true,
}
