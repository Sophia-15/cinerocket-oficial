import { Star } from 'lucide-react';

type StarsProps = {
  value?: number;
};

const STAR_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const Stars = ({ value = 0 }: StarsProps) => {
  const rating = Math.min(10, Math.max(0, value));

  return (
    <span className="stars" role="img" aria-label={`Nota ${value.toFixed(1)} de 10`}>
      {STAR_NUMBERS.map((number) => {
        const fill = Math.min(1, Math.max(0, rating - (number - 1)));
        return (
          <span className="star" key={number} aria-hidden="true">
            <Star size={14} />
            {fill > 0 && (
              <Star
                className="star-overlay"
                size={14}
                fill="currentColor"
                style={{ clipPath: `inset(0 ${100 - fill * 100}% 0 0)` }}
              />
            )}
          </span>
        );
      })}
    </span>
  );
};
