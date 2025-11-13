// T016: Zod schemas for FormatConfig types
import { z } from 'zod';
import { FormatType } from '../types/formatTypes.js';
import { MatchGuaranteeType } from '../types/bracketTypes.js';

// Knockout Format Config
export const KnockoutFormatConfigSchema = z.object({
  formatType: z.literal(FormatType.KNOCKOUT),
  matchGuarantee: z.enum([
    MatchGuaranteeType.MATCH_1,
    MatchGuaranteeType.MATCH_2,
    MatchGuaranteeType.UNTIL_PLACEMENT
  ])
});

// Group Format Config
export const GroupFormatConfigSchema = z.object({
  formatType: z.literal(FormatType.GROUP),
  groupSize: z.number().int().min(2).max(8),
  singleGroup: z.boolean().optional().default(false)
});

// Swiss Format Config
export const SwissFormatConfigSchema = z.object({
  formatType: z.literal(FormatType.SWISS),
  rounds: z.number().int().min(3).max(20)
});

// Combined Format Config
export const CombinedFormatConfigSchema = z.object({
  formatType: z.literal(FormatType.COMBINED),
  groupSize: z.number().int().min(2).max(8),
  advancePerGroup: z.number().int().min(1).max(7),
  // Legacy field - may still be present in old data
  advancementRules: z.array(
    z.object({
      position: z.number().int().min(1),
      bracket: z.enum(['MAIN', 'CONSOLATION', 'PLACEMENT', 'NONE'])
    })
  ).optional()
});

// Union of all format config schemas
export const FormatConfigSchema = z.discriminatedUnion('formatType', [
  KnockoutFormatConfigSchema,
  GroupFormatConfigSchema,
  SwissFormatConfigSchema,
  CombinedFormatConfigSchema
]);

// Helper to validate format config
export function validateFormatConfig(formatType, config) {
  try {
    switch (formatType) {
      case FormatType.KNOCKOUT:
        return KnockoutFormatConfigSchema.parse(config);
      case FormatType.GROUP:
        return GroupFormatConfigSchema.parse(config);
      case FormatType.SWISS:
        return SwissFormatConfigSchema.parse(config);
      case FormatType.COMBINED:
        return CombinedFormatConfigSchema.parse(config);
      default:
        throw new Error(`Invalid format type: ${formatType}`);
    }
  } catch (error) {
    if (error.name === 'ZodError') {
      throw new Error(`Invalid format configuration: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

export default FormatConfigSchema;
