"""Importa movies_reviews.csv e sincroniza dim_reviews com as avaliações armazenadas.

O CSV usa sk_movie_review_id,sk_movie_id,nome,nota,comentario. A nota
original está na escala 0-10 e é preservada no banco. Linhas sem nota ou
comentário são ignoradas. A chave individual permite repetir a carga sem
duplicar avaliações.

Execute após as migrations e a carga de dim_movies:

    python -m scripts.seed_reviews
    python -m scripts.seed_reviews --csv /caminho/movies_reviews.csv
"""

from __future__ import annotations

import argparse
import csv
import math
import sys
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import create_engine, delete, event, insert, select
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.engine import Connection, Engine
from sqlalchemy.engine.interfaces import DBAPIConnection
from sqlalchemy.pool import ConnectionPoolEntry

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import get_settings  # noqa: E402
from app.movies.models import DimMovie, DimReview, MovieReview  # noqa: E402
from app.movies.review_aggregates import summarize_ratings  # noqa: E402

DEFAULT_CSV = Path(__file__).resolve().parents[2] / "diamond" / "movies_reviews.csv"
CHUNK_SIZE = 5_000


def _sync_database_url() -> str:
    return get_settings().database_url.replace("+aiosqlite", "")


def _configure_sqlite_for_bulk_load(engine: Engine) -> None:
    @event.listens_for(engine, "connect")
    def _set_pragmas(
        dbapi_connection: DBAPIConnection, connection_record: ConnectionPoolEntry
    ) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()


@dataclass(frozen=True)
class ReviewInput:
    sk_movie_review_id: str
    sk_movie_id: str
    name: str
    rating: float
    text: str


def _load_reviews(csv_path: Path) -> list[ReviewInput]:
    reviews: list[ReviewInput] = []
    seen_keys: set[str] = set()
    total = 0
    with csv_path.open(encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        required_columns = {"sk_movie_review_id", "sk_movie_id", "nome", "nota", "comentario"}
        if not required_columns <= set(reader.fieldnames or []):
            raise SystemExit(
                "O CSV precisa conter sk_movie_review_id, sk_movie_id, nome, nota e comentario."
            )

        for row in reader:
            total += 1
            review_key = (row["sk_movie_review_id"] or "").strip()
            movie_key = (row["sk_movie_id"] or "").strip()
            nota = (row["nota"] or "").strip()
            review_text = (row["comentario"] or "").strip()
            if not review_key or not movie_key or not nota or not review_text:
                continue
            if review_key in seen_keys:
                raise SystemExit(f"sk_movie_review_id duplicada no CSV: {review_key}")
            seen_keys.add(review_key)
            try:
                rating = float(nota)
                if not math.isfinite(rating) or not 0 <= rating <= 10:
                    raise ValueError("nota fora da escala 0-10")
            except ValueError as error:
                raise SystemExit(f"Nota inválida para a review {review_key}: {nota!r}") from error
            reviews.append(
                ReviewInput(
                    sk_movie_review_id=review_key,
                    sk_movie_id=movie_key,
                    name=(row["nome"] or "").strip() or "Convidado",
                    rating=rating,
                    text=review_text,
                )
            )

    print(
        f"{len(reviews)}/{total} linhas com nota e comentário preenchidos "
        f"({total - len(reviews)} descartadas por dado incompleto).",
        file=sys.stderr,
    )
    return reviews


def seed(csv_path: Path) -> None:
    reviews = _load_reviews(csv_path)
    engine = create_engine(_sync_database_url())
    _configure_sqlite_for_bulk_load(engine)
    try:
        with engine.begin() as conn:
            movie_keys = set(conn.execute(select(DimMovie.sk_movie_id)).scalars())
            matched = [review for review in reviews if review.sk_movie_id in movie_keys]
            existing_keys = set(conn.execute(select(MovieReview.sk_movie_review_id)).scalars())
            new_reviews = [
                review for review in matched if review.sk_movie_review_id not in existing_keys
            ]
            records = [
                {
                    "sk_movie_review_id": review.sk_movie_review_id,
                    "sk_movie_id": review.sk_movie_id,
                    "name": review.name,
                    "rating": review.rating,
                    "text": review.text,
                }
                for review in new_reviews
            ]
            for start in range(0, len(records), CHUNK_SIZE):
                conn.execute(insert(MovieReview.__table__), records[start : start + CHUNK_SIZE])
            _refresh_review_summaries(conn)
    finally:
        engine.dispose()

    print(
        f"{len(matched)}/{len(reviews)} reviews apontam para filmes existentes; "
        f"{len(records)} inseridas e {len(matched) - len(records)} já presentes. "
        "dim_reviews sincronizada com movie_reviews.",
        file=sys.stderr,
    )


def _refresh_review_summaries(conn: Connection) -> None:
    """Sincroniza a dimensão com todas as reviews no banco, inclusive as criadas pela API."""
    ratings_by_movie: dict[str, list[float]] = defaultdict(list)
    for movie_id, rating in conn.execute(select(MovieReview.sk_movie_id, MovieReview.rating)):
        ratings_by_movie[movie_id].append(rating)

    records = []
    for movie_id, ratings in ratings_by_movie.items():
        count, average = summarize_ratings(ratings)
        records.append(
            {
                "sk_review_id": movie_id,
                "sk_movie_id": movie_id,
                "qtd_avaliacoes_usuarios": count,
                "nota_media_usuarios": average,
            }
        )

    statement = sqlite_insert(DimReview.__table__)
    statement = statement.on_conflict_do_update(
        index_elements=[DimReview.sk_movie_id],
        set_={
            "qtd_avaliacoes_usuarios": statement.excluded.qtd_avaliacoes_usuarios,
            "nota_media_usuarios": statement.excluded.nota_media_usuarios,
        },
    )
    for start in range(0, len(records), CHUNK_SIZE):
        conn.execute(statement, records[start : start + CHUNK_SIZE])

    conn.execute(
        delete(DimReview).where(~DimReview.sk_movie_id.in_(select(MovieReview.sk_movie_id)))
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV, help="caminho do CSV de reviews")
    args = parser.parse_args()
    seed(args.csv)
    return 0


if __name__ == "__main__":
    sys.exit(main())
