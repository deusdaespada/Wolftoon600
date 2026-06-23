import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, Plus, Trash2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface WhitelistedIp {
  id: string;
  ip_address: string;
  description: string | null;
  added_by: string | null;
  created_at: string;
}

const WhitelistManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newIp, setNewIp] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const { data: whitelistedIps, isLoading, refetch } = useQuery({
    queryKey: ['whitelisted-ips'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whitelisted_ips')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WhitelistedIp[];
    },
  });

  const addIpMutation = useMutation({
    mutationFn: async ({ ip, description }: { ip: string; description: string }) => {
      const { error } = await supabase
        .from('whitelisted_ips')
        .insert({
          ip_address: ip.trim(),
          description: description.trim() || null,
          added_by: user?.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whitelisted-ips'] });
      toast.success('IP adicionado à whitelist');
      setNewIp('');
      setNewDescription('');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Este IP já está na whitelist');
      } else {
        toast.error('Erro ao adicionar IP: ' + error.message);
      }
    },
  });

  const removeIpMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('whitelisted_ips')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whitelisted-ips'] });
      toast.success('IP removido da whitelist');
    },
    onError: (error) => {
      toast.error('Erro ao remover IP: ' + error.message);
    },
  });

  const handleAddIp = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate IP format (basic validation)
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipPattern.test(newIp.trim())) {
      toast.error('Formato de IP inválido');
      return;
    }

    addIpMutation.mutate({ ip: newIp, description: newDescription });
  };

  const handleRemoveIp = (id: string) => {
    if (confirm('Tem certeza que deseja remover este IP da whitelist?')) {
      removeIpMutation.mutate(id);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-500" />
            <div>
              <CardTitle>Whitelist de IPs</CardTitle>
              <CardDescription>IPs que nunca serão bloqueados pelo sistema</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add IP Form */}
        <form onSubmit={handleAddIp} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 space-y-2">
            <Label htmlFor="ip">Endereço IP</Label>
            <Input
              id="ip"
              placeholder="192.168.1.1"
              value={newIp}
              onChange={(e) => setNewIp(e.target.value)}
              required
            />
          </div>
          <div className="flex-1 space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Input
              id="description"
              placeholder="Ex: Servidor de testes"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={addIpMutation.isPending}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </form>

        {/* Stats */}
        <div className="p-4 bg-green-500/10 rounded-lg text-center">
          <Shield className="h-6 w-6 mx-auto mb-2 text-green-500" />
          <p className="text-2xl font-bold">{whitelistedIps?.length || 0}</p>
          <p className="text-sm text-muted-foreground">IPs na Whitelist</p>
        </div>

        {/* Table */}
        <ScrollArea className="h-[300px] rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>IP</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Adicionado em</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : whitelistedIps?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhum IP na whitelist
                  </TableCell>
                </TableRow>
              ) : (
                whitelistedIps?.map((ip) => (
                  <TableRow key={ip.id}>
                    <TableCell className="font-mono text-sm">
                      <Badge variant="outline" className="bg-green-500/10">
                        {ip.ip_address}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {ip.description || '-'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(ip.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveIp(ip.id)}
                        disabled={removeIpMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default WhitelistManagement;
