# Produto — FL Tracker

## Visão

Plataforma web para empresas de caixilharia (alumínio, vidro, estores) acompanharem todo o ciclo das suas obras, do orçamento ao pós-venda. Multi-empresa: várias empresas usam a mesma instalação, cada uma só vê os seus dados. Objetivos: rastreabilidade, orçamentos mais precisos com base em dados reais, e acompanhamento do progresso pelo escritório, pelas equipas e (mais tarde) pelos clientes.

Começa como web/PWA otimizada para tablets e telemóveis. Pode evoluir para apps iOS/Android e ligar-se ao site de cada empresa.

## Problema

Tempos, notas, fotografias e acontecimentos de uma obra ficam espalhados por folhas, mensagens e sistemas. É difícil saber quanto demora cada etapa, ver atrasos, comparar previsto com realizado e orçamentar com base no histórico.

## Objetivos

- Digitalizar o acompanhamento das obras.
- Registar o tempo por pessoa, equipa, etapa e elemento.
- Ligar notas e fotografias ao contexto certo.
- Trabalhar sem internet nos locais de montagem (fase de campo).
- Dar ao cliente acesso progressivo desde o orçamento (fase 2).
- Criar uma base histórica para melhorar a orçamentação.
- Preparar a integração com o site da empresa e com o software de orçamentação de caixilharia.

## Utilizadores

| Papel | O que faz |
|---|---|
| Administração | Cria projetos, acompanha obras, consulta indicadores, corrige registos, gere permissões |
| Orçamentação | Cria a oportunidade, acompanha o orçamento, converte em obra quando aprovado |
| Compras | Pedidos de materiais, fornecedores, datas, receções *(módulo próprio em fase posterior)* |
| Fabricação | Regista atividades, tempos, notas, fotografias e problemas por elemento |
| Montagem | Consulta a obra no local, lê o QR Code, regista trabalho e problemas |
| Pós-venda | Ocorrências, visitas, intervenções *(fase 2)* |
| Cliente | Vista externa simplificada *(fase 2)* |

## Modelo

Tudo pertence a uma **empresa**. **Projeto/oportunidade** existe desde o orçamento. **Obra** nasce quando o orçamento é aprovado: aí são gerados o QR Code, as etapas operacionais e os registos de execução.

```
Empresa
  ├── Pessoas, equipas, etapas configuráveis
  └── Cliente
        └── Projeto / oportunidade
              └── Obra
                    ├── Responsáveis (várias pessoas)
                    ├── Elementos (janelas, portas, vidros, estores…)
                    │     └── Atividades e tempos
                    ├── Notas
                    ├── Fotografias
                    ├── Materiais e fornecedores   (fase posterior)
                    └── Pós-venda                  (fase 2)
```

A obra tem um QR Code principal. Elementos podem ter QR secundário quando é preciso seguir uma peça em particular — no piloto começa-se só pelo QR da obra.

## Fluxo e etapas

Orçamento → Obra aprovada → Pedidos a fornecedores → Fabricação → Montagem → Pós-venda → Obra concluída.

Etapas iniciais (configuráveis em *Definições → Etapas*): Orçamentação, Medição, Projeto e especificação, Pedidos a fornecedores, Receção de materiais, Fabricação, Preparação e expedição, Montagem, Verificação final, Pós-venda (inativa até à fase 2).

## QR Code e registo de tempo

O escritório imprime o QR da obra. A equipa lê-o com o botão "Ler QR Code" da app (ou com a câmara nativa) e abre logo a página da obra; daí carrega em "Registar", escolhe etapa/atividade/elemento, inicia, termina e junta notas ou fotografias.

O tempo regista-se sempre em **quartos de hora** (hora exata de início e fim): o início arredonda para baixo e o fim para cima, a favor do funcionário, com mínimo de 15 min. Não há cronómetro a correr — mostra-se "Desde 08:00 · 2 h 15 min", que sobe de 15 em 15 min. A pessoa pode escolher a hora a que começou/terminou, ou lançar horas já feitas (até 7 dias atrás). A mesma pessoa nunca tem registos sobrepostos. Cada registo guarda obra, elemento, etapa, atividade, pessoa, equipa, início, fim, duração e notas. Nunca contas partilhadas.

## Notas e fotografias

Tipos de nota: observação geral, problema, atraso, material em falta, alteração solicitada, não conformidade, conclusão da etapa. Fotografias ligadas à obra, elemento, etapa (e, na fase 2, à ocorrência de pós-venda).

## Dispositivos

Um tablet da empresa por equipa, com login individual de cada pessoa. Android, 8–10", boa câmara, capa resistente, proteção água/pó, 4G/5G ou hotspot, bateria para um dia. O piloto pode começar com um tablet para montagem e outro para fabricação; telemóveis servem como alternativa temporária.

## Integração futura com o site

```
Portal do cliente:  app.example.com
Área interna:       app.example.com/admin
```

No site da empresa: "Acompanhar a minha obra" → login → projetos associados à conta do cliente.

## IA (fase posterior)

Comandos por texto e depois voz ("Regista 45 minutos de montagem na obra 2026-014 para o João"). A IA nunca acede diretamente à base de dados: interpreta, valida permissões, mostra a ação, pede confirmação e chama uma **ação controlada da app** (`modules/*/actions.ts`), ficando tudo no histórico com origem `ia`. Ações críticas exigem confirmação reforçada ou administração. Clientes nunca acedem a dados internos através da IA. O áudio não é guardado por defeito.

## Critério de sucesso do piloto

A equipa regista o trabalho sem atrasar a operação, e os dados são consistentes o suficiente para apoiar futuros orçamentos.
