import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authAPI } from '../api/auth.api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Check for stored auth on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (token && storedUser) {
        try {
          // Verify token by fetching current user
          const res = await authAPI.getMe();
          // Response format: { success, data: user }
          const user = res?.data?.id ? res.data : (res?.id ? res : null);
          if (user) {
            setUser(user);
          } else {
            // Token invalid, clear storage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        } catch (error) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      console.log('Attempting login...', email);
      const res = await authAPI.login(email, password);
      console.log('Login response:', res);
      const data = res?.data || res;
      
      if (data.token && data.user) {
        const { user, token } = data;
        console.log('Login successful, storing token and user');
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);
        toast.success('Login successful!');
        navigate('/dashboard');
        return true;
      } else if (res.success === false || data.success === false) {
        console.log('Login failed:', data.message || res.message);
        toast.error(data.message || res.message || 'Login failed');
        return false;
      } else {
        console.log('Unexpected response format');
        toast.error('Login failed - unexpected response');
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.message || 'Login failed');
      return false;
    }
  };

  const register = async (name, email, password) => {
    try {
      const res = await authAPI.register(name, email, password);
      const data = res?.data || res;
      
      if (data.token && data.user) {
        const { user, token } = data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);
        toast.success('Registration successful!');
        navigate('/dashboard');
        return true;
      } else if (res.success === false || data.success === false) {
        toast.error(data.message || res.message || 'Registration failed');
        return false;
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const updateUser = (updatedData) => {
    const newUser = { ...user, ...updatedData };
    setUser(newUser);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
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

export default AuthContext;
