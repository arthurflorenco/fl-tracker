import Link from 'next/link'
import { getI18n, tituloDaPagina } from '@/i18n/server'
import { ScanLine } from 'lucide-react'
import { ObraCard } from '@/components/obras/ObraCard'
import { buttonClass } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader, SectionTitle } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { exigirSessao } from '@/lib/session'
import { podeGerirProjetos, podeVerFinanceiro } from '@/lib/permissions'
import { PainelEmpresa } from '@/components/financeiro/PainelEmpresa'
import { Segmentos } from '@/components/financeiro/Kpi'
import { PERIODOS, type Periodo } from '@/modules/financeiro/schema'
import { obrasVisiveis } from '@/modules/obras/queries'
import { listarProjetos } from '@/modules/projetos/queries'
import { minutosHoje, registosEmCurso } from '@/modules/tempos/queries'
import { alertasAbertos } from '@/modules/notas/queries'
import { TempoDecorrido } from '@/components/registo/TempoDecorrido'

export const generateMetadata = tituloDaPagina('painel')

export default async function Painel(props: PageProps<'/admin'>) {
  const eu = await exigirSessao()
  const { t, f } = await getI18n()
  const financeiro = podeVerFinanceiro(eu)
  const sp = await props.searchParams
  const periodo: Periodo = PERIODOS.includes(sp.periodo as Periodo) ? (sp.periodo as Periodo) : '90d'
  const obras = obrasVisiveis(eu).filter((o) => o.estado === 'ativa')
  const ids = obras.map((o) => o.id)
  const emCurso = registosEmCurso(ids)
  const alertas = alertasAbertos(ids)
  const emOrcamento = podeGerirProjetos(eu) ? listarProjetos(eu.empresaId).filter((p) => !p.obraId && p.estado !== 'recusado') : null
  const primeiroNome = eu.nome.split(' ')[0]

  const kpis = [
    { label: t.painel.obrasEmCurso, valor: String(obras.length) },
    { label: t.painel.atrasadas, valor: String(obras.filter((o) => o.atrasada).length), alerta: obras.some((o) => o.atrasada) },
    { label: t.painel.aTrabalharAgora, valor: String(emCurso.length) },
    emOrcamento
      ? { label: t.painel.emOrcamento, valor: String(emOrcamento.length) }
      : { label: t.painel.horasHoje, valor: f.duracao(minutosHoje(ids)) },
  ]

  return (
    <>
      <PageHeader
        eyebrow={t.painel.ola(primeiroNome)}
        titulo={t.titulos.painel}
        acoes={
          <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto">
            <Link href="/admin/ler-qr" className={buttonClass({ variant: 'secondary', className: 'px-3' })}>
              <ScanLine size={16} strokeWidth={1.5} /> {t.painel.lerQr}
            </Link>
            <Link href="/admin/registar" className={buttonClass({ className: 'px-3 text-center' })}>
              {t.painel.registarTrabalho}
            </Link>
          </div>
        }
      />

      {financeiro && (
        <>
          <div className="-mt-2 mb-6 flex justify-end">
            <Segmentos
              atual={periodo}
              opcoes={PERIODOS.map((p) => ({ id: p, label: t.rotulos.periodo[p], href: `/admin?periodo=${p}` }))}
            />
          </div>
          <PainelEmpresa empresaId={eu.empresaId} periodo={periodo} />
        </>
      )}

      {!financeiro && (
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {kpis.map((k) => (
            <Card key={k.label} className="flex flex-col gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text-dim">{k.label}</p>
              <p className={`text-[32px] font-bold leading-none tracking-[-1px] md:text-[40px] ${k.alerta ? 'text-danger' : ''}`}>
                {k.valor}
              </p>
            </Card>
          ))}
        </section>
      )}

      <section className="mt-12" data-guia="painel-obras">
        <SectionTitle
          acoes={
            <Link href="/admin/obras" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-accent">
              {t.painel.verTodas}
            </Link>
          }
        >
          {t.painel.obrasEmCurso}
        </SectionTitle>
        {obras.length === 0 ? (
          <EmptyState titulo={t.painel.semObras} texto={t.painel.semObrasTexto} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {obras.slice(0, 6).map((o) => (
              <ObraCard key={o.id} obra={o} />
            ))}
          </div>
        )}
      </section>

      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <section>
          <SectionTitle>{t.painel.aTrabalharAgora}</SectionTitle>
          <Card className="divide-y divide-line p-0 md:p-0">
            {emCurso.length === 0 && <p className="p-5 text-[14px] text-text-dim">{t.painel.ninguemATrabalhar}</p>}
            {emCurso.map((r) => (
              <Link
                key={r.id}
                href={`/admin/obras/${r.obraId}?tab=tempos`}
                className="flex items-center justify-between gap-4 p-4 hover:bg-dark3 md:px-5"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-normal">{r.perfil?.nome}</span>
                  <span className="block truncate text-[12px] text-text-mid">
                    {r.obra?.codigo} · {r.etapa?.nome}
                    {r.atividade ? ` · ${r.atividade.nome}` : ''}
                  </span>
                </span>
                <TempoDecorrido comecou={r.criadoEm} desde={r.inicio} className="shrink-0 text-[13px] font-bold tabular-nums text-accent" />
              </Link>
            ))}
          </Card>
        </section>

        <section>
          <SectionTitle>{t.painel.problemasEmAberto}</SectionTitle>
          <Card className="divide-y divide-line p-0 md:p-0">
            {alertas.length === 0 && <p className="p-5 text-[14px] text-text-dim">{t.painel.semProblemas}</p>}
            {alertas.slice(0, 6).map((n) => (
              <Link key={n.id} href={`/admin/obras/${n.obraId}?tab=notas`} className="flex flex-col gap-2 p-4 hover:bg-dark3 md:px-5">
                <span className="flex items-center justify-between gap-3">
                  <Badge tom={n.tipo === 'atraso' || n.tipo === 'nao_conformidade' ? 'perigo' : 'destaque'}>
                    {t.rotulos.tipoNota[n.tipo]}
                  </Badge>
                  <span className="text-[11px] text-text-dim">
                    {n.obra.codigo} · {f.dataHora(n.criadoEm)}
                  </span>
                </span>
                <span className="line-clamp-2 text-[14px] font-light">{n.texto}</span>
              </Link>
            ))}
          </Card>
        </section>
      </div>
    </>
  )
}
