// T019-T021: Tournament View Service - API calls and SWR hooks for tournament view page
import useSWR from 'swr';
import apiClient from './apiClient';
import i18n from '../i18n';

/**
 * T019: Get tournament by ID with full details (enhanced endpoint)
 * Includes registrationCount, waitlistCount, ruleComplexity
 * @param {string} id - Tournament UUID
 * @returns {Promise} Tournament object with all related data
 */
export const getTournamentById = async (id) => {
  const response = await apiClient.get(`/v1/tournaments/${id}`);
  return response.data.data;
};

/**
 * Get tournament format structure (groups/brackets/rounds)
 * @param {string} id - Tournament UUID
 * @returns {Promise} Format structure based on tournament type
 */
export const getFormatStructure = async (id) => {
  const response = await apiClient.get(`/v1/tournaments/${id}/format-structure`);
  return response.data.data;
};

/**
 * Get tournament matches with optional filters
 * @param {string} id - Tournament UUID
 * @param {Object} filters - Optional filters { groupId, bracketId, roundId, status }
 * @returns {Promise} Array of matches with player details
 */
export const getMatches = async (id, filters = {}) => {
  const params = new URLSearchParams();

  if (filters.groupId) params.append('groupId', filters.groupId);
  if (filters.bracketId) params.append('bracketId', filters.bracketId);
  if (filters.roundId) params.append('roundId', filters.roundId);
  if (filters.status) params.append('status', filters.status);

  const query = params.toString();
  const url = query ? `/v1/tournaments/${id}/matches?${query}` : `/v1/tournaments/${id}/matches`;

  const response = await apiClient.get(url);
  return response.data.data.matches;
};

/**
 * T020: Get format type display information
 * Maps format type enum to human-readable labels and descriptions
 * @param {string} formatType - KNOCKOUT, GROUP, SWISS, or COMBINED
 * @param {Object} formatConfig - Format configuration JSON
 * @returns {Object} { label, description, icon }
 */
export const getFormatTypeInfo = (formatType, formatConfig = {}) => {
  const formatInfo = {
    KNOCKOUT: {
      label: i18n.t('tournament.formats.knockout'),
      icon: '🏆',
      getDescription: (config) => {
        if (!config?.matchGuarantee) return i18n.t('tournament.formats.singleElimination');
        const guarantees = {
          MATCH_1: i18n.t('tournament.formats.matchGuarantee1'),
          MATCH_2: i18n.t('tournament.formats.matchGuarantee2'),
          UNTIL_PLACEMENT: i18n.t('tournament.formats.playUntilPlacement')
        };
        return guarantees[config.matchGuarantee] || i18n.t('tournament.formats.knockout');
      }
    },
    GROUP: {
      label: i18n.t('tournament.formats.group'),
      icon: '👥',
      getDescription: (config) => {
        if (!config?.groupSize) return i18n.t('tournament.formats.group');
        return i18n.t('tournament.formats.groupsOf', { size: config.groupSize });
      }
    },
    SWISS: {
      label: i18n.t('tournament.formats.swiss'),
      icon: '♟️',
      getDescription: (config) => {
        if (!config?.rounds) return i18n.t('tournament.formats.swiss');
        return i18n.t('tournament.formats.rounds', { count: config.rounds });
      }
    },
    COMBINED: {
      label: i18n.t('tournament.formats.combined'),
      icon: '🎯',
      getDescription: (config) => {
        if (!config?.groupSize || !config?.advancePerGroup) {
          return `${i18n.t('tournament.formats.group')} + ${i18n.t('tournament.formats.knockout')}`;
        }
        return i18n.t('tournament.formats.topAdvance', {
          size: config.groupSize,
          advance: config.advancePerGroup
        });
      }
    }
  };

  const info = formatInfo[formatType] || {
    label: formatType,
    icon: '❓',
    getDescription: () => formatType
  };

  return {
    label: info.label,
    icon: info.icon,
    description: info.getDescription(formatConfig)
  };
};

/**
 * T020: Get status badge variant for Bootstrap badges
 * @param {string} status - SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
 * @returns {string} Bootstrap badge variant (primary, success, warning, secondary)
 */
export const getStatusBadgeVariant = (status) => {
  const variants = {
    SCHEDULED: 'primary',
    IN_PROGRESS: 'success',
    COMPLETED: 'secondary',
    CANCELLED: 'danger'
  };
  return variants[status] || 'secondary';
};

/**
 * T020: Get rule complexity badge variant and label
 * @param {string} complexity - DEFAULT, MODIFIED, SPECIFIC
 * @returns {Object} { variant, label, icon, description }
 */
export const getRuleComplexityInfo = (complexity) => {
  const complexityInfo = {
    DEFAULT: {
      variant: 'success',
      label: i18n.t('tournament.complexity.standard'),
      icon: '🟢',
      description: i18n.t('tournament.complexity.standardDesc')
    },
    MODIFIED: {
      variant: 'warning',
      label: i18n.t('tournament.complexity.modified'),
      icon: '🟡',
      description: i18n.t('tournament.complexity.modifiedDesc')
    },
    SPECIFIC: {
      variant: 'danger',
      label: i18n.t('tournament.complexity.complex'),
      icon: '🔴',
      description: i18n.t('tournament.complexity.complexDesc')
    }
  };

  return complexityInfo[complexity] || {
    variant: 'secondary',
    label: complexity,
    icon: '⚪',
    description: 'Unknown complexity'
  };
};

/**
 * T021: SWR hook for tournament data
 * Automatically fetches and caches tournament data with revalidation
 * @param {string} id - Tournament UUID
 * @returns {Object} { data, error, isLoading, mutate }
 */
export const useTournament = (id) => {
  const { data, error, mutate } = useSWR(
    id ? `/tournaments/${id}` : null,
    () => getTournamentById(id),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 30000 // 30 seconds
    }
  );

  return {
    tournament: data,
    isLoading: !error && !data,
    isError: error,
    mutate
  };
};

/**
 * SWR hook for tournament format structure
 * Lazy-loaded when user expands format visualization
 * @param {string} id - Tournament UUID
 * @param {boolean} shouldFetch - Only fetch when true
 * @returns {Object} { data, error, isLoading, mutate }
 */
export const useFormatStructure = (id, shouldFetch = false) => {
  const { data, error, mutate } = useSWR(
    id && shouldFetch ? `/tournaments/${id}/format-structure` : null,
    () => getFormatStructure(id),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000 // 5 minutes (structure rarely changes)
    }
  );

  return {
    structure: data,
    isLoading: !error && !data && shouldFetch,
    isError: error,
    mutate
  };
};

/**
 * SWR hook for tournament matches
 * Lazy-loaded when user expands a specific group/bracket
 * @param {string} id - Tournament UUID
 * @param {Object} filters - Optional filters { groupId, bracketId, roundId, status }
 * @param {boolean} shouldFetch - Only fetch when true
 * @returns {Object} { data, error, isLoading, mutate }
 */
export const useMatches = (id, filters = {}, shouldFetch = false) => {
  const filterKey = JSON.stringify(filters);

  const { data, error, mutate } = useSWR(
    id && shouldFetch ? `/tournaments/${id}/matches?${filterKey}` : null,
    () => getMatches(id, filters),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 30000 // 30 seconds
    }
  );

  return {
    matches: data,
    isLoading: !error && !data && shouldFetch,
    isError: error,
    mutate
  };
};

/**
 * T046: Parse formatConfig JSON to human-readable format
 * Handles KNOCKOUT, GROUP, SWISS, and COMBINED format types
 * @param {string} formatType - KNOCKOUT, GROUP, SWISS, or COMBINED
 * @param {Object} formatConfig - Format configuration JSON
 * @returns {Array} Array of { label, value } pairs for display
 */
export const parseFormatConfig = (formatType, formatConfig) => {
  if (!formatConfig || typeof formatConfig !== 'object') {
    return [{ label: 'Configuration', value: 'Not configured' }];
  }

  const fields = [];

  switch (formatType) {
    case 'KNOCKOUT':
      if (formatConfig.matchGuarantee) {
        const guarantees = {
          MATCH_1: 'Single Elimination (1 match guaranteed)',
          MATCH_2: 'Double Elimination (2 matches guaranteed)',
          UNTIL_PLACEMENT: 'Play until placement'
        };
        fields.push({
          label: 'Match Guarantee',
          value: guarantees[formatConfig.matchGuarantee] || formatConfig.matchGuarantee
        });
      }
      break;

    case 'GROUP':
      if (formatConfig.groupSize) {
        fields.push({
          label: 'Group Size',
          value: `${formatConfig.groupSize} players per group`
        });
      }
      if (formatConfig.singleGroup !== undefined) {
        fields.push({
          label: 'Single Group',
          value: formatConfig.singleGroup ? 'Yes' : 'No (Multiple groups)'
        });
      }
      break;

    case 'SWISS':
      if (formatConfig.rounds) {
        fields.push({
          label: 'Number of Rounds',
          value: `${formatConfig.rounds} rounds`
        });
      }
      break;

    case 'COMBINED':
      if (formatConfig.groupSize) {
        fields.push({
          label: 'Group Size',
          value: `${formatConfig.groupSize} players per group`
        });
      }
      if (formatConfig.advancePerGroup) {
        fields.push({
          label: 'Advancement',
          value: `Top ${formatConfig.advancePerGroup} advance from each group`
        });
      }
      if (formatConfig.knockoutFormat) {
        const knockoutFormats = {
          SINGLE_ELIMINATION: 'Single Elimination',
          DOUBLE_ELIMINATION: 'Double Elimination'
        };
        fields.push({
          label: 'Knockout Format',
          value: knockoutFormats[formatConfig.knockoutFormat] || formatConfig.knockoutFormat
        });
      }
      break;

    default:
      fields.push({
        label: 'Format Type',
        value: formatType
      });
  }

  return fields.length > 0 ? fields : [{ label: 'Configuration', value: 'Default settings' }];
};

/**
 * T047: Parse scoringRules JSON to human-readable format
 * Converts scoring rules configuration to display-friendly text
 * @param {Object} scoringRules - Scoring rules JSON
 * @returns {Array} Array of { label, value } pairs for display
 */
export const parseScoringRules = (scoringRules) => {
  if (!scoringRules || typeof scoringRules !== 'object') {
    return [{ label: 'Scoring Rules', value: 'Not configured' }];
  }

  const fields = [];

  // Scoring Format
  if (scoringRules.scoringFormat) {
    const formats = {
      BEST_OF_3: 'Best of 3 sets',
      BEST_OF_5: 'Best of 5 sets',
      SINGLE_SET: 'Single set',
      MATCH_TIEBREAK: 'Match tiebreak (10 points)'
    };
    fields.push({
      label: 'Match Format',
      value: formats[scoringRules.scoringFormat] || scoringRules.scoringFormat
    });
  }

  // Winning Sets/Games
  if (scoringRules.winningSets) {
    fields.push({
      label: 'Sets to Win',
      value: scoringRules.winningSets
    });
  }

  if (scoringRules.winningGames) {
    fields.push({
      label: 'Games to Win Set',
      value: scoringRules.winningGames
    });
  }

  // Advantage Rule
  if (scoringRules.advantageRule) {
    const advantageRules = {
      ADVANTAGE: 'Deuce/Advantage (traditional)',
      GOLDEN_BALL: 'Golden Ball (sudden death at deuce)',
      NO_AD: 'No-Ad (deciding point at deuce)'
    };
    fields.push({
      label: 'Deuce Rule',
      value: advantageRules[scoringRules.advantageRule] || scoringRules.advantageRule
    });
  }

  // Tiebreak Trigger
  if (scoringRules.tiebreakTrigger) {
    const triggers = {
      '6_6': 'Tiebreak at 6-6',
      '5_5': 'Tiebreak at 5-5',
      '4_4': 'Tiebreak at 4-4',
      '3_3': 'Tiebreak at 3-3',
      NONE: 'No tiebreak (play to 2-game advantage)'
    };
    fields.push({
      label: 'Tiebreak Trigger',
      value: triggers[scoringRules.tiebreakTrigger] || scoringRules.tiebreakTrigger
    });
  }

  // Match Tiebreak Points (for final set)
  if (scoringRules.matchTiebreakPoints) {
    fields.push({
      label: 'Match Tiebreak',
      value: `First to ${scoringRules.matchTiebreakPoints} points (2-point advantage)`
    });
  }

  // Final Set Rule
  if (scoringRules.finalSetTiebreak !== undefined) {
    fields.push({
      label: 'Final Set',
      value: scoringRules.finalSetTiebreak ? 'Tiebreak' : 'No tiebreak (play to 2-game advantage)'
    });
  }

  // Additional fields
  if (scoringRules.warmupMinutes) {
    fields.push({
      label: 'Warmup Time',
      value: `${scoringRules.warmupMinutes} minutes`
    });
  }

  if (scoringRules.changeoverSeconds) {
    fields.push({
      label: 'Changeover Time',
      value: `${scoringRules.changeoverSeconds} seconds`
    });
  }

  return fields.length > 0 ? fields : [{ label: 'Scoring Rules', value: 'Standard tennis scoring' }];
};
