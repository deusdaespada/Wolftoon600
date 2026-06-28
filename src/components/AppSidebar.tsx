import { NavLink, useLocation } from "react-router-dom";
import {
  Home, Library, Flame, Heart, History, Trophy, BookOpen, BookText,
  Users2, Gift, Crown, MessageCircle, Megaphone, Award, User as UserIcon,
  Settings, Bell, MessageSquare, LayoutDashboard, FolderKanban, FileText,
  Upload, UploadCloud, ImageIcon, Shield, Flag, BarChart3, Cog
} from "lucide-react";
import wolfLogo from "@/assets/wolftoon-wolf-logo.png";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { Badge } from "@/components/ui/badge";

type Item = { title: string; url: string; icon: any; badge?: number };

const mainMenu: Item[] = [
  { title: "Início", url: "/", icon: Home },
  { title: "Biblioteca", url: "/my-list", icon: Library },
  { title: "Tendências", url: "/catalog?sort=trending", icon: Flame },
  { title: "Favoritos", url: "/my-list?tab=favorites", icon: Heart },
  { title: "Histórico", url: "/profile?tab=history", icon: History },
  { title: "Rankings", url: "/ranking", icon: Trophy },
  { title: "Novels", url: "/catalog?type=novel", icon: BookText },
  { title: "Mangás", url: "/catalog?type=manga", icon: BookOpen },
  { title: "Comunidade", url: "/contact", icon: Users2 },
  { title: "Eventos", url: "/notifications", icon: Gift },
  { title: "VIP", url: "/vip", icon: Crown },
];

const socialMenu: Item[] = [
  { title: "Discord", url: "https://discord.gg/6wUg8wssQv", icon: MessageCircle },
  { title: "Anúncios", url: "/notifications", icon: Megaphone },
  { title: "Conquistas", url: "/profile?tab=achievements", icon: Award },
];

const userMenu: Item[] = [
  { title: "Meu Perfil", url: "/profile", icon: UserIcon },
  { title: "Configurações", url: "/profile?tab=settings", icon: Settings },
  { title: "Notificações", url: "/notifications", icon: Bell },
  { title: "Comentários", url: "/profile?tab=comments", icon: MessageSquare },
];

const adminMenu: Item[] = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Gerenciar Obras", url: "/admin?tab=titles", icon: FolderKanban },
  { title: "Capítulos", url: "/admin?tab=chapters", icon: FileText },
  { title: "Upload Individual", url: "/admin/upload-chapter", icon: Upload },
  { title: "Upload em Massa", url: "/admin/batch-upload", icon: UploadCloud },
  { title: "Criar Obra", url: "/create", icon: ImageIcon },
  { title: "Usuários", url: "/admin?tab=users", icon: Users2 },
  { title: "Moderação", url: "/admin?tab=moderation", icon: Shield },
  { title: "Denúncias", url: "/admin?tab=reports", icon: Flag },
  { title: "Estatísticas", url: "/admin?tab=stats", icon: BarChart3 },
  { title: "Modo Manutenção", url: "/admin?tab=maintenance", icon: Cog },
  { title: "Configurações", url: "/admin?tab=settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname, search } = useLocation();
  const { user, isAdmin } = useAuth();
  const { unreadCount } = useNotifications();

  const isActive = (url: string) => {
    const [path, query] = url.split("?");
    if (path !== pathname) return false;
    if (!query) return !search || search === "";
    return search.includes(query.split("=")[0] + "=" + (query.split("=")[1] || ""));
  };

  const renderItem = (item: Item) => {
    const external = item.url.startsWith("http");
    const showBadge = item.title === "Notificações" && unreadCount > 0;
    const content = (
      <>
        <item.icon className="h-[18px] w-[18px] shrink-0" />
        {!collapsed && <span className="truncate">{item.title}</span>}
        {!collapsed && showBadge && (
          <Badge className="ml-auto h-5 min-w-5 px-1.5 bg-destructive text-destructive-foreground text-[10px]">
            {unreadCount}
          </Badge>
        )}
      </>
    );
    return (
      <SidebarMenuItem key={item.title + item.url}>
        <SidebarMenuButton
          asChild
          isActive={!external && isActive(item.url)}
          tooltip={item.title}
        >
          {external ? (
            <a href={item.url} target="_blank" rel="noopener noreferrer">{content}</a>
          ) : (
            <NavLink to={item.url}>{content}</NavLink>
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <NavLink to="/" className="flex items-center gap-3 px-2 py-2 group">
          <div className="relative shrink-0">
            <div className="absolute inset-0 bg-primary/50 blur-md rounded-xl opacity-70" />
            <img
              src={wolfLogo}
              alt="Wolftoon"
              className="relative h-9 w-9 rounded-xl object-cover ring-2 ring-primary/40"
            />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-black text-base bg-gradient-to-r from-primary via-foreground to-primary-glow bg-clip-text text-transparent leading-none">
                Wolftoon
              </div>
              <div className="text-[9px] uppercase tracking-[0.25em] text-primary/70 font-bold mt-1">
                Reino dos Lobos
              </div>
            </div>
          )}
        </NavLink>
      </SidebarHeader>

      <SidebarContent className="px-1">
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Navegação</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{mainMenu.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Social</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{socialMenu.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel>Conta</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>{userMenu.map(renderItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isAdmin && (
          <SidebarGroup>
            {!collapsed && (
              <SidebarGroupLabel className="text-primary/80 font-bold">
                Admin
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>{adminMenu.map(renderItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed ? (
          <div className="px-3 py-2 text-[10px] text-muted-foreground">
            © {new Date().getFullYear()} Wolftoon
          </div>
        ) : null}
      </SidebarFooter>
    </Sidebar>
  );
}
