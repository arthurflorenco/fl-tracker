'use client'
import { useI18n } from '@/i18n/client'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Compass, RotateCcw } from 'lucide-react'
import { entrar } from '@/app/entrar/actions'
import { reporDemo } from '@/app/demo/actions'
import { buttonClass } from '@/components/ui/Button'
import { Destaque } from './Destaque'
import { PASSOS, type Passo } from './passos'

const CHAVE = 'fl-guia'

interface Estado {
  passo: number
  ativo: boolean
}

const INICIAL: Estado = { passo: 0, ativo: true }

/** Progresso do guia neste browser. Sem localStorage (janela privada, bloqueado), começa do início. */
function ler(): Estado {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE) ?? 'null') as Partial<Estado> | null
    if (v && typeof v.passo === 'number' && v.passo >= 0 && v.passo < PASSOS.length) return { passo: v.passo, ativo: !!v.ativo }
  } catch {}
  return INICIAL
}

/** Primeira visita neste browser? (ainda sem progresso guardado; sem localStorage, conta como primeira) */
function primeiraVisita() {
  try {
    return localStorage.getItem(CHAVE) === null
  } catch {
    return true
  }
}

function gravar(e: Estado) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(e))
  } catch {}
}

/** O passo vê-se nesta página e com esta pessoa? */
const noSitio = (p: Passo, pathname: string, perfilId: string | null) =>
  p.pagina === '*' || (p.pagina === pathname && (p.perfil === null || p.perfil === perfilId))

/**
 * Guia interativo da demonstração: segue o cliente de página em página, destaca o que
 * deve clicar e avança sozinho quando ele o faz. Montado no layout raiz só com MODO_DEMO.
 */
export function Guia({ perfilId }: { perfilId: string | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const [estado, setEstado] = useState<Estado | null>(null)

  // Só na primeira visita deste browser o guia começa sozinho, desde o início, no ecrã de entrada.
  // Nas visitas seguintes continua onde ficou (quem o saltou ou terminou só vê o botão "Guia").
  useEffect(() => {
    const primeira = primeiraVisita()
    if (primeira && window.location.pathname !== '/entrar') router.replace('/entrar')
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage só existe no browser (depois da hidratação)
    setEstado(primeira ? INICIAL : ler())
  }, [router])
  useEffect(() => {
    if (estado) gravar(estado)
  }, [estado])

  const passo = estado ? PASSOS[estado.passo] : null

  const seguinte = useCallback(() => setEstado((e) => e && { ...e, passo: Math.min(e.passo + 1, PASSOS.length - 1) }), [])
  const anterior = useCallback(() => setEstado((e) => e && { ...e, passo: Math.max(e.passo - 1, 0) }), [])
  const sair = useCallback(() => setEstado((e) => e && { ...e, ativo: false }), [])
  const recomecar = () => {
    setEstado(INICIAL)
    router.push('/entrar')
  }

  // Com o guia a meio, quem volta ao ecrã de entrada (sair) recomeça-o do início. Quem o saltou
  // ou já o terminou não o volta a ver — pode sempre recomeçá-lo no botão "Guia".
  const carregado = estado !== null
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reage à navegação feita pelo cliente
    if (carregado && pathname === '/entrar') setEstado((e) => (e && e.ativo && e.passo > 1 && e.passo < PASSOS.length - 1 ? INICIAL : e))
  }, [carregado, pathname])

  // "ate pagina": avança quando o cliente chega à página seguinte (clicou no link destacado).
  const paginaSeguinte = passo?.ate && 'pagina' in passo.ate ? passo.ate.pagina : null
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reage à navegação feita pelo cliente
    if (estado?.ativo && paginaSeguinte === pathname) seguinte()
  }, [estado?.ativo, paginaSeguinte, pathname, seguinte])

  if (!estado || !passo) return null

  if (estado.ativo && noSitio(passo, pathname, perfilId)) {
    const antes = PASSOS[estado.passo - 1]
    return (
      <Destaque
        key={passo.id}
        passo={passo}
        numero={estado.passo + 1}
        total={PASSOS.length}
        podeVoltar={!!antes && !antes.ate && !antes.acao && noSitio(antes, pathname, perfilId)}
        onSeguinte={seguinte}
        onAnterior={anterior}
        onSair={sair}
      />
    )
  }

  const pill = 'card-premium flex items-center gap-2 bg-dark2 px-4 py-3 text-[11px] font-semibold uppercase tracking-[1.5px]'
  return (
    <div className="no-print fixed bottom-[calc(80px+env(safe-area-inset-bottom))] right-4 z-[90] flex flex-col items-end gap-2 lg:bottom-6 lg:right-6">
      {estado.ativo ? (
        <Continuar passo={passo} perfilId={perfilId} className={`${pill} text-accent`} />
      ) : (
        <MenuGuia
          className={pill}
          retomar={estado.passo > 0 && estado.passo < PASSOS.length - 1 ? () => setEstado({ ...estado, ativo: true }) : null}
          recomecar={recomecar}
          antesDeRepor={() => setEstado(INICIAL)}
        />
      )}
    </div>
  )
}

/** O cliente saiu do percurso: volta à página (e à pessoa) do passo atual. */
function Continuar({ passo, perfilId, className }: { passo: Passo; perfilId: string | null; className: string }) {
  const router = useRouter()
  const { t } = useI18n()
  const destino = passo.pagina === '*' ? '/admin' : passo.pagina
  if (passo.perfil && passo.perfil !== perfilId)
    return (
      <form action={entrar}>
        <input type="hidden" name="perfilId" value={passo.perfil} />
        <input type="hidden" name="destino" value={destino} />
        <button type="submit" className={className}>
          <Compass size={16} strokeWidth={1.5} /> {t.guia.continuar}
        </button>
      </form>
    )
  return (
    <button type="button" className={className} onClick={() => router.push(destino)}>
      <Compass size={16} strokeWidth={1.5} /> {t.guia.continuar}
    </button>
  )
}

function MenuGuia({
  className,
  retomar,
  recomecar,
  antesDeRepor,
}: {
  className: string
  retomar: (() => void) | null
  recomecar: () => void
  antesDeRepor: () => void
}) {
  const [aberto, setAberto] = useState(false)
  const { t } = useI18n()
  return (
    <>
      {aberto && (
        <div className="card-premium flex w-[260px] flex-col gap-2 bg-dark2 p-4">
          {retomar && (
            <button type="button" onClick={retomar} className={buttonClass({ size: 'sm' })}>
              {t.guia.continuar}
            </button>
          )}
          <button type="button" onClick={recomecar} className={buttonClass({ variant: retomar ? 'secondary' : 'primary', size: 'sm' })}>
            {t.guia.recomecar}
          </button>
          <form action={reporDemo} onSubmit={antesDeRepor}>
            <button type="submit" className={buttonClass({ variant: 'ghost', size: 'sm', className: 'w-full' })}>
              <RotateCcw size={14} strokeWidth={1.5} /> {t.guia.reporDados}
            </button>
          </form>
          <p className="text-[11px] leading-snug text-text-dim">{t.guia.reporTexto}</p>
        </div>
      )}
      <button type="button" onClick={() => setAberto((v) => !v)} aria-expanded={aberto} className={`${className} hover:text-accent`}>
        <Compass size={16} strokeWidth={1.5} /> {t.guia.guia}
      </button>
    </>
  )
}
