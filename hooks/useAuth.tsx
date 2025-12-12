import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthUser } from '../types';
import { login as loginRequest, fetchCurrentUser, getAuthToken, setAuthToken } from '../services/apiClient';
import { mockFetchCurrentUser } from '../services/mockApi';

const DEMO_USER_STORAGE_KEY = 'pharmacy_nrft_demo_user';
const MOCK_TOKEN_PREFIX = 'mock-';
const DEMO_PHARMACY: AuthUser['pharmacy'] = {
  id: 'demo-pharmacy',
  name: 'NRFT 데모 약국',
};
const AUTO_USER: AuthUser = {
  id: 'pharmacist-1',
  email: 'pharmacist@example.com',
  name: '데모 약사',
  role: 'PHARMACIST',
  pharmacy: DEMO_PHARMACY,
};
const AUTO_TOKEN = `${MOCK_TOKEN_PREFIX}auto`;

const isMockToken = (value: string | null): value is string =>
  typeof value === 'string' && value.startsWith(MOCK_TOKEN_PREFIX);

const getStoredDemoUser = (): AuthUser | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = window.localStorage.getItem(DEMO_USER_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
};

const persistDemoUser = (user: AuthUser | null) => {
  if (typeof window === 'undefined') {
    return;
  }
  if (user) {
    window.localStorage.setItem(DEMO_USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(DEMO_USER_STORAGE_KEY);
  }
};

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (payload: { email: string; password: string }) => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => getAuthToken());
  const [user, setUser] = useState<AuthUser | null>(() => getStoredDemoUser());
  const [loading, setLoading] = useState<boolean>(() => Boolean(token));

  useEffect(() => {
    let isMounted = true;

    if (!token) {
      setUser(null);
      persistDemoUser(null);
      setLoading(false);
      return;
    }

    const loadUserData = async () => {
      setLoading(true);

      if (isMockToken(token)) {
        const storedUser = getStoredDemoUser();
        if (storedUser) {
          if (isMounted) {
            setUser(storedUser);
            setLoading(false);
          }
          return;
        }
      }

      try {
        const currentUser = isMockToken(token)
          ? await mockFetchCurrentUser()
          : await fetchCurrentUser();
        if (!isMounted) return;
        setUser(currentUser);
        if (isMockToken(token)) {
          persistDemoUser(currentUser);
        } else {
          persistDemoUser(null);
        }
      } catch {
        if (!isMounted) return;
        if (isMockToken(token)) {
          try {
            const fallbackUser = await mockFetchCurrentUser();
            if (!isMounted) return;
            setUser(fallbackUser);
            persistDemoUser(fallbackUser);
          } catch {
            setToken(null);
            setAuthToken(null);
            persistDemoUser(null);
            setUser(null);
          }
        } else {
          setToken(null);
          setAuthToken(null);
          persistDemoUser(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadUserData();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const login = useCallback(async (payload: { email: string; password: string }) => {
    const response = await loginRequest(payload);
    setAuthToken(response.token);
    setToken(response.token);
    setUser(response.user);
    persistDemoUser(null);
  }, []);

  const demoLogin = useCallback(async () => {
    setLoading(true);
    setAuthToken(AUTO_TOKEN);
    setToken(AUTO_TOKEN);
    setUser(AUTO_USER);
    persistDemoUser(AUTO_USER);
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
    persistDemoUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(token && user),
      login,
      demoLogin,
      logout,
    }),
    [user, token, loading, login, logout, demoLogin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
