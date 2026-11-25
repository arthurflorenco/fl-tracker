import Link from 'next/link'
import { getI18n, tituloDaPagina } from '@/i18n/server'
import { notFound } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { PageHeader, SectionTitle } from '@/components/ui/PageHeader'
import { ModoRegisto } from '@/components/registo/ModoRegisto'
import { NotaRapida } from '@/components/registo/NotaRapida'
import { FotoRapida } from '@/components/registo/FotoRapida'
import { exigirArea } from '@/lib/session'
import { obraParaPerfil } from '@/modules/obras/queries'
import { atividadesPorObraEtapa, etapasDaObra } from '@/modules/etapas/queries'
import { elementosDaObra } from '@/modules/elementos/queries'
import { registoAtivo, relogioDoPerfil } from '@/modules/tempos/queries'

export const generateMetadata = tituloDaPagina('registar')

export default async function RegistarObraPage(props: PageProps<'/admin/obras/[id]/registar'>) {
  const eu = await exigirArea('registar')
  const { t } = await getI18n()
  const { id } = await props.params
  const { elemento } = await props.searchParams
  const obra = obraParaPerfil(id, eu)
  if (!obra) notFound()

  const etapas = etapasDaObra(obra.id)
  const elementos = elementosDaObra(obra.id)
  const ativo = registoAtivo(eu.id)
  const elementoSugerido = typeof elemento === 'string' && elementos.some((e) => e.id === elemento) ? elemento : null
  const etapaContexto = ativo?.obraId === obra.id ? ativo.obraEtapaId : (obra.etapaAtual?.id ?? null)
  const elementoContexto = ativo?.obraId === obra.id ? ativo.elementoId : elementoSugerido

  return (
    <>
      <PageHeader
        eyebrow={<Link href={`/admin/obras/${obra.id}`}>{t.comum.obraCodigo(obra.codigo)} ←</Link>}
        titulo={obra.titulo}
        descricao={`${obra.cliente?.nome ?? ''} · ${eu.nome}`}
      />
      <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <ModoRegisto
          obraId={obra.id}
          etapas={etapas.map((e) => ({ id: e.id, nome: e.nome, estado: e.estado }))}
          atividadesPorEtapa={Object.fromEntries(
            Object.entries(atividadesPorObraEtapa(obra.id)).map(([k, v]) => [k, v.map((a) => ({ id: a.id, nome: a.nome }))]),
          )}
          elementos={elementos.map((e) => ({ id: e.id, referencia: e.referencia, descricao: e.descricao }))}
          etapaSugerida={obra.etapaAtual?.id ?? null}
          elementoSugerido={elementoSugerido}
          relogio={relogioDoPerfil(eu.id)}
          ativo={
            ativo
              ? {
                  id: ativo.id,
                  inicio: ativo.inicio,
                  criadoEm: ativo.criadoEm,
                  obraId: ativo.obraId,
                  obraCodigo: ativo.obra?.codigo ?? '',
                  etapa: ativo.etapa?.nome ?? '',
                  atividade: ativo.atividade?.nome ?? null,
                  elemento: ativo.elemento?.referencia ?? null,
                }
              : null
          }
        />
        <div className="flex flex-col gap-8" data-guia="registo-nota">
          <section>
            <SectionTitle>{t.registar.notaOuProblema}</SectionTitle>
            <Card>
              <NotaRapida obraId={obra.id} obraEtapaId={etapaContexto} elementoId={elementoContexto} />
            </Card>
          </section>
          <section>
            <SectionTitle>{t.registar.fotografia}</SectionTitle>
            <Card>
              <FotoRapida obraId={obra.id} obraEtapaId={etapaContexto} elementoId={elementoContexto} />
            </Card>
          </section>
        </div>
      </div>
    </>
  )
}
