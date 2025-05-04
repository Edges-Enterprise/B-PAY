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
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
  // Add any additional profile fields here
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, username: string, password: string) => Promise<{
    user: User | null;
    error: AuthError | null;
  }>;
  signIn: (email: string, password: string) => Promise<{
    user: User | null;
    error: AuthError | null;
  }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{
    profile: UserProfile | null;
    error: AuthError | null;
  }>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signUp: async () => ({ user: null, error: null }),
  signIn: async () => ({ user: null, error: null }),
  signOut: async () => ({ error: null }),
  updateProfile: async () => ({ profile: null, error: null }),
  refreshSession: async () => {},
});

export default function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
    if (!userId) return null;

    try {
      // Get auth metadata first
      const { data: { user } } = await supabase.auth.getUser();
      
      // Then get profile data
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      // Merge data from both sources
      const mergedProfile = {
        id: userId,
        username: user?.user_metadata?.username || profileData?.username,
        email: user?.email || profileData?.email,
        created_at: profileData?.created_at || new Date().toISOString(),
        updated_at: profileData?.updated_at || new Date().toISOString(),
      };

      setProfile(mergedProfile);
      return mergedProfile;
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
      return null;
    }
  };

  const refreshSession = async () => {
    setLoading(true);
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      
      setSession(session);
      if (session?.user?.id) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    
    const initializeAuth = async () => {
      await refreshSession();
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        
        if (event === 'SIGNED_IN' && session?.user?.id) {
          await fetchProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, username: string, password: string) => {
    setLoading(true);
    try {
      // Validate input
      if (!email || !username || !password) {
        throw new Error('Email, username, and password are required');
      }

      // Check username availability
      const { data: usernameCheck, error: usernameError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .maybeSingle();

      if (usernameError) throw usernameError;
      if (usernameCheck) {
        throw new Error('Username already exists');
      }

      // Create user with metadata
      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      });

      if (signUpError) throw signUpError;
      if (!user) throw new Error('User creation failed');

      // Wait for profile to be created by trigger
      let profile = null;
      let attempts = 0;
      
      while (attempts < 5 && !profile) {
        profile = await fetchProfile(user.id);
        if (!profile) {
          await new Promise(resolve => setTimeout(resolve, 500));
          attempts++;
        }
      }

      if (!profile) {
        throw new Error('Profile creation failed');
      }

      return { user, error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { 
        user: null, 
        error: {
          message: error instanceof Error ? error.message : 'Sign up failed',
          name: 'SignUpError'
        } as AuthError
      };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data: { user, session }, error } = 
        await supabase.auth.signInWithPassword({ email, password });

      if (error) throw error;
      if (!user?.id) throw new Error('Authentication failed');

      const profile = await fetchProfile(user.id);
      if (!profile) {
        throw new Error('Profile not found');
      }

      return { user: { ...user, profile }, error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { 
        user: null, 
        error: {
          message: error instanceof Error ? error.message : 'Sign in failed',
          name: 'SignInError'
        } as AuthError
      };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setProfile(null);
      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { 
        error: {
          message: error instanceof Error ? error.message : 'Sign out failed',
          name: 'SignOutError'
        } as AuthError
      };
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!profile?.id) {
      return {
        profile: null,
        error: { message: 'No user profile found', name: 'ProfileError' } as AuthError
      };
    }

    try {
      // Update auth metadata if username changed
      if (updates.username) {
        const { error: authError } = await supabase.auth.updateUser({
          data: { username: updates.username }
        });
        if (authError) throw authError;
      }

      // Update profile table
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Profile update failed');

      // Refresh local state
      const updatedProfile = await fetchProfile(profile.id);
      return { profile: updatedProfile, error: null };
    } catch (error) {
      console.error('Update profile error:', error);
      return { 
        profile: null,
        error: {
          message: error instanceof Error ? error.message : 'Profile update failed',
          name: 'ProfileUpdateError'
        } as AuthError
      };
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
    refreshSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};