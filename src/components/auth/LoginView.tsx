import React, { useState, useRef } from 'react';
import { useApp, DEFAULT_AVATAR_URL } from '../../context/AppContext';
import appIconImg from '../../assets/app-icon.jpg';

export const LoginView: React.FC = () => {
  const { login, loginAsGuestUser, loginEmail, registerEmail, authError, clearAuthError } = useApp();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // ข้อผิดพลาดจาก getRedirectResult() (เช่น หลังกด "Continue with Google" แล้วเด้งกลับมา)
  // มาจาก context เพราะ component นี้ mount ใหม่ทุกครั้งหลัง redirect กลับ — error local
  // state ของ handleGoogleLogin ด้านล่างจะไม่ทันเห็น error ที่เกิดตอนนั้น
  const displayError = error || authError;

  // Popup หน้า Register — เปิดเมื่อกด "Don't have an account? Sign Up"
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  const mapAuthError = (err: any) => {
    if (err.code === 'auth/email-already-in-use') {
      return 'อีเมลนี้ถูกใช้งานแล้ว กรุณาเข้าสู่ระบบ';
    } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
      return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
    } else if (err.code === 'auth/weak-password') {
      return 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
    }
    return 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
  };

  // 1. Handle Google Login
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      clearAuthError();
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
      clearAuthError();
      await loginAsGuestUser();
    } catch (err: any) {
      console.error("Guest Login failed:", err);
      setError(err.message || "Failed to sign in as guest");
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Email Sign In (หน้าหลัก — สำหรับผู้ที่มีบัญชีอยู่แล้วเท่านั้น)
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      setLoading(true);
      setError('');
      clearAuthError();
      await loginEmail(email, password);
    } catch (err: any) {
      console.error("Email Sign In failed:", err);
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FCF9F8] text-[#1A1A1A] flex flex-col items-center justify-center p-6 font-['Manrope'] selection:bg-accent">
      <div className="w-full max-w-sm bg-white border-4 border-[#1A1A1A] rounded-2xl p-8 shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] space-y-6 text-center">
        
        {/* Logo & Header */}
        <div className="space-y-2">
          <div className="w-16 h-16 rounded-2xl mx-auto overflow-hidden border-4 border-[#1A1A1A] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
            <img src={appIconImg} alt="Planda" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-black font-['Space_Grotesk'] tracking-tight">
            Planda
          </h1>
          <p className="text-sm font-semibold text-gray-600">
            AI Productivity & Smart Planner
          </p>
        </div>

        {/* Action Box */}
        <div className="space-y-4 pt-2">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Sign in to access your space
          </p>

          {/* Error Message */}
          {displayError && (
            <div className="p-3 text-xs font-bold text-red-600 bg-red-100 border-2 border-[#1A1A1A] rounded-xl text-left">
              ⚠️ {displayError}
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

          {/* Email Sign In Form */}
          <form onSubmit={handleEmailSignIn} className="space-y-3 text-left">
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
              {loading ? 'Processing...' : 'Sign In with Email'}
            </button>
          </form>

          {/* Toggle -> เปิด Popup หน้า Register */}
          <div className="text-xs font-bold pt-1">
            <button
              type="button"
              onClick={() => {
                setError('');
                clearAuthError();
                setIsRegisterOpen(true);
              }}
              className="text-gray-600 hover:text-black underline"
            >
              Don't have an account? Sign Up
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

      {/* 🎉 Popup: Register — Email / Password / Confirm Password / เลือกรูปโปรไฟล์ */}
      {isRegisterOpen && (
        <RegisterModal
          onClose={() => setIsRegisterOpen(false)}
          onRegister={registerEmail}
          mapAuthError={mapAuthError}
        />
      )}
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────
// Popup สมัครสมาชิก: Email, Password, Confirm Password และเลือกรูปโปรไฟล์
// (อัปโหลดจากเครื่อง หรือวางลิงก์รูป) — ถ้าไม่เลือก จะใช้ภาพเริ่มต้นของระบบ
// ────────────────────────────────────────────────────────────────────────
interface RegisterModalProps {
  onClose: () => void;
  onRegister: (email: string, pass: string, avatarUrl?: string) => Promise<void>;
  mapAuthError: (err: any) => string;
}

const RegisterModal: React.FC<RegisterModalProps> = ({ onClose, onRegister, mapAuthError }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(''); // ว่าง = ยังไม่ได้เลือก -> ใช้ค่า default ตอนสมัคร
  const [tempUrl, setTempUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('ไฟล์รูปใหญ่เกินไป กรุณาเลือกรูปที่มีขนาดไม่เกิน 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyUrl = () => {
    if (tempUrl.trim()) {
      setAvatarUrl(tempUrl.trim());
      setTempUrl('');
      setShowUrlInput(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) return;

    if (password !== confirmPassword) {
      setError('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    try {
      setLoading(true);
      setError('');
      // ถ้าผู้ใช้ไม่ได้เลือกรูป -> ไม่ส่ง avatarUrl ไปเลย ระบบจะใช้ภาพเริ่มต้นให้อัตโนมัติ
      await onRegister(email, password, avatarUrl || undefined);
      onClose();
    } catch (err: any) {
      console.error("Register failed:", err);
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white border-4 border-[#1A1A1A] rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-black/10 pb-2">
          <h2 className="text-xl font-black font-['Space_Grotesk'] tracking-tight">
            Create Account
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors font-black text-lg leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 text-xs font-bold text-red-600 bg-red-100 border-2 border-[#1A1A1A] rounded-xl text-left">
            ⚠️ {error}
          </div>
        )}

        {/* Avatar Picker */}
        <div className="flex flex-col items-center gap-2 pt-1">
          <div className="w-20 h-20 rounded-2xl bg-[#F5F5F5] border-2 border-[#1A1A1A] overflow-hidden shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]">
            <img
              src={avatarUrl || DEFAULT_AVATAR_URL}
              alt="Profile preview"
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            {avatarUrl ? 'Photo selected' : 'Default photo (unless you choose one)'}
          </p>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />

          <div className="flex items-center gap-2 w-full">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-2 px-2 bg-accent border-2 border-[#1A1A1A] font-extrabold text-[11px] rounded-xl shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(26,26,26,1)] transition-all"
            >
              📤 Upload Photo
            </button>
            <button
              type="button"
              onClick={() => setShowUrlInput((v) => !v)}
              className="flex-1 py-2 px-2 bg-white border-2 border-[#1A1A1A] font-extrabold text-[11px] rounded-xl shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(26,26,26,1)] transition-all"
            >
              🔗 Paste URL
            </button>
            {avatarUrl && (
              <button
                type="button"
                onClick={() => setAvatarUrl('')}
                className="py-2 px-2.5 bg-white border-2 border-[#1A1A1A] font-extrabold text-[11px] rounded-xl shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(26,26,26,1)] transition-all"
                title="Remove photo (use default)"
              >
                ✕
              </button>
            )}
          </div>

          {showUrlInput && (
            <div className="flex gap-2 w-full pt-1">
              <input
                type="url"
                placeholder="https://example.com/image.jpg"
                value={tempUrl}
                onChange={(e) => setTempUrl(e.target.value)}
                className="flex-1 px-2.5 py-2 bg-[#F5F5F5] border-2 border-[#1A1A1A] rounded-xl text-xs font-semibold focus:outline-none focus:bg-white"
              />
              <button
                type="button"
                onClick={handleApplyUrl}
                className="px-3 bg-[#1A1A1A] text-white rounded-xl font-bold text-xs hover:bg-gray-800 transition-colors"
              >
                OK
              </button>
            </div>
          )}
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-3 text-left pt-1">
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
              minLength={6}
              className="w-full px-3 py-2.5 bg-[#F5F5F5] border-2 border-[#1A1A1A] rounded-xl text-sm font-semibold focus:outline-none focus:bg-white"
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2.5 bg-[#F5F5F5] border-2 border-[#1A1A1A] rounded-xl text-sm font-semibold focus:outline-none focus:bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#1A1A1A] text-white hover:bg-gray-800 font-extrabold text-sm rounded-xl border-2 border-[#1A1A1A] transition-all disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Sign Up with Email'}
          </button>
        </form>

        <div className="text-xs font-bold text-center pt-1">
          <button
            type="button"
            onClick={onClose}
            className="text-gray-600 hover:text-black underline"
          >
            Already have an account? Sign In
          </button>
        </div>
      </div>
    </div>
  );
};
