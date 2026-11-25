import type { Tom } from '@/components/ui/Badge'
import type { EstadoProjeto } from '@/modules/projetos/schema'

export const tomProjeto: Record<EstadoProjeto, Tom> = {
  pedido: 'apagado',
  medicao: 'neutro',
  proposta: 'destaque',
  em_revisao: 'destaque',
  aprovado: 'ok',
  recusado: 'perigo',
}
