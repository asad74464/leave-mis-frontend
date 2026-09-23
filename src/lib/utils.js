import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Standard shadcn helper: clsx resolves conditional classes, twMerge
// resolves conflicts (e.g. "px-2 px-4" -> "px-4") so component consumers
// can override default classes by passing a className prop.
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
