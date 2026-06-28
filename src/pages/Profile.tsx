import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useFavoritesWithTitles } from '@/hooks/useFavoritesWithTitles';
import { useReadingProgress } from '@/hooks/useReadingProgress';
import { useReadingHistory } from '@/hooks/useReadingHistory';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import PageTransition from '@/components/PageTransition';
import MangaCard from '@/components/MangaCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Camera, Crown, LogOut, Trash2, Key, Save, History, BookMarked, Lock, MessageSquare, LayoutDashboard, Settings, Bell, Moon, Palette, ShieldOff, Home, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';

type Tab = 'overview' | 'bookmarks' | 'history' | 'purchased' | 'comments' | 'settings';
type SettingsTab = 'account' | 'security' | 'notifications' | 'reading' | 'appearance' | 'customize' | 'blocked';

const Profile = () => {
  const navigate = useNavigate();
  const { user, loading, isVip, signOut } = useAuth();
  const { data: favorites = [], isLoading: favoritesLoading } = useFavoritesWithTitles();
  const { history, isLoading: historyLoading, clearHistory, isClearingHistory } = useReadingHistory();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>('overview');
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('account');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [twitter, setTwitter] = useState('');
  const [website, setWebsite] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [theme, setTheme] = useState<'night' | 'onyx' | 'sepia' | 'light'>('night');
  const [accentColor, setAccentColor] = useState('#7c3aed');
  const [readingMode, setReadingMode] = useState<'webtoon' | 'paged'>('webtoon');
  const [imageFit, setImageFit] = useState<'fit-width' | 'original'>('fit-width');
  const [pageGap, setPageGap] = useState<'none' | 'small' | 'large'>('none');
  const [notifNewSeries, setNotifNewSeries] = useState(true);
  const [notifNewChapters, setNotifNewChapters] = useState(true);
  const [notifReplies, setNotifReplies] = useState(true);
  const [notifAnnouncements, setNotifAnnouncements] = useState(true);

  const presetColors = ['#f59e0b', '#7c3aed', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#ef4444', '#06b6d4'];

  useEffect(() => { if (!loading && !user) navigate('/auth'); }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('username, avatar_url, banner_url, bio, twitter, website').eq('id', user.id).maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setUsername(data.username || '');
        setAvatarUrl(data.avatar_url || '');
        setBannerUrl((data as any).banner_url || '');
        setBio((data as any).bio || '');
        setTwitter((data as any).twitter || '');
        setWebsite((data as any).website || '');
      });
  }, [user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setAvatarFile(file); setAvatarUrl(URL.createObjectURL(file)); }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setBannerFile(file); setBannerUrl(URL.createObjectURL(file)); }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      let finalAvatarUrl = avatarUrl;
      let finalBannerUrl = bannerUrl;
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop();
        const path = `${user.id}/avatar.${ext}`;
        await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true });
        const { data } = supabase.storage.from('avatars').getPublicUrl(path);
        finalAvatarUrl = data.publicUrl;
      }
      if (bannerFile) {
        const ext = bannerFile.name.split('.').pop();
        const path = `${user.id}/banner.${ext}`;
        await supabase.storage.from('avatars').upload(path, bannerFile, { upsert: true });
        const { data } = supabase.storage.from('avatars').getPublicUrl(path);
        finalBannerUrl = data.publicUrl;
      }
      await supabase.from('profiles').upsert({
        id: user.id, username, avatar_url: finalAvatarUrl,
        bio, twitter, website,
        banner_url: finalBannerUrl, updated_at: new Date().toISOString()
      } as any);
      setAvatarUrl(finalAvatarUrl); setBannerUrl(finalBannerUrl);
      setAvatarFile(null); setBannerFile(null);
      toast({ title: 'Perfil atualizado' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível salvar.', variant: 'destructive' });
    } finally { setIsSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      toast({ title: 'Erro', description: 'Senhas não coincidem.', variant: 'destructive' }); return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Erro', description: 'Mínimo 6 caracteres.', variant: 'destructive' }); return;
    }
    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: 'Senha alterada com sucesso' });
      setNewPassword(''); setConfirmPassword('');
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally { setIsChangingPassword(false); }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error('Erro ao excluir');
      toast({ title: 'Conta excluída' });
      await signOut(); navigate('/');
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally { setIsDeletingAccount(false); }
  };

  const handleClearHistory = () => clearHistory(undefined, {
    onSuccess: () => toast({ title: 'Histórico limpo' }),
    onError: () => toast({ title: 'Erro', variant: 'destructive' } as any),
  });

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Header />
      <div className="animate-pulse space-y-4 p-4 max-w-2xl mx-auto pt-8">
        <div className="h-36 bg-white/5 rounded-2xl" />
        <div className="h-24 bg-white/5 rounded-2xl" />
      </div>
    </div>
  );

  if (!user) return null;

  const displayName = username || user.email?.split('@')[0] || 'Usuário';
  const memberSince = user.created_at ? new Date(user.created_at) : new Date();

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'bookmarks', label: 'Bookmarks', icon: BookMarked },
    { id: 'history', label: 'History', icon: History },
    { id: 'purchased', label: 'Purchased', icon: Lock },
    { id: 'comments', label: 'Comments', icon: MessageSquare },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const settingsTabs: { id: SettingsTab; label: string; icon: any }[] = [
    { id: 'account', label: 'Account', icon: null },
    { id: 'security', label: 'Security', icon: null },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'reading', label: 'Reading', icon: BookOpen },
    { id: 'appearance', label: 'Appearance', icon: Moon },
    { id: 'customize', label: 'Customize', icon: Palette },
    { id: 'blocked', label: 'Blocked', icon: ShieldOff },
  ];

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#0a0a0f] text-white pb-20 lg:pb-0">
        <Header />

        {/* ── PROFILE HEADER ── */}
        <div className="relative">
          {/* Banner */}
          <div className="h-36 lg:h-48 relative overflow-hidden bg-gradient-to-br from-violet-900/40 via-purple-900/20 to-black">
            {bannerUrl && <img src={bannerUrl} alt="banner" className="w-full h-full object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
            {/* Upload banner btn */}
            <label className="absolute top-3 right-3 cursor-pointer">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg text-xs text-zinc-300 hover:text-white hover:border-white/30 transition-all">
                <Camera className="h-3.5 w-3.5" /> Banner
              </div>
              <input type="file" accept="image/*" onChange={handleBannerChange} className="hidden" />
            </label>
          </div>

          {/* Avatar + info row */}
          <div className="px-4 lg:px-8 -mt-12 relative z-10 pb-4 border-b border-white/5 max-w-4xl mx-auto">
            <div className="flex items-end gap-4">
              {/* Avatar with upload */}
              <label className="relative cursor-pointer group shrink-0">
                <Avatar className="h-20 w-20 lg:h-24 lg:w-24 border-4 border-[#0a0a0f]">
                  <AvatarImage src={avatarUrl || undefined} className="object-cover" />
                  <AvatarFallback className="bg-violet-600 text-white text-2xl font-bold">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-5 w-5 text-white" />
                </div>
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </label>

              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl lg:text-2xl font-bold">{displayName}</h1>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    isVip
                      ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                      : 'bg-violet-500/20 text-violet-400 border-violet-500/30'
                  }`}>
                    {isVip ? 'VIP' : 'MEMBER'}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Member since {memberSince.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </p>
              </div>

              {/* Action buttons */}
              <div className="hidden lg:flex items-center gap-2 pb-1">
                <Button variant="outline" size="sm" onClick={() => setTab('settings')}
                  className="h-8 text-xs border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300">
                  <Settings className="h-3.5 w-3.5 mr-1" /> Settings
                </Button>
                <Button variant="outline" size="sm" onClick={() => signOut()}
                  className="h-8 text-xs border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300">
                  <LogOut className="h-3.5 w-3.5 mr-1" /> Log out
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 mt-4">
              {[
                { label: 'Coins', value: '0', icon: '🪙' },
                { label: 'Bookmarks', value: String(favorites.length), icon: '🔖' },
                { label: 'Owned chapters', value: '0', icon: '🔒' },
                { label: 'Comments', value: '0', icon: '💬' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-white">{stat.value}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Mobile action buttons */}
            <div className="flex lg:hidden items-center gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={() => setTab('settings')}
                className="flex-1 h-8 text-xs border-white/10 bg-white/5 text-zinc-300">
                <Settings className="h-3.5 w-3.5 mr-1" /> Settings
              </Button>
              <Button variant="outline" size="sm" onClick={() => signOut()}
                className="flex-1 h-8 text-xs border-white/10 bg-white/5 text-zinc-300">
                <LogOut className="h-3.5 w-3.5 mr-1" /> Log out
              </Button>
            </div>
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="border-b border-white/5 bg-[#0a0a0f] sticky top-14 z-40">
          <div className="max-w-4xl mx-auto px-4 lg:px-8 overflow-x-auto scrollbar-none">
            <div className="flex gap-0 min-w-max">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`relative px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-colors ${
                    tab === t.id ? 'text-violet-400' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {tab === t.id && (
                    <motion.div layoutId="profile-tab-indicator"
                      className="absolute bottom-0 inset-x-0 h-0.5 bg-violet-500" />
                  )}
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6 space-y-6">

          {/* OVERVIEW */}
          {tab === 'overview' && (
            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">RECENTLY READ</p>
                {history.length === 0 ? (
                  <div className="bg-white/3 border border-white/5 rounded-xl p-8 text-center">
                    <p className="text-zinc-500 text-sm">No reading history yet. <Link to="/catalog" className="text-violet-400 font-semibold">Find something to read →</Link></p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {history.slice(0, 5).map((item) => (
                      <Link key={item.id} to={`/read/${item.title_id}/${item.chapter?.chapter_number || 1}`}>
                        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/3 hover:bg-white/6 border border-white/5 transition-colors group">
                          <img src={item.title?.cover} alt={item.title?.title} className="w-10 h-14 object-cover rounded-lg" />
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium truncate group-hover:text-violet-300 transition-colors">{item.title?.title}</h3>
                            <p className="text-xs text-zinc-500 mt-0.5">Chapter {item.chapter?.chapter_number}</p>
                          </div>
                          <span className="text-[10px] text-zinc-600 whitespace-nowrap">
                            {formatDistanceToNow(new Date(item.read_at), { addSuffix: true, locale: ptBR })}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* BOOKMARKS */}
          {tab === 'bookmarks' && (
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                {favorites.length} BOOKMARKED SERIES
                {favorites.length > 0 && (
                  <Link to="/my-list" className="ml-3 text-violet-400 normal-case font-normal">VIEW ALL BOOKMARKS →</Link>
                )}
              </p>
              {favoritesLoading ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {[...Array(5)].map((_, i) => <div key={i} className="aspect-[3/4] bg-white/5 rounded-xl animate-pulse" />)}
                </div>
              ) : favorites.length === 0 ? (
                <div className="bg-white/3 border border-white/5 rounded-xl p-8 text-center">
                  <p className="text-zinc-500 text-sm">No bookmarks yet. <Link to="/catalog" className="text-violet-400 font-semibold">Browse series →</Link></p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {favorites.map((fav) => (
                    <MangaCard
                      key={fav.id}
                      id={fav.title_id}
                      title={fav.title?.title || ''}
                      cover={fav.title?.cover || ''}
                      type={(fav.title?.type as any) || 'Manhwa'}
                      rating={fav.title?.rating || 0}
                      views={fav.title?.views || 0}
                      status={(fav.title?.status as any) || 'Em andamento'}
                      genres={fav.title?.genres || []}
                      slug={fav.title?.slug}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* HISTORY */}
          {tab === 'history' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">CONTINUE READING</p>
                {history.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7">
                        <Trash2 className="h-3 w-3 mr-1" /> Clear
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-[#111118] border-white/10">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear history?</AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-400">This can't be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-white/10 bg-white/5">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearHistory} disabled={isClearingHistory} className="bg-red-600 hover:bg-red-700">
                          {isClearingHistory ? 'Clearing...' : 'Clear'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              {historyLoading ? (
                <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}</div>
              ) : history.length === 0 ? (
                <div className="bg-white/3 border border-white/5 rounded-xl p-8 text-center">
                  <p className="text-zinc-500 text-sm">No reading history yet.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {history.map((item) => (
                    <Link key={item.id} to={`/read/${item.title_id}/${item.chapter?.chapter_number || 1}`}>
                      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/3 hover:bg-white/6 border border-white/5 transition-colors group">
                        <img src={item.title?.cover} alt={item.title?.title} className="w-10 h-14 object-cover rounded-lg" />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium truncate group-hover:text-violet-300 transition-colors">{item.title?.title}</h3>
                          <p className="text-xs text-zinc-500">Chapter {item.chapter?.chapter_number}</p>
                        </div>
                        <span className="text-[10px] text-zinc-600 whitespace-nowrap">
                          {formatDistanceToNow(new Date(item.read_at), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PURCHASED */}
          {tab === 'purchased' && (
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">0 OWNED CHAPTERS ACROSS 0 SERIES</p>
              <div className="bg-white/3 border border-white/5 rounded-xl p-8 text-center">
                <p className="text-zinc-500 text-sm">You haven't unlocked any premium chapters yet. <Link to="/vip" className="text-violet-400 font-semibold">Get coins →</Link></p>
              </div>
            </div>
          )}

          {/* COMMENTS */}
          {tab === 'comments' && (
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">YOUR RECENT COMMENTS</p>
              <div className="bg-white/3 border border-white/5 rounded-xl p-8 text-center">
                <p className="text-zinc-500 text-sm">No comments yet.</p>
              </div>
            </div>
          )}

          {/* SETTINGS */}
          {tab === 'settings' && (
            <div>
              {/* Settings sub-tabs */}
              <div className="flex gap-1.5 overflow-x-auto scrollbar-none mb-6">
                {settingsTabs.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setSettingsTab(st.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                      settingsTab === st.id
                        ? 'bg-violet-600 text-white'
                        : 'bg-white/5 text-zinc-400 hover:bg-white/8 hover:text-zinc-200'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              {/* Account */}
              {settingsTab === 'account' && (
                <div className="space-y-6">
                  <div className="bg-white/3 border border-white/5 rounded-2xl p-5 space-y-5">
                    <h3 className="font-semibold text-sm">Profile</h3>
                    <p className="text-xs text-zinc-500 -mt-3">This is how you appear across Wolftoon.</p>

                    <div className="flex items-start gap-4">
                      <div>
                        <p className="text-xs font-medium text-zinc-400 mb-2">Avatar</p>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-14 w-14 border border-white/10">
                            <AvatarImage src={avatarUrl || undefined} />
                            <AvatarFallback className="bg-violet-600 text-white font-bold">{displayName.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="space-y-1.5">
                            <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white/8 hover:bg-white/12 border border-white/10 rounded-lg text-xs text-zinc-300 cursor-pointer transition-colors">
                              <Camera className="h-3 w-3" /> Upload
                              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                            </label>
                            <p className="text-[10px] text-zinc-600">JPG, PNG, GIF or WebP · max 3MB.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-zinc-400 mb-2">Profile banner</p>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white/8 hover:bg-white/12 border border-white/10 rounded-lg text-xs text-zinc-300 cursor-pointer transition-colors">
                          <Camera className="h-3 w-3" /> Upload banner
                          <input type="file" accept="image/*" onChange={handleBannerChange} className="hidden" />
                        </label>
                        {bannerUrl && <button onClick={() => setBannerUrl('')} className="text-xs text-zinc-500 hover:text-red-400 transition-colors">Remove</button>}
                      </div>
                      <p className="text-[10px] text-zinc-600 mt-1">Wide image shown behind your profile header · max 6MB.</p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-zinc-400 mb-1.5 block">Display name</Label>
                        <Input value={username} onChange={(e) => setUsername(e.target.value)}
                          className="bg-white/5 border-white/10 text-zinc-200 h-9 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs text-zinc-400 mb-1.5 block">Bio</Label>
                        <textarea value={bio} onChange={(e) => setBio(e.target.value)}
                          placeholder="Tell other readers a little about yourself..."
                          rows={3}
                          className="w-full bg-white/5 border border-white/10 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-violet-500/50" />
                      </div>
                      <div>
                        <Label className="text-xs text-zinc-400 mb-1.5 block">Email</Label>
                        <Input value={user.email || ''} disabled className="bg-white/3 border-white/5 text-zinc-500 h-9 text-sm" />
                        <p className="text-[10px] text-zinc-600 mt-1">Used for sign-in and notifications. Never shown publicly.</p>
                      </div>
                      <div>
                        <Label className="text-xs text-zinc-400 mb-1.5 block">Twitter / X</Label>
                        <Input value={twitter} onChange={(e) => setTwitter(e.target.value)}
                          placeholder="https://x.com/you"
                          className="bg-white/5 border-white/10 text-zinc-200 h-9 text-sm placeholder:text-zinc-600" />
                      </div>
                      <div>
                        <Label className="text-xs text-zinc-400 mb-1.5 block">Website</Label>
                        <Input value={website} onChange={(e) => setWebsite(e.target.value)}
                          placeholder="https://"
                          className="bg-white/5 border-white/10 text-zinc-200 h-9 text-sm placeholder:text-zinc-600" />
                      </div>
                    </div>

                    <Button onClick={handleSaveProfile} disabled={isSaving}
                      className="bg-violet-600 hover:bg-violet-700 text-white w-full sm:w-auto">
                      {isSaving ? 'Saving...' : 'Save changes'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Security */}
              {settingsTab === 'security' && (
                <div className="space-y-4">
                  <div className="bg-white/3 border border-white/5 rounded-2xl p-5 space-y-4">
                    <h3 className="font-semibold text-sm">Change password</h3>
                    <p className="text-xs text-zinc-500 -mt-3">Use at least 6 characters.</p>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-zinc-400 mb-1.5 block">New password</Label>
                        <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••" className="bg-white/5 border-white/10 text-zinc-200 h-9 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs text-zinc-400 mb-1.5 block">Confirm new password</Label>
                        <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••" className="bg-white/5 border-white/10 text-zinc-200 h-9 text-sm" />
                      </div>
                      <Button onClick={handleChangePassword} disabled={isChangingPassword}
                        className="bg-violet-600 hover:bg-violet-700 text-white">
                        {isChangingPassword ? 'Updating...' : 'Update password'}
                      </Button>
                    </div>
                  </div>

                  <div className="bg-red-500/5 border border-red-500/15 rounded-2xl p-5 space-y-3">
                    <h3 className="font-semibold text-sm text-red-400">Danger zone</h3>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => signOut()}
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50">
                        <LogOut className="h-3.5 w-3.5 mr-1.5" /> Log out
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" disabled={isDeletingAccount}
                            className="bg-red-600 hover:bg-red-700 text-white border-0">
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete account
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-[#111118] border-white/10">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete account permanently?</AlertDialogTitle>
                            <AlertDialogDescription className="text-zinc-400">This action cannot be undone. All your data will be removed.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-white/10 bg-white/5">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteAccount} disabled={isDeletingAccount} className="bg-red-600 hover:bg-red-700">
                              {isDeletingAccount ? 'Deleting...' : 'Delete'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications */}
              {settingsTab === 'notifications' && (
                <div className="bg-white/3 border border-white/5 rounded-2xl p-5 space-y-5">
                  <div>
                    <h3 className="font-semibold text-sm">Notifications</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Choose what you get notified about — in the bell and on your device.</p>
                  </div>
                  {[
                    { label: 'New series', desc: 'When a new series is added to the site.', state: notifNewSeries, set: setNotifNewSeries },
                    { label: 'New chapters', desc: "From series you've bookmarked.", state: notifNewChapters, set: setNotifNewChapters },
                    { label: 'Replies to my comments', desc: 'When someone replies to you.', state: notifReplies, set: setNotifReplies },
                    { label: 'Announcements', desc: 'Site news and offers.', state: notifAnnouncements, set: setNotifAnnouncements },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-3 border-t border-white/5">
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{item.desc}</p>
                      </div>
                      <button
                        onClick={() => item.set(!item.state)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${item.state ? 'bg-violet-600' : 'bg-white/15'}`}
                      >
                        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${item.state ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  ))}
                  <Button className="bg-violet-600 hover:bg-violet-700 text-white">Save</Button>
                </div>
              )}

              {/* Reading */}
              {settingsTab === 'reading' && (
                <div className="bg-white/3 border border-white/5 rounded-2xl p-5 space-y-5">
                  <div>
                    <h3 className="font-semibold text-sm">Reading preferences</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Saved to your account so your reader looks the same on every device.</p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-medium text-zinc-400 mb-2">Theme</p>
                      <div className="grid grid-cols-2 gap-2">
                        {(['night','onyx','sepia','light'] as const).map((t) => (
                          <button key={t} onClick={() => setTheme(t)}
                            className={`py-2.5 rounded-lg text-sm font-medium border transition-all capitalize ${theme===t ? 'bg-violet-600 border-violet-500 text-white' : 'bg-white/5 border-white/10 text-zinc-400 hover:border-white/20'}`}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-zinc-400 mb-2">Reading mode</p>
                      <div className="grid grid-cols-2 gap-2">
                        {(['webtoon','paged'] as const).map((m) => (
                          <button key={m} onClick={() => setReadingMode(m)}
                            className={`py-2.5 rounded-lg text-sm font-medium border transition-all capitalize ${readingMode===m ? 'bg-violet-600 border-violet-500 text-white' : 'bg-white/5 border-white/10 text-zinc-400 hover:border-white/20'}`}>
                            {m.charAt(0).toUpperCase()+m.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-zinc-400 mb-2">Image fit</p>
                      <div className="grid grid-cols-2 gap-2">
                        {(['fit-width','original'] as const).map((f) => (
                          <button key={f} onClick={() => setImageFit(f)}
                            className={`py-2.5 rounded-lg text-sm font-medium border transition-all ${imageFit===f ? 'bg-violet-600 border-violet-500 text-white' : 'bg-white/5 border-white/10 text-zinc-400 hover:border-white/20'}`}>
                            {f === 'fit-width' ? 'Fit width' : 'Original'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-zinc-400 mb-2">Page gap (webtoon)</p>
                      <div className="grid grid-cols-3 gap-2">
                        {(['none','small','large'] as const).map((g) => (
                          <button key={g} onClick={() => setPageGap(g)}
                            className={`py-2.5 rounded-lg text-sm font-medium border transition-all capitalize ${pageGap===g ? 'bg-violet-600 border-violet-500 text-white' : 'bg-white/5 border-white/10 text-zinc-400 hover:border-white/20'}`}>
                            {g.charAt(0).toUpperCase()+g.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button className="bg-violet-600 hover:bg-violet-700 text-white">Save preferences</Button>
                </div>
              )}

              {/* Appearance */}
              {settingsTab === 'appearance' && (
                <div className="bg-white/3 border border-white/5 rounded-2xl p-5 space-y-4">
                  <div>
                    <h3 className="font-semibold text-sm">Site appearance</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Changes the Wolftoon theme across the whole site. Applies instantly and is saved in this browser.</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-zinc-400 mb-2">Theme</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(['Night','Onyx','Sepia','Light'] as const).map((t) => (
                        <button key={t}
                          className={`py-2.5 rounded-lg text-sm font-medium border transition-all ${theme === t.toLowerCase() ? 'bg-violet-600 border-violet-500 text-white' : 'bg-white/5 border-white/10 text-zinc-400 hover:border-white/20'}`}
                          onClick={() => setTheme(t.toLowerCase() as any)}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500">The reader has its own separate theme under Reading.</p>
                </div>
              )}

              {/* Customize */}
              {settingsTab === 'customize' && (
                <div className="bg-white/3 border border-white/5 rounded-2xl p-5 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: accentColor + '30' }}>
                      <Palette className="h-5 w-5" style={{ color: accentColor }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Color of favorites</h3>
                      <p className="text-xs text-zinc-500">Choose the accent color for your bookmarked series cards.</p>
                    </div>
                  </div>
                  <div className="border border-white/10 rounded-xl p-4 flex items-center gap-3" style={{ borderColor: accentColor + '40' }}>
                    <div className="w-10 h-10 rounded-xl" style={{ backgroundColor: accentColor }} />
                    <div>
                      <p className="text-sm font-semibold">Card preview</p>
                      <p className="text-xs text-zinc-500">This is the accent your favorites will use.</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-zinc-400 mb-3">Preset colors</p>
                    <div className="grid grid-cols-4 gap-2">
                      {presetColors.map((c) => (
                        <button key={c} onClick={() => setAccentColor(c)}
                          className="w-full aspect-square rounded-xl flex items-center justify-center transition-transform hover:scale-105"
                          style={{ backgroundColor: c }}>
                          {accentColor === c && <span className="text-white text-base">✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-zinc-400 mb-2">Custom color</p>
                    <div className="flex items-center gap-2">
                      <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)}
                        className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 cursor-pointer" />
                      <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)}
                        className="flex-1 bg-white/5 border-white/10 text-zinc-200 h-9 text-sm font-mono" />
                      <Button size="sm" onClick={() => {}} className="bg-violet-600 hover:bg-violet-700 text-white h-9">Save</Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Blocked */}
              {settingsTab === 'blocked' && (
                <div className="bg-white/3 border border-white/5 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                      <ShieldOff className="h-5 w-5 text-red-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Blocked users</h3>
                      <p className="text-xs text-zinc-500">You won't see comments from anyone you block.</p>
                    </div>
                  </div>
                  <div className="border border-white/8 rounded-xl p-6 text-center">
                    <p className="text-zinc-500 text-sm">You haven't blocked anyone.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default Profile;
