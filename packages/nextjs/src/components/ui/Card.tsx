import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Card.module.css';

type Padding = 'default' | 'tight';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  interactive?: boolean;
  muted?: boolean;
}

export function Card({
  elevated = false,
  interactive = false,
  muted = false,
  className,
  children,
  ...rest
}: CardProps) {
  const classes = [
    styles.card,
    elevated ? styles.elevated : '',
    interactive ? styles.interactive : '',
    muted ? styles.muted : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}

interface CardHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

export function CardHeader({ title, subtitle, actions, className, children, ...rest }: CardHeaderProps) {
  return (
    <div className={`${styles.header} ${className ?? ''}`.trim()} {...rest}>
      <div>
        {title && <h3 className={styles.title}>{title}</h3>}
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        {children}
      </div>
      {actions && <div>{actions}</div>}
    </div>
  );
}

export function CardBody({
  padding = 'default',
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { padding?: Padding }) {
  const cls = padding === 'tight' ? styles.bodyTight : styles.body;
  return <div className={`${cls} ${className ?? ''}`.trim()} {...rest} />;
}

export function CardFooter(props: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`${styles.footer} ${props.className ?? ''}`.trim()} />;
}
