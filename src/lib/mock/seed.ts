/**
 * Dados fictícios coerentes para demonstração: DUAS empresas inventadas (multi-empresa),
 * cada uma com ~6 meses de histórico determinístico. Nomes, moradas e valores são inventados.
 * A empresa B é gerada com o mesmo gerador e ids com prefixo `b-`.
 */
import type { Db } from './store'
import { chaveDia } from '@/lib/format'

/** PRNG determinístico: os dados fictícios são sempre iguais. */
function prng(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const ETAPAS_INICIAIS = [
  'Orçamentação',
  'Medição',
  'Projeto e especificação',
  'Pedidos a fornecedores',
  'Receção de materiais',
  'Fabricação',
  'Preparação e expedição',
  'Montagem',
  'Verificação final',
  'Pós-venda',
] as const

const ATIVIDADES: Record<string, string[]> = {
  Medição: ['Medição em obra', 'Levantamento fotográfico'],
  'Projeto e especificação': ['Desenho técnico', 'Lista de corte'],
  'Pedidos a fornecedores': ['Encomenda de perfis', 'Encomenda de vidros', 'Encomenda de ferragens'],
  'Receção de materiais': ['Conferência de material'],
  Fabricação: ['Corte de perfis', 'Maquinação', 'Montagem de caixilhos', 'Colocação de vidro', 'Embalamento'],
  'Preparação e expedição': ['Carga', 'Transporte'],
  Montagem: ['Remoção de caixilharia antiga', 'Assentamento de aros', 'Montagem de folhas', 'Vedação e silicone', 'Afinação e limpeza'],
  'Verificação final': ['Inspeção com o cliente'],
}

/** As tabelas da base, sem `empresaId` (acrescentado depois em `daEmpresa`). */
type Linhas = { [K in Exclude<keyof Db, 'empresas'>]: Omit<Db[K][number], 'empresaId'>[] }

/** O que muda entre as duas empresas fictícias. */
interface Variante {
  dominio: string
  pessoas: Record<string, string>
  clientes: [nome: string, telefone: string][]
  /** pr-1 … pr-9: [título do projeto, localidade, valor da proposta] */
  projetos: [string, string, number | null][]
  /** ob-1 … ob-7: título da obra */
  obras: string[]
  /** Multiplica os custos diretos (os valores das propostas são diferentes entre empresas). */
  fatorCustos: number
}

const VARIANTE_A: Variante = {
  dominio: 'atlantico.example',
  pessoas: {
    'u-ana': 'Ana Ribeiro',
    'u-carlos': 'Carlos Mendes',
    'u-sofia': 'Sofia Lopes',
    'u-rui': 'Rui Fonseca',
    'u-tiago': 'Tiago Santos',
    'u-joao': 'João Pereira',
    'u-miguel': 'Miguel Costa',
    'u-pedro': 'Pedro Alves',
  },
  clientes: [
    ['Inês e Bruno Tavares', '910 000 001'],
    ['Construtora Estuário, Lda.', '210 000 002'],
    ['Catarina Moura', '960 000 003'],
    ['Restaurante Cais Velho', '210 000 004'],
    ['Henrique Barros', '930 000 005'],
    ['Leonor Pacheco', '910 000 006'],
    ['Clínica Veterinária Bons Amigos', '210 000 007'],
    ['Imobiliária Sete Colinas, Lda.', '210 000 008'],
    ['Diogo e Marta Freitas', '960 000 009'],
  ],
  projetos: [
    ['Moradia em Cascais — caixilharia completa', 'Cascais', 21300],
    ['Edifício de 6 frações — fachada', 'Almada', 48900],
    ['Remodelação de apartamento', 'Lisboa', 8350],
    ['Pérgola bioclimática e envidraçado', 'Oeiras', 15200],
    ['Substituição de janelas', 'Sintra', null],
    ['Moradia T3 — janelas e portada', 'Setúbal', 11200],
    ['Clínica — montra e portas automáticas', 'Amadora', 17900],
    ['Bloco de apartamentos — caixilharia', 'Seixal', 29800],
    ['Moradia — envidraçados e estores', 'Mafra', 12950],
  ],
  obras: [
    'Moradia em Cascais',
    'Edifício de 6 frações',
    'Remodelação de apartamento',
    'Moradia T3 em Setúbal',
    'Clínica Bons Amigos',
    'Bloco de apartamentos no Seixal',
    'Moradia Freitas',
  ],
  fatorCustos: 1.13,
}

const VARIANTE_B: Variante = {
  dominio: 'ribeira.example',
  pessoas: {
    'u-ana': 'Beatriz Nogueira',
    'u-carlos': 'Hugo Matias',
    'u-sofia': 'Patrícia Rocha',
    'u-rui': 'Nuno Teixeira',
    'u-tiago': 'André Brito',
    'u-joao': 'Ricardo Sá',
    'u-miguel': 'Fábio Leite',
    'u-pedro': 'Sérgio Vaz',
  },
  clientes: [
    ['Sílvia e Paulo Antunes', '910 100 001'],
    ['Edifícios Douro, Lda.', '220 100 002'],
    ['Teresa Campos', '960 100 003'],
    ['Tasca da Ribeira', '220 100 004'],
    ['Vítor Magalhães', '930 100 005'],
    ['Joana Pires', '910 100 006'],
    ['Clínica Dentária Foz', '220 100 007'],
    ['Imobiliária Invicta, Lda.', '220 100 008'],
    ['Gonçalo e Rita Lacerda', '960 100 009'],
  ],
  projetos: [
    ['Moradia em Matosinhos — caixilharia completa', 'Matosinhos', 26600],
    ['Edifício de 6 frações — fachada', 'Vila Nova de Gaia', 61100],
    ['Remodelação de apartamento', 'Porto', 10450],
    ['Pérgola bioclimática e envidraçado', 'Maia', 19000],
    ['Substituição de janelas', 'Braga', null],
    ['Moradia T3 — janelas e portada', 'Guimarães', 14000],
    ['Clínica — montra e portas automáticas', 'Porto', 22400],
    ['Bloco de apartamentos — caixilharia', 'Espinho', 37250],
    ['Moradia — envidraçados e estores', 'Póvoa de Varzim', 16200],
  ],
  obras: [
    'Moradia em Matosinhos',
    'Edifício de 6 frações',
    'Remodelação de apartamento',
    'Moradia T3 em Guimarães',
    'Clínica Dentária Foz',
    'Bloco de apartamentos em Espinho',
    'Moradia Lacerda',
  ],
  fatorCustos: 1.41,
}

export const EMPRESAS = [
  { id: 'emp-a', nome: 'Atlântico Alumínios', prefixo: '', variante: VARIANTE_A },
  { id: 'emp-b', nome: 'Ribeira Window Systems', prefixo: 'b-', variante: VARIANTE_B },
] as const

export function criarSeed(agora: Date): Db {
  const tabelas = EMPRESAS.map((e) => daEmpresa(dadosEmpresa(agora, e.variante), e.id, e.prefixo))
  const juntar = <K extends Exclude<keyof Db, 'empresas'>>(k: K) => tabelas.flatMap((t) => t[k] as unknown[]) as Db[K]
  return {
    empresas: EMPRESAS.map(({ id, nome }) => ({ id, nome, criadoEm: new Date(agora.getTime() - 400 * 24 * 3600e3).toISOString() })),
    equipas: juntar('equipas'),
    perfis: juntar('perfis'),
    clientes: juntar('clientes'),
    projetos: juntar('projetos'),
    obras: juntar('obras'),
    obraEquipas: juntar('obraEquipas'),
    obraResponsaveis: juntar('obraResponsaveis'),
    etapasModelo: juntar('etapasModelo'),
    atividades: juntar('atividades'),
    obraEtapas: juntar('obraEtapas'),
    elementos: juntar('elementos'),
    registosTempo: juntar('registosTempo'),
    notas: juntar('notas'),
    fotografias: juntar('fotografias'),
    historico: juntar('historico'),
    custosHora: juntar('custosHora'),
    custosDiretos: juntar('custosDiretos'),
  }
}

/**
 * Marca cada linha com a empresa e, para a empresa B, prefixa todos os ids (e os campos
 * `…Id` que apontam para eles), os tokens de QR e os clientIds: ficam únicos na base toda.
 */
function daEmpresa(t: Linhas, empresaId: string, prefixo: string): Omit<Db, 'empresas'> {
  const linha = (r: object) => {
    const out: Record<string, unknown> = { empresaId }
    for (const [k, v] of Object.entries(r)) {
      if (!prefixo || typeof v !== 'string') out[k] = v
      else if (k === 'id' || (k.endsWith('Id') && k !== 'clientId')) out[k] = prefixo + v
      else if (k === 'qrToken') out[k] = prefixo.replace('-', '') + v
      else if (k === 'clientId') out[k] = 'bbbbbbbb' + v.slice(8)
      else out[k] = v
    }
    return out
  }
  return Object.fromEntries(Object.entries(t).map(([k, linhas]) => [k, (linhas as object[]).map(linha)])) as unknown as Omit<Db, 'empresas'>
}

function dadosEmpresa(agora: Date, v: Variante): Linhas {
  const dia = 24 * 3600e3
  const iso = (offsetMs: number) => new Date(agora.getTime() + offsetMs).toISOString()
  /** Hora do dia `diasAtras` (hora local aproximada; suficiente para demonstração). */
  const em = (diasAtras: number, h: number, m = 0) => {
    const d = new Date(agora.getTime() - diasAtras * dia)
    d.setHours(h, m, 0, 0)
    return d.toISOString()
  }

  const equipas: Linhas['equipas'] = [
    { id: 'eq-escritorio', nome: 'Escritório', tipo: 'escritorio', ativa: true },
    { id: 'eq-fabricacao', nome: 'Fabricação', tipo: 'fabricacao', ativa: true },
    { id: 'eq-montagem-a', nome: 'Montagem A', tipo: 'montagem', ativa: true },
    { id: 'eq-montagem-b', nome: 'Montagem B', tipo: 'montagem', ativa: true },
  ]

  const p = (id: string, nome: string, papel: Db['perfis'][number]['papel'], equipaId: string | null) => ({
    id,
    nome,
    email: `${id.replace('u-', '')}@${v.dominio}`,
    papel,
    equipaId,
    ativo: true,
    criadoEm: iso(-90 * dia),
  })
  const perfis: Linhas['perfis'] = [
    p('u-ana', v.pessoas['u-ana'], 'admin', 'eq-escritorio'),
    p('u-carlos', v.pessoas['u-carlos'], 'orcamentacao', 'eq-escritorio'),
    p('u-sofia', v.pessoas['u-sofia'], 'compras', 'eq-escritorio'),
    p('u-rui', v.pessoas['u-rui'], 'fabricacao', 'eq-fabricacao'),
    p('u-tiago', v.pessoas['u-tiago'], 'fabricacao', 'eq-fabricacao'),
    p('u-joao', v.pessoas['u-joao'], 'montagem', 'eq-montagem-a'),
    p('u-miguel', v.pessoas['u-miguel'], 'montagem', 'eq-montagem-a'),
    p('u-pedro', v.pessoas['u-pedro'], 'montagem', 'eq-montagem-b'),
  ]

  const etapasModelo: Linhas['etapasModelo'] = ETAPAS_INICIAIS.map((nome, i) => ({
    id: `et-${i + 1}`,
    nome,
    ordem: i + 1,
    // Pós-venda é Fase 2: existe no modelo mas fica inativa.
    ativa: nome !== 'Pós-venda',
    visivelCliente: !['Pedidos a fornecedores', 'Receção de materiais'].includes(nome),
  }))

  const atividades: Linhas['atividades'] = etapasModelo.flatMap((e) =>
    (ATIVIDADES[e.nome] ?? ['Trabalho geral']).map((nome, i) => ({
      id: `at-${e.ordem}-${i + 1}`,
      etapaModeloId: e.id,
      nome,
      ativa: true,
    })),
  )

  const clientes: Linhas['clientes'] = v.clientes.map(([nome, telefone], i) => ({
    id: `cl-${i + 1}`,
    nome,
    email: i === 4 ? null : `cliente${i + 1}@example.com`,
    telefone,
    nif: null,
  }))

  const proj = (
    id: string,
    referencia: string,
    titulo: string,
    clienteId: string,
    morada: string,
    estado: Db['projetos'][number]['estado'],
    valor: number | null,
    obraId: string | null,
    diasAtras: number,
  ) => ({
    id,
    referencia,
    titulo,
    clienteId,
    morada,
    estado,
    valorProposta: valor,
    responsavelId: 'u-carlos',
    obraId,
    criadoEm: iso(-diasAtras * dia),
    atualizadoEm: iso(-Math.min(diasAtras, 3) * dia),
  })
  // [referência, cliente, estado, obra, criado há N dias] — títulos, localidades e valores vêm da variante.
  const projetos: Linhas['projetos'] = (
    [
      ['P-2026-009', 'aprovado', 'ob-1', 60],
      ['P-2026-012', 'aprovado', 'ob-2', 75],
      ['P-2026-019', 'aprovado', 'ob-3', 30],
      ['P-2026-027', 'proposta', null, 12],
      ['P-2026-031', 'medicao', null, 4],
      // Obras já concluídas (histórico para o dashboard).
      ['P-2026-001', 'aprovado', 'ob-4', 190],
      ['P-2026-004', 'aprovado', 'ob-5', 170],
      ['P-2026-006', 'aprovado', 'ob-6', 130],
      ['P-2026-008', 'aprovado', 'ob-7', 100],
    ] as const
  ).map(([referencia, estado, obraId, diasAtras], i) =>
    proj(`pr-${i + 1}`, referencia, v.projetos[i][0], `cl-${i + 1}`, v.projetos[i][1], estado, v.projetos[i][2], obraId, diasAtras),
  )

  const obras: Linhas['obras'] = [
    {
      id: 'ob-1',
      codigo: '2026-014',
      projetoId: 'pr-1',
      clienteId: 'cl-1',
      titulo: v.obras[0],
      morada: v.projetos[0][1],
      estado: 'ativa',
      qrToken: 'demo2026014obra1',
      dataInicio: iso(-40 * dia),
      dataPrevistaFim: iso(25 * dia),
      valorContratado: v.projetos[0][2],
      criadoEm: iso(-40 * dia),
    },
    {
      id: 'ob-2',
      codigo: '2026-017',
      projetoId: 'pr-2',
      clienteId: 'cl-2',
      titulo: v.obras[1],
      morada: v.projetos[1][1],
      estado: 'ativa',
      qrToken: 'demo2026017obra2',
      dataInicio: iso(-55 * dia),
      dataPrevistaFim: iso(-2 * dia),
      valorContratado: v.projetos[1][2],
      criadoEm: iso(-55 * dia),
    },
    {
      id: 'ob-3',
      codigo: '2026-021',
      projetoId: 'pr-3',
      clienteId: 'cl-3',
      titulo: v.obras[2],
      morada: v.projetos[2][1],
      estado: 'ativa',
      qrToken: 'demo2026021obra3',
      dataInicio: iso(-10 * dia),
      dataPrevistaFim: iso(40 * dia),
      valorContratado: v.projetos[2][2],
      criadoEm: iso(-10 * dia),
    },
  ]

  // Obras concluídas: [id, código, projeto, cliente, título, morada, início (dias atrás), fim (dias atrás), valor]
  const concluidas: [string, string, string, string, string, string, number, number, number][] = [
    ['ob-4', '2026-003', 'pr-6', 'cl-6', v.obras[3], v.projetos[5][1], 175, 128, v.projetos[5][2]!],
    ['ob-5', '2026-006', 'pr-7', 'cl-7', v.obras[4], v.projetos[6][1], 155, 92, v.projetos[6][2]!],
    ['ob-6', '2026-009', 'pr-8', 'cl-8', v.obras[5], v.projetos[7][1], 118, 58, v.projetos[7][2]!],
    ['ob-7', '2026-011', 'pr-9', 'cl-9', v.obras[6], v.projetos[8][1], 88, 36, v.projetos[8][2]!],
  ]
  for (const [id, codigo, projetoId, clienteId, titulo, morada, ini, fim, valor] of concluidas)
    obras.push({
      id,
      codigo,
      projetoId,
      clienteId,
      titulo,
      morada,
      estado: 'concluida',
      qrToken: `demo${codigo.replace('-', '')}${id.replace('-', '')}`,
      dataInicio: iso(-ini * dia),
      dataPrevistaFim: iso(-(id === 'ob-5' ? fim + 12 : fim) * dia),
      valorContratado: valor,
      criadoEm: iso(-ini * dia),
    })

  const obraEquipas: Linhas['obraEquipas'] = [
    { obraId: 'ob-1', equipaId: 'eq-fabricacao' },
    { obraId: 'ob-1', equipaId: 'eq-montagem-a' },
    { obraId: 'ob-2', equipaId: 'eq-fabricacao' },
    { obraId: 'ob-2', equipaId: 'eq-montagem-a' },
    { obraId: 'ob-2', equipaId: 'eq-montagem-b' },
    { obraId: 'ob-3', equipaId: 'eq-fabricacao' },
    ...['ob-4', 'ob-5', 'ob-6', 'ob-7'].flatMap((obraId) => [
      { obraId, equipaId: 'eq-fabricacao' },
      { obraId, equipaId: obraId === 'ob-5' || obraId === 'ob-6' ? 'eq-montagem-b' : 'eq-montagem-a' },
    ]),
  ]

  // Responsáveis: orçamentação em todas; a administração acompanha também as duas maiores.
  const obraResponsaveis: Linhas['obraResponsaveis'] = obras.flatMap((o) =>
    ['u-carlos', ...(o.id === 'ob-2' || o.id === 'ob-6' ? ['u-ana'] : [])].map((perfilId) => ({
      id: `or-${o.id}-${perfilId}`,
      obraId: o.id,
      perfilId,
      criadoEm: o.criadoEm,
      removidoEm: null,
    })),
  )

  // Etapa atual por obra (índice no array de etapas ativas): 2026-014 em Fabricação, 2026-017 em Montagem, 2026-021 em Pedidos.
  const atual: Record<string, number> = { 'ob-1': 5, 'ob-2': 7, 'ob-3': 3 }
  const ativas = etapasModelo.filter((e) => e.ativa)
  /* Plano de horas por etapa: [previstas, reais]. Reais = total que o gerador de registos distribui.
     2026-017 passou a fabricação e está em risco na montagem; 2026-006 (concluída) deu prejuízo. */
  const plano: Record<string, Record<string, [number | null, number]>> = {
    'ob-1': {
      Medição: [6, 6],
      'Projeto e especificação': [8, 10],
      'Pedidos a fornecedores': [3, 3],
      'Receção de materiais': [2, 2],
      Fabricação: [60, 24],
      'Preparação e expedição': [8, 0],
      Montagem: [70, 0],
      'Verificação final': [4, 0],
    },
    'ob-2': {
      Medição: [12, 11],
      'Projeto e especificação': [16, 18],
      'Pedidos a fornecedores': [4, 4],
      'Receção de materiais': [3, 4],
      Fabricação: [120, 152],
      'Preparação e expedição': [14, 15],
      Montagem: [160, 118],
      'Verificação final': [6, 0],
    },
    'ob-3': {
      Medição: [3, 0],
      'Projeto e especificação': [4, 0],
      'Pedidos a fornecedores': [2, 1],
      'Receção de materiais': [1, 0],
      Fabricação: [22, 0],
      'Preparação e expedição': [3, 0],
      Montagem: [24, 0],
      'Verificação final': [2, 0],
    },
    'ob-4': {
      Medição: [4, 4],
      'Projeto e especificação': [6, 5],
      'Pedidos a fornecedores': [2, 2],
      'Receção de materiais': [2, 1],
      Fabricação: [40, 37],
      'Preparação e expedição': [5, 5],
      Montagem: [40, 44],
      'Verificação final': [3, 2],
    },
    'ob-5': {
      Medição: [6, 7],
      'Projeto e especificação': [10, 16],
      'Pedidos a fornecedores': [3, 4],
      'Receção de materiais': [2, 3],
      Fabricação: [70, 112],
      'Preparação e expedição': [8, 11],
      Montagem: [80, 146],
      'Verificação final': [4, 9],
    },
    'ob-6': {
      Medição: [10, 9],
      'Projeto e especificação': [14, 13],
      'Pedidos a fornecedores': [4, 4],
      'Receção de materiais': [3, 3],
      Fabricação: [130, 121],
      'Preparação e expedição': [12, 12],
      Montagem: [140, 151],
      'Verificação final': [5, 5],
    },
    'ob-7': {
      Medição: [5, 5],
      'Projeto e especificação': [7, 8],
      'Pedidos a fornecedores': [2, 2],
      'Receção de materiais': [2, 2],
      Fabricação: [45, 49],
      'Preparação e expedição': [6, 5],
      Montagem: [50, 47],
      'Verificação final': [3, 3],
    },
  }
  const obraEtapas: Linhas['obraEtapas'] = obras
    .filter((o) => o.id in atual)
    .flatMap((o) =>
      ativas.map((e, i) => ({
        id: `oe-${o.id}-${e.ordem}`,
        obraId: o.id,
        etapaModeloId: e.id,
        nome: e.nome,
        ordem: e.ordem,
        estado: i < atual[o.id] ? ('concluida' as const) : i === atual[o.id] ? ('em_curso' as const) : ('por_iniciar' as const),
        visivelCliente: e.visivelCliente,
        dataPrevista: iso((i - atual[o.id] + 1) * 6 * dia),
        iniciadaEm: i <= atual[o.id] ? iso((i - atual[o.id] - 1) * 5 * dia) : null,
        concluidaEm: i < atual[o.id] ? iso((i - atual[o.id]) * 5 * dia) : null,
        horasPrevistas: plano[o.id][e.nome]?.[0] ?? null,
      })),
    )

  /* Janelas (dias atrás) de cada etapa com horas: sequenciais, proporcionais às horas reais.
     Nas obras ativas o gerador para 4 dias antes de hoje (os registos recentes são os feitos à mão abaixo). */
  const janelas: Record<string, Record<string, [number, number]>> = {}
  for (const o of obras) {
    const ini = Math.round((agora.getTime() - new Date(o.dataInicio).getTime()) / dia)
    const fim =
      o.estado === 'concluida'
        ? Math.round((agora.getTime() - new Date(o.dataPrevistaFim!).getTime()) / dia) - (o.id === 'ob-5' ? 12 : 0)
        : 4
    const comHoras = ativas.filter((e) => (plano[o.id][e.nome]?.[1] ?? 0) > 0)
    const total = comHoras.reduce((s, e) => s + Math.sqrt(plano[o.id][e.nome][1]), 0)
    let cursor = ini
    janelas[o.id] = {}
    for (const e of comHoras) {
      const dur = Math.max(1, Math.round(((ini - fim) * Math.sqrt(plano[o.id][e.nome][1])) / total))
      janelas[o.id][e.nome] = [cursor, Math.max(fim, cursor - dur)]
      cursor = Math.max(fim, cursor - dur)
    }
  }
  for (const o of obras.filter((x) => x.estado === 'concluida'))
    ativas.forEach((e) => {
      const j = janelas[o.id][e.nome]
      obraEtapas.push({
        id: `oe-${o.id}-${e.ordem}`,
        obraId: o.id,
        etapaModeloId: e.id,
        nome: e.nome,
        ordem: e.ordem,
        estado: 'concluida',
        visivelCliente: e.visivelCliente,
        dataPrevista: j ? iso(-(j[1] - (o.id === 'ob-5' ? 0 : 1)) * dia) : o.dataInicio,
        iniciadaEm: j ? iso(-j[0] * dia) : o.dataInicio,
        concluidaEm: j ? iso(-j[1] * dia) : o.dataInicio,
        horasPrevistas: plano[o.id][e.nome]?.[0] ?? null,
      })
    })

  const el = (
    obraId: string,
    referencia: string,
    tipo: Db['elementos'][number]['tipo'],
    descricao: string,
    divisao: string,
    estado: Db['elementos'][number]['estado'],
    qrAtivo = false,
  ) => ({
    id: `el-${obraId}-${referencia}`,
    obraId,
    referencia,
    tipo,
    descricao,
    divisao,
    estado,
    qrAtivo,
    qrToken: `demo${obraId}${referencia}`.toLowerCase().replace(/[^a-z0-9]/g, ''),
  })
  const elementos: Linhas['elementos'] = [
    el('ob-1', 'J01', 'janela', 'Janela oscilobatente 2 folhas 1400×1200', 'Cozinha', 'fabricado'),
    el('ob-1', 'J02', 'janela', 'Janela oscilobatente 1 folha 800×1200', 'WC', 'em_fabricacao'),
    el('ob-1', 'P01', 'porta_correr', 'Porta de correr elevatória 3600×2400', 'Sala', 'em_fabricacao', true),
    el('ob-1', 'E01', 'estore', 'Estore térmico motorizado', 'Sala', 'por_fabricar'),
    el('ob-2', 'J01', 'janela', 'Janela de batente — fração A', 'Fração A', 'montado'),
    el('ob-2', 'J02', 'janela', 'Janela de batente — fração B', 'Fração B', 'montado'),
    el('ob-2', 'J03', 'janela', 'Janela de batente — fração C', 'Fração C', 'expedido'),
    el('ob-2', 'V01', 'vidro', 'Guarda em vidro laminado', 'Varandas', 'fabricado'),
    el('ob-3', 'J01', 'janela', 'Janela de correr 2 folhas', 'Quarto', 'por_fabricar'),
    el('ob-3', 'P01', 'porta', 'Porta de entrada em alumínio', 'Entrada', 'por_fabricar'),
    // Obras concluídas: elementos para as métricas por elemento.
    ...(
      [
        ['ob-4', 6],
        ['ob-5', 8],
        ['ob-6', 18],
        ['ob-7', 9],
      ] as const
    ).flatMap(([obraId, qtd]) =>
      Array.from({ length: qtd }, (_, i) =>
        el(
          obraId,
          `${i % 4 === 3 ? 'P' : 'J'}${String(i + 1).padStart(2, '0')}`,
          i % 4 === 3 ? 'porta' : 'janela',
          i % 4 === 3 ? 'Porta de batente' : 'Janela de batente',
          `Divisão ${i + 1}`,
          'verificado',
        ),
      ),
    ),
  ]

  const etapaDe = (obraId: string, nome: string) => obraEtapas.find((e) => e.obraId === obraId && e.nome === nome)!.id
  const atv = (etapaNome: string, i = 0) =>
    atividades.filter((a) => a.etapaModeloId === etapasModelo.find((e) => e.nome === etapaNome)!.id)[i].id
  let n = 0
  const tempo = (
    obraId: string,
    etapa: string,
    atividade: number,
    perfilId: string,
    inicio: string,
    duracaoMin: number | null,
    elementoId: string | null = null,
  ) => {
    const perfil = perfis.find((x) => x.id === perfilId)!
    const fim = duracaoMin == null ? null : new Date(new Date(inicio).getTime() + duracaoMin * 60e3).toISOString()
    n++
    return {
      id: `rt-${n}`,
      clientId: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
      obraId,
      obraEtapaId: etapaDe(obraId, etapa),
      atividadeId: atv(etapa, atividade),
      elementoId,
      perfilId,
      equipaId: perfil.equipaId,
      inicio,
      fim,
      duracaoMin,
      nota: null,
      origem: 'manual' as const,
      estadoSync: 'sincronizado' as const,
      criadoEm: inicio,
      arquivadoEm: null,
    }
  }
  const registosTempo: Linhas['registosTempo'] = [
    tempo('ob-1', 'Fabricação', 0, 'u-rui', em(3, 8, 30), 210, 'el-ob-1-J01'),
    tempo('ob-1', 'Fabricação', 2, 'u-rui', em(2, 9, 0), 180, 'el-ob-1-J01'),
    tempo('ob-1', 'Fabricação', 0, 'u-tiago', em(2, 8, 30), 240, 'el-ob-1-P01'),
    tempo('ob-1', 'Fabricação', 1, 'u-tiago', em(1, 14, 0), 150, 'el-ob-1-P01'),
    tempo('ob-1', 'Fabricação', 2, 'u-rui', em(0, 8, 30), null, 'el-ob-1-J02'),
    tempo('ob-2', 'Montagem', 1, 'u-joao', em(2, 8, 0), 300, 'el-ob-2-J01'),
    tempo('ob-2', 'Montagem', 2, 'u-miguel', em(2, 8, 0), 300, 'el-ob-2-J01'),
    tempo('ob-2', 'Montagem', 3, 'u-joao', em(1, 8, 0), 240, 'el-ob-2-J02'),
    tempo('ob-2', 'Montagem', 1, 'u-pedro', em(0, 8, 15), 195),
    tempo('ob-3', 'Medição', 0, 'u-carlos', em(8, 10, 0), 90),
    tempo('ob-3', 'Projeto e especificação', 0, 'u-carlos', em(6, 14, 0), 120),
  ]

  /* Gerador do histórico de registos (determinístico): reparte as horas reais de cada etapa
     por dias úteis dentro da janela da etapa, pelas pessoas do papel certo. */
  const rnd = prng(2026)
  const pessoasPorEtapa = (obraId: string, etapa: string) => {
    if (['Medição', 'Projeto e especificação', 'Verificação final'].includes(etapa))
      return etapa === 'Verificação final' ? ['u-carlos', 'u-joao'] : ['u-carlos']
    if (['Pedidos a fornecedores', 'Receção de materiais'].includes(etapa)) return ['u-sofia']
    if (['Fabricação', 'Preparação e expedição'].includes(etapa)) return ['u-rui', 'u-tiago']
    const equipasObra = obraEquipas.filter((x) => x.obraId === obraId).map((x) => x.equipaId)
    return perfis.filter((x) => x.papel === 'montagem' && equipasObra.includes(x.equipaId!)).map((x) => x.id)
  }
  const ocupado = new Map<string, number>()
  let g = 0
  for (const o of obras) {
    for (const [nome, [, reais]] of Object.entries(plano[o.id])) {
      const j = janelas[o.id][nome]
      if (!reais || !j) continue
      const pessoas = pessoasPorEtapa(o.id, nome)
      const nAtiv = atividades.filter((a) => a.etapaModeloId === etapasModelo.find((e) => e.nome === nome)!.id).length
      let falta = reais * 60
      let k = 0
      const blocos = Math.max(1, Math.round(reais / 5))
      while (falta > 0) {
        let diasAtras = Math.round(j[0] - ((j[0] - j[1]) * (k % blocos)) / blocos)
        const d = new Date(agora.getTime() - diasAtras * dia)
        if (d.getDay() === 6) diasAtras += 1
        if (d.getDay() === 0) diasAtras += 2
        const perfilId = pessoas[k % pessoas.length]
        const chave = `${perfilId}:${diasAtras}`
        const usado = ocupado.get(chave) ?? 0
        const dur = Math.min(falta, Math.round((150 + rnd() * 270) / 15) * 15)
        ocupado.set(chave, usado + dur + 30)
        const h = 8 * 60 + usado
        const r = tempo(o.id, nome, Math.floor(rnd() * nAtiv), perfilId, em(diasAtras, Math.floor(h / 60), h % 60), dur)
        g++
        registosTempo.push({ ...r, id: `rt-g${g}`, clientId: `00000000-0000-4000-9000-${String(g).padStart(12, '0')}` })
        falta -= dur
        k++
      }
    }
  }

  /* Custo/hora (fictício, igual nas duas empresas). O Rui foi aumentado em julho: as obras antigas mantêm o valor antigo. */
  const desdeInicio = chaveDia(iso(-365 * dia))
  const custosHora: Linhas['custosHora'] = (
    [
      ['u-ana', 22],
      ['u-carlos', 19],
      ['u-sofia', 16],
      ['u-rui', 15],
      ['u-tiago', 13.5],
      ['u-joao', 14],
      ['u-miguel', 12.5],
      ['u-pedro', 13],
    ] as const
  ).map(([perfilId, valor]) => ({ id: `ch-${perfilId}`, perfilId, valor, desde: desdeInicio, criadoEm: iso(-365 * dia), autorId: 'u-ana' }))
  custosHora.push({
    id: 'ch-u-rui-2',
    perfilId: 'u-rui',
    valor: 16.5,
    desde: chaveDia(iso(-100 * dia)),
    criadoEm: iso(-100 * dia),
    autorId: 'u-ana',
  })

  /* Custos diretos: [obra, tipo, descrição, valor, dias atrás] */
  const cd: [string, Db['custosDiretos'][number]['tipo'], string, number, number][] = [
    ['ob-1', 'materiais', 'Perfis de alumínio com rutura térmica', 4870, 30],
    ['ob-1', 'vidro', 'Vidro duplo baixo emissivo', 2150, 24],
    ['ob-1', 'acessorios', 'Ferragens oscilobatentes e elevatória', 1180, 22],
    ['ob-2', 'materiais', 'Perfis de alumínio — 6 frações', 11900, 48],
    ['ob-2', 'vidro', 'Vidro duplo e guardas laminadas', 6420, 42],
    ['ob-2', 'acessorios', 'Ferragens e vedantes', 2260, 40],
    ['ob-2', 'transporte', 'Grua e transporte para obra', 1350, 12],
    ['ob-3', 'materiais', 'Perfis (sinal ao fornecedor)', 900, 5],
    ['ob-4', 'materiais', 'Perfis de alumínio', 2780, 165],
    ['ob-4', 'vidro', 'Vidro duplo', 1240, 160],
    ['ob-4', 'acessorios', 'Ferragens', 520, 158],
    ['ob-4', 'transporte', 'Transporte', 160, 135],
    ['ob-5', 'materiais', 'Perfis de alumínio e montra', 4950, 145],
    ['ob-5', 'vidro', 'Vidro laminado de segurança', 3180, 140],
    ['ob-5', 'acessorios', 'Automatismos de portas', 2240, 138],
    ['ob-5', 'vidro', 'Substituição de vidro partido na montagem', 690, 105],
    ['ob-5', 'subempreitada', 'Serralharia de reforço da montra', 980, 100],
    ['ob-5', 'transporte', 'Transporte e plataforma elevatória', 420, 98],
    ['ob-6', 'materiais', 'Perfis de alumínio — 18 vãos', 7650, 110],
    ['ob-6', 'vidro', 'Vidro duplo', 3920, 104],
    ['ob-6', 'acessorios', 'Ferragens', 1480, 102],
    ['ob-6', 'transporte', 'Transporte', 380, 70],
    ['ob-7', 'materiais', 'Perfis de alumínio', 3120, 80],
    ['ob-7', 'vidro', 'Vidro duplo', 1460, 76],
    ['ob-7', 'acessorios', 'Estores térmicos e motores', 1290, 74],
    ['ob-7', 'transporte', 'Transporte', 150, 45],
  ]
  const custosDiretos: Linhas['custosDiretos'] = cd.map(([obraId, tipo, descricao, valor, diasAtras], i) => ({
    id: `cd-${i + 1}`,
    obraId,
    tipo,
    descricao,
    valor: Math.round((valor * v.fatorCustos) / 10) * 10,
    data: chaveDia(iso(-diasAtras * dia)),
    autorId: 'u-sofia',
    criadoEm: iso(-diasAtras * dia),
    arquivadoEm: null,
  }))

  const nota = (
    id: string,
    obraId: string,
    tipo: Db['notas'][number]['tipo'],
    texto: string,
    autorId: string,
    criadoEm: string,
    extra: Partial<Db['notas'][number]> = {},
  ) => ({
    id,
    clientId: crypto.randomUUID(),
    obraId,
    obraEtapaId: null,
    elementoId: null,
    tipo,
    texto,
    interna: true,
    resolvida: false,
    autorId,
    criadoEm,
    arquivadoEm: null,
    ...extra,
  })
  const notas: Linhas['notas'] = [
    nota(
      'nt-1',
      'ob-1',
      'material_em_falta',
      'Faltam os puxadores da porta de correr P01. Pedido feito ao fornecedor.',
      'u-tiago',
      em(1, 16, 10),
      { elementoId: 'el-ob-1-P01', obraEtapaId: etapaDe('ob-1', 'Fabricação') },
    ),
    nota('nt-2', 'ob-2', 'atraso', 'Grua indisponível na fração C — montagem da J03 adiada para amanhã.', 'u-joao', em(0, 11, 20), {
      elementoId: 'el-ob-2-J03',
      obraEtapaId: etapaDe('ob-2', 'Montagem'),
    }),
    nota('nt-3', 'ob-2', 'observacao', 'Frações A e B concluídas e limpas.', 'u-miguel', em(1, 17, 0), {
      obraEtapaId: etapaDe('ob-2', 'Montagem'),
    }),
    nota(
      'nt-4',
      'ob-3',
      'alteracao_solicitada',
      'Cliente pediu cor antracite em vez de branco na porta de entrada.',
      'u-carlos',
      em(5, 10, 0),
    ),
  ]

  return {
    equipas,
    perfis,
    clientes,
    projetos,
    obras,
    obraEquipas,
    obraResponsaveis,
    etapasModelo,
    atividades,
    obraEtapas,
    elementos,
    registosTempo,
    notas,
    fotografias: [],
    historico: [],
    custosHora,
    custosDiretos,
  }
}
