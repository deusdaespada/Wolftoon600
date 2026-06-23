import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, Search, Calendar, User, Globe, AlertTriangle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BlockedAccessLog {
  id: string;
  user_id: string | null;
  reason: string;
  detected_extensions: string[];
  user_agent: string | null;
  ip_address: string | null;
  page_url: string | null;
  created_at: string;
  profiles?: {
    username: string | null;
  } | null;
}

const BlockedAccessLogs = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [userSearch, setUserSearch] = useState('');

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['blocked-access-logs', startDate, endDate, userSearch],
    queryFn: async () => {
      let query = supabase
        .from('blocked_access_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (startDate) {
        query = query.gte('created_at', `${startDate}T00:00:00`);
      }
      if (endDate) {
        query = query.lte('created_at', `${endDate}T23:59:59`);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      // Fetch usernames for logs with user_id
      const userIds = [...new Set(data.filter(l => l.user_id).map(l => l.user_id))];
      let usernameMap: Record<string, string> = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);
        
        if (profiles) {
          usernameMap = profiles.reduce((acc, p) => {
            acc[p.id] = p.username || '';
            return acc;
          }, {} as Record<string, string>);
        }
      }

      // Map logs with usernames
      let enrichedData: BlockedAccessLog[] = data.map(log => ({
        ...log,
        profiles: log.user_id ? { username: usernameMap[log.user_id] || null } : null
      }));
      
      // Filter by username if provided
      if (userSearch.trim()) {
        const search = userSearch.toLowerCase();
        enrichedData = enrichedData.filter(log => 
          log.profiles?.username?.toLowerCase().includes(search) ||
          log.user_id?.toLowerCase().includes(search)
        );
      }
      
      return enrichedData;
    },
  });

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setUserSearch('');
  };

  const formatUserAgent = (ua: string | null) => {
    if (!ua) return 'Desconhecido';
    // Truncate long user agents
    return ua.length > 50 ? `${ua.substring(0, 50)}...` : ua;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-destructive" />
            <div>
              <CardTitle>Logs de Acessos Bloqueados</CardTitle>
              <CardDescription>Monitoramento de tentativas de uso de extensões e automação</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Data Inicial
            </Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Data Final
            </Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Usuário
            </Label>
            <Input
              placeholder="Buscar por username ou ID..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={clearFilters} className="w-full">
              Limpar Filtros
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-destructive/10 rounded-lg text-center">
            <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-destructive" />
            <p className="text-2xl font-bold">{logs?.length || 0}</p>
            <p className="text-sm text-muted-foreground">Total de Bloqueios</p>
          </div>
          <div className="p-4 bg-orange-500/10 rounded-lg text-center">
            <User className="h-6 w-6 mx-auto mb-2 text-orange-500" />
            <p className="text-2xl font-bold">
              {logs?.filter(l => l.user_id).length || 0}
            </p>
            <p className="text-sm text-muted-foreground">Usuários Logados</p>
          </div>
          <div className="p-4 bg-yellow-500/10 rounded-lg text-center">
            <Globe className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
            <p className="text-2xl font-bold">
              {logs?.filter(l => !l.user_id).length || 0}
            </p>
            <p className="text-sm text-muted-foreground">Anônimos</p>
          </div>
          <div className="p-4 bg-purple-500/10 rounded-lg text-center">
            <Shield className="h-6 w-6 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold">
              {new Set(logs?.flatMap(l => l.detected_extensions || [])).size || 0}
            </p>
            <p className="text-sm text-muted-foreground">Extensões Detectadas</p>
          </div>
        </div>

        {/* Table */}
        <ScrollArea className="h-[500px] rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Extensões</TableHead>
                <TableHead>User Agent</TableHead>
                <TableHead>Página</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Carregando logs...
                  </TableCell>
                </TableRow>
              ) : logs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum log de bloqueio encontrado
                  </TableCell>
                </TableRow>
              ) : (
                logs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      {log.profiles?.username ? (
                        <div className="flex flex-col">
                          <span className="font-medium">{log.profiles.username}</span>
                          <span className="text-xs text-muted-foreground">
                            {log.user_id?.substring(0, 8)}...
                          </span>
                        </div>
                      ) : (
                        <Badge variant="outline">Anônimo</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-destructive">{log.reason}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {log.detected_extensions?.map((ext, i) => (
                          <Badge key={i} variant="destructive" className="text-xs">
                            {ext}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground" title={log.user_agent || ''}>
                        {formatUserAgent(log.user_agent)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {log.page_url ? new URL(log.page_url).pathname : '-'}
                      </span>
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

export default BlockedAccessLogs;
