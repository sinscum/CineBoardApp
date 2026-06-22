export type ActivityEventKind =
  | "movie-pinned"
  | "movie-cleared"
  | "theme-applied"
  | "theme-created"
  | "theme-deleted"
  | "settings-saved"
  | "display-reset"
  | "display-renamed";

export interface ActivityEvent {
  id: string;            // unique
  ts: number;            // epoch ms
  kind: ActivityEventKind;
  displayId?: number;    // which display, if relevant
  displayName?: string;  // captured at log time
  detail: string;        // human-readable summary
}

const STORAGE_KEY = "cineboard.activity";
const MAX_ENTRIES = 20;
export const ACTIVITY_CHANGED_EVENT = "cineboard-activity-changed";

function generateId(): string {
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadActivity(): ActivityEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (e: any) =>
          e &&
          typeof e.id === "string" &&
          typeof e.ts === "number" &&
          typeof e.kind === "string" &&
          typeof e.detail === "string"
      )
      .slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

export function logActivity(
  kind: ActivityEventKind,
  detail: string,
  displayId?: number,
  displayName?: string
): void {
  try {
    const entries = loadActivity();
    const event: ActivityEvent = {
      id: generateId(),
      ts: Date.now(),
      kind,
      displayId,
      displayName,
      detail: detail.slice(0, 120),
    };
    const next = [event, ...entries].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(ACTIVITY_CHANGED_EVENT));
  } catch {
    // ignore — activity log is best-effort
  }
}

export function clearActivity(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(ACTIVITY_CHANGED_EVENT));
  } catch {
    // ignore
  }
}

/**
 * Format a relative timestamp like "5 min ago" / "2 hr ago" / "just now".
 */
export function formatRelativeTime(ts: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - ts);
  const sec = Math.floor(diff / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day > 1 ? "s" : ""} ago`;
  return new Date(ts).toLocaleDateString();
}

/**
 * Format an absolute timestamp for hover tooltips.
 */
export function formatAbsoluteTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}