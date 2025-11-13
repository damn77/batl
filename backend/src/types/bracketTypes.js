// T015: BracketType and MatchGuaranteeType enums

export const BracketType = {
  MAIN: 'MAIN',
  CONSOLATION: 'CONSOLATION',
  PLACEMENT: 'PLACEMENT'
};

export const BracketTypeLabels = {
  [BracketType.MAIN]: 'Main Bracket',
  [BracketType.CONSOLATION]: 'Consolation Bracket',
  [BracketType.PLACEMENT]: 'Placement Bracket'
};

export const BracketTypeDescriptions = {
  [BracketType.MAIN]: 'Primary bracket for winners',
  [BracketType.CONSOLATION]: 'Bracket for first-match losers (for 2-match guarantee)',
  [BracketType.PLACEMENT]: 'Brackets for final placement identified by range (e.g. 4-8)'
};

export const MatchGuaranteeType = {
  MATCH_1: 'MATCH_1',
  MATCH_2: 'MATCH_2',
  UNTIL_PLACEMENT: 'UNTIL_PLACEMENT'
};

export const MatchGuaranteeTypeLabels = {
  [MatchGuaranteeType.MATCH_1]: '1 Match Guarantee',
  [MatchGuaranteeType.MATCH_2]: '2 Match Guarantee',
  [MatchGuaranteeType.UNTIL_PLACEMENT]: 'Until Placement'
};

export const MatchGuaranteeTypeDescriptions = {
  [MatchGuaranteeType.MATCH_1]: 'Single elimination - players play 1 match',
  [MatchGuaranteeType.MATCH_2]: 'Double elimination - players guaranteed 2 matches',
  [MatchGuaranteeType.UNTIL_PLACEMENT]: 'Players continue until final placement is determined'
};

export function isValidBracketType(value) {
  return Object.values(BracketType).includes(value);
}

export function isValidMatchGuaranteeType(value) {
  return Object.values(MatchGuaranteeType).includes(value);
}

export default { BracketType, MatchGuaranteeType };
