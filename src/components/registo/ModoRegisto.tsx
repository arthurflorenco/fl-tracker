'use client'
import { useI18n } from '@/i18n/client'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ActionForm, SubmitButton } from '@/components/ui/ActionForm'
import { Card } from '@/components/ui/Card'
import { Field, Select, Textarea } from '@/components/ui/Field'
import { opcoesHoras } from '@/lib/quartos'
import { cn } from '@/lib/utils'
import { iniciarTempo, registarHoras, terminarTempo } from '@/modules/tempos/actions'
import { PrevisaoRegisto, TempoDecorrido } from './TempoDecorrido'

/** Horas de referência calculadas no servidor (quartos de hora, hora de Lisboa). */
export interface Relogio {
  /** Início sugerido: agora arredondado para baixo, ou o fim do último registo. */
  inicioPadrao: string
  /** Primeira hora de início possível hoje (05:00 ou o fim do último registo). */
  inicioMin: string
  /** Fim sugerido: agora arredondado para cima. */
  fimPadrao: string
  /** Primeira hora de fim possível para o trabalho em curso (início + 15 min, se começou hoje). */
  fimMin: string
  /** Dias em que se pode lançar horas (hoje … 7 dias atrás). */
  dias: { valor: string; label: string }[]
}

interface Props {
  obraId: string
  etapas: { id: string; nome: string; estado: string }[]
  atividadesPorEtapa: Record<string, { id: string; nome: string }[]>
  elementos: { id: string; referencia: string; descricao: string }[]
  etapaSugerida: string | null
  elementoSugerido: string | null
  relogio: Relogio
  ativo: {
    id: string
    inicio: string
    /** Quando a pessoa carregou em Iniciar (o cronómetro conta daqui). */
    criadoEm: string
    obraId: string
    obraCodigo: string
    etapa: string
    atividade: string | null
    elemento: string | null
  } | null
}

const grande = 'py-4 text-[17px]'

/** Etapa, atividade e elemento — comum a "Iniciar" e "Lançar horas". */
function CamposTrabalho({
  etapas,
  atividadesPorEtapa,
  elementos,
  etapaSugerida,
  elementoSugerido,
}: Omit<Props, 'obraId' | 'relogio' | 'ativo'>) {
  const [etapa, setEtapa] = useState(etapaSugerida ?? etapas[0]?.id ?? '')
  const { t } = useI18n()
  const atividades = useMemo(() => atividadesPorEtapa[etapa] ?? [], [atividadesPorEtapa, etapa])
  return (
    <>
      <Field label={t.registo.etapa} name="obraEtapaId">
        <Select name="obraEtapaId" value={etapa} onChange={(e) => setEtapa(e.target.value)} className={grande}>
          {etapas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
              {e.estado === 'concluida' ? t.registo.concluida : ''}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t.registo.atividade} name="atividadeId">
        <Select key={etapa} name="atividadeId" defaultValue={atividades[0]?.id ?? ''} className={grande}>
          <option value="">—</option>
          {atividades.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t.registo.elemento} name="elementoId">
        <Select name="elementoId" defaultValue={elementoSugerido ?? ''} className={grande}>
          <option value="">{t.registo.obraCompleta}</option>
          {elementos.map((e) => (
            <option key={e.id} value={e.id}>
              {e.referencia} — {e.descricao}
            </option>
          ))}
        </Select>
      </Field>
    </>
  )
}

/**
 * Seletor de hora em quartos. Com `agora`, a primeira opção é "Agora" (valor vazio): o servidor
 * calcula a hora no momento em que se carrega — o tablet pode ficar horas com a página aberta.
 */
function SeletorHora({
  name,
  label,
  opcoes,
  padrao,
  agora,
}: {
  name: string
  label: string
  opcoes: string[]
  padrao?: string
  agora?: string
}) {
  const { t } = useI18n()
  return (
    <Field label={label} name={name}>
      <Select name={name} defaultValue={agora ? '' : padrao} className={cn(grande, 'tabular-nums')}>
        {agora && <option value="">{t.registo.agoraOpcao(agora)}</option>}
        {/* Com "Agora", as horas mais recentes aparecem primeiro. */}
        {(agora ? opcoes.filter((h) => h !== agora).reverse() : opcoes).map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </Select>
    </Field>
  )
}

/**
 * Ecrã do tablet. "Agora": iniciar/terminar com a hora sugerida (editável).
 * "Lançar horas": horas já feitas, até 7 dias atrás. Sempre em quartos de hora.
 */
export function ModoRegisto(props: Props) {
  const { obraId, relogio, ativo } = props
  const [modo, setModo] = useState<'agora' | 'horas'>('agora')
  const [clientId, setClientId] = useState(() => crypto.randomUUID())
  const novoClientId = () => setClientId(crypto.randomUUID())
  const { t, f } = useI18n()
  const rotuloDia = (valor: string, i: number) => (i === 0 ? t.registo.hoje : i === 1 ? t.registo.ontem : f.diaSemana(`${valor}T12:00:00Z`))

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 shadow-[inset_0_0_0_1px_var(--line)]" role="tablist">
        {(
          [
            ['agora', t.registo.agora],
            ['horas', t.registo.lancarHoras],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={modo === id}
            onClick={() => setModo(id)}
            className={cn(
              'py-3.5 text-[12px] font-semibold uppercase tracking-[1.5px] transition-colors',
              modo === id ? 'bg-accent text-[#fff]' : 'text-text-mid hover:text-white',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {modo === 'horas' ? (
        <Card>
          <ActionForm action={registarHoras} resetOnSuccess={false} onSuccess={novoClientId} className="flex flex-col gap-5">
            <input type="hidden" name="clientId" value={clientId} />
            <input type="hidden" name="obraId" value={obraId} />
            <p className="text-[13px] text-text-mid">{t.registo.lancarTexto}</p>
            <CamposTrabalho {...props} />
            <Field label={t.registo.dia} name="data">
              <Select name="data" defaultValue={relogio.dias[0]?.valor} className={grande}>
                {relogio.dias.map((d, i) => (
                  <option key={d.valor} value={d.valor}>
                    {rotuloDia(d.valor, i)}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <SeletorHora name="inicio" label={t.registo.das} opcoes={opcoesHoras('00:00', '23:45')} padrao="08:00" />
              <SeletorHora name="fim" label={t.registo.as} opcoes={opcoesHoras('00:15', '24:00')} padrao="12:00" />
            </div>
            <Field label={t.registo.notaOpcional} name="nota">
              <Textarea name="nota" rows={2} placeholder={t.registo.oQueFicouFeito} />
            </Field>
            <SubmitButton size="lg">{t.registo.guardarHoras}</SubmitButton>
          </ActionForm>
        </Card>
      ) : ativo && ativo.obraId !== obraId ? (
        <Card className="flex flex-col gap-4">
          <p className="text-[15px]">
            {t.registo.emCursoNoutraObra} <strong className="font-bold">{ativo.obraCodigo}</strong>. {t.registo.termineAntes}
          </p>
          <Link href={`/admin/obras/${ativo.obraId}/registar`} className="text-[12px] font-semibold uppercase tracking-[1.5px] text-accent">
            {t.registo.irParaObra(ativo.obraCodigo)}
          </Link>
        </Card>
      ) : ativo ? (
        <Card data-guia="registo-terminar" className="flex flex-col gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-accent">{t.registo.aTrabalhar}</p>
            <p className="mt-2 text-[20px] font-bold leading-tight">
              {ativo.etapa}
              {ativo.atividade ? ` · ${ativo.atividade}` : ''}
            </p>
            {ativo.elemento && <p className="mt-1 text-[14px] text-text-mid">{t.registo.elementoRef(ativo.elemento)}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <TempoDecorrido
              comecou={ativo.criadoEm}
              className="text-[40px] font-bold leading-none tracking-[-1px] tabular-nums md:text-[56px]"
            />
            <PrevisaoRegisto inicio={ativo.inicio} className="text-[13px] text-text-mid tabular-nums" />
          </div>
          <ActionForm action={terminarTempo} className="flex flex-col gap-4">
            <input type="hidden" name="registoId" value={ativo.id} />
            <SeletorHora
              name="fim"
              label={t.registo.terminouAs}
              opcoes={opcoesHoras(relogio.fimMin, relogio.fimPadrao)}
              agora={relogio.fimPadrao}
            />
            <Field label={t.registo.notaAoTerminar} name="nota">
              <Textarea name="nota" rows={2} placeholder={t.registo.oQueFicouFeito} />
            </Field>
            <SubmitButton size="lg" pendente={t.registo.aTerminar}>
              {t.registo.terminar}
            </SubmitButton>
          </ActionForm>
        </Card>
      ) : (
        <Card data-guia="registo-iniciar">
          <ActionForm action={iniciarTempo} resetOnSuccess={false} onSuccess={novoClientId} className="flex flex-col gap-5">
            <input type="hidden" name="clientId" value={clientId} />
            <input type="hidden" name="obraId" value={obraId} />
            <CamposTrabalho {...props} />
            <SeletorHora
              name="inicio"
              label={t.registo.comecouAs}
              opcoes={opcoesHoras(relogio.inicioMin, relogio.inicioPadrao)}
              agora={relogio.inicioPadrao}
            />
            <SubmitButton size="lg" pendente={t.registo.aIniciar}>
              {t.registo.iniciar}
            </SubmitButton>
          </ActionForm>
        </Card>
      )}
    </div>
  )
}
