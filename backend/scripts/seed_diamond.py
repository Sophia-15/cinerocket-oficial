"""Carrega os CSVs de diamond no schema inicial do CineRocket.

Uso, a partir de backend/ após `alembic upgrade head`:

    python -m scripts.seed_diamond
    python -m scripts.seed_diamond --directory ../outros-csvs

O destino deve estar vazio. O script preserva as chaves SHA-256 presentes
nos arquivos e não depende de bibliotecas adicionais nem de acesso à rede.
"""

from __future__ import annotations

import argparse
import csv
import sys
from collections.abc import Iterator
from datetime import date
from decimal import Decimal
from pathlib import Path

from sqlalchemy import Connection, Table, create_engine, event, func, insert, select
from sqlalchemy.engine import Engine

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import get_settings  # noqa: E402
from app.movies.models import (  # noqa: E402
    DimCompany,
    DimGenre,
    DimMovie,
    DimPerson,
    DimReview,
    FactMoviePerformance,
    bridge_movie_company,
    bridge_movie_genre,
    bridge_movie_person,
)

DEFAULT_DIAMOND_DIRECTORY = Path(__file__).resolve().parents[2] / "diamond"
CHUNK_SIZE = 5_000

Scalar = str | int | float | Decimal | date | None
Record = dict[str, Scalar]

TABLES: tuple[tuple[str, Table], ...] = (
    ("dim_companies.csv", DimCompany.__table__),
    ("dim_genres.csv", DimGenre.__table__),
    ("dim_movies.csv", DimMovie.__table__),
    ("dim_people.csv", DimPerson.__table__),
    ("bridge_movie_company.csv", bridge_movie_company),
    ("bridge_movie_genre.csv", bridge_movie_genre),
    ("bridge_movie_person.csv", bridge_movie_person),
    ("dim_reviews.csv", DimReview.__table__),
    ("fact_movies_performance.csv", FactMoviePerformance.__table__),
)

INTEGER_COLUMNS = {
    "ano_lancamento",
    "duracao_minutos",
    "qtd_avaliacoes_usuarios",
    "qtd_tmdb",
    "qtd_imdb",
}
DECIMAL_COLUMNS = {
    "orcamento_usd",
    "receita_usd",
    "lucro_usd",
    "orcamento_brl",
    "receita_brl",
    "lucro_brl",
}
FLOAT_COLUMNS = {"popularidade", "nota_tmdb", "nota_imdb", "nota_media_usuarios"}


def _sync_database_url() -> str:
    return get_settings().database_url.replace("+aiosqlite", "")


def _configure_sqlite_for_bulk_load(engine: Engine) -> None:
    @event.listens_for(engine, "connect")
    def _set_pragmas(dbapi_connection, connection_record) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()


def _parse_value(column: str, value: str) -> Scalar:
    if value == "":
        return None
    if column == "data_lancamento":
        return date.fromisoformat(value)
    if column in INTEGER_COLUMNS:
        parsed = Decimal(value)
        if parsed % 1:
            raise ValueError(f"{column} deve ser inteiro, recebido {value!r}")
        return int(parsed)
    if column in DECIMAL_COLUMNS:
        return Decimal(value)
    if column in FLOAT_COLUMNS:
        return float(value)
    return value


def _records(path: Path) -> Iterator[Record]:
    with path.open(encoding="utf-8-sig", newline="") as file:
        for row in csv.DictReader(file):
            yield {column: _parse_value(column, value) for column, value in row.items()}


def _insert_csv(
    connection: Connection, csv_path: Path, table: Table, chunk_size: int
) -> tuple[str, int]:
    inserted = 0
    chunk: list[Record] = []
    for record in _records(csv_path):
        chunk.append(record)
        if len(chunk) == chunk_size:
            connection.execute(insert(table), chunk)
            inserted += len(chunk)
            chunk.clear()
    if chunk:
        connection.execute(insert(table), chunk)
        inserted += len(chunk)
    return table.name, inserted


def _populated_tables(connection: Connection) -> list[str]:
    return [
        table.name
        for _, table in TABLES
        if connection.execute(select(func.count()).select_from(table)).scalar_one()
    ]


def seed(directory: Path, chunk_size: int) -> None:
    csv_paths = [(directory / filename, table) for filename, table in TABLES]
    missing = [str(path) for path, _ in csv_paths if not path.is_file()]
    if missing:
        raise SystemExit("CSV ausente:\n" + "\n".join(missing))

    engine = create_engine(_sync_database_url())
    _configure_sqlite_for_bulk_load(engine)
    try:
        with engine.begin() as connection:
            populated_tables = _populated_tables(connection)
            if populated_tables:
                tables = ", ".join(populated_tables)
                raise SystemExit(
                    "A carga diamond requer um banco vazio; há dados em: "
                    f"{tables}. Crie ou informe um banco SQLite novo."
                )

            inserted_tables = [
                _insert_csv(connection, csv_path, table, chunk_size)
                for csv_path, table in csv_paths
            ]

        for table_name, inserted in inserted_tables:
            print(f"  {table_name}: {inserted} linhas", file=sys.stderr)
    finally:
        engine.dispose()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directory", type=Path, default=DEFAULT_DIAMOND_DIRECTORY)
    parser.add_argument("--chunk-size", type=int, default=CHUNK_SIZE)
    args = parser.parse_args()
    if args.chunk_size < 1:
        parser.error("--chunk-size deve ser maior que zero")

    seed(args.directory.resolve(), args.chunk_size)
    return 0


if __name__ == "__main__":
    sys.exit(main())
