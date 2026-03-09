import { useState } from 'react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../lib/authStore';

interface AuthFormProps {
  onSuccess: () => void;
}

export default function AuthForm({ onSuccess }: AuthFormProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const body = mode === 'login'
        ? { email: form.email, password: form.password }
        : form;

      const data = await api.post<{ user: any; token: string }>(endpoint, body);
      setAuth(data.user, data.token);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #1a1a40 0%, #0d0d1a 70%)' }}>
      
      {/* Decorative board pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `repeating-conic-gradient(#fff 0% 25%, transparent 0% 50%)`,
          backgroundSize: '48px 48px',
        }} />

      <div className="relative w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">♟</div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
            Chess<span style={{ color: '#e94560' }}>Live</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: '#7a7a9a' }}>Real-time multiplayer chess</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6 shadow-2xl border"
          style={{ background: '#16213e', borderColor: '#2a2a4a' }}>
          
          {/* Tab switcher */}
          <div className="flex rounded-lg mb-6 p-1" style={{ background: '#0d0d1a' }}>
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                className="flex-1 py-2 rounded-md text-sm font-medium transition-all duration-200"
                style={{
                  background: mode === m ? '#e94560' : 'transparent',
                  color: mode === m ? '#fff' : '#7a7a9a',
                }}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#7a7a9a' }}>
                  Username
                </label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="e.g. GrandMaster99"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all"
                  style={{
                    background: '#0d0d1a',
                    border: '1px solid #2a2a4a',
                    color: '#e8e8f0',
                  }}
                  required
                  minLength={3}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#7a7a9a' }}>
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all"
                style={{
                  background: '#0d0d1a',
                  border: '1px solid #2a2a4a',
                  color: '#e8e8f0',
                }}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#7a7a9a' }}>
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all"
                style={{
                  background: '#0d0d1a',
                  border: '1px solid #2a2a4a',
                  color: '#e8e8f0',
                }}
                required
                minLength={6}
              />
            </div>

            {error && (
              <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(233,69,96,0.1)', color: '#e94560' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 disabled:opacity-50 mt-2"
              style={{ background: '#e94560', color: '#fff' }}
            >
              {loading ? '...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
