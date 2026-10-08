import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useState } from 'react'
import { db, getSettings, saveSettings } from '../db/db'
import { initialState } from '../programs'
import type { ExerciseId, ProgramState, Settings } from '../types'
import { DEFAULT_SETTINGS } from '../types'

export function useSettings(): [Settings, (patch: Partial<Settings>) => Promise<void>] {
  const s = useLiveQuery(getSettings, [], DEFAULT_SETTINGS)
  const update = useCallback(async (patch: Partial<Settings>) => {
    const cur = await getSettings()
    await saveSettings({ ...cur, ...patch })
  }, [])
  return [s, update]
}

export function useProgram(exercise: ExerciseId): ProgramState | undefined {
  return useLiveQuery(async () => (await db.programs.get(exercise)) ?? initialState(exercise), [exercise])
}

export function usePrograms(): ProgramState[] | undefined {
  return useLiveQuery(async () => {
    const all = await db.programs.toArray()
    const map = new Map(all.map((p) => [p.exercise, p]))
    return (['pullup', 'pushup', 'squat'] as ExerciseId[]).map((e) => map.get(e) ?? initialState(e))
  }, [])
}

export function useToast(): [string | null, (m: string | undefined, ms?: number) => void] {
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(null), 3500)
    return () => clearTimeout(t)
  }, [msg])
  return [msg, (m) => m && setMsg(m)]
}

/** 프로그램 권장 휴식 → 사용자 덮어쓰기 → 기본 60초 */
export function resolveRest(settings: Settings, exercise: ExerciseId, planKey: string, programRest: number | null): number {
  const specific = settings.restOverride[`${exercise}:${planKey}`]
  if (specific !== undefined) return specific
  if (programRest !== null) return programRest
  const general = settings.restOverride[exercise]
  if (general !== undefined) return general
  return 60
}
