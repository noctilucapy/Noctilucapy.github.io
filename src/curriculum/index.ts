import type { Challenge } from '../engine/types';
import type { Catalog } from '../engine/catalog';
import { CONCEPTS } from './concepts';
import { drill, drillFamilies } from './drills';
import { OPENERS } from './openers';
import { ALGO_A } from './algoA';
import { ALGO_B } from './algoB';
import { THEORY } from './theory';
import { TRACES } from './trace';
import { DEBUGS } from './debug';
import baked from './baked.json';

const BAKED = baked as Record<string, string>;

/** Every hand-written challenge. Expected output is pre-computed by `npm run verify`, so the browser never has to run the answer key. */
export const AUTHORED: Challenge[] = [...OPENERS, ...ALGO_A, ...ALGO_B, ...THEORY, ...TRACES, ...DEBUGS].map((c) => (BAKED[c.id] !== undefined ? { ...c, expected: BAKED[c.id] } : c));

const byId = new Map(AUTHORED.map((c) => [c.id, c]));

export const catalog: Catalog = { concepts: CONCEPTS, authored: AUTHORED, families: drillFamilies, drill };

/** Resolves any id the app has handed out. Drill ids carry their own seed, so they can always be rebuilt. */
export function challengeById(id: string): Challenge | null {
  const a = byId.get(id);
  if (a) return a;
  const m = /^d:(\d+):(\d+):(\d+)$/.exec(id);
  return m ? drill(`d:${m[1]}:${m[2]}`, Number(m[3])) : null;
}
