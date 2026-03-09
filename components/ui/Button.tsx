import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'black' | 'white';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon,
  className = '',
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-full font-medium transition-all duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-gray-900 hover:bg-black text-white border border-transparent focus:ring-2 focus:ring-gray-900 focus:ring-offset-2",
    black:   "bg-gray-900 hover:bg-black text-white border border-gray-800 focus:ring-2 focus:ring-gray-900 focus:ring-offset-2",
    white:   "bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 focus:ring-2 focus:ring-gray-200 focus:ring-offset-2",
    secondary: "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 hover:border-gray-300 focus:ring-2 focus:ring-gray-200",
    outline: "bg-transparent border border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900 hover:bg-gray-50 focus:ring-2 focus:ring-gray-200",
    ghost:   "bg-transparent hover:bg-gray-50 text-gray-500 hover:text-gray-900 focus:ring-2 focus:ring-gray-200"
  };

  const sizes = {
    sm: "px-4 py-2 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-8 py-3.5 text-base font-semibold",
    xl: "px-10 py-4 text-lg"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};