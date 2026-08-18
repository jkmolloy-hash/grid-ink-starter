/* Draft persistence for the Create page.
   Saves work-in-progress (including the uploaded photo and logo) in the
   browser's IndexedDB, so a customer can leave to sign in or create an
   account — even detour to their email for the verification link — and
   come back to find everything exactly where they left it.
   Every call is failure-proof: if storage is unavailable, the page simply
   behaves as before (no draft). Nothing here can break checkout. */
import type { SchoolPick } from "@/components/SchoolPicker";

export type DraftFile = { blob: Blob; name: string; type: string };

export type Draft = {
  savedAt: number;
  orient: "portrait" | "landscape";
  athlete: string;
  line2: string;
  cityName: string;
  notes: string;
  colorMode: "single" | "two";
  inkArt: string;
  inkText: string;
  school: SchoolPick | null;
  sport: string;
  photo: DraftFile | null;
  logo: DraftFile | null;
  map: { lat: number; lng: number; zoom: number } | null;
};

const DB = "gridink-drafts";
const STORE = "drafts";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // drafts live for a week

function openDb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const rq = indexedDB.open(DB, 1);
    rq.onupgradeneeded = () => rq.result.createObjectStore(STORE);
    rq.onsuccess = () => res(rq.result);
    rq.onerror = () => rej(rq.error);
  });
}

async function run<T>(
  mode: IDBTransactionMode,
  op: (s: IDBObjectStore) => IDBRequest,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((res, rej) => {
    const t = db.transaction(STORE, mode);
    const rq = op(t.objectStore(STORE));
    rq.onsuccess = () => res(rq.result as T);
    rq.onerror = () => rej(rq.error);
    t.oncomplete = () => db.close();
  });
}

export async function saveDraft(key: string, d: Draft): Promise<void> {
  try { await run("readwrite", s => s.put(d, key)); } catch { /* best effort */ }
}

export async function loadDraft(key: string): Promise<Draft | null> {
  try {
    const d = await run<Draft | undefined>("readonly", s => s.get(key));
    if (!d) return null;
    if (Date.now() - d.savedAt > MAX_AGE_MS) { clearDraft(key); return null; }
    return d;
  } catch { return null; }
}

export async function clearDraft(key: string): Promise<void> {
  try { await run("readwrite", s => s.delete(key)); } catch { /* fine */ }
}
