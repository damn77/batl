// T013: ScoringFormatType enum for match scoring rules

export const ScoringFormatType = {
  SETS: 'SETS',
  STANDARD_TIEBREAK: 'STANDARD_TIEBREAK',
  BIG_TIEBREAK: 'BIG_TIEBREAK',
  MIXED: 'MIXED'
};

export const ScoringFormatTypeLabels = {
  [ScoringFormatType.SETS]: 'Traditional Sets',
  [ScoringFormatType.STANDARD_TIEBREAK]: 'Standard Tiebreak',
  [ScoringFormatType.BIG_TIEBREAK]: 'Big Tiebreak (to 10)',
  [ScoringFormatType.MIXED]: 'Mixed (Sets + Final Set Tiebreak)'
};

export const AdvantageRule = {
  ADVANTAGE: 'ADVANTAGE',
  NO_ADVANTAGE: 'NO_ADVANTAGE'
};

export const TiebreakTrigger = {
  '6-6': '6-6',
  '5-5': '5-5',
  '4-4': '4-4',
  '3-3': '3-3'
};

export function isValidScoringFormatType(value) {
  return Object.values(ScoringFormatType).includes(value);
}

export function isValidAdvantageRule(value) {
  return Object.values(AdvantageRule).includes(value);
}

export function isValidTiebreakTrigger(value) {
  return Object.values(TiebreakTrigger).includes(value);
}

export default ScoringFormatType;
