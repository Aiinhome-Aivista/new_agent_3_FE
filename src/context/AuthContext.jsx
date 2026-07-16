import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser as loginApi } from '../api/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Failed to parse saved user session:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password, _rememberMe) => {
    setLoading(true);
    try {
      const response = await loginApi({ email, password });
      if (response.data && response.data.success) {
        const { access_token, id, full_name, role, email: userEmail } = response.data.data;
        const userData = { id, name: full_name, role, email: userEmail };

        setToken(access_token);
        setUser(userData);

        localStorage.setItem('token', access_token);
        localStorage.setItem('user', JSON.stringify(userData));
        return { success: true };
      }
      return { success: false, message: response.data.message || 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      const message = error.response?.data?.message || 'Invalid email or password';
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
