import { csvObras, soAdmin } from '@/modules/financeiro/exportar'

/** CSV com a lista de obras e os números de cada uma (só administração). */
export const GET = () => soAdmin((eu, i18n) => csvObras(eu.empresaId, i18n))
