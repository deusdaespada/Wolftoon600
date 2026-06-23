import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Search, Users, Shield, Crown, Loader2, ChevronLeft, ChevronRight, 
  Download, RefreshCw, Eye, UserPlus, Calendar, Ban, UserCheck, AlertTriangle, Database
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const USERS_PER_PAGE = 15;

interface UserWithDetails {
  id: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
  roles: string[];
  vip_expires_at: string | null;
  is_banned: boolean;
  ban_info?: {
    reason: string;
    expires_at: string | null;
    is_permanent: boolean;
    banned_at: string;
  };
}

type RoleFilter = 'all' | 'admin' | 'moderator' | 'vip' | 'user' | 'banned';

const UserManagement = () => {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<UserWithDetails | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'moderator' | 'vip'>('moderator');
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState<string>('permanent');

  // Fetch all users with their roles and ban status
  const { data: users, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-all-users'],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get all user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Get all active bans
      const { data: bans, error: bansError } = await supabase
        .from('banned_users')
        .select('*')
        .is('unbanned_at', null);

      if (bansError) throw bansError;

      // Combine data
      const usersWithRoles: UserWithDetails[] = profiles.map(profile => {
        const roles = userRoles
          .filter(r => r.user_id === profile.id)
          .map(r => r.role);
        
        const vipRole = userRoles.find(r => r.user_id === profile.id && r.role === 'vip');
        const banRecord = bans.find(b => b.user_id === profile.id);
        
        // Check if ban is still active
        const isBanned = banRecord && (banRecord.is_permanent || !banRecord.expires_at || new Date(banRecord.expires_at) > new Date());
        
        return {
          id: profile.id,
          username: profile.username,
          avatar_url: profile.avatar_url,
          created_at: profile.created_at,
          roles,
          vip_expires_at: vipRole?.expires_at || null,
          is_banned: !!isBanned,
          ban_info: banRecord ? {
            reason: banRecord.reason,
            expires_at: banRecord.expires_at,
            is_permanent: banRecord.is_permanent,
            banned_at: banRecord.banned_at
          } : undefined
        };
      });

      return usersWithRoles;
    },
  });

  // Set up realtime subscription for new users
  useEffect(() => {
    const channel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          // Refetch users when a new profile is created
          queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
          toast({
            title: 'Novo usuário!',
            description: 'Um novo usuário se cadastrou.',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);

  // Log admin action helper
  const logAdminAction = async (actionType: string, targetUserId: string | null, details: Record<string, unknown>) => {
    if (!currentUser) return;
    
    await supabase.from('admin_actions').insert({
      admin_id: currentUser.id,
      action_type: actionType,
      target_user_id: targetUserId,
      details: details as unknown as Record<string, never>
    });
  };

  // Add role mutation
  const addRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'moderator' | 'vip' | 'user' }) => {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: role });

      if (error) throw error;

      await logAdminAction('add_role', userId, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-actions'] });
      toast({ title: 'Cargo adicionado!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  // Remove role mutation
  const removeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'moderator' | 'vip' | 'user' }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;

      await logAdminAction('remove_role', userId, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-actions'] });
      toast({ title: 'Cargo removido!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  // Ban user mutation
  const banUser = useMutation({
    mutationFn: async ({ userId, reason, duration }: { userId: string; reason: string; duration: string }) => {
      let expiresAt: string | null = null;
      const isPermanent = duration === 'permanent';
      
      if (!isPermanent) {
        const days = parseInt(duration);
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + days);
        expiresAt = expDate.toISOString();
      }

      const { error } = await supabase.from('banned_users').insert({
        user_id: userId,
        banned_by: currentUser?.id,
        reason,
        is_permanent: isPermanent,
        expires_at: expiresAt
      });

      if (error) throw error;

      await logAdminAction('ban_user', userId, { reason, duration, is_permanent: isPermanent });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-actions'] });
      setBanDialogOpen(false);
      setBanReason('');
      setBanDuration('permanent');
      toast({ title: 'Usuário banido!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao banir', description: error.message, variant: 'destructive' });
    },
  });

  // Unban user mutation
  const unbanUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('banned_users')
        .update({ 
          unbanned_at: new Date().toISOString(),
          unbanned_by: currentUser?.id 
        })
        .eq('user_id', userId)
        .is('unbanned_at', null);

      if (error) throw error;

      await logAdminAction('unban_user', userId, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-actions'] });
      toast({ title: 'Usuário desbanido!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao desbanir', description: error.message, variant: 'destructive' });
    },
  });

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    
    let result = users;
    
    if (roleFilter === 'banned') {
      result = result.filter(user => user.is_banned);
    } else if (roleFilter !== 'all') {
      result = result.filter(user => user.roles.includes(roleFilter));
    }
    
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      result = result.filter(user => 
        user.username?.toLowerCase().includes(search) ||
        user.id.toLowerCase().includes(search)
      );
    }
    
    return result;
  }, [users, searchTerm, roleFilter]);

  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * USERS_PER_PAGE;
    return filteredUsers.slice(start, start + USERS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter]);

  const openUserDetails = (user: UserWithDetails) => {
    setSelectedUser(user);
    setDetailsDialogOpen(true);
  };

  const openRoleDialog = (user: UserWithDetails) => {
    setSelectedUser(user);
    setSelectedRole('moderator');
    setRoleDialogOpen(true);
  };

  const openBanDialog = (user: UserWithDetails) => {
    setSelectedUser(user);
    setBanReason('');
    setBanDuration('permanent');
    setBanDialogOpen(true);
  };

  const handleAddRole = async () => {
    if (!selectedUser || !selectedRole) return;
    
    if (selectedUser.roles.includes(selectedRole)) {
      toast({ title: 'Usuário já possui este cargo', variant: 'destructive' });
      return;
    }
    
    await addRole.mutateAsync({ userId: selectedUser.id, role: selectedRole });
    setRoleDialogOpen(false);
  };

  const handleRemoveRole = async (userId: string, role: string) => {
    if (role === 'user') {
      toast({ title: 'Não é possível remover o cargo base', variant: 'destructive' });
      return;
    }
    await removeRole.mutateAsync({ userId, role: role as 'admin' | 'moderator' | 'vip' | 'user' });
  };

  const handleBanUser = async () => {
    if (!selectedUser || !banReason.trim()) {
      toast({ title: 'Informe o motivo do banimento', variant: 'destructive' });
      return;
    }
    
    await banUser.mutateAsync({ 
      userId: selectedUser.id, 
      reason: banReason.trim(),
      duration: banDuration 
    });
  };

  const handleUnbanUser = async (userId: string) => {
    await unbanUser.mutateAsync(userId);
  };

  const exportUsers = () => {
    if (!filteredUsers.length) return;

    const headers = ['Nome de Usuário', 'ID', 'Cargos', 'VIP Expira em', 'Banido', 'Data de Cadastro'];
    const rows = filteredUsers.map(user => [
      user.username || 'Sem nome',
      user.id,
      user.roles.join(', '),
      user.vip_expires_at ? format(new Date(user.vip_expires_at), 'dd/MM/yyyy') : '-',
      user.is_banned ? 'Sim' : 'Não',
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
    link.download = `usuarios-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({ title: 'CSV exportado!', description: `${filteredUsers.length} usuários exportados.` });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30"><Shield className="h-3 w-3 mr-1" />Admin</Badge>;
      case 'moderator':
        return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30"><Shield className="h-3 w-3 mr-1" />Mod</Badge>;
      case 'vip':
        return <Badge className="bg-primary/20 text-primary border-primary/30"><Crown className="h-3 w-3 mr-1" />VIP</Badge>;
      default:
        return <Badge variant="secondary">User</Badge>;
    }
  };

  const totalUsers = users?.length || 0;
  const adminCount = users?.filter(u => u.roles.includes('admin')).length || 0;
  const modCount = users?.filter(u => u.roles.includes('moderator')).length || 0;
  const vipCount = users?.filter(u => u.roles.includes('vip')).length || 0;
  const bannedCount = users?.filter(u => u.is_banned).length || 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalUsers}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <Shield className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{adminCount}</p>
                <p className="text-sm text-muted-foreground">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Shield className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{modCount}</p>
                <p className="text-sm text-muted-foreground">Moderadores</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Crown className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{vipCount}</p>
                <p className="text-sm text-muted-foreground">VIPs</p>
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
                <p className="text-2xl font-bold">{bannedCount}</p>
                <p className="text-sm text-muted-foreground">Banidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Gerenciar Usuários
              </CardTitle>
              <CardDescription>
                Visualize e gerencie todos os usuários do sistema (atualização em tempo real)
              </CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    const { data, error } = await supabase.rpc('sync_missing_profiles');
                    if (error) throw error;
                    await refetch();
                    toast({ 
                      title: 'Sincronização concluída!', 
                      description: `${data} perfil(is) sincronizado(s).` 
                    });
                  } catch (error) {
                    toast({ title: 'Erro na sincronização', variant: 'destructive' });
                  }
                }}
              >
                <Database className="h-4 w-4 mr-1" />
                Sincronizar
              </Button>
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
                onClick={exportUsers}
                disabled={!filteredUsers.length}
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
                placeholder="Buscar por nome ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={(value: RoleFilter) => setRoleFilter(value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar por cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
                <SelectItem value="moderator">Moderadores</SelectItem>
                <SelectItem value="vip">VIPs</SelectItem>
                <SelectItem value="user">Apenas Usuário</SelectItem>
                <SelectItem value="banned">Banidos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {paginatedUsers.map((user) => (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      user.is_banned 
                        ? 'border-destructive/50 bg-destructive/5' 
                        : 'border-border hover:border-border/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>
                          {user.username?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{user.username || 'Sem nome'}</p>
                          <div className="flex gap-1 flex-wrap">
                            {user.is_banned && (
                              <Badge variant="destructive" className="gap-1">
                                <Ban className="h-3 w-3" />
                                Banido
                              </Badge>
                            )}
                            {user.roles.filter(r => r !== 'user').map(role => (
                              <span key={role}>{getRoleBadge(role)}</span>
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Desde {format(new Date(user.created_at), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openUserDetails(user)}
                        className="h-8 w-8 p-0"
                        title="Ver detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openRoleDialog(user)}
                        className="h-8 w-8 p-0"
                        title="Adicionar cargo"
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                      {user.is_banned ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnbanUser(user.id)}
                          className="h-8 w-8 p-0 text-green-500 hover:text-green-600"
                          title="Desbanir usuário"
                        >
                          <UserCheck className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openBanDialog(user)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          title="Banir usuário"
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {filteredUsers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'Nenhum usuário encontrado.' : 'Nenhum usuário cadastrado.'}
                  </div>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                  <span className="text-sm text-muted-foreground">
                    {((currentPage - 1) * USERS_PER_PAGE) + 1}–{Math.min(currentPage * USERS_PER_PAGE, filteredUsers.length)} de {filteredUsers.length}
                  </span>
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
            </>
          )}
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do Usuário</DialogTitle>
            <DialogDescription>Informações completas do usuário</DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedUser.avatar_url || undefined} />
                  <AvatarFallback className="text-xl">
                    {selectedUser.username?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{selectedUser.username || 'Sem nome'}</h3>
                  <p className="text-sm text-muted-foreground font-mono">{selectedUser.id}</p>
                </div>
              </div>

              {selectedUser.is_banned && selectedUser.ban_info && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="flex items-center gap-2 text-destructive font-medium mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    Usuário Banido
                  </div>
                  <p className="text-sm"><strong>Motivo:</strong> {selectedUser.ban_info.reason}</p>
                  <p className="text-sm">
                    <strong>Tipo:</strong> {selectedUser.ban_info.is_permanent ? 'Permanente' : 'Temporário'}
                  </p>
                  {selectedUser.ban_info.expires_at && (
                    <p className="text-sm">
                      <strong>Expira em:</strong> {format(new Date(selectedUser.ban_info.expires_at), "dd/MM/yyyy 'às' HH:mm")}
                    </p>
                  )}
                  <p className="text-sm">
                    <strong>Banido em:</strong> {format(new Date(selectedUser.ban_info.banned_at), "dd/MM/yyyy 'às' HH:mm")}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Cadastrado em {format(new Date(selectedUser.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                </div>

                {selectedUser.vip_expires_at && (
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-primary" />
                    <span className="text-sm">
                      VIP até {format(new Date(selectedUser.vip_expires_at), "dd/MM/yyyy")}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium">Cargos</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedUser.roles.map(role => (
                    <div key={role} className="flex items-center gap-1">
                      {getRoleBadge(role)}
                      {role !== 'user' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveRole(selectedUser.id, role)}
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adicionar Cargo</DialogTitle>
            <DialogDescription>
              Selecione um cargo para adicionar ao usuário {selectedUser?.username}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Select value={selectedRole} onValueChange={(v: 'admin' | 'moderator' | 'vip') => setSelectedRole(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="moderator">Moderador</SelectItem>
                <SelectItem value="vip">VIP</SelectItem>
              </SelectContent>
            </Select>

            <DialogFooter>
              <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddRole} disabled={addRole.isPending}>
                {addRole.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Adicionar
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ban User Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Ban className="h-5 w-5" />
              Banir Usuário
            </DialogTitle>
            <DialogDescription>
              Banir o usuário {selectedUser?.username}. Esta ação pode ser revertida.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Motivo do banimento *</Label>
              <Textarea
                placeholder="Informe o motivo do banimento..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Duração do banimento</Label>
              <Select value={banDuration} onValueChange={setBanDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 dia</SelectItem>
                  <SelectItem value="3">3 dias</SelectItem>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="14">14 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                  <SelectItem value="90">90 dias</SelectItem>
                  <SelectItem value="permanent">Permanente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setBanDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleBanUser} 
                disabled={banUser.isPending || !banReason.trim()}
              >
                {banUser.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Banir Usuário
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
