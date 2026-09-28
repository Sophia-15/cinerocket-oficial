from app.core.exceptions import ResourceNotFoundError


class MovieNotFoundError(ResourceNotFoundError):
    def __init__(self, id_filme: str) -> None:
        self.id_filme = id_filme
        super().__init__(f"Movie {id_filme} was not found")
