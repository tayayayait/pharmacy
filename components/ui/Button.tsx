import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
}

const styles = {
  base: 'rounded-2xl px-4 py-2 font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
  primary: 'bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:from-teal-600 focus-visible:outline-teal-600',
  secondary: 'bg-white border border-slate-200 text-slate-700 hover:border-teal-500 focus-visible:outline-teal-500',
  outline: 'border border-slate-200 text-slate-700 hover:border-teal-500 focus-visible:outline-teal-500',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', className = '', ...props }, ref) => (
    <button ref={ref} className={`${styles.base} ${styles[variant]} ${className}`} {...props} />
  )
);
Button.displayName = 'Button';

export default Button;
