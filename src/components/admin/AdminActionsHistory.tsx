import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, History, Loader2, ChevronLeft, ChevronRight, 
  RefreshCw, Download, Ban, UserCheck, UserPlus, UserMinus, Trash2, Edit, TrendingUp
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const ITEMS_PER_PAGE = 20;

interface AdminAction {
  id: string;
  admin_id: string;
  action_type: string;
  target_user_id: string | null;
  target_resource_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
  admin_profile?: {
    username: string | null;
    avatar_url: string | null;
  };
  target_profile?: {
    username: string | null;
    avatar_url: string | null;
  };
}

type ActionFilter = 'all' | 'add_role' | 'remove_role' | 'ban_user' | 'unban_user' | 'other';

const COLORS = ['#10b981', '#f97316', '#ef4444', '#22c55e', '#6366f1', '#8b5cf6'];

const AdminActionsHistory = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const { data: actions, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-actions'],
    queryFn: async () => {
      // Get admin actions
      const { data: actionsData, error: actionsError } = await supabase
        .from('admin_actions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (actionsError) throw actionsError;

      // Get unique user IDs
      const userIds = new Set<string>();
      actionsData.forEach(action => {
        userIds.add(action.admin_id);
        if (action.target_user_id) {
          userIds.add(action.target_user_id);
        }
      });

      // Fetch profiles for all users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', Array.from(userIds));

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Combine data
      return actionsData.map(action => ({
        ...action,
        details: action.details as Record<string, unknown>,
        admin_profile: profileMap.get(action.admin_id),
        target_profile: action.target_user_id ? profileMap.get(action.target_user_id) : undefined
      })) as AdminAction[];
    },
  });

  // Calculate chart data
  const chartData = useMemo(() => {
    if (!actions) return { daily: [], byType: [], byAdmin: [], trend: [] };

    // Daily actions for the last 7 days
    const dailyMap = new Map<string, number>();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const key = format(date, 'dd/MM');
      dailyMap.set(key, 0);
      return key;
    });

    actions.forEach(action => {
      const date = format(new Date(action.created_at), 'dd/MM');
      if (dailyMap.has(date)) {
        dailyMap.set(date, (dailyMap.get(date) || 0) + 1);
      }
    });

    const daily = last7Days.map(date => ({
      date,
      ações: dailyMap.get(date) || 0
    }));

    // Actions by type
    const typeMap = new Map<string, number>();
    actions.forEach(action => {
      const type = action.action_type;
      typeMap.set(type, (typeMap.get(type) || 0) + 1);
    });

    const typeLabels: Record<string, string> = {
      'add_role': 'Cargo +',
      'remove_role': 'Cargo -',
      'ban_user': 'Banir',
      'unban_user': 'Desbanir'
    };

    const byType = Array.from(typeMap.entries()).map(([type, count]) => ({
      name: typeLabels[type] || type,
      value: count
    }));

    // Actions by admin
    const adminMap = new Map<string, { count: number; username: string }>();
    actions.forEach(action => {
      const adminId = action.admin_id;
      const existing = adminMap.get(adminId);
      if (existing) {
        existing.count++;
      } else {
        adminMap.set(adminId, { 
          count: 1, 
          username: action.admin_profile?.username || 'Admin' 
        });
      }
    });

    const byAdmin = Array.from(adminMap.entries())
      .map(([_, data]) => ({
        name: data.username,
        ações: data.count
      }))
      .sort((a, b) => b.ações - a.ações)
      .slice(0, 5);

    // Trend - actions per day for last 30 days
    const trendMap = new Map<string, { bans: number; roles: number }>();
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = subDays(new Date(), 29 - i);
      const key = format(date, 'dd/MM');
      trendMap.set(key, { bans: 0, roles: 0 });
      return key;
    });

    actions.forEach(action => {
      const date = format(new Date(action.created_at), 'dd/MM');
      const existing = trendMap.get(date);
      if (existing) {
        if (action.action_type === 'ban_user' || action.action_type === 'unban_user') {
          existing.bans++;
        } else {
          existing.roles++;
        }
      }
    });

    const trend = last30Days.map(date => ({
      date,
      ...trendMap.get(date)
    }));

    return { daily, byType, byAdmin, trend };
  }, [actions]);

  const filteredActions = useMemo(() => {
    if (!actions) return [];
    
    let result = actions;
    
    if (actionFilter !== 'all') {
      if (actionFilter === 'other') {
        result = result.filter(a => !['add_role', 'remove_role', 'ban_user', 'unban_user'].includes(a.action_type));
      } else {
        result = result.filter(a => a.action_type === actionFilter);
      }
    }
    
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      result = result.filter(a => 
        a.admin_profile?.username?.toLowerCase().includes(search) ||
        a.target_profile?.username?.toLowerCase().includes(search) ||
        a.action_type.toLowerCase().includes(search)
      );
    }
    
    return result;
  }, [actions, searchTerm, actionFilter]);

  const totalPages = Math.ceil(filteredActions.length / ITEMS_PER_PAGE);
  const paginatedActions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredActions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredActions, currentPage]);

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'add_role':
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'remove_role':
        return <UserMinus className="h-4 w-4 text-orange-500" />;
      case 'ban_user':
        return <Ban className="h-4 w-4 text-destructive" />;
      case 'unban_user':
        return <UserCheck className="h-4 w-4 text-green-500" />;
      case 'delete':
        return <Trash2 className="h-4 w-4 text-destructive" />;
      case 'edit':
        return <Edit className="h-4 w-4 text-blue-500" />;
      default:
        return <History className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActionBadge = (actionType: string) => {
    switch (actionType) {
      case 'add_role':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Cargo Adicionado</Badge>;
      case 'remove_role':
        return <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30">Cargo Removido</Badge>;
      case 'ban_user':
        return <Badge variant="destructive">Usuário Banido</Badge>;
      case 'unban_user':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Usuário Desbanido</Badge>;
      default:
        return <Badge variant="secondary">{actionType}</Badge>;
    }
  };

  const formatActionDetails = (action: AdminAction) => {
    const details = action.details;
    
    if (action.action_type === 'add_role' || action.action_type === 'remove_role') {
      const role = details.role as string;
      const roleLabel = role === 'admin' ? 'Admin' : role === 'moderator' ? 'Moderador' : role === 'vip' ? 'VIP' : role;
      return `Cargo: ${roleLabel}`;
    }
    
    if (action.action_type === 'ban_user') {
      const reason = details.reason as string;
      const duration = details.duration as string;
      const isPermanent = details.is_permanent as boolean;
      return `Motivo: ${reason} | Duração: ${isPermanent ? 'Permanente' : duration + ' dias'}`;
    }
    
    return Object.entries(details).map(([key, value]) => `${key}: ${value}`).join(' | ');
  };

  const exportActions = () => {
    if (!filteredActions.length) return;

    const headers = ['Data/Hora', 'Administrador', 'Ação', 'Usuário Alvo', 'Detalhes'];
    const rows = filteredActions.map(action => [
      format(new Date(action.created_at), 'dd/MM/yyyy HH:mm:ss'),
      action.admin_profile?.username || action.admin_id,
      action.action_type,
      action.target_profile?.username || action.target_user_id || '-',
      formatActionDetails(action)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `historico-admin-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const actionCounts = useMemo(() => {
    if (!actions) return { total: 0, addRole: 0, removeRole: 0, ban: 0, unban: 0 };
    return {
      total: actions.length,
      addRole: actions.filter(a => a.action_type === 'add_role').length,
      removeRole: actions.filter(a => a.action_type === 'remove_role').length,
      ban: actions.filter(a => a.action_type === 'ban_user').length,
      unban: actions.filter(a => a.action_type === 'unban_user').length,
    };
  }, [actions]);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <History className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{actionCounts.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <UserPlus className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{actionCounts.addRole}</p>
                <p className="text-sm text-muted-foreground">Cargos +</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <UserMinus className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{actionCounts.removeRole}</p>
                <p className="text-sm text-muted-foreground">Cargos -</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <Ban className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{actionCounts.ban}</p>
                <p className="text-sm text-muted-foreground">Banimentos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <UserCheck className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{actionCounts.unban}</p>
                <p className="text-sm text-muted-foreground">Desbanimentos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Actions Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Ações nos Últimos 7 Dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData.daily}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="ações" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Actions by Type Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.byType.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={chartData.byType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.byType.map((_, index) => (
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
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                Nenhuma ação registrada
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Admins Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 5 Administradores Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.byAdmin.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData.byAdmin} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="ações" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                Nenhuma ação registrada
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tendência (30 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData.trend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  interval={4}
                />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="roles" stroke="#10b981" name="Cargos" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="bans" stroke="#ef4444" name="Bans" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Actions List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico de Ações
              </CardTitle>
              <CardDescription>
                Registro de todas as ações administrativas realizadas no sistema
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportActions}
                disabled={!filteredActions.length}
              >
                <Download className="h-4 w-4 mr-1" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por administrador ou usuário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={actionFilter} onValueChange={(value: ActionFilter) => setActionFilter(value)}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtrar por ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                <SelectItem value="add_role">Cargo adicionado</SelectItem>
                <SelectItem value="remove_role">Cargo removido</SelectItem>
                <SelectItem value="ban_user">Banimentos</SelectItem>
                <SelectItem value="unban_user">Desbanimentos</SelectItem>
                <SelectItem value="other">Outras</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {paginatedActions.map((action) => (
                  <div
                    key={action.id}
                    className="p-4 rounded-lg border border-border hover:border-border/80 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {getActionIcon(action.action_type)}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {getActionBadge(action.action_type)}
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(action.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={action.admin_profile?.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {action.admin_profile?.username?.charAt(0).toUpperCase() || 'A'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">
                              {action.admin_profile?.username || 'Admin'}
                            </span>
                            
                            {action.target_profile && (
                              <>
                                <span className="text-muted-foreground">→</span>
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={action.target_profile?.avatar_url || undefined} />
                                  <AvatarFallback className="text-xs">
                                    {action.target_profile?.username?.charAt(0).toUpperCase() || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <span>{action.target_profile?.username || 'Usuário'}</span>
                              </>
                            )}
                          </div>

                          {Object.keys(action.details).length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {formatActionDetails(action)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredActions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'Nenhuma ação encontrada.' : 'Nenhuma ação registrada ainda.'}
                  </div>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <span className="text-sm text-muted-foreground">
                    {filteredActions.length} ação(ões)
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminActionsHistory;
