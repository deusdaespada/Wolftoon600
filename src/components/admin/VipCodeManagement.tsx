import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, Plus, Trash2, Copy, Loader2, RefreshCw, 
  CheckCircle2, XCircle, Key, Download, ChevronLeft, ChevronRight, Clock, User
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const CODES_PER_PAGE = 10;

interface VipCode {
  id: string;
  code: string;
  is_active: boolean;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
  duration_days: number | null;
}

interface UserProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

const VipCodeManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [newCodePrefix, setNewCodePrefix] = useState('VIP');
  const [generatingCount, setGeneratingCount] = useState(1);
  const [selectedDuration, setSelectedDuration] = useState<string>('permanent');

  // Fetch VIP codes with user profiles
  const { data: vipCodes, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['vip-codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vip_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as VipCode[];
    },
  });

  // Fetch user profiles for used codes
  const usedByIds = useMemo(() => {
    if (!vipCodes) return [];
    return vipCodes.filter(c => c.used_by).map(c => c.used_by as string);
  }, [vipCodes]);

  const { data: userProfiles } = useQuery({
    queryKey: ['user-profiles-for-codes', usedByIds],
    queryFn: async () => {
      if (usedByIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', usedByIds);

      if (error) throw error;
      return data as UserProfile[];
    },
    enabled: usedByIds.length > 0,
  });

  const userProfileMap = useMemo(() => {
    const map = new Map<string, UserProfile>();
    userProfiles?.forEach(p => map.set(p.id, p));
    return map;
  }, [userProfiles]);

  const getDurationDays = (duration: string): number | null => {
    switch (duration) {
      case '7days': return 7;
      case '30days': return 30;
      case '3months': return 90;
      case '6months': return 180;
      case '1year': return 365;
      default: return null; // permanent
    }
  };

  const formatDuration = (days: number | null): string => {
    if (days === null) return 'Permanente';
    if (days <= 7) return `${days} dias`;
    if (days <= 30) return `${days} dias`;
    if (days <= 90) return '3 meses';
    if (days <= 180) return '6 meses';
    return '1 ano';
  };

  // Create VIP code mutation
  const createCode = useMutation({
    mutationFn: async ({ code, durationDays }: { code: string; durationDays: number | null }) => {
      const { data, error } = await supabase
        .from('vip_codes')
        .insert({ code, duration_days: durationDays })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vip-codes'] });
    },
  });

  // Delete VIP code mutation
  const deleteCode = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vip_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vip-codes'] });
    },
  });

  // Toggle code active status
  const toggleCodeStatus = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('vip_codes')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vip-codes'] });
    },
  });

  const generateRandomCode = (prefix: string): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = prefix ? `${prefix}-` : '';
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      if (i < 3) code += '-';
    }
    return code;
  };

  const handleGenerateCodes = async () => {
    const count = Math.min(Math.max(1, generatingCount), 50);
    const durationDays = getDurationDays(selectedDuration);
    
    try {
      for (let i = 0; i < count; i++) {
        const code = generateRandomCode(newCodePrefix);
        await createCode.mutateAsync({ code, durationDays });
      }
      
      toast({
        title: 'Códigos gerados!',
        description: `${count} código(s) VIP foram criados.`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: 'Código copiado!',
      description: code,
    });
  };

  const handleDeleteCode = async (id: string) => {
    try {
      await deleteCode.mutateAsync(id);
      toast({
        title: 'Código excluído!',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await toggleCodeStatus.mutateAsync({ id, isActive: !currentStatus });
      toast({
        title: currentStatus ? 'Código desativado' : 'Código ativado',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const exportUnusedCodes = () => {
    const unusedCodes = vipCodes?.filter(c => !c.used_by && c.is_active) || [];
    if (!unusedCodes.length) {
      toast({
        title: 'Nenhum código disponível',
        description: 'Não há códigos não utilizados para exportar.',
        variant: 'destructive',
      });
      return;
    }

    const content = unusedCodes.map(c => `${c.code} (${formatDuration(c.duration_days)})`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vip-codes-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Códigos exportados!',
      description: `${unusedCodes.length} códigos salvos.`,
    });
  };

  const filteredCodes = useMemo(() => {
    if (!vipCodes) return [];
    if (!searchTerm.trim()) return vipCodes;
    
    const search = searchTerm.toLowerCase();
    return vipCodes.filter(code => {
      const user = userProfileMap.get(code.used_by || '');
      return code.code.toLowerCase().includes(search) ||
        user?.username?.toLowerCase().includes(search);
    });
  }, [vipCodes, searchTerm, userProfileMap]);

  const totalPages = Math.ceil(filteredCodes.length / CODES_PER_PAGE);
  const paginatedCodes = useMemo(() => {
    const start = (currentPage - 1) * CODES_PER_PAGE;
    return filteredCodes.slice(start, start + CODES_PER_PAGE);
  }, [filteredCodes, currentPage]);

  // Reset page when search changes
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalCodes = vipCodes?.length || 0;
  const usedCodes = vipCodes?.filter(c => c.used_by).length || 0;
  const activeCodes = vipCodes?.filter(c => c.is_active && !c.used_by).length || 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Key className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalCodes}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCodes}</p>
                <p className="text-sm text-muted-foreground">Disponíveis</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <XCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{usedCodes}</p>
                <p className="text-sm text-muted-foreground">Usados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Generate Codes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Gerar Códigos VIP
          </CardTitle>
          <CardDescription>
            Crie novos códigos VIP para distribuir aos usuários
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Prefixo</Label>
              <Input
                value={newCodePrefix}
                onChange={(e) => setNewCodePrefix(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="VIP"
                className="w-32"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Duração do VIP</Label>
              <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                <SelectTrigger className="w-40">
                  <SelectValue />
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
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Quantidade</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={generatingCount}
                onChange={(e) => setGeneratingCount(parseInt(e.target.value) || 1)}
                className="w-24"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleGenerateCodes}
                disabled={createCode.isPending}
              >
                {createCode.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Gerar Códigos
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Formato: {newCodePrefix ? `${newCodePrefix}-` : ''}XXXX-XXXX-XXXX-XXXX | Duração: {formatDuration(getDurationDays(selectedDuration))}
          </p>
        </CardContent>
      </Card>

      {/* Codes List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Códigos VIP</CardTitle>
              <CardDescription>
                Gerencie todos os códigos VIP criados
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
                onClick={exportUnusedCodes}
              >
                <Download className="h-4 w-4 mr-1" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar código ou usuário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {paginatedCodes.map((code) => {
                  const usedByUser = code.used_by ? userProfileMap.get(code.used_by) : null;
                  
                  return (
                    <div
                      key={code.id}
                      className={`
                        flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border gap-2
                        ${code.used_by ? 'border-muted bg-muted/30' : 'border-border'}
                        ${!code.is_active && !code.used_by ? 'opacity-50' : ''}
                      `}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                        <code className="font-mono text-sm bg-background px-2 py-1 rounded">
                          {code.code}
                        </code>
                        <div className="flex items-center gap-2 flex-wrap">
                          {code.used_by ? (
                            <Badge variant="secondary" className="text-xs">
                              Usado
                            </Badge>
                          ) : code.is_active ? (
                            <Badge className="bg-green-500/20 text-green-500 border-green-500/30 text-xs">
                              Ativo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              Desativado
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(code.duration_days)}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 justify-between sm:justify-end">
                        {/* Show user who used the code */}
                        {usedByUser && (
                          <div className="flex items-center gap-2 mr-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={usedByUser.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {usedByUser.username?.charAt(0).toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground">
                              {usedByUser.username || 'Usuário'}
                            </span>
                            {code.used_at && (
                              <span className="text-xs text-muted-foreground hidden md:inline">
                                em {format(new Date(code.used_at), "dd/MM/yy", { locale: ptBR })}
                              </span>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground hidden sm:inline">
                            {format(new Date(code.created_at), "dd/MM/yy", { locale: ptBR })}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyCode(code.code)}
                            className="h-8 w-8 p-0"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          {!code.used_by && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleStatus(code.id, code.is_active)}
                                className="h-8 w-8 p-0"
                              >
                                {code.is_active ? (
                                  <XCircle className="h-4 w-4 text-orange-500" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteCode(code.id)}
                                disabled={deleteCode.isPending}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredCodes.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'Nenhum código encontrado.' : 'Nenhum código VIP criado ainda.'}
                  </div>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <span className="text-sm text-muted-foreground">
                    {filteredCodes.length} código(s)
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

export default VipCodeManagement;
