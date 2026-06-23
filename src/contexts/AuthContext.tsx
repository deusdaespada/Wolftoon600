import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isVip: boolean;
  isBanned: boolean;
  banInfo: { reason: string; expires_at: string | null; is_permanent: boolean } | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isVip, setIsVip] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [banInfo, setBanInfo] = useState<{ reason: string; expires_at: string | null; is_permanent: boolean } | null>(null);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Check if user is admin/vip and if banned
        if (session?.user) {
          setTimeout(() => {
            checkUserRoles(session.user.id);
            checkBanStatus(session.user.id);
          }, 0);
        } else {
          setIsAdmin(false);
          setIsVip(false);
          setIsBanned(false);
          setBanInfo(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkUserRoles(session.user.id);
        checkBanStatus(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserRoles = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      
      const roles = data?.map(r => r.role) || [];
      setIsAdmin(roles.includes('admin'));
      setIsVip(roles.includes('vip'));
    } catch (error) {
      console.error('Error checking user roles:', error);
      setIsAdmin(false);
      setIsVip(false);
    }
  };

  const checkBanStatus = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('banned_users')
        .select('reason, expires_at, is_permanent, banned_at')
        .eq('user_id', userId)
        .is('unbanned_at', null)
        .maybeSingle();
      
      if (data) {
        // Check if ban is still active
        const isActive = data.is_permanent || !data.expires_at || new Date(data.expires_at) > new Date();
        
        if (isActive) {
          setIsBanned(true);
          setBanInfo({
            reason: data.reason,
            expires_at: data.expires_at,
            is_permanent: data.is_permanent
          });
        } else {
          setIsBanned(false);
          setBanInfo(null);
        }
      } else {
        setIsBanned(false);
        setBanInfo(null);
      }
    } catch (error) {
      console.error('Error checking ban status:', error);
      setIsBanned(false);
      setBanInfo(null);
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          username,
        },
      },
    });
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      return { error };
    }

    // Check if user is banned after successful authentication
    if (data.user) {
      const { data: banData } = await supabase
        .from('banned_users')
        .select('reason, expires_at, is_permanent')
        .eq('user_id', data.user.id)
        .is('unbanned_at', null)
        .maybeSingle();
      
      if (banData) {
        const isActive = banData.is_permanent || !banData.expires_at || new Date(banData.expires_at) > new Date();
        
        if (isActive) {
          // Sign out the banned user immediately
          await supabase.auth.signOut();
          
          // Return special ban error with details
          return { 
            error: { 
              message: 'BANNED',
              banInfo: {
                reason: banData.reason,
                expires_at: banData.expires_at,
                is_permanent: banData.is_permanent
              }
            } 
          };
        }
      }
    }
    
    return { error: null };
  };

  const signOut = async () => {
    try {
      // Clear local state first
      setUser(null);
      setSession(null);
      setIsAdmin(false);
      setIsVip(false);
      setIsBanned(false);
      setBanInfo(null);
      
      // Then try to sign out from Supabase (may fail if session already expired)
      await supabase.auth.signOut();
    } catch (error) {
      // Even if signOut fails, local state is already cleared
      console.log('SignOut completed (session may have already expired)');
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      signUp, 
      signIn, 
      signOut, 
      isAdmin, 
      isVip,
      isBanned,
      banInfo
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
