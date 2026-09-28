import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import {
  defaultCatalogSearch,
  type MovieDraft,
  movieDetailQueryOptions,
  useCreateMovieMutation,
  useUpdateMovieMutation,
} from '@/entities/movie';
import { MovieEditor } from '@/modules/movie-editor';
import { useDocumentTitle } from '@/shared/lib/use-document-title';
import { Spinner } from '@/shared/ui/spinner';

export const MovieFormPage = () => {
  const { movieId } = useParams({ strict: false });
  const editing = Boolean(movieId);
  const navigate = useNavigate();

  const movieQuery = useQuery({
    ...movieDetailQueryOptions(movieId ?? ''),
    enabled: editing,
  });
  const createMovie = useCreateMovieMutation();
  const updateMovie = useUpdateMovieMutation();
  const mutation = editing ? updateMovie : createMovie;

  useDocumentTitle(
    editing && movieQuery.data
      ? `${movieQuery.data.titulo} · CineRocket`
      : 'CineRocket — seu próximo filme favorito',
  );

  if (editing && !movieQuery.data) {
    return (
      <div className="page-loading">
        <Spinner size={32} />
      </div>
    );
  }

  const handleSubmit = async (draft: MovieDraft) => {
    const saved =
      editing && movieId
        ? await updateMovie.mutateAsync({ idFilme: movieId, input: draft })
        : await createMovie.mutateAsync(draft);
    navigate({ to: '/filme/$movieId', params: { movieId: saved.id_filme } });
  };

  return (
    <>
      {editing && movieId ? (
        <Link className="back" to="/filme/$movieId" params={{ movieId }}>
          <ArrowLeft size={16} /> Cancelar
        </Link>
      ) : (
        <Link className="back" to="/catalogo" search={defaultCatalogSearch}>
          <ArrowLeft size={16} /> Cancelar
        </Link>
      )}
      <div className="form-page">
        <div className="eyebrow">{editing ? 'EDITAR FILME' : 'NOVA ADIÇÃO'}</div>
        <h1>{editing ? 'Editar filme' : 'Adicionar filme'}</h1>
        <p className="lead">
          {editing
            ? 'Atualize as informações desta obra.'
            : 'Registre uma nova história na sua coleção.'}
        </p>
        <MovieEditor
          movie={movieQuery.data}
          onSubmit={handleSubmit}
          submitLabel={editing ? 'Salvar alterações' : 'Adicionar filme'}
          isPending={mutation.isPending}
          submitError={mutation.isError ? 'Não foi possível salvar. Tente novamente.' : null}
        />
      </div>
    </>
  );
};
