'use client'
import { useI18n } from '@/i18n/client'
import { useRef, useState, useTransition } from 'react'
import { Camera } from 'lucide-react'
import { buttonClass } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { comprimirImagem } from '@/lib/imagem'
import type { Resultado } from '@/lib/acao'
import { carregarFotografia } from '@/modules/fotografias/actions'
import { FOTO_MAX_BYTES } from '@/modules/fotografias/schema'

/** Abre a câmara traseira no tablet/telemóvel, comprime e envia. */
export function FotoRapida({
  obraId,
  obraEtapaId,
  elementoId,
}: {
  obraId: string
  obraEtapaId?: string | null
  elementoId?: string | null
}) {
  const input = useRef<HTMLInputElement>(null)
  const [legenda, setLegenda] = useState('')
  const [estado, setEstado] = useState<Resultado | null>(null)
  const { t, msg } = useI18n()
  const [pendente, startTransition] = useTransition()

  async function enviar(ficheiro: File) {
    setEstado(null)
    let dataUrl: string
    try {
      dataUrl = await comprimirImagem(ficheiro, FOTO_MAX_BYTES)
    } catch {
      setEstado({ ok: false, erro: t.foto.ilegivel })
      return
    }
    const fd = new FormData()
    fd.set('clientId', crypto.randomUUID())
    fd.set('obraId', obraId)
    fd.set('obraEtapaId', obraEtapaId ?? '')
    fd.set('elementoId', elementoId ?? '')
    fd.set('legenda', legenda)
    fd.set('dataUrl', dataUrl)
    startTransition(async () => {
      const r = await carregarFotografia(null, fd)
      setEstado(r)
      if (r.ok) setLegenda('')
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <Input name="legenda" value={legenda} onChange={(e) => setLegenda(e.target.value)} placeholder={t.foto.legenda} />
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void enviar(f)
          e.target.value = ''
        }}
      />
      <button type="button" disabled={pendente} onClick={() => input.current?.click()} className={buttonClass({ variant: 'secondary' })}>
        <Camera size={16} strokeWidth={1.5} />
        {pendente ? t.foto.aEnviar : t.foto.tirar}
      </button>
      {estado && (
        <p role="status" className={`text-[13px] ${estado.ok ? 'text-ok' : 'text-danger'}`}>
          {msg((estado.ok ? estado.mensagem : estado.erro) ?? '')}
        </p>
      )}
    </div>
  )
}
