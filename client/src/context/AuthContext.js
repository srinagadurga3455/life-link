import React, { createContext, useContext, useState, useEffect } from 'react';
import * as API from '../api/endpoints';
import { saveToken, getToken, removeToken, saveUser, getUser, removeUser } from '../utils/storage';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in on app start
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const storedToken = await getToken();
        const storedUser = await getUser();
        
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(storedUser);
        }
      } catch (error) {
        console.error('Bootstrap error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  // Register user
  const register = async (name, phone, password) => {
    try {
      const response = await API.registerUser(name, phone, password);
      const { token: newToken, user: userData } = response.data;
      
      await saveToken(newToken);
      saveUser(userData);
      
      setToken(newToken);
      setUser(userData);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed',
      };
    }
  };

  // Login user
  const login = async (phone, password) => {
    try {
      const response = await API.loginUser(phone, password);
      const { token: newToken, user: userData } = response.data;
      
      await saveToken(newToken);
      saveUser(userData);
      
      setToken(newToken);
      setUser(userData);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed',
      };
    }
  };

  // Logout user
  const logout = async () => {
    try {
      await removeToken();
      await removeUser();
      setToken(null);
      setUser(null);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Logout failed',
      };
    }
  };

  const value = {
    user,
    token,
    isLoading,
    isSignedIn: !!token,
    register,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
