import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getUnreadDotStatus } from '../api/announcements';
import { useAuth } from './AuthContext';

interface AnnouncementNotificationContextType {
  hasUnread: boolean;
  unreadCount: number;
  refreshUnreadDot: () => Promise<void>;
  markUnreadLocally: (hasUnread: boolean) => void;
}

const AnnouncementNotificationContext = createContext<AnnouncementNotificationContextType | undefined>(undefined);

export const AnnouncementNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [hasUnread, setHasUnread] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadDot = useCallback(async () => {
    if (!isAuthenticated) {
      setHasUnread(false);
      setUnreadCount(0);
      return;
    }
    try {
      const res = await getUnreadDotStatus();
      setHasUnread(res.hasUnread);
      setUnreadCount(res.unreadNoticeCount);
    } catch {
      // Unread dot failure is non-blocking
    }
  }, [isAuthenticated]);

  const markUnreadLocally = useCallback((unread: boolean) => {
    setHasUnread(unread);
    if (!unread) {
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      void refreshUnreadDot();
    }
  }, [authLoading, isAuthenticated, refreshUnreadDot]);

  return (
    <AnnouncementNotificationContext.Provider
      value={{
        hasUnread,
        unreadCount,
        refreshUnreadDot,
        markUnreadLocally,
      }}
    >
      {children}
    </AnnouncementNotificationContext.Provider>
  );
};

export const useAnnouncementNotification = (): AnnouncementNotificationContextType => {
  const context = useContext(AnnouncementNotificationContext);
  if (!context) {
    throw new Error('useAnnouncementNotification must be used within an AnnouncementNotificationProvider');
  }
  return context;
};
