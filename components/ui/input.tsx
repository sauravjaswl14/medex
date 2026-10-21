import * as React from 'react';
import { cn } from '@/lib/utils';
export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn('flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600 disabled:opacity-50', className)} {...props} />;
});
