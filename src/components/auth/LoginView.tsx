import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

export const LoginView: React.FC = () => {
  const { login, loginAsGuestUser, loginEmail, registerEmail } = useApp();
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // 1. Handle Google Login
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      await login();
    } catch (err: any) {
      console.error("Google Login failed:", err);
      setError(err.message || "Failed to sign in with Google");
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Guest Login
  const handleGuestLogin = async () => {
    try {
      setLoading(true);
      setError('');
      await loginAsGuestUser();
    } catch (err: any) {
      console.error("Guest Login failed:", err);
      setError(err.message || "Failed to sign in as guest");
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Email Sign In / Sign Up
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      setLoading(true);
      setError('');
      if (isSignUp) {
        await registerEmail(email, password);
      } else {
        await loginEmail(email, password);
      }
    } catch (err: any) {
      console.error("Email Auth failed:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError('อีเมลนี้ถูกใช้งานแล้ว กรุณาเข้าสู่ระบบ');
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      } else if (err.code === 'auth/weak-password') {
        setError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      } else {
        setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FCF9F8] text-[#1A1A1A] flex flex-col items-center justify-center p-6 font-['Manrope'] selection:bg-accent">
      <div className="w-full max-w-sm bg-white border-4 border-[#1A1A1A] rounded-2xl p-8 shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] space-y-6 text-center">
        
        {/* Logo & Header */}
        <div className="space-y-2">
          <div className="w-16 h-16 bg-accent border-4 border-[#1A1A1A] rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
            ✍️
          </div>
          <h1 className="text-3xl font-black font-['Space_Grotesk'] tracking-tight">
            Doodle Life
          </h1>
          <p className="text-sm font-semibold text-gray-600">
            AI Productivity & Smart Planner
          </p>
        </div>

        {/* Action Box */}
        <div className="space-y-4 pt-2">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            {isSignUp ? 'Create a new account' : 'Sign in to access your space'}
          </p>

          {/* Error Message */}
          {error && (
            <div className="p-3 text-xs font-bold text-red-600 bg-red-100 border-2 border-[#1A1A1A] rounded-xl text-left">
              ⚠️ {error}
            </div>
          )}

          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3 px-4 bg-accent hover:brightness-95 border-3 border-[#1A1A1A] font-extrabold text-sm rounded-xl shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="flex items-center my-3">
            <div className="flex-grow border-t-2 border-[#1A1A1A]"></div>
            <span className="px-3 text-xs font-black text-gray-400 uppercase">OR</span>
            <div className="flex-grow border-t-2 border-[#1A1A1A]"></div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmailAuth} className="space-y-3 text-left">
            <div>
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-[#F5F5F5] border-2 border-[#1A1A1A] rounded-xl text-sm font-semibold focus:outline-none focus:bg-white"
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-[#F5F5F5] border-2 border-[#1A1A1A] rounded-xl text-sm font-semibold focus:outline-none focus:bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#1A1A1A] text-white hover:bg-gray-800 font-extrabold text-sm rounded-xl border-2 border-[#1A1A1A] transition-all disabled:opacity-50"
            >
              {loading ? 'Processing...' : (isSignUp ? 'Sign Up with Email' : 'Sign In with Email')}
            </button>
          </form>

          {/* Toggle Sign Up / Sign In */}
          <div className="text-xs font-bold pt-1">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="text-gray-600 hover:text-black underline"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>

          {/* Guest Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleGuestLogin}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-white hover:bg-gray-100 border-2 border-[#1A1A1A] font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>👤 Try without signing in (Guest)</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-[11px] text-gray-400 font-medium pt-2">
          Your tasks and goals sync in real-time across devices.
        </p>
      </div>
    </div>
  );
};