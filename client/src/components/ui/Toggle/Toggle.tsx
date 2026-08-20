import React from 'react';
import styles from './Toggle.module.css';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label }) => {
  return (
    <label className={styles.wrapper}>
      <div
        className={`${styles.switch} ${checked ? styles.switchChecked : ''}`}
        onClick={() => onChange(!checked)}
      >
        <div className={`${styles.slider} ${checked ? styles.sliderChecked : ''}`} />
      </div>
      {label && <span>{label}</span>}
    </label>
  );
};
