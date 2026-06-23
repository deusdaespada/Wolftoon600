import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Ban, RefreshCw, Trash2, Clock, AlertTriangle } from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface BlockedIp {
  id: string;
  ip_address: string;
  blocked_at: string;
  expires_at: string;
  reason: string;
  strike_count: number;
  created_at: string;
}

const BlockedIpsManagement = () => {
  const queryClient = useQueryClient();

  const { data: blockedIps, isLoading, refetch } = useQuery({
    queryKey: ['blocked-ips'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blocked_ips')
        .select('*')
        .order('blocked_at', { ascending: false });

      if (error) throw error;
      return data as BlockedIp[];
    },
  });

  const unblockIpMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('blocked_ips')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-ips'] });
      toast.success('IP desbloqueado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao desbloquear IP: ' + error.message);
    },
  });

  const activeBlocks = blockedIps?.filter(ip => !isPast(new Date(ip.expires_at))) || [];
  const expiredBlocks = blockedIps?.filter(ip => isPast(new Date(ip.expires_at))) || [];

  const handleUnblock = (id: string) => {
    if (confirm('Tem certeza que deseja desbloquear este IP?')) {
      unblockIpMutation.mutate(id);
    }
  };

  const clearExpired = async () => {
    if (!confirm('Remover todos os bloqueios expirados?')) return;

    const expiredIds = expiredBlocks.map(ip => ip.id);
    if (expiredIds.length === 0) {
      toast.info('Não há bloqueios expirados');
      return;
    }

    try {
      const { error } = await supabase
        .from('blocked_ips')
        .delete()
        .in('id', expiredIds);

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['blocked-ips'] });
      toast.success(`${expiredIds.length} bloqueios expirados removidos`);
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-destructive" />
            <div>
              <CardTitle>IPs Bloqueados</CardTitle>
              <CardDescription>IPs bloqueados automaticamente por extensões</CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            {expiredBlocks.length > 0 && (
              <Button variant="destructive" size="sm" onClick={clearExpired}>
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar Expirados ({expiredBlocks.length})
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-4 bg-destructive/10 rounded-lg text-center">
            <Ban className="h-6 w-6 mx-auto mb-2 text-destructive" />
            <p className="text-2xl font-bold">{activeBlocks.length}</p>
            <p className="text-sm text-muted-foreground">Ativos</p>
          </div>
          <div className="p-4 bg-muted rounded-lg text-center">
            <Clock className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold">{expiredBlocks.length}</p>
            <p className="text-sm text-muted-foreground">Expirados</p>
          </div>
          <div className="p-4 bg-orange-500/10 rounded-lg text-center">
            <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-orange-500" />
            <p className="text-2xl font-bold">{blockedIps?.length || 0}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </div>
        </div>

        {/* Table */}
        <ScrollArea className="h-[400px] rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>IP</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Strikes</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Bloqueado em</TableHead>
                <TableHead>Expira</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : blockedIps?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum IP bloqueado
                  </TableCell>
                </TableRow>
              ) : (
                blockedIps?.map((ip) => {
                  const isExpired = isPast(new Date(ip.expires_at));
                  
                  return (
                    <TableRow key={ip.id} className={isExpired ? 'opacity-50' : ''}>
                      <TableCell className="font-mono text-sm">
                        {ip.ip_address}
                      </TableCell>
                      <TableCell>
                        {isExpired ? (
                          <Badge variant="outline">Expirado</Badge>
                        ) : (
                          <Badge variant="destructive">Ativo</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{ip.strike_count} strikes</Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={ip.reason}>
                        {ip.reason}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(ip.blocked_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {isExpired ? (
                          <span className="text-muted-foreground">Expirado</span>
                        ) : (
                          <span className="text-destructive">
                            {formatDistanceToNow(new Date(ip.expires_at), { locale: ptBR, addSuffix: true })}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnblock(ip.id)}
                          disabled={unblockIpMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default BlockedIpsManagement;