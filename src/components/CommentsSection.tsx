import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Flag,
  Heart,
  MessageCircle,
  Reply,
  Send,
  Trash2,
  User,
  Eye,
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useComments, SortOrder } from '@/hooks/useComments';
import { useReportComment } from '@/hooks/useCommentReports';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CommentsSectionProps {
  titleId?: string;
  chapterId?: string;
}

const MAX_COMMENT_LENGTH = 1000;

const CommentsSection = ({ titleId, chapterId }: CommentsSectionProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { comments, isLoading, addComment, deleteComment, toggleLike, isAddingComment } = useComments(titleId, chapterId);
  const reportComment = useReportComment();

  const [newComment, setNewComment] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [revealedSpoilers, setRevealedSpoilers] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replySpoiler, setReplySpoiler] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');

  const remainingChars = MAX_COMMENT_LENGTH - newComment.length;
  const isOverLimit = remainingChars < 0;
  const replyRemainingChars = MAX_COMMENT_LENGTH - replyContent.length;
  const isReplyOverLimit = replyRemainingChars < 0;

  const sortedComments = useMemo(() => {
    const sorted = [...comments];
    sorted.sort((a, b) =>
      sortOrder === 'oldest'
        ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    return sorted;
  }, [comments, sortOrder]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newComment.trim() || isOverLimit) return;
    addComment({ content: newComment, titleId, chapterId, isSpoiler });
    setNewComment('');
    setIsSpoiler(false);
  };

  const handleReplySubmit = (parentId: string) => {
    if (!replyContent.trim() || isReplyOverLimit) return;
    addComment({ content: replyContent, titleId, chapterId, isSpoiler: replySpoiler, parentId });
    setReplyContent('');
    setReplySpoiler(false);
    setReplyingTo(null);
    setExpandedReplies((prev) => new Set([...prev, parentId]));
  };

  const toggleSpoilerReveal = (commentId: string) => {
    setRevealedSpoilers((prev) => {
      const next = new Set(prev);
      next.has(commentId) ? next.delete(commentId) : next.add(commentId);
      return next;
    });
  };

  const toggleRepliesExpand = (commentId: string) => {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      next.has(commentId) ? next.delete(commentId) : next.add(commentId);
      return next;
    });
  };

  const openReportDialog = (commentId: string) => {
    setReportingCommentId(commentId);
    setReportReason('');
    setReportDialogOpen(true);
  };

  const handleReport = async () => {
    if (!reportingCommentId || !reportReason.trim()) return;
    try {
      await reportComment.mutateAsync({ commentId: reportingCommentId, reason: reportReason });
      toast({ title: 'Denúncia enviada', description: 'Obrigado por reportar. Nossa equipe irá analisar.' });
      setReportDialogOpen(false);
      setReportingCommentId(null);
      setReportReason('');
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const renderComment = (comment: (typeof comments)[number], isReply = false) => {
    const isSpoilerHidden = comment.is_spoiler && !revealedSpoilers.has(comment.id);

    return (
      <div key={comment.id} className={isReply ? 'ml-6 border-l border-border/50 pl-4' : ''}>
        <div className="rounded-2xl border border-border/50 bg-card/70 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <Avatar className="h-9 w-9 border border-border/50">
              <AvatarImage src={comment.avatar_url || undefined} />
              <AvatarFallback className="bg-muted text-muted-foreground">
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{comment.username || 'Usuário'}</span>
                {comment.is_spoiler ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    <AlertTriangle className="h-3 w-3" /> Spoiler
                  </span>
                ) : null}
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR })}
                </span>
              </div>

              <div className="mt-2">
                {isSpoilerHidden ? (
                  <button
                    type="button"
                    onClick={() => toggleSpoilerReveal(comment.id)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/50 bg-muted/40 px-3 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                  >
                    <Eye className="h-4 w-4" /> Clique para revelar spoiler
                  </button>
                ) : (
                  <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground/90">{comment.content}</p>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 gap-1.5 px-2 text-xs ${comment.user_liked ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
                  onClick={() => user && toggleLike({ commentId: comment.id, isLiked: comment.user_liked || false })}
                  disabled={!user}
                >
                  <Heart className={`h-3.5 w-3.5 ${comment.user_liked ? 'fill-current' : ''}`} />
                  {(comment.likes_count || 0) > 0 ? comment.likes_count : 'Curtir'}
                </Button>

                {!isReply && user ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                  >
                    <Reply className="h-3.5 w-3.5" /> Responder
                  </Button>
                ) : null}

                {comment.is_spoiler && revealedSpoilers.has(comment.id) ? (
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => toggleSpoilerReveal(comment.id)}>
                    Ocultar
                  </Button>
                ) : null}

                {user && user.id !== comment.user_id ? (
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-primary" onClick={() => openReportDialog(comment.id)}>
                    <Flag className="h-3.5 w-3.5" /> Denunciar
                  </Button>
                ) : null}

                {user?.id === comment.user_id ? (
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs text-destructive hover:bg-destructive/10" onClick={() => deleteComment(comment.id)}>
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {replyingTo === comment.id ? (
          <div className="ml-6 mt-3 space-y-3">
            <div className="relative">
              <Textarea
                placeholder="Escreva sua resposta..."
                value={replyContent}
                onChange={(event) => setReplyContent(event.target.value)}
                className={`min-h-[84px] resize-none rounded-2xl border-border/50 bg-card ${isReplyOverLimit ? 'border-destructive' : ''}`}
              />
              <span className={`absolute bottom-3 right-3 text-[11px] ${isReplyOverLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
                {replyContent.length}/{MAX_COMMENT_LENGTH}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <Checkbox checked={replySpoiler} onCheckedChange={(checked) => setReplySpoiler(checked === true)} />
                <AlertTriangle className="h-3.5 w-3.5 text-primary" />
                <span>Spoiler</span>
              </label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setReplyingTo(null); setReplyContent(''); setReplySpoiler(false); }}>Cancelar</Button>
                <Button size="sm" disabled={!replyContent.trim() || isReplyOverLimit} onClick={() => handleReplySubmit(comment.id)}>
                  Responder
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {!isReply && comment.replies && comment.replies.length > 0 ? (
          <div className="mt-2">
            <Button variant="ghost" size="sm" className="ml-6 h-8 gap-1 text-xs text-muted-foreground hover:text-foreground" onClick={() => toggleRepliesExpand(comment.id)}>
              {expandedReplies.has(comment.id) ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {expandedReplies.has(comment.id) ? 'Ocultar' : 'Ver'} {comment.replies.length} {comment.replies.length === 1 ? 'resposta' : 'respostas'}
            </Button>
            {expandedReplies.has(comment.id) ? (
              <div className="mt-2 space-y-2">{comment.replies.map((reply) => renderComment(reply as (typeof comments)[number], true))}</div>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };

  const totalCount = useMemo(
    () => comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0),
    [comments],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/30 blur-md rounded-xl" />
            <div className="relative rounded-xl bg-gradient-to-br from-primary to-primary-glow p-2.5 text-primary-foreground shadow-lg shadow-primary/20">
              <MessageCircle className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="font-black text-base flex items-center gap-2">
              Comentários
              <span className="text-[10px] font-bold tabular-nums px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                {totalCount}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground tracking-wider uppercase font-semibold">Discussão da alcateia</div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="rounded-xl">
              {sortOrder === 'newest' ? 'Mais recentes' : 'Mais antigos'}
              <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setSortOrder('newest')}>Mais recentes</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortOrder('oldest')}>Mais antigos</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {user ? (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-border/50 bg-card/60 p-4">
          <div className="relative">
            <Textarea
              placeholder="Adicione um comentário..."
              value={newComment}
              onChange={(event) => setNewComment(event.target.value)}
              className={`min-h-[96px] resize-none rounded-2xl border-border/50 bg-background/60 ${isOverLimit ? 'border-destructive' : ''}`}
            />
            <span className={`absolute bottom-3 right-3 text-[11px] ${isOverLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
              {newComment.length}/{MAX_COMMENT_LENGTH}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <Checkbox checked={isSpoiler} onCheckedChange={(checked) => setIsSpoiler(checked === true)} />
              <AlertTriangle className="h-4 w-4 text-primary" />
              <span>Marcar como spoiler</span>
            </label>

            <Button type="submit" disabled={!newComment.trim() || isAddingComment || isOverLimit} className="gap-2 rounded-xl">
              <Send className="h-4 w-4" /> Comentar
            </Button>
          </div>
        </form>
      ) : (
        <div className="rounded-2xl border border-border/50 bg-card/60 p-5 text-center">
          <p className="mb-3 text-sm text-muted-foreground">Faça login para comentar e participar da discussão.</p>
          <Button asChild variant="outline" className="rounded-xl">
            <Link to="/auth">Entrar</Link>
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Carregando comentários...</p>
      ) : sortedComments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/50 bg-muted/20 p-8 text-center">
          <MessageCircle className="mx-auto mb-3 h-8 w-8 text-primary/60" />
          <p className="text-sm text-muted-foreground">Nenhum comentário ainda. Seja o primeiro a comentar!</p>
        </div>
      ) : (
        <div className="space-y-3">{sortedComments.map((comment) => renderComment(comment))}</div>
      )}

      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Denunciar comentário</DialogTitle>
            <DialogDescription>Explique brevemente o motivo da denúncia.</DialogDescription>
          </DialogHeader>
          <Textarea value={reportReason} onChange={(event) => setReportReason(event.target.value)} placeholder="Descreva o problema..." className="min-h-[120px]" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleReport} disabled={!reportReason.trim() || reportComment.isPending}>Enviar denúncia</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CommentsSection;
