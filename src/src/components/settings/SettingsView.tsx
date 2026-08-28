import React, { useState } from 'react';
import { UserProfile, ThemeAccent, Language, EnergyType, Goal } from '../../types';
import { useTranslation } from '../../utils/translations';
import { syncService } from '../../services/supabaseService';
import { getLocalTodayStr } from '../../utils/date';
import { ProfileView } from './ProfileView'; // 👈 1. Import หน้า ProfileView เข้ามา
import { 
  ChevronDown, 
  ChevronUp, 
  Sun, 
  Moon, 
  Smartphone, 
  Clock, 
  Target, 
  Cloud, 
  Info, 
  LogOut, 
  Check, 
  Download, 
  Upload, 
  RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface SettingsViewProps {
  user: UserProfile;
  goals?: Goal[]; // 👈 เพิ่ม goals (Optional) เพื่อส่งให้หน้า ProfileView
  onUpdateUser: (updated: Partial<UserProfile>) => void;
  onNavigateToGoals: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  goals = [],
  onUpdateUser,
  onNavigateToGoals
}) => {
  const t = useTranslation(user.language);

  // 👈 2. เพิ่ม State สำหรับเปิดหน้า แก้ไขโปรไฟล์
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Accordion Expand States
  const [openSection, setOpenSection] = useState<string | null>('display');

  // Supabase Sync State
  const [supabaseUrl, setSupabaseUrl] = useState(user.supabaseUrl || '');
  const [supabaseKey, setSupabaseKey] = useState(user.supabaseKey || '');
  const [syncMessage, setSyncMessage] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // PWA Install prompt state
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  React.useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const handleInstallApp = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const result = await installPrompt.userChoice;
      if (result.outcome === 'accepted') {
        confetti({ particleCount: 60, spread: 70 });
      }
      setInstallPrompt(null);
    } else {
      alert(user.language === 'th'
        ? 'ในการติดตั้ง: แตะที่เมนูเบราว์เซอร์ของคุณ (จุดสามจุด หรือปุ่มแชร์) แล้วเลือก "เพิ่มลงในหน้าจอหลัก (Add to Home Screen)"'
        : 'To install on iOS/Android: Tap your browser Share/Menu button and select "Add to Home Screen".');
    }
  };

  const handleSaveSupabase = async () => {
    onUpdateUser({ supabaseUrl: supabaseUrl.trim(), supabaseKey: supabaseKey.trim() });
    setIsSyncing(true);
    setSyncMessage('Testing connection and syncing tables...');
    const res = await syncService.syncAll({
      ...user,
      supabaseUrl: supabaseUrl.trim(),
      supabaseKey: supabaseKey.trim()
    });
    setSyncMessage(res.message);
    setIsSyncing(false);
  };

  const handleExportBackup = async () => {
    const json = await syncService.exportDatabaseToJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `doodle-life-backup-${getLocalTodayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = await syncService.importDatabaseFromJson(content);
        if (ok) {
          alert('Data restored successfully! Refreshing...');
          window.location.reload();
        } else {
          alert('Failed to parse backup JSON.');
        }
      }
    };
    reader.readAsText(file);
  };

  // 👈 3. ถ้าสวิตช์เปิด ให้แสดงหน้า ProfileView
  if (isEditingProfile) {
    return (
      <ProfileView
        user={user}
        goals={goals}
        onUpdateProfile={(updatedData) => {
          onUpdateUser(updatedData);
          setIsEditingProfile(false); // บันทึกเสร็จกลับมาหน้าเดิม
        }}
        onBack={() => setIsEditingProfile(false)} // กดปุ่มย้อนกลับแล้วปิดหน้านี้
        onLogout={() => {
          if (confirm('Reset local state to fresh demo seed?')) {
            localStorage.clear();
            window.location.reload();
          }
        }}
      />
    );
  }

  return (
    <div className="pb-28 pt-2 px-4 max-w-md mx-auto space-y-4">

      {/* User Profile Card (Exact Neo-Brutal Layout) */}
      <div className="bg-[#FFE66D] doodle-border doodle-shadow p-5 relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-16 h-16 rounded-full object-cover doodle-border-sm border-2 border-black bg-white"
            />
            {/* 👈 4. เปลี่ยนปุ่ม ✏️ ให้เปลี่ยน State เปิดหน้า ProfileView */}
            <button
              onClick={() => setIsEditingProfile(true)}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white doodle-border-sm flex items-center justify-center text-xs shadow-[1px_1px_0px_#000] hover:scale-110 transition-transform"
              title="Edit Profile"
            >
              ✏️
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black font-['Bricolage_Grotesque'] text-[#1A1A1A] truncate">
              {user.name}
            </h2>

            {/* Energy Chronotype Picker Chip */}
            <div className="mt-1.5 inline-block">
              <select
                value={user.energyType}
                onChange={(e) => {
                  const type = e.target.value as EnergyType;
                  const peak = type === 'morning_owl' ? '08:00 - 12:00' : type === 'afternoon_lion' ? '13:00 - 17:00' : '19:00 - 23:00';
                  onUpdateUser({ energyType: type, peakHours: peak });
                }}
                className="bg-white/90 text-[11px] font-extrabold px-2.5 py-1 rounded-full border-2 border-black doodle-shadow-sm cursor-pointer"
              >
                <option value="morning_owl">🌅 Morning Owl (08:00 - 12:00)</option>
                <option value="afternoon_lion">🦁 Afternoon Lion (13:00 - 17:00)</option>
                <option value="night_owl">🌙 Night Owl (19:00 - 23:00)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Accordion 1: Display & Language */}
      <div className="bg-white doodle-border doodle-shadow overflow-hidden">
        <button
          onClick={() => toggleSection('display')}
          className="w-full p-4 flex items-center justify-between font-extrabold text-sm font-['Space_Grotesk']"
        >
          <span>{t.displayAndLanguage}</span>
          {openSection === 'display' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {openSection === 'display' && (
          <div className="p-4 pt-1 border-t-2 border-black space-y-4 text-xs font-bold">
            {/* Appearance Segmented Control */}
            <div>
              <span className="text-gray-600 mb-2 block">{t.appearance}</span>
              <div className="flex bg-gray-100 doodle-border-sm p-1 gap-1">
                {[
                  { id: false, label: t.light },
                  { id: true, label: t.dark },
                  { id: 'system', label: t.system }
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => onUpdateUser({ darkMode: item.id === true })}
                    className={`flex-1 py-1.5 font-extrabold rounded-lg transition-all ${
                      (!user.darkMode && !item.id) || (user.darkMode && item.id === true)
                        ? 'bg-white doodle-border-sm doodle-shadow-sm text-black'
                        : 'text-gray-600 hover:text-black'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Theme Accent Dots */}
            <div>
              <span className="text-gray-600 mb-2 block">{t.themeAccent}</span>
              <div className="flex items-center gap-3">
                {[
                  { id: 'yellow', color: '#FFE66D' },
                  { id: 'coral', color: '#FF9F9F' },
                  { id: 'sky', color: '#9DD9D2' },
                  { id: 'mint', color: '#C1E1C1' }
                ].map((accent) => {
                  const isSelected = user.themeAccent === accent.id;
                  return (
                    <button
                      key={accent.id}
                      onClick={() => onUpdateUser({ themeAccent: accent.id as ThemeAccent })}
                      className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center doodle-btn"
                      style={{ backgroundColor: accent.color }}
                    >
                      {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-dashed border-gray-300 my-2" />

            {/* Language Selector */}
            <div className="flex items-center justify-between">
              <span className="text-gray-700">{t.languageLabel}</span>
              <select
                value={user.language}
                onChange={(e) => onUpdateUser({ language: e.target.value as Language })}
                className="bg-white doodle-border-sm p-1.5 text-xs font-black"
              >
                <option value="en">English (EN)</option>
                <option value="th">ไทย (TH)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Accordion 2: Home Screen Widget & PWA */}
      <div className="bg-white doodle-border doodle-shadow overflow-hidden">
        <button
          onClick={() => toggleSection('widget')}
          className="w-full p-4 flex items-center justify-between font-extrabold text-sm font-['Space_Grotesk']"
        >
          <span>{t.homeScreenWidget}</span>
          {openSection === 'widget' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {openSection === 'widget' && (
          <div className="p-4 pt-1 border-t-2 border-black space-y-3 text-xs">
            <p className="text-gray-700 font-medium leading-relaxed">
              Install Doodle Life as a standalone Progressive Web App (PWA) on your mobile or desktop home screen for instant offline access and native feel.
            </p>
            <button
              onClick={handleInstallApp}
              className="w-full bg-[#1A1A1A] text-[#FFE66D] py-3 doodle-border border-[#1A1A1A] rounded-xl font-extrabold text-xs doodle-btn flex items-center justify-center gap-2"
            >
              <Smartphone className="w-4 h-4" /> {t.installAppBtn}
            </button>
          </div>
        )}
      </div>

      {/* Accordion 3: Fixed Schedule & Routine */}
      <div className="bg-white doodle-border doodle-shadow overflow-hidden">
        <button
          onClick={() => toggleSection('routines')}
          className="w-full p-4 flex items-center justify-between font-extrabold text-sm font-['Space_Grotesk']"
        >
          <span>{t.fixedScheduleRoutine}</span>
          {openSection === 'routines' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {openSection === 'routines' && (
          <div className="p-4 pt-1 border-t-2 border-black space-y-2.5 text-xs">
            {[
              { title: 'Morning Sunlight & Routine', time: '07:00 - 07:30', icon: '🌅' },
              { title: 'Deep Focus Coding Block', time: user.peakHours, icon: '⚡' },
              { title: 'Evening Wind Down & Journal', time: '21:30 - 22:15', icon: '🌙' }
            ].map((r, i) => (
              <div key={i} className="bg-gray-50 doodle-border-sm p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{r.icon}</span>
                  <span className="font-bold">{r.title}</span>
                </div>
                <span className="font-black text-[10px] bg-[#FFE66D] px-2 py-0.5 rounded border border-black">
                  {r.time}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Item 4: Goals & Objectives (Direct Navigation) */}
      <button
        onClick={onNavigateToGoals}
        className="w-full bg-white doodle-border doodle-shadow p-4 flex items-center justify-between font-extrabold text-sm font-['Space_Grotesk'] doodle-btn text-left"
      >
        <div className="flex items-center gap-2">
          <span>🎯</span>
          <span>{t.goalsAndObjectives}</span>
        </div>
        <span className="text-xs bg-[#FFE66D] px-2 py-0.5 rounded border border-black font-black">
          Manage ➔
        </span>
      </button>

      {/* Accordion 5: Supabase Cloud Sync */}
      <div className="bg-white doodle-border doodle-shadow overflow-hidden">
        <button
          onClick={() => toggleSection('supabase')}
          className="w-full p-4 flex items-center justify-between font-extrabold text-sm font-['Space_Grotesk']"
        >
          <span>{t.calendarSync}</span>
          {openSection === 'supabase' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {openSection === 'supabase' && (
          <div className="p-4 pt-1 border-t-2 border-black space-y-3 text-xs">
            <p className="text-gray-600 font-medium">
              Connect your own free Supabase PostgreSQL database for real-time cloud backup, or continue using Dexie.js offline-first!
            </p>

            <div>
              <label className="font-bold text-gray-700 block mb-1">Supabase Project URL</label>
              <input
                type="text"
                placeholder="https://xyzcompany.supabase.co"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                className="w-full p-2.5 doodle-input text-xs"
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">Supabase Anon Key</label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsIn..."
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                className="w-full p-2.5 doodle-input text-xs"
              />
            </div>

            {syncMessage && (
              <p className="text-xs font-bold text-purple-900 bg-purple-50 p-2 rounded border border-purple-300">
                {syncMessage}
              </p>
            )}

            <button
              onClick={handleSaveSupabase}
              disabled={isSyncing}
              className="w-full bg-[#1A1A1A] text-white py-2.5 doodle-border border-[#1A1A1A] rounded-xl font-bold text-xs doodle-btn flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Save & Background Sync'}
            </button>

            <div className="border-t border-dashed border-gray-300 pt-2 flex gap-2">
              <button
                onClick={handleExportBackup}
                className="flex-1 py-2 bg-gray-100 doodle-border-sm font-bold text-[11px] doodle-btn flex items-center justify-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> Export JSON
              </button>
              <label className="flex-1 py-2 bg-gray-100 doodle-border-sm font-bold text-[11px] doodle-btn flex items-center justify-center gap-1 cursor-pointer text-center">
                <Upload className="w-3.5 h-3.5" /> Import JSON
                <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Accordion 7: App Info */}
      <div className="bg-white doodle-border doodle-shadow overflow-hidden">
        <button
          onClick={() => toggleSection('info')}
          className="w-full p-4 flex items-center justify-between font-extrabold text-sm font-['Space_Grotesk']"
        >
          <span>{t.appInfo}</span>
          {openSection === 'info' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {openSection === 'info' && (
          <div className="p-4 pt-1 border-t-2 border-black space-y-2 text-xs font-medium text-gray-700">
            <p>• <strong>PWA Engine:</strong> Service Worker + Manifest v1</p>
            <p>• <strong>Offline Database:</strong> Dexie.js (IndexedDB 4.x)</p>
            <p>• <strong>Design Archetype:</strong> Neo-Brutalism ("Doodle Theory")</p>
            <p>• <strong>AI Model:</strong> Gemini 3.7 Flash Free Tier</p>
          </div>
        )}
      </div>

      {/* Log Out Button */}
      <button
        onClick={() => {
          if (confirm('Reset local state to fresh demo seed?')) {
            localStorage.clear();
            window.location.reload();
          }
        }}
        className="w-full bg-white text-[#93000A] doodle-border border-[#93000A] p-4 font-black text-sm flex items-center justify-center gap-2 doodle-btn doodle-shadow hover:bg-red-50"
      >
        <LogOut className="w-4 h-4" /> {t.logout}
      </button>
    </div>
  );
};