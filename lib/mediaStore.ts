/** 업로드한 미디어 파일을 브라우저 IndexedDB에 보관 — 새로 고침 후에도 미리보기·재추출 가능 */

const DB = "bsg-media";
const STORE = "files";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("no indexedDB"));
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
      })
  );
}

export async function saveMedia(id: string, file: Blob): Promise<void> {
  try {
    await tx("readwrite", (s) => s.put(file, id));
  } catch {
    /* 저장 실패는 치명적이지 않음 — 미리보기만 세션 한정이 됨 */
  }
}

export async function loadMedia(id: string): Promise<Blob | null> {
  try {
    const v = await tx<Blob | undefined>("readonly", (s) => s.get(id));
    return v ?? null;
  } catch {
    return null;
  }
}

export async function deleteMedia(id: string): Promise<void> {
  try {
    await tx("readwrite", (s) => s.delete(id));
  } catch {
    /* ignore */
  }
}
