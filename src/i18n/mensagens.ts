/**
 * Mensagens das ações e da validação (servidor). Escrevem-se em português no código
 * (`modules/*\/actions.ts`, `schema.ts`) e traduzem-se aqui ao mostrar, como no gettext:
 * a frase portuguesa é a chave. `mensagens.test.ts` falha se uma frase nova não tiver tradução.
 */
import type { Idioma } from './config'

export const MENSAGENS_EN: Record<string, string> = {
  // Genéricas (src/lib/acao.ts)
  'Dados inválidos.': 'Invalid data.',
  'Não tem permissão para esta ação.': 'You do not have permission for this action.',
  'Não encontrado.': 'Not found.',
  'Não tem acesso a esta obra.': 'You do not have access to this project.',
  // Validação
  'A hora de fim tem de ser depois do início.': 'The end time must be after the start time.',
  'O fim tem de ser depois do início.': 'The end must be after the start.',
  'Antes do início.': 'Before the start.',
  'Atribua pelo menos uma equipa.': 'Assign at least one team.',
  'Data de fim inválida.': 'Invalid end date.',
  'Data de início inválida.': 'Invalid start date.',
  'Data inválida.': 'Invalid date.',
  'Descreva o custo.': 'Describe the cost.',
  'Descreva o elemento.': 'Describe the item.',
  'Email inválido.': 'Invalid email.',
  'Email repetido.': 'Email already in use.',
  'Escolha a etapa.': 'Choose the stage.',
  'Escolha o dia.': 'Choose the day.',
  'Escolha uma hora em quartos de hora.': 'Choose a time in quarter hours.',
  'Escolha uma pessoa.': 'Choose a person.',
  'Escreva a nota.': 'Write the note.',
  'Ficheiro inválido.': 'Invalid file.',
  'Fotografia demasiado grande.': 'Photo too large.',
  'Horas inválidas.': 'Invalid hours.',
  'Indique a referência.': 'Enter the reference.',
  'Indique o cliente.': 'Enter the client.',
  'Indique o custo por hora.': 'Enter the hourly cost.',
  'Indique o motivo da correção.': 'Enter the reason for the correction.',
  'Indique o motivo.': 'Enter the reason.',
  'Indique o nome da equipa.': 'Enter the team name.',
  'Indique o nome.': 'Enter the name.',
  'Indique o valor contratado.': 'Enter the contract value.',
  'Indique o valor.': 'Enter the amount.',
  'Indique um título.': 'Enter a title.',
  'O valor não pode ser negativo.': 'The amount cannot be negative.',
  'Valor fora do normal (0–500 €/h).': 'Unusual value (0–500 €/h).',
  'Fora do prazo.': 'Too late.',
  'No futuro.': 'In the future.',
  'Equipa inválida.': 'Invalid team.',
  'Etapa inválida.': 'Invalid stage.',
  'Pessoa inválida.': 'Invalid person.',
  'Referência repetida.': 'Duplicate reference.',
  'Já é responsável.': 'Already responsible.',
  // Registo de tempo
  'A hora de fim não pode ser no futuro.': 'The end time cannot be in the future.',
  'A hora de início não pode ser no futuro.': 'The start time cannot be in the future.',
  'O fim não pode ser no futuro.': 'The end cannot be in the future.',
  'Não pode lançar horas no futuro.': 'You cannot log hours in the future.',
  'Já tem horas registadas nesse intervalo.': 'You already have hours logged in that period.',
  'Já tem um trabalho em curso. Termine-o primeiro.': 'You already have work in progress. Finish it first.',
  'Já passaram 24 horas: este registo está fechado. Só a administração o pode alterar.':
    'More than 24 hours have passed: this entry is locked. Only management can change it.',
  'Só pode lançar horas dos últimos 7 dias. Para dias anteriores, fale com a administração.':
    'You can only log hours for the last 7 days. For earlier days, ask management.',
  'O elemento ou a atividade não pertencem a esta obra/etapa.': 'The item or activity does not belong to this project/stage.',
  'Termine o trabalho no ecrã de registo.': 'Finish the work on the time-logging screen.',
  'Este registo já está arquivado.': 'This entry is already archived.',
  'Trabalho iniciado.': 'Work started.',
  'Trabalho terminado.': 'Work finished.',
  'Horas guardadas.': 'Hours saved.',
  'Registo corrigido.': 'Entry corrected.',
  'Registo arquivado.': 'Entry archived.',
  // Projetos, obras, elementos, etapas
  'Este projeto já foi convertido em obra.': 'This quote has already been converted into a project.',
  'Este projeto já tem obra.': 'This quote already has a project.',
  'Só projetos aprovados podem ser convertidos em obra.': 'Only approved quotes can be converted into a project.',
  'Só a administração pode reabrir uma etapa concluída.': 'Only management can reopen a completed stage.',
  'Já existe um elemento com esta referência nesta obra.': 'An item with this reference already exists in this project.',
  'Elemento adicionado.': 'Item added.',
  'Estado atualizado.': 'Status updated.',
  'Etapa criada. Aplica-se às novas obras.': 'Stage created. It applies to new projects.',
  'Esta pessoa já é responsável por esta obra.': 'This person is already responsible for this project.',
  'Responsável adicionado.': 'Person in charge added.',
  // Notas, fotografias, equipas, utilizadores
  'Nota guardada.': 'Note saved.',
  'Fotografia guardada.': 'Photo saved.',
  'Equipa criada.': 'Team created.',
  'Já existe um utilizador com este email.': 'A user with this email already exists.',
  'Utilizador adicionado.': 'User added.',
  // Financeiro
  'Custo lançado.': 'Cost added.',
  'Custo/hora guardado.': 'Hourly cost saved.',
  'Horas previstas guardadas.': 'Planned hours saved.',
  'Sem alterações.': 'No changes.',
  'Valor atualizado.': 'Value updated.',
}

/** Traduz uma mensagem vinda do servidor. Mensagens desconhecidas passam como estão. */
export function traduzirMensagem(texto: string, idioma: Idioma) {
  return idioma === 'pt' ? texto : (MENSAGENS_EN[texto] ?? texto)
}
