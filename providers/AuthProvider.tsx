import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/config/supabase';

type UserProfile = {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  updated_at?: string;
  // Add other user fields as needed
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, profileData?: Partial<UserProfile>) => Promise<{
    user: User | null;
    error: AuthError | null;
  }>;
  signIn: (email: string, password: string) => Promise<{
    user: User | null;
    error: AuthError | null;
  }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{
    data: UserProfile | null;
    error: AuthError | null;
  }>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signUp: async () => ({ user: null, error: null }),
  signIn: async () => ({ user: null, error: null }),
  signOut: async () => ({ error: null }),
  updateProfile: async () => ({ data: null, error: null }),
});

export default function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    const fetchInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session?.user) await fetchUserProfile(session.user.id);
      setLoading(false);
    };

    fetchInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users') // Using 'users' table instead of 'profiles'
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setProfile(null);
    }
  };

  const signUp = async (email: string, password: string, profileData?: Partial<UserProfile>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            email, // Store email in auth.users table
            ...profileData,
          },
        },
      });

      if (error) throw error;

      if (!data.user) {
        return {
          user: null,
          error: {
            name: 'PendingConfirmation',
            message: 'Confirmation email sent. Please verify your email to complete registration.',
          } as AuthError,
        };
      }

      // Create user record in users table
      const updates = {
        id: data.user.id,
        email,
        ...profileData,
        updated_at: new Date().toISOString(),
      };

      const { error: userError } = await supabase
        .from('users')
        .upsert(updates);

      if (userError) throw userError;

      await fetchUserProfile(data.user.id);

      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error: error as AuthError };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (data.user) await fetchUserProfile(data.user.id);

      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error: error as AuthError };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as AuthError };
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!session?.user) return { data: null, error: { message: 'No user session' } as AuthError };

    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.user.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as AuthError };
    }
  };

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
