import { ActionForm, SubmitButton } from '@/components/ui/ActionForm'
import { getI18n, tituloDaPagina } from '@/i18n/server'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Field'
import { PageHeader, SectionTitle } from '@/components/ui/PageHeader'
import { exigirArea } from '@/lib/session'
import { atividadesDe, etapasModelo } from '@/modules/etapas/queries'
import { alternarEtapaModelo, criarAtividade, criarEtapaModelo } from '@/modules/etapas/actions'

export const generateMetadata = tituloDaPagina('etapas')

export default async function EtapasPage() {
  const eu = await exigirArea('definicoes')
  const { t } = await getI18n()
  const td = t.definicoes
  const etapas = etapasModelo(eu.empresaId)
  return (
    <>
      <PageHeader eyebrow={td.eyebrow} titulo={td.titulo} descricao={td.descricao} />
      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-3">
          {etapas.map((e) => (
            <Card key={e.id} className={`flex flex-col gap-4 ${e.ativa ? '' : 'opacity-50'}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[16px] font-bold">
                  <span className="mr-3 text-text-dim tabular-nums">{String(e.ordem).padStart(2, '0')}</span>
                  {e.nome}
                </p>
                <div className="flex gap-4 text-[11px] font-semibold uppercase tracking-[1.5px]">
                  <form action={alternarEtapaModelo.bind(null, e.id, 'visivelCliente')}>
                    <button type="submit" className={e.visivelCliente ? 'text-accent' : 'text-text-dim hover:text-white'}>
                      {e.visivelCliente ? td.visivelCliente : td.soInterna}
                    </button>
                  </form>
                  <form action={alternarEtapaModelo.bind(null, e.id, 'ativa')}>
                    <button type="submit" className="text-text-mid hover:text-accent">
                      {e.ativa ? td.desativar : td.ativar}
                    </button>
                  </form>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {atividadesDe(e.id).map((a) => (
                  <span key={a.id} className="bg-dark3 px-2.5 py-1 text-[12px] font-light">
                    {a.nome}
                  </span>
                ))}
              </div>
              <ActionForm action={criarAtividade} className="flex gap-2">
                <input type="hidden" name="etapaModeloId" value={e.id} />
                <Input
                  name="nome"
                  placeholder={td.novaAtividade}
                  aria-label={td.novaAtividadeEm(e.nome)}
                  className="py-2 text-[13px]"
                  required
                />
                <SubmitButton size="sm" variant="secondary" pendente="…">
                  {t.comum.adicionar}
                </SubmitButton>
              </ActionForm>
            </Card>
          ))}
        </div>
        <section>
          <SectionTitle>{td.novaEtapa}</SectionTitle>
          <Card>
            <ActionForm action={criarEtapaModelo} className="flex flex-col gap-4">
              <Field label={td.nome} name="nome">
                <Input name="nome" required />
              </Field>
              <label className="flex items-center gap-3 text-[14px] font-light">
                <input type="checkbox" name="visivelCliente" defaultChecked className="h-4 w-4 accent-accent" />
                {td.visivelCliente}
              </label>
              <SubmitButton>{td.criarEtapa}</SubmitButton>
            </ActionForm>
          </Card>
        </section>
      </div>
    </>
  )
}
