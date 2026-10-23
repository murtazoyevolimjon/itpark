import React from 'react';
import { Input, InputProps } from '../Input/Input';
import { groupLocalPhone, localPhoneDigits } from '../../../utils/uzPhone';

interface PhoneInputProps extends Omit<InputProps, 'value' | 'onChange'> {
  /** Digits as stored (998XXXXXXXXX) or anything typed so far; '' when empty */
  value: string;
  /** Called with 998XXXXXXXXX digits, or '' when nothing is typed after the prefix */
  onChange: (digits: string) => void;
}

/** A phone field whose "+998" can not be deleted: only the 9 local digits are typed. */
export const PhoneInput: React.FC<PhoneInputProps> = ({ value, onChange, placeholder, ...rest }) => {
  const local = localPhoneDigits(value);
  const display = `+998 ${groupLocalPhone(local)}`;

  return (
    <Input
      {...rest}
      type="tel"
      inputMode="tel"
      autoComplete="off"
      placeholder={placeholder || '+998 90 123 45 67'}
      value={display}
      onChange={(e) => {
        let d = e.target.value.replace(/\D/g, '');
        if (d.startsWith('998')) d = d.slice(3);
        // A whole number pasted after the prefix ("+998 998901234567")
        if (d.length > 9 && d.startsWith('998')) d = d.slice(3);
        d = d.slice(0, 9);
        onChange(d ? `998${d}` : '');
      }}
    />
  );
};
