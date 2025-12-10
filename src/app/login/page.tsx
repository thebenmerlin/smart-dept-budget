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
      const success = await login(email, password);
      if (success) {
        router.push('/');
      } else {
        setError('Invalid email or password.  Try demo credentials below.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brandNavy to-brandPrimary p-12 flex-col justify-between">
        <div>
          <img src="/logo.jpg" alt="RSCOE Logo" className="w-16 h-16 rounded-xl object-cover mb-6" />
          <h1 className="text-3xl font-bold text-white mb-2">JSPM&apos;s Rajarshi Shahu</h1>
          <h2 className="text-2xl font-bold text-white/90 mb-1">College of Engineering</h2>
          <p className="text-white/70 text-lg">Department of Computer Science & Business Systems</p>
        </div>
        <div className="space-y-6">
          <div className="bg-white/10 backdrop-blur rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-3">Enterprise Budget Management</h3>
            <ul className="space-y-2 text-white/80 text-sm">
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Real-time budget tracking & analytics
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Category-wise expense management
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Receipt verification & audit trails
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                NBA/NAAC compliant reporting
              </li>
            </ul>
          </div>
          <p className="text-white/50 text-xs">
            © 2024 JSPM&apos;s RSCOE. Enterprise Budget Suite v1.0
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <img src="/logo.jpg" alt="RSCOE Logo" className="w-16 h-16 rounded-xl object-cover mx-auto mb-4" />
            <h1 className="text-xl font-bold text-brandNavy">JSPM&apos;s RSCOE</h1>
            <p className="text-sm text-slate-500">CSBS Department</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900">Welcome Back</h2>
              <p className="text-slate-500 mt-1">Sign in to access the budget portal</p>
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
                onChange={(e) => setEmail(e. target.value)}
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

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-slate-600">
                  <input type="checkbox" className="rounded border-slate-300" />
                  Remember me
                </label>
                <a href="#" className="text-brandNavy hover:underline">Forgot password?</a>
              </div>

              <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
                Sign In
              </Button>
            </form>

            {/* Demo Credentials */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              <p className="text-xs text-slate-500 text-center mb-3">Demo Credentials (use any password with 4+ chars)</p>
              <div className="space-y-2">
                {[
                  { email: 'admin@rscoe.edu.in', role: 'Admin' },
                  { email: 'hod@rscoe.edu.in', role: 'HOD' },
                  { email: 'staff@rscoe.edu.in', role: 'Staff' },
                ].map((cred) => (
                  <button
                    key={cred.email}
                    type="button"
                    onClick={() => {
                      setEmail(cred.email);
                      setPassword('demo1234');
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors text-sm"
                  >
                    <span className="text-slate-600">{cred. email}</span>
                    <span className="text-xs font-medium text-brandNavy bg-brandNavy/10 px-2 py-0.5 rounded">
                      {cred.role}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            Protected by enterprise-grade security
          </p>
        </div>
      </div>
    </div>
  );
}