import { csvUtilizadores, lerPeriodo, soAdmin } from '@/modules/financeiro/exportar'

/** CSV com as pessoas, custo/hora e horas no período (`?periodo=`; só administração). */
export const GET = (req: Request) => soAdmin((eu, i18n) => csvUtilizadores(eu.empresaId, lerPeriodo(req.url), i18n))
