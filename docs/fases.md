# Fases

## Fase 1 — Piloto (este repositório, agora)

| Funcionalidade | Estado |
|---|---|
| Login individual, utilizadores, equipas, papéis | UI + regras prontas; auth real ao ligar Supabase |
| Projetos em orçamento, estados, conversão em obra | ✅ |
| Obra completa: etapas, progresso, atrasos | ✅ |
| Elementos (com QR secundário opcional) | ✅ |
| QR Code da obra (impressão) e leitura no leitor da app ou na câmara nativa → página da obra | ✅ |
| Registo em quartos de hora (início ↓, fim ↑), horas à mão até 7 dias, sem sobreposições | ✅ |
| Registo individual de tempo (iniciar/terminar, um de cada vez) | ✅ |
| Notas classificadas e fotografias (comprimidas no dispositivo) | ✅ (fotos em memória até haver Storage) |
| Histórico de alterações; correção dos próprios registos durante 24 h (depois, só a administração) | ✅ |
| Etapas e atividades configuráveis | ✅ |
| Painel básico (equipas de campo) | ✅ |
| **Dashboard de gestão** (só administração): valor, custos, margem real e projetada, horas por semana/etapa/pessoa, obras em risco | ✅ — gráficos shadcn/Recharts |
| Resumo financeiro da obra: previsto vs. real por etapa, custo acumulado vs. valor contratado, custos diretos, custo por pessoa | ✅ |
| Análise: comparar obras (incl. por elemento) e funcionários (custo/hora, horas, custo gerado) | ✅ |
| Custo/hora com histórico e custos diretos simples por obra | ✅ (não é o módulo de compras) |
| PWA instalável (manifest) | ✅ — sem service worker |

## Fase 2 — Preparado, não exposto

| Funcionalidade | O que já existe |
|---|---|
| **Portal do cliente** (app.example.com) | papel `cliente`, `clientes.perfil_id`, flags `visivel_cliente` / `aprovada_cliente` / `interna`, função `vistaCliente()` testada; `/` passa a ser o portal |
| **Pós-venda** | papel `pos_venda`, etapa "Pós-venda" inativa no modelo |
| **Operação de campo offline** | `client_id` e `estado_sync` em tempos/notas/fotos, ações idempotentes, compressão de imagem no dispositivo; falta service worker + IndexedDB (Dexie) + fila de sincronização |
| **Assistente de IA** | escrita só por ações controladas; `origem` no histórico (`ia`) |
| **Software de orçamentação** | `ids_externos`, `sincronizacoes`, origem `importacao`; primeira integração no sentido software → app |

## Fases seguintes

Compras e materiais (substitui os custos diretos manuais), relatórios PDF e exportação mensal para a contabilidade (o CSV de obras, pessoas e registos já existe na Fase 1), produtividade por equipa e retrabalho, benchmarks de horas por tipo de elemento para orçamentar, alertas de atraso, notificações ao cliente, aprovação digital de alterações, relatório final automático, apps nativas (Expo).
