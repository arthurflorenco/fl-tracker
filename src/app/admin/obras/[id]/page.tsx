import Link from 'next/link'
import { getI18n, tituloDaPagina } from '@/i18n/server'
import { notFound } from 'next/navigation'
import { Download, QrCode, Timer } from 'lucide-react'
import { ActionForm, SubmitButton } from '@/components/ui/ActionForm'
import { Badge } from '@/components/ui/Badge'
import { buttonClass } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Info } from '@/components/ui/Info'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Input, Select } from '@/components/ui/Field'
import { PageHeader, SectionTitle } from '@/components/ui/PageHeader'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Tabs } from '@/components/ui/Tabs'
import { SelectEstado } from '@/components/obras/SelectEstado'
import { tomEtapa } from '@/components/obras/estadoTom'
import { NotaRapida } from '@/components/registo/NotaRapida'
import { FotoRapida } from '@/components/registo/FotoRapida'
import { exigirArea } from '@/lib/session'
import { eAdmin, podeEditarRegisto, podeGerirObra, podeVerFinanceiro } from '@/lib/permissions'
import { ResumoObra } from '@/components/financeiro/ResumoObra'
import { obraParaPerfil, responsaveisDaObra } from '@/modules/obras/queries'
import { adicionarResponsavel, removerResponsavel } from '@/modules/obras/actions'
import { etapasDaObra } from '@/modules/etapas/queries'
import { alterarEstadoEtapa } from '@/modules/etapas/actions'
import { elementosDaObra } from '@/modules/elementos/queries'
import { TIPOS_ELEMENTO } from '@/modules/elementos/schema'
import { alterarEstadoElemento, alternarQrElemento, criarElemento } from '@/modules/elementos/actions'
import { minutosPorEtapa, registosDaObra } from '@/modules/tempos/queries'
import { notasDaObra } from '@/modules/notas/queries'
import { TIPOS_NOTA_ALERTA } from '@/modules/notas/schema'
import { marcarNotaResolvida } from '@/modules/notas/actions'
import { fotografiasDaObra } from '@/modules/fotografias/queries'
import { historicoDaObra } from '@/modules/auditoria/queries'
import { listarPerfis, nomeDe } from '@/modules/utilizadores/queries'

export const generateMetadata = tituloDaPagina('obra')

const TABS = ['resumo', 'etapas', 'elementos', 'tempos', 'notas', 'fotografias', 'historico'] as const
type Tab = (typeof TABS)[number]

export default async function ObraPage(props: PageProps<'/admin/obras/[id]'>) {
  const eu = await exigirArea('obras')
  const { t, f } = await getI18n()
  const to = t.obra
  const { id } = await props.params
  const sp = await props.searchParams
  const obra = obraParaPerfil(id, eu)
  if (!obra) notFound()

  const financeiro = podeVerFinanceiro(eu)
  const pedido = TABS.includes(sp.tab as Tab) ? (sp.tab as Tab) : null
  // O separador financeiro só existe para a administração (e é o primeiro para ela).
  const tab: Tab = pedido && (pedido !== 'resumo' || financeiro) ? pedido : financeiro ? 'resumo' : 'etapas'
  const etapas = etapasDaObra(obra.id)
  const elementos = elementosDaObra(obra.id)
  const registos = registosDaObra(obra.id)
  const notas = notasDaObra(obra.id)
  const fotos = fotografiasDaObra(obra.id)
  const gestor = podeGerirObra(eu)
  const responsaveis = responsaveisDaObra(obra.id)
  const candidatos = gestor ? listarPerfis(eu.empresaId).filter((p) => p.ativo && !responsaveis.some((r) => r.perfilId === p.id)) : []
  const base = `/admin/obras/${obra.id}`

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="flex flex-wrap items-center gap-3">
            Obra {obra.codigo}
            {obra.atrasada ? (
              <Badge tom="perigo">{t.obras.atrasada}</Badge>
            ) : (
              <Badge tom="apagado">{t.rotulos.estadoObra[obra.estado]}</Badge>
            )}
          </span>
        }
        titulo={obra.titulo}
        descricao={
          <>
            {obra.cliente?.nome}
            {obra.morada ? ` · ${obra.morada}` : ''} · {to.equipas(obra.equipas.map((e) => e.nome).join(', ') || '—')}
          </>
        }
        acoes={
          <>
            <Link href={`${base}/registar`} data-guia="obra-registar" className={buttonClass()}>
              <Timer size={16} strokeWidth={1.5} /> {to.registar}
            </Link>
            {gestor && (
              <Link href={`${base}/qr`} className={buttonClass({ variant: 'secondary' })}>
                <QrCode size={16} strokeWidth={1.5} /> {to.qr}
              </Link>
            )}
          </>
        }
      />

      <Card className="mb-8 grid gap-5 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <div className="mb-2 flex justify-between text-[12px]">
            <span className="font-normal">{obra.etapaAtual?.nome ?? to.todasConcluidas}</span>
            <span className="text-text-dim">{obra.progresso}%</span>
          </div>
          <ProgressBar valor={obra.progresso} />
        </div>
        <Info label={to.inicio} valor={f.data(obra.dataInicio)} destaque />
        <Info label={to.fimPrevisto} valor={f.data(obra.dataPrevistaFim)} destaque />
        <Info label={to.tempoRegistado} valor={f.duracao(registos.reduce((s, r) => s + (r.duracaoMin ?? 0), 0))} destaque />
        <div className="flex flex-col gap-3 border-t border-line pt-5 sm:col-span-3">
          <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-text-dim">{to.responsaveis}</p>
          <ul className="flex flex-wrap gap-2">
            {responsaveis.length === 0 && <li className="text-[13px] text-text-dim">{to.semResponsaveis}</li>}
            {responsaveis.map((r) => (
              <li key={r.id} className="flex items-center gap-2 border border-line px-3 py-1.5 text-[13px]">
                {r.perfil.nome}
                {gestor && (
                  <form action={removerResponsavel.bind(null, r.id)}>
                    <button type="submit" aria-label={t.comum.removerNome(r.perfil.nome)} className="text-text-dim hover:text-accent">
                      ×
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
          {gestor && candidatos.length > 0 && (
            <ActionForm action={adicionarResponsavel} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="obraId" value={obra.id} />
              <Field label={to.adicionarResponsavel} name="perfilId">
                <Select name="perfilId" defaultValue="">
                  <option value="" disabled>
                    {t.comum.escolherPessoa}
                  </option>
                  {candidatos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </Select>
              </Field>
              <SubmitButton variant="secondary">{t.comum.adicionar}</SubmitButton>
            </ActionForm>
          )}
        </div>
      </Card>

      <Tabs
        base={base}
        atual={tab}
        tabs={[
          ...(financeiro ? [{ id: 'resumo', label: to.tabs.resumo }] : []),
          { id: 'etapas', label: to.tabs.etapas },
          { id: 'elementos', label: to.tabs.elementos, contador: elementos.length },
          { id: 'tempos', label: to.tabs.tempos, contador: registos.length },
          { id: 'notas', label: to.tabs.notas, contador: notas.length },
          { id: 'fotografias', label: to.tabs.fotografias, contador: fotos.length },
          { id: 'historico', label: to.tabs.historico },
        ]}
      />

      {tab === 'resumo' && financeiro && <ResumoObra empresaId={eu.empresaId} obraId={obra.id} etapas={etapas} />}

      {tab === 'etapas' && (
        <Card className="divide-y divide-line p-0 md:p-0">
          {(() => {
            const minutos = minutosPorEtapa(obra.id)
            return etapas.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 p-4 md:px-6">
                <div className="flex min-w-0 items-center gap-4">
                  <span className="w-6 text-[13px] font-bold text-text-dim tabular-nums">{String(e.ordem).padStart(2, '0')}</span>
                  <div className="min-w-0">
                    <p className="text-[15px] font-normal">{e.nome}</p>
                    <p className="text-[12px] text-text-dim">
                      {to.previsto(f.data(e.dataPrevista))}
                      {minutos[e.id] ? to.registados(f.duracao(minutos[e.id])) : ''}
                    </p>
                  </div>
                </div>
                {gestor || eu.papel === 'fabricacao' || eu.papel === 'montagem' ? (
                  <SelectEstado
                    key={e.estado}
                    action={alterarEstadoEtapa}
                    campoId="obraEtapaId"
                    id={e.id}
                    valor={e.estado}
                    opcoes={t.rotulos.estadoEtapa}
                    disabled={e.estado === 'concluida' && !eAdmin(eu)}
                    label={to.estadoDe(e.nome)}
                  />
                ) : (
                  <Badge tom={tomEtapa[e.estado]}>{t.rotulos.estadoEtapa[e.estado]}</Badge>
                )}
              </div>
            ))
          })()}
        </Card>
      )}

      {tab === 'elementos' && (
        <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <div>
            {elementos.length === 0 ? (
              <EmptyState titulo={to.semElementos} texto={to.semElementosTexto} />
            ) : (
              <Card className="divide-y divide-line p-0 md:p-0">
                {elementos.map((el) => (
                  <div key={el.id} className="flex flex-wrap items-center justify-between gap-3 p-4 md:px-6">
                    <div className="flex min-w-0 items-center gap-4">
                      <span className="w-10 text-[14px] font-bold text-accent">{el.referencia}</span>
                      <div className="min-w-0">
                        <p className="text-[14px] font-normal">{el.descricao}</p>
                        <p className="text-[12px] text-text-dim">
                          {t.rotulos.tipoElemento[el.tipo]}
                          {el.divisao ? ` · ${el.divisao}` : ''}
                          {el.qrAtivo ? to.qrAtivo : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {gestor && (
                        <form action={alternarQrElemento.bind(null, el.id)}>
                          <button
                            type="submit"
                            className="text-[11px] font-semibold uppercase tracking-[1.5px] text-text-mid hover:text-accent"
                          >
                            {el.qrAtivo ? to.desativarQr : to.ativarQr}
                          </button>
                        </form>
                      )}
                      <SelectEstado
                        key={el.estado}
                        action={alterarEstadoElemento}
                        campoId="elementoId"
                        id={el.id}
                        valor={el.estado}
                        opcoes={t.rotulos.estadoElemento}
                        label={to.estadoDe(el.referencia)}
                      />
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </div>
          {gestor && (
            <section>
              <SectionTitle>{to.novoElemento}</SectionTitle>
              <Card>
                <ActionForm action={criarElemento} className="flex flex-col gap-4">
                  <input type="hidden" name="obraId" value={obra.id} />
                  <div className="grid grid-cols-[100px_1fr] gap-3">
                    <Field label={to.ref} name="referencia">
                      <Input name="referencia" placeholder="J05" required />
                    </Field>
                    <Field label={to.tipo} name="tipo">
                      <Select name="tipo" defaultValue="janela">
                        {TIPOS_ELEMENTO.map((tipo) => (
                          <option key={tipo} value={tipo}>
                            {t.rotulos.tipoElemento[tipo]}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                  <Field label={to.descricao} name="descricao">
                    <Input name="descricao" placeholder={to.descricaoExemplo} required />
                  </Field>
                  <Field label={to.divisao} name="divisao">
                    <Input name="divisao" placeholder={to.divisaoExemplo} />
                  </Field>
                  <SubmitButton>{t.comum.adicionar}</SubmitButton>
                </ActionForm>
              </Card>
            </section>
          )}
        </div>
      )}

      {tab === 'tempos' && (
        <div className="flex flex-col gap-4">
          {eAdmin(eu) && registos.length > 0 && (
            <div className="flex justify-end">
              <a href={`/admin/obras/${obra.id}/exportar`} download className={buttonClass({ variant: 'secondary', size: 'sm' })}>
                <Download size={16} strokeWidth={1.5} /> {t.obras.exportarCsv}
              </a>
            </div>
          )}
          <Card className="overflow-x-auto p-0 md:p-0">
            {registos.length === 0 ? (
              <p className="p-5 text-[14px] text-text-dim">{to.semTempo}</p>
            ) : (
              <table className="w-full min-w-[640px] text-left text-[13px]">
                <thead className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text-dim">
                  <tr className="border-b border-line">
                    <th className="px-5 py-3 font-semibold">{to.colPessoa}</th>
                    <th className="px-3 py-3 font-semibold">{to.colEtapa}</th>
                    <th className="px-3 py-3 font-semibold">{to.colElemento}</th>
                    <th className="px-3 py-3 font-semibold">{to.colData}</th>
                    <th className="px-3 py-3 text-right font-semibold">{to.colDuracao}</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line font-light">
                  {registos.map((r) => (
                    <tr key={r.id}>
                      <td className="px-5 py-3 font-normal">{r.perfil?.nome}</td>
                      <td className="px-3 py-3">
                        {r.etapa?.nome}
                        {r.atividade ? <span className="text-text-mid"> · {r.atividade.nome}</span> : null}
                      </td>
                      <td className="px-3 py-3 text-text-mid">{r.elemento?.referencia ?? '—'}</td>
                      <td className="px-3 py-3 text-text-mid">
                        {f.data(r.inicio)} {f.hora(r.inicio)}–{r.fim ? f.hora(r.fim) : ''}
                      </td>
                      <td className="px-3 py-3 text-right font-bold">
                        {r.fim ? f.duracao(r.duracaoMin) : <span className="text-accent">{t.comum.emCurso}</span>}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {r.fim && (r.perfilId === eu.id || eAdmin(eu)) && (
                          <Link
                            href={`/admin/tempos/${r.id}`}
                            className="text-[11px] font-semibold uppercase tracking-[1.5px] text-text-mid hover:text-accent"
                          >
                            {podeEditarRegisto(eu, r) ? to.corrigir : t.comum.ver}
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}

      {tab === 'notas' && (
        <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <div className="flex flex-col gap-3">
            {notas.length === 0 && <EmptyState titulo={to.semNotas} />}
            {notas.map((n) => (
              <Card key={n.id} className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Badge
                    tom={TIPOS_NOTA_ALERTA.includes(n.tipo) && !n.resolvida ? 'perigo' : n.tipo === 'conclusao_etapa' ? 'ok' : 'neutro'}
                  >
                    {t.rotulos.tipoNota[n.tipo]}
                    {n.resolvida ? to.resolvida : ''}
                  </Badge>
                  <span className="text-[11px] text-text-dim">
                    {n.autor?.nome} · {f.dataHora(n.criadoEm)}
                  </span>
                </div>
                <p className="text-[15px] font-light">{n.texto}</p>
                <div className="flex flex-wrap items-center justify-between gap-3 text-[12px] text-text-mid">
                  <span>
                    {[n.etapa?.nome, n.elemento ? to.elementoRef(n.elemento.referencia) : null].filter(Boolean).join(' · ') ||
                      to.obraCompleta}
                  </span>
                  {TIPOS_NOTA_ALERTA.includes(n.tipo) && (
                    <form action={marcarNotaResolvida.bind(null, n.id)}>
                      <button type="submit" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-accent">
                        {n.resolvida ? to.reabrir : to.marcarResolvida}
                      </button>
                    </form>
                  )}
                </div>
              </Card>
            ))}
          </div>
          <section>
            <SectionTitle>{to.novaNota}</SectionTitle>
            <Card>
              <NotaRapida
                obraId={obra.id}
                etapas={etapas.map((e) => ({ id: e.id, nome: e.nome }))}
                elementos={elementos.map((e) => ({ id: e.id, referencia: e.referencia, descricao: e.descricao }))}
                obraEtapaId={obra.etapaAtual?.id}
              />
            </Card>
          </section>
        </div>
      )}

      {tab === 'fotografias' && (
        <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <div>
            {fotos.length === 0 ? (
              <EmptyState titulo={to.semFotos} texto={to.semFotosTexto} />
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {fotos.map((foto) => (
                  <figure key={foto.id} className="card-premium bg-dark2">
                    {/* eslint-disable-next-line @next/next/no-img-element -- data URL em modo demonstração; com Supabase passa a next/image com URL assinado */}
                    <img src={foto.caminho} alt={foto.legenda ?? to.fotoDe(obra.codigo)} className="aspect-[4/3] w-full object-cover" />
                    <figcaption className="p-3 text-[11px] text-text-mid">
                      {foto.legenda && <span className="block text-[13px] text-white">{foto.legenda}</span>}
                      {foto.autor?.nome} · {f.dataHora(foto.criadoEm)}
                      {foto.elemento ? ` · ${foto.elemento.referencia}` : ''}
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
          </div>
          <section>
            <SectionTitle>{to.novaFoto}</SectionTitle>
            <Card>
              <FotoRapida obraId={obra.id} obraEtapaId={obra.etapaAtual?.id} />
            </Card>
          </section>
        </div>
      )}

      {tab === 'historico' && (
        <Card data-guia="obra-historico" className="divide-y divide-line p-0 md:p-0">
          {(() => {
            const h = historicoDaObra(obra.id, { financeiro })
            if (h.length === 0) return <p className="p-5 text-[14px] text-text-dim">{to.semHistorico}</p>
            return h.map((e) => (
              <div key={e.id} className="flex flex-col gap-1 p-4 md:px-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[14px] font-normal">{e.resumo}</span>
                  <span className="text-[11px] text-text-dim">{f.dataHora(e.criadoEm)}</span>
                </div>
                <span className="text-[12px] text-text-mid">
                  {nomeDe(e.autorId)}
                  {e.origem !== 'manual' ? to.via(e.origem) : ''}
                  {e.motivo ? to.motivo(e.motivo) : ''}
                </span>
              </div>
            ))
          })()}
        </Card>
      )}
    </>
  )
}
