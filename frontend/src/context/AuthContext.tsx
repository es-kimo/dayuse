import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { authApi } from '../api/auth';
import { clearExperimentCache } from '../utils/experiment';
import { clearPendingExperimentRequests } from '../hooks/useExperiment';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (accessToken: string, refreshToken: string, user: User) => void;
  logout: () => void;
  updateUserNickname: (newNickname: string) => Promise<void>;
  updateUserProfile: (data: { nickname?: string; profileImageUrl?: string | null }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const profile = await authApi.getMe();
          setUser(profile);
        } catch (err) {
          console.error('Failed to restore auth session:', err);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setUser(null);
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = (accessToken: string, refreshToken: string, userData: User) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    // 이전 사용자의 Experiment 배정·Exposure 기록이 새 사용자에게 새지 않게 비운다.
    clearExperimentCache();
    clearPendingExperimentRequests();
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    clearExperimentCache();
    clearPendingExperimentRequests();
    setUser(null);
    window.location.href = '/login';
  };

  const updateUserProfile = async (data: { nickname?: string; profileImageUrl?: string | null }) => {
    const updated = await authApi.updateProfile(data);
    setUser(updated);
  };

  const updateUserNickname = async (newNickname: string) => {
    await updateUserProfile({ nickname: newNickname });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        updateUserNickname,
        updateUserProfile,
      }}
    >

      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
