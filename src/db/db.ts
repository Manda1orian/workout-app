import Dexie, { type EntityTable } from 'dexie'
import type { ExerciseId, ProgramState, Session, Settings } from '../types'
import { DEFAULT_SETTINGS } from '../types'

interface KV {
  key: string
  value: unknown
}

export const db = new Dexie('workout-app') as Dexie & {
  sessions: EntityTable<Session, 'id'>
  programs: EntityTable<ProgramState, 'exercise'>
  kv: EntityTable<KV, 'key'>
}

db.version(1).stores({
  sessions: '++id, exercise, date, [exercise+date], [exercise+planKey], completed',
  programs: 'exercise',
  kv: 'key',
})

export async function getSettings(): Promise<Settings> {
  const row = await db.kv.get('settings')
  return { ...DEFAULT_SETTINGS, ...((row?.value as Partial<Settings>) ?? {}) }
}

export async function saveSettings(s: Settings) {
  await db.kv.put({ key: 'settings', value: s })
}

export async function lastCompletedSession(exercise: ExerciseId, planKey?: string) {
  const q = planKey
    ? db.sessions.where('[exercise+planKey]').equals([exercise, planKey])
    : db.sessions.where('exercise').equals(exercise)
  const list = await q.filter((s) => s.completed).sortBy('startedAt')
  return list.at(-1)
}

export interface Backup {
  version: 1
  exportedAt: string
  sessions: Session[]
  programs: ProgramState[]
  settings: Settings
}

export async function exportAll(): Promise<Backup> {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    sessions: await db.sessions.toArray(),
    programs: await db.programs.toArray(),
    settings: await getSettings(),
  }
}

export async function importAll(b: Backup) {
  await db.transaction('rw', db.sessions, db.programs, db.kv, async () => {
    await db.sessions.clear()
    await db.programs.clear()
    await db.sessions.bulkAdd(b.sessions.map(({ id: _id, ...s }) => s as Session))
    await db.programs.bulkPut(b.programs)
    await saveSettings({ ...DEFAULT_SETTINGS, ...b.settings })
  })
}
