import { csvRegistosPessoa, soAdmin } from '@/modules/financeiro/exportar'

/** CSV com todos os registos de tempo da pessoa (só administração). */
export async function GET(_: Request, ctx: RouteContext<'/admin/utilizadores/[id]/exportar'>) {
  const { id } = await ctx.params
  return soAdmin((eu, i18n) => csvRegistosPessoa(eu.empresaId, id, i18n))
}
