from datetime import date, datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator

GenreName = Annotated[str, Field(min_length=1, max_length=50)]
CompanyName = Annotated[str, Field(min_length=1, max_length=255)]
PersonName = Annotated[str, Field(min_length=1, max_length=255)]


class MovieReviewCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(default="Convidado", max_length=120)
    rating: float = Field(ge=0, le=10)
    text: str = Field(min_length=1, max_length=4000)

    @field_validator("name")
    @classmethod
    def default_blank_name(cls, value: str) -> str:
        return value.strip() or "Convidado"


class MovieReviewRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    rating: float
    text: str
    created_at: datetime


class MoviePerformanceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    orcamento_usd: Decimal | None
    receita_usd: Decimal | None
    lucro_usd: Decimal
    orcamento_brl: Decimal | None
    receita_brl: Decimal | None
    lucro_brl: Decimal
    popularidade: float | None
    nota_tmdb: float | None
    qtd_tmdb: int | None
    nota_imdb: float | None
    qtd_imdb: int | None


class MovieBase(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    titulo: str = Field(min_length=1, max_length=500)
    ano_lancamento: int = Field(ge=1888, le=2100)
    sinopse: str = Field(min_length=1, max_length=4000)
    data_lancamento: date | None = None
    duracao_minutos: int | None = Field(default=None, ge=1)
    idioma_original: str | None = Field(default=None, max_length=10)
    status_filme: str = Field(default="Released", min_length=1, max_length=50)
    genres: list[GenreName] = Field(default_factory=list)
    companies: list[CompanyName] = Field(default_factory=list)
    directors: list[PersonName] = Field(default_factory=list)
    writers: list[PersonName] = Field(default_factory=list)
    cast: list[PersonName] = Field(default_factory=list)
    poster_url: HttpUrl | None = Field(default=None, max_length=2048)

    @field_validator("genres", "companies", "directors", "writers", "cast")
    @classmethod
    def _normalize_unique_values(cls, value: list[str]) -> list[str]:
        return list(dict.fromkeys(value))


class MovieCreate(MovieBase):
    pass


class MovieUpdate(MovieBase):
    pass


class MovieSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_filme: str
    titulo: str
    ano_lancamento: int | None
    genres: list[str]
    poster_url: str | None
    average_rating: float
    reviews_count: int
    performance: MoviePerformanceRead | None


class MovieRead(MovieSummary):
    data_lancamento: date | None
    duracao_minutos: int | None
    idioma_original: str | None
    status_filme: str | None
    sinopse: str | None
    companies: list[str]
    directors: list[str]
    writers: list[str]
    cast: list[str]
    reviews: list[MovieReviewRead]


class MovieList(BaseModel):
    items: list[MovieSummary]
    total: int
    limit: int
    offset: int


class GenreList(BaseModel):
    genres: list[str]


class LanguageList(BaseModel):
    languages: list[str]


class PersonList(BaseModel):
    people: list[str]


class CompanyList(BaseModel):
    companies: list[str]
