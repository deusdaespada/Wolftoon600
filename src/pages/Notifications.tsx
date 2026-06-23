import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Trash2, BellOff, CheckCheck, ArrowLeft, RefreshCw, BookOpen, Crown, Trophy, MessageCircle, Settings2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import Header from '@/components/Header';
import PageTransition from '@/components/PageTransition';
import { useAuth } from '@/contexts/AuthContext';

const typeConfig: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  chapter: { icon: BookOpen, color: 'text-primary', bg: 'bg-primary/15' },
  system: { icon: Settings2, color: 'text-muted-foreground', bg: 'bg-muted/50' },
  vip: { icon: Crown, color: 'text-yellow-400', bg: 'bg-yellow-400/15' },
  achievement: { icon: Trophy, color: 'text-amber-400', bg: 'bg-amber-400/15' },
  comment: { icon: MessageCircle, color: 'text-blue-400', bg: 'bg-blue-400/15' },
};

type FilterTab = 'all' | 'unread' | 'chapter' | 'comment' | 'vip';

const Notifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  const filters: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'Todas' },
    { key: 'unread', label: 'Não Lidas' },
    { key: 'chapter', label: 'Capítulos' },
    { key: 'comment', label: 'Respostas' },
    { key: 'vip', label: 'VIP' },
  ];

  const filtered = useMemo(() => {
    switch (activeFilter) {
      case 'unread': return notifications.filter(n => !n.read);
      case 'chapter': return notifications.filter(n => n.type === 'chapter');
      case 'comment': return notifications.filter(n => n.type === 'comment');
      case 'vip': return notifications.filter(n => n.type === 'vip');
      default: return notifications;
    }
  }, [notifications, activeFilter]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: { label: string; items: typeof filtered }[] = [];
    const today: typeof filtered = [];
    const yesterday: typeof filtered = [];
    const thisWeek: typeof filtered = [];
    const older: typeof filtered = [];

    filtered.forEach(n => {
      const d = new Date(n.created_at);
      if (isToday(d)) today.push(n);
      else if (isYesterday(d)) yesterday.push(n);
      else if (isThisWeek(d)) thisWeek.push(n);
      else older.push(n);
    });

    if (today.length) groups.push({ label: 'Hoje', items: today });
    if (yesterday.length) groups.push({ label: 'Ontem', items: yesterday });
    if (thisWeek.length) groups.push({ label: 'Esta Semana', items: thisWeek });
    if (older.length) groups.push({ label: 'Anteriores', items: older });

    return groups;
  }, [filtered]);

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto max-w-2xl px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold">Notificações</h1>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-primary/15 text-primary text-xs font-bold rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button variant="ghost" size="icon" onClick={() => markAllAsRead()} className="h-8 w-8 hover:bg-primary/10 hover:text-primary" title="Marcar todas como lidas">
                  <CheckCheck className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-4">
            {filters.map(f => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeFilter === f.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Notification list */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <BellOff className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="font-medium">Tudo em dia!</p>
              <p className="text-sm text-muted-foreground mt-1">Nenhuma notificação no momento</p>
            </div>
          ) : (
            <div className="space-y-6">
              {grouped.map(group => (
                <div key={group.label}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">{group.label}</span>
                    <div className="flex-1 h-px bg-border/50" />
                  </div>
                  <div className="space-y-2">
                    {group.items.map(notification => {
                      const config = typeConfig[notification.type] || typeConfig.system;
                      const Icon = config.icon;
                      return (
                        <div
                          key={notification.id}
                          className={`group relative flex gap-3 p-4 rounded-xl border transition-all ${
                            !notification.read
                              ? 'bg-card border-primary/20 border-l-2 border-l-primary'
                              : 'bg-card/50 border-border/30 hover:bg-card/80'
                          }`}
                        >
                          {/* Icon */}
                          <div className={`shrink-0 h-10 w-10 rounded-full ${config.bg} flex items-center justify-center`}>
                            <Icon className={`h-5 w-5 ${config.color}`} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className={`text-sm leading-tight ${!notification.read ? 'font-bold' : 'font-medium'}`}>
                                  {notification.title}
                                  {!notification.read && (
                                    <span className="inline-block ml-1.5 h-2 w-2 rounded-full bg-primary" />
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                                  {notification.message}
                                </p>
                              </div>
                              {/* Actions */}
                              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                {!notification.read && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary"
                                    onClick={() => markAsRead(notification.id)}
                                    title="Marcar como lida"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() => deleteNotification(notification.id)}
                                  title="Excluir"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-[11px] text-primary/60 mt-1.5 font-medium">
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default Notifications;
