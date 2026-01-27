import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../services/auth';
import { User } from '../types';
import { X } from 'lucide-react';

async function requestInvite(email: string) {
  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = await res.json().catch(() => ({}));

  if (res.ok) return { ok: true as const, data };

  return { ok: false as const, status: res.status, data };
}

async function joinWaitlist(email: string) {
  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/waitlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) throw new Error(data?.error || "Waitlist failed");
  return data;
}

interface LoginProps {
  onClose: () => void;
  onSuccess: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onClose, onSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(true); // Default to sign up for new users
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [betaFull, setBetaFull] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage('');

    if (isSignUp) {
      // Signup mode - request invite (email only)
      if (!email) {
        setError('Please enter your email');
        return;
      }

      setLoading(true);

      const emailNorm = email.trim().toLowerCase();
      const result = await requestInvite(emailNorm);

      if (result.ok) {
        setMessage("You're in! Check your email for your invite link.");
      } else if (result.status === 403 && result.data?.code === "beta_full") {
        setBetaFull(true);
        setError("Beta is full. Join the waitlist to get notified when a spot opens.");
      } else {
        setError(result.data?.error || "Signup failed. Please try again.");
      }

      setLoading(false);
    } else {
      // Login mode - use password
      if (!email || !password) {
        setError('Please enter email and password');
        return;
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }

      setLoading(true);

      try {
        const user = await loginUser(email, password);
        onSuccess(user);
      } catch (err: any) {
        setError(err.message || 'Authentication failed');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 light">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center mb-6">
          <div className="h-12 w-12 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-3">
            LQ
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isSignUp ? 'Join the Beta' : 'Welcome back'}
          </h2>
          <p className="text-gray-500 mt-1">
            {isSignUp ? 'Enter your email to request an invite' : 'Sign in to continue'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="you@example.com"
              required
            />
          </div>

          {!isSignUp && (
            <>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="At least 6 characters"
                  required
                />
              </div>
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/forgot-password');
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-50 text-green-600 px-4 py-2 rounded-lg text-sm">
              {message}
            </div>
          )}

          {!betaFull && (
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-50"
            >
              {loading ? 'Please wait...' : isSignUp ? 'Request Invite' : 'Sign In'}
            </button>
          )}

          {betaFull && (
            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                const emailNorm = email.trim().toLowerCase();
                if (!emailNorm) {
                  setError('Please enter your email');
                  return;
                }
                try {
                  setLoading(true);
                  await joinWaitlist(emailNorm);
                  setMessage("You're on the waitlist. We'll email you when a spot opens.");
                  setBetaFull(false);
                  setError(null);
                } catch (e: any) {
                  setError(e.message || "Waitlist failed. Please try again.");
                } finally {
                  setLoading(false);
                }
              }}
              className="w-full py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition disabled:opacity-50"
            >
              {loading ? 'Please wait...' : 'Join Waitlist'}
            </button>
          )}
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setMessage('');
            }}
            className="text-primary hover:underline text-sm"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
