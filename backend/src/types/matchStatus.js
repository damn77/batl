// T014: MatchStatus enum for match lifecycle

export const MatchStatus = {
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

export const MatchStatusLabels = {
  [MatchStatus.SCHEDULED]: 'Scheduled',
  [MatchStatus.IN_PROGRESS]: 'In Progress',
  [MatchStatus.COMPLETED]: 'Completed',
  [MatchStatus.CANCELLED]: 'Cancelled'
};

export function isValidMatchStatus(value) {
  return Object.values(MatchStatus).includes(value);
}

export function canTransitionTo(currentStatus, newStatus) {
  const transitions = {
    [MatchStatus.SCHEDULED]: [MatchStatus.IN_PROGRESS, MatchStatus.CANCELLED],
    [MatchStatus.IN_PROGRESS]: [MatchStatus.COMPLETED, MatchStatus.CANCELLED],
    [MatchStatus.COMPLETED]: [], // Completed is terminal
    [MatchStatus.CANCELLED]: []  // Cancelled is terminal
  };

  return transitions[currentStatus]?.includes(newStatus) || false;
}

export default MatchStatus;
