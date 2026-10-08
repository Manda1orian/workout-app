import type { ExerciseId, SetPlan, SetRecord } from '../types'

/** 하나의 세션(하루 운동) 설계도 */
export interface SessionPlan {
  key: string
  title: string
  description: string
  /**
   * i번째(0부터) 세트의 권장 사항. null이면 권장 세트가 끝난 것 (이후는 사용자 직접 입력).
   * done: 지금까지 기록된 세트들 (피라미드처럼 동적으로 결정되는 경우 사용)
   */
  setPlan(i: number, done: SetRecord[]): SetPlan | null
  /** i번째 세트를 마친 뒤 휴식 시간(초). null이면 프로그램 권장값 없음 → 사용자 설정 */
  restAfter(i: number, done: SetRecord[]): number | null
  /** 권장 세트 수가 정해져 있으면 그 수 (화면 진행 표시용). 없으면 undefined */
  plannedSets?: number
  /** 테스트 세션 여부 (1세트 최대 반복) */
  isTest?: boolean
}

export interface ProgramView {
  exercise: ExerciseId
  /** 오늘 기본으로 제안되는 세션 */
  today: SessionPlan | null
  /** 오늘이 휴식일인지 (제안이 없을 때 설명) */
  restReason?: string
  /** 선택 가능한 모든 세션 */
  options: SessionPlan[]
  /** 진행 상태 한 줄 요약 */
  statusLine: string
  /** 추가 설명 (자동 조정 안내 등) */
  notice?: string
}
