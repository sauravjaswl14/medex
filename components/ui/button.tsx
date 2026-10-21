import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean; variant?: 'default' | 'outline' | 'ghost' };
export function Button({ className, asChild = false, variant = 'default', ...props }: Props) {
  const Component = asChild ? Slot : 'button';
  return <Component className={cn('inline-flex min-h-10 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:pointer-events-none disabled:opacity-50', variant === 'default' ? 'bg-teal-700 text-white hover:bg-teal-800' : variant === 'outline' ? 'border border-slate-300 bg-white hover:bg-slate-50' : 'hover:bg-slate-100', className)} {...props} />;
}
