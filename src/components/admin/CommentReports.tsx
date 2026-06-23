import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCommentReports, useResolveReport } from '@/hooks/useCommentReports';
import { useToast } from '@/hooks/use-toast';
import { Flag, Trash2, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const CommentReports = () => {
  const { toast } = useToast();
  const { data: reports, isLoading } = useCommentReports();
  const resolveReport = useResolveReport();

  const handleResolve = async (reportId: string, status: 'reviewed' | 'dismissed', deleteComment: boolean = false) => {
    try {
      await resolveReport.mutateAsync({ reportId, status, deleteComment });
      toast({
        title: status === 'reviewed' ? 'Denúncia revisada' : 'Denúncia dispensada',
        description: deleteComment ? 'O comentário foi removido.' : 'A denúncia foi processada.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const pendingCount = reports?.length || 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <Flag className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">Denúncias Pendentes</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            Denúncias de Comentários
          </CardTitle>
          <CardDescription>
            Revise as denúncias e tome ação
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : reports && reports.length > 0 ? (
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="p-4 rounded-lg border border-border/50 space-y-3"
                >
                  {/* Comment Content */}
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm font-medium mb-1">
                      Comentário de: {report.comment?.username || 'Usuário desconhecido'}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {report.comment?.content || 'Comentário removido'}
                    </p>
                  </div>

                  {/* Report Details */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-xs">
                          <Flag className="h-3 w-3 mr-1" />
                          Denunciado
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          por {report.reporter?.username || 'Anônimo'}
                        </span>
                      </div>
                      <p className="text-sm">
                        <strong>Motivo:</strong> {report.reason}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(report.created_at), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResolve(report.id, 'dismissed')}
                        disabled={resolveReport.isPending}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Dispensar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResolve(report.id, 'reviewed', false)}
                        disabled={resolveReport.isPending}
                        className="text-primary hover:text-primary hover:bg-primary/10"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Manter
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleResolve(report.id, 'reviewed', true)}
                        disabled={resolveReport.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma denúncia pendente
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CommentReports;
