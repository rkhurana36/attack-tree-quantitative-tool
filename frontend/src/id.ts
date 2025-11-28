// id.ts
import { nanoid } from 'nanoid';

export function newId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return nanoid(); // npm i nanoid
}

export function newEdgeId(source: string, target: string) {
  // readable + unique enough
  const suffix = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID().slice(0, 8)
    : nanoid(8);
  return `e_${source.slice(0,6)}_${target.slice(0,6)}_${suffix}`;
}
