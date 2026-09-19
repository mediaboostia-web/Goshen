// Offline write queue — lets the two "saisie du culte" forms (income and
// expense entry) keep working with no network. A mutation that can't reach
// the server is stored locally instead of erroring out; PwaRegister flushes
// the queue the moment the browser reports `online` again. Scoped to plain
// JSON bodies only (no file uploads — receipt photos already need a live
// connection to Cloudinary and are uploaded before this queue ever sees the
// transaction payload).
import { api, ApiError } from '@/lib/api';

const STORAGE_KEY = 'goshen-offline-queue';

export interface QueuedMutation {
  id: string;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body: unknown;
  label: string;
  createdAt: number;
}

function readQueue(): QueuedMutation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QueuedMutation[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedMutation[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Storage full/unavailable — the mutation already submitted this tick
    // stays queued in memory only; nothing further to do here.
  }
}

export function queueMutation(entry: Omit<QueuedMutation, 'id' | 'createdAt'>): QueuedMutation {
  const mutation: QueuedMutation = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };
  writeQueue([...readQueue(), mutation]);
  return mutation;
}

export function getQueuedCount(): number {
  return readQueue().length;
}

// Replays every queued mutation in order. A server rejection (ApiError — the
// request reached the backend and it said no) drops just that one entry,
// since retrying it again would never succeed. A raw network failure means
// we're still offline: stop immediately and keep it plus everything after
// it queued for the next reconnect.
export async function flushOfflineQueue(): Promise<{ synced: number; dropped: number }> {
  const queue = readQueue();
  let synced = 0;
  let dropped = 0;

  for (const [index, mutation] of queue.entries()) {
    try {
      await api(mutation.url, { method: mutation.method, body: mutation.body });
      synced += 1;
    } catch (err) {
      if (err instanceof ApiError) {
        dropped += 1;
        continue;
      }
      writeQueue(queue.slice(index));
      return { synced, dropped };
    }
  }

  writeQueue([]);
  return { synced, dropped };
}
