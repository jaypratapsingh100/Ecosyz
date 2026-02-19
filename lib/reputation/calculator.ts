/**
 * Reputation Score Calculator
 * 
 * Calculates user reputation based on various contribution factors.
 * This follows a weighted scoring system where different activities
 * contribute different amounts to the overall reputation score.
 */

export interface ReputationFactors {
  projectsCreated: number;
  resourcesShared: number;
  discussionsStarted: number;
  discussionsReplied: number;
  groupsCreated: number;
  eventsCreated: number;
  challengesCreated: number;
  upvotesReceived: number;
  acceptedAnswers: number;
  followersCount: number;
  daysActive: number;
}

export interface ReputationWeights {
  projectCreation: number;
  resourceSharing: number;
  discussionStarting: number;
  discussionReplying: number;
  groupCreation: number;
  eventCreation: number;
  challengeCreation: number;
  upvotes: number;
  acceptedAnswers: number;
  followers: number;
  activityBonus: number;
}

// Default weights for reputation calculation
export const DEFAULT_REPUTATION_WEIGHTS: ReputationWeights = {
  projectCreation: 10,      // Creating a project is valuable
  resourceSharing: 5,        // Sharing resources helps community
  discussionStarting: 8,     // Starting discussions drives engagement
  discussionReplying: 3,     // Replying to discussions is helpful
  groupCreation: 15,        // Creating groups builds community
  eventCreation: 12,        // Creating events is highly valuable
  challengeCreation: 20,    // Creating challenges drives innovation
  upvotes: 1,               // Each upvote received
  acceptedAnswers: 5,        // Having answer accepted as best
  followers: 0.5,           // Each follower (network effect)
  activityBonus: 0.1,       // Bonus per day active
};

/**
 * Calculate reputation score based on user activities
 */
export function calculateReputationScore(
  factors: ReputationFactors,
  weights: ReputationWeights = DEFAULT_REPUTATION_WEIGHTS
): number {
  let score = 0;

  // Contribution-based scoring
  score += factors.projectsCreated * weights.projectCreation;
  score += factors.resourcesShared * weights.resourceSharing;
  score += factors.discussionsStarted * weights.discussionStarting;
  score += factors.discussionsReplied * weights.discussionReplying;
  score += factors.groupsCreated * weights.groupCreation;
  score += factors.eventsCreated * weights.eventCreation;
  score += factors.challengesCreated * weights.challengeCreation;

  // Quality-based scoring (community recognition)
  score += factors.upvotesReceived * weights.upvotes;
  score += factors.acceptedAnswers * weights.acceptedAnswers;

  // Network effect scoring
  score += factors.followersCount * weights.followers;

  // Activity bonus (encourages regular engagement)
  score += factors.daysActive * weights.activityBonus;

  // Apply logarithmic scaling to prevent score inflation
  // This ensures that high contributors don't dominate too much
  return Math.round(score * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate reputation level/tier based on score
 */
export function getReputationLevel(score: number): {
  level: string;
  tier: number;
  nextLevelScore: number;
} {
  if (score < 100) {
    return { level: 'Novice', tier: 1, nextLevelScore: 100 };
  } else if (score < 500) {
    return { level: 'Contributor', tier: 2, nextLevelScore: 500 };
  } else if (score < 1000) {
    return { level: 'Expert', tier: 3, nextLevelScore: 1000 };
  } else if (score < 2500) {
    return { level: 'Master', tier: 4, nextLevelScore: 2500 };
  } else if (score < 5000) {
    return { level: 'Legend', tier: 5, nextLevelScore: 5000 };
  } else {
    return { level: 'Icon', tier: 6, nextLevelScore: Infinity };
  }
}

/**
 * Get reputation badge based on level
 */
export function getReputationBadge(level: string): string {
  const badgeMap: Record<string, string> = {
    'Novice': '🌱',
    'Contributor': '⭐',
    'Expert': '🌟',
    'Master': '💎',
    'Legend': '👑',
    'Icon': '🏆',
  };
  return badgeMap[level] || '🌱';
}
