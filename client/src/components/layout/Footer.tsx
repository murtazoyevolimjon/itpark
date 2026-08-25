import React from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import styles from './Footer.module.css';

export const Footer: React.FC = () => {
  const { t } = useLanguage();
  return (
    <footer className={styles.footer}>
      <span>
        © 2026 <strong>{t('appName')}</strong>. Barcha huquqlar himoyalangan.
      </span>
    </footer>
  );
};
