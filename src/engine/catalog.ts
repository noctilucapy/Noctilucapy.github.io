import type { Challenge, Concept, ConceptId } from './types';

/** What the selector needs from the content layer. Keeping it an interface lets the engine be tested with any content. */
export interface Catalog {
  concepts: Concept[];
  authored: Challenge[];
  /** Drill families available for a concept, as stable keys. */
  families(concept: ConceptId): string[];
  /** Builds a drill instance. A different seed always gives different numbers and words. */
  drill(family: string, seed: number): Challenge;
}
