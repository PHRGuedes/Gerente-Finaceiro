<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

## 📌 Regras do Projeto (Memória Permanente do Agente)

### 📱 1. Diretriz Mobile-First Obrigatória (Resolução para Celular)
- **Sempre pensar e otimizar para celular:** Todas as telas, cabeçalhos, abas de navegação, formulários, modais, tabelas e cards DEVEM ser 100% responsivos e perfeitamente legíveis em smartphones (larguras de 360px a 430px).
- **Sem Quebra Deformada de Textos:** Nunca permitir que textos de botões, abas ou badges quebrem em múltiplas linhas desproporcionais (usar sempre `whitespace-nowrap`, `shrink-0` e alinhamento flex centralizado).
- **Alturas e Proporções Consistentes:** Botões e elementos irmãos na mesma barra de navegação/ações devem compartilhar a mesma altura uniforme (ex: `h-9` / 36px), mantendo proporção harmônica e sem saltos visuais.
- **Scroll Horizontal Seguro:** Menus e filtros em telas touch devem usar rolagem horizontal suave (`overflow-x-auto scrollbar-none` com `shrink-0`) para nunca vazar a largura da viewport nem criar overflow horizontal na página.
- **Interações Touch Acessíveis:** Não depender exclusivamente de `:hover` para ações críticas (ex: excluir ou editar) em dispositivos móveis.
