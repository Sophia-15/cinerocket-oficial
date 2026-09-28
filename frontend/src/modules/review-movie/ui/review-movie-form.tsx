import { useForm } from '@tanstack/react-form';
import { X } from 'lucide-react';
import { reviewDraftSchema, Stars, useAddReviewMutation } from '@/entities/movie';
import { ErrorBanner } from '@/shared/ui/error-banner';
import { Spinner } from '@/shared/ui/spinner';

type ReviewFormValues = {
  name: string;
  rating: number | null;
  text: string;
};

const defaultValues: ReviewFormValues = { name: '', rating: null, text: '' };

const validateName = ({ value }: { value: string }): string | undefined => {
  const result = reviewDraftSchema.shape.name.safeParse(value);
  return result.success ? undefined : result.error.issues[0]?.message;
};

const validateRating = ({ value }: { value: number | null }): string | undefined => {
  if (value === null) return 'Informe a nota.';

  const result = reviewDraftSchema.shape.rating.safeParse(value);
  return result.success ? undefined : result.error.issues[0]?.message;
};

export const ReviewMovieForm = ({ movieId, onClose }: { movieId: string; onClose: () => void }) => {
  const addReview = useAddReviewMutation(movieId);

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      await addReview.mutateAsync(reviewDraftSchema.parse(value));
      onClose();
    },
  });

  return (
    <form
      className="review-form"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        form.handleSubmit();
      }}
      noValidate
    >
      <div className="form-head">
        <div>
          <h2>Sua resenha</h2>
          <p>Como foi a sua experiência?</p>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label="Fechar formulário"
        >
          <X size={17} />
        </button>
      </div>

      <form.Field name="name" validators={{ onChange: validateName }}>
        {(field) => (
          <label>
            Seu nome
            <input
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="Como quer aparecer?"
            />
            {field.state.meta.errors.length > 0 && (
              <small className="form-error">{field.state.meta.errors[0]}</small>
            )}
          </label>
        )}
      </form.Field>

      <form.Field name="rating" validators={{ onChange: validateRating, onSubmit: validateRating }}>
        {(field) => (
          <div className="form-field">
            <label htmlFor="review-rating">Nota (0 a 10)</label>
            <div className="rating-picker">
              <input
                id="review-rating"
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={field.state.value ?? ''}
                onBlur={field.handleBlur}
                onChange={(event) =>
                  field.handleChange(event.target.value === '' ? null : Number(event.target.value))
                }
                aria-invalid={field.state.meta.errors.length > 0}
              />
              <Stars value={field.state.value ?? 0} />
            </div>
            {field.state.meta.errors.length > 0 && (
              <small className="form-error">{field.state.meta.errors[0]}</small>
            )}
          </div>
        )}
      </form.Field>

      <form.Field name="text" validators={{ onChange: reviewDraftSchema.shape.text }}>
        {(field) => (
          <label>
            Resenha
            <textarea
              aria-invalid={field.state.meta.errors.length > 0}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="Compartilhe o que achou..."
              rows={4}
            />
            {field.state.meta.errors.length > 0 && (
              <small className="form-error">{field.state.meta.errors[0]?.message}</small>
            )}
          </label>
        )}
      </form.Field>

      {addReview.isError && <ErrorBanner message="Não foi possível publicar a resenha." />}

      <form.Subscribe selector={(state) => [state.canSubmit] as const}>
        {([canSubmit]) => (
          <button
            className="button primary"
            type="submit"
            disabled={!canSubmit || addReview.isPending}
          >
            {addReview.isPending ? <Spinner size={16} /> : null} Publicar resenha
          </button>
        )}
      </form.Subscribe>
    </form>
  );
};
