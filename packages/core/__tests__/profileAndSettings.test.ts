import { createProfile, defaultDifficultyFor, validateProfileInput } from '../src/profiles/profile';
import {
  defaultAccessibilitySettings,
  deriveInteractionParams,
} from '../src/settings/accessibility';

describe('child profile (FR-001, minimal collection)', () => {
  it('creates a profile with child-safe defaults', () => {
    const p = createProfile({ nickname: 'Possum', ageBand: '3-5' }, 'id1', 123);
    expect(p.difficulty).toBe(2);
    expect(p.dailyScreenTimeMinutes).toBe(15);
    expect(p.accessibility.noTimeLimits).toBe(true);
    expect(p.avatarId).toBe('avatar-koala');
  });

  it('derives difficulty from the age band (PRD sections 6.1/8)', () => {
    expect(defaultDifficultyFor('2-3')).toBe(1);
    expect(defaultDifficultyFor('3-5')).toBe(2);
    expect(defaultDifficultyFor('5-7')).toBe(3);
  });

  it('rejects empty and over-long nicknames', () => {
    expect(validateProfileInput({ nickname: '  ', ageBand: '2-3' })).toContain('nickname-empty');
    expect(validateProfileInput({ nickname: 'x'.repeat(30), ageBand: '2-3' })).toContain(
      'nickname-too-long',
    );
  });

  it('blocks contact details being smuggled into the nickname (data minimisation)', () => {
    expect(validateProfileInput({ nickname: 'kid@example.com', ageBand: '2-3' })).toContain(
      'nickname-looks-like-contact-info',
    );
    expect(validateProfileInput({ nickname: '0412 345 678', ageBand: '2-3' })).toContain(
      'nickname-looks-like-contact-info',
    );
    expect(validateProfileInput({ nickname: 'Sunny', ageBand: '2-3' })).toHaveLength(0);
  });

  it('the profile shape contains no DOB, email or photo fields (A-02)', () => {
    const p = createProfile({ nickname: 'Sunny', ageBand: '2-3' }, 'id2', 1);
    const keys = Object.keys(p).join(' ');
    expect(keys).not.toMatch(/birth|dob|email|photo|address|location/i);
  });
});

describe('accessibility settings (FR-023)', () => {
  it('defaults to no time limits', () => {
    expect(defaultAccessibilitySettings().noTimeLimits).toBe(true);
  });

  it('larger targets raise the child minimum to 88dp (docs/03 section 3.9)', () => {
    const params = deriveInteractionParams({
      ...defaultAccessibilitySettings(),
      largerTouchTargets: true,
    });
    expect(params.minTouchTargetDp).toBe(88);
    expect(deriveInteractionParams(defaultAccessibilitySettings()).minTouchTargetDp).toBe(64);
  });

  it('longer response time multiplies all timing windows by 2.5', () => {
    const params = deriveInteractionParams({
      ...defaultAccessibilitySettings(),
      longerResponseTime: true,
    });
    expect(params.timingMultiplier).toBe(2.5);
  });

  it('timed challenges are impossible unless time limits are explicitly allowed', () => {
    expect(deriveInteractionParams(defaultAccessibilitySettings()).timedChallengesAllowed).toBe(false);
    const opted = deriveInteractionParams({
      ...defaultAccessibilitySettings(),
      noTimeLimits: false,
    });
    expect(opted.timedChallengesAllowed).toBe(true);
    const reduced = deriveInteractionParams({
      ...defaultAccessibilitySettings(),
      noTimeLimits: false,
      reducedStimulation: true,
    });
    expect(reduced.timedChallengesAllowed).toBe(false);
  });

  it('reduced motion removes movement animation entirely', () => {
    expect(
      deriveInteractionParams({ ...defaultAccessibilitySettings(), reducedMotion: true })
        .animationScale,
    ).toBe(0);
  });
});
