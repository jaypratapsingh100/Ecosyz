import { describe, it, expect } from 'vitest';
import {
  calculateReputationScore,
  getReputationLevel,
  getReputationBadge,
  DEFAULT_REPUTATION_WEIGHTS,
  type ReputationFactors,
} from '../../lib/reputation/calculator';

describe('calculateReputationScore', () => {
  const emptyFactors: ReputationFactors = {
    projectsCreated: 0,
    resourcesShared: 0,
    discussionsStarted: 0,
    discussionsReplied: 0,
    groupsCreated: 0,
    eventsCreated: 0,
    challengesCreated: 0,
    upvotesReceived: 0,
    acceptedAnswers: 0,
    followersCount: 0,
    daysActive: 0,
  };

  it('returns 0 for empty factors', () => {
    expect(calculateReputationScore(emptyFactors)).toBe(0);
  });

  it('calculates score from projects created', () => {
    const factors = { ...emptyFactors, projectsCreated: 5 };
    expect(calculateReputationScore(factors)).toBe(50);
  });

  it('calculates score from multiple factors', () => {
    const factors: ReputationFactors = {
      ...emptyFactors,
      projectsCreated: 2,
      resourcesShared: 10,
      discussionsStarted: 3,
      daysActive: 30,
    };
    const score = calculateReputationScore(factors);
    expect(score).toBeGreaterThan(0);
    expect(score).toBe(2 * 10 + 10 * 5 + 3 * 8 + 30 * 0.1);
  });

  it('rounds to 2 decimal places', () => {
    const factors = { ...emptyFactors, daysActive: 33 };
    const score = calculateReputationScore(factors);
    expect(Number.isInteger(score * 100)).toBe(true);
  });

  it('accepts custom weights', () => {
    const factors = { ...emptyFactors, projectsCreated: 1 };
    const customWeights = { ...DEFAULT_REPUTATION_WEIGHTS, projectCreation: 100 };
    expect(calculateReputationScore(factors, customWeights)).toBe(100);
  });
});

describe('getReputationLevel', () => {
  it('returns Novice for score < 100', () => {
    expect(getReputationLevel(0)).toEqual({ level: 'Novice', tier: 1, nextLevelScore: 100 });
    expect(getReputationLevel(99)).toEqual({ level: 'Novice', tier: 1, nextLevelScore: 100 });
  });

  it('returns Contributor for 100 <= score < 500', () => {
    expect(getReputationLevel(100)).toEqual({ level: 'Contributor', tier: 2, nextLevelScore: 500 });
    expect(getReputationLevel(499)).toEqual({ level: 'Contributor', tier: 2, nextLevelScore: 500 });
  });

  it('returns Expert for 500 <= score < 1000', () => {
    expect(getReputationLevel(500)).toEqual({ level: 'Expert', tier: 3, nextLevelScore: 1000 });
  });

  it('returns Master for 1000 <= score < 2500', () => {
    expect(getReputationLevel(1000)).toEqual({ level: 'Master', tier: 4, nextLevelScore: 2500 });
  });

  it('returns Legend for 2500 <= score < 5000', () => {
    expect(getReputationLevel(2500)).toEqual({ level: 'Legend', tier: 5, nextLevelScore: 5000 });
  });

  it('returns Icon for score >= 5000', () => {
    expect(getReputationLevel(5000)).toEqual({ level: 'Icon', tier: 6, nextLevelScore: Infinity });
    expect(getReputationLevel(10000)).toEqual({ level: 'Icon', tier: 6, nextLevelScore: Infinity });
  });
});

describe('getReputationBadge', () => {
  it('returns correct emoji for each level', () => {
    expect(getReputationBadge('Novice')).toBe('🌱');
    expect(getReputationBadge('Contributor')).toBe('⭐');
    expect(getReputationBadge('Expert')).toBe('🌟');
    expect(getReputationBadge('Master')).toBe('💎');
    expect(getReputationBadge('Legend')).toBe('👑');
    expect(getReputationBadge('Icon')).toBe('🏆');
  });

  it('returns default emoji for unknown level', () => {
    expect(getReputationBadge('Unknown')).toBe('🌱');
  });
});
