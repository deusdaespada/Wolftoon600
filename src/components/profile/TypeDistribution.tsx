interface TypeDistributionProps {
  types: { type: string; count: number }[];
}

const TypeDistribution = ({ types }: TypeDistributionProps) => {
  if (!types || types.length === 0) {
    return null;
  }

  const total = types.reduce((acc, t) => acc + t.count, 0);

  const colors: Record<string, string> = {
    'Manhwa': 'bg-blue-500',
    'Manhua': 'bg-emerald-500',
    'Mangá': 'bg-pink-500',
    'Novel': 'bg-purple-500',
  };

  return (
    <div className="space-y-4">
      {/* Barra de distribuição */}
      <div className="h-4 rounded-full overflow-hidden flex">
        {types.map((item, index) => (
          <div
            key={item.type}
            className={`${colors[item.type] || 'bg-primary'} first:rounded-l-full last:rounded-r-full transition-all duration-500`}
            style={{ width: `${(item.count / total) * 100}%` }}
          />
        ))}
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-4">
        {types.map((item) => (
          <div key={item.type} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${colors[item.type] || 'bg-primary'}`} />
            <span className="text-sm">
              {item.type}: <span className="font-medium">{Math.round((item.count / total) * 100)}%</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TypeDistribution;
