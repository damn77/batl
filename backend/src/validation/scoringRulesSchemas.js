// T017: Zod schemas for ScoringRules types
import { z } from 'zod';
import { ScoringFormatType, AdvantageRule, TiebreakTrigger } from '../types/scoringTypes.js';

// Base schema for common fields
const BaseScoringSchema = z.object({
  formatType: z.enum([
    ScoringFormatType.SETS,
    ScoringFormatType.STANDARD_TIEBREAK,
    ScoringFormatType.BIG_TIEBREAK,
    ScoringFormatType.MIXED
  ])
});

// Sets Format Schema
export const SetsFormatSchema = BaseScoringSchema.extend({
  formatType: z.literal(ScoringFormatType.SETS),
  winningSets: z.union([z.literal(1), z.literal(2)]),
  advantageRule: z.enum([AdvantageRule.ADVANTAGE, AdvantageRule.NO_ADVANTAGE]),
  tiebreakTrigger: z.enum([
    TiebreakTrigger['6-6'],
    TiebreakTrigger['5-5'],
    TiebreakTrigger['4-4'],
    TiebreakTrigger['3-3']
  ])
});

// Standard Tiebreak Format Schema
export const StandardTiebreakFormatSchema = BaseScoringSchema.extend({
  formatType: z.literal(ScoringFormatType.STANDARD_TIEBREAK),
  winningTiebreaks: z.union([z.literal(1), z.literal(2), z.literal(3)])
});

// Big Tiebreak Format Schema
export const BigTiebreakFormatSchema = BaseScoringSchema.extend({
  formatType: z.literal(ScoringFormatType.BIG_TIEBREAK),
  winningTiebreaks: z.union([z.literal(1), z.literal(2)])
});

// Mixed Format Schema
export const MixedFormatSchema = BaseScoringSchema.extend({
  formatType: z.literal(ScoringFormatType.MIXED),
  winningSets: z.union([z.literal(1), z.literal(2)]),
  advantageRule: z.enum([AdvantageRule.ADVANTAGE, AdvantageRule.NO_ADVANTAGE]),
  tiebreakTrigger: z.enum([
    TiebreakTrigger['6-6'],
    TiebreakTrigger['5-5'],
    TiebreakTrigger['4-4'],
    TiebreakTrigger['3-3']
  ]),
  finalSetTiebreak: z.enum(['STANDARD', 'BIG'])
});

// Partial schema for rule overrides (all fields optional)
export const ScoringRulesOverrideSchema = z.object({
  formatType: z.enum([
    ScoringFormatType.SETS,
    ScoringFormatType.STANDARD_TIEBREAK,
    ScoringFormatType.BIG_TIEBREAK,
    ScoringFormatType.MIXED
  ]).optional(),
  winningSets: z.union([z.literal(1), z.literal(2)]).optional(),
  winningTiebreaks: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  advantageRule: z.enum([AdvantageRule.ADVANTAGE, AdvantageRule.NO_ADVANTAGE]).optional(),
  tiebreakTrigger: z.enum([
    TiebreakTrigger['6-6'],
    TiebreakTrigger['5-5'],
    TiebreakTrigger['4-4'],
    TiebreakTrigger['3-3']
  ]).optional(),
  finalSetTiebreak: z.enum(['STANDARD', 'BIG']).optional()
});

// Union of all scoring rules schemas
export const ScoringRulesSchema = z.discriminatedUnion('formatType', [
  SetsFormatSchema,
  StandardTiebreakFormatSchema,
  BigTiebreakFormatSchema,
  MixedFormatSchema
]);

// Helper to validate scoring rules
export function validateScoringRules(rules) {
  try {
    return ScoringRulesSchema.parse(rules);
  } catch (error) {
    // Handle Zod validation errors
    if (error.name === 'ZodError' && error.issues && Array.isArray(error.issues)) {
      const messages = error.issues.map(issue => {
        const path = issue.path.join('.');
        return path ? `${path}: ${issue.message}` : issue.message;
      }).join(', ');
      throw new Error(`Invalid scoring rules: ${messages}`);
    }
    // Fallback for other Zod errors
    if (error.name === 'ZodError') {
      throw new Error(`Invalid scoring rules: ${error.message || 'Validation failed'}`);
    }
    throw error;
  }
}

// Helper to validate rule overrides (partial update)
export function validateScoringRulesOverride(overrides) {
  try {
    return ScoringRulesOverrideSchema.parse(overrides);
  } catch (error) {
    // Handle Zod validation errors
    if (error.name === 'ZodError' && error.issues && Array.isArray(error.issues)) {
      const messages = error.issues.map(issue => {
        const path = issue.path.join('.');
        return path ? `${path}: ${issue.message}` : issue.message;
      }).join(', ');
      throw new Error(`Invalid rule overrides: ${messages}`);
    }
    // Fallback for other Zod errors
    if (error.name === 'ZodError') {
      throw new Error(`Invalid rule overrides: ${error.message || 'Validation failed'}`);
    }
    throw error;
  }
}

export default ScoringRulesSchema;
