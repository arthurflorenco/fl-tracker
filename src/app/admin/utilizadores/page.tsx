import Link from 'next/link'
import { getI18n, tituloDaPagina } from '@/i18n/server'
import { ChevronRight, Download } from 'lucide-react'
import { ActionForm, SubmitButton } from '@/components/ui/ActionForm'
import { Badge } from '@/components/ui/Badge'
import { buttonClass } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input, Select } from '@/components/ui/Field'
import { PageHeader, SectionTitle } from '@/components/ui/PageHeader'
import { exigirArea } from '@/lib/session'
import { listarPerfis } from '@/modules/utilizadores/queries'
import { PAPEIS_FASE1 } from '@/modules/utilizadores/schema'
import { alternarUtilizadorAtivo, criarUtilizador } from '@/modules/utilizadores/actions'
import { equipaPorId, listarEquipas } from '@/modules/equipas/queries'
import { definirCustoHora } from '@/modules/financeiro/actions'
import { custoHoraAtualDe, historicoCustoHora } from '@/modules/financeiro/queries'
import { chaveDia } from '@/lib/format'

export const generateMetadata = tituloDaPagina('utilizadores')

export default async function UtilizadoresPage() {
  const eu = await exigirArea('utilizadores')
  const { t, f } = await getI18n()
  const tu = t.utilizadores
  const perfis = listarPerfis(eu.empresaId)
  const equipas = listarEquipas(eu.empresaId)

  return (
    <>
      <PageHeader
        eyebrow={tu.eyebrow}
        titulo={t.titulos.utilizadores}
        descricao={tu.descricao}
        acoes={
          <a href="/admin/utilizadores/exportar?periodo=90d" download className={buttonClass({ variant: 'secondary', size: 'sm' })}>
            <Download size={16} strokeWidth={1.5} /> {t.obras.exportarCsv}
          </a>
        }
      />
      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <Card className="divide-y divide-line p-0 md:p-0">
          {perfis.map((p) => (
            <div key={p.id} className={`flex flex-wrap items-center justify-between gap-3 p-4 md:px-6 ${p.ativo ? '' : 'opacity-50'}`}>
              <Link href={`/admin/utilizadores/${p.id}`} className="group flex min-w-0 flex-1 items-center gap-2">
                <span className="min-w-0">
                  <span className="block text-[15px] font-normal group-hover:text-accent">{p.nome}</span>
                  <span className="block text-[12px] text-text-mid">
                    {p.email} · {equipaPorId(p.equipaId)?.nome ?? t.comum.semEquipa}
                  </span>
                </span>
                <ChevronRight size={16} strokeWidth={1.5} className="shrink-0 text-text-dim group-hover:text-accent" />
              </Link>
              <div className="flex items-center gap-4">
                <span className="text-[13px] font-bold tabular-nums" title={tu.custoHoraAtual}>
                  {custoHoraAtualDe(p.id) != null ? (
                    tu.porHora(f.euro(custoHoraAtualDe(p.id), { cent: true }))
                  ) : (
                    <span className="font-normal text-danger">{tu.semCustoHora}</span>
                  )}
                </span>
                <Badge tom={p.papel === 'admin' ? 'destaque' : 'neutro'}>{t.rotulos.papel[p.papel]}</Badge>
                {p.id !== eu.id && (
                  <form action={alternarUtilizadorAtivo.bind(null, p.id)}>
                    <button type="submit" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-text-mid hover:text-accent">
                      {p.ativo ? tu.desativar : tu.reativar}
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </Card>
        <div className="flex flex-col gap-8">
          <section>
            <SectionTitle>{tu.custoPorHora}</SectionTitle>
            <Card>
              <ActionForm action={definirCustoHora} className="flex flex-col gap-4">
                <Field label={tu.pessoa} name="perfilId">
                  <Select name="perfilId" defaultValue="">
                    <option value="" disabled>
                      {tu.escolha}
                    </option>
                    {perfis
                      .filter((p) => p.ativo)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome}
                        </option>
                      ))}
                  </Select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={tu.euroPorHora} name="valor">
                    <Input name="valor" inputMode="decimal" placeholder="15,50" required />
                  </Field>
                  <Field label={tu.aPartirDe} name="desde">
                    <Input name="desde" type="date" defaultValue={chaveDia(new Date())} required />
                  </Field>
                </div>
                <SubmitButton>{t.comum.guardar}</SubmitButton>
                <p className="text-[12px] text-text-dim">{tu.custoTexto}</p>
              </ActionForm>
            </Card>
            <details className="mt-3">
              <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[1.5px] text-text-mid hover:text-accent">
                {tu.historicoCustos}
              </summary>
              <Card className="mt-3 divide-y divide-line p-0 md:p-0">
                {perfis.flatMap((p) =>
                  historicoCustoHora(p.id).map((c) => (
                    <div key={c.id} className="flex justify-between gap-3 px-4 py-2.5 text-[13px] md:px-5">
                      <span>{p.nome}</span>
                      <span className="tabular-nums text-text-mid">{tu.desde(f.euro(c.valor, { cent: true }), f.data(c.desde))}</span>
                    </div>
                  )),
                )}
              </Card>
            </details>
          </section>
          <section>
            <SectionTitle>{tu.novo}</SectionTitle>
            <Card>
              <ActionForm action={criarUtilizador} className="flex flex-col gap-4">
                <Field label={tu.nome} name="nome">
                  <Input name="nome" required />
                </Field>
                <Field label={tu.email} name="email">
                  <Input name="email" type="email" required />
                </Field>
                <Field label={tu.papel} name="papel">
                  <Select name="papel" defaultValue="montagem">
                    {PAPEIS_FASE1.map((p) => (
                      <option key={p} value={p}>
                        {t.rotulos.papel[p]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={tu.equipa} name="equipaId">
                  <Select name="equipaId" defaultValue="">
                    <option value="">{t.comum.semEquipa}</option>
                    {equipas.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.nome}
                      </option>
                    ))}
                  </Select>
                </Field>
                <SubmitButton>{t.comum.adicionar}</SubmitButton>
                <p className="text-[12px] text-text-dim">{tu.conviteTexto}</p>
              </ActionForm>
            </Card>
          </section>
        </div>
      </div>
    </>
  )
}
