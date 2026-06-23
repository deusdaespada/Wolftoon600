import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAllUsers, useAddVipRole, useRemoveVipRole, useRenewVipRole, useVipHistory, useVipStats } from '@/hooks/useUserRoles';
import { Search, Crown, UserMinus, UserPlus, Loader2, ChevronLeft, ChevronRight, Download, History, RefreshCw, Clock, BarChart3, RotateCcw, Key } from 'lucide-react';
import { format, addDays, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import VipCodeManagement from './VipCodeManagement';

type VipFilter = 'all' | 'vip' | 'non-vip';
const USERS_PER_PAGE = 10;

const VipManagement = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [vipFilter, setVipFilter] = useState<VipFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDuration, setSelectedDuration] = useState<string>('permanent');
  const [vipDialogOpen, setVipDialogOpen] = useState(false);
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
  
  const { data: users, isLoading, refetch, isFetching } = useAllUsers();
  const { data: vipHistory, isLoading: historyLoading } = useVipHistory();
  const { data: vipStats } = useVipStats();
  const addVipRole = useAddVipRole();
  const removeVipRole = useRemoveVipRole();
  const renewVipRole = useRenewVipRole();

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    
    let result = users;
    
    if (vipFilter === 'vip') {
      result = result.filter(user => user.roles.includes('vip'));
    } else if (vipFilter === 'non-vip') {
      result = result.filter(user => !user.roles.includes('vip'));
    }
    
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      result = result.filter(user => 
        user.username?.toLowerCase().includes(search) ||
        user.id.toLowerCase().includes(search)
      );
    }
    
    return result;
  }, [users, searchTerm, vipFilter]);

  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * USERS_PER_PAGE;
    return filteredUsers.slice(start, start + USERS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm, vipFilter]);

  const getExpirationDate = (duration: string): Date | null => {
    const now = new Date();
    switch (duration) {
      case '7days': return addDays(now, 7);
      case '30days': return addDays(now, 30);
      case '3months': return addMonths(now, 3);
      case '6months': return addMonths(now, 6);
      case '1year': return addMonths(now, 12);
      default: return null;
    }
  };

  const openVipDialog = (userId: string, username: string | null) => {
    setSelectedUserId(userId);
    setSelectedUsername(username);
    setSelectedDuration('permanent');
    setVipDialogOpen(true);
  };

  const openRenewDialog = (userId: string, username: string | null) => {
    setSelectedUserId(userId);
    setSelectedUsername(username);
    setSelectedDuration('30days');
    setRenewDialogOpen(true);
  };

  const handleAddVip = async () => {
    if (!selectedUserId) return;
    
    try {
      const expiresAt = getExpirationDate(selectedDuration);
      await addVipRole.mutateAsync({ userId: selectedUserId, expiresAt });
      toast({
        title: 'VIP adicionado!',
        description: expiresAt 
          ? `${selectedUsername || 'Usuário'} agora é VIP até ${format(expiresAt, "dd/MM/yyyy")}.`
          : `${selectedUsername || 'Usuário'} agora é VIP permanente.`,
      });
      setVipDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleRenewVip = async () => {
    if (!selectedUserId) return;
    
    try {
      const expiresAt = getExpirationDate(selectedDuration);
      if (!expiresAt) {
        toast({
          title: 'Erro',
          description: 'Selecione uma duração para renovação.',
          variant: 'destructive',
        });
        return;
      }
      
      await renewVipRole.mutateAsync({ userId: selectedUserId, expiresAt });
      toast({
        title: 'VIP renovado!',
        description: `${selectedUsername || 'Usuário'} agora é VIP até ${format(expiresAt, "dd/MM/yyyy")}.`,
      });
      setRenewDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleRemoveVip = async (userId: string, username: string | null) => {
    try {
      await removeVipRole.mutateAsync(userId);
      toast({
        title: 'VIP removido',
        description: `${username || 'Usuário'} não é mais VIP.`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleRefresh = async () => {
    await refetch();
    toast({
      title: 'Lista atualizada!',
      description: 'A lista de usuários foi sincronizada.',
    });
  };

  const exportToCsv = () => {
    if (!filteredUsers.length) return;

    const headers = ['Nome de Usuário', 'ID', 'Status VIP', 'Expira em', 'Roles', 'Data de Cadastro'];
    const rows = filteredUsers.map(user => [
      user.username || 'Sem nome',
      user.id,
      user.roles.includes('vip') ? 'Sim' : 'Não',
      user.vip_expires_at ? format(new Date(user.vip_expires_at), 'dd/MM/yyyy') : 'Permanente',
      user.roles.join(', '),
      format(new Date(user.created_at), 'dd/MM/yyyy HH:mm')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `usuarios-vip-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'CSV exportado!',
      description: `${filteredUsers.length} usuários exportados.`,
    });
  };

  const vipCount = users?.filter(u => u.roles.includes('vip')).length || 0;
  const totalUsers = users?.length || 0;
  const temporaryVipCount = users?.filter(u => u.roles.includes('vip') && u.vip_expires_at).length || 0;

  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    users?.forEach(u => map.set(u.id, u.username || 'Usuário'));
    return map;
  }, [users]);

  const chartData = useMemo(() => {
    if (!vipStats) return [];
    return vipStats.map(stat => ({
      ...stat,
      monthLabel: format(new Date(stat.month + '-01'), 'MMM/yy', { locale: ptBR })
    }));
  }, [vipStats]);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Crown className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{vipCount}</p>
                <p className="text-sm text-muted-foreground">Usuários VIP</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{temporaryVipCount}</p>
                <p className="text-sm text-muted-foreground">VIP Temporário</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <UserPlus className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalUsers}</p>
                <p className="text-sm text-muted-foreground">Total Usuários</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <BarChart3 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{((vipCount / totalUsers) * 100 || 0).toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">Taxa VIP</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Crown className="h-4 w-4" />
            Gerenciar VIP
          </TabsTrigger>
          <TabsTrigger value="codes" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Códigos VIP
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Estatísticas
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-primary" />
                    Gerenciar VIP
                  </CardTitle>
                  <CardDescription>
                    Adicione ou remova o status VIP dos usuários
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isFetching}
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
                    Atualizar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportToCsv}
                    disabled={!filteredUsers.length}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Exportar CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome de usuário..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={vipFilter} onValueChange={(value: VipFilter) => setVipFilter(value)}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="vip">Apenas VIP</SelectItem>
                    <SelectItem value="non-vip">Não-VIP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {paginatedUsers.map((user) => {
                    const isVip = user.roles.includes('vip');
                    const isAdmin = user.roles.includes('admin');
                    const hasExpiration = isVip && user.vip_expires_at;
                    
                    return (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:border-border transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback>
                              {user.username?.charAt(0).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                                {user.username || 'Sem nome'}
                              </p>
                              <div className="flex gap-1">
                                {isVip && (
                                  <Badge className="bg-primary/20 text-primary border-primary/30">
                                    <Crown className="h-3 w-3 mr-1" />
                                    VIP
                                    {hasExpiration && (
                                      <Clock className="h-3 w-3 ml-1" />
                                    )}
                                  </Badge>
                                )}
                                {isAdmin && (
                                  <Badge variant="secondary">
                                    Admin
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {hasExpiration 
                                ? `VIP até ${format(new Date(user.vip_expires_at!), "dd/MM/yyyy", { locale: ptBR })}`
                                : `Desde ${format(new Date(user.created_at), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}`
                              }
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {isVip ? (
                            <>
                              {hasExpiration && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openRenewDialog(user.id, user.username)}
                                  disabled={renewVipRole.isPending}
                                  className="text-amber-500 hover:text-amber-500 hover:bg-amber-500/10"
                                >
                                  <RotateCcw className="h-4 w-4 mr-1" />
                                  Renovar
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveVip(user.id, user.username)}
                                disabled={removeVipRole.isPending}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <UserMinus className="h-4 w-4 mr-1" />
                                Remover
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openVipDialog(user.id, user.username)}
                              disabled={addVipRole.isPending}
                              className="text-primary hover:text-primary hover:bg-primary/10"
                            >
                              <Crown className="h-4 w-4 mr-1" />
                              Dar VIP
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {paginatedUsers.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      {searchTerm || vipFilter !== 'all' ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
                    </div>
                  )}
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                  <p className="text-sm text-muted-foreground">
                    {((currentPage - 1) * USERS_PER_PAGE) + 1}–{Math.min(currentPage * USERS_PER_PAGE, filteredUsers.length)} de {filteredUsers.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="h-8 px-2 text-xs">
                      Primeira
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                      const page = start + i;
                      if (page > totalPages) return null;
                      return (
                        <Button key={page} variant={page === currentPage ? "default" : "outline"} size="icon" className="h-8 w-8 text-xs" onClick={() => setCurrentPage(page)}>
                          {page}
                        </Button>
                      );
                    })}
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="h-8 px-2 text-xs">
                      Última
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="codes">
          <VipCodeManagement />
        </TabsContent>

        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Estatísticas VIP
              </CardTitle>
              <CardDescription>
                Crescimento de usuários VIP ao longo do tempo
              </CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis 
                        dataKey="monthLabel" 
                        className="text-xs fill-muted-foreground"
                      />
                      <YAxis className="text-xs fill-muted-foreground" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Legend />
                      <Bar 
                        dataKey="added" 
                        name="VIP Adicionados" 
                        fill="hsl(var(--primary))" 
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar 
                        dataKey="removed" 
                        name="VIP Removidos" 
                        fill="hsl(var(--destructive))" 
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum dado de estatísticas ainda. Adicione ou remova VIPs para ver o gráfico.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Histórico de Ações VIP
              </CardTitle>
              <CardDescription>
                Registro de quando o status VIP foi dado ou removido
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : vipHistory && vipHistory.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {vipHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${entry.action === 'added' ? 'bg-green-500/10' : 'bg-destructive/10'}`}>
                          {entry.action === 'added' ? (
                            <UserPlus className="h-4 w-4 text-green-500" />
                          ) : (
                            <UserMinus className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {userMap.get(entry.user_id) || 'Usuário desconhecido'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {entry.action === 'added' ? 'VIP adicionado' : 'VIP removido'}
                            {entry.performed_by && ` por ${userMap.get(entry.performed_by) || 'Admin'}`}
                            {entry.expires_at && ` (expira em ${format(new Date(entry.expires_at), 'dd/MM/yyyy')})`}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(entry.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum histórico de ações VIP ainda
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* VIP Duration Dialog */}
      <Dialog open={vipDialogOpen} onOpenChange={setVipDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Adicionar VIP para {selectedUsername || 'Usuário'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Duração do VIP</Label>
              <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a duração" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="permanent">Permanente</SelectItem>
                  <SelectItem value="7days">7 dias</SelectItem>
                  <SelectItem value="30days">30 dias</SelectItem>
                  <SelectItem value="3months">3 meses</SelectItem>
                  <SelectItem value="6months">6 meses</SelectItem>
                  <SelectItem value="1year">1 ano</SelectItem>
                </SelectContent>
              </Select>
              {selectedDuration !== 'permanent' && (
                <p className="text-sm text-muted-foreground">
                  Expira em: {format(getExpirationDate(selectedDuration)!, 'dd/MM/yyyy', { locale: ptBR })}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setVipDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddVip} disabled={addVipRole.isPending}>
                {addVipRole.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Crown className="h-4 w-4 mr-2" />
                )}
                Confirmar VIP
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* VIP Renewal Dialog */}
      <Dialog open={renewDialogOpen} onOpenChange={setRenewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-amber-500" />
              Renovar VIP para {selectedUsername || 'Usuário'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nova duração do VIP</Label>
              <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a duração" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">7 dias</SelectItem>
                  <SelectItem value="30days">30 dias</SelectItem>
                  <SelectItem value="3months">3 meses</SelectItem>
                  <SelectItem value="6months">6 meses</SelectItem>
                  <SelectItem value="1year">1 ano</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Nova data de expiração: {format(getExpirationDate(selectedDuration) || new Date(), 'dd/MM/yyyy', { locale: ptBR })}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRenewDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleRenewVip} disabled={renewVipRole.isPending} className="bg-amber-500 hover:bg-amber-600">
                {renewVipRole.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-2" />
                )}
                Confirmar Renovação
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VipManagement;