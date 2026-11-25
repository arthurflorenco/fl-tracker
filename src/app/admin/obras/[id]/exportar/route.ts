import { csvRegistosObra, soAdmin } from '@/modules/financeiro/exportar'

/** CSV com os registos de tempo da obra (só administração). */
export async function GET(_: Request, ctx: RouteContext<'/admin/obras/[id]/exportar'>) {
  const { id } = await ctx.params
  return soAdmin((eu, i18n) => csvRegistosObra(eu.empresaId, id, i18n))
}
