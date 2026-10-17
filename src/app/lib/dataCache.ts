/**
 * Last-known dataset kept in IndexedDB so the app can render instantly on the
 * next visit (stale-while-revalidate) instead of waiting for the backend —
 * which on Render's free tier can take ~50s to wake up. Fresh data is then
 * pulled incrementally via /api/sync.
 *
 * Everything here is best-effort: private windows, blocked storage or quota
 * errors just mean no cache, never a broken app. The cache is wiped on logout
 * and when the auth token is rejected.
 */
const DB_NAME = 'shardacrm-cache';
const STORE = 'kv';
const KEY = 'snapshot';
const VERSION = 1;

export interface CachedSnapshot<TData = Record<string, unknown[]>, TUser = unknown> {
  v: number;
  userId: string;
  user: TUser;
  /** Server cursor for the next /api/sync?since= */
  serverTime: string;
  savedAt: number;
  data: TData;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(resolve => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return openDb().then(db => new Promise<T | undefined>(resolve => {
    if (!db) return resolve(undefined);
    try {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req ? req.result : undefined);
      tx.onerror = () => resolve(undefined);
      tx.onabort = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  }));
}

export async function readSnapshot<TData, TUser>(): Promise<CachedSnapshot<TData, TUser> | null> {
  const snap = await run<CachedSnapshot<TData, TUser>>('readonly', s => s.get(KEY));
  return snap && snap.v === VERSION ? snap : null;
}

export function writeSnapshot<TData, TUser>(snap: Omit<CachedSnapshot<TData, TUser>, 'v' | 'savedAt'>): Promise<unknown> {
  return run('readwrite', s => s.put({ ...snap, v: VERSION, savedAt: Date.now() }, KEY));
}

export function clearSnapshot(): Promise<unknown> {
  return run('readwrite', s => s.delete(KEY));
}
