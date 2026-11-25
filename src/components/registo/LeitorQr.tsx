'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'
import type QrScannerTipo from 'qr-scanner'
import { buttonClass } from '@/components/ui/Button'
import { tokenDeQr } from '@/modules/qr/token'
import { useI18n } from '@/i18n/client'

type Estado = 'a_iniciar' | 'a_ler' | 'sem_camera' | 'a_abrir'

/**
 * Leitor de QR Code na app (câmara traseira). Ao ler um QR da app vai para /q/<token>,
 * que valida a permissão e abre a página da obra. Sem câmara (ou sem permissão),
 * permite tirar/escolher uma fotografia do QR.
 */
export function LeitorQr() {
  const router = useRouter()
  const { t } = useI18n()
  const video = useRef<HTMLVideoElement>(null)
  const scanner = useRef<QrScannerTipo | null>(null)
  const [estado, setEstado] = useState<Estado>('a_iniciar')
  const [aviso, setAviso] = useState<string | null>(null)

  const abrir = (texto: string) => {
    const token = tokenDeQr(texto)
    if (!token) {
      setAviso(t.qr.naoEDaApp)
      return false
    }
    setEstado('a_abrir')
    scanner.current?.stop()
    router.replace(`/q/${token}`)
    return true
  }
  const abrirRef = useRef(abrir)
  useEffect(() => {
    abrirRef.current = abrir
  })

  useEffect(() => {
    let cancelado = false
    ;(async () => {
      const { default: QrScanner } = await import('qr-scanner')
      if (cancelado || !video.current) return
      const s = new QrScanner(video.current, (r) => abrirRef.current(r.data), {
        preferredCamera: 'environment',
        maxScansPerSecond: 8,
        returnDetailedScanResult: true,
      })
      scanner.current = s
      try {
        await s.start()
        if (!cancelado) setEstado('a_ler')
      } catch {
        if (!cancelado) setEstado('sem_camera')
      }
    })()
    return () => {
      cancelado = true
      scanner.current?.destroy()
      scanner.current = null
    }
  }, [])

  async function lerFotografia(ficheiro: File | undefined) {
    if (!ficheiro) return
    setAviso(null)
    try {
      const { default: QrScanner } = await import('qr-scanner')
      const r = await QrScanner.scanImage(ficheiro, { returnDetailedScanResult: true })
      abrir(r.data)
    } catch {
      setAviso(t.qr.fotoIlegivel)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#000] sm:aspect-video">
        <video ref={video} className="h-full w-full object-cover" muted playsInline />
        {estado === 'a_ler' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="aspect-square w-[62%] max-w-[320px] shadow-[0_0_0_9999px_rgba(0,0,0,0.45),inset_0_0_0_3px_var(--accent)]" />
          </div>
        )}
        {estado !== 'a_ler' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-[#fff]">
            {estado === 'a_iniciar' && <p className="text-[14px]">{t.qr.aAbrirCamara}</p>}
            {estado === 'a_abrir' && <p className="text-[14px]">{t.qr.lido}</p>}
            {estado === 'sem_camera' && (
              <>
                <Camera size={28} strokeWidth={1.5} className="text-accent" />
                <p className="max-w-[34ch] text-[14px]">{t.qr.semCamara}</p>
              </>
            )}
          </div>
        )}
      </div>

      <p className="text-center text-[14px] text-text-mid" role="status">
        {aviso ?? t.qr.aponte}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <label className={buttonClass({ variant: 'secondary', size: 'lg', className: 'cursor-pointer' })}>
          <Camera size={18} strokeWidth={1.5} /> {t.qr.fotografia}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => lerFotografia(e.target.files?.[0])}
          />
        </label>
        <Link href="/admin" className={buttonClass({ variant: 'ghost', size: 'lg' })}>
          <X size={18} strokeWidth={1.5} /> {t.qr.cancelar}
        </Link>
      </div>
    </div>
  )
}
