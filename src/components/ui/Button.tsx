import type { ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import styles from './ui.module.css';

type Variant = 'primary' | 'secondary' | 'ghost';

interface CommonProps {
  variant?: Variant;
  fullWidth?: boolean;
}

function classes(variant: Variant, fullWidth?: boolean, extra?: string) {
  return [styles.button, styles[variant], fullWidth ? styles.fullWidth : '', extra ?? ''].filter(Boolean).join(' ');
}

export function Button({
  variant = 'primary',
  fullWidth,
  className,
  type = 'button',
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={classes(variant, fullWidth, className)} {...rest} />;
}

/** A router link styled as a button. */
export function ButtonLink({ variant = 'primary', fullWidth, className, ...rest }: CommonProps & LinkProps) {
  return <Link className={classes(variant, fullWidth, className)} {...rest} />;
}
