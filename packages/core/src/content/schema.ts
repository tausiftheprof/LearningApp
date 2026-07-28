import { z } from 'zod';
import type { ActivityCategory, AgeBand, MotorSkill } from '../types';

/**
 * Content-pack schema (docs/04 section 4.4, docs/12 section 12.3).
 *
 * Activities are pure data so the CMS can publish/fix content without an app
 * release (PRD section 18). The schema is deliberately incapable of expressing
 * URLs, webviews, chat or free-text prompts: child-reachable content cannot
 * link out or collect input even if a pack is compromised (docs/09 threat model).
 */

export const CONTENT_PACK_FORMAT_VERSION = 1;

const pointSchema = z.object({ x: z.number(), y: z.number() });

// Literal enums (kept in sync with ../types via the satisfies checks below).
const ageBandSchema = z.enum(['2-3', '3-5', '5-7']);
const motorSkillSchema = z.enum([
  'tapping', 'dragging', 'tracing', 'swiping', 'pinching', 'rotating',
  'holding-moving', 'controlled-movement', 'bilateral', 'precision-placement',
]);
const categorySchema = z.enum([
  'drawing', 'colouring', 'puzzles', 'tracing', 'toddler', 'preschool', 'logic',
]);

// Compile-time drift guards: schema enums must match the domain unions exactly.
type _AgeBandCheck = [z.infer<typeof ageBandSchema>] extends [AgeBand]
  ? (AgeBand extends z.infer<typeof ageBandSchema> ? true : never)
  : never;
type _MotorCheck = [z.infer<typeof motorSkillSchema>] extends [MotorSkill]
  ? (MotorSkill extends z.infer<typeof motorSkillSchema> ? true : never)
  : never;
type _CategoryCheck = [z.infer<typeof categorySchema>] extends [ActivityCategory]
  ? (ActivityCategory extends z.infer<typeof categorySchema> ? true : never)
  : never;
const _drift: [_AgeBandCheck, _MotorCheck, _CategoryCheck] = [true, true, true];
void _drift;

/** Asset references resolve inside the pack archive only - never remote at play time. */
const assetRefSchema = z
  .string()
  .regex(/^[a-z0-9\-_/.]+$/i, 'asset refs are pack-relative paths only')
  .refine((s) => !s.includes('..') && !s.includes('://'), 'no traversal or URLs');

const activityBase = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: categorySchema,
  ageBands: z.array(ageBandSchema).min(1),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  motorSkills: z.array(motorSkillSchema).min(1),
  estimatedMinutes: z.number().positive().max(15),
  theme: z.string().min(1),
  /** Locale of instruction audio/labels, e.g. en-AU. */
  locale: z.string().min(2),
  /** Pack-relative path to the spoken instruction audio (PRD section 9). */
  instructionAudio: assetRefSchema,
  /** Optional demonstration animation asset (demo hand). */
  demoAnimation: assetRefSchema.optional(),
  accessibilityNotes: z.string().optional(),
  /** CMS review approval reference - packs built by the CMS always set this (docs/12). */
  reviewApprovalId: z.string().optional(),
});

export const tracingActivitySchema = activityBase.extend({
  type: z.literal('tracing'),
  /** Polyline(s) in a 0..1000 x 0..1000 design space. */
  paths: z.array(z.array(pointSchema).min(2)).min(1),
  closed: z.boolean().default(false),
});

export const colouringActivitySchema = activityBase.extend({
  type: z.literal('colouring'),
  /** Closed polygon regions in design space; `number` supports colour-by-number mode.
   *  Empty for 'line-art' mode, which flood-fills `image` instead. */
  regions: z
    .array(
      z.object({
        id: z.string(),
        polygon: z.array(pointSchema).min(3),
        number: z.number().int().positive().optional(),
      }),
    )
    .default([]),
  mode: z.enum(['free', 'by-number', 'line-art']).default('free'),
  /** Full-page line-art asset (mode 'line-art'): a bold black-outline SVG
   *  that the player flood-fills on tap, rather than authored polygons. */
  image: assetRefSchema.optional(),
  /** Sequenced colour-by-number plan for line-art pages whose numbers are
   *  printed in the artwork itself (owner direction, July 2026): the child is
   *  locked to colour 1 until every region marked 1 is filled, then colour 1
   *  retires and colour 2 activates, and so on. `targets` are one point per
   *  numbered region, as fractions (0..1) of the square artwork. */
  byNumberPlan: z
    .array(
      z.object({
        number: z.number().int().positive(),
        colour: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        targets: z.array(pointSchema).min(1),
      }),
    )
    .optional(),
});

export const jigsawActivitySchema = activityBase.extend({
  type: z.literal('jigsaw'),
  image: assetRefSchema,
  rows: z.number().int().min(1).max(6),
  cols: z.number().int().min(1).max(6),
  rotatingPieces: z.boolean().default(false),
  /** When true, the player picks the grid size (2x2/3x3/4x4) before the board
   *  appears, and that choice overrides `rows`/`cols` for the session -
   *  `rows`/`cols` above just need to be a valid default. */
  sizeSelectable: z.boolean().default(false),
});

/** Small, safe, parameterised game engines implemented in the app (docs/03 S14). */
export const gameTemplateIds = [
  'tap-target',
  'pop-bubbles',
  'drag-sort',
  'match-pairs',
  'memory-cards',
  'odd-one-out',
  'counting',
  'letter-match',
  'sequence',
  'stack-blocks',
  'shadow-match',
  'feed-animal',
  'reveal-wipe',
  'pattern-complete',
  'dot-to-dot',
  'cut-along',
  'number-hop',
] as const;

export const gameActivitySchema = activityBase.extend({
  type: z.literal('game'),
  template: z.enum(gameTemplateIds),
  /** Template parameters: item sets, counts, target values. Strictly typed per template in the app. */
  params: z.record(z.unknown()),
});

export const guidedDrawingActivitySchema = activityBase.extend({
  type: z.literal('guided-drawing'),
  steps: z
    .array(
      z.object({
        prompt: assetRefSchema,
        // Legacy single corridor polyline (whale pilot / free board). New
        // build-a-picture subjects also set the fields below.
        overlay: z.array(pointSchema).min(2),
        /** Short part name shown in the step strip ("Body", "Wheels", …). */
        label: z.string().max(40).optional(),
        /** One or more polylines traced together as this one part (e.g. two feet). */
        strokes: z.array(z.array(pointSchema).min(2)).optional(),
        /** Closed shape filled with the child's colour vs. an open stroked line. */
        fill: z.boolean().optional(),
        /** A part that is NOT child-colourable (wheels, seeds, eyes) — always this colour. */
        fixedColour: z.string().optional(),
      }),
    )
    .min(1),
});

export const activitySchema = z.discriminatedUnion('type', [
  tracingActivitySchema,
  colouringActivitySchema,
  jigsawActivitySchema,
  gameActivitySchema,
  guidedDrawingActivitySchema,
]);

export const contentPackSchema = z.object({
  formatVersion: z.literal(CONTENT_PACK_FORMAT_VERSION),
  packId: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  minAppVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  locales: z.array(z.string()).min(1),
  entitlement: z.enum(['free', 'full_library']),
  activities: z.array(activitySchema).min(1),
});

export type TracingActivity = z.infer<typeof tracingActivitySchema>;
export type ColouringActivity = z.infer<typeof colouringActivitySchema>;
export type JigsawActivity = z.infer<typeof jigsawActivitySchema>;
export type GameActivity = z.infer<typeof gameActivitySchema>;
export type GuidedDrawingActivity = z.infer<typeof guidedDrawingActivitySchema>;
export type Activity = z.infer<typeof activitySchema>;
export type ContentPack = z.infer<typeof contentPackSchema>;

export interface PackValidationResult {
  ok: boolean;
  pack?: ContentPack;
  errors: string[];
}

/** Validate an untrusted pack manifest. The app refuses packs that fail (docs/09). */
export function validateContentPack(data: unknown): PackValidationResult {
  const parsed = contentPackSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
  }
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const a of parsed.data.activities) {
    if (ids.has(a.id)) errors.push(`duplicate activity id: ${a.id}`);
    ids.add(a.id);
    if (a.type === 'colouring') {
      if (a.mode === 'line-art' && !a.image) errors.push(`${a.id}: line-art colouring needs an image`);
      if (a.mode !== 'line-art' && a.regions.length === 0) errors.push(`${a.id}: colouring needs at least one region`);
    }
  }
  return errors.length > 0
    ? { ok: false, errors }
    : { ok: true, pack: parsed.data, errors: [] };
}
