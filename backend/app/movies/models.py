from datetime import date, datetime
from decimal import Decimal
from hashlib import sha256
from typing import Literal
from uuid import uuid4

from sqlalchemy import (
    CheckConstraint,
    Column,
    Date,
    Double,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Table,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def generate_surrogate_key() -> str:
    """Cria uma chave textual compatível com os hashes SHA-256 dos CSVs diamond."""

    return sha256(uuid4().bytes).hexdigest()


# Tabelas-ponte: apenas associação N:N, sem colunas adicionais além das FKs.
#
# Os CSVs diamond usam hashes SHA-256 (64 caracteres) como chaves substitutas.
# Novos registros recebem a mesma forma de chave por default; cargas CSV podem
# preservar os valores originais ao informá-los explicitamente.
bridge_movie_genre = Table(
    "bridge_movie_genre",
    Base.metadata,
    Column(
        "sk_movie_id",
        String(64),
        ForeignKey("dim_movies.sk_movie_id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "sk_genre_id",
        String(64),
        ForeignKey("dim_genres.sk_genre_id", ondelete="CASCADE"),
        primary_key=True,
    ),
)

bridge_movie_company = Table(
    "bridge_movie_company",
    Base.metadata,
    Column(
        "sk_movie_id",
        String(64),
        ForeignKey("dim_movies.sk_movie_id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "sk_company_id",
        String(64),
        ForeignKey("dim_companies.sk_company_id", ondelete="CASCADE"),
        primary_key=True,
    ),
)

bridge_movie_person = Table(
    "bridge_movie_person",
    Base.metadata,
    Column(
        "sk_movie_id",
        String(64),
        ForeignKey("dim_movies.sk_movie_id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "sk_person_id",
        String(64),
        ForeignKey("dim_people.sk_person_id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    ),
)


class DimMovie(Base):
    """Metadados principais e descritivos de cada filme."""

    __tablename__ = "dim_movies"

    sk_movie_id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default=generate_surrogate_key
    )
    id_filme: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    titulo: Mapped[str] = mapped_column(String(500), index=True)
    data_lancamento: Mapped[date | None] = mapped_column(Date, default=None)
    ano_lancamento: Mapped[int | None] = mapped_column(Integer, index=True, default=None)
    duracao_minutos: Mapped[int | None] = mapped_column(Integer, default=None)
    idioma_original: Mapped[str | None] = mapped_column(String(10), default=None)
    status_filme: Mapped[str | None] = mapped_column(String(50), default=None)
    sinopse: Mapped[str | None] = mapped_column(String(4000), default=None)
    url_poster: Mapped[str | None] = mapped_column(String(2048), default=None)
    url_backdrop: Mapped[str | None] = mapped_column(String(2048), default=None)

    genre_links: Mapped[list["DimGenre"]] = relationship(
        secondary=bridge_movie_genre, back_populates="movies", order_by="DimGenre.nome_genero"
    )
    company_links: Mapped[list["DimCompany"]] = relationship(
        secondary=bridge_movie_company,
        back_populates="movies",
        order_by="DimCompany.nome_produtora",
    )
    people: Mapped[list["DimPerson"]] = relationship(
        secondary=bridge_movie_person, back_populates="movies"
    )

    performance: Mapped["FactMoviePerformance | None"] = relationship(
        back_populates="movie", cascade="all, delete-orphan", uselist=False
    )
    reviews_summary: Mapped["DimReview | None"] = relationship(
        back_populates="movie", cascade="all, delete-orphan", uselist=False
    )
    reviews: Mapped[list["MovieReview"]] = relationship(
        back_populates="movie", cascade="all, delete-orphan", order_by="MovieReview.created_at"
    )

    # Propriedades derivadas somente-leitura, no mesmo espírito de average_rating
    # no Movie original: nao duplicam dado, apenas projetam as relações carregadas.
    @property
    def genres(self) -> list[str]:
        return [genre.nome_genero for genre in self.genre_links]

    @property
    def companies(self) -> list[str]:
        return [company.nome_produtora for company in self.company_links]

    @property
    def directors(self) -> list[str]:
        return [person.nome_pessoa for person in self.people if person.tipo_pessoa == "Diretor"]

    @property
    def writers(self) -> list[str]:
        return [person.nome_pessoa for person in self.people if person.tipo_pessoa == "Roteirista"]

    @property
    def cast(self) -> list[str]:
        return [person.nome_pessoa for person in self.people if person.tipo_pessoa == "Ator"]

    @property
    def poster_url(self) -> str | None:
        return self.url_poster

    @property
    def average_rating(self) -> float:
        return self.reviews_summary.nota_media_usuarios or 0.0 if self.reviews_summary else 0.0

    @property
    def reviews_count(self) -> int:
        return self.reviews_summary.qtd_avaliacoes_usuarios if self.reviews_summary else 0


class DimGenre(Base):
    """Catálogo único e deduplicado de gêneros."""

    __tablename__ = "dim_genres"

    sk_genre_id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default=generate_surrogate_key
    )
    nome_genero: Mapped[str] = mapped_column(String(50), unique=True)

    movies: Mapped[list["DimMovie"]] = relationship(
        secondary=bridge_movie_genre, back_populates="genre_links"
    )


class DimCompany(Base):
    """Catálogo único de produtoras e estúdios."""

    __tablename__ = "dim_companies"

    sk_company_id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default=generate_surrogate_key
    )
    nome_produtora: Mapped[str] = mapped_column(String(255), unique=True)

    movies: Mapped[list["DimMovie"]] = relationship(
        secondary=bridge_movie_company, back_populates="company_links"
    )


PERSON_TYPES: tuple[str, ...] = ("Ator", "Diretor", "Roteirista")
PersonType = Literal["Ator", "Diretor", "Roteirista"]


class DimPerson(Base):
    """Pessoas físicas envolvidas na obra.

    Grão = (nome_pessoa, tipo_pessoa): a mesma pessoa em papéis diferentes
    (ex.: diretora em um filme, roteirista em outro) gera duas linhas
    distintas, uma por papel, porque tipo_pessoa é um atributo mono-valorado
    da dimensão.
    """

    __tablename__ = "dim_people"
    __table_args__ = (
        UniqueConstraint(
            "nome_pessoa", "tipo_pessoa", name="uq_dim_people_nome_pessoa_tipo_pessoa"
        ),
        CheckConstraint(
            "tipo_pessoa IN (" + ", ".join(f"'{value}'" for value in PERSON_TYPES) + ")",
            name="tipo_pessoa_valido",
        ),
    )

    sk_person_id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default=generate_surrogate_key
    )
    nome_pessoa: Mapped[str] = mapped_column(String(255), index=True)
    tipo_pessoa: Mapped[str] = mapped_column(String(20))

    movies: Mapped[list["DimMovie"]] = relationship(
        secondary=bridge_movie_person, back_populates="people"
    )


class FactMoviePerformance(Base):
    """Métricas financeiras e de engajamento, uma linha por filme."""

    __tablename__ = "fact_movies_performance"

    sk_movie_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("dim_movies.sk_movie_id", ondelete="CASCADE"), primary_key=True
    )

    orcamento_usd: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=None)
    receita_usd: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=None)
    lucro_usd: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=0)
    orcamento_brl: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=None)
    receita_brl: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), default=None)
    lucro_brl: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=0)

    popularidade: Mapped[float | None] = mapped_column(Double, default=None)
    nota_tmdb: Mapped[float | None] = mapped_column(Double, default=None)
    qtd_tmdb: Mapped[int | None] = mapped_column(Integer, default=None)
    nota_imdb: Mapped[float | None] = mapped_column(Double, default=None)
    qtd_imdb: Mapped[int | None] = mapped_column(Integer, default=None)

    movie: Mapped["DimMovie"] = relationship(back_populates="performance")


class MovieReview(Base):
    """Avaliação individual enviada por um usuário — fonte de verdade do texto da review.

    A dimensão de avaliações consolida estas linhas em uma métrica resumida por filme.
    As avaliações individuais vêm de movies_reviews.csv na carga inicial ou
    são enviadas pela aplicação.
    """

    __tablename__ = "movie_reviews"
    __table_args__ = (CheckConstraint("rating >= 0 AND rating <= 10", name="rating_range"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    sk_movie_review_id: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, default=generate_surrogate_key
    )
    sk_movie_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("dim_movies.sk_movie_id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(120))
    rating: Mapped[float] = mapped_column(Double)
    text: Mapped[str] = mapped_column(String(4000))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    movie: Mapped["DimMovie"] = relationship(back_populates="reviews")


class DimReview(Base):
    """Resumo materializado por filme para o Diamond e consultas de avaliação."""

    __tablename__ = "dim_reviews"

    sk_review_id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default=generate_surrogate_key
    )
    sk_movie_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("dim_movies.sk_movie_id", ondelete="CASCADE"), unique=True
    )
    qtd_avaliacoes_usuarios: Mapped[int] = mapped_column(Integer, default=0)
    nota_media_usuarios: Mapped[float | None] = mapped_column(Double, default=None)

    movie: Mapped["DimMovie"] = relationship(back_populates="reviews_summary")
