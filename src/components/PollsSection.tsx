import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePolls, Poll } from '@/hooks/usePolls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { BarChart3, Plus, Trash2, User, X, Vote, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface PollsSectionProps {
  titleId?: string;
  chapterId?: string;
}

const PollsSection = ({ titleId, chapterId }: PollsSectionProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { polls, isLoading, createPoll, vote, deletePoll, isCreating, isVoting } = usePolls(titleId, chapterId);
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleCreatePoll = async () => {
    const validOptions = options.filter(o => o.trim());
    if (!question.trim() || validOptions.length < 2) {
      toast({
        title: 'Erro',
        description: 'Adicione uma pergunta e pelo menos 2 opções',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createPoll.mutateAsync({
        question: question.trim(),
        options: validOptions,
        titleId,
        chapterId,
      });
      toast({
        title: 'Enquete criada!',
        description: 'Sua enquete foi publicada.',
      });
      setCreateDialogOpen(false);
      setQuestion('');
      setOptions(['', '']);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleVote = async (pollId: string, optionIndex: number) => {
    try {
      await vote.mutateAsync({ pollId, optionIndex });
    } catch (error: any) {
      toast({
        title: 'Erro ao votar',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    try {
      await deletePoll.mutateAsync(pollId);
      toast({
        title: 'Enquete excluída',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const renderPoll = (poll: Poll) => {
    const hasVoted = poll.user_vote !== null && poll.user_vote !== undefined;
    const isExpired = poll.ends_at && new Date(poll.ends_at) < new Date();
    const showResults = hasVoted || isExpired;

    return (
      <div key={poll.id} className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
        {/* Poll Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={poll.avatar_url || undefined} />
              <AvatarFallback className="bg-zinc-600">
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-white text-sm">
                  {poll.username || 'Usuário'}
                </span>
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                  Enquete
                </span>
              </div>
              <span className="text-xs text-zinc-500">
                {formatDistanceToNow(new Date(poll.created_at), { 
                  addSuffix: true, 
                  locale: ptBR 
                })}
              </span>
            </div>
          </div>
          
          {user?.id === poll.user_id && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/20"
              onClick={() => handleDeletePoll(poll.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Question */}
        <h4 className="text-white font-medium mb-3">{poll.question}</h4>

        {/* Options */}
        <div className="space-y-2">
          {poll.options.map((option, index) => {
            const voteData = poll.votes.find(v => v.option_index === index);
            const voteCount = voteData?.count || 0;
            const percentage = poll.total_votes > 0 ? (voteCount / poll.total_votes) * 100 : 0;
            const isUserVote = poll.user_vote === index;

            if (showResults) {
              return (
                <div
                  key={index}
                  className={`relative rounded-lg overflow-hidden ${isUserVote ? 'ring-2 ring-primary' : ''}`}
                >
                  <div className="absolute inset-0 bg-primary/20" style={{ width: `${percentage}%` }} />
                  <div className="relative flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2">
                      {isUserVote && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      <span className="text-sm text-white">{option}</span>
                    </div>
                    <span className="text-xs text-zinc-400 font-medium">
                      {percentage.toFixed(0)}% ({voteCount})
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <Button
                key={index}
                variant="outline"
                className="w-full justify-start text-left border-zinc-600 hover:border-primary hover:bg-primary/10 text-white"
                onClick={() => user && handleVote(poll.id, index)}
                disabled={!user || isVoting}
              >
                {option}
              </Button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-700">
          <span className="text-xs text-zinc-500">
            {poll.total_votes} {poll.total_votes === 1 ? 'voto' : 'votos'}
          </span>
          {isExpired && (
            <span className="text-xs text-zinc-500">Encerrada</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <BarChart3 className="h-5 w-5" />
          <span className="font-semibold">Enquetes</span>
        </div>

        {user && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1 bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4" />
                Criar Enquete
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-800 border-zinc-700 text-white">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Vote className="h-5 w-5 text-primary" />
                  Criar Enquete
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Pergunta</label>
                  <Input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Qual sua pergunta?"
                    className="bg-zinc-700 border-zinc-600 text-white"
                    maxLength={200}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Opções</label>
                  {options.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        placeholder={`Opção ${index + 1}`}
                        className="bg-zinc-700 border-zinc-600 text-white flex-1"
                        maxLength={100}
                      />
                      {options.length > 2 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-zinc-400 hover:text-red-400"
                          onClick={() => removeOption(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {options.length < 6 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-dashed border-zinc-600 text-zinc-400 hover:text-white w-full"
                      onClick={addOption}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar opção
                    </Button>
                  )}
                </div>

                <Button
                  onClick={handleCreatePoll}
                  disabled={isCreating || !question.trim() || options.filter(o => o.trim()).length < 2}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {isCreating ? 'Criando...' : 'Criar Enquete'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Login prompt */}
      {!user && (
        <div className="bg-zinc-700/50 border border-zinc-600 rounded-lg p-4 text-center">
          <p className="text-zinc-400 mb-2">Faça login para criar enquetes e votar</p>
          <Button asChild variant="outline" className="border-zinc-500 text-white hover:bg-zinc-600">
            <Link to="/auth">Entrar</Link>
          </Button>
        </div>
      )}

      {/* Polls List */}
      {isLoading ? (
        <p className="text-zinc-400 text-center py-4">Carregando enquetes...</p>
      ) : polls.length === 0 ? (
        <p className="text-primary/80 text-center py-6 italic">
          Nenhuma enquete ainda. Seja o primeiro a criar uma!
        </p>
      ) : (
        <div className="space-y-3">
          {polls.map(poll => renderPoll(poll))}
        </div>
      )}
    </div>
  );
};

export default PollsSection;
