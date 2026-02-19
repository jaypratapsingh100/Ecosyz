/**
 * Achievement Badge System
 * 
 * Defines all available achievement badges and their criteria.
 * Badges are awarded automatically based on user actions and milestones.
 */

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'contribution' | 'community' | 'expertise' | 'milestone' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  criteria: BadgeCriteria;
}

export interface BadgeCriteria {
  type: 'count' | 'streak' | 'quality' | 'combination';
  condition: string; // e.g., "projectsCreated >= 10"
  value?: number;
}

/**
 * All available badges
 */
export const ACHIEVEMENT_BADGES: Badge[] = [
  // Contribution Badges
  {
    id: 'first-project',
    name: 'First Steps',
    description: 'Created your first project',
    icon: '🎯',
    category: 'contribution',
    rarity: 'common',
    criteria: { type: 'count', condition: 'projectsCreated >= 1', value: 1 },
  },
  {
    id: 'project-master',
    name: 'Project Master',
    description: 'Created 10 projects',
    icon: '🚀',
    category: 'contribution',
    rarity: 'rare',
    criteria: { type: 'count', condition: 'projectsCreated >= 10', value: 10 },
  },
  {
    id: 'resource-sharer',
    name: 'Resource Sharer',
    description: 'Shared 25 resources',
    icon: '📚',
    category: 'contribution',
    rarity: 'common',
    criteria: { type: 'count', condition: 'resourcesShared >= 25', value: 25 },
  },
  
  // Community Badges
  {
    id: 'discussion-starter',
    name: 'Discussion Starter',
    description: 'Started 5 discussions',
    icon: '💬',
    category: 'community',
    rarity: 'common',
    criteria: { type: 'count', condition: 'discussionsStarted >= 5', value: 5 },
  },
  {
    id: 'helpful-helper',
    name: 'Helpful Helper',
    description: 'Replied to 50 discussions',
    icon: '🤝',
    category: 'community',
    rarity: 'rare',
    criteria: { type: 'count', condition: 'discussionsReplied >= 50', value: 50 },
  },
  {
    id: 'group-founder',
    name: 'Group Founder',
    description: 'Created a community group',
    icon: '👥',
    category: 'community',
    rarity: 'common',
    criteria: { type: 'count', condition: 'groupsCreated >= 1', value: 1 },
  },
  {
    id: 'event-organizer',
    name: 'Event Organizer',
    description: 'Organized 3 events',
    icon: '📅',
    category: 'community',
    rarity: 'rare',
    criteria: { type: 'count', condition: 'eventsCreated >= 3', value: 3 },
  },
  {
    id: 'challenge-creator',
    name: 'Challenge Creator',
    description: 'Created a challenge',
    icon: '🏆',
    category: 'community',
    rarity: 'epic',
    criteria: { type: 'count', condition: 'challengesCreated >= 1', value: 1 },
  },
  
  // Expertise Badges
  {
    id: 'researcher',
    name: 'Researcher',
    description: 'Linked ORCID account',
    icon: '🔬',
    category: 'expertise',
    rarity: 'rare',
    criteria: { type: 'combination', condition: 'orcidId IS NOT NULL' },
  },
  {
    id: 'developer',
    name: 'Developer',
    description: 'Linked GitHub account',
    icon: '💻',
    category: 'expertise',
    rarity: 'common',
    criteria: { type: 'combination', condition: 'githubUsername IS NOT NULL' },
  },
  
  // Milestone Badges
  {
    id: 'century-club',
    name: 'Century Club',
    description: 'Reached 100 reputation points',
    icon: '💯',
    category: 'milestone',
    rarity: 'rare',
    criteria: { type: 'count', condition: 'reputationScore >= 100', value: 100 },
  },
  {
    id: 'thousand-club',
    name: 'Thousand Club',
    description: 'Reached 1000 reputation points',
    icon: '🔥',
    category: 'milestone',
    rarity: 'epic',
    criteria: { type: 'count', condition: 'reputationScore >= 1000', value: 1000 },
  },
  {
    id: 'social-butterfly',
    name: 'Social Butterfly',
    description: 'Gained 100 followers',
    icon: '🦋',
    category: 'milestone',
    rarity: 'rare',
    criteria: { type: 'count', condition: 'followersCount >= 100', value: 100 },
  },
  
  // Special Badges
  {
    id: 'early-adopter',
    name: 'Early Adopter',
    description: 'Joined in the first month',
    icon: '🌱',
    category: 'special',
    rarity: 'legendary',
    criteria: { type: 'combination', condition: 'joinedInFirstMonth' },
  },
  {
    id: 'profile-complete',
    name: 'Profile Complete',
    description: 'Completed your profile',
    icon: '✅',
    category: 'special',
    rarity: 'common',
    criteria: { type: 'combination', condition: 'profileCompleted = true' },
  },
];

/**
 * Get badge by ID
 */
export function getBadgeById(id: string): Badge | undefined {
  return ACHIEVEMENT_BADGES.find(badge => badge.id === id);
}

/**
 * Get badges by category
 */
export function getBadgesByCategory(category: Badge['category']): Badge[] {
  return ACHIEVEMENT_BADGES.filter(badge => badge.category === category);
}

/**
 * Get badges by rarity
 */
export function getBadgesByRarity(rarity: Badge['rarity']): Badge[] {
  return ACHIEVEMENT_BADGES.filter(badge => badge.rarity === rarity);
}

/**
 * Check if user qualifies for a badge based on their stats
 */
export function checkBadgeEligibility(
  badge: Badge,
  userStats: {
    projectsCreated: number;
    resourcesShared: number;
    discussionsStarted: number;
    discussionsReplied: number;
    groupsCreated: number;
    eventsCreated: number;
    challengesCreated: number;
    reputationScore: number;
    followersCount: number;
    orcidId?: string | null;
    githubUsername?: string | null;
    profileCompleted: boolean;
    joinedInFirstMonth: boolean;
  }
): boolean {
  const { criteria } = badge;
  
  switch (criteria.type) {
    case 'count':
      if (criteria.condition.includes('projectsCreated')) {
        return userStats.projectsCreated >= (criteria.value || 0);
      }
      if (criteria.condition.includes('resourcesShared')) {
        return userStats.resourcesShared >= (criteria.value || 0);
      }
      if (criteria.condition.includes('discussionsStarted')) {
        return userStats.discussionsStarted >= (criteria.value || 0);
      }
      if (criteria.condition.includes('discussionsReplied')) {
        return userStats.discussionsReplied >= (criteria.value || 0);
      }
      if (criteria.condition.includes('groupsCreated')) {
        return userStats.groupsCreated >= (criteria.value || 0);
      }
      if (criteria.condition.includes('eventsCreated')) {
        return userStats.eventsCreated >= (criteria.value || 0);
      }
      if (criteria.condition.includes('challengesCreated')) {
        return userStats.challengesCreated >= (criteria.value || 0);
      }
      if (criteria.condition.includes('reputationScore')) {
        return userStats.reputationScore >= (criteria.value || 0);
      }
      if (criteria.condition.includes('followersCount')) {
        return userStats.followersCount >= (criteria.value || 0);
      }
      return false;
      
    case 'combination':
      if (criteria.condition.includes('orcidId')) {
        return !!userStats.orcidId;
      }
      if (criteria.condition.includes('githubUsername')) {
        return !!userStats.githubUsername;
      }
      if (criteria.condition.includes('profileCompleted')) {
        return userStats.profileCompleted;
      }
      if (criteria.condition.includes('joinedInFirstMonth')) {
        return userStats.joinedInFirstMonth;
      }
      return false;
      
    default:
      return false;
  }
}

/**
 * Get all badges user has earned
 */
export function getUserEarnedBadges(
  earnedBadgeIds: string[]
): Badge[] {
  return ACHIEVEMENT_BADGES.filter(badge => earnedBadgeIds.includes(badge.id));
}

/**
 * Get all badges user can potentially earn (not yet earned)
 */
export function getAvailableBadges(
  earnedBadgeIds: string[],
  userStats: Parameters<typeof checkBadgeEligibility>[1]
): Badge[] {
  return ACHIEVEMENT_BADGES.filter(badge => {
    if (earnedBadgeIds.includes(badge.id)) {
      return false; // Already earned
    }
    return checkBadgeEligibility(badge, userStats);
  });
}
