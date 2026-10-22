import { uz } from '../locales/uz';
import { en } from '../locales/en';
import { ru } from '../locales/ru';

const dictionaries = { uz, en, ru };

export function formatDate(dateInput: string | Date | null | undefined, lang?: 'uz' | 'en' | 'ru'): string {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';

  let currentLang = lang;
  if (!currentLang && typeof window !== 'undefined') {
    currentLang = (localStorage.getItem('lang') as any) || 'uz';
  }
  const dict = dictionaries[currentLang || 'uz'] || uz;
  const day = d.getDate();
  const monthShort = dict.monthsShort?.[d.getMonth()] || uz.monthsShort[d.getMonth()];
  const year = d.getFullYear();

  return `${day} ${monthShort} ${year}`;
}

