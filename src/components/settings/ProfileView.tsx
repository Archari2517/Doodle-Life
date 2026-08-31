import React, { useState, useRef } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { UserProfile, Goal } from '../../types';
import { 
  ArrowLeft, 
  Pencil, 
  Save, 
  LogOut, 
  ChevronDown,
  Upload,
  Link as LinkIcon,
  X,
  Image as ImageIcon,
  ShieldAlert
} from 'lucide-react';

interface ProfileViewProps {
  user: UserProfile;
  goals: Goal[];
  authUser?: FirebaseUser | null;
  onUpgradeGoogle?: () => Promise<void>;
  onUpgradeEmail?: (email: string, pass: string) => Promise<void>;
  onUpdateProfile: (updatedData: Partial<UserProfile>) => void;
  onBack?: () => void;
  onLogout?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  goals,
  authUser,
  onUpgradeGoogle,
  onUpgradeEmail,
  onUpdateProfile,
  onBack,
  onLogout
}) => {
  // Local Form State
  const [name, setName] = useState(user?.name || 'Alex Rivera');
  const [bio, setBio] = useState(user?.bio || 'Mastering the art of focus, one task at a time.');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [selectedGoalId, setSelectedGoalId] = useState<string>(goals[0]?.id || 'deep-work');
  const [notifications, setNotifications] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [language, setLanguage] = useState(user?.language || 'EN');

  // 🔐 Guest → Permanent Account Upgrade
  const [isUpgradeFormOpen, setIsUpgradeFormOpen] = useState(false);
  const [upgradeEmail, setUpgradeEmail] = useState('');
  const [upgradePassword, setUpgradePassword] = useState('');
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeError, setUpgradeError] = useState('');
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  // Modal State & Input References
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [tempUrl, setTempUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle File Upload from Local Device
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File size too large! Please select an image under 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setAvatarUrl(base64String);
        setIsAvatarModalOpen(false);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Image Save from Link URL
  const handleApplyUrl = () => {
    if (tempUrl.trim()) {
      setAvatarUrl(tempUrl.trim());
      setTempUrl('');
      setIsAvatarModalOpen(false);
    }
  };

  const handleSave = () => {
    onUpdateProfile({
      name,
      bio,
      avatarUrl,
      language
    });
    alert('Save Changes Successfully! 🎉');
  };

  const handleUpgradeGoogle = async () => {
    if (!onUpgradeGoogle) return;
    setUpgradeError('');
    setUpgradeLoading(true);
    try {
      await onUpgradeGoogle();
      // Google upgrade uses a redirect — the page will reload and the
      // account will already be permanent by the time it comes back.
    } catch (err: any) {
      console.error('Guest upgrade (Google) failed:', err);
      if (err?.code === 'auth/credential-already-in-use') {
        setUpgradeError('บัญชี Google นี้ถูกใช้ลงทะเบียนแล้ว กรุณาออกจากระบบแล้วเข้าสู่ระบบด้วยบัญชีนั้นแทน (ข้อมูลจะไม่ถูกรวมกันอัตโนมัติ)');
      } else {
        setUpgradeError('อัปเกรดบัญชีไม่สำเร็จ กรุณาลองใหม่');
      }
      setUpgradeLoading(false);
    }
  };

  const handleUpgradeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpgradeEmail || !upgradeEmail || !upgradePassword) return;
    setUpgradeError('');
    setUpgradeLoading(true);
    try {
      await onUpgradeEmail(upgradeEmail, upgradePassword);
      setUpgradeSuccess(true);
      setIsUpgradeFormOpen(false);
    } catch (err: any) {
      console.error('Guest upgrade (Email) failed:', err);
      if (err?.code === 'auth/email-already-in-use' || err?.code === 'auth/credential-already-in-use') {
        setUpgradeError('อีเมลนี้ถูกใช้ลงทะเบียนแล้ว กรุณาออกจากระบบแล้วเข้าสู่ระบบด้วยอีเมลนั้นแทน (ข้อมูลจะไม่ถูกรวมกันอัตโนมัติ)');
      } else if (err?.code === 'auth/weak-password') {
        setUpgradeError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      } else {
        setUpgradeError('อัปเกรดบัญชีไม่สำเร็จ กรุณาลองใหม่');
      }
    } finally {
      setUpgradeLoading(false);
    }
  };

  return (
    <div className="pb-24 pt-2 px-4 max-w-md mx-auto space-y-4 font-sans text-black relative">
      {/* 🎯 Top Navigation Bar */}
      <div className="flex items-center justify-between pb-2 border-b-2 border-black/10">
        <button 
          onClick={onBack}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
        <h1 className="text-xl font-black font-['Bricolage_Grotesque'] text-center flex-1 pr-6">
          Profile
        </h1>
      </div>

      {/* 🎯 Accent Hero Header Card */}
      <div className="bg-accent doodle-border doodle-shadow p-6 text-center space-y-3 text-[#1A1A1A]">
        <div className="relative inline-block">
          <div className="w-24 h-24 rounded-2xl bg-white border-2 border-black overflow-hidden shadow-[2px_2px_0px_var(--ink-black)] mx-auto">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-amber-200 flex items-center justify-center text-3xl font-black">
                👨‍💻
              </div>
            )}
          </div>
          <button 
            type="button"
            onClick={() => setIsAvatarModalOpen(true)}
            className="absolute -bottom-1 -right-1 bg-white p-2 rounded-lg border-2 border-black shadow-[2px_2px_0px_var(--ink-black)] hover:scale-110 active:scale-95 transition-transform"
            title="Change Avatar"
          >
            <Pencil className="w-4 h-4 text-black stroke-[2.5]" />
          </button>
        </div>

        <div>
          <h2 className="text-lg font-black tracking-tight">
            {name}
          </h2>
          <p className="text-xs font-bold text-gray-800 mt-1 px-4 leading-relaxed">
            {bio}
          </p>
        </div>
      </div>

      {/* 🔐 Guest Account Upgrade Banner — Anonymous (Guest) sessions get a new,
          device-local uid every time. Nudge the user to link a permanent Google
          or email account BEFORE they log out / switch devices, or their data
          becomes unreachable (it's not deleted, just stuck under the old uid). */}
      {authUser?.isAnonymous && (
        <div className="bg-red-50 doodle-border doodle-shadow p-4 space-y-3 text-left border-red-400">
          <div className="flex items-start gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-extrabold text-sm text-red-700">คุณกำลังใช้งานแบบ Guest</h3>
              <p className="text-xs font-semibold text-red-700/80 mt-1 leading-relaxed">
                ข้อมูลของคุณผูกกับอุปกรณ์นี้เท่านั้น ถ้าออกจากระบบ ล้างข้อมูลเบราว์เซอร์ หรือเปิดแอปในอุปกรณ์อื่น
                คุณจะเข้าถึงข้อมูลชุดนี้ไม่ได้อีก (ข้อมูลไม่ได้หายไปจริง แต่จะค้างอยู่กับบัญชี Guest เก่า)
                กดปุ่มด้านล่างเพื่อผูกกับบัญชีถาวร โดยข้อมูลทั้งหมดจะติดไปด้วย
              </p>
            </div>
          </div>

          {upgradeSuccess && (
            <div className="p-2.5 text-xs font-bold text-green-700 bg-green-100 border-2 border-green-300 rounded-xl">
              ✅ ผูกบัญชีสำเร็จ! ข้อมูลของคุณปลอดภัยแล้ว
            </div>
          )}

          {upgradeError && (
            <div className="p-2.5 text-xs font-bold text-red-600 bg-red-100 border-2 border-red-300 rounded-xl">
              ⚠️ {upgradeError}
            </div>
          )}

          {!isUpgradeFormOpen ? (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleUpgradeGoogle}
                disabled={upgradeLoading}
                className="w-full py-2.5 px-4 bg-white hover:bg-gray-50 border-2 border-[var(--ink-black)] font-extrabold text-xs rounded-xl transition-all disabled:opacity-50"
              >
                {upgradeLoading ? 'กำลังดำเนินการ...' : 'ผูกกับบัญชี Google'}
              </button>
              <button
                type="button"
                onClick={() => setIsUpgradeFormOpen(true)}
                disabled={upgradeLoading}
                className="w-full py-2.5 px-4 bg-[var(--ink-solid)] text-white hover:bg-gray-800 font-extrabold text-xs rounded-xl border-2 border-[var(--ink-black)] transition-all disabled:opacity-50"
              >
                ผูกกับอีเมล/รหัสผ่าน
              </button>
            </div>
          ) : (
            <form onSubmit={handleUpgradeEmail} className="space-y-2">
              <input
                type="email"
                placeholder="Email address"
                value={upgradeEmail}
                onChange={(e) => setUpgradeEmail(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-white border-2 border-[var(--ink-black)] rounded-xl text-sm font-semibold focus:outline-none"
              />
              <input
                type="password"
                placeholder="Password (min 6 characters)"
                value={upgradePassword}
                onChange={(e) => setUpgradePassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2.5 bg-white border-2 border-[var(--ink-black)] rounded-xl text-sm font-semibold focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={upgradeLoading}
                  className="flex-1 py-2.5 bg-[var(--ink-solid)] text-white hover:bg-gray-800 font-extrabold text-xs rounded-xl border-2 border-[var(--ink-black)] transition-all disabled:opacity-50"
                >
                  {upgradeLoading ? 'กำลังบันทึก...' : 'ยืนยัน'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsUpgradeFormOpen(false)}
                  disabled={upgradeLoading}
                  className="py-2.5 px-4 bg-white hover:bg-gray-50 border-2 border-[var(--ink-black)] font-extrabold text-xs rounded-xl transition-all disabled:opacity-50"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* 🎯 Card 1: Personal Info */}
      <div className="bg-white doodle-border doodle-shadow p-4 space-y-3">
        <h3 className="font-extrabold text-sm border-b-2 border-black/10 pb-2">
          Personal Info
        </h3>

        <div className="space-y-1">
          <label className="text-[11px] font-black uppercase tracking-wider text-gray-600 block">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2.5 doodle-input text-xs font-bold bg-white"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-black uppercase tracking-wider text-gray-600 block">
            Short Bio
          </label>
          <textarea
            rows={2}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full p-2.5 doodle-input text-xs font-bold bg-white resize-none"
          />
        </div>
      </div>

      {/* 🎯 Card 2: Primary Goal Focus */}
      <div className="bg-white doodle-border doodle-shadow p-4 space-y-3">
        <h3 className="font-extrabold text-sm border-b-2 border-black/10 pb-2">
          Primary Goal Focus
        </h3>

        <div className="space-y-1">
          <label className="text-[11px] font-black uppercase tracking-wider text-gray-600 block">
            Current Focus
          </label>
          <div className="relative">
            <select
              value={selectedGoalId}
              onChange={(e) => setSelectedGoalId(e.target.value)}
              className="w-full p-2.5 doodle-input text-xs font-bold bg-white appearance-none pr-8 cursor-pointer"
            >
              {goals.length > 0 ? (
                goals.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.title}
                  </option>
                ))
              ) : (
                <>
                  <option value="deep-work">Deep Work</option>
                  <option value="study">Study & Learning</option>
                  <option value="career">Career Growth</option>
                  <option value="fitness">Health & Fitness</option>
                  <option value="finance">Finance</option>
                  <option value="creative">Creative Projects</option>
                  <option value="personal">Personal Life</option>
                </>
              )}
            </select>
            <ChevronDown className="w-4 h-4 text-black absolute right-3 top-3 pointer-events-none stroke-[2.5]" />
          </div>
        </div>
      </div>

      {/* 🎯 Card 3: App Preferences */}
      <div className="bg-white doodle-border doodle-shadow p-4 space-y-4">
        <h3 className="font-extrabold text-sm border-b-2 border-black/10 pb-2">
          App Preferences
        </h3>

        {/* Notifications Switch */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-800">Notifications</span>
          <button
            type="button"
            onClick={() => setNotifications(!notifications)}
            className={`w-12 h-6 rounded-full border-2 border-black transition-colors relative ${
              notifications ? 'bg-accent' : 'bg-gray-200'
            }`}
          >
            <div className={`w-4 h-4 rounded-full bg-white border border-black transition-transform absolute top-0.5 ${
              notifications ? 'left-6.5' : 'left-0.5'
            }`} />
          </button>
        </div>

        {/* Sound Effects Switch */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-800">Sound Effects (Confetti)</span>
          <button
            type="button"
            onClick={() => setSoundEffects(!soundEffects)}
            className={`w-12 h-6 rounded-full border-2 border-black transition-colors relative ${
              soundEffects ? 'bg-accent' : 'bg-gray-200'
            }`}
          >
            <div className={`w-4 h-4 rounded-full bg-white border border-black transition-transform absolute top-0.5 ${
              soundEffects ? 'left-6.5' : 'left-0.5'
            }`} />
          </button>
        </div>

        {/* Language Select */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs font-bold text-gray-800">Language</span>
          <div className="relative">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="p-1.5 pr-6 doodle-border-sm text-xs font-extrabold bg-white appearance-none cursor-pointer"
            >
              <option value="EN">English</option>
              <option value="TH">ไทย</option>
            </select>
            <ChevronDown className="w-3 h-3 text-black absolute right-1.5 top-2.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 🎯 Bottom Action Buttons */}
      <div className="space-y-2.5 pt-2">
        <button
          onClick={handleSave}
          className="w-full py-3 bg-accent text-[#1A1A1A] doodle-border doodle-shadow font-black text-sm doodle-btn flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4 stroke-[2.5]" /> Save Changes
        </button>

        <button
          onClick={onLogout}
          className="w-full py-2.5 bg-[#FF6B6B] text-white doodle-border doodle-shadow font-black text-xs doodle-btn flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4 stroke-[2.5]" /> Log Out
        </button>
      </div>

      {/* 🖼️ Modal: Change Avatar */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white doodle-border doodle-shadow w-full max-w-xs p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b-2 border-black/10 pb-2">
              <h3 className="font-black text-base flex items-center gap-2">
                <ImageIcon className="w-5 h-5" /> Change Profile Picture
              </h3>
              <button
                onClick={() => setIsAvatarModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {/* Hidden Input for Local File */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />

            {/* Option 1: Upload from Device */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 px-4 bg-accent doodle-border doodle-shadow font-extrabold text-xs doodle-btn flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4 stroke-[2.5]" /> Choose Image from Device
            </button>

            <div className="flex items-center gap-2 my-2">
              <div className="h-[2px] bg-black/10 flex-1" />
              <span className="text-[10px] font-black uppercase text-gray-400">OR</span>
              <div className="h-[2px] bg-black/10 flex-1" />
            </div>

            {/* Option 2: Image URL */}
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-wider text-gray-600 block">
                Paste Image URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={tempUrl}
                  onChange={(e) => setTempUrl(e.target.value)}
                  className="flex-1 p-2 doodle-input text-xs font-semibold bg-white"
                />
                <button
                  onClick={handleApplyUrl}
                  className="px-3 bg-black text-white rounded-lg font-bold text-xs hover:bg-gray-800 transition-colors flex items-center gap-1"
                >
                  <LinkIcon className="w-3.5 h-3.5" /> OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};