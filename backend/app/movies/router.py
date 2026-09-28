from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.movies import service
from app.movies.models import PersonType
from app.movies.schemas import (
    CompanyList,
    GenreList,
    LanguageList,
    MovieCreate,
    MovieList,
    MovieRead,
    MovieReviewCreate,
    MovieReviewRead,
    MovieUpdate,
    PersonList,
)
from app.movies.service import SortBy

router = APIRouter(prefix="/movies", tags=["movies"])


@router.get("", response_model=MovieList)
async def list_movies(
    q: str | None = Query(
        default=None, description="Busca por título ou pessoa (ator/diretor/roteirista)"
    ),
    genre: str | None = Query(default=None, description="Filtra por gênero exato"),
    year_from: int | None = Query(default=None, ge=1888, le=2100),
    year_to: int | None = Query(default=None, ge=1888, le=2100),
    min_user_rating: float | None = Query(default=None, ge=0, le=10),
    language: str | None = Query(default=None, description="Filtra por idioma original"),
    sort_by: SortBy = Query(default="recent"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> MovieList:
    if year_from is not None and year_to is not None and year_from > year_to:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="year_from deve ser menor ou igual a year_to",
        )

    movies, total = await service.list_movies(
        db,
        q=q,
        genre=genre,
        year_from=year_from,
        year_to=year_to,
        min_user_rating=min_user_rating,
        language=language,
        sort_by=sort_by,
        limit=limit,
        offset=offset,
    )
    return MovieList(items=movies, total=total, limit=limit, offset=offset)


@router.get("/genres", response_model=GenreList)
async def list_genres(db: AsyncSession = Depends(get_db)) -> GenreList:
    return GenreList(genres=await service.list_genres(db))


@router.get("/languages", response_model=LanguageList)
async def list_languages(db: AsyncSession = Depends(get_db)) -> LanguageList:
    return LanguageList(languages=await service.list_languages(db))


@router.get("/people", response_model=PersonList)
async def search_people(
    tipo_pessoa: PersonType = Query(description="Papel da pessoa no filme"),
    q: str = Query(default="", description="Prefixo do nome buscado"),
    limit: int = Query(default=10, ge=1, le=25),
    db: AsyncSession = Depends(get_db),
) -> PersonList:
    return PersonList(people=await service.search_people(db, tipo_pessoa, q, limit))


@router.get("/companies", response_model=CompanyList)
async def search_companies(
    q: str = Query(default="", description="Prefixo do nome buscado"),
    limit: int = Query(default=10, ge=1, le=25),
    db: AsyncSession = Depends(get_db),
) -> CompanyList:
    return CompanyList(companies=await service.search_companies(db, q, limit))


@router.get("/{id_filme}", response_model=MovieRead)
async def get_movie(id_filme: str, db: AsyncSession = Depends(get_db)) -> MovieRead:
    return MovieRead.model_validate(await service.get_movie(db, id_filme))


@router.post("", response_model=MovieRead, status_code=status.HTTP_201_CREATED)
async def create_movie(payload: MovieCreate, db: AsyncSession = Depends(get_db)) -> MovieRead:
    return MovieRead.model_validate(await service.create_movie(db, payload))


@router.put("/{id_filme}", response_model=MovieRead)
async def update_movie(
    id_filme: str, payload: MovieUpdate, db: AsyncSession = Depends(get_db)
) -> MovieRead:
    return MovieRead.model_validate(await service.update_movie(db, id_filme, payload))


@router.delete("/{id_filme}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_movie(id_filme: str, db: AsyncSession = Depends(get_db)) -> None:
    await service.delete_movie(db, id_filme)


@router.post(
    "/{id_filme}/reviews",
    response_model=MovieReviewRead,
    status_code=status.HTTP_201_CREATED,
)
async def add_review(
    id_filme: str, payload: MovieReviewCreate, db: AsyncSession = Depends(get_db)
) -> MovieReviewRead:
    return MovieReviewRead.model_validate(await service.add_review(db, id_filme, payload))
