
import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';

export default function Login() {
  const { setUserRole, setUser, setToken } = useAppContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiUrl}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        setUserRole(data.user?.role || "");
        setUser(data.user);
        setToken(data.token);
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-sky-50 to-blue-50 font-sans pt-8"
      style={{ fontFamily: 'Montserrat, Lato, Roboto, Open Sans, sans-serif' }}
    >
      <div className="w-full max-w-md mx-auto">
        {/* Login Card */}
        <div className="bg-white rounded-xl shadow-2xl p-8 border border-blue-200">
          {/* CorePTO Branding - Bee Themed */}
          <div className="w-full mb-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-4xl font-extrabold bg-gradient-to-br from-gray-800 via-gray-700 to-gray-600 bg-clip-text text-transparent tracking-tight leading-none">Core</span>
              <div className="relative flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2.5"/>
                  <circle cx="12" cy="12" r="4" fill="currentColor"/>
                </svg>
                <div className="absolute inset-0 w-6 h-6 bg-blue-500 rounded-full opacity-25 blur-md animate-pulse"></div>
              </div>
              <span className="text-4xl font-extrabold bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 bg-clip-text text-transparent tracking-tight leading-none">PTO</span>
            </div>
            
            <div className="w-32 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent mx-auto mb-3"></div>
            <p className="text-blue-700 font-semibold text-xs tracking-[0.2em] uppercase">Leave Management System</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-1">Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-900 mb-1">Password</label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Password"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center text-sm text-gray-600">
                <input type="checkbox" className="mr-2 accent-blue-600" /> Remember Me
              </label>
              <a href="/reset-password" className="text-xs text-blue-600 hover:text-blue-800 hover:underline">Forgot Password?</a>
            </div>
            {error && <div className="text-red-600 text-sm text-center">{error}</div>}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-2 rounded-lg shadow-lg transition duration-150"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
          <div className="mt-6 text-center">
            <span className="text-gray-600">Don't have an account?</span>
            <a href="/register" className="ml-2 inline-block border-2 border-blue-600 text-blue-700 font-semibold px-4 py-1 rounded-lg hover:bg-blue-50 transition">Sign Up</a>
          </div>
          
          {/* ZimWorx Logo at Bottom */}
          <div className="mt-8 pt-6 border-t border-blue-200">
            <div className="flex justify-center mb-3">
              <img src="/zimworx-logo.jpg" alt="ZimWorX Logo" className="h-16 w-auto opacity-80" />
            </div>
            <p className="text-center text-xs text-blue-600">
              © 2026 ZimWorx/GTS
            </p>
          </div>
        </div>
        {/* Support Link */}
        <div className="mt-6 text-center">
          <a href="/contact" className="text-sm text-blue-600 hover:text-blue-800 hover:underline">Contact Support</a>
        </div>
      </div>
    </div>
  );
}
