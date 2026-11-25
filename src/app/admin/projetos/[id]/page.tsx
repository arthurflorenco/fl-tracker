import Link from 'next/link'
import { getI18n, tituloDaPagina } from '@/i18n/server'
import { notFound } from 'next/navigation'
import { ActionForm, SubmitButton } from '@/components/ui/ActionForm'
import { Badge } from '@/components/ui/Badge'
import { buttonClass } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Info } from '@/components/ui/Info'
import { Field, Input, Select } from '@/components/ui/Field'
import { PageHeader, SectionTitle } from '@/components/ui/PageHeader'
import { tomProjeto } from '@/components/obras/tomProjeto'
import { exigirArea } from '@/lib/session'
import { podeGerirProjetos } from '@/lib/permissions'
import { projetoDetalhe } from '@/modules/projetos/queries'
import { ESTADOS_PROJETO } from '@/modules/projetos/schema'
import { alterarEstadoProjeto, converterEmObra } from '@/modules/projetos/actions'
import { listarEquipas } from '@/modules/equipas/queries'
import { etapasModelo } from '@/modules/etapas/queries'
import { historicoGlobal } from '@/modules/auditoria/queries'
import { nomeDe } from '@/modules/utilizadores/queries'

export const generateMetadata = tituloDaPagina('projeto')

export default async function ProjetoPage(props: PageProps<'/admin/projetos/[id]'>) {
  const eu = await exigirArea('projetos')
  const { t, f } = await getI18n()
  const tp = t.projetos
  const { id } = await props.params
  const d = projetoDetalhe(eu.empresaId, id)
  if (!d) notFound()
  const { projeto: p, cliente, responsavel, obra } = d
  const gestor = podeGerirProjetos(eu)
  const equipas = listarEquipas(eu.empresaId).filter((e) => e.tipo !== 'escritorio')
  const historico = historicoGlobal(eu.empresaId).filter((h) => h.entidade === 'projetos' && h.entidadeId === p.id)

  return (
    <>
      <PageHeader
        eyebrow={<Link href="/admin/projetos">{tp.projetoRef(p.referencia)}</Link>}
        titulo={p.titulo}
        descricao={
          <span className="flex flex-wrap items-center gap-3">
            <Badge tom={tomProjeto[p.estado]}>{t.rotulos.estadoProjeto[p.estado]}</Badge>
            {cliente?.nome}
          </span>
        }
        acoes={
          obra && (
            <Link href={`/admin/obras/${obra.id}`} className={buttonClass()}>
              {tp.abrirObra(obra.codigo)}
            </Link>
          )
        }
      />

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-8">
          <Card className="grid gap-5 sm:grid-cols-2">
            <Info label={tp.cliente} valor={cliente?.nome ?? '—'} />
            <Info label={tp.contacto} valor={[cliente?.telefone, cliente?.email].filter(Boolean).join(' · ') || '—'} />
            <Info label={tp.morada} valor={p.morada ?? '—'} />
            <Info label={tp.valorProposta} valor={p.valorProposta != null ? f.euro(p.valorProposta) : '—'} />
            <Info label={tp.responsavel} valor={responsavel?.nome ?? '—'} />
            <Info label={tp.criado} valor={f.data(p.criadoEm)} />
          </Card>

          <section>
            <SectionTitle>{tp.historico}</SectionTitle>
            <Card className="divide-y divide-line p-0 md:p-0">
              {historico.length === 0 && <p className="p-5 text-[14px] text-text-dim">{tp.semHistorico}</p>}
              {historico.map((h) => (
                <div key={h.id} className="p-4 md:px-6">
                  <p className="text-[14px] font-normal">{h.resumo}</p>
                  <p className="text-[12px] text-text-mid">
                    {nomeDe(h.autorId)} · {f.dataHora(h.criadoEm)}
                    {h.motivo ? ` · ${h.motivo}` : ''}
                  </p>
                </div>
              ))}
            </Card>
          </section>
        </div>

        {gestor && !obra && (
          <div className="flex flex-col gap-8">
            <section>
              <SectionTitle>{tp.estadoOrcamento}</SectionTitle>
              <Card>
                <ActionForm key={p.estado} action={alterarEstadoProjeto} resetOnSuccess={false} className="flex flex-col gap-4">
                  <input type="hidden" name="projetoId" value={p.id} />
                  <Field label={tp.estado} name="estado">
                    <Select name="estado" defaultValue={p.estado}>
                      {ESTADOS_PROJETO.map((e) => (
                        <option key={e} value={e}>
                          {t.rotulos.estadoProjeto[e]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label={tp.notaOpcional} name="motivo">
                    <Input name="motivo" placeholder={tp.notaExemplo} />
                  </Field>
                  <SubmitButton variant="secondary">{tp.atualizarEstado}</SubmitButton>
                </ActionForm>
              </Card>
            </section>

            {p.estado === 'aprovado' && (
              <section>
                <SectionTitle>{tp.converter}</SectionTitle>
                <Card>
                  <p className="mb-5 text-[13px] text-text-mid">{tp.converterTexto}</p>
                  <ActionForm action={converterEmObra} resetOnSuccess={false} className="flex flex-col gap-4">
                    <input type="hidden" name="projetoId" value={p.id} />
                    <fieldset>
                      <legend className="mb-2 text-[11px] font-semibold uppercase tracking-[1.5px] text-text-mid">{tp.equipas}</legend>
                      <div className="flex flex-col gap-2">
                        {equipas.map((e) => (
                          <label key={e.id} className="flex items-center gap-3 text-[14px] font-light">
                            <input type="checkbox" name="equipaIds[]" value={e.id} className="h-4 w-4 accent-accent" />
                            {e.nome}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <Field label={tp.fimPrevisto} name="dataPrevistaFim">
                      <Input type="date" name="dataPrevistaFim" />
                    </Field>
                    <details className="group">
                      <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[1.5px] text-text-mid hover:text-accent">
                        {tp.horasPrevistas}
                      </summary>
                      <p className="mt-2 text-[12px] text-text-dim">{tp.horasPrevistasTexto}</p>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        {etapasModelo(eu.empresaId)
                          .filter((e) => e.ativa && e.ordem > 1)
                          .map((e) => (
                            <Field key={e.id} label={e.nome} name={`h_${e.id}`}>
                              <Input name={`h_${e.id}`} type="number" min={0} step={0.5} inputMode="decimal" placeholder="h" />
                            </Field>
                          ))}
                      </div>
                    </details>
                    <SubmitButton>{tp.converter}</SubmitButton>
                  </ActionForm>
                </Card>
              </section>
            )}
          </div>
        )}
      </div>
    </>
  )
}
