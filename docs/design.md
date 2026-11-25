# Design

Tokens em `src/app/globals.css`. Não inventar cores novas: usar os tokens.

## Cores (tokens)

| Token | Escuro (padrão) | Claro | Uso |
|---|---|---|---|
| `accent` | #3CC2B0 | #12806F | ação principal, sobretítulos, destaques |
| `accent-dk` | #2A9A8B | #0E6A5C | hover |
| `dark` | #1C1C1E | #DEDEDE | fundo |
| `dark2` | #252527 | #D2D2D2 | cartões |
| `dark3` | #2C2C2E | #C6C6C6 | campos, linhas ativas |
| `white` | #FFFFFF | #111111 | texto |
| `text-mid` / `text-dim` | branco 65% / 40% | preto 62% / 38% | texto secundário |
| `cream` | #F5F0E3 | = | segunda série dos gráficos (escuro) |
| `ok` / `danger` | estados | | concluído · atraso/erro (usar pouco) |

O destaque é mais escuro no tema claro para manter o contraste do texto. Classes Tailwind: `bg-dark2`, `text-accent`, `text-text-mid`, `border-line`… Em botões com fundo `accent` usar `text-[#fff]` (o token `white` inverte no modo claro).

## Tipografia

Poppins local (`src/app/fonts.ts`, licença OFL). Títulos: maiúsculas, bold, `tracking-[-1.5px]`, `leading-[0.95]`. Sobretítulos/rótulos: 11–12px, semibold, maiúsculas, `tracking-[1.5px]`. Corpo: peso 200–300.

## Componentes (`src/components/ui`)

`Button`/`buttonClass` (retangular, maiúsculas; tamanho `lg` para o modo tablet), `Card` (`.card-premium`: contorno interno 8% + brilho de destaque), `Badge` (tons `neutro | destaque | ok | perigo | apagado`), `Field`/`Input`/`Select`/`Textarea`, `ProgressBar`, `PageHeader`, `Tabs`, `EmptyState` (logótipo em marca de água), `Logo` (caixilho com "FL"; troca de cor com o tema), `ThemeSwitch`.

O logótipo é feito só de retângulos numa grelha 100×100. `scripts/gerar-icone.py` gera `src/app/icon.svg` e `src/app/apple-icon.png` a partir das mesmas formas.

## Gráficos (`src/components/graficos/Graficos.tsx`)

shadcn/ui chart (Recharts) em `src/components/ui/shadcn/chart.tsx` — instalado com `components.json` (alias `ui` → `@/components/ui/shadcn`, para não colidir com os nossos `Card`/`Button`). **Não correr `shadcn init`** (reescreve o `globals.css`); para outro componente, `npx shadcn@latest add <nome>` e adaptar ao estilo (cantos retos).
- Usar os wrappers `GraficoArea`, `GraficoBarras` (agrupado, empilhado, horizontal, `sinal` = negativos a vermelho) e `GraficoDonut`, com `formato` `euro | horas | pct | numero`.
- Cores das séries (`CORES`): `accent`, `--serie-2` (creme no escuro, quase preto no claro), `text-mid`, `accent-dk`, `ok`; `danger` só para negativos/limites. As variáveis shadcn (`--color-border`, `--color-muted-foreground`…) estão mapeadas para os tokens em `@theme`.
- Cartões: `CartaoGrafico` e `Kpi` em `src/components/financeiro/Kpi.tsx`.

## Outros

- Grão de fundo animado (opacidade 0.032).
- Escuro por defeito; escolha guardada em `localStorage['fl-theme']`.
- Mobile-first: barra inferior em telemóvel/tablet vertical, lateral a partir de `lg`. Alvos de toque grandes no modo registo (luvas).
- Etiquetas QR sempre preto sobre branco para impressão.
