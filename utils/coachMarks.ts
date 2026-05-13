import { api } from '../services/api';

const LS_KEY = 'coach_marks_seen';

// In-memory set — seeded from localStorage on first load, synced from DB
let seenMarks: Set<string> | null = null;
let loadPromise: Promise<void> | null = null;

function readFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeToStorage(ids: string[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

/**
 * Idempotent — safe to call on every page mount.
 * Seeds from localStorage immediately; then syncs from DB (once per page session).
 */
export async function loadSeenMarks(): Promise<void> {
  if (seenMarks !== null) return; // already loaded
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    // Seed instantly from localStorage so isMarkSeen() is usable right away
    seenMarks = new Set(readFromStorage());

    try {
      const dbIds = await api.users.getCoachMarksSeen();
      // Merge DB + local (DB is source of truth)
      const merged = Array.from(new Set([...dbIds, ...Array.from(seenMarks)]));
      seenMarks = new Set(merged);
      writeToStorage(merged);
    } catch {
      // DB call failed — keep using localStorage values; marks stay invisible (safe default)
    }
  })();

  return loadPromise;
}

/** Returns true if the mark has been seen (optimistic — uses in-memory set). */
export function isMarkSeen(id: string): boolean {
  if (!seenMarks) return true; // not loaded yet → hide to prevent flash
  return seenMarks.has(id);
}

/**
 * Marks an ID as seen: updates in-memory set + localStorage synchronously,
 * then fires the DB update in the background (fire-and-forget).
 */
export async function dismissMark(id: string): Promise<void> {
  if (!seenMarks) seenMarks = new Set();
  if (seenMarks.has(id)) return;

  seenMarks.add(id);
  writeToStorage(Array.from(seenMarks));

  // Fire-and-forget DB sync
  api.users.dismissCoachMark(id).catch(() => {/* ignore */});
}

/** Resets all state — used in tests or when signing out. */
export function resetCoachMarks() {
  seenMarks = null;
  loadPromise = null;
}
