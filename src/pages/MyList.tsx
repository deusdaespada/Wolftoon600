import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import MangaCard from "@/components/MangaCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTitles } from "@/hooks/useTitles";
import { 
  BookOpen, Search, Trash2, CheckCircle, Pause, BookMarked, ListFilter
} from "lucide-react";

type ReadingStatus = 'reading' | 'completed' | 'planning' | 'dropped' | 'on_hold';

const STATUS_CONFIG: Record<ReadingStatus, { label: string; icon: React.ReactNode; color: string }> = {
  reading: { label: 'Lendo', icon: <BookOpen className="h-4 w-4" />, color: 'text-blue-500' },
  completed: { label: 'Completo', icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-500' },
  planning: { label: 'Planejando', icon: <BookMarked className="h-4 w-4" />, color: 'text-yellow-500' },
  dropped: { label: 'Dropado', icon: <Trash2 className="h-4 w-4" />, color: 'text-red-500' },
  on_hold: { label: 'Em Pausa', icon: <Pause className="h-4 w-4" />, color: 'text-gray-500' },
};

const MyList = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<ReadingStatus | 'all'>('all');

  const { data: titles } = useTitles();

  const { data: userReadingStatus, isLoading } = useQuery({
    queryKey: ['user-reading-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from('user_reading_status').select('*').eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ titleId, status }: { titleId: string; status: ReadingStatus }) => {
      const existing = userReadingStatus?.find(s => s.title_id === titleId);
      if (existing) {
        const { error } = await supabase.from('user_reading_status').update({ status, updated_at: new Date().toISOString() }).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('user_reading_status').insert({ user_id: user?.id, title_id: titleId, status });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-reading-status'] }),
  });

  const removeFromList = useMutation({
    mutationFn: async (titleId: string) => {
      const { error } = await supabase.from('user_reading_status').delete().eq('user_id', user?.id).eq('title_id', titleId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-reading-status'] }),
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <BookMarked className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-3xl font-bold mb-4">Minha Lista</h1>
          <p className="text-muted-foreground mb-6">Faça login para acessar sua lista.</p>
          <Button asChild><Link to="/auth">Fazer Login</Link></Button>
        </div>
      </div>
    );
  }

  const userTitlesWithStatus = userReadingStatus?.map(status => {
    const title = titles?.find(t => t.id === status.title_id);
    return { ...status, title };
  }).filter(item => item.title) || [];

  const filteredTitles = userTitlesWithStatus.filter(item => {
    const matchesSearch = item.title?.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: userTitlesWithStatus.length,
    reading: userTitlesWithStatus.filter(t => t.status === 'reading').length,
    completed: userTitlesWithStatus.filter(t => t.status === 'completed').length,
    planning: userTitlesWithStatus.filter(t => t.status === 'planning').length,
    on_hold: userTitlesWithStatus.filter(t => t.status === 'on_hold').length,
    dropped: userTitlesWithStatus.filter(t => t.status === 'dropped').length,
  };

  const statusTabs: { key: ReadingStatus | 'all'; label: string }[] = [
    { key: 'all', label: `Todos (${statusCounts.all})` },
    { key: 'reading', label: `Lendo (${statusCounts.reading})` },
    { key: 'planning', label: `Planejando (${statusCounts.planning})` },
    { key: 'completed', label: `Completo (${statusCounts.completed})` },
    { key: 'on_hold', label: `Pausado (${statusCounts.on_hold})` },
    { key: 'dropped', label: `Dropado (${statusCounts.dropped})` },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-3 mb-1">
            <BookMarked className="h-8 w-8 text-primary" />
            Minha Lista
          </h1>
          <p className="text-muted-foreground text-sm">{userTitlesWithStatus.length} títulos na sua lista</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar na lista..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 rounded-xl bg-card/50 border-border/30" />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {statusTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setSelectedStatus(tab.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedStatus === tab.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card/50 text-muted-foreground hover:text-foreground border border-border/30'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
            ))}
          </div>
        ) : filteredTitles.length === 0 ? (
          <div className="text-center py-16">
            <ListFilter className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum título encontrado</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {searchQuery ? "Nenhum resultado para sua busca." : "Adicione títulos pelo catálogo."}
            </p>
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/catalog">Explorar Catálogo</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredTitles.map((item) => (
              <div key={item.id} className="relative group">
                <MangaCard
                  id={item.title_id}
                  title={item.title?.title || ''}
                  cover={item.title?.cover || ''}
                  type={item.title?.type || ''}
                  rating={item.title?.rating || 0}
                  status={(item.title?.status as "Completo" | "Em andamento") || "Em andamento"}
                  genres={item.title?.genres || []}
                  views={item.title?.views || 0}
                  slug={item.title?.slug}
                />
                {/* Status badge overlay */}
                <div className="absolute top-2 left-2 z-10">
                  <Badge className={`${STATUS_CONFIG[item.status as ReadingStatus]?.color} bg-black/80 border-0 text-[10px] backdrop-blur-sm`}>
                    {STATUS_CONFIG[item.status as ReadingStatus]?.label}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyList;
