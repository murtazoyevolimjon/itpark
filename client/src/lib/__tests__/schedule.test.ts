import { describe, expect, it } from 'vitest';
import {
  ScheduledGroup,
  describeConflict,
  findGroupConflict,
  findStudentConflict,
  overlappingDays,
  timeToMinutes,
  validateSlot,
} from '../schedule';

const group = (over: Partial<ScheduledGroup> = {}): ScheduledGroup => ({
  id: 'g1',
  name: 'wqer',
  teacherId: 't1',
  roomId: 'r1',
  days: ['DUSH', 'CHOR', 'JU'],
  startTime: '09:00',
  endTime: '11:00',
  status: 'FAOL',
  ...over,
});

describe('timeToMinutes', () => {
  it('parses HH:MM and HH:MM:SS', () => {
    expect(timeToMinutes('09:00')).toBe(540);
    expect(timeToMinutes('9:05')).toBe(545);
    expect(timeToMinutes('23:59:00')).toBe(1439);
  });
  it('rejects garbage', () => {
    expect(timeToMinutes('24:00')).toBeNull();
    expect(timeToMinutes('09:60')).toBeNull();
    expect(timeToMinutes('abc')).toBeNull();
    expect(timeToMinutes('')).toBeNull();
    expect(timeToMinutes(undefined)).toBeNull();
  });
});

describe('validateSlot', () => {
  it('accepts a normal slot', () => {
    expect(validateSlot(group())).toBeNull();
  });
  it('requires days', () => {
    expect(validateSlot(group({ days: [] }))).toMatch(/dars kuni/);
  });
  it('rejects unknown days', () => {
    expect(validateSlot(group({ days: ['XXX'] }))).toMatch(/kunlari/);
  });
  it('rejects end before or equal to start', () => {
    expect(validateSlot(group({ startTime: '11:00', endTime: '09:00' }))).toMatch(/Tugash/);
    expect(validateSlot(group({ startTime: '10:00', endTime: '10:00' }))).toMatch(/Tugash/);
  });
  it('rejects bad times', () => {
    expect(validateSlot(group({ startTime: '' }))).toMatch(/vaqti/);
  });
});

describe('overlappingDays', () => {
  it('returns common days when times overlap', () => {
    expect(overlappingDays(group(), group({ days: ['DUSH', 'SESH'] }))).toEqual(['DUSH']);
  });
  it('is empty for different days', () => {
    expect(overlappingDays(group(), group({ days: ['SESH', 'PAY'] }))).toEqual([]);
  });
  it('treats back-to-back lessons as non-overlapping', () => {
    expect(overlappingDays(group(), group({ startTime: '11:00', endTime: '13:00' }))).toEqual([]);
    expect(overlappingDays(group({ startTime: '11:00', endTime: '13:00' }), group())).toEqual([]);
  });
  it('detects partial overlap in both directions', () => {
    expect(overlappingDays(group(), group({ startTime: '10:30', endTime: '12:00' })).length).toBe(3);
    expect(overlappingDays(group({ startTime: '10:30', endTime: '12:00' }), group()).length).toBe(3);
  });
  it('detects containment', () => {
    expect(overlappingDays(group(), group({ startTime: '09:30', endTime: '10:00' })).length).toBe(3);
  });
});

describe('findGroupConflict', () => {
  const candidate = { days: ['DUSH', 'CHOR', 'JU'], startTime: '09:00', endTime: '11:00', teacherId: 't1', roomId: 'r1' };

  it('flags the same teacher at the same time (the reported bug: identical groups)', () => {
    const c = findGroupConflict(candidate, [group()]);
    expect(c?.type).toBe('teacher');
    expect(describeConflict(c!)).toContain('wqer');
  });
  it('flags the same room with a different teacher', () => {
    const c = findGroupConflict(candidate, [group({ teacherId: 't2' })]);
    expect(c?.type).toBe('room');
  });
  it('allows a different teacher and room at the same time', () => {
    expect(findGroupConflict(candidate, [group({ teacherId: 't2', roomId: 'r2' })])).toBeNull();
  });
  it('allows the same teacher on different days', () => {
    expect(findGroupConflict(candidate, [group({ days: ['SESH', 'PAY'] })])).toBeNull();
  });
  it('allows the same teacher right after the previous lesson', () => {
    expect(findGroupConflict(candidate, [group({ startTime: '11:00', endTime: '13:00' })])).toBeNull();
  });
  it('ignores finished and paused groups', () => {
    expect(findGroupConflict(candidate, [group({ status: 'TUGAGAN' })])).toBeNull();
    expect(findGroupConflict(candidate, [group({ status: 'TO_XTATILGAN' })])).toBeNull();
  });
  it('ignores the group being edited', () => {
    expect(findGroupConflict(candidate, [group({ id: 'self' })], 'self')).toBeNull();
  });
  it('ignores groups with unparsable times instead of crashing', () => {
    expect(findGroupConflict(candidate, [group({ startTime: 'bad' })])).toBeNull();
  });
});

describe('findStudentConflict', () => {
  it('flags a student who already has a lesson at that time', () => {
    const c = findStudentConflict(group({ id: 'new', name: 'new' }), [group()]);
    expect(c?.type).toBe('student');
  });
  it('allows a different time', () => {
    expect(findStudentConflict(group({ id: 'new' }), [group({ startTime: '14:00', endTime: '16:00' })])).toBeNull();
  });
  it('does not clash with the group being joined', () => {
    expect(findStudentConflict(group(), [group()], 'g1')).toBeNull();
  });
});
