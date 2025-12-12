import React from 'react';

const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', ...props }) => (
  <div className={`card rounded-2xl border border-slate-200 p-4 ${className}`} {...props} />
);

export default Card;
