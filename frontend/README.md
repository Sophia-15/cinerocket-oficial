# CineRocket — Frontend

Interface web do CineRocket, um catálogo de filmes para descobrir, consultar e administrar filmes e resenhas. O frontend é uma aplicação React construída com Vite e organizada segundo a arquitetura Feature-Sliced Design (FSD), consumindo a API REST do backend (`../backend`).

## Stack

- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/)
- [TanStack Router](https://tanstack.com/router) para roteamento (rotas tipadas, params/search params, loaders)
- [TanStack Query](https://tanstack.com/query) para estado de servidor (cache, invalidação, loading/error)
- [TanStack Form](https://tanstack.com/form) para os formulários de filme e resenha
- [Zod](https://zod.dev/) para validação de dados da API e dos formulários
- [React Select](https://react-select.com/) para a ordenação do catálogo e os campos de lista (gêneros, elenco, direção...)
- [Lucide React](https://lucide.dev/) para ícones
- [Biome](https://biomejs.dev/) para lint e formatação

## Estrutura

```text
frontend/
├── src/
│   ├── main.tsx              # ponto de entrada: QueryClientProvider + RouterProvider
│   ├── styles.css            # estilos globais
│   ├── app/                  # bootstrap: query client, árvore de rotas do TanStack Router
│   ├── pages/                # páginas de rota: home, catálogo, busca, filme e not-found
│   ├── modules/               # fluxos reutilizáveis: layout, editor de filme e resenhas
│   ├── entities/movie/       # schemas Zod, client de API, queries/mutations e componentes de filme
│   └── shared/               # client HTTP centralizado, UI, utilitários e assets
├── index.html
├── package.json
└── vite.config.js
```

As dependências entre camadas seguem a direção `app → pages → modules → entities → shared`. Cada página, módulo e entidade expõe sua API pública por meio de um `index.ts` quando necessário.

## Como rodar

Precisa do backend rodando primeiro (veja `backend/README.md`: `alembic upgrade head` + `python -m scripts.seed_diamond` + `uvicorn app.main:app --reload`, disponível em `http://localhost:8000`).

```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_URL, default http://localhost:8000/api/v1
npm run dev
```

A aplicação fica disponível em `http://localhost:5173` por padrão. Para iniciar em outra porta, use as opções do Vite — mas lembre que o backend só libera CORS para as origens em `backend_cors_origins` (`http://localhost:5173` por padrão), então rodar em outra porta exige ajustar essa configuração no backend também.

## Funcionalidades

- Página inicial com filmes recentes, mais bem avaliados pela comunidade e gêneros em destaque — todos vindos da API.
- Catálogo com filtros por gênero, ano, idioma e nota dos usuários; ordenação por data de inclusão, título, ano, popularidade, nota IMDb ou nota dos usuários; e paginação no servidor.
- Busca por título ou por pessoa (diretor, roteirista, elenco).
- Visualização detalhada de um filme: sinopse, elenco, direção, roteiro, produtoras, nota e contagem de avaliações, resenhas.
- Inclusão, edição e remoção de filmes (gêneros/produtoras/direção/roteiro/elenco como campos de múltiplos valores, com autocomplete de gêneros já existentes).
- Inclusão de resenhas com nome opcional, nota de 0 a 10 e texto obrigatório — atualiza a nota média do filme imediatamente.
- Validação dos dados dos formulários com Zod (mesmas regras do backend) e feedback de erro do servidor.

## Rotas

| Rota | Descrição |
| --- | --- |
| `/` | Página inicial |
| `/catalogo` | Catálogo de filmes (`?genero=`, `?sort=`, `?page=`) |
| `/busca` | Resultados de busca (`?q=`, `?page=`) |
| `/filme/novo` | Formulário para adicionar um filme |
| `/filme/{movieId}` | Detalhes e resenhas de um filme (`movieId` é o `id_filme` da API: id do TMDB ou um UUID para filmes criados por aqui) |
| `/filme/{movieId}/editar` | Formulário para editar um filme |

Roteamento via TanStack Router: rotas, parâmetros de caminho e search params são todos tipados; navegar para um filme inexistente mostra um 404 dedicado (não cai silenciosamente na Home).

## Integração com a API

Não há mais dado local nem seed embutido — todo o catálogo vem de `GET /api/v1/movies` (e afins) no backend. `src/shared/api/http-client.ts` é o único ponto que fala HTTP; `src/entities/movie/api/movie.api.ts` chama esse client e valida toda resposta com os schemas Zod de `src/entities/movie/model/movie.schema.ts` antes de qualquer componente ver o dado. `src/entities/movie/model/movie.query.ts` expõe os hooks de query/mutation (TanStack Query) com invalidação de cache: criar/editar/remover um filme invalida a listagem; publicar uma resenha invalida o detalhe daquele filme.

## Verificação

```bash
npm run check
npm run build
```

`npm run check` executa o lint do Biome e a verificação de tipos do TypeScript. `npm run build` gera a versão de produção em `frontend/dist`.

Para formatar os arquivos:

```bash
npm run format
```

Para apenas verificar a formatação:

```bash
npm run format:check
```
