# CineRocket API

API REST para o catálogo de filmes do CineRocket (o frontend em `../frontend`), construída com FastAPI seguindo boas práticas de mercado: arquitetura por domínio, SQLAlchemy 2.0 assíncrono, Pydantic v2 separado dos modelos de banco, injeção de dependências e tratamento de erros centralizado.

## Stack

- [FastAPI](https://fastapi.tiangolo.com/) + Uvicorn
- SQLAlchemy 2.0 (async) + SQLite via `aiosqlite`
- Alembic para migrações versionadas do schema
- Pydantic v2 / `pydantic-settings`
- `ruff` para lint e formatação

## Estrutura

```text
backend/
├── app/
│   ├── main.py            # application factory, CORS, lifespan, exception handlers
│   ├── core/               # settings, logging, exception -> HTTP wiring (agnóstico de domínio)
│   ├── db/                 # engine, sessão async, Base declarativa (agnóstico de domínio)
│   ├── api/v1/              # agrega os routers de cada domínio sob /api/v1
└── movies/                  # domínio "filmes": models, schemas, service, router, exceptions
```

Cada novo domínio pode seguir o mesmo padrão do pacote `movies/`.

## Modelagem de dados

O catálogo segue um esquema estrela compatível com os CSVs em `../diamond/`:

- `dim_movies`, `dim_genres`, `dim_people` (ator/diretor/roteirista, uma linha
  por pessoa+papel) e `dim_companies` — dimensões. As URLs de pôster e backdrop
  pertencem a `dim_movies`, como nos CSVs.
- `fact_movies_performance` — métricas financeiras (USD/BRL) e de engajamento
  (TMDB/IMDB), uma linha por filme.
- `bridge_movie_genre`, `bridge_movie_company`, `bridge_movie_person` —
  tabelas-ponte N:N entre `dim_movies` e as dimensões periféricas.
- `movie_reviews` (avaliações individuais com `sk_movie_review_id` único, em escala 0–10)
  e `dim_reviews` (resumo de contagem e nota média por filme).

Os CSVs incluem os valores financeiros em USD e BRL diretamente.

## Como rodar

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # No Windows PowerShell, use .venv\Scripts\Activate.ps1
pip install -e ".[dev]"
cp .env.example .env
```

As tabelas não são criadas automaticamente pela aplicação — isso é trabalho
do Alembic, não de `Base.metadata.create_all` (a app só faz `yield` no
lifespan e assume que o schema já existe). Antes de subir a API pela
primeira vez:

```bash
alembic upgrade head
```

Com o banco vazio, carregue os CSVs fornecidos no repositório:

```bash
python -m scripts.seed_diamond
```

O comando lê `../diamond/`, preserva os hashes das chaves substitutas e só
aceita um banco sem dados nas tabelas de carga. A importação inteira roda em
uma transação: se ocorrer algum erro, nenhuma linha do Diamond é mantida e a
execução pode ser repetida. Use `--directory` para informar outra pasta de
CSVs compatíveis. A carga não exige dependências adicionais nem acesso à rede.

Depois da carga Diamond, importe as avaliações individuais do CSV
`../diamond/movies_reviews.csv` (`sk_movie_review_id,sk_movie_id,nome,nota,comentario`):

```bash
python -m scripts.seed_reviews
python -m scripts.seed_reviews --csv caminho/outro.csv
```

A nota é mantida na escala 0–10. A carga usa as chaves substitutas do CSV,
ignora linhas sem nota ou comentário e filmes ausentes no banco, e pode ser
repetida sem duplicar avaliações. Ao final, a carga recalcula `dim_reviews`
a partir de todas as avaliações armazenadas no banco, inclusive as criadas
pela API. Assim, repetir o comando
corrige resumos antigos sem duplicar reviews. Filmes sem avaliações não têm
linha em `dim_reviews`. Novas avaliações enviadas pela API atualizam o resumo
do filme na mesma transação. Os CSVs Diamond são dados de carga inicial e não
são regravados pela API.

```bash
uvicorn app.main:app --reload
```

A API sobe em `http://localhost:8000`. Documentação interativa em `/docs` (Swagger) e `/redoc`.

Ao mudar `app/movies/models.py`, gere uma nova revisão em vez de editar o
schema manualmente:

```bash
alembic revision --autogenerate -m "descrição da mudança"
alembic upgrade head
```

O CORS já libera `http://localhost:5173` (porta padrão do Vite usado pelo `frontend`).

## Testes

Com as dependências de desenvolvimento instaladas (`pip install -e ".[dev]"`):

```bash
pytest
```

## Lint e formatação

```bash
ruff check .
ruff format .
```

## Endpoints

| Método | Rota                                | Descrição                                                          |
| ------ | ------------------------------------ | -------------------------------------------------------------------- |
| GET    | `/health`                            | Healthcheck                                                          |
| GET    | `/api/v1/movies`                     | Lista filmes com busca, filtros, ordenação e paginação                |
| GET    | `/api/v1/movies/genres`              | Lista os nomes de gênero existentes, ordenados (para filtros)         |
| GET    | `/api/v1/movies/languages`           | Lista os idiomas presentes no catálogo                                |
| GET    | `/api/v1/movies/people`              | Busca pessoas por nome e papel para autocomplete                      |
| GET    | `/api/v1/movies/companies`           | Busca produtoras pelo nome para autocomplete                          |
| GET    | `/api/v1/movies/{id_filme}`          | Detalhe do filme (elenco, direção, roteiro, produtoras, métricas TMDB/IMDB, financeiro, reviews) |
| POST   | `/api/v1/movies`                     | Cria um filme                                                        |
| PUT    | `/api/v1/movies/{id_filme}`          | Atualiza um filme (substituição completa)                            |
| DELETE | `/api/v1/movies/{id_filme}`          | Remove um filme                                                      |
| POST   | `/api/v1/movies/{id_filme}/reviews`  | Adiciona uma avaliação de usuário ao filme                            |

`id_filme` é string: nos CSVs de diamond ele preserva o identificador de
origem; para filmes criados via `POST /movies`, um UUID é gerado no momento da
criação. `POST`/`PUT` aceitam `genres`,
`companies`, `directors`, `writers` e `cast` como listas de nomes — cada nome
novo cria a linha de dimensão correspondente (`dim_genres`/`dim_companies`/
`dim_people`), nomes já existentes são reaproveitados (get-or-create por
nome, ou por nome+papel no caso de `dim_people`) para não duplicar o
catálogo. Um filme criado manualmente ganha uma `fact_movies_performance`
zerada (sem dado de desempenho para preencher); métricas financeiras e de
engajamento não são editáveis por essa API.

`sort_by` aceita `recent` (padrão, por `data_lancamento`), `title`, `year`,
`popularity`, `imdb_rating` ou `user_rating` — as notas IMDB e a média das
reviews enviadas no app têm opções distintas.
