import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'p-6',
}) => {
  return (
    <div
      className={`bg-white border border-[#E8ECF0] rounded-2xl shadow-xs transition-shadow duration-200 hover:shadow-sm ${padding} ${className}`}
    >
      {children}
    </div>
  );
};
