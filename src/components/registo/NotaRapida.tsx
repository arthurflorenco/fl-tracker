'use client'
import { useState } from 'react'
import { ActionForm, SubmitButton } from '@/components/ui/ActionForm'
import { Field, Select, Textarea } from '@/components/ui/Field'
import { criarNota } from '@/modules/notas/actions'
import { TIPOS_NOTA } from '@/modules/notas/schema'
import { useI18n } from '@/i18n/client'

export function NotaRapida({
  obraId,
  obraEtapaId,
  elementoId,
  etapas,
  elementos,
}: {
  obraId: string
  obraEtapaId?: string | null
  elementoId?: string | null
  etapas?: { id: string; nome: string }[]
  elementos?: { id: string; referencia: string; descricao: string }[]
}) {
  const [clientId, setClientId] = useState(() => crypto.randomUUID())
  const { t } = useI18n()
  return (
    <ActionForm action={criarNota} onSuccess={() => setClientId(crypto.randomUUID())} className="flex flex-col gap-4">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="obraId" value={obraId} />
      <Field label={t.nota.tipo} name="tipo">
        <Select name="tipo" defaultValue="observacao">
          {TIPOS_NOTA.map((tipo) => (
            <option key={tipo} value={tipo}>
              {t.rotulos.tipoNota[tipo]}
            </option>
          ))}
        </Select>
      </Field>
      {etapas ? (
        <Field label={t.nota.etapaOpcional} name="obraEtapaId">
          <Select name="obraEtapaId" defaultValue={obraEtapaId ?? ''}>
            <option value="">—</option>
            {etapas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <input type="hidden" name="obraEtapaId" value={obraEtapaId ?? ''} />
      )}
      {elementos ? (
        <Field label={t.nota.elementoOpcional} name="elementoId">
          <Select name="elementoId" defaultValue={elementoId ?? ''}>
            <option value="">{t.nota.obraCompleta}</option>
            {elementos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.referencia} — {e.descricao}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <input type="hidden" name="elementoId" value={elementoId ?? ''} />
      )}
      <Field label={t.nota.nota} name="texto">
        <Textarea name="texto" required placeholder={t.nota.exemplo} />
      </Field>
      <SubmitButton>{t.nota.guardar}</SubmitButton>
    </ActionForm>
  )
}
