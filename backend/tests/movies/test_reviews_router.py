from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.movies.models import DimMovie, DimReview


async def test_post_review_updates_materialized_summary(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    movie = DimMovie(sk_movie_id="movie-1", id_filme="101", titulo="Filme de teste")
    db_session.add(movie)
    await db_session.commit()

    endpoint = "/api/v1/movies/101/reviews"
    for rating in (6.1, 6.1, 6.1, 6.2):
        response = await client.post(
            endpoint, json={"name": "Ana", "rating": rating, "text": "Review de teste"}
        )
        assert response.status_code == 201

    summary = (
        await db_session.execute(select(DimReview).where(DimReview.sk_movie_id == "movie-1"))
    ).scalar_one()
    assert summary.qtd_avaliacoes_usuarios == 4
    assert summary.nota_media_usuarios == 6.13

    detail = await client.get("/api/v1/movies/101")
    assert detail.status_code == 200
    assert detail.json()["reviews_count"] == 4
    assert detail.json()["average_rating"] == 6.13
