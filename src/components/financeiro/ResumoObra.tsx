import Link from 'next/link'
import { GraficoArea, GraficoBarras, GraficoDonut } from '@/components/graficos/Graficos'
import { ActionForm, SubmitButton } from '@/components/ui/ActionForm'
import { Card } from '@/components/ui/Card'
import { Field, Input, Select } from '@/components/ui/Field'
import { SectionTitle } from '@/components/ui/PageHeader'
import { chaveDia } from '@/lib/format'
import type { ObraEtapa } from '@/modules/etapas/schema'
import { alterarValorContratado, arquivarCustoDireto, definirHorasPrevistas, lancarCustoDireto } from '@/modules/financeiro/actions'
import { custosDiretosDaObra, resumoFinanceiroObra } from '@/modules/financeiro/queries'
import { TIPOS_CUSTO } from '@/modules/financeiro/schema'
import { nomeDe } from '@/modules/utilizadores/queries'
import { BadgeFinanceiro, CartaoGrafico, Kpi } from './Kpi'
import { getI18n } from '@/i18n/server'

const h1 = (min: number) => Math.round(min / 6) / 10

/** Separador "Resumo" da obra (só administração): custo, margem, previsto vs. real. */
export async function ResumoObra({ empresaId, obraId, etapas }: { empresaId: string; obraId: string; etapas: ObraEtapa[] }) {
  const { t, f } = await getI18n()
  const tr = t.resumo
  const r = resumoFinanceiroObra(empresaId, obraId)
  if (!r) return null
  const custos = custosDiretosDaObra(obraId)
  const ativa = r.obra.estado === 'ativa'
  const horas = h1(r.minutos)
  const etapasComDados = r.porEtapa.filter((e) => e.minutos > 0 || e.horasPrevistas)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 text-[13px] text-text-mid">
        <BadgeFinanceiro estado={r.estado} />
        {r.registosEmCurso > 0 && <span>{tr.emCursoNaoContam(r.registosEmCurso)}</span>}
        {r.semCusto.length > 0 && (
          <span className="text-danger">
            {tr.semCustoHora(r.semCusto.map(nomeDe).join(', '))}{' '}
            <Link href="/admin/utilizadores" className="underline">
              {tr.definir}
            </Link>
          </span>
        )}
      </div>

      <section className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-5">
        <Kpi
          label={tr.valorContratado}
          valor={f.euro(r.valorContratado)}
          detalhe={r.euroPorHora ? tr.porHora(f.euro(r.euroPorHora)) : undefined}
        />
        <Kpi
          label={tr.custoAteHoje}
          valor={f.euro(r.custoTotal)}
          detalhe={tr.maoObraDiretos(f.euro(r.custoMaoObra), f.euro(r.custosDiretos))}
        />
        <Kpi
          label={ativa ? tr.margemAtual : tr.margemFinal}
          valor={f.euro(r.margem)}
          tom={(r.margem ?? 0) < 0 ? 'perigo' : 'ok'}
          detalhe={f.pct(r.margemPct)}
        />
        <Kpi
          label={tr.margemProjetada}
          valor={ativa ? f.euro(r.margemProjetada) : '—'}
          tom={ativa && (r.margemProjetada ?? 0) < 0 ? 'perigo' : undefined}
          detalhe={
            ativa
              ? `${tr.custoNoFim(f.euro(r.custoProjetado))}${r.diretosEstimados ? tr.incluiEstimados(f.euro(r.diretosEstimados)) : ''}`
              : tr.obraConcluida
          }
        />
        <Kpi
          label={tr.horas}
          valor={f.horas(horas)}
          tom={r.horasPrevistas != null && horas > r.horasPrevistas ? 'perigo' : undefined}
          detalhe={
            r.horasPrevistas != null
              ? tr.dePrevistas(f.horas(r.horasPrevistas), f.pct(((horas - r.horasPrevistas) / r.horasPrevistas) * 100, { sinal: true }))
              : tr.semPrevistas
          }
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <CartaoGrafico titulo={tr.previstoVsReal} subtitulo={tr.previstoVsRealSub}>
          {etapasComDados.length ? (
            <>
              <GraficoBarras
                dados={etapasComDados.map((e) => ({ etapa: e.nome, previsto: e.horasPrevistas, real: h1(e.minutos) }))}
                x="etapa"
                horizontal
                formato="horas"
                series={[
                  { chave: 'previsto', label: tr.previsto, cor: 'var(--serie-2)' },
                  { chave: 'real', label: tr.real, cor: 'var(--accent)' },
                ]}
              />
              <ul className="flex flex-wrap gap-x-5 gap-y-1 text-[12px]">
                {etapasComDados
                  .filter((e) => e.desvioPct != null && (e.excedida || e.risco))
                  .map((e) => (
                    <li key={e.id} className={e.excedida ? 'text-danger' : 'text-accent'}>
                      {e.nome}: {f.pct(e.desvioPct, { sinal: true })}
                      {e.risco && !e.excedida ? tr.pertoDoLimite : ''}
                    </li>
                  ))}
              </ul>
            </>
          ) : (
            <p className="text-[13px] text-text-dim">{tr.semHorasNemPrevistas}</p>
          )}
        </CartaoGrafico>

        <CartaoGrafico titulo={tr.custoAcumulado} subtitulo={tr.custoAcumuladoSub}>
          {r.serie.length ? (
            <GraficoArea
              dados={r.serie}
              x="dia"
              formatoX="dia"
              formato="euro"
              empilhado
              referencia={r.valorContratado != null ? { valor: r.valorContratado, label: tr.valorContratado } : undefined}
              series={[
                { chave: 'diretos', label: tr.custosDiretos, cor: 'var(--serie-2)' },
                { chave: 'maoObra', label: tr.maoObra, cor: 'var(--accent)' },
              ]}
            />
          ) : (
            <p className="text-[13px] text-text-dim">{tr.semCustos}</p>
          )}
        </CartaoGrafico>

        <CartaoGrafico titulo={tr.horasECustoPorPessoa}>
          {r.pessoas.length ? (
            <>
              <GraficoBarras
                dados={r.pessoas.map((p) => ({ pessoa: p.nome, horas: h1(p.minutos) }))}
                x="pessoa"
                horizontal
                formato="horas"
                series={[{ chave: 'horas', label: tr.horas }]}
              />
              <div className="divide-y divide-line text-[13px]">
                {r.pessoas.map((p) => (
                  <div key={p.perfilId} className="flex justify-between gap-3 py-2">
                    <span>{p.nome}</span>
                    <span className="tabular-nums text-text-mid">
                      {f.horas(h1(p.minutos))} · <span className="text-white">{f.euro(p.custo)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-[13px] text-text-dim">{tr.semHoras}</p>
          )}
        </CartaoGrafico>

        <CartaoGrafico titulo={tr.custosPorTipo} subtitulo={tr.total(f.euro(r.custoTotal))}>
          <GraficoDonut
            dados={[
              { chave: 'maoObra', label: tr.maoObra, valor: Math.round(r.custoMaoObra) },
              ...TIPOS_CUSTO.filter((tipo) => r.porTipo[tipo]).map((tipo) => ({
                chave: tipo,
                label: t.rotulos.tipoCusto[tipo],
                valor: Math.round(r.porTipo[tipo]),
              })),
            ]}
          />
        </CartaoGrafico>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <SectionTitle>{tr.custosDiretos}</SectionTitle>
          <Card className="divide-y divide-line p-0 md:p-0">
            {custos.length === 0 && <p className="p-5 text-[14px] text-text-dim">{tr.semCustosLancados}</p>}
            {custos.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4 md:px-6">
                <div className="min-w-0">
                  <p className="text-[14px] font-normal">{c.descricao}</p>
                  <p className="text-[12px] text-text-dim">
                    {t.rotulos.tipoCusto[c.tipo]} · {f.data(c.data)} · {nomeDe(c.autorId)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[15px] font-bold tabular-nums">{f.euro(c.valor, { cent: true })}</span>
                  <form action={arquivarCustoDireto.bind(null, c.id)}>
                    <button type="submit" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-text-mid hover:text-accent">
                      {tr.arquivar}
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </Card>
        </section>

        <div className="flex flex-col gap-8">
          <section>
            <SectionTitle>{tr.lancarCusto}</SectionTitle>
            <Card>
              <ActionForm action={lancarCustoDireto} className="flex flex-col gap-4">
                <input type="hidden" name="obraId" value={obraId} />
                <Field label={tr.tipo} name="tipo">
                  <Select name="tipo" defaultValue="materiais">
                    {TIPOS_CUSTO.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {t.rotulos.tipoCusto[tipo]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={tr.descricao} name="descricao">
                  <Input name="descricao" placeholder={tr.descricaoExemplo} required />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={tr.valorEuro} name="valor">
                    <Input name="valor" inputMode="decimal" placeholder="0,00" required />
                  </Field>
                  <Field label={tr.data} name="data">
                    <Input name="data" type="date" defaultValue={chaveDia(new Date())} required />
                  </Field>
                </div>
                <SubmitButton>{tr.lancar}</SubmitButton>
              </ActionForm>
            </Card>
          </section>

          <section>
            <SectionTitle>{tr.valorContratado}</SectionTitle>
            <Card>
              <ActionForm action={alterarValorContratado} resetOnSuccess={false} className="flex flex-col gap-4">
                <input type="hidden" name="obraId" value={obraId} />
                <Field label={tr.valorEuro} name="valor">
                  <Input name="valor" inputMode="decimal" defaultValue={r.valorContratado ?? ''} required />
                </Field>
                <Field label={tr.motivoAlteracao} name="motivo">
                  <Input name="motivo" placeholder={tr.motivoExemplo} />
                </Field>
                <SubmitButton variant="secondary">{tr.atualizar}</SubmitButton>
              </ActionForm>
            </Card>
          </section>
        </div>
      </div>

      <section className="mt-6">
        <SectionTitle>{tr.horasPrevistasPorEtapa}</SectionTitle>
        <Card>
          <ActionForm action={definirHorasPrevistas} resetOnSuccess={false} className="flex flex-col gap-4">
            <input type="hidden" name="obraId" value={obraId} />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {etapas.map((e) => {
                const real = r.porEtapa.find((x) => x.id === e.id)
                return (
                  <Field key={e.id} label={e.nome} name={`h_${e.id}`}>
                    <Input
                      name={`h_${e.id}`}
                      type="number"
                      min={0}
                      step={0.5}
                      inputMode="decimal"
                      defaultValue={e.horasPrevistas ?? ''}
                      placeholder={real?.minutos ? tr.realHoras(f.horas(h1(real.minutos))) : 'h'}
                    />
                  </Field>
                )
              })}
            </div>
            <div>
              <SubmitButton variant="secondary">{tr.guardarPrevisoes}</SubmitButton>
            </div>
          </ActionForm>
        </Card>
      </section>
    </div>
  )
}
