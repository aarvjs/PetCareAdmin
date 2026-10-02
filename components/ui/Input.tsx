import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-semibold text-[#25242A] uppercase tracking-wider mb-1.5">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3.5 text-[#737780] pointer-events-none flex items-center">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full bg-white border ${
              error ? 'border-[#E46A6A] text-[#E46A6A] focus:ring-[#E46A6A]/20' : 'border-[#E8ECF0] text-[#25242A] focus:border-[#7567E8] focus:ring-[#7567E8]/20'
            } rounded-xl text-sm ${
              icon ? 'pl-10' : 'px-4'
            } py-2.5 transition-all duration-200 focus:outline-none focus:ring-4 placeholder:text-[#94A3B8] disabled:bg-[#F8FAFC] disabled:cursor-not-allowed ${className}`}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-xs text-[#E46A6A] font-medium">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-xs text-[#737780]">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
