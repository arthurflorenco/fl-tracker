'use client'
import { Printer } from 'lucide-react'
import { Button } from './Button'
import { useI18n } from '@/i18n/client'

export function PrintButton() {
  const { t } = useI18n()
  return (
    <Button onClick={() => window.print()}>
      <Printer size={16} strokeWidth={1.5} /> {t.comum.imprimir}
    </Button>
  )
}
