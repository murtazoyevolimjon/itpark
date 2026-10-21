import { beforeEach, describe, expect, it } from 'vitest';
import { checkEnrollment, checkGroupReferences, checkGroupSchedule } from '../groupRules';

/** Minimal in-memory stand-in for the Supabase query builder (eq filters, joins used by groupRules). */
type Row = Record<string, any>;

function fakeSupabase(db: Record<string, Row[]>) {
  const from = (table: string) => {
    const filters: Array<[string, any]> = [];
    let selectStr = '';
    const run = () => {
      let rows = (db[table] || []).filter((r) => filters.every(([k, v]) => r[k] === v));
      rows = rows.map((r) => {
        const out: Row = { ...r };
        if (table === 'groups' && selectStr.includes('room:rooms')) {
          out.room = (db.rooms || []).find((x) => x.id === r.roomId) || null;
        }
        if (table === 'student_groups' && selectStr.includes('group:groups')) {
          out.group = (db.groups || []).find((x) => x.id === r.groupId) || null;
        }
        return out;
      });
      return rows;
    };
    const builder: any = {
      select: (s: string) => {
        selectStr = s;
        return builder;
      },
      eq: (k: string, v: any) => {
        filters.push([k, v]);
        return builder;
      },
      maybeSingle: async () => ({ data: run()[0] || null, error: null }),
      then: (resolve: any, reject: any) => Promise.resolve({ data: run(), error: null }).then(resolve, reject),
    };
    return builder;
  };
  return { from };
}

const CENTER = 'c1';
let db: Record<string, Row[]>;

beforeEach(() => {
  db = {
    courses: [{ id: 'course1', centerId: CENTER }, { id: 'courseX', centerId: 'other' }],
    teachers: [
      { id: 't1', centerId: CENTER, status: 'FAOL' },
      { id: 't2', centerId: CENTER, status: 'FAOL' },
      { id: 'tOff', centerId: CENTER, status: 'NOFAOL' },
      { id: 'tX', centerId: 'other', status: 'FAOL' },
    ],
    rooms: [
      { id: 'r1', centerId: CENTER, name: 'a', capacity: 2 },
      { id: 'r2', centerId: CENTER, name: 'b', capacity: 20 },
    ],
    groups: [
      {
        id: 'g1', centerId: CENTER, name: 'wqer', teacherId: 't1', roomId: 'r1',
        days: ['DUSH', 'CHOR', 'JU'], startTime: '09:00', endTime: '11:00', status: 'FAOL',
      },
      {
        id: 'g2', centerId: CENTER, name: 'afternoon', teacherId: 't2', roomId: 'r2',
        days: ['DUSH', 'CHOR', 'JU'], startTime: '14:00', endTime: '16:00', status: 'FAOL',
      },
      {
        id: 'gEnd', centerId: CENTER, name: 'finished', teacherId: 't2', roomId: 'r2',
        days: ['SESH'], startTime: '09:00', endTime: '11:00', status: 'TUGAGAN',
      },
    ],
    students: [
      { id: 's1', centerId: CENTER },
      { id: 's2', centerId: CENTER },
      { id: 's3', centerId: CENTER },
      { id: 'sX', centerId: 'other' },
    ],
    student_groups: [],
  };
});

describe('checkGroupReferences', () => {
  const ok = { courseId: 'course1', teacherId: 't1', roomId: 'r1' };
  it('accepts references from the same center', async () => {
    expect(await checkGroupReferences(fakeSupabase(db), CENTER, ok)).toBeNull();
  });
  it('rejects ids from another center', async () => {
    expect((await checkGroupReferences(fakeSupabase(db), CENTER, { ...ok, courseId: 'courseX' }))?.message).toMatch(/kurs/i);
    expect((await checkGroupReferences(fakeSupabase(db), CENTER, { ...ok, teacherId: 'tX' }))?.message).toMatch(/ustoz/i);
  });
  it('rejects an inactive teacher', async () => {
    expect((await checkGroupReferences(fakeSupabase(db), CENTER, { ...ok, teacherId: 'tOff' }))?.message).toMatch(/nofaol/i);
  });
  it('requires every reference', async () => {
    expect((await checkGroupReferences(fakeSupabase(db), CENTER, { ...ok, roomId: '' }))?.status).toBe(400);
  });
});

describe('checkGroupSchedule', () => {
  const base = { days: ['DUSH', 'CHOR', 'JU'], startTime: '09:00', endTime: '11:00' };

  it('blocks the exact duplicate from the bug report (same teacher, room, days, time)', async () => {
    const v = await checkGroupSchedule(fakeSupabase(db), CENTER, { ...base, teacherId: 't1', roomId: 'r1' });
    expect(v?.status).toBe(409);
    expect(v?.message).toContain('wqer');
  });
  it('blocks the same teacher in another room', async () => {
    const v = await checkGroupSchedule(fakeSupabase(db), CENTER, { ...base, teacherId: 't1', roomId: 'r2' });
    expect(v?.message).toMatch(/ustoz/i);
  });
  it('blocks a different teacher in the same room', async () => {
    const v = await checkGroupSchedule(fakeSupabase(db), CENTER, { ...base, teacherId: 't2', roomId: 'r1' });
    expect(v?.message).toMatch(/xona/i);
  });
  it('allows a different time slot', async () => {
    const v = await checkGroupSchedule(fakeSupabase(db), CENTER, {
      ...base, startTime: '11:00', endTime: '13:00', teacherId: 't1', roomId: 'r1',
    });
    expect(v).toBeNull();
  });
  it('allows the same slot on other days', async () => {
    const v = await checkGroupSchedule(fakeSupabase(db), CENTER, {
      ...base, days: ['SESH', 'PAY'], teacherId: 't1', roomId: 'r1',
    });
    expect(v).toBeNull();
  });
  it('does not clash with the group being edited', async () => {
    const v = await checkGroupSchedule(fakeSupabase(db), CENTER, { ...base, teacherId: 't1', roomId: 'r1' }, 'g1');
    expect(v).toBeNull();
  });
  it('ignores finished groups', async () => {
    const v = await checkGroupSchedule(fakeSupabase(db), CENTER, {
      days: ['SESH'], startTime: '09:00', endTime: '11:00', teacherId: 't2', roomId: 'r2',
    });
    expect(v).toBeNull();
  });
  it('rejects an invalid slot before touching the database', async () => {
    const v = await checkGroupSchedule(fakeSupabase(db), CENTER, {
      ...base, startTime: '12:00', endTime: '10:00', teacherId: 't1', roomId: 'r1',
    });
    expect(v?.status).toBe(400);
  });
});

describe('checkEnrollment', () => {
  const enroll = (studentId: string, groupId: string) =>
    db.student_groups.push({ id: `${studentId}-${groupId}`, studentId, groupId, centerId: CENTER });

  it('accepts a free student', async () => {
    expect(await checkEnrollment(fakeSupabase(db), CENTER, 'g1', 's1')).toBeNull();
  });
  it('rejects unknown group / student from another center', async () => {
    expect((await checkEnrollment(fakeSupabase(db), CENTER, 'nope', 's1'))?.status).toBe(404);
    expect((await checkEnrollment(fakeSupabase(db), CENTER, 'g1', 'sX'))?.status).toBe(404);
  });
  it('rejects finished groups', async () => {
    expect((await checkEnrollment(fakeSupabase(db), CENTER, 'gEnd', 's1'))?.message).toMatch(/tugagan/i);
  });
  it('enforces the room capacity', async () => {
    enroll('s1', 'g1');
    enroll('s2', 'g1'); // capacity of r1 is 2
    const v = await checkEnrollment(fakeSupabase(db), CENTER, 'g1', 's3');
    expect(v?.status).toBe(409);
    expect(v?.message).toMatch(/to'lgan/);
  });
  it('does not count the student against capacity when already inside', async () => {
    enroll('s1', 'g1');
    enroll('s2', 'g1');
    expect(await checkEnrollment(fakeSupabase(db), CENTER, 'g1', 's2')).toBeNull();
  });
  it('checks capacity for a brand-new student (no id yet)', async () => {
    enroll('s1', 'g1');
    enroll('s2', 'g1');
    expect((await checkEnrollment(fakeSupabase(db), CENTER, 'g1', null))?.status).toBe(409);
  });
  it("blocks a student whose other group is at the same time", async () => {
    db.groups.push({
      id: 'g3', centerId: CENTER, name: 'clash', teacherId: 't2', roomId: 'r2',
      days: ['DUSH'], startTime: '10:00', endTime: '12:00', status: 'FAOL',
    });
    enroll('s1', 'g1');
    const v = await checkEnrollment(fakeSupabase(db), CENTER, 'g3', 's1');
    expect(v?.status).toBe(409);
    expect(v?.message).toContain('wqer');
  });
  it('allows a student to take a group at a different time', async () => {
    enroll('s1', 'g1');
    expect(await checkEnrollment(fakeSupabase(db), CENTER, 'g2', 's1')).toBeNull();
  });
  it('ignores the group being left during a transfer', async () => {
    db.groups.push({
      id: 'g3', centerId: CENTER, name: 'same-slot', teacherId: 't2', roomId: 'r2',
      days: ['DUSH', 'CHOR', 'JU'], startTime: '09:00', endTime: '11:00', status: 'FAOL',
    });
    enroll('s1', 'g1');
    expect((await checkEnrollment(fakeSupabase(db), CENTER, 'g3', 's1'))?.status).toBe(409);
    expect(await checkEnrollment(fakeSupabase(db), CENTER, 'g3', 's1', ['g1'])).toBeNull();
  });
});
