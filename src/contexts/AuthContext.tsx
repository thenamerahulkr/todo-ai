import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, name: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const initializeAuth = async () => {
      try {
        console.log('🔐 Starting auth initialization...');
        
        // Check if Supabase is configured first (fast check)
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
          console.log('⚠️ Supabase not configured - running in demo mode');
          if (mounted) {
            setUser(null);
            setIsLoading(false);
          }
          return;
        }

        // Set a 3-second timeout for auth initialization
        timeoutId = setTimeout(() => {
          if (mounted && isLoading) {
            console.warn('⏰ Auth initialization timeout - forcing completion');
            setUser(null);
            setIsLoading(false);
          }
        }, 3000);

        // Get the current session (this should be fast)
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;

        // Clear timeout since we got a response
        clearTimeout(timeoutId);

        if (error) {
          console.error('❌ Error getting session:', error.message);
          setUser(null);
        } else if (session?.user) {
          console.log('✅ User session found:', session.user.email);
          setUser(session.user);
        } else {
          console.log('👤 No user session found');
          setUser(null);
        }
      } catch (error) {
        console.error('💥 Error in auth initialization:', error);
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          console.log('🏁 Auth initialization complete');
          setIsLoading(false);
        }
      }
    };

    // Start initialization immediately
    initializeAuth();

    // Listen for auth changes (but don't block initial load)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event);
      
      if (!mounted) return;

      if (session?.user) {
        console.log('👤 User logged in:', session.user.email);
        setUser(session.user);
      } else {
        console.log('👋 User logged out');
        setUser(null);
      }
      
      // Only set loading to false if it's still true
      if (isLoading) {
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      subscription.unsubscribe();
    };
  }, []); // Remove isLoading dependency to prevent loops

  const register = async (email: string, name: string, password: string): Promise<boolean> => {
    try {
      console.log('📝 Starting registration for:', email);
      
      // Quick environment check
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
        toast.error('Database not configured', {
          description: 'Please connect to Supabase first',
          duration: 4000,
        });
        return false;
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          },
        },
      });

      if (error) {
        console.error('❌ Registration error:', error.message);
        toast.error('Registration failed', {
          description: error.message,
          duration: 4000,
        });
        return false;
      }

      if (data.user) {
        console.log('✅ Registration successful');
        toast.success('🎉 Welcome to TuduAI!', {
          description: `Account created successfully for ${name}`,
          duration: 4000,
        });
        return true;
      }

      return false;
    } catch (error: any) {
      console.error('💥 Registration error:', error);
      toast.error('Registration failed', {
        description: 'Please try again',
        duration: 3000,
      });
      return false;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('🔑 Starting login for:', email);
      
      // Quick environment check
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
        toast.error('Database not configured', {
          description: 'Please connect to Supabase first',
          duration: 4000,
        });
        return false;
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Login error:', error.message);
        toast.error('Login failed', {
          description: error.message,
          duration: 4000,
        });
        return false;
      }

      if (data.user) {
        console.log('✅ Login successful');
        const userName = data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User';
        
        toast.success('🎉 Welcome back!', {
          description: `Logged in as ${userName}`,
          duration: 3000,
        });
        return true;
      }

      return false;
    } catch (error: any) {
      console.error('💥 Login error:', error);
      toast.error('Login failed', {
        description: 'Please try again',
        duration: 3000,
      });
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      console.log('👋 Logging out...');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Logout error:', error.message);
        toast.error('Logout failed', {
          description: error.message,
          duration: 3000,
        });
      } else {
        console.log('✅ Logout successful');
        toast.success('👋 See you later!', {
          description: 'Logged out successfully',
          duration: 2000,
        });
      }
    } catch (error: any) {
      console.error('💥 Logout error:', error);
      toast.error('Logout failed', {
        description: 'Please try again',
        duration: 3000,
      });
    }
  };

  const value = {
    user,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};