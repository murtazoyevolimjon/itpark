/**
 * The server refuses to create the same person twice (same phone and name) and answers 409 with the
 * existing student's id. When the form was filling a group, ask the admin whether to put that existing
 * student into the group instead. Returns the existing student's id when the admin agreed, otherwise
 * null (another kind of error, no group chosen, or the admin declined).
 */
export function askAddExistingStudent(err: any, groupId?: string | null): string | null {
  const data = err?.response?.data;
  if (err?.response?.status !== 409 || !data?.existingStudentId || !groupId) return null;
  if (typeof window === 'undefined') return null;

  const ok = window.confirm(`${data.message}\n\nMavjud talabani shu guruhga qo'shaymi?`);
  return ok ? String(data.existingStudentId) : null;
}
