from pathlib import Path

import pytest
from sqlalchemy import create_engine, func, insert, select

from app.db.base import Base
from app.movies.models import DimMovie, DimReview, MovieReview
from app.movies.review_aggregates import summarize_ratings
from scripts import seed_reviews


def test_load_reviews_preserves_zero_to_ten_ratings(tmp_path: Path) -> None:
    csv_path = tmp_path / "reviews.csv"
    csv_path.write_text(
        "sk_movie_review_id,sk_movie_id,nome,nota,comentario\n"
        "review-1,movie-1,Ana,9.1,Ótimo filme\n"
        'review-2,movie-2,,0,"  Não gostei  "\n'
        "review-3,movie-3,Caio,,Sem nota\n"
        "review-4,movie-4,Dani,8.0,\n",
        encoding="utf-8",
    )

    reviews = seed_reviews._load_reviews(csv_path)

    assert [
        (review.sk_movie_review_id, review.sk_movie_id, review.name, review.rating, review.text)
        for review in reviews
    ] == [
        ("review-1", "movie-1", "Ana", 9.1, "Ótimo filme"),
        ("review-2", "movie-2", "Convidado", 0.0, "Não gostei"),
    ]


def test_rating_summary_uses_two_decimal_half_up_rounding() -> None:
    assert summarize_ratings([6.1, 6.1, 6.1, 6.2]) == (4, 6.13)
    assert summarize_ratings([]) == (0, None)


def test_seed_reconciles_summaries_and_preserves_api_reviews(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    database_url = f"sqlite:///{tmp_path / 'reviews.db'}"
    engine = create_engine(database_url)
    Base.metadata.create_all(engine)
    with engine.begin() as connection:
        connection.execute(
            insert(DimMovie),
            [
                {"sk_movie_id": key, "id_filme": str(index), "titulo": f"Filme {index}"}
                for index, key in enumerate(("movie-1", "movie-2", "movie-3"), start=1)
            ],
        )
        connection.execute(
            insert(DimReview),
            [
                {
                    "sk_review_id": "summary-1",
                    "sk_movie_id": "movie-1",
                    "qtd_avaliacoes_usuarios": 3,
                    "nota_media_usuarios": 7.25,
                },
                {
                    "sk_review_id": "summary-3",
                    "sk_movie_id": "movie-3",
                    "qtd_avaliacoes_usuarios": 0,
                    "nota_media_usuarios": None,
                },
            ],
        )
        connection.execute(
            insert(MovieReview),
            {
                "sk_movie_review_id": "api-review",
                "sk_movie_id": "movie-2",
                "name": "Bia",
                "rating": 6.0,
                "text": "Review criada pela API",
            },
        )
    engine.dispose()
    monkeypatch.setattr(seed_reviews, "_sync_database_url", lambda: database_url)

    csv_path = tmp_path / "reviews.csv"
    csv_path.write_text(
        "sk_movie_review_id,sk_movie_id,nome,nota,comentario\n"
        "review-1,movie-1,Ana,9.5,Ótimo filme\n"
        "review-2,missing,Caio,4.0,Filme razoável\n",
        encoding="utf-8",
    )
    seed_reviews.seed(csv_path)
    seed_reviews.seed(csv_path)

    check_engine = create_engine(database_url)
    with check_engine.connect() as connection:
        assert connection.scalar(select(func.count()).select_from(MovieReview)) == 2
        reviews = dict(
            connection.execute(select(MovieReview.sk_movie_review_id, MovieReview.rating)).all()
        )
        assert reviews == {"api-review": 6.0, "review-1": 9.5}
        summaries = {
            movie_id: (summary_id, count, average)
            for summary_id, movie_id, count, average in connection.execute(
                select(
                    DimReview.sk_review_id,
                    DimReview.sk_movie_id,
                    DimReview.qtd_avaliacoes_usuarios,
                    DimReview.nota_media_usuarios,
                )
            )
        }
        assert summaries == {
            "movie-1": ("summary-1", 1, 9.5),
            "movie-2": ("movie-2", 1, 6.0),
        }
    check_engine.dispose()
