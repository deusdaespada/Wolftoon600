interface GenreChartProps {
  genres: { genre: string; count: number }[];
}

const GenreChart = ({ genres }: GenreChartProps) => {
  if (!genres || genres.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Comece a ler para ver seus gêneros favoritos!</p>
      </div>
    );
  }

  const maxCount = Math.max(...genres.map(g => g.count));

  const colors = [
    'from-primary to-primary/70',
    'from-blue-500 to-blue-600',
    'from-purple-500 to-purple-600',
    'from-emerald-500 to-emerald-600',
    'from-pink-500 to-pink-600',
  ];

  return (
    <div className="space-y-3">
      {genres.map((item, index) => (
        <div key={item.genre} className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{item.genre}</span>
            <span className="text-muted-foreground">{item.count} caps</span>
          </div>
          <div className="h-2.5 bg-muted/50 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${colors[index % colors.length]} rounded-full transition-all duration-500`}
              style={{ width: `${(item.count / maxCount) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default GenreChart;
