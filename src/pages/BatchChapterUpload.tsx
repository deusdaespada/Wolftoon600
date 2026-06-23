import { useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useTitleOptions } from '@/hooks/useTitleOptions';
import { useCreateChapter } from '@/hooks/useChapters';
import { useToast } from '@/hooks/use-toast';
import {
  Upload, ArrowLeft, Layers, Trash2, Plus, Image as ImageIcon,
  FolderOpen, CheckCircle2, XCircle, X, Loader2, Info, Eye, EyeOff,
  Search, RefreshCw, ChevronDown, ChevronUp, Crown, AlertTriangle,
} from 'lucide-react';
import { uploadImagesToChapterBucket, extractSortableNumber } from '@/lib/chapterUpload';
import { supabase } from '@/integrations/supabase/client';
import JSZip from 'jszip';
import { toLocalDatetimeInput, localDatetimeToIso, parseLocalDatetimeInput } from '@/lib/datetime';

// ─── Types ────────────────────────────────────────────────────────────────────

type UploadStatus = 'pending' | 'uploading' | 'success' | 'error';

interface ChapterData {
  id: string;
  chapter_number: number;
  chapter_title: string;
  images: string[];
  content: string;
  content_type: 'images' | 'novel';
  is_vip: boolean;
  vip_unlock_at: string;
  isUploading: boolean;
  uploadProgress: number;
  uploadStatus: UploadStatus;
  sourceFiles?: File[];   // kept for retry
  expanded: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const extractNumbers = (str: string): number => extractSortableNumber(str);

const isImageFile = (name: string) => /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(name);

// ─── Component ────────────────────────────────────────────────────────────────

const BatchChapterUpload = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { titleId: urlTitleId } = useParams();
  const { toast } = useToast();
  const { data: titles } = useTitleOptions();
  const createChapter = useCreateChapter();

  const preselectedTitleId = urlTitleId || searchParams.get('titleId') || '';
  const hasTitleFromUrl = !!urlTitleId;

  const [titleId, setTitleId] = useState(preselectedTitleId);
  const [contentType] = useState<'images' | 'novel'>('images');
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showAllPreviews, setShowAllPreviews] = useState(false);
  const [batchTitleSearch, setBatchTitleSearch] = useState('');
  const [isProcessingZip, setIsProcessingZip] = useState(false);

  const mainFolderInputRef = useRef<HTMLInputElement | null>(null);
  const zipInputRef = useRef<HTMLInputElement | null>(null);

  // ── Auth guards ─────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 flex items-center justify-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="inline-flex p-4 rounded-2xl bg-destructive/10 mb-6">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="font-display text-2xl font-bold mb-3">Acesso Negado</h1>
          <p className="text-muted-foreground mb-6">Você precisa ser administrador para acessar esta página.</p>
          <Button onClick={() => navigate('/')}>Voltar ao Início</Button>
        </div>
      </div>
    );
  }

  // ── Chapter state helpers ────────────────────────────────────────────────────

  const removeChapter = (id: string) =>
    setChapters(prev => prev.filter(c => c.id !== id));

  const updateChapter = (id: string, updates: Partial<ChapterData>) =>
    setChapters(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));

  const removeImage = (chapterId: string, imageIndex: number) =>
    setChapters(prev => prev.map(c =>
      c.id === chapterId ? { ...c, images: c.images.filter((_, i) => i !== imageIndex) } : c
    ));

  // ── Upload images for one chapter ───────────────────────────────────────────

  const uploadImagesForChapter = async (chapterId: string, files: File[]) => {
    const sorted = [...files].sort((a, b) => extractNumbers(a.name) - extractNumbers(b.name));

    setChapters(prev => prev.map(c =>
      c.id === chapterId
        ? { ...c, isUploading: true, uploadStatus: 'uploading', uploadProgress: 0, sourceFiles: sorted }
        : c
    ));

    try {
      const uploaded = await uploadImagesToChapterBucket(sorted, {
        batchSize: 6,
        onProgress: (progress) =>
          setChapters(prev => prev.map(c => c.id === chapterId ? { ...c, uploadProgress: progress } : c)),
      });

      const urls = uploaded
        .sort((a, b) => a.order - b.order || a.sourceName.localeCompare(b.sourceName))
        .map(img => img.url);

      setChapters(prev => prev.map(c =>
        c.id === chapterId
          ? { ...c, images: urls, isUploading: false, uploadStatus: 'success', uploadProgress: 100 }
          : c
      ));
    } catch {
      setChapters(prev => prev.map(c =>
        c.id === chapterId
          ? { ...c, isUploading: false, uploadStatus: 'error', uploadProgress: 0 }
          : c
      ));
    }
  };

  // ── Process folder input ─────────────────────────────────────────────────────

  const processMainFolder = async (files: FileList) => {
    const fileArray = Array.from(files);

    // Group images by chapter subfolder
    const folderMap = new Map<string, File[]>();
    fileArray.forEach(file => {
      const parts = file.webkitRelativePath.split('/');
      if (parts.length < 2) return;
      const chapterFolder = parts.length >= 3 ? parts[1] : parts[0];
      if (!isImageFile(file.name)) return;
      if (!folderMap.has(chapterFolder)) folderMap.set(chapterFolder, []);
      folderMap.get(chapterFolder)!.push(file);
    });

    if (folderMap.size === 0) {
      toast({
        title: 'Nenhuma pasta de capítulo encontrada',
        description: 'Selecione uma pasta que contenha subpastas com imagens.',
        variant: 'destructive',
      });
      return;
    }

    // Build chapter records with stable IDs mapped to folder names
    const folderEntries = [...folderMap.entries()].sort(
      ([a], [b]) => extractNumbers(a) - extractNumbers(b)
    );

    // Resolve starting chapter number to avoid collisions with existing chapters
    const existingMax = chapters.length > 0 ? Math.max(...chapters.map(c => c.chapter_number)) : -1;
    let autoNumber = existingMax + 1;

    const idByFolder = new Map<string, string>();
    const newChapters: ChapterData[] = folderEntries.map(([folderName]) => {
      const parsed = extractNumbers(folderName);
      const chapterNumber = parsed > 0 ? parsed : autoNumber++;
      const id = crypto.randomUUID();
      idByFolder.set(folderName, id);
      return {
        id,
        chapter_number: chapterNumber,
        chapter_title: '',
        images: [],
        content: '',
        content_type: 'images',
        is_vip: false,
        vip_unlock_at: '',
        isUploading: false,
        uploadProgress: 0,
        uploadStatus: 'pending',
        expanded: false,
      };
    });

    setChapters(prev => [...prev, ...newChapters]);

    toast({
      title: `${newChapters.length} capítulo(s) detectado(s)`,
      description: 'Fazendo upload das imagens...',
    });

    // Upload in parallel (capped) — use idByFolder for stable lookup
    for (const [folderName, files] of folderEntries) {
      const id = idByFolder.get(folderName)!;
      await uploadImagesForChapter(id, files);
    }
  };

  // ── Process ZIP file ─────────────────────────────────────────────────────────

  const processZipFile = async (file: File) => {
    setIsProcessingZip(true);
    try {
      const zip = await JSZip.loadAsync(file);
      const folderMap = new Map<string, { name: string; blob: Blob }[]>();

      const tasks: Promise<void>[] = [];
      zip.forEach((relativePath, entry) => {
        if (entry.dir) return;
        const parts = relativePath.split('/').filter(Boolean);
        if (parts.length < 2) return;
        const chapterFolder = parts[0];
        const fileName = parts[parts.length - 1];
        if (!isImageFile(fileName)) return;

        tasks.push(
          entry.async('blob').then(blob => {
            if (!folderMap.has(chapterFolder)) folderMap.set(chapterFolder, []);
            folderMap.get(chapterFolder)!.push({ name: fileName, blob });
          })
        );
      });

      await Promise.all(tasks);

      if (folderMap.size === 0) {
        toast({ title: 'ZIP sem imagens', description: 'Nenhuma imagem encontrada dentro de subpastas.', variant: 'destructive' });
        return;
      }

      const folderEntries = [...folderMap.entries()].sort(([a], [b]) => extractNumbers(a) - extractNumbers(b));
      const existingMax = chapters.length > 0 ? Math.max(...chapters.map(c => c.chapter_number)) : -1;
      let autoNumber = existingMax + 1;

      const idByFolder = new Map<string, string>();
      const newChapters: ChapterData[] = folderEntries.map(([folderName]) => {
        const parsed = extractNumbers(folderName);
        const chapterNumber = parsed > 0 ? parsed : autoNumber++;
        const id = crypto.randomUUID();
        idByFolder.set(folderName, id);
        return {
          id,
          chapter_number: chapterNumber,
          chapter_title: '',
          images: [],
          content: '',
          content_type: 'images',
          is_vip: false,
          vip_unlock_at: '',
          isUploading: false,
          uploadProgress: 0,
          uploadStatus: 'pending',
          expanded: false,
        };
      });

      setChapters(prev => [...prev, ...newChapters]);
      toast({ title: `${newChapters.length} capítulo(s) no ZIP`, description: 'Fazendo upload das imagens...' });

      for (const [folderName, items] of folderEntries) {
        const id = idByFolder.get(folderName)!;
        const files = items
          .sort((a, b) => extractNumbers(a.name) - extractNumbers(b.name))
          .map(({ name, blob }) => {
            const ext = name.split('.').pop() || 'jpg';
            const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
            return new File([blob], name, { type: mime });
          });
        await uploadImagesForChapter(id, files);
      }
    } catch (err: any) {
      toast({ title: 'Erro ao ler ZIP', description: err.message, variant: 'destructive' });
    } finally {
      setIsProcessingZip(false);
    }
  };

  // ── Retry failed chapter ─────────────────────────────────────────────────────

  const retryChapter = async (chapter: ChapterData) => {
    if (!chapter.sourceFiles?.length) return;
    await uploadImagesForChapter(chapter.id, chapter.sourceFiles);
  };

  // ── File input handlers ──────────────────────────────────────────────────────

  const handleMainFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) await processMainFolder(e.target.files);
    if (e.target) e.target.value = '';
  };

  const handleZipSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processZipFile(file);
    if (e.target) e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const items = e.dataTransfer.files;
    if (!items?.length) return;
    const firstFile = items[0];
    if (firstFile?.name.endsWith('.zip')) {
      await processZipFile(firstFile);
    } else {
      toast({
        title: 'Arraste um arquivo ZIP',
        description: 'Para drag-and-drop, use um arquivo .zip com as subpastas de capítulos.',
      });
    }
  };

  // ── Submit all ───────────────────────────────────────────────────────────────

  const handleSubmitAll = async () => {
    if (!titleId) {
      toast({ title: 'Selecione um título', variant: 'destructive' });
      return;
    }

    const valid = chapters.filter(c =>
      contentType === 'images' ? c.images.length > 0 : c.content.trim().length > 0
    );

    if (valid.length === 0) {
      toast({ title: 'Nenhum capítulo com conteúdo', variant: 'destructive' });
      return;
    }

    // Duplicate check in batch
    const nums = valid.map(c => c.chapter_number);
    const dupes = nums.filter((n, i) => nums.indexOf(n) !== i);
    if (dupes.length) {
      toast({
        title: 'Números duplicados no lote',
        description: `Capítulos repetidos: ${[...new Set(dupes)].join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    // Duplicate check in DB
    const { data: existing } = await supabase
      .from('chapters')
      .select('chapter_number')
      .eq('title_id', titleId)
      .in('chapter_number', nums);

    if (existing?.length) {
      toast({
        title: 'Capítulos já existem no banco',
        description: `Já cadastrados: ${existing.map(c => c.chapter_number).join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    // VIP date validation
    const badVip = valid.find(c => {
      if (!c.is_vip || !c.vip_unlock_at) return false;
      const d = parseLocalDatetimeInput(c.vip_unlock_at);
      return !d || d.getTime() <= Date.now();
    });
    if (badVip) {
      toast({
        title: 'Data de desbloqueio inválida',
        description: `Cap. ${badVip.chapter_number}: a data deve ser futura ou deixada vazia.`,
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      for (const c of valid) {
        await createChapter.mutateAsync({
          title_id: titleId,
          chapter_number: c.chapter_number,
          chapter_title: c.chapter_title,
          images: c.images,
          content_type: contentType,
          content: contentType === 'novel' ? c.content : null,
          is_vip: c.is_vip,
          vip_unlock_at: c.is_vip && c.vip_unlock_at ? localDatetimeToIso(c.vip_unlock_at) : null,
        } as any);
      }

      toast({ title: `${valid.length} capítulo(s) publicado(s)!` });
      navigate(-1);
    } catch (err: any) {
      toast({ title: 'Erro ao publicar', description: err.message, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const addManualChapter = () => {
    const next = chapters.length > 0 ? Math.max(...chapters.map(c => c.chapter_number)) + 1 : 0;
    setChapters(prev => [...prev, {
      id: crypto.randomUUID(),
      chapter_number: next,
      chapter_title: '',
      images: [],
      content: '',
      content_type: contentType,
      is_vip: false,
      vip_unlock_at: '',
      isUploading: false,
      uploadProgress: 0,
      uploadStatus: 'pending',
      expanded: true,
    }]);
  };

  // ── Derived state ────────────────────────────────────────────────────────────

  const selectedTitle = titles?.find(t => t.id === titleId);
  const validCount = chapters.filter(c =>
    contentType === 'images' ? c.images.length > 0 : c.content.trim().length > 0
  ).length;
  const isAnyUploading = chapters.some(c => c.isUploading);
  const successCount = chapters.filter(c => c.uploadStatus === 'success').length;
  const errorCount = chapters.filter(c => c.uploadStatus === 'error').length;
  const overallProgress = chapters.length > 0
    ? Math.round((chapters.reduce((sum, c) => sum + (c.uploadStatus === 'success' ? 100 : c.uploadProgress), 0) / (chapters.length * 100)) * 100)
    : 0;

  const filteredTitles = (titles || []).filter(t =>
    !batchTitleSearch.trim() || t.title.toLowerCase().includes(batchTitleSearch.toLowerCase())
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background pb-32">
      <Header />

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-3xl">

        {/* ── Page header ── */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-xl sm:text-2xl font-bold leading-tight">Upload em Massa</h1>
              {selectedTitle && (
                <p className="text-xs text-muted-foreground truncate">→ {selectedTitle.title}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Instructions ── */}
        <Alert className="mb-5 bg-muted/40 border-border/50">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <AlertDescription className="text-sm">
            <span className="font-medium block mb-1">Estrutura esperada:</span>
            <code className="text-xs text-muted-foreground font-mono leading-relaxed block">
              📁 PastaPrincipal/<br />
              &nbsp;&nbsp;📁 01/ → imagens do cap. 1<br />
              &nbsp;&nbsp;📁 02/ → imagens do cap. 2<br />
              &nbsp;&nbsp;📁 1.5/ → imagens do cap. 1.5<br />
            </code>
          </AlertDescription>
        </Alert>

        {/* ── Title selection ── */}
        {!hasTitleFromUrl && !preselectedTitleId && (
          <Card className="mb-5 border-border/50">
            <CardContent className="p-4">
              <Label className="text-sm font-medium mb-3 block">Título *</Label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar título..."
                  value={batchTitleSearch}
                  onChange={e => setBatchTitleSearch(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>
              <Select value={titleId} onValueChange={setTitleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o título" />
                </SelectTrigger>
                <SelectContent>
                  {filteredTitles.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedTitle && (
                <div className="mt-3 flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border/30">
                  <div className="w-12 shrink-0 aspect-[3/4] rounded-md overflow-hidden">
                    <img src={selectedTitle.cover} alt={selectedTitle.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{selectedTitle.title}</p>
                    <p className="text-xs text-muted-foreground">{selectedTitle.status}</p>
                  </div>
                  <Badge variant="secondary" className="ml-auto text-xs shrink-0">{selectedTitle.type}</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Drop zone ── */}
        <div
          onClick={() => mainFolderInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          className={`
            relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center
            transition-all cursor-pointer mb-3
            ${isDragOver ? 'border-primary bg-primary/8 scale-[1.01]' : 'border-muted-foreground/25 hover:border-primary/40 hover:bg-accent/20'}
            ${isAnyUploading || isProcessingZip ? 'opacity-50 pointer-events-none' : ''}
          `}
        >
          <input
            type="file"
            accept="image/*,.avif"
            multiple
            // @ts-ignore
            webkitdirectory=""
            directory=""
            onChange={handleMainFolderSelect}
            className="hidden"
            ref={mainFolderInputRef}
            disabled={isAnyUploading}
          />

          <div className="flex flex-col items-center gap-3">
            {isProcessingZip ? (
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            ) : (
              <div className="p-4 rounded-2xl bg-muted/50">
                <FolderOpen className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
            <div>
              <p className="font-semibold text-base">
                {isProcessingZip ? 'Processando ZIP...' : 'Selecionar pasta de capítulos'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Clique para escolher a pasta principal ou arraste um arquivo .zip
              </p>
            </div>
          </div>
        </div>

        {/* ── ZIP button ── */}
        <div className="flex gap-2 mb-6">
          <input
            type="file"
            accept=".zip"
            onChange={handleZipSelect}
            className="hidden"
            ref={zipInputRef}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => zipInputRef.current?.click()}
            disabled={isAnyUploading || isProcessingZip}
            className="text-xs"
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Importar ZIP
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={addManualChapter}
            disabled={isAnyUploading}
            className="text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Adicionar manualmente
          </Button>
        </div>

        {/* ── Chapters list ── */}
        {chapters.length > 0 && (
          <>
            {/* Summary bar */}
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{chapters.length} capítulo(s)</span>
                {successCount > 0 && (
                  <Badge variant="outline" className="text-xs text-green-600 border-green-500/40 bg-green-500/10">
                    <CheckCircle2 className="h-3 w-3 mr-1" />{successCount} ok
                  </Badge>
                )}
                {errorCount > 0 && (
                  <Badge variant="outline" className="text-xs text-destructive border-destructive/40 bg-destructive/10">
                    <AlertTriangle className="h-3 w-3 mr-1" />{errorCount} erro(s)
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllPreviews(v => !v)}
                className="text-xs text-muted-foreground h-7"
              >
                {showAllPreviews ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
                {showAllPreviews ? 'Ocultar' : 'Ver'} imagens
              </Button>
            </div>

            {/* Overall upload progress */}
            {isAnyUploading && (
              <div className="mb-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Upload em andamento...</span>
                  <span>{overallProgress}%</span>
                </div>
                <Progress value={overallProgress} className="h-1.5" />
              </div>
            )}

            <div className="space-y-2">
              {chapters.map(chapter => (
                <ChapterCard
                  key={chapter.id}
                  chapter={chapter}
                  showPreview={showAllPreviews}
                  onUpdate={updates => updateChapter(chapter.id, updates)}
                  onRemove={() => removeChapter(chapter.id)}
                  onRemoveImage={idx => removeImage(chapter.id, idx)}
                  onRetry={() => retryChapter(chapter)}
                />
              ))}
            </div>
          </>
        )}

        {/* Empty state */}
        {chapters.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <FolderOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum capítulo adicionado ainda</p>
          </div>
        )}
      </div>

      {/* ── Sticky bottom bar ── */}
      {chapters.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border/50 px-4 py-3 z-20">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {validCount > 0
                  ? `${validCount} capítulo(s) prontos para publicar`
                  : 'Aguardando upload das imagens...'}
              </p>
              {isAnyUploading && (
                <p className="text-xs text-muted-foreground">Upload em progresso — aguarde</p>
              )}
            </div>
            <Button
              onClick={handleSubmitAll}
              disabled={isProcessing || !titleId || validCount === 0 || isAnyUploading}
              className="shrink-0"
            >
              {isProcessing
                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                : <Upload className="h-4 w-4 mr-2" />}
              Publicar {validCount > 0 ? validCount : ''} cap.
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Chapter Card ─────────────────────────────────────────────────────────────

interface ChapterCardProps {
  chapter: ChapterData;
  showPreview: boolean;
  onUpdate: (updates: Partial<ChapterData>) => void;
  onRemove: () => void;
  onRemoveImage: (idx: number) => void;
  onRetry: () => void;
}

const statusConfig: Record<UploadStatus, { icon: React.ReactNode; border: string }> = {
  pending:   { icon: <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />, border: '' },
  uploading: { icon: <Loader2 className="h-4 w-4 text-primary animate-spin" />, border: 'border-primary/40' },
  success:   { icon: <CheckCircle2 className="h-4 w-4 text-green-500" />, border: 'border-green-500/30' },
  error:     { icon: <XCircle className="h-4 w-4 text-destructive" />, border: 'border-destructive/40' },
};

const ChapterCard = ({ chapter, showPreview, onUpdate, onRemove, onRemoveImage, onRetry }: ChapterCardProps) => {
  const { icon, border } = statusConfig[chapter.uploadStatus];
  const isExpanded = chapter.expanded;

  return (
    <Card className={`border transition-colors ${border || 'border-border/50'}`}>
      <CardContent className="p-0">
        {/* Header row */}
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <div className="shrink-0">{icon}</div>

          {/* Chapter number */}
          <Input
            type="number"
            value={chapter.chapter_number}
            onChange={e => onUpdate({ chapter_number: parseFloat(e.target.value) || 0 })}
            className="h-8 w-20 text-sm font-mono shrink-0"
            disabled={chapter.isUploading}
          />

          {/* Title */}
          <Input
            value={chapter.chapter_title}
            onChange={e => onUpdate({ chapter_title: e.target.value })}
            placeholder="Título (opcional)"
            className="h-8 text-sm flex-1 min-w-0"
            disabled={chapter.isUploading}
          />

          {/* Image count badge */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <ImageIcon className="h-3.5 w-3.5" />
            <span>{chapter.images.length}</span>
          </div>

          {/* VIP toggle */}
          <button
            onClick={() => onUpdate({ is_vip: !chapter.is_vip })}
            className={`shrink-0 p-1 rounded-md transition-colors ${chapter.is_vip ? 'text-amber-500 bg-amber-500/10' : 'text-muted-foreground/40 hover:text-muted-foreground'}`}
            title="Marcar como VIP"
          >
            <Crown className="h-4 w-4" />
          </button>

          {/* Expand toggle */}
          <button
            onClick={() => onUpdate({ expanded: !isExpanded })}
            className="shrink-0 p-1 rounded-md text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {/* Delete */}
          <button
            onClick={onRemove}
            disabled={chapter.isUploading}
            className="shrink-0 p-1 rounded-md text-muted-foreground/40 hover:text-destructive transition-colors disabled:opacity-30"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Upload progress bar */}
        {chapter.isUploading && (
          <Progress value={chapter.uploadProgress} className="h-0.5 rounded-none mx-0" />
        )}

        {/* Expanded details */}
        {isExpanded && (
          <div className="px-3 pb-3 pt-1 border-t border-border/30 space-y-3">

            {/* VIP unlock date */}
            {chapter.is_vip && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Desbloqueio automático <span className="opacity-60">(vazio = VIP permanente)</span>
                </Label>
                <div className="flex gap-1.5">
                  <Input
                    type="datetime-local"
                    value={chapter.vip_unlock_at}
                    min={toLocalDatetimeInput()}
                    onChange={e => onUpdate({ vip_unlock_at: e.target.value })}
                    className="h-8 text-xs flex-1"
                  />
                  {chapter.vip_unlock_at && (
                    <Button type="button" variant="outline" size="sm" className="h-8 text-xs px-2" onClick={() => onUpdate({ vip_unlock_at: '' })}>
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Error retry */}
            {chapter.uploadStatus === 'error' && (
              <Button size="sm" variant="outline" onClick={onRetry} className="h-7 text-xs text-destructive border-destructive/40">
                <RefreshCw className="h-3 w-3 mr-1.5" />
                Tentar novamente
              </Button>
            )}

            {/* Image previews */}
            {(showPreview || isExpanded) && chapter.images.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">{chapter.images.length} páginas</p>
                <ScrollArea className="h-[100px]">
                  <div className="flex gap-1.5 pb-1">
                    {chapter.images.map((img, idx) => (
                      <div key={idx} className="relative shrink-0 group">
                        <img
                          src={img}
                          alt={`Página ${idx + 1}`}
                          className="h-[88px] w-auto rounded object-cover border border-border/50"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                          <button onClick={() => onRemoveImage(idx)} className="p-1 bg-destructive rounded text-white">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="absolute bottom-0.5 left-0.5 bg-black/70 text-white text-[9px] px-1 py-0.5 rounded leading-none">
                          {idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BatchChapterUpload;
