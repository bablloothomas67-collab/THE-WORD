import type { ReactNode } from 'react';
import styles from './ui.module.css';

interface CardProps {
  title?: ReactNode;
  /** Small element shown to the right of the title, e.g. a Badge. */
  aside?: ReactNode;
  accent?: boolean;
  as?: 'section' | 'article' | 'div';
  headingLevel?: 2 | 3;
  children?: ReactNode;
  className?: string;
}

export function Card({ title, aside, accent, as: Tag = 'section', headingLevel = 2, children, className }: CardProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <Tag className={[styles.card, accent ? styles.cardAccent : '', className ?? ''].filter(Boolean).join(' ')}>
      {(title || aside) && (
        <header className={styles.cardHeader}>
          {title && <Heading className={styles.cardTitle}>{title}</Heading>}
          {aside}
        </header>
      )}
      {children}
    </Tag>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return <span className={styles.badge}>{children}</span>;
}
