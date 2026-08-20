import { uz } from '../locales/uz';

export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';

  const day = d.getDate();
  const monthShort = uz.monthsShort[d.getMonth()];
  const year = d.getFullYear();

  return `${day} ${monthShort} ${year}`;
}
