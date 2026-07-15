import { z } from 'zod';
import { ALL_ECOSYSTEM_IDS } from '../types/ecosystem-plugin.js';

const ecosystemIdSchema = z.enum(ALL_ECOSYSTEM_IDS);

const licenseListsSchema = z
  .object({
    ok: z.array(z.string()).optional(),
    warning: z.array(z.string()).optional(),
    critical: z.array(z.string()).optional(),
  })
  .default({});

/**
 * This file only holds the two things that genuinely need a structured, versioned file rather
 * than a workflow input: which license id goes in which bucket, and which ecosystems to scan.
 * Run behavior (severity filter, fail-on threshold, whether to comment, caching) is controlled
 * by the Action's own inputs in action.yml instead, so there is exactly one place to look for
 * each kind of setting.
 */
export const configSchema = z.object({
  version: z.literal(1).default(1),
  // Anything not listed here is scanned automatically; this is only for disabling one.
  ecosystems: z.partialRecord(ecosystemIdSchema, z.boolean()).default({}),
  licenses: licenseListsSchema,
});

export type ResolvedConfig = z.infer<typeof configSchema>;
