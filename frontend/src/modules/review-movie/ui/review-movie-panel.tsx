import { MessageSquare, Star } from 'lucide-react';
import { useState } from 'react';
import { type MovieReview, Stars } from '@/entities/movie';
import { ReviewMovieForm } from './review-movie-form';

type ReviewMoviePanelProps = {
  movieId: string;
  reviews: MovieReview[];
  averageRating: number;
  reviewsCount: number;
};

const formatReviewDate = (createdAt: string): string => {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const getInitial = (name: string): string => name.trim().charAt(0).toUpperCase() || 'C';

export const ReviewMoviePanel = ({
  movieId,
  reviews,
  averageRating,
  reviewsCount,
}: ReviewMoviePanelProps) => {
  const [isReviewing, setIsReviewing] = useState(false);

  return (
    <section className="reviews-panel" aria-labelledby="reviews-title">
      <div className="section-head">
        <div>
          <h2 id="reviews-title">Reviews</h2>
          <p>O que a comunidade achou</p>
        </div>
        <MessageSquare size={19} aria-hidden="true" />
      </div>

      <div className="review-summary">
        <strong>{averageRating.toFixed(1)}/10</strong>
        <span>{reviewsCount} avaliações</span>
      </div>

      {!isReviewing && (
        <button
          type="button"
          className="button primary review-cta"
          onClick={() => setIsReviewing(true)}
        >
          <Star size={16} /> Avaliar filme
        </button>
      )}

      {isReviewing && <ReviewMovieForm movieId={movieId} onClose={() => setIsReviewing(false)} />}

      {reviews.length === 0 ? (
        <div className="reviews-empty">
          <MessageSquare size={21} aria-hidden="true" />
          <strong>Seja o primeiro a avaliar</strong>
          <p>Compartilhe sua opinião e ajude outros cinéfilos.</p>
        </div>
      ) : (
        <div className="reviews-list">
          {reviews.map((review) => (
            <article className="review" key={review.id}>
              <div className="avatar">{getInitial(review.name)}</div>
              <div className="review-content">
                <div className="review-top">
                  <strong>{review.name}</strong>
                  <span>{formatReviewDate(review.created_at)}</span>
                </div>
                <div className="review-rating">
                  <Stars value={review.rating} />
                  <span>{review.rating.toFixed(1)}/10</span>
                </div>
                <p>{review.text}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
