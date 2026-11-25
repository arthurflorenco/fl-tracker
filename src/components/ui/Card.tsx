import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/** Cartão: superfície dark2 com contorno interno e brilho de destaque suave (.card-premium). */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('card-premium bg-dark2 p-5 md:p-6', className)} {...props} />
}
