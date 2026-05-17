import { describe, expect, it } from 'vitest';

import { canTransition, getAllowedTransitions } from './state-machine';

describe('canTransition', () => {
  it('scheduled → in_progress is allowed', () => {
    expect(canTransition('scheduled', 'in_progress')).toBe(true);
  });

  it('scheduled → cancelled is allowed', () => {
    expect(canTransition('scheduled', 'cancelled')).toBe(true);
  });

  it('scheduled → completed is NOT allowed', () => {
    expect(canTransition('scheduled', 'completed')).toBe(false);
  });

  it('in_progress → completed is allowed', () => {
    expect(canTransition('in_progress', 'completed')).toBe(true);
  });

  it('in_progress → cancelled is allowed', () => {
    expect(canTransition('in_progress', 'cancelled')).toBe(true);
  });

  it('in_progress → scheduled is NOT allowed', () => {
    expect(canTransition('in_progress', 'scheduled')).toBe(false);
  });

  it('completed → anything is NOT allowed (terminal)', () => {
    expect(canTransition('completed', 'scheduled')).toBe(false);
    expect(canTransition('completed', 'in_progress')).toBe(false);
    expect(canTransition('completed', 'cancelled')).toBe(false);
  });

  it('cancelled → anything is NOT allowed (terminal)', () => {
    expect(canTransition('cancelled', 'scheduled')).toBe(false);
    expect(canTransition('cancelled', 'in_progress')).toBe(false);
    expect(canTransition('cancelled', 'completed')).toBe(false);
  });

  it('self-transition is NOT allowed', () => {
    expect(canTransition('scheduled', 'scheduled')).toBe(false);
    expect(canTransition('in_progress', 'in_progress')).toBe(false);
  });
});

describe('getAllowedTransitions', () => {
  it('scheduled has two allowed targets', () => {
    const targets = getAllowedTransitions('scheduled');
    expect(targets).toContain('in_progress');
    expect(targets).toContain('cancelled');
    expect(targets.length).toBe(2);
  });

  it('in_progress has two allowed targets', () => {
    const targets = getAllowedTransitions('in_progress');
    expect(targets).toContain('completed');
    expect(targets).toContain('cancelled');
    expect(targets.length).toBe(2);
  });

  it('completed has no allowed targets', () => {
    expect(getAllowedTransitions('completed')).toEqual([]);
  });

  it('cancelled has no allowed targets', () => {
    expect(getAllowedTransitions('cancelled')).toEqual([]);
  });

  it('returns a fresh copy — mutations do not affect the source', () => {
    const a = getAllowedTransitions('scheduled');
    a.push('completed' as never);
    const b = getAllowedTransitions('scheduled');
    expect(b.length).toBe(2);
  });
});
