'use client'
import { useI18n } from '@/i18n/client'
import Link from 'next/link'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { buttonClass } from '@/components/ui/Button'
import { entrar } from '@/app/entrar/actions'
import type { Passo } from './passos'

const MARGEM = 16
/** Folga à volta do elemento destacado. */
const FOLGA = 8
/** Sem o alvo ao fim deste tempo, o balão aparece ao centro com "Seguinte" (o guia nunca fica preso). */
const ESPERA_MS = 3000

/** Primeiro elemento visível com este `data-guia` (a navegação existe em duas versões: lateral e inferior). */
function procurar(alvo: string) {
  return Array.from(document.querySelectorAll<HTMLElement>(`[data-guia="${alvo}"]`)).find((el) => {
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0
  })
}

const igual = (a: DOMRect | null, b: DOMRect | null) =>
  a === b || (!!a && !!b && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height)

/** Posição do alvo no ecrã, atualizada com scroll, redimensionamento e mudanças da página. */
function useRetangulo(alvo: string | undefined) {
  const [rect, setRect] = useState<DOMRect | null>(null)
  useEffect(() => {
    if (!alvo) return
    let rolou = false
    const medir = () => {
      const el = procurar(alvo)
      if (!el) return setRect(null)
      let r = el.getBoundingClientRect()
      if (!rolou) {
        rolou = true
        if (r.top < 0 || r.bottom > window.innerHeight) {
          el.scrollIntoView({ block: r.height > window.innerHeight * 0.6 ? 'start' : 'center', behavior: 'instant' })
          r = el.getBoundingClientRect()
        }
      }
      setRect((antes) => (igual(antes, r) ? antes : r))
    }
    medir()
    const t = window.setInterval(medir, 200)
    window.addEventListener('scroll', medir, true)
    window.addEventListener('resize', medir)
    return () => {
      window.clearInterval(t)
      window.removeEventListener('scroll', medir, true)
      window.removeEventListener('resize', medir)
    }
  }, [alvo])
  return alvo ? rect : null
}

interface Props {
  passo: Passo
  numero: number
  total: number
  /** O passo anterior está na mesma página (só então se mostra "Anterior"). */
  podeVoltar: boolean
  onSeguinte: () => void
  onAnterior: () => void
  onSair: () => void
}

/** Escurece o ecrã, recorta o elemento a clicar e mostra o balão com a explicação. */
export function Destaque({ passo, numero, total, podeVoltar, onSeguinte, onAnterior, onSair }: Props) {
  const rect = useRetangulo(passo.alvo)
  const { t, idioma } = useI18n()
  const [perdido, setPerdido] = useState(false)
  const balao = useRef<HTMLDivElement>(null)
  const [altura, setAltura] = useState(240)
  const [ecra, setEcra] = useState({ w: 1280, h: 800 })
  const ultimo = numero === total

  useEffect(() => {
    if (!passo.alvo || rect) return
    const t = window.setTimeout(() => setPerdido(true), ESPERA_MS)
    return () => window.clearTimeout(t)
  }, [passo.alvo, rect])

  // "ate elemento": avança quando o elemento aparece (ex.: depois de carregar em Iniciar).
  const esperaElemento = passo.ate && 'elemento' in passo.ate ? passo.ate.elemento : null
  useEffect(() => {
    if (!esperaElemento) return
    const t = window.setInterval(() => procurar(esperaElemento) && onSeguinte(), 250)
    return () => window.clearInterval(t)
  }, [esperaElemento, onSeguinte])

  useLayoutEffect(() => {
    const medir = () => {
      setEcra({ w: window.innerWidth, h: window.innerHeight })
      if (balao.current) setAltura(balao.current.offsetHeight)
    }
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [passo.id, rect])

  const largura = Math.min(400, ecra.w - MARGEM * 2)
  const buraco = rect && {
    top: rect.top - FOLGA,
    left: rect.left - FOLGA,
    width: rect.width + FOLGA * 2,
    height: rect.height + FOLGA * 2,
  }
  const posicao = posicionar(buraco, largura, altura, ecra)
  const precisaAcao = !!passo.ate && !perdido

  return (
    <div className="no-print" role="dialog" aria-modal="true" aria-labelledby="guia-titulo">
      {buraco ? (
        <>
          {/* Bloqueia os cliques fora do elemento destacado. */}
          <div className="fixed inset-x-0 top-0 z-[100]" style={{ height: Math.max(0, buraco.top) }} />
          <div className="fixed inset-x-0 bottom-0 z-[100]" style={{ top: buraco.top + buraco.height }} />
          <div className="fixed left-0 z-[100]" style={{ top: buraco.top, height: buraco.height, width: Math.max(0, buraco.left) }} />
          <div className="fixed right-0 z-[100]" style={{ top: buraco.top, height: buraco.height, left: buraco.left + buraco.width }} />
          <div
            aria-hidden
            className="guia-anel pointer-events-none fixed z-[100] outline-2 outline-accent transition-all duration-300"
            style={{ ...buraco, boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.62)' }}
          />
        </>
      ) : (
        <div className="fixed inset-0 z-[100] bg-black/60" />
      )}

      <div
        ref={balao}
        className="card-premium fixed z-[101] flex flex-col gap-4 bg-dark2 p-6 shadow-2xl"
        style={{ width: largura, ...posicao }}
      >
        <div className="flex items-center justify-between gap-4">
          <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-accent">{t.guia.passoDe(numero, total)}</p>
          {!ultimo && (
            <button
              type="button"
              onClick={onSair}
              className="text-[11px] font-semibold uppercase tracking-[1.5px] text-text-dim hover:text-accent"
            >
              {t.guia.saltar}
            </button>
          )}
        </div>
        <div className="h-[3px] w-full bg-line">
          <div className="h-full bg-accent transition-all duration-300" style={{ width: `${(numero / total) * 100}%` }} />
        </div>
        <h2 id="guia-titulo" className="text-[22px] font-bold uppercase leading-[1] tracking-[-0.5px]">
          {passo.titulo[idioma]}
        </h2>
        <p className="text-[14px] font-light leading-relaxed text-text-mid">{passo.texto[idioma]}</p>

        {precisaAcao && !passo.acao && (
          <p className="text-[12px] font-semibold uppercase tracking-[1.5px] text-accent">{t.guia.cliqueNaArea}</p>
        )}

        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          {podeVoltar ? (
            <button type="button" onClick={onAnterior} className={buttonClass({ variant: 'ghost', size: 'sm', className: 'px-0' })}>
              {t.guia.anterior}
            </button>
          ) : (
            <span />
          )}
          {passo.acao && !perdido ? (
            'href' in passo.acao ? (
              <Link href={passo.acao.href} className={buttonClass({ size: 'sm' })}>
                {passo.acao.label[idioma]} →
              </Link>
            ) : (
              <form action={entrar}>
                <input type="hidden" name="perfilId" value={passo.acao.entrarComo} />
                <input type="hidden" name="destino" value={passo.acao.destino} />
                <button type="submit" className={buttonClass({ size: 'sm' })}>
                  {passo.acao.label[idioma]} →
                </button>
              </form>
            )
          ) : (
            !precisaAcao && (
              <button type="button" onClick={ultimo ? onSair : onSeguinte} className={buttonClass({ size: 'sm' })} autoFocus>
                {numero === 1 ? t.guia.comecar : ultimo ? t.guia.explorar : t.guia.seguinte}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}

/** Balão por baixo, por cima, ao lado do elemento ou, sem espaço, no canto inferior direito. */
function posicionar(
  b: { top: number; left: number; width: number; height: number } | null,
  w: number,
  h: number,
  ecra: { w: number; h: number },
): { top: number; left: number } {
  const limitarX = (x: number) => Math.min(Math.max(x, MARGEM), ecra.w - w - MARGEM)
  const limitarY = (y: number) => Math.min(Math.max(y, MARGEM), ecra.h - h - MARGEM)
  if (!b) return { top: limitarY((ecra.h - h) / 2), left: limitarX((ecra.w - w) / 2) }
  const direita = b.left + b.width + MARGEM
  // Elementos da barra lateral (navegação): o balão fica ao lado, sem tapar os outros itens.
  if (b.left + b.width < ecra.w * 0.25 && direita + w <= ecra.w - MARGEM) return { top: limitarY(b.top), left: direita }
  const baixo = b.top + b.height + MARGEM
  if (baixo + h <= ecra.h - MARGEM) return { top: baixo, left: limitarX(b.left) }
  const cima = b.top - MARGEM - h
  if (cima >= MARGEM) return { top: cima, left: limitarX(b.left) }
  if (direita + w <= ecra.w - MARGEM) return { top: limitarY(b.top), left: direita }
  const esquerda = b.left - MARGEM - w
  if (esquerda >= MARGEM) return { top: limitarY(b.top), left: esquerda }
  return { top: ecra.h - h - MARGEM, left: ecra.w - w - MARGEM }
}
