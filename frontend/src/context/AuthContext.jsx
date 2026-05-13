import React, { createContext, useState, useEffect } from 'react';
import api from '../api/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const formData = new URLSearchParams();
      formData.append('username', email); // OAuth2 requires 'username'
      formData.append('password', password);
      
      const response = await api.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      
      const { access_token, user_id, role } = response.data;
      
      // Save token and basic user info
      localStorage.setItem('token', access_token);
      
      const userData = { id: user_id, email, role };
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      
      return { success: true, role };
    } catch (error) {
      console.error("Login error:", error.response?.data || error);
      return { 
        success: false, 
        message: error.response?.data?.detail || "An error occurred during login." 
      };
    }
  };

  const register = async (name, email, password, role) => {
    try {
      await api.post('/auth/register', { name, email, password, role });
      // Optionally auto-login after register
      return await login(email, password);
    } catch (error) {
      console.error("Registration error:", error.response?.data || error);
      return { 
        success: false, 
        message: error.response?.data?.detail || "An error occurred during registration." 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const updateUser = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser: updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
