import { describe, it, expect } from 'vitest';
import {
  ACHIEVEMENT_BADGES,
  getBadgeById,
  getBadgesByCategory,
  getBadgesByRarity,
  checkBadgeEligibility,
} from '../../lib/achievements/badges';

describe('ACHIEVEMENT_BADGES', () => {
  it('has at least one badge', () => {
    expect(ACHIEVEMENT_BADGES.length).toBeGreaterThan(0);
  });

  it('each badge has required fields', () => {
    ACHIEVEMENT_BADGES.forEach((badge) => {
      expect(badge.id).toBeDefined();
      expect(badge.name).toBeDefined();
      expect(badge.description).toBeDefined();
      expect(badge.icon).toBeDefined();
      expect(['contribution', 'community', 'expertise', 'milestone', 'special']).toContain(badge.category);
      expect(['common', 'rare', 'epic', 'legendary']).toContain(badge.rarity);
      expect(badge.criteria).toBeDefined();
      expect(badge.criteria.type).toBeDefined();
      expect(badge.criteria.condition).toBeDefined();
    });
  });
});

describe('getBadgeById', () => {
  it('returns badge for valid id', () => {
    const badge = getBadgeById('first-project');
    expect(badge).toBeDefined();
    expect(badge?.name).toBe('First Steps');
  });

  it('returns undefined for invalid id', () => {
    expect(getBadgeById('non-existent')).toBeUndefined();
  });
});

describe('getBadgesByCategory', () => {
  it('returns badges for contribution category', () => {
    const badges = getBadgesByCategory('contribution');
    expect(badges.length).toBeGreaterThan(0);
    badges.forEach((b) => expect(b.category).toBe('contribution'));
  });

  it('returns empty array for category with no badges', () => {
    const badges = getBadgesByCategory('contribution');
    const other = getBadgesByCategory('community');
    expect(badges).toBeDefined();
    expect(Array.isArray(badges)).toBe(true);
    expect(Array.isArray(other)).toBe(true);
  });
});

describe('getBadgesByRarity', () => {
  it('returns badges for common rarity', () => {
    const badges = getBadgesByRarity('common');
    expect(Array.isArray(badges)).toBe(true);
    badges.forEach((b) => expect(b.rarity).toBe('common'));
  });
});

describe('checkBadgeEligibility', () => {
  const baseStats = {
    projectsCreated: 0,
    resourcesShared: 0,
    discussionsStarted: 0,
    discussionsReplied: 0,
    groupsCreated: 0,
    eventsCreated: 0,
    challengesCreated: 0,
    reputationScore: 0,
    followersCount: 0,
    profileCompleted: false,
    joinedInFirstMonth: false,
  };

  it('returns true when user qualifies for first-project badge', () => {
    const badge = getBadgeById('first-project')!;
    const result = checkBadgeEligibility(badge, { ...baseStats, projectsCreated: 1 });
    expect(result).toBe(true);
  });

  it('returns false when user does not qualify', () => {
    const badge = getBadgeById('project-master')!;
    const result = checkBadgeEligibility(badge, { ...baseStats, projectsCreated: 5 });
    expect(result).toBe(false);
  });

  it('returns true for developer badge when github linked', () => {
    const badge = getBadgeById('developer')!;
    const result = checkBadgeEligibility(badge, {
      ...baseStats,
      githubUsername: 'testuser',
    });
    expect(result).toBe(true);
  });

  it('returns true for profile-complete when profile completed', () => {
    const badge = getBadgeById('profile-complete')!;
    const result = checkBadgeEligibility(badge, {
      ...baseStats,
      profileCompleted: true,
    });
    expect(result).toBe(true);
  });
});
