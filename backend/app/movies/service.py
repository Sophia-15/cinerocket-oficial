import uuid
from typing import Literal

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.sql.elements import ColumnElement

from app.movies.exceptions import MovieNotFoundError
from app.movies.models import (
    DimCompany,
    DimGenre,
    DimMovie,
    DimPerson,
    DimReview,
    FactMoviePerformance,
    MovieReview,
    PersonType,
)
from app.movies.review_aggregates import summarize_ratings
from app.movies.schemas import MovieCreate, MovieReviewCreate, MovieUpdate

SortBy = Literal["recent", "title", "year", "popularity", "imdb_rating", "user_rating"]

# Busca por título OU pessoa (ator/diretor/roteirista) num catálogo de ~324k
# filmes / 827k pessoas. Um `OR` com subquery correlacionada
# (`DimMovie.people.any(...)`) reavalia o join pessoa->filme uma vez POR
# FILME (~300k vezes) — 3-7s por busca. Em vez disso, resolvemos cada lado
# como uma busca independente (cada uma varre só a própria tabela) e unimos
# os ids de filme resultantes; `CROSS JOIN` fixa a ordem de join do SQLite
# (que do contrário prefere varrer a tabela-ponte inteira, maior que
# dim_people) para usar o índice em bridge_movie_person.sk_person_id.
# Resultado medido: ~5-7s -> ~0.1-0.3s para termos de busca típicos.
_SEARCH_MATCH_SQL = """
    dim_movies.sk_movie_id IN (
        SELECT sk_movie_id FROM dim_movies WHERE titulo LIKE :needle ESCAPE '\\'
        UNION
        SELECT bmp.sk_movie_id
        FROM (
            SELECT sk_person_id FROM dim_people WHERE nome_pessoa LIKE :needle ESCAPE '\\'
        ) AS matched_people
        CROSS JOIN bridge_movie_person AS bmp ON bmp.sk_person_id = matched_people.sk_person_id
    )
"""


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _split_filter_values(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


_SUMMARY_OPTIONS = (
    selectinload(DimMovie.genre_links),
    selectinload(DimMovie.performance),
    selectinload(DimMovie.reviews_summary),
)

_DETAIL_OPTIONS = (
    *_SUMMARY_OPTIONS,
    selectinload(DimMovie.company_links),
    selectinload(DimMovie.people),
    selectinload(DimMovie.reviews),
)


async def list_movies(
    db: AsyncSession,
    *,
    q: str | None = None,
    genre: str | None = None,
    year_from: int | None = None,
    year_to: int | None = None,
    min_user_rating: float | None = None,
    language: str | None = None,
    sort_by: SortBy = "recent",
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[DimMovie], int]:
    filters = []
    if q:
        needle = f"%{_escape_like(q.strip())}%"
        filters.append(text(_SEARCH_MATCH_SQL).bindparams(needle=needle))
    if genre:
        genre_values = _split_filter_values(genre)
        if genre_values:
            filters.append(DimMovie.genre_links.any(DimGenre.nome_genero.in_(genre_values)))
    if year_from is not None:
        filters.append(DimMovie.ano_lancamento >= year_from)
    if year_to is not None:
        filters.append(DimMovie.ano_lancamento <= year_to)
    if min_user_rating is not None:
        filters.append(func.coalesce(DimReview.nota_media_usuarios, 0.0) >= min_user_rating)
    if language:
        language_values = _split_filter_values(language)
        if language_values:
            filters.append(DimMovie.idioma_original.in_(language_values))

    count_stmt = select(func.count()).select_from(DimMovie)
    if min_user_rating is not None:
        count_stmt = count_stmt.outerjoin(DimReview, DimReview.sk_movie_id == DimMovie.sk_movie_id)
    if filters:
        count_stmt = count_stmt.where(*filters)
    total = (await db.execute(count_stmt)).scalar_one()

    stmt = select(DimMovie)
    if filters:
        stmt = stmt.where(*filters)
    stmt = (
        stmt.outerjoin(
            FactMoviePerformance, FactMoviePerformance.sk_movie_id == DimMovie.sk_movie_id
        )
        .outerjoin(DimReview, DimReview.sk_movie_id == DimMovie.sk_movie_id)
        .options(*_SUMMARY_OPTIONS)
        .order_by(*_sort_clause(sort_by))
        .limit(limit)
        .offset(offset)
    )
    movies = list((await db.execute(stmt)).scalars().all())
    return movies, total


def _sort_clause(sort_by: SortBy) -> tuple[ColumnElement[object], ...]:
    if sort_by == "title":
        primary = DimMovie.titulo.asc()
    elif sort_by == "year":
        primary = DimMovie.ano_lancamento.desc().nulls_last()
    elif sort_by == "popularity":
        primary = FactMoviePerformance.popularidade.desc().nulls_last()
    elif sort_by == "imdb_rating":
        primary = FactMoviePerformance.nota_imdb.desc().nulls_last()
    elif sort_by == "user_rating":
        primary = DimReview.nota_media_usuarios.desc().nulls_last()
    else:
        primary = DimMovie.data_lancamento.desc().nulls_last()
    return primary, DimMovie.sk_movie_id.asc()


async def list_genres(db: AsyncSession) -> list[str]:
    stmt = select(DimGenre.nome_genero).order_by(DimGenre.nome_genero.asc())
    return list((await db.execute(stmt)).scalars().all())


async def list_languages(db: AsyncSession) -> list[str]:
    stmt = (
        select(DimMovie.idioma_original)
        .where(DimMovie.idioma_original.is_not(None), DimMovie.idioma_original != "")
        .distinct()
        .order_by(DimMovie.idioma_original.asc())
    )
    return list((await db.execute(stmt)).scalars().all())


async def search_people(
    db: AsyncSession, tipo_pessoa: PersonType, q: str, limit: int = 10
) -> list[str]:
    needle = q.strip()
    if not needle:
        return []
    # Prefixo (não `%needle%`) para poder aproveitar o índice em nome_pessoa
    # — é o padrão esperado de um autocomplete e mantém a busca instantânea
    # mesmo sem a otimização de busca livre usada em list_movies.
    stmt = (
        select(DimPerson.nome_pessoa)
        .where(
            DimPerson.tipo_pessoa == tipo_pessoa,
            DimPerson.nome_pessoa.ilike(f"{_escape_like(needle)}%", escape="\\"),
        )
        .distinct()
        .order_by(DimPerson.nome_pessoa.asc())
        .limit(limit)
    )
    return list((await db.execute(stmt)).scalars().all())


async def search_companies(db: AsyncSession, q: str, limit: int = 10) -> list[str]:
    needle = q.strip()
    if not needle:
        return []
    stmt = (
        select(DimCompany.nome_produtora)
        .where(DimCompany.nome_produtora.ilike(f"{_escape_like(needle)}%", escape="\\"))
        .order_by(DimCompany.nome_produtora.asc())
        .limit(limit)
    )
    return list((await db.execute(stmt)).scalars().all())


async def get_movie(db: AsyncSession, id_filme: str) -> DimMovie:
    stmt = select(DimMovie).where(DimMovie.id_filme == id_filme).options(*_DETAIL_OPTIONS)
    movie = (await db.execute(stmt)).scalar_one_or_none()
    if movie is None:
        raise MovieNotFoundError(id_filme)
    return movie


async def create_movie(db: AsyncSession, data: MovieCreate) -> DimMovie:
    # Resolve todas as dimensões ligadas ANTES de construir o DimMovie: uma
    # vez que ele existe e leva pelo menos um flush (disparado pelos
    # get_or_create abaixo), reatribuir uma relação com cascade="delete-orphan"
    # ou uma coleção secondary= exige que o SQLAlchemy carregue o valor
    # primeiro — um lazy-load síncrono que estoura MissingGreenlet
    # dentro de uma AsyncSession. Montando as listas antes, a atribuição final
    # acontece só num objeto ainda transiente (nunca tocou o banco).
    genre_rows = [await _get_or_create_genre(db, name) for name in data.genres]
    company_rows = [await _get_or_create_company(db, name) for name in data.companies]
    person_rows = [
        *[await _get_or_create_person(db, name, "Diretor") for name in data.directors],
        *[await _get_or_create_person(db, name, "Roteirista") for name in data.writers],
        *[await _get_or_create_person(db, name, "Ator") for name in data.cast],
    ]

    movie = DimMovie(
        id_filme=str(uuid.uuid4()),
        titulo=data.titulo,
        ano_lancamento=data.ano_lancamento,
        sinopse=data.sinopse,
        data_lancamento=data.data_lancamento,
        duracao_minutos=data.duracao_minutos,
        idioma_original=data.idioma_original,
        status_filme=data.status_filme,
    )
    movie.genre_links = genre_rows
    movie.company_links = company_rows
    movie.people = person_rows
    movie.performance = FactMoviePerformance()
    if data.poster_url:
        movie.url_poster = str(data.poster_url)

    db.add(movie)
    await db.commit()
    id_filme = movie.id_filme
    # expire_on_commit=False (db/session.py) mantém os objetos já em memória
    # como estão após o commit — sem isso, o FactMoviePerformance() criado
    # acima ainda carregaria os valores Python "crus" passados no default
    # (int 0), não a representação Decimal(18,2) real que o SQLite guardou.
    # Precisa capturar id_filme ANTES: expirar e só depois ler um atributo
    # do próprio objeto expirado dispara um reload síncrono (MissingGreenlet).
    db.expire_all()
    return await get_movie(db, id_filme)


async def update_movie(db: AsyncSession, id_filme: str, data: MovieUpdate) -> DimMovie:
    movie = await get_movie(db, id_filme)
    movie.titulo = data.titulo
    movie.ano_lancamento = data.ano_lancamento
    movie.sinopse = data.sinopse
    movie.data_lancamento = data.data_lancamento
    movie.duracao_minutos = data.duracao_minutos
    movie.idioma_original = data.idioma_original
    movie.status_filme = data.status_filme
    await _apply_update_relations(db, movie, data)
    await db.commit()
    db.expire_all()
    return await get_movie(db, id_filme)


async def delete_movie(db: AsyncSession, id_filme: str) -> None:
    movie = await get_movie(db, id_filme)
    await db.delete(movie)
    await db.commit()


async def _apply_update_relations(db: AsyncSession, movie: DimMovie, data: MovieUpdate) -> None:
    # Ao contrário de create_movie, aqui `movie` já vem de get_movie() com
    # genre_links/company_links/people carregados via selectinload,
    # então reatribuir essas relações não dispara lazy-load.
    movie.genre_links = [await _get_or_create_genre(db, name) for name in data.genres]
    movie.company_links = [await _get_or_create_company(db, name) for name in data.companies]
    movie.people = [
        *[await _get_or_create_person(db, name, "Diretor") for name in data.directors],
        *[await _get_or_create_person(db, name, "Roteirista") for name in data.writers],
        *[await _get_or_create_person(db, name, "Ator") for name in data.cast],
    ]
    movie.url_poster = str(data.poster_url) if data.poster_url else None


async def _get_or_create_genre(db: AsyncSession, nome_genero: str) -> DimGenre:
    genre = (
        await db.execute(select(DimGenre).where(DimGenre.nome_genero == nome_genero))
    ).scalar_one_or_none()
    if genre is None:
        genre = DimGenre(nome_genero=nome_genero)
        db.add(genre)
        await db.flush()
    return genre


async def _get_or_create_company(db: AsyncSession, nome_produtora: str) -> DimCompany:
    company = (
        await db.execute(select(DimCompany).where(DimCompany.nome_produtora == nome_produtora))
    ).scalar_one_or_none()
    if company is None:
        company = DimCompany(nome_produtora=nome_produtora)
        db.add(company)
        await db.flush()
    return company


async def _get_or_create_person(db: AsyncSession, nome_pessoa: str, tipo_pessoa: str) -> DimPerson:
    person = (
        await db.execute(
            select(DimPerson).where(
                DimPerson.nome_pessoa == nome_pessoa, DimPerson.tipo_pessoa == tipo_pessoa
            )
        )
    ).scalar_one_or_none()
    if person is None:
        person = DimPerson(nome_pessoa=nome_pessoa, tipo_pessoa=tipo_pessoa)
        db.add(person)
        await db.flush()
    return person


async def add_review(db: AsyncSession, id_filme: str, data: MovieReviewCreate) -> MovieReview:
    sk_movie_id = await db.scalar(select(DimMovie.sk_movie_id).where(DimMovie.id_filme == id_filme))
    if sk_movie_id is None:
        raise MovieNotFoundError(id_filme)

    review = MovieReview(sk_movie_id=sk_movie_id, **data.model_dump())
    db.add(review)
    await db.flush()
    await _refresh_review_aggregate(db, sk_movie_id)
    await db.commit()
    await db.refresh(review)
    return review


async def _refresh_review_aggregate(db: AsyncSession, sk_movie_id: str) -> None:
    ratings = (
        (await db.execute(select(MovieReview.rating).where(MovieReview.sk_movie_id == sk_movie_id)))
        .scalars()
        .all()
    )
    count, rounded_avg = summarize_ratings(ratings)

    aggregate = (
        await db.execute(select(DimReview).where(DimReview.sk_movie_id == sk_movie_id))
    ).scalar_one_or_none()
    if aggregate is None:
        db.add(
            DimReview(
                sk_review_id=sk_movie_id,
                sk_movie_id=sk_movie_id,
                qtd_avaliacoes_usuarios=count,
                nota_media_usuarios=rounded_avg,
            )
        )
    else:
        aggregate.qtd_avaliacoes_usuarios = count
        aggregate.nota_media_usuarios = rounded_avg
