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

  const getAuthErrorMessage = (error: any): { title: string; description: string } => {
    const errorMessage = error.message?.toLowerCase() || '';

    // Invalid credentials
    if (errorMessage.includes('invalid login credentials') ||
      errorMessage.includes('invalid email or password') ||
      errorMessage.includes('email not confirmed')) {
      return {
        title: 'Invalid credentials',
        description: 'The email or password you entered is incorrect. Please check and try again.'
      };
    }

    // User not found / doesn't exist
    if (errorMessage.includes('user not found') ||
      errorMessage.includes('no user found') ||
      errorMessage.includes('invalid user')) {
      return {
        title: 'Account not found',
        description: 'No account exists with this email address. Please register first or check your email.'
      };
    }

    // Email not confirmed
    if (errorMessage.includes('email not confirmed')) {
      return {
        title: 'Email not verified',
        description: 'Please check your email and click the verification link before signing in.'
      };
    }

    // Too many requests
    if (errorMessage.includes('too many requests') || errorMessage.includes('rate limit')) {
      return {
        title: 'Too many attempts',
        description: 'Please wait a moment before trying again.'
      };
    }

    // Weak password
    if (errorMessage.includes('password') && errorMessage.includes('weak')) {
      return {
        title: 'Password too weak',
        description: 'Please choose a stronger password with at least 6 characters.'
      };
    }

    // Email already exists
    if (errorMessage.includes('already registered') ||
      errorMessage.includes('email already exists') ||
      errorMessage.includes('user already registered')) {
      return {
        title: 'Account already exists',
        description: 'An account with this email already exists. Please sign in instead.'
      };
    }

    // Network/connection errors
    if (errorMessage.includes('network') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('connection')) {
      return {
        title: 'Connection error',
        description: 'Unable to connect to the server. Please check your internet connection.'
      };
    }

    // Default fallback
    return {
      title: 'Authentication failed',
      description: error.message || 'An unexpected error occurred. Please try again.'
    };
  };

  // const register = async (email: string, name: string, password: string): Promise<boolean> => {
  //   try {
  //     console.log('📝 Starting registration for:', email);

  //     // Quick environment check
  //     const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  //     const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  //     if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
  //       toast.error('Database not configured', {
  //         description: 'Please connect to Supabase first',
  //         duration: 4000,
  //       });
  //       return false;
  //     }

  //     const { data, error } = await supabase.auth.signUp({
  //       email,
  //       password,
  //       options: {
  //         data: {
  //           name: name,
  //         },
  //       },
  //     });

  //     if (error) {
  //       console.error('❌ Registration error:', error.message);
  //       const { title, description } = getAuthErrorMessage(error);
  //       toast.error(title, {
  //         description,
  //         duration: 5000,
  //       });
  //       return false;
  //     }

  //     if (data.user) {
  //       console.log('✅ Registration successful - user created in auth.users');
  //       console.log('🔄 Database trigger should create record in public.users');

  //       toast.success('🎉 Welcome to TuduAI!', {
  //         description: `Account created successfully for ${name}`,
  //         duration: 4000,
  //       });
  //       return true;
  //     }

  //     return false;
  //   } catch (error: any) {
  //     console.error('💥 Registration error:', error);
  //     const { title, description } = getAuthErrorMessage(error);
  //     toast.error(title, {
  //       description,
  //       duration: 4000,
  //     });
  //     return false;
  //   }
  // };
  const register = async (email: string, name: string, password: string): Promise<string | null> => {
    try {
      console.log('📝 Starting registration for:', email);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
        toast.error('Database not configured', {
          description: 'Please connect to Supabase first',
          duration: 4000,
        });
        return 'Supabase not configured';
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      if (error) {
        console.error('❌ Registration error:', error.message);
        const { title, description } = getAuthErrorMessage(error);
        toast.error(title, { description, duration: 5000 });
        return description; // Return error string
      }

      if (data.user) {
        console.log('✅ Registration successful');
        toast.success('🎉 Welcome to TuduAI!', {
          description: `Account created for ${name}`,
          duration: 4000,
        });
        return null; // Success
      }

      return 'Something went wrong. Please try again.';
    } catch (error: any) {
      console.error('💥 Registration error:', error);
      const { title, description } = getAuthErrorMessage(error);
      toast.error(title, { description, duration: 5000 });
      return description;
    }
  };

  // const login = async (email: string, password: string): Promise<boolean> => {
  //   try {
  //     console.log('🔑 Starting login for:', email);

  //     // Quick environment check
  //     const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  //     const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  //     if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
  //       toast.error('Database not configured', {
  //         description: 'Please connect to Supabase first',
  //         duration: 4000,
  //       });
  //       return false;
  //     }

  //     const { data, error } = await supabase.auth.signInWithPassword({
  //       email,
  //       password,
  //     });

  //     if (error) {
  //       console.error('❌ Login error:', error.message);
  //       const { title, description } = getAuthErrorMessage(error);

  //       // Special handling for user not found case
  //       if (error.message?.toLowerCase().includes('invalid login credentials')) {
  //         // Check if it's likely a "user doesn't exist" case by trying to check if email exists
  //         // We'll show a more helpful message
  //         toast.error('Invalid credentials', {
  //           description: 'The email or password is incorrect. If you don\'t have an account, please register first.',
  //           duration: 6000,
  //         });
  //       } else {
  //         toast.error(title, {
  //           description,
  //           duration: 5000,
  //         });
  //       }
  //       return false;
  //     }

  //     if (data.user) {
  //       console.log('✅ Login successful');
  //       const userName = data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User';

  //       toast.success('🎉 Welcome back!', {
  //         description: `Logged in as ${userName}`,
  //         duration: 3000,
  //       });
  //       return true;
  //     }

  //     return false;
  //   } catch (error: any) {
  //     console.error('💥 Login error:', error);
  //     const { title, description } = getAuthErrorMessage(error);
  //     toast.error(title, {
  //       description,
  //       duration: 4000,
  //     });
  //     return false;
  //   }
  // };
  const login = async (email: string, password: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        const { title, description } = getAuthErrorMessage(error);
        toast.error(title, { description });
        return description; // return this to be displayed on the form
      }

      if (data.user) {
        const userName = data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User';
        toast.success('🎉 Welcome back!', {
          description: `Logged in as ${userName}`,
          duration: 3000,
        });
        return null; // success
      }

      return 'Login failed. Please try again.';
    } catch (error: any) {
      const { title, description } = getAuthErrorMessage(error);
      toast.error(title, { description });
      return description;
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
  return <AuthContext.Provider value={value as unknown as AuthContextType}>{children}</AuthContext.Provider>;
};