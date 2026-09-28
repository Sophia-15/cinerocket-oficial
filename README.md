# RocketLab — Repositório-base

Este repositório serve como guia e base de implementação para as atividades seguintes do processo seletivo RocketLab.

Ele reúne uma aplicação de catálogo de filmes com frontend e backend separados, além das referências de arquitetura e das decisões técnicas que devem orientar a evolução do projeto nas próximas etapas.

## Estrutura

```text
.
├── backend/    # API REST em FastAPI
├── frontend/   # Aplicação web em React, TypeScript e Vite
├── diamond/    # CSVs para a carga inicial do catálogo
├── run.sh      # inicia no Linux e no Git Bash (Windows)
├── run.cmd     # inicia no PowerShell e no Prompt (Windows)
├── run.py      # inicialização compartilhada entre os sistemas
└── README.md   # visão geral e instruções de navegação
```

## Setup local

Para preparar a máquina e executar o projeto localmente, consulte os READMEs específicos de cada parte:

- [Backend — FastAPI](backend/README.md): ambiente virtual Python, instalação das dependências, execução da API e endpoints.
- [Frontend — React](frontend/README.md): instalação das dependências Node, execução do Vite, rotas, funcionalidades e validação do build.

Em geral, é necessário ter Python 3.11 ou superior, Node.js e npm instalados.

### Primeira execução

No Linux, execute na raiz do projeto:

```bash
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -e "./backend[dev]"
cd backend
.venv/bin/python -m alembic upgrade head
.venv/bin/python -m scripts.seed_diamond
.venv/bin/python -m scripts.seed_reviews
cd ..
./run.sh
```

No Windows, execute no PowerShell, também a partir da raiz:

```powershell
py -3 -m venv backend\.venv
.\backend\.venv\Scripts\python.exe -m pip install -e ".\backend[dev]"
cd backend
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m scripts.seed_diamond
.\.venv\Scripts\python.exe -m scripts.seed_reviews
cd ..
.\run.cmd
```

No Git Bash do Windows, também é possível iniciar com `./run.sh` depois de preparar o ambiente virtual do Windows. O Windows não executa arquivos `.sh` diretamente no PowerShell ou no Prompt; nesses terminais, use `run.cmd`.

Os lançadores criam os arquivos `.env` ausentes, instalam as dependências do frontend quando necessário e aplicam a migração inicial. A carga Diamond é separada e deve ser feita uma vez, em um banco novo.

Para execução ou validação individual, consulte os READMEs de [backend](backend/README.md)
e [frontend](frontend/README.md).

O frontend consome a API REST do backend (TanStack Query/Router/Form) — o catálogo, a busca, o CRUD de filme e as avaliações são todos dados reais, sem `localStorage` nem seed local. Suba o backend antes do frontend.
