import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import PageTransition from '@/components/PageTransition';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCreateTitle, useTitles, useDeleteTitle } from '@/hooks/useTitles';
import { useTitleOptions } from '@/hooks/useTitleOptions';
import { useCreateChapter, useChapters, useDeleteChapter, useUpdateChapterVip } from '@/hooks/useChapters';
import { useToast } from '@/hooks/use-toast';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useAdminStats } from '@/hooks/useAdminStats';
import { Trash2, Plus, Upload, BarChart3, Users, Search, Edit, Layers, Crown, FileText, Flag, BookOpen, TrendingUp, Activity, Loader2 } from 'lucide-react';
import JSZip from 'jszip';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import VipManagement from '@/components/admin/VipManagement';
import CommentReports from '@/components/admin/CommentReports';
import UserManagement from '@/components/admin/UserManagement';
import AdminActionsHistory from '@/components/admin/AdminActionsHistory';

import TagSelector from '@/components/admin/TagSelector';
import { Switch } from '@/components/ui/switch';
import { COMIC_GENRE_OPTIONS, TITLE_STATUS_OPTIONS, type TitleStatus } from '@/lib/titleFormOptions';

const Admin = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: titles } = useTitles();
  const { data: titleOptions } = useTitleOptions();
  const createTitle = useCreateTitle();
  const createChapter = useCreateChapter();
  const deleteTitle = useDeleteTitle();

  const [newTitle, setNewTitle] = useState({
    title: '',
    cover: '',
    type: 'Manhwa' as 'Manhwa' | 'Manhua' | 'Mangá',
    rating: 0,
    status: 'Em andamento' as TitleStatus,
    genres: [] as string[],
    synopsis: '',
    author: '',
    artist: '',
    year: new Date().getFullYear(),
    views: 0,
    slug: null as string | null,
  });

  const [newChapter, setNewChapter] = useState({
    title_id: '',
    chapter_number: 1,
    chapter_title: '',
    images: [] as string[],
  });

  const [imageInput, setImageInput] = useState('');
  const [isProcessingZip, setIsProcessingZip] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'day' | 'month' | 'year'>('day');
  const [manageSearch, setManageSearch] = useState('');
  const [managePage, setManagePage] = useState(1);
  const [chapterTitleSearch, setChapterTitleSearch] = useState('');
  const [selectedTitleForChapters, setSelectedTitleForChapters] = useState<string | null>(null);
  const { data: analyticsData } = useAnalytics(analyticsPeriod);
  const { data: adminStats } = useAdminStats();
  const { data: chaptersForSelected } = useChapters(newChapter.title_id);
  const { data: chaptersForManage } = useChapters(selectedTitleForChapters || '');
  const deleteChapter = useDeleteChapter();
  const updateChapterVip = useUpdateChapterVip();

  const filteredTitles = useMemo(() => {
    if (!titleOptions) return [];
    if (!manageSearch.trim()) return titleOptions;
    const search = manageSearch.toLowerCase();
    return titleOptions.filter((title) =>
      title.title.toLowerCase().includes(search) ||
      title.author.toLowerCase().includes(search) ||
      title.artist?.toLowerCase().includes(search),
    );
  }, [titleOptions, manageSearch]);

  const filteredTitlesForChapter = useMemo(() => {
    if (!titleOptions) return [];
    if (!chapterTitleSearch.trim()) return titleOptions;
    const search = chapterTitleSearch.toLowerCase();
    return titleOptions.filter((title) => title.title.toLowerCase().includes(search));
  }, [titleOptions, chapterTitleSearch]);

  const paginatedFilteredTitles = useMemo(() => {
    const start = (managePage - 1) * 12;
    return filteredTitles.slice(start, start + 12);
  }, [filteredTitles, managePage]);

  const manageTotalPages = Math.max(1, Math.ceil(filteredTitles.length / 12));

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="font-display text-3xl font-bold mb-4">Acesso Negado</h1>
          <p className="text-muted-foreground mb-6">Você precisa ser administrador para acessar esta página.</p>
          <Button onClick={() => navigate('/')}>Voltar ao Início</Button>
        </div>
      </div>
    );
  }

  const handleCreateTitle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTitle.mutateAsync({ ...newTitle, artist: newTitle.artist || null });
      toast({ title: 'Título criado!', description: 'O título foi adicionado com sucesso.' });
      setNewTitle({
        title: '',
        cover: '',
        type: 'Manhwa',
        rating: 0,
        status: 'Em andamento',
        genres: [],
        synopsis: '',
        author: '',
        artist: '',
        year: new Date().getFullYear(),
        views: 0,
        slug: null,
      });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createChapter.mutateAsync(newChapter);
      toast({ title: 'Capítulo criado!', description: 'O capítulo foi adicionado com sucesso.' });
      setNewChapter({ title_id: '', chapter_number: 1, chapter_title: '', images: [] });
      setImageInput('');
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteTitle = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este título?')) {
      try {
        await deleteTitle.mutateAsync(id);
        toast({ title: 'Título excluído!', description: 'O título foi removido com sucesso.' });
      } catch (error: any) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      }
    }
  };

  const addImage = () => {
    if (imageInput && !newChapter.images.includes(imageInput)) {
      setNewChapter({ ...newChapter, images: [...newChapter.images, imageInput] });
      setImageInput('');
    }
  };

  const removeImage = (index: number) => {
    setNewChapter({ ...newChapter, images: newChapter.images.filter((_, i) => i !== index) });
  };

  const extractNumbers = (filename: string): number[] => {
    const matches = filename.match(/\d+/g);
    return matches ? matches.map(n => parseInt(n)) : [0];
  };

  const getContentType = (filename: string): string => {
    const ext = filename.toLowerCase().split('.').pop();
    const types: Record<string, string> = { 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'gif': 'image/gif', 'webp': 'image/webp' };
    return types[ext || ''] || 'image/jpeg';
  };

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingZip(true);
    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);
      const imageUrls: { url: string; order: number }[] = [];
      for (const [filename, zipEntry] of Object.entries(contents.files)) {
        if (!zipEntry.dir && /\.(jpg|jpeg|png|gif|webp)$/i.test(filename)) {
          const blob = await zipEntry.async('blob');
          const fileExt = filename.split('.').pop()?.toLowerCase() || 'jpg';
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
          const contentType = getContentType(filename);
          const { error: uploadError } = await supabase.storage.from('chapters').upload(fileName, blob, { contentType, cacheControl: '3600' });
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from('chapters').getPublicUrl(fileName);
            const numbers = extractNumbers(filename);
            imageUrls.push({ url: publicUrl, order: numbers[numbers.length - 1] || 0 });
          }
        }
      }
      const sortedUrls = imageUrls.sort((a, b) => a.order - b.order).map(i => i.url);
      setNewChapter({ ...newChapter, images: [...newChapter.images, ...sortedUrls] });
      toast({ title: 'ZIP processado!', description: `${sortedUrls.length} imagens enviadas e ordenadas.` });
    } catch (error: any) {
      toast({ title: 'Erro ao processar ZIP', description: error.message, variant: 'destructive' });
    } finally {
      setIsProcessingZip(false);
    }
  };

  const handleDeleteChapter = async (chapterId: string, titleId: string) => {
    if (confirm('Tem certeza que deseja excluir este capítulo?')) {
      try {
        await deleteChapter.mutateAsync({ id: chapterId, titleId });
        toast({ title: 'Capítulo excluído!', description: 'O capítulo foi removido com sucesso.' });
      } catch (error: any) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      }
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCover(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('covers').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(fileName);
      setNewTitle({ ...newTitle, cover: publicUrl });
      toast({ title: 'Imagem enviada!', description: 'A capa foi carregada com sucesso.' });
    } catch (error: any) {
      toast({ title: 'Erro ao enviar imagem', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploadingCover(false);
    }
  };

  const totalVisits = analyticsData?.reduce((sum, item) => sum + item.visits, 0) || 0;

  return (
    <PageTransition>
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-3 md:px-4 py-6 md:py-8 max-w-7xl">
        {/* Admin Header */}
        <div className="flex flex-col gap-6 mb-8">
          <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/40 to-card/60 p-5 md:p-6">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.15),transparent_60%)]" />
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-lg shadow-primary/30">
                  <Crown className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-black tracking-tight">Painel Admin</h1>
                  <p className="text-xs md:text-sm text-muted-foreground mt-0.5">Gerencie títulos, capítulos, usuários e VIP</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" className="rounded-xl gap-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:opacity-90 text-white shadow-lg shadow-emerald-500/30" onClick={() => navigate('/create')}>
                  <Plus className="h-4 w-4" />
                  Criar Obra
                </Button>
                <Button size="sm" variant="outline" className="rounded-xl gap-1.5" onClick={() => navigate('/upload/bulk')}>
                  <Layers className="h-4 w-4" />
                  Upload em Massa
                </Button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Users, label: 'Usuários', value: adminStats?.totalUsers || 0, color: 'from-blue-500/20 to-blue-500/5 text-blue-400 border-blue-500/30' },
              { icon: BookOpen, label: 'Títulos', value: titles?.length || 0, color: 'from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/30' },
              { icon: TrendingUp, label: 'Visitas', value: totalVisits, color: 'from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/30' },
              { icon: Activity, label: 'Status', value: 'Online', color: 'from-primary/20 to-primary/5 text-primary border-primary/30' },
            ].map((stat, i) => (
              <div key={i} className={`bg-gradient-to-br ${stat.color} rounded-xl border p-4 backdrop-blur`}>
                <div className="flex items-center gap-3">
                  <stat.icon className="h-5 w-5 shrink-0" />
                  <div>
                    <div className="text-lg font-black leading-tight tabular-nums">{stat.value}</div>
                    <p className="text-[10px] uppercase tracking-wider font-bold opacity-80">{stat.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Tabs defaultValue="manage" className="w-full">
          <div className="overflow-x-auto -mx-3 px-3 mb-6">
            <TabsList className="inline-flex w-auto gap-1 bg-card/80 border border-border/50 p-1 rounded-xl">
              {[
                { value: 'manage', label: 'Gerenciar', icon: Edit },
                { value: 'users', label: 'Usuários', icon: Users },
                { value: 'vip', label: 'VIP', icon: Crown },
                { value: 'reports', label: 'Denúncias', icon: Flag },
                { value: 'history', label: 'Histórico', icon: BarChart3 },
                { value: 'analytics', label: 'Analytics', icon: TrendingUp },
              ].map(tab => (
                <TabsTrigger key={tab.value} value={tab.value} className="text-xs gap-1.5 rounded-lg px-3 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap">
                  <tab.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Title and chapter creation moved to dedicated /create and per-title upload pages */}

          <TabsContent value="manage">
            <div className="bg-card/80 rounded-2xl border border-border/50 p-5 md:p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-semibold">Gerenciar Títulos</h2>
                  <p className="text-sm text-muted-foreground">{titles?.length || 0} títulos cadastrados</p>
                </div>
              </div>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por nome ou autor..." value={manageSearch} onChange={(e) => setManageSearch(e.target.value)} className="pl-10 rounded-xl" />
              </div>
              <div className="space-y-2">
                {filteredTitles.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">
                    {manageSearch ? 'Nenhum título encontrado.' : 'Nenhum título cadastrado.'}
                  </p>
                ) : (
                  paginatedFilteredTitles.map((title) => (
                    <div key={title.id} className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border/30 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <img src={title.cover} alt={title.title} className="w-10 h-14 object-cover rounded-lg shrink-0" />
                          <div className="min-w-0">
                            <h3 className="font-semibold text-sm truncate">{title.title}</h3>
                            <p className="text-xs text-muted-foreground">{title.author} • {title.type}</p>
                          </div>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setSelectedTitleForChapters(selectedTitleForChapters === title.id ? null : title.id)} title="Gerenciar capítulos VIP">
                            <Crown className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => navigate(`/manga/${title.id}/edit`)} title="Editar obra">
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10" onClick={() => handleDeleteTitle(title.id)} disabled={deleteTitle.isPending} title="Excluir obra">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {selectedTitleForChapters === title.id && chaptersForManage && chaptersForManage.length > 0 && (
                        <div className="ml-4 space-y-3 rounded-xl border border-border/30 bg-card p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                <Crown className="h-3.5 w-3.5 text-primary" />
                                Gerenciar Capítulos VIP
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {chaptersForManage.filter((chapter) => chapter.is_vip).length} VIP • {chaptersForManage.length} capítulos no total
                              </p>
                            </div>
                            {updateChapterVip.isPending ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
                          </div>
                          <div className="max-h-60 space-y-1.5 overflow-y-auto">
                            {chaptersForManage.map((chapter) => (
                              <div key={chapter.id} className="flex items-center justify-between rounded-lg bg-muted/30 p-2.5">
                                <div className="min-w-0 pr-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium">Cap. {chapter.chapter_number}</span>
                                    {chapter.is_vip ? <Badge variant="secondary" className="rounded-full text-[10px]">VIP</Badge> : <Badge variant="outline" className="rounded-full text-[10px]">Livre</Badge>}
                                  </div>
                                  {chapter.chapter_title ? <p className="truncate text-xs text-muted-foreground">{chapter.chapter_title}</p> : null}
                                </div>
                                <Switch checked={chapter.is_vip || false} onCheckedChange={(checked) => updateChapterVip.mutate({ chapterId: chapter.id, isVip: checked })} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedTitleForChapters === title.id && (!chaptersForManage || chaptersForManage.length === 0) && (
                        <div className="ml-4 rounded-xl border border-border/30 bg-card p-4 text-center text-xs text-muted-foreground">
                          Nenhum capítulo cadastrado
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {filteredTitles.length > 12 ? (
                <div className="mt-4 flex items-center justify-between rounded-xl border border-border/30 bg-muted/20 p-3">
                  <span className="text-xs text-muted-foreground">Página {managePage} de {manageTotalPages}</span>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" className="rounded-lg" disabled={managePage === 1} onClick={() => setManagePage((page) => Math.max(1, page - 1))}>Anterior</Button>
                    <Button type="button" variant="outline" size="sm" className="rounded-lg" disabled={managePage === manageTotalPages} onClick={() => setManagePage((page) => Math.min(manageTotalPages, page + 1))}>Próxima</Button>
                  </div>
                </div>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="users"><UserManagement /></TabsContent>
          <TabsContent value="vip"><VipManagement /></TabsContent>
          <TabsContent value="reports"><CommentReports /></TabsContent>
          <TabsContent value="history"><AdminActionsHistory /></TabsContent>

          <TabsContent value="analytics">
            <div className="bg-card/80 rounded-2xl border border-border/50 p-5 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-semibold">Estatísticas</h2>
                  <p className="text-sm text-muted-foreground">Visitantes e engajamento</p>
                </div>
                <div className="flex gap-1.5 bg-muted/50 p-1 rounded-lg">
                  {(['day', 'month', 'year'] as const).map(p => (
                    <Button key={p} variant={analyticsPeriod === p ? 'default' : 'ghost'} size="sm" className="rounded-md text-xs h-8 px-3" onClick={() => setAnalyticsPeriod(p)}>
                      {p === 'day' ? 'Dia' : p === 'month' ? 'Mês' : 'Ano'}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Summary Cards */}
              {analyticsData && analyticsData.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[
                    { label: 'Total', value: totalVisits },
                    { label: 'Média', value: Math.round(totalVisits / analyticsData.length) },
                    { label: 'Pico', value: Math.max(...analyticsData.map(i => i.visits)) },
                  ].map((s, i) => (
                    <div key={i} className="bg-muted/30 rounded-xl p-3 border border-border/30 text-center">
                      <div className="text-xl font-bold text-primary">{s.value}</div>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analyticsData || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '11px' }} />
                    <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '11px' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }} />
                    <Line type="monotone" dataKey="visits" stroke="hsl(var(--primary))" strokeWidth={2} name="Visitas" dot={{ fill: 'hsl(var(--primary))', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </div>
    </PageTransition>
  );
};

export default Admin;
