import type { HTMLAttributes } from 'react';
import styles from './Skeleton.module.css';

type SkeletonShape = 'text' | 'title' | 'block';

interface SkeletonProps extends HTMLAttributes<HTMLSpanElement> {
  shape?: SkeletonShape;
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ shape = 'text', width, height, className, style, ...rest }: SkeletonProps) {
  return (
    <span
      className={`${styles.skel} ${styles[shape]} ${className ?? ''}`.trim()}
      style={{ width, height, ...style }}
      aria-hidden
      {...rest}
    />
  );
}
