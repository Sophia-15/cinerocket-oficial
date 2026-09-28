import { z } from 'zod';

const currentYear = new Date().getFullYear();
const requiredText = (message: string) => z.string().trim().min(1, message);

export const moviePerformanceSchema = z.object({
  orcamento_usd: z.string().nullable(),
  receita_usd: z.string().nullable(),
  lucro_usd: z.string(),
  orcamento_brl: z.string().nullable(),
  receita_brl: z.string().nullable(),
  lucro_brl: z.string(),
  popularidade: z.number().nullable(),
  nota_tmdb: z.number().nullable(),
  qtd_tmdb: z.number().int().nullable(),
  nota_imdb: z.number().nullable(),
  qtd_imdb: z.number().int().nullable(),
});

export const movieReviewSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  rating: z.number().min(0).max(10),
  text: z.string(),
  created_at: z.string(),
});

export const movieSummarySchema = z.object({
  id_filme: z.string(),
  titulo: z.string(),
  ano_lancamento: z.number().int().nullable(),
  genres: z.array(z.string()),
  poster_url: z.string().nullable(),
  average_rating: z.number(),
  reviews_count: z.number().int(),
  performance: moviePerformanceSchema.nullable(),
});

export const movieSchema = movieSummarySchema.extend({
  data_lancamento: z.string().nullable(),
  duracao_minutos: z.number().int().nullable(),
  idioma_original: z.string().nullable(),
  status_filme: z.string().nullable(),
  sinopse: z.string().nullable(),
  companies: z.array(z.string()),
  directors: z.array(z.string()),
  writers: z.array(z.string()),
  cast: z.array(z.string()),
  reviews: z.array(movieReviewSchema),
});

export const movieListSchema = z.object({
  items: z.array(movieSummarySchema),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
});

export const genreListSchema = z.object({
  genres: z.array(z.string()),
});

export const languageListSchema = z.object({
  languages: z.array(z.string()),
});

export const personListSchema = z.object({
  people: z.array(z.string()),
});

export const companyListSchema = z.object({
  companies: z.array(z.string()),
});

export const personTypes = ['Diretor', 'Roteirista', 'Ator'] as const;
export type PersonType = (typeof personTypes)[number];

export const sortValues = [
  'recent',
  'title',
  'year',
  'popularity',
  'imdb_rating',
  'user_rating',
] as const;
export type SortBy = (typeof sortValues)[number];

export const defaultCatalogSearch = {
  genero: undefined,
  ano_min: undefined,
  ano_max: undefined,
  nota_min: undefined,
  idioma: undefined,
  sort: 'recent',
  page: 1,
} satisfies {
  genero: string | undefined;
  ano_min: number | undefined;
  ano_max: number | undefined;
  nota_min: number | undefined;
  idioma: string | undefined;
  sort: SortBy;
  page: number;
};

const namesField = (maxLength: number) =>
  z.array(
    requiredText('Nome não pode ficar vazio.').max(
      maxLength,
      `Use no máximo ${maxLength} caracteres.`,
    ),
  );

export const movieDraftSchema = z.object({
  titulo: requiredText('Informe o título.').max(500),
  ano_lancamento: z.coerce
    .number<number | string>()
    .int('Informe um ano válido.')
    .min(1888, 'O ano deve ser igual ou posterior a 1888.')
    .max(currentYear + 5, `O ano deve ser no máximo ${currentYear + 5}.`),
  sinopse: requiredText('Informe a sinopse.').max(4000, 'Use no máximo 4000 caracteres.'),
  genres: namesField(50).min(1, 'Informe pelo menos um gênero.'),
  companies: namesField(255),
  directors: namesField(255),
  writers: namesField(255),
  cast: namesField(255),
  poster_url: z.union([
    z.literal(''),
    z.url('Informe uma URL válida para o pôster.').max(2048, 'Use no máximo 2048 caracteres.'),
  ]),
});

export const reviewDraftSchema = z.object({
  name: z
    .string()
    .trim()
    .max(120, 'Use no máximo 120 caracteres.')
    .optional()
    .transform((name) => name || 'Convidado'),
  rating: z.number().min(0, 'A nota mínima é 0.').max(10, 'A nota máxima é 10.'),
  text: requiredText('Escreva sua resenha.').max(4000, 'Use no máximo 4000 caracteres.'),
});

export type MoviePerformance = z.infer<typeof moviePerformanceSchema>;
export type MovieReview = z.infer<typeof movieReviewSchema>;
export type MovieSummary = z.infer<typeof movieSummarySchema>;
export type Movie = z.infer<typeof movieSchema>;
export type MovieList = z.infer<typeof movieListSchema>;
export type LanguageList = z.infer<typeof languageListSchema>;
export type MovieDraft = z.infer<typeof movieDraftSchema>;
export type MovieFormValues = Omit<MovieDraft, 'ano_lancamento'> & {
  ano_lancamento: number | string;
};
export type ReviewDraft = z.infer<typeof reviewDraftSchema>;
