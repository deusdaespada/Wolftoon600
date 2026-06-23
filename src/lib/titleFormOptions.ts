export const TITLE_STATUS_OPTIONS = [
  'Em andamento',
  'Completo',
  'Hiato',
  'Cancelado',
] as const;

export type TitleStatus = (typeof TITLE_STATUS_OPTIONS)[number];

export const COMIC_GENRE_OPTIONS = [
  'Ação',
  'Aventura',
  'Comédia',
  'Drama',
  'Fantasia',
  'Romance',
  'Terror',
  'Mistério',
  'Sci-Fi',
  'Slice of Life',
  'Sobrenatural',
  'Esportes',
  'Escolar',
  'Artes Marciais',
  'Isekai',
  'Psicológico',
  'Reencarnação',
  'Vingança',
  'Shounen',
  'Seinen',
] as const;

export const NOVEL_GENRE_OPTIONS = [
  ...COMIC_GENRE_OPTIONS,
  'Xianxia',
  'Wuxia',
  'Xuanhuan',
  'Cultivo',
  'Sistema',
  'LitRPG',
] as const;

export const normalizeTag = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/(^\w|\s\w)/g, (char) => char.toUpperCase());
