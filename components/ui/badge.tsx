import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-gray-900 text-white',
        secondary: 'border-transparent bg-gray-100 text-gray-700',
        outline: 'border-gray-200 text-gray-700',
        success: 'border-transparent bg-green-50 text-green-700',
        warning: 'border-transparent bg-amber-50 text-amber-700',
        danger: 'border-transparent bg-red-50 text-red-700',
        blue: 'border-transparent bg-blue-50 text-blue-700',
        purple: 'border-transparent bg-purple-50 text-purple-700',
        sky: 'border-transparent bg-sky-50 text-sky-700',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
