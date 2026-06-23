import { useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTitleOptions } from '@/hooks/useTitleOptions';
import { useCreateChapter } from '@/hooks/useChapters';
import { useToast } from '@/hooks/use-toast';
import {
  Upload, ArrowLeft, Layers, Trash2, Plus, FileText, Image as ImageIcon,
  FolderOpen, CheckCircle2, XCircle, X, FileArchive, Loader2, Info, Eye, EyeOff, Search
} from 'lucide-react';
import { uploadImagesToChapterBucket, extractSortableNumber } from '@/lib/chapterUpload';
import { supabase } from '@/integrations/supabase/client';
import JSZip from 'jszip';
import { toLocalDatetimeInput, localDatetimeToIso, parseLocalDatetimeInput } from '@/lib/datetime';

interface ChapterData {
  id: string;
  chapter_number: number;
  chapter_title: string;
  images: string[];
  content: string;
  content_type: 'images' | 'novel';
  is_vip: boolean;
  vip_unlock_at: string; // datetime-local string
  isUploading: boolean;
  uploadProgress: number;
  uploadStatus: 'pending' | 'uploading' | 'success' | 'error';
}

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
  const [contentType, setContentType] = useState<'images' | 'novel'>('images');
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [batchTitleSearch, setBatchTitleSearch] = useState('');

  const mainFolderInputRef = useRef<HTMLInputElement | null>(null);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
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
          <h1 className="font-display text-2xl sm:text-3xl font-bold mb-4">Acesso Negado</h1>
          <p className="text-muted-foreground mb-6">Você precisa ser administrador para acessar esta página.</p>
          <Button onClick={() => navigate('/')}>Voltar ao Início</Button>
        </div>
      </div>
    );
  }

  const extractNumbers = (str: string): number => {
    return extractSortableNumber(str);
  };

  const removeChapter = (id: string) => {
    setChapters(chapters.filter(c => c.id !== id));
  };

  const updateChapter = (id: string, updates: Partial<ChapterData>) => {
    setChapters(chapters.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const removeImage = (chapterId: string, imageIndex: number) => {
    const chapter = chapters.find(c => c.id === chapterId);
    if (chapter) {
      const newImages = chapter.images.filter((_, i) => i !== imageIndex);
      updateChapter(chapterId, { images: newImages });
    }
  };

  // Process folder with multiple chapter subfolders
  const processMainFolder = async (files: FileList) => {
    const fileArray = Array.from(files);
    
    // Group files by their parent folder (chapter folder)
    const folderMap = new Map<string, File[]>();
    
    fileArray.forEach(file => {
      // The webkitRelativePath gives us "MainFolder/ChapterFolder/image.jpg"
      const pathParts = file.webkitRelativePath.split('/');
      
      if (pathParts.length >= 2) {
        // Get the chapter folder name (second level)
        const chapterFolder = pathParts.length >= 3 ? pathParts[1] : pathParts[0];
        
        // Only add image files
        if (/\.(jpg|jpeg|png|gif|webp|avif)$/i.test(file.name)) {
          if (!folderMap.has(chapterFolder)) {
            folderMap.set(chapterFolder, []);
          }
          folderMap.get(chapterFolder)!.push(file);
        }
      }
    });

    if (folderMap.size === 0) {
      toast({
        title: 'Nenhuma pasta de capítulo encontrada',
        description: 'Certifique-se de selecionar uma pasta que contenha subpastas com imagens.',
        variant: 'destructive',
      });
      return;
    }

    // Create chapters from folders
    const newChapters: ChapterData[] = [];
    
    folderMap.forEach((files, folderName) => {
      const chapterNumber = extractNumbers(folderName) || newChapters.length + 1;
      
      newChapters.push({
        id: crypto.randomUUID(),
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
      });
    });

    // Sort chapters by number
    newChapters.sort((a, b) => a.chapter_number - b.chapter_number);
    
    // Add chapters to state
    setChapters(prev => [...prev, ...newChapters]);

    toast({
      title: `${newChapters.length} capítulos detectados`,
      description: 'Iniciando upload das imagens...',
    });

    // Upload images for each chapter
    let chapterIndex = chapters.length;
    for (const [folderName, files] of folderMap) {
      const chapterNumber = extractNumbers(folderName) || 1;
      const chapter = newChapters.find(c => c.chapter_number === chapterNumber);
      
      if (chapter) {
        await uploadImagesForChapter(chapter.id, files, newChapters);
      }
      chapterIndex++;
    }
  };

  const uploadImagesForChapter = async (chapterId: string, files: File[], currentChapters: ChapterData[]) => {
    const sortedFiles = [...files].sort((a, b) => extractNumbers(a.name) - extractNumbers(b.name));

    setChapters(prev => prev.map(c =>
      c.id === chapterId
        ? { ...c, isUploading: true, uploadStatus: 'uploading', uploadProgress: 0 }
        : c
    ));

    try {
      const uploadedImages = await uploadImagesToChapterBucket(sortedFiles, {
        batchSize: 6,
        onProgress: (progress) => {
          setChapters(prev => prev.map(c =>
            c.id === chapterId ? { ...c, uploadProgress: progress } : c
          ));
        },
      });

      const finalUrls = uploadedImages
        .sort((a, b) => a.order - b.order || a.sourceName.localeCompare(b.sourceName))
        .map((image) => image.url);

      setChapters(prev => prev.map(c =>
        c.id === chapterId
          ? { ...c, images: finalUrls, isUploading: false, uploadStatus: 'success', uploadProgress: 100 }
          : c
      ));

    } catch (error: any) {
      setChapters(prev => prev.map(c =>
        c.id === chapterId
          ? { ...c, isUploading: false, uploadStatus: 'error', uploadProgress: 0 }
          : c
      ));
    }
  };

  const handleMainFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processMainFolder(files);
    }
    // Reset input
    if (e.target) e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    // Note: drag and drop doesn't support folder structure, show message
    toast({
      title: 'Use o botão de seleção',
      description: 'Arraste e solte não suporta estrutura de pastas. Clique na área para selecionar a pasta principal.',
      variant: 'default',
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleSubmitAll = async () => {
    if (!titleId) {
      toast({
        title: 'Selecione um título',
        description: 'Você precisa selecionar um título antes de enviar.',
        variant: 'destructive',
      });
      return;
    }

    const validChapters = chapters.filter(c => 
      contentType === 'images' ? c.images.length > 0 : c.content.trim().length > 0
    );
    
    if (validChapters.length === 0) {
      toast({
        title: 'Nenhum capítulo válido',
        description: contentType === 'images' 
          ? 'Adicione imagens em pelo menos um capítulo.'
          : 'Adicione conteúdo em pelo menos um capítulo.',
        variant: 'destructive',
      });
      return;
    }

    // Check for duplicate chapter numbers in the batch
    const chapterNumbers = validChapters.map(c => c.chapter_number);
    const duplicatesInBatch = chapterNumbers.filter((num, index) => chapterNumbers.indexOf(num) !== index);
    
    if (duplicatesInBatch.length > 0) {
      toast({
        title: 'Capítulos duplicados detectados',
        description: `Os capítulos ${[...new Set(duplicatesInBatch)].join(', ')} estão duplicados no lote.`,
        variant: 'destructive',
      });
      return;
    }

    // Check for existing chapters in the database
    const { data: existingChapters } = await supabase
      .from('chapters')
      .select('chapter_number')
      .eq('title_id', titleId)
      .in('chapter_number', chapterNumbers);

    if (existingChapters && existingChapters.length > 0) {
      const existingNumbers = existingChapters.map(c => c.chapter_number);
      toast({
        title: 'Capítulos já existem',
        description: `Os capítulos ${existingNumbers.join(', ')} já existem para este título.`,
        variant: 'destructive',
      });
      return;
    }

    // Validate VIP unlock dates not in the past
    const invalidUnlock = validChapters.find((c) => {
      if (!c.is_vip || !c.vip_unlock_at) return false;
      const d = parseLocalDatetimeInput(c.vip_unlock_at);
      return !d || d.getTime() <= Date.now();
    });
    if (invalidUnlock) {
      toast({
        title: 'Data de desbloqueio inválida',
        description: `Capítulo ${invalidUnlock.chapter_number}: a data deve estar no futuro. Deixe vazio para VIP permanente.`,
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      for (const chapter of validChapters) {
        await createChapter.mutateAsync({
          title_id: titleId,
          chapter_number: chapter.chapter_number,
          chapter_title: chapter.chapter_title,
          images: chapter.images,
          content_type: contentType,
          content: contentType === 'novel' ? chapter.content : null,
          is_vip: chapter.is_vip,
          vip_unlock_at: chapter.is_vip && chapter.vip_unlock_at
            ? localDatetimeToIso(chapter.vip_unlock_at)
            : null,
        } as any);
      }

      toast({
        title: 'Capítulos criados!',
        description: `${validChapters.length} capítulos foram adicionados.`,
      });

      navigate(-1);
    } catch (error: any) {
      toast({
        title: 'Erro ao criar capítulos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const addManualChapter = () => {
    const lastNumber = chapters.length > 0 
      ? Math.max(...chapters.map(c => c.chapter_number)) + 1 
      : 0; // Start from 0 to support chapter 0
    
    setChapters([...chapters, {
      id: crypto.randomUUID(),
      chapter_number: lastNumber,
      chapter_title: '',
      images: [],
      content: '',
      content_type: contentType,
      is_vip: false,
      vip_unlock_at: '',
      isUploading: false,
      uploadProgress: 0,
      uploadStatus: 'pending',
    }]);
  };

  const selectedTitle = titles?.find(t => t.id === titleId);
  const validChaptersCount = chapters.filter(c => 
    contentType === 'images' ? c.images.length > 0 : c.content.trim().length > 0
  ).length;
  const isAnyUploading = chapters.some(c => c.isUploading);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="self-start">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-3 rounded-xl bg-primary/10">
              <Layers className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold">Upload em Massa</h1>
              {selectedTitle && (
                <p className="text-sm text-muted-foreground">Para: {selectedTitle.title}</p>
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <Alert className="mb-6 bg-card border-border">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm space-y-1">
            <p className="font-medium">Como funciona o upload em massa:</p>
            <ol className="list-decimal list-inside space-y-0.5 text-muted-foreground">
              <li>Organize seus capítulos em pastas separadas numeradas</li>
              <li>O nome da pasta será usado como número do capítulo (ex: "01", "1.5", "10")</li>
              <li>As imagens dentro de cada pasta devem estar numeradas em ordem (ex: "01.jpg", "02.jpg")</li>
              <li>Selecione a pasta principal que contém todas as pastas de capítulos</li>
              <li>Revise e ajuste os números/títulos antes de enviar</li>
            </ol>
          </AlertDescription>
        </Alert>

        {/* Title Selection */}
        {!hasTitleFromUrl && !preselectedTitleId && (
          <Card className="mb-6">
            <CardContent className="p-4 sm:p-6">
              <Label className="mb-2 block text-sm font-medium">Selecione o Título *</Label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar título..."
                  value={batchTitleSearch}
                  onChange={(e) => setBatchTitleSearch(e.target.value)}
                  className="pl-9 h-9 bg-background/50 border-border/30 rounded-lg text-sm"
                />
              </div>
              <Select value={titleId} onValueChange={setTitleId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o título" />
                </SelectTrigger>
                <SelectContent>
                  {(titles || []).filter(t => !batchTitleSearch.trim() || t.title.toLowerCase().includes(batchTitleSearch.toLowerCase())).map((title) => (
                    <SelectItem key={title.id} value={title.id}>
                      {title.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Selected title manga card preview */}
              {selectedTitle && (
                <div className="mt-4 flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border/30">
                  <div className="w-16 shrink-0">
                    <div className="relative aspect-[3/4] rounded-lg overflow-hidden">
                      <img src={selectedTitle.cover} alt={selectedTitle.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <div className="absolute top-1 right-1 bg-primary text-primary-foreground text-[8px] px-1 py-0.5 rounded font-semibold">
                        {selectedTitle.type}
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{selectedTitle.title}</p>
                    <p className="text-xs text-muted-foreground">{selectedTitle.status}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Main Drop Zone - Large and Prominent */}
        <div
          onClick={() => mainFolderInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative border-2 border-dashed rounded-2xl p-8 sm:p-12 lg:p-16 text-center 
            transition-all cursor-pointer mb-6
            ${isDragOver 
              ? 'border-primary bg-primary/10 scale-[1.01]' 
              : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-accent/30'
            }
            ${isAnyUploading ? 'opacity-50 pointer-events-none' : ''}
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
          
          <div className="flex flex-col items-center">
            <div className="p-4 sm:p-6 rounded-2xl bg-muted/50 mb-4 sm:mb-6">
              <FolderOpen className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground" />
            </div>
            <p className="text-lg sm:text-xl font-semibold mb-2">
              Clique para selecionar a pasta com os capítulos
            </p>
            <p className="text-sm sm:text-base text-muted-foreground max-w-md">
              Selecione a pasta principal que contém todas as sub-pastas de capítulos.
              Cada subpasta numerada será tratada como um capítulo separado
            </p>
          </div>
        </div>

        {/* Add Manual Chapter Button */}
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={addManualChapter}
            className="w-full sm:w-auto"
            disabled={isAnyUploading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Mais Capítulos
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Use este botão para adicionar capítulos de outra pasta principal ou pastas de capítulos
          </p>
        </div>

        {/* Chapters List */}
        {chapters.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-lg font-semibold">
                Capítulos Detectados ({chapters.length})
              </h2>
              <div className="flex gap-2">
                <Button
                  onClick={handleSubmitAll}
                  disabled={isProcessing || !titleId || validChaptersCount === 0 || isAnyUploading}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Enviar {validChaptersCount} Capítulo(s)
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowPreview(!showPreview)}
                  title={showPreview ? 'Esconder pré-visualização' : 'Mostrar pré-visualização'}
                >
                  {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {chapters.map((chapter) => (
              <Card 
                key={chapter.id} 
                className={`
                  transition-all
                  ${chapter.uploadStatus === 'success' ? 'border-green-500/50' : ''}
                  ${chapter.uploadStatus === 'error' ? 'border-destructive/50' : ''}
                  ${chapter.isUploading ? 'border-primary/50' : ''}
                `}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Status Icon */}
                    <div className="pt-2">
                      {chapter.uploadStatus === 'success' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                      {chapter.uploadStatus === 'error' && <XCircle className="h-5 w-5 text-destructive" />}
                      {chapter.uploadStatus === 'uploading' && <Loader2 className="h-5 w-5 text-primary animate-spin" />}
                      {chapter.uploadStatus === 'pending' && <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />}
                    </div>

                    {/* Chapter Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="w-full sm:w-32">
                          <Label className="text-xs text-muted-foreground mb-1 block">Número do Capítulo</Label>
                          <Input
                            type="text"
                            value={chapter.chapter_number}
                            onChange={(e) => updateChapter(chapter.id, { chapter_number: parseFloat(e.target.value) || 0 })}
                            className="h-9"
                          />
                        </div>
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground mb-1 block">Título (opcional)</Label>
                          <Input
                            value={chapter.chapter_title}
                            onChange={(e) => updateChapter(chapter.id, { chapter_title: e.target.value })}
                            placeholder="Ex: O Início da Jornada"
                            className="h-9"
                          />
                        </div>
                      </div>

                      {/* VIP per chapter */}
                      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                        <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm">
                          <input
                            type="checkbox"
                            checked={chapter.is_vip}
                            onChange={(e) => updateChapter(chapter.id, { is_vip: e.target.checked })}
                            className="h-4 w-4 accent-primary"
                          />
                          <span className="font-semibold">👑 VIP</span>
                        </label>
                        {chapter.is_vip && (
                          <div className="flex-1">
                            <Label className="text-[10px] text-muted-foreground mb-1 block">
                              Desbloqueio automático (vazio = permanente)
                            </Label>
                            <div className="flex gap-1.5">
                              <Input
                                type="datetime-local"
                                value={chapter.vip_unlock_at}
                                min={toLocalDatetimeInput()}
                                onChange={(e) => updateChapter(chapter.id, { vip_unlock_at: e.target.value })}
                                className="h-8 text-xs flex-1"
                              />
                              {chapter.vip_unlock_at && (
                                <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => updateChapter(chapter.id, { vip_unlock_at: '' })}>
                                  Limpar
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Progress */}
                      {chapter.isUploading && (
                        <Progress value={chapter.uploadProgress} className="h-1.5" />
                      )}

                      {/* Image Count */}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ImageIcon className="h-4 w-4" />
                        <span>{chapter.images.length} páginas</span>
                      </div>

                      {/* Images Preview */}
                      {showPreview && chapter.images.length > 0 && (
                        <ScrollArea className="h-[120px]">
                          <div className="flex gap-2 pb-2">
                            {chapter.images.map((img, imgIndex) => (
                              <div 
                                key={imgIndex} 
                                className="relative flex-shrink-0 group"
                              >
                                <img
                                  src={img}
                                  alt={`Página ${imgIndex + 1}`}
                                  className="h-[100px] w-auto rounded-lg object-cover border border-border"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => removeImage(chapter.id, imgIndex)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                                <span className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                                  {imgIndex + 1}
                                </span>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </div>

                    {/* Delete Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeChapter(chapter.id)}
                      className="text-muted-foreground hover:text-destructive h-8 w-8 flex-shrink-0"
                      disabled={chapter.isUploading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Bottom Submit Button (Mobile) */}
        {chapters.length > 0 && (
          <div className="mt-6 sm:hidden">
            <Button 
              onClick={handleSubmitAll}
              disabled={isProcessing || !titleId || validChaptersCount === 0 || isAnyUploading}
              className="w-full"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Enviar {validChaptersCount} Capítulo(s)
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchChapterUpload;
