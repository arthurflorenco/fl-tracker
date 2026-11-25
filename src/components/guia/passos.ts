/**
 * Guia da demonstração: o percurso que o cliente segue sozinho no computador.
 * Os textos podem ser afinados aqui sem mexer na lógica (Guia.tsx / Destaque.tsx).
 * Os alvos são atributos `data-guia="…"` nos ecrãs da app. Cada texto tem versão em português e inglês.
 */
import type { Idioma } from '@/i18n/config'

/** Pessoas e obra fictícias usadas no percurso (src/lib/mock/seed.ts). */
export const FUNCIONARIO = 'u-tiago'
export const ADMINISTRACAO = 'u-ana'
export const OBRA = 'ob-1'

/** Texto do guia nos dois idiomas da interface. */
export type Texto = Record<Idioma, string>

export interface Passo {
  id: string
  /** Página (pathname) onde o passo aparece; '*' = em qualquer página. */
  pagina: string
  /** Quem deve ter sessão iniciada para ver o passo (null = sem sessão, em /entrar). */
  perfil: string | null
  /** Valor de `data-guia` a destacar. Sem alvo, o balão aparece ao centro. */
  alvo?: string
  titulo: Texto
  texto: Texto
  /**
   * Como se avança: por defeito, com o botão "Seguinte". Com `pagina`, quando o cliente
   * chega a essa página; com `elemento`, quando esse `data-guia` aparece no ecrã.
   */
  ate?: { pagina: string } | { elemento: string }
  /** Botão de ação no balão: ir para uma página ou entrar como outra pessoa. */
  acao?: { label: Texto; href: string } | { label: Texto; entrarComo: string; destino: string }
}

const obra = `/admin/obras/${OBRA}`

export const PASSOS: Passo[] = [
  {
    id: 'boas-vindas',
    pagina: '/entrar',
    perfil: null,
    titulo: { pt: 'Bem-vindo ao FL Tracker', en: 'Welcome to FL Tracker' },
    texto: {
      pt: 'Esta é uma demonstração da plataforma para acompanhar as obras de uma empresa de caixilharia, do orçamento à montagem. Em cerca de 8 minutos vai ver a app do lado de quem trabalha na oficina e do lado do escritório. Os nomes, obras e valores são fictícios.',
      en: 'This is a demo of a platform that tracks the projects of a window and glazing company, from quote to installation. In about 8 minutes you will see the app from the workshop side and from the office side. Names, projects and figures are fictitious.',
    },
  },
  {
    id: 'escolher-funcionario',
    pagina: '/entrar',
    perfil: null,
    alvo: `perfil-${FUNCIONARIO}`,
    titulo: { pt: 'Cada pessoa tem a sua conta', en: 'Everyone has their own account' },
    texto: {
      pt: 'Na versão final cada funcionário entra com o seu email e palavra-passe. Aqui basta escolher a pessoa. Comece pelo Tiago, da equipa de fabricação: clique no nome dele.',
      en: 'In the real version every employee signs in with their email and password. Here you just pick the person. Start with Tiago, from the fabrication team: click his name.',
    },
    ate: { pagina: '/admin' },
  },
  {
    id: 'painel-funcionario',
    pagina: '/admin',
    perfil: FUNCIONARIO,
    alvo: 'painel-obras',
    titulo: { pt: 'O que o Tiago vê', en: 'What Tiago sees' },
    texto: {
      pt: 'Só as obras da sua equipa, quem está a trabalhar agora e os problemas em aberto. Quem trabalha na oficina ou em obra nunca vê valores em euros, custos ou margens.',
      en: "Only his team's projects, who is working right now and the open issues. People in the workshop or on site never see euro amounts, costs or margins.",
    },
  },
  {
    id: 'ler-qr',
    pagina: '/admin',
    perfil: FUNCIONARIO,
    titulo: { pt: 'Na oficina: ler o QR Code', en: 'In the workshop: scan the QR code' },
    texto: {
      pt: 'Cada obra tem um QR Code impresso, colado no carrinho de fabricação ou na obra. O funcionário aponta a câmara do tablet e a obra abre logo, sem procurar em listas. Vamos simular a leitura.',
      en: 'Each project has a printed QR code, stuck on the fabrication cart or on site. The employee points the tablet camera at it and the project opens straight away, no searching through lists. Let’s simulate a scan.',
    },
    acao: { label: { pt: 'Ver o QR Code da obra', en: "See the project's QR code" }, href: '/demo/qr' },
    ate: { pagina: '/demo/qr' },
  },
  {
    id: 'clicar-qr',
    pagina: '/demo/qr',
    perfil: FUNCIONARIO,
    alvo: 'qr-obra',
    titulo: { pt: 'Este é o QR Code da obra', en: "This is the project's QR code" },
    texto: {
      pt: 'No computador, clique no código para o "ler". (Também pode lê-lo com a câmara do telemóvel.)',
      en: 'On a computer, click the code to "scan" it. (You can also scan it with your phone camera.)',
    },
    ate: { pagina: obra },
  },
  {
    id: 'obra-registar',
    pagina: obra,
    perfil: FUNCIONARIO,
    alvo: 'obra-registar',
    titulo: { pt: 'A página da obra', en: 'The project page' },
    texto: {
      pt: 'Etapas, elementos (janelas, portas, estores…), tempos, notas e fotografias, tudo num só sítio. Para registar o trabalho, clique em Registar.',
      en: 'Stages, items (windows, doors, shutters…), time, notes and photos, all in one place. To log work, click Log time.',
    },
    ate: { pagina: `${obra}/registar` },
  },
  {
    id: 'iniciar',
    pagina: `${obra}/registar`,
    perfil: FUNCIONARIO,
    alvo: 'registo-iniciar',
    titulo: { pt: 'Começar a trabalhar', en: 'Start working' },
    texto: {
      pt: 'O Tiago escolhe a etapa, a atividade e, se quiser, o elemento em que está a trabalhar. Enquanto trabalha, o ecrã mostra o tempo a contar; o registo fica sempre em quartos de hora. Clique em Iniciar.',
      en: 'Tiago picks the stage, the activity and, optionally, the item he is working on. While he works, the screen shows a running timer; the entry is always stored in quarter hours. Click Start.',
    },
    ate: { elemento: 'registo-terminar' },
  },
  {
    id: 'nota',
    pagina: `${obra}/registar`,
    perfil: FUNCIONARIO,
    alvo: 'registo-nota',
    titulo: { pt: 'Notas e fotografias', en: 'Notes and photos' },
    texto: {
      pt: 'Durante o trabalho pode deixar uma nota classificada (problema, falta de material, atraso, informação…) e tirar fotografias. O escritório vê-as logo no painel. Experimente, se quiser.',
      en: 'While working he can leave a categorised note (problem, missing material, delay, information…) and take photos. The office sees them on the dashboard right away. Try it if you like.',
    },
  },
  {
    id: 'terminar',
    pagina: `${obra}/registar`,
    perfil: FUNCIONARIO,
    alvo: 'registo-terminar',
    titulo: { pt: 'Terminar', en: 'Finish' },
    texto: {
      pt: 'Pode terminar a qualquer momento: o início arredonda para baixo e o fim para o quarto de hora seguinte, a favor do funcionário (começou às 17:00 e termina logo → 17:00–17:15). O próximo registo começa onde este acabou. Durante 24 horas pode corrigir os próprios registos, sem aprovação; depois disso o registo fica fechado e só a administração o altera. Clique em Terminar.',
      en: 'He can finish at any time: the start rounds down and the end rounds up to the next quarter hour, in the employee’s favour (started at 17:00 and finishes right away → 17:00–17:15). The next entry starts where this one ended. For 24 hours he can correct his own entries without approval; after that the entry is locked and only management can change it. Click Finish.',
    },
    ate: { elemento: 'registo-iniciar' },
  },
  {
    id: 'trocar-administracao',
    pagina: `${obra}/registar`,
    perfil: FUNCIONARIO,
    titulo: { pt: 'Agora o lado do escritório', en: 'Now the office side' },
    texto: {
      pt: 'O registo do Tiago ficou guardado. Vamos ver a mesma informação como a administração (Ana Ribeiro), que acompanha todas as obras, os custos e as margens.',
      en: "Tiago's entry is saved. Let's look at the same information as management (Ana Ribeiro), who follows every project, the costs and the margins.",
    },
    acao: { label: { pt: 'Entrar como administração', en: 'Sign in as management' }, entrarComo: ADMINISTRACAO, destino: '/admin' },
    ate: { pagina: '/admin' },
  },
  {
    id: 'painel-administracao',
    pagina: '/admin',
    perfil: ADMINISTRACAO,
    alvo: 'painel-empresa',
    titulo: { pt: 'O painel da administração', en: 'The management dashboard' },
    texto: {
      pt: 'Valor das obras, margem real e projetada, horas registadas e obras em risco, no período escolhido. Mais abaixo, gráficos de horas por semana e por etapa e de valor vs. custo. Os valores em euros só aparecem a quem tem o papel de administração.',
      en: 'Project value, actual and projected margin, hours logged and projects at risk, for the chosen period. Further down, charts of hours per week and per stage, and value vs. cost. Euro amounts are only shown to the management role.',
    },
  },
  {
    id: 'ir-analise',
    pagina: '/admin',
    perfil: ADMINISTRACAO,
    alvo: 'nav-analise',
    titulo: { pt: 'Análise', en: 'Analytics' },
    texto: {
      pt: 'Para comparar obras entre si e ver o custo de cada pessoa, abra a Análise.',
      en: "To compare projects and see each person's cost, open Analytics.",
    },
    ate: { pagina: '/admin/analise' },
  },
  {
    id: 'analise',
    pagina: '/admin/analise',
    perfil: ADMINISTRACAO,
    alvo: 'analise-obras',
    titulo: { pt: 'Previsto vs. real, obra a obra', en: 'Planned vs. actual, project by project' },
    texto: {
      pt: 'Valor contratado, custo real (horas × custo/hora + custos diretos) e margem. Aqui vê logo a obra em risco e a que deu prejuízo, e pode comparar até 4 obras etapa a etapa. No separador Funcionários vê as horas e o custo de cada pessoa.',
      en: 'Contract value, actual cost (hours × hourly cost + direct costs) and margin. You can spot the project at risk and the one that made a loss, and compare up to 4 projects stage by stage. The Employees tab shows each person’s hours and cost.',
    },
  },
  {
    id: 'ir-obra',
    pagina: '/admin/analise',
    perfil: ADMINISTRACAO,
    titulo: { pt: 'Tudo fica registado', en: 'Everything is recorded' },
    texto: {
      pt: 'Vamos voltar à obra onde o Tiago registou o tempo e ver o histórico.',
      en: 'Let’s go back to the project where Tiago logged time and look at the history.',
    },
    acao: { label: { pt: 'Abrir a obra 2026-014', en: 'Open project 2026-014' }, href: obra },
    ate: { pagina: obra },
  },
  {
    id: 'abrir-historico',
    pagina: obra,
    perfil: ADMINISTRACAO,
    alvo: 'tab-historico',
    titulo: { pt: 'A obra vista pela administração', en: 'The project as management sees it' },
    texto: {
      pt: 'A administração vê também o Resumo financeiro desta obra: custos, margem e projeção até ao fim. Agora abra o separador Histórico.',
      en: "Management also sees this project's financial Summary: costs, margin and projection to completion. Now open the History tab.",
    },
    ate: { elemento: 'obra-historico' },
  },
  {
    id: 'historico',
    pagina: obra,
    perfil: ADMINISTRACAO,
    alvo: 'obra-historico',
    titulo: { pt: 'Histórico completo', en: 'Full history' },
    texto: {
      pt: 'Toda a alteração guarda quem, o quê, quando, o antes e o depois e o motivo. Ninguém apaga definitivamente: a administração só arquiva. O registo que fez como Tiago está aqui.',
      en: 'Every change records who, what, when, before and after, and the reason. Nothing is ever permanently deleted: management only archives. The entry you made as Tiago is here.',
    },
  },
  {
    id: 'fim',
    pagina: '*',
    perfil: null,
    titulo: { pt: 'Fim da demonstração', en: 'End of the demo' },
    texto: {
      pt: 'A app também tem os projetos em orçamento e a sua conversão em obra, as equipas e os utilizadores, as etapas configuráveis e a exportação para Excel (CSV). É multi-empresa: entre como alguém da Ribeira Window Systems e verá que cada empresa só vê os seus dados. Explore à vontade: pode entrar como qualquer pessoa, recomeçar o guia ou repor os dados no botão "Guia", no canto do ecrã.',
      en: 'The app also covers quotes and their conversion into projects, teams and users, configurable stages and export to Excel (CSV). It is multi-company: sign in as someone from Ribeira Window Systems and you will see that each company only sees its own data. Explore freely: sign in as anyone, restart the guide or reset the data with the "Guide" button in the corner of the screen.',
    },
  },
]
