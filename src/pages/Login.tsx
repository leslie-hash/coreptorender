
import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Eye, EyeOff, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

export default function Login() {
  const { setUserRole, setUser, setToken } = useAppContext();
  const { theme, setTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    // Clear any old cached data before login
    localStorage.clear();
    sessionStorage.clear();
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiUrl}/api/login`, {
        method: "POST",        cache: 'no-store',        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        setUserRole(data.user?.role || "");
        setUser(data.user);
        setToken(data.token);
      } else {
        setError(data.error || data.message || "Login failed");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-sky-50 to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 font-sans pt-8 transition-colors duration-300"
      style={{ fontFamily: 'Montserrat, Lato, Roboto, Open Sans, sans-serif' }}
    >
      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2 rounded-lg bg-white dark:bg-gray-800 border border-blue-200 dark:border-gray-600 shadow-md hover:shadow-lg transition-all duration-200"
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? (
          <Sun className="w-5 h-5 text-yellow-500" />
        ) : (
          <Moon className="w-5 h-5 text-gray-600" />
        )}
      </button>

      <div className="w-full max-w-md mx-auto">
        {/* Login Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 border border-blue-200 dark:border-gray-700 transition-colors duration-300">
          {/* CorePTO Branding - Bee Themed */}
          <div className="w-full mb-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-4xl font-extrabold bg-gradient-to-br from-gray-800 via-gray-700 to-gray-600 dark:from-gray-100 dark:via-gray-200 dark:to-gray-300 bg-clip-text text-transparent tracking-tight leading-none">Core</span>
              <div className="relative flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2.5"/>
                  <circle cx="12" cy="12" r="4" fill="currentColor"/>
                </svg>
                <div className="absolute inset-0 w-6 h-6 bg-blue-500 rounded-full opacity-25 blur-md animate-pulse"></div>
              </div>
              <span className="text-4xl font-extrabold bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 dark:from-blue-400 dark:via-blue-500 dark:to-blue-600 bg-clip-text text-transparent tracking-tight leading-none">PTO</span>
            </div>
            
            <div className="w-32 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent mx-auto mb-3"></div>
            <p className="text-blue-700 dark:text-blue-400 font-semibold text-xs tracking-[0.2em] uppercase">Leave Management System</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-blue-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="yourname@zimworx.org"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Team members use @zimworx.org email</p>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-2 pr-10 border border-blue-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <input type="checkbox" className="mr-2 accent-blue-600" /> Remember Me
              </label>
              <a href="/reset-password" className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline">Forgot Password?</a>
            </div>
            {error && <div className="text-red-600 dark:text-red-400 text-sm text-center">{error}</div>}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 text-white font-bold py-2 rounded-lg shadow-lg transition duration-150"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
          <div className="mt-6 text-center">
            <span className="text-gray-600 dark:text-gray-400">Don't have an account?</span>
            <a href="/register" className="ml-2 inline-block border-2 border-blue-600 dark:border-blue-500 text-blue-700 dark:text-blue-400 font-semibold px-4 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 transition">Sign Up</a>
          </div>
          
          {/* ZimWorx Logo at Bottom */}
          <div className="mt-8 pt-6 border-t border-blue-200 dark:border-gray-700">
            <div className="flex justify-center mb-3">
              <img src="/zimworx-logo.jpg" alt="ZimWorX Logo" className="h-16 w-auto opacity-80 dark:opacity-70" />
            </div>
            <p className="text-center text-xs text-blue-600 dark:text-blue-400">
              © 2026 ZimWorx/GTS
            </p>
          </div>
        </div>
        {/* Support Link */}
        <div className="mt-6 text-center">
          <a href="/contact" className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline">Contact Support</a>
        </div>
      </div>
    </div>
  );
}
