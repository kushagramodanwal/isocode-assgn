import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiRequest } from '../../lib/api';

export interface User {
  id: string;
  phone: string;
  role: 'retailer' | 'desk';
  retailerId: string | null;
  retailer?: {
    id: string;
    code: string;
    name: string;
    creditLimitPaise: string;
  };
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  requestOtp: (phone: string) => Promise<{ success: boolean; maskedPhone: string }>;
  verifyOtp: (phone: string, code: string) => Promise<User>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  requestOtp: async () => ({ success: false, maskedPhone: '' }),
  verifyOtp: async () => { throw new Error('Not implemented'); },
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiRequest<User>('/api/v1/auth/me')
      .then((data) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const requestOtp = async (phone: string) => {
    return apiRequest<{ success: boolean; maskedPhone: string }>(
      '/api/v1/auth/otp/request',
      {
        method: 'POST',
        body: JSON.stringify({ phone }),
      }
    );
  };

  const verifyOtp = async (phone: string, code: string) => {
    const res = await apiRequest<{ user: User; retailer?: any }>(
      '/api/v1/auth/otp/verify',
      {
        method: 'POST',
        body: JSON.stringify({ phone, code }),
      }
    );
    const fullUser: User = { ...res.user, retailer: res.retailer };
    setUser(fullUser);
    return fullUser;
  };

  const signOut = async () => {
    try {
      await apiRequest('/api/v1/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        requestOtp,
        verifyOtp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
