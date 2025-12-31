import React, { useState } from 'react';
import axios from 'axios';

const roles = [
  { value: 'csp', label: 'Client Success Partner (CSP)' },
  { value: 'admin', label: 'Admin' },
  { value: 'user', label: 'Team Member' }
];

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    try {
      const res = await axios.post('/api/register', form);
      if (res.data.success) setSuccess(true);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-sky-50 to-blue-50 font-sans pt-8"
      style={{ fontFamily: 'Montserrat, Lato, Roboto, Open Sans, sans-serif' }}
    >
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-xl shadow-2xl p-8 border border-blue-200">
          {/* CorePTO Branding */}
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
            <p className="text-blue-700 font-semibold text-xs tracking-[0.2em] uppercase">Create Account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-blue-900 mb-1">Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Full Name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-blue-900 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="your@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-blue-900 mb-1">Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Password"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-blue-900 mb-1">Role</label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                required
              >
                <option value="">Select role...</option>
                {roles.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            {error && <div className="text-red-600 text-sm text-center bg-red-50 p-2 rounded-lg">{error}</div>}
            {success && <div className="text-green-600 text-sm text-center bg-green-50 p-2 rounded-lg">Registration successful! You can now log in.</div>}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-2 rounded-lg shadow-lg transition duration-150"
            >
              Register
            </button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-blue-700">Already have an account?</span>
            <a href="/" className="ml-2 inline-block border-2 border-blue-600 text-blue-800 font-semibold px-4 py-1 rounded-lg hover:bg-blue-50 transition">Login</a>
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
          <a href="/contact" className="text-sm text-blue-700 hover:text-blue-900 hover:underline">Contact Support</a>
        </div>
      </div>
    </div>
  );
}

