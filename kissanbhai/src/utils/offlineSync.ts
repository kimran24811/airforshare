import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, Timestamp, getDocs, query, where,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const K = {
  transactions: 'kb_transactions',
  customers:    'kb_customers',
  categories:   'kb_categories',
  payments:     'kb_payments',
  pending:      'kb_pending',
};

// ─── Serialisation ────────────────────────────────────────────────────────────

function ser(v: any): any {
  if (v === null || v === undefined) return v;
  if (v && typeof v.toDate === 'function')
    return { __ts: v.seconds, __ns: v.nanoseconds ?? 0 };
  if (Array.isArray(v)) return v.map(ser);
  if (typeof v === 'object') {
    const o: any = {};
    for (const k of Object.keys(v)) o[k] = ser(v[k]);
    return o;
  }
  return v;
}

// Deserialise for React state — gives objects with toDate()
function deser(v: any): any {
  if (v === null || v === undefined) return v;
  if (typeof v === 'object' && '__ts' in v) {
    const ms = v.__ts * 1000 + (v.__ns ?? 0) / 1e6;
    return { seconds: v.__ts, nanoseconds: v.__ns ?? 0, toDate: () => new Date(ms) };
  }
  if (Array.isArray(v)) return v.map(deser);
  if (typeof v === 'object') {
    const o: any = {};
    for (const k of Object.keys(v)) o[k] = deser(v[k]);
    return o;
  }
  return v;
}

// Deserialise for Firestore writes — gives real Timestamp objects
function deserForFirestore(v: any): any {
  if (v === null || v === undefined) return v;
  if (typeof v === 'object' && '__ts' in v)
    return new Timestamp(v.__ts, v.__ns ?? 0);
  if (Array.isArray(v)) return v.map(deserForFirestore);
  if (typeof v === 'object') {
    const o: any = {};
    for (const k of Object.keys(v)) o[k] = deserForFirestore(v[k]);
    return o;
  }
  return v;
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

export async function saveCache(key: keyof typeof K, data: any[]) {
  try { await AsyncStorage.setItem(K[key], JSON.stringify(ser(data))); } catch (_) {}
}

export async function loadCache<T>(key: keyof typeof K): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(K[key]);
    if (!raw) return [];
    return deser(JSON.parse(raw)) as T[];
  } catch (_) { return []; }
}

// ─── Pending write queue ──────────────────────────────────────────────────────

export type PendingWrite = {
  id: string;
  type: 'add' | 'update' | 'delete';
  col: string;
  docId?: string;
  tmpId?: string;
  data?: any;
};

async function getQueue(): Promise<PendingWrite[]> {
  try {
    const raw = await AsyncStorage.getItem(K.pending);
    return raw ? JSON.parse(raw) : [];
  } catch (_) { return []; }
}

async function saveQueue(q: PendingWrite[]) {
  try { await AsyncStorage.setItem(K.pending, JSON.stringify(q)); } catch (_) {}
}

export async function getPendingCount(): Promise<number> {
  return (await getQueue()).length;
}

// Updates/deletes that target a doc created offline (tmp_ id) can never reach
// Firestore under that id — fold them into the queued add instead.
export async function enqueue(write: Omit<PendingWrite, 'id'>): Promise<number> {
  const q = await getQueue();
  // Timestamps must survive the JSON round-trip in AsyncStorage — store them
  // in the __ts format that deserForFirestore understands.
  const data = write.data ? ser(write.data) : undefined;
  if (write.type !== 'add' && write.docId?.startsWith('tmp_')) {
    const addIdx = q.findIndex(op => op.type === 'add' && op.col === write.col && op.tmpId === write.docId);
    if (addIdx !== -1) {
      if (write.type === 'update') q[addIdx].data = { ...q[addIdx].data, ...data };
      else q.splice(addIdx, 1); // delete cancels the pending add
    }
  } else {
    q.push({ id: `${Date.now()}_${Math.random().toString(36).slice(2)}`, ...write, data });
  }
  await saveQueue(q);
  return q.length;
}

let flushing = false;

export async function flushPendingWrites(): Promise<number> {
  if (flushing) return getPendingCount();
  flushing = true;
  try {
    return await flushQueue();
  } finally {
    flushing = false;
  }
}

async function flushQueue(): Promise<number> {
  const q = await getQueue();
  if (!q.length) return 0;

  const failed: PendingWrite[] = [];
  for (const op of q) {
    // Leftover op against a doc that only ever existed locally — unrecoverable, drop it
    if (op.type !== 'add' && op.docId?.startsWith('tmp_')) continue;
    try {
      const data = op.data ? deserForFirestore(op.data) : undefined;

      if (op.type === 'add') {
        // If transaction has a temp customer id, resolve by name first
        if (op.col === 'transactions' && data?.customerId?.startsWith('tmp_')) {
          const snap = await getDocs(
            query(collection(db, 'customers'), where('name', '==', data.customerName)),
          );
          if (!snap.empty) data.customerId = snap.docs[0].id;
          else {
            const ref = await addDoc(collection(db, 'customers'), {
              name: data.customerName, phone: '', createdAt: Timestamp.now(),
            });
            data.customerId = ref.id;
          }
        }
        await addDoc(collection(db, op.col), data);
      } else if (op.type === 'update' && op.docId) {
        await updateDoc(doc(db, op.col, op.docId), data);
      } else if (op.type === 'delete' && op.docId) {
        await deleteDoc(doc(db, op.col, op.docId));
      }
    } catch (_) {
      failed.push(op);
    }
  }
  await saveQueue(failed);
  return failed.length;
}
