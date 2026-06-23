import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Shield, 
  AlertTriangle, 
  Activity, 
  TrendingUp, 
  Users, 
  Globe, 
  Eye,
  RefreshCw,
  Zap
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { format, subDays, startOfDay, eachDayOfInterval, subHours, eachHourOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BlockedAccessLog {
  id: string;
  user_id: string | null;
  reason: string;
  detected_extensions: string[] | null;
  user_agent: string | null;
  ip_address: string | null;
  page_url: string | null;
  created_at: string;
}

interface RealtimeDetection {
  id: string;
  reason: string;
  extensions: string[];
  timestamp: Date;
  isNew: boolean;
}

const COLORS = ['hsl(var(--destructive))', 'hsl(var(--primary))', 'hsl(217, 91%, 60%)', 'hsl(142, 71%, 45%)', 'hsl(280, 80%, 60%)'];

const SecurityDashboard = () => {
  const [realtimeDetections, setRealtimeDetections] = useState<RealtimeDetection[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Fetch logs for the last 7 days
  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['security-dashboard-logs'],
    queryFn: async () => {
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      
      const { data, error } = await supabase
        .from('blocked_access_logs')
        .select('*')
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as BlockedAccessLog[];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch logs from the last hour for realtime view
  const { data: recentLogs } = useQuery({
    queryKey: ['security-realtime-logs'],
    queryFn: async () => {
      const oneHourAgo = subHours(new Date(), 1).toISOString();
      
      const { data, error } = await supabase
        .from('blocked_access_logs')
        .select('*')
        .gte('created_at', oneHourAgo)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as BlockedAccessLog[];
    },
    refetchInterval: 5000, // Refetch every 5 seconds for realtime
  });

  // Update realtime detections when new logs come in
  useEffect(() => {
    if (recentLogs) {
      const newDetections: RealtimeDetection[] = recentLogs.map(log => ({
        id: log.id,
        reason: log.reason,
        extensions: log.detected_extensions || [],
        timestamp: new Date(log.created_at),
        isNew: new Date(log.created_at) > lastRefresh,
      }));
      setRealtimeDetections(newDetections);
    }
  }, [recentLogs, lastRefresh]);

  // Calculate stats
  const stats = {
    total: logs?.length || 0,
    today: logs?.filter(l => 
      new Date(l.created_at).toDateString() === new Date().toDateString()
    ).length || 0,
    uniqueUsers: new Set(logs?.filter(l => l.user_id).map(l => l.user_id)).size,
    uniqueIps: new Set(logs?.filter(l => l.ip_address).map(l => l.ip_address)).size,
    extensionsDetected: [...new Set(logs?.flatMap(l => l.detected_extensions || []))],
    lastHour: recentLogs?.length || 0,
  };

  // Daily chart data
  const dailyChartData = (() => {
    if (!logs) return [];
    
    const days = eachDayOfInterval({
      start: subDays(new Date(), 6),
      end: new Date()
    });
    
    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      
      const count = logs.filter(l => {
        const logDate = new Date(l.created_at);
        return logDate >= dayStart && logDate < dayEnd;
      }).length;
      
      return {
        date: format(day, 'dd/MM', { locale: ptBR }),
        fullDate: format(day, 'dd/MM/yyyy', { locale: ptBR }),
        bloqueios: count
      };
    });
  })();

  // Hourly chart data (last 24 hours)
  const hourlyChartData = (() => {
    if (!logs) return [];
    
    const hours = eachHourOfInterval({
      start: subHours(new Date(), 23),
      end: new Date()
    });
    
    return hours.map(hour => {
      const hourStart = hour;
      const hourEnd = new Date(hourStart);
      hourEnd.setHours(hourEnd.getHours() + 1);
      
      const count = logs.filter(l => {
        const logDate = new Date(l.created_at);
        return logDate >= hourStart && logDate < hourEnd;
      }).length;
      
      return {
        hour: format(hour, 'HH:mm', { locale: ptBR }),
        bloqueios: count
      };
    });
  })();

  // Extension breakdown data
  const extensionBreakdown = (() => {
    if (!logs) return [];
    
    const extensionCounts: Record<string, number> = {};
    logs.forEach(log => {
      (log.detected_extensions || []).forEach(ext => {
        extensionCounts[ext] = (extensionCounts[ext] || 0) + 1;
      });
    });
    
    return Object.entries(extensionCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  })();

  // Reason breakdown data
  const reasonBreakdown = (() => {
    if (!logs) return [];
    
    const reasonCounts: Record<string, number> = {};
    logs.forEach(log => {
      const reason = log.reason.split(':')[0].trim();
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });
    
    return Object.entries(reasonCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  })();

  const handleRefresh = () => {
    setLastRefresh(new Date());
    refetch();
  };

  return (
    <div className="space-y-6">
      {/* Header with realtime indicator */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Dashboard de Segurança</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  Monitoramento em tempo real - CyberWall v4.0
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-destructive/10 border-destructive/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <div>
                <p className="text-2xl font-bold text-destructive">{stats.total}</p>
                <p className="text-xs text-muted-foreground">7 dias</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-500/10 border-orange-500/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Zap className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold text-orange-500">{stats.today}</p>
                <p className="text-xs text-muted-foreground">Hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-yellow-500/10 border-yellow-500/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold text-yellow-500">{stats.lastHour}</p>
                <p className="text-xs text-muted-foreground">Última hora</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-primary">{stats.uniqueUsers}</p>
                <p className="text-xs text-muted-foreground">Usuários</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-500/10 border-purple-500/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Globe className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold text-purple-500">{stats.uniqueIps}</p>
                <p className="text-xs text-muted-foreground">IPs únicos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Eye className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-blue-500">{stats.extensionsDetected.length}</p>
                <p className="text-xs text-muted-foreground">Extensões</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Bloqueios por Dia (7 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyChartData}>
                  <defs>
                    <linearGradient id="colorBloqueios" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ''}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="bloqueios" 
                    stroke="hsl(var(--destructive))" 
                    fillOpacity={1}
                    fill="url(#colorBloqueios)"
                    strokeWidth={2}
                    name="Bloqueios"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Hourly Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Atividade por Hora (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hourlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="hour" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={10}
                    interval={2}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="bloqueios" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', r: 3 }}
                    name="Bloqueios"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Extension and Reason Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Extension Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Extensões Detectadas</CardTitle>
            <CardDescription>Top 10 extensões mais bloqueadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {extensionBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={extensionBreakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={11}
                      width={120}
                      tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar 
                      dataKey="value" 
                      fill="hsl(var(--destructive))" 
                      radius={[0, 4, 4, 0]}
                      name="Detecções"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Nenhuma extensão detectada
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Reason Breakdown Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Motivos de Bloqueio</CardTitle>
            <CardDescription>Distribuição por tipo de detecção</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {reasonBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reasonBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {reasonBreakdown.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Nenhum motivo registrado
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Realtime Feed */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            Detecções em Tempo Real
          </CardTitle>
          <CardDescription>Últimas 50 detecções da última hora</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : realtimeDetections.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma detecção na última hora
              </div>
            ) : (
              <div className="space-y-2">
                {realtimeDetections.map((detection) => (
                  <div 
                    key={detection.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                      detection.isNew 
                        ? 'bg-destructive/10 border-destructive/30 animate-pulse' 
                        : 'bg-muted/30 border-border'
                    }`}
                  >
                    <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                      detection.isNew ? 'text-destructive' : 'text-muted-foreground'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">
                          {detection.reason}
                        </span>
                        {detection.isNew && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                            NOVO
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {detection.extensions.slice(0, 3).map((ext, i) => (
                          <Badge key={i} variant="outline" className="text-[10px]">
                            {ext}
                          </Badge>
                        ))}
                        {detection.extensions.length > 3 && (
                          <Badge variant="outline" className="text-[10px]">
                            +{detection.extensions.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(detection.timestamp, 'HH:mm:ss', { locale: ptBR })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Detected Extensions List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Todas as Extensões Detectadas</CardTitle>
          <CardDescription>Lista completa de extensões identificadas nos últimos 7 dias</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {stats.extensionsDetected.length > 0 ? (
              stats.extensionsDetected.map((ext, i) => (
                <Badge key={i} variant="destructive" className="text-xs">
                  {ext}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground text-sm">Nenhuma extensão detectada</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityDashboard;
