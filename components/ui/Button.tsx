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
  const baseStyles = "inline-flex items-center justify-center rounded-full font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";

  const variants = {
    // Primary is now Black to match branding
    primary: "bg-gray-900 hover:bg-gray-800 active:bg-gray-950 text-white shadow-sm hover:shadow-md focus:ring-gray-500 border border-transparent",
    black: "bg-gray-900 hover:bg-gray-800 active:bg-gray-950 text-white shadow-sm hover:shadow-md border border-gray-800 focus:ring-gray-500",
    white: "bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-900 border border-gray-200 shadow-sm hover:shadow focus:ring-gray-300",
    secondary: "bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-900 border border-gray-200 hover:border-gray-300 focus:ring-gray-300",
    outline: "bg-transparent border border-gray-300 text-gray-700 hover:border-gray-900 hover:text-gray-900 hover:bg-gray-50 focus:ring-gray-300",
    ghost: "bg-transparent hover:bg-gray-100 active:bg-gray-200 text-gray-600 hover:text-gray-900 focus:ring-gray-300"
  };

  const sizes = {
    sm: "px-4 py-2 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-8 py-3.5 text-base font-bold",
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