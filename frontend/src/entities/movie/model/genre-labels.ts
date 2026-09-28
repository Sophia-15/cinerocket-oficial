// O dataset (e o valor salvo em cada filme) usa os nomes de gênero em inglês
// do TMDB; este mapa só traduz o rótulo exibido, mantendo o value original
// para não fragmentar o filtro de gênero do catálogo em dois idiomas.
const GENRE_LABELS_PT_BR: Record<string, string> = {
  Action: 'Ação',
  Adventure: 'Aventura',
  Animation: 'Animação',
  Comedy: 'Comédia',
  Crime: 'Crime',
  Documentary: 'Documentário',
  Drama: 'Drama',
  Family: 'Família',
  Fantasy: 'Fantasia',
  History: 'História',
  Horror: 'Terror',
  Music: 'Música',
  Mystery: 'Mistério',
  Romance: 'Romance',
  'Science Fiction': 'Ficção científica',
  'TV Movie': 'Cinema TV',
  Thriller: 'Suspense',
  War: 'Guerra',
  Western: 'Faroeste',
};

export const translateGenreLabel = (genre: string): string => GENRE_LABELS_PT_BR[genre] ?? genre;
