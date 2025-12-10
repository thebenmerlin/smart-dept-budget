'use client';
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { mockUsers } from '../data/mock';

type User = {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'hod' | 'staff';
  department: string;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password:  string) => Promise<boolean>;
  logout:  () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for saved session
    const saved = localStorage.getItem('auth_user');
    if (saved) {
      setUser(JSON.parse(saved));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Demo: accept any password for mock users
    const found = mockUsers.find((u) => u.email. toLowerCase() === email.toLowerCase());
    if (found && password. length >= 4) {
      const userData = found as User;
      setUser(userData);
      localStorage.setItem('auth_user', JSON. stringify(userData));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_user');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}