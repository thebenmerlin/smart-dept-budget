'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e:  React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        router. push('/');
      } else {
        setError(result. error || 'Invalid credentials');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillCredentials = (userEmail: string) => {
    setEmail(userEmail);
    setPassword('Admin@123');
    setError('');
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brandNavy to-brandPrimary p-12 flex-col justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">JSPM&apos;s Rajarshi Shahu</h1>
          <h2 className="text-2xl font-bold text-white/90 mb-1">College of Engineering</h2>
          <p className="text-white/70 text-lg">CSBS Department Budget System</p>
        </div>
        <div className="bg-white/10 backdrop-blur rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-3">Features</h3>
          <ul className="space-y-2 text-white/80 text-sm">
            <li>✓ Real-time budget tracking</li>
            <li>✓ Expense management & approval</li>
            <li>✓ Category-wise reporting</li>
            <li>✓ NBA/NAAC compliant exports</li>
          </ul>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900">Welcome Back</h2>
              <p className="text-slate-500 mt-1">Sign in to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@rscoe.edu.in"
                required
              />

              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />

              <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
                Sign In
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-200">
              <p className="text-xs text-slate-500 text-center mb-3">Quick Login (click to autofill)</p>
              <div className="space-y-2">
                {[
                  { email: 'admin@rscoe.edu.in', role: 'Admin' },
                  { email: 'hod@rscoe.edu.in', role: 'HOD' },
                  { email: 'staff@rscoe.edu.in', role: 'Staff' },
                ].map((cred) => (
                  <button
                    key={cred.email}
                    type="button"
                    onClick={() => fillCredentials(cred.email)}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors text-sm"
                  >
                    <span className="text-slate-600">{cred. email}</span>
                    <span className="text-xs font-medium text-brandNavy bg-brandNavy/10 px-2 py-0.5 rounded">
                      {cred.role}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 text-center mt-3">Password:  Admin@123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}