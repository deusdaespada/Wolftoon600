export interface Manga {
  id: string;
  title: string;
  cover: string;
  type: "Manhwa" | "Manhua" | "Mangá";
  rating: number;
  chapters: number;
  status: "Completo" | "Em andamento";
  genres: string[];
  synopsis: string;
  author: string;
  year: number;
  views: number;
}

export const mockMangas: Manga[] = [
  {
    id: "1",
    title: "Solo Leveling",
    cover: "https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=400&h=600&fit=crop",
    type: "Manhwa",
    rating: 9.8,
    chapters: 179,
    status: "Completo",
    genres: ["Ação", "Fantasia", "Aventura"],
    synopsis: "Em um mundo onde caçadores arriscam suas vidas para lutar contra monstros, Sung Jinwoo, o caçador mais fraco de todos, descobre uma habilidade única que muda tudo.",
    author: "Chugong",
    year: 2018,
    views: 15000000,
  },
  {
    id: "2",
    title: "Tower of God",
    cover: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=600&fit=crop",
    type: "Manhwa",
    rating: 9.5,
    chapters: 550,
    status: "Em andamento",
    genres: ["Fantasia", "Mistério", "Aventura"],
    synopsis: "Bam entra na Torre misteriosa para encontrar sua amiga Rachel, enfrentando desafios impossíveis em cada andar.",
    author: "SIU",
    year: 2010,
    views: 12000000,
  },
  {
    id: "3",
    title: "The Beginning After The End",
    cover: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&h=600&fit=crop",
    type: "Manhwa",
    rating: 9.6,
    chapters: 165,
    status: "Em andamento",
    genres: ["Fantasia", "Ação", "Reencarnação"],
    synopsis: "Um rei reencarna em um mundo mágico como uma criança, trazendo consigo memórias e experiências de sua vida passada.",
    author: "TurtleMe",
    year: 2018,
    views: 10000000,
  },
  {
    id: "4",
    title: "Omniscient Reader's Viewpoint",
    cover: "https://images.unsplash.com/photo-1621193793262-4127d9855c91?w=400&h=600&fit=crop",
    type: "Manhwa",
    rating: 9.7,
    chapters: 120,
    status: "Em andamento",
    genres: ["Ação", "Fantasia", "Drama"],
    synopsis: "Kim Dokja é o único leitor de um webnovel obscuro. Quando a história se torna realidade, ele usa seu conhecimento para sobreviver.",
    author: "Sing Shong",
    year: 2020,
    views: 9500000,
  },
  {
    id: "5",
    title: "The God of High School",
    cover: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&h=600&fit=crop",
    type: "Manhwa",
    rating: 9.2,
    chapters: 540,
    status: "Completo",
    genres: ["Ação", "Artes Marciais", "Sobrenatural"],
    synopsis: "Um torneio épico reúne os melhores lutadores do mundo, mas há muito mais em jogo do que apenas o título de campeão.",
    author: "Yongje Park",
    year: 2011,
    views: 8000000,
  },
  {
    id: "6",
    title: "Martial Peak",
    cover: "https://images.unsplash.com/photo-1578632292335-df3abbb0d586?w=400&h=600&fit=crop",
    type: "Manhua",
    rating: 8.9,
    chapters: 3000,
    status: "Em andamento",
    genres: ["Artes Marciais", "Ação", "Aventura"],
    synopsis: "A jornada de Yang Kai em busca do pico das artes marciais em um mundo de cultivo.",
    author: "Momo",
    year: 2013,
    views: 7500000,
  },
  {
    id: "7",
    title: "Demon Slayer",
    cover: "https://images.unsplash.com/photo-1613376023733-0a73315d9b06?w=400&h=600&fit=crop",
    type: "Mangá",
    rating: 9.4,
    chapters: 205,
    status: "Completo",
    genres: ["Ação", "Sobrenatural", "Drama"],
    synopsis: "Tanjiro luta contra demônios em busca de uma cura para sua irmã transformada.",
    author: "Koyoharu Gotouge",
    year: 2016,
    views: 14000000,
  },
  {
    id: "8",
    title: "The Breaker",
    cover: "https://images.unsplash.com/photo-1626618012641-bfbca5a31239?w=400&h=600&fit=crop",
    type: "Manhwa",
    rating: 9.3,
    chapters: 72,
    status: "Completo",
    genres: ["Artes Marciais", "Ação", "Escola"],
    synopsis: "Um estudante intimidado se torna discípulo de um mestre de artes marciais lendário.",
    author: "Jeon Geuk-jin",
    year: 2007,
    views: 6500000,
  },
];

export const genres = [
  "Ação",
  "Aventura",
  "Comédia",
  "Drama",
  "Fantasia",
  "Romance",
  "Mistério",
  "Sobrenatural",
  "Artes Marciais",
  "Reencarnação",
  "Slice of Life",
  "Horror",
  "Psicológico",
  "Histórico",
];

export const getRandomMangas = (count: number = 6) => {
  const shuffled = [...mockMangas].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

export const getMangaById = (id: string) => {
  return mockMangas.find(manga => manga.id === id);
};
