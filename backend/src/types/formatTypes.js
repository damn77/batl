// T012: FormatType enum for tournament formats

export const FormatType = {
  KNOCKOUT: 'KNOCKOUT',
  GROUP: 'GROUP',
  SWISS: 'SWISS',
  COMBINED: 'COMBINED'
};

export const FormatTypeLabels = {
  [FormatType.KNOCKOUT]: 'Knockout',
  [FormatType.GROUP]: 'Group Stage',
  [FormatType.SWISS]: 'Swiss System',
  [FormatType.COMBINED]: 'Combined (Group + Knockout)'
};

export const FormatTypeDescriptions = {
  [FormatType.KNOCKOUT]: 'Single or double elimination bracket format',
  [FormatType.GROUP]: 'Round-robin groups where all players face each other',
  [FormatType.SWISS]: 'Swiss system pairing where players are matched based on current standings',
  [FormatType.COMBINED]: 'Group stage followed by knockout bracket for top finishers'
};

export function isValidFormatType(value) {
  return Object.values(FormatType).includes(value);
}

export default FormatType;
