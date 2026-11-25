import type { Tom } from '@/components/ui/Badge'
import type { EstadoEtapa } from '@/modules/etapas/schema'

export const tomEtapa: Record<EstadoEtapa, Tom> = { por_iniciar: 'apagado', em_curso: 'destaque', bloqueada: 'perigo', concluida: 'ok' }
