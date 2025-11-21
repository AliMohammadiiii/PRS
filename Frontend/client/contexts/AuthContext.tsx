import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserMeResponse } from 'src/types/api/auth';
import * as authApi from 'src/services/api/auth';

interface AuthContextType {
  user: UserMeResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserMeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user on mount if token exists
  useEffect(() => {
    const initAuth = async () => {
      const accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
      if (accessToken) {
        try {
          const userData = await authApi.getMe();
          setUser(userData);
        } catch (error) {
          // Token might be invalid, clear it
          sessionStorage.removeItem(ACCESS_TOKEN_KEY);
          sessionStorage.removeItem(REFRESH_TOKEN_KEY);
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    const response = await authApi.login({ username, password });
    // Store tokens first
    sessionStorage.setItem(ACCESS_TOKEN_KEY, response.access);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, response.refresh);
    
    // Small delay to ensure token is stored before making the next request
    // This ensures the interceptor can read the token from sessionStorage
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Fetch user info
    const userData = await authApi.getMe();
    setUser(userData);
  };

  const logout = () => {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const userData = await authApi.getMe();
      setUser(userData);
    } catch (error) {
      // If refresh fails, logout
      logout();
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Export token getters for API requests
export function getAccessToken(): string | null {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return sessionStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function setRefreshToken(token: string): void {
  sessionStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function clearTokens(): void {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}

