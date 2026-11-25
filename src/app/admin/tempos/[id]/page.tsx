import Link from 'next/link'
import { getI18n, tituloDaPagina } from '@/i18n/server'
import { notFound } from 'next/navigation'
import { ActionForm, SubmitButton } from '@/components/ui/ActionForm'
import { Card } from '@/components/ui/Card'
import { Info } from '@/components/ui/Info'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { exigirSessao } from '@/lib/session'
import { eAdmin, podeEditarRegisto, mesmaEmpresa } from '@/lib/permissions'
import { isoParaInputLisboa } from '@/lib/format'
import { registoPorId } from '@/modules/tempos/queries'
import { arquivarTempo, corrigirTempo } from '@/modules/tempos/actions'

export const generateMetadata = tituloDaPagina('registo')

export default async function TempoPage(props: PageProps<'/admin/tempos/[id]'>) {
  const eu = await exigirSessao()
  const { t, f } = await getI18n()
  const tt = t.tempo
  const { id } = await props.params
  const r = registoPorId(id)
  if (!r || !mesmaEmpresa(eu, r) || (r.perfilId !== eu.id && !eAdmin(eu))) notFound()

  const admin = eAdmin(eu)
  const arquivado = !!r.arquivadoEm
  const direto = !arquivado && podeEditarRegisto(eu, r)
  // Registo em curso: só a administração o fecha aqui (o próprio termina no ecrã de registo).
  const fechar = !arquivado && !r.fim && admin

  return (
    <>
      <PageHeader
        eyebrow={<Link href={`/admin/obras/${r.obraId}?tab=tempos`}>{t.comum.obraCodigo(r.obra?.codigo ?? '')} ←</Link>}
        titulo={tt.titulo}
        descricao={`${r.perfil?.nome} · ${r.etapa?.nome}${r.atividade ? ` · ${r.atividade.nome}` : ''}${r.elemento ? ` · ${r.elemento.referencia}` : ''}`}
      />
      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="grid grid-cols-2 gap-5">
          <Info label={tt.inicio} valor={f.dataHora(r.inicio)} destaque />
          <Info label={tt.fim} valor={f.dataHora(r.fim)} destaque />
          <Info label={tt.duracao} valor={f.duracao(r.duracaoMin)} destaque />
          <Info label={tt.origem} valor={r.origem === 'manual' ? tt.manual : r.origem} destaque />
          {r.nota && <p className="col-span-2 text-[14px] text-text-mid">“{r.nota}”</p>}
          {arquivado && <p className="col-span-2 text-[13px] text-danger">{tt.arquivadoEm(f.dataHora(r.arquivadoEm))}</p>}
        </Card>

        {fechar && (
          <Card>
            <p className="mb-1 text-[12px] font-semibold uppercase tracking-[1.5px] text-accent">{tt.terminarRegisto}</p>
            <p className="mb-5 text-[13px] text-text-mid">{tt.terminarTexto}</p>
            <ActionForm action={corrigirTempo} resetOnSuccess={false} className="flex flex-col gap-4">
              <input type="hidden" name="registoId" value={r.id} />
              <input type="hidden" name="inicio" value={isoParaInputLisboa(r.inicio)} />
              <Field label={tt.terminouAs} name="fim">
                <Input type="datetime-local" name="fim" step={900} required />
              </Field>
              <Field label={tt.motivo} name="motivo">
                <Textarea name="motivo" rows={2} required placeholder={tt.motivoTerminarExemplo} />
              </Field>
              <SubmitButton>{tt.terminarRegisto}</SubmitButton>
            </ActionForm>
          </Card>
        )}

        {r.fim && !arquivado && !direto && (
          <Card>
            <p className="mb-1 text-[12px] font-semibold uppercase tracking-[1.5px] text-text-dim">{tt.fechado}</p>
            <p className="text-[14px] text-text-mid">{tt.fechadoTexto}</p>
          </Card>
        )}

        {r.fim && direto && (
          <Card>
            <p className="mb-1 text-[12px] font-semibold uppercase tracking-[1.5px] text-accent">{tt.corrigir}</p>
            <p className="mb-5 text-[13px] text-text-mid">{admin ? tt.corrigirAdmin : tt.corrigirProprio}</p>
            <ActionForm action={corrigirTempo} resetOnSuccess={false} className="flex flex-col gap-4">
              <input type="hidden" name="registoId" value={r.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={tt.inicio} name="inicio">
                  <Input type="datetime-local" name="inicio" step={900} defaultValue={isoParaInputLisboa(r.inicio)} required />
                </Field>
                <Field label={tt.fim} name="fim">
                  <Input type="datetime-local" name="fim" step={900} defaultValue={isoParaInputLisboa(r.fim)} required />
                </Field>
              </div>
              <Field label={tt.motivo} name="motivo">
                <Textarea name="motivo" rows={2} required placeholder={tt.motivoCorrigirExemplo} />
              </Field>
              <SubmitButton>{tt.guardarCorrecao}</SubmitButton>
            </ActionForm>
          </Card>
        )}

        {admin && !arquivado && (
          <Card>
            <p className="mb-1 text-[12px] font-semibold uppercase tracking-[1.5px] text-accent">{tt.arquivarRegisto}</p>
            <p className="mb-5 text-[13px] text-text-mid">{tt.arquivarTexto}</p>
            <ActionForm action={arquivarTempo} resetOnSuccess={false} className="flex flex-col gap-4">
              <input type="hidden" name="registoId" value={r.id} />
              <Field label={tt.motivo} name="motivo">
                <Textarea name="motivo" rows={2} required placeholder={tt.motivoArquivarExemplo} />
              </Field>
              <SubmitButton variant="secondary">{tt.arquivar}</SubmitButton>
            </ActionForm>
          </Card>
        )}
      </div>
    </>
  )
}
