interface ActivityChartProps {
  activity: { month: string; count: number }[];
}

const ActivityChart = ({ activity }: ActivityChartProps) => {
  if (!activity || activity.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Sem atividade recente</p>
      </div>
    );
  }

  const maxCount = Math.max(...activity.map(a => a.count), 1);

  return (
    <div className="flex items-end justify-between gap-2 h-32">
      {activity.map((item, index) => (
        <div key={index} className="flex-1 flex flex-col items-center gap-2">
          <div className="w-full flex flex-col items-center justify-end h-24">
            <span className="text-xs font-medium text-primary mb-1">
              {item.count > 0 ? item.count : ''}
            </span>
            <div
              className="w-full bg-gradient-to-t from-primary to-primary/60 rounded-t-lg transition-all duration-500 hover:from-primary/90 hover:to-primary/50"
              style={{
                height: `${Math.max((item.count / maxCount) * 100, item.count > 0 ? 8 : 2)}%`,
                minHeight: item.count > 0 ? '8px' : '2px',
              }}
            />
          </div>
          <span className="text-xs text-muted-foreground capitalize">{item.month}</span>
        </div>
      ))}
    </div>
  );
};

export default ActivityChart;
