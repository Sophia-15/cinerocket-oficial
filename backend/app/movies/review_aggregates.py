"""Cálculo único de contagem e média das avaliações individuais."""

from collections.abc import Iterable
from decimal import ROUND_HALF_UP, Decimal


def summarize_ratings(ratings: Iterable[float]) -> tuple[int, float | None]:
    values = [Decimal(str(rating)) for rating in ratings]
    if not values:
        return 0, None
    average = (sum(values) / len(values)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return len(values), float(average)
