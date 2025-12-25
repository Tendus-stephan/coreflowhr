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
  const baseStyles = "inline-flex items-center justify-center rounded-full font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    // Primary is now Black to match branding
    primary: "bg-gray-900 hover:bg-gray-800 text-white shadow-lg shadow-gray-900/20 focus:ring-gray-900 border border-transparent",
    black: "bg-gray-900 hover:bg-gray-800 text-white shadow-lg shadow-gray-900/20 border border-gray-800 focus:ring-gray-900",
    white: "bg-white hover:bg-gray-100 text-black shadow-lg shadow-white/10 border border-transparent focus:ring-white",
    secondary: "bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-200 shadow-sm focus:ring-gray-200",
    outline: "bg-transparent border border-gray-300 text-gray-700 hover:border-gray-900 hover:text-gray-900 hover:bg-gray-50 focus:ring-gray-200",
    ghost: "bg-transparent hover:bg-gray-100 text-gray-600 hover:text-gray-900 focus:ring-gray-200"
  };

  const sizes = {
    sm: "px-4 py-2 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-8 py-3.5 text-base",
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