import React from 'react';
import { Inbox } from 'lucide-react';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Malumot bo\'sh',
  description = 'Hozircha hech qanday ma\'lumot topilmadi.',
  action,
  icon,
}) => {
  return (
    <div className={styles.wrapper}>
      <div className={styles.iconWrapper}>{icon || <Inbox size={32} />}</div>
      <h4 className={styles.title}>{title}</h4>
      <p className={styles.description}>{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};
