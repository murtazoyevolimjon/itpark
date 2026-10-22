import React from 'react';
import { Inbox } from 'lucide-react';
import { useLanguage } from '../../../hooks/useLanguage';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
  icon,
}) => {
  const { t } = useLanguage();
  const displayTitle = title || t('empty');
  const displayDesc = description || t('emptySub');

  return (
    <div className={styles.wrapper}>
      <div className={styles.iconWrapper}>{icon || <Inbox size={32} />}</div>
      <h4 className={styles.title}>{displayTitle}</h4>
      <p className={styles.description}>{displayDesc}</p>
      {action && <div>{action}</div>}
    </div>
  );
};
