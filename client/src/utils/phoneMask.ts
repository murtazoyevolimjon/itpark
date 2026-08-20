export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '-';
  const cleaned = phone.replace(/\D/g, '');
  
  // Clean digits only (e.g. 998901234567 or 901234567)
  let num = cleaned;
  if (!num.startsWith('998') && num.length === 9) {
    num = '998' + num;
  }

  if (num.length !== 12) {
    return phone;
  }

  const code = num.slice(3, 5);
  const p1 = num.slice(5, 8);
  const p2 = num.slice(8, 10);
  const p3 = num.slice(10, 12);

  return `+998 ${code} ${p1} ${p2} ${p3}`;
}

export function unmaskPhone(phone: string): string {
  return phone.replace(/\D/g, '');
}
