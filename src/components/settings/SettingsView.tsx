import React, { useState } from 'react';
import { UserProfile, ThemeAccent, Language, EnergyType, Goal } from '../../types';
import { useTranslation } from '../../utils/translations';
import { backupService } from '../../services/backupService';
import { getLocalTodayStr } from '../../utils/date';
import { ProfileView } from './ProfileView';
import { 
  ChevronDown, 
  ChevronUp, 
  Smartphone, 
  Check, 
  Download, 
  Upload,
  LogOut
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface SettingsViewProps {
  user: UserProfile;
  goals?: Goal[];
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

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>('display');
  const [syncMessage, setSyncMessage] = useState('');
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

  const handleExportBackup = async () => {
    const json = await backupService.exportDatabaseToJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `doodle-life-backup-${getLocalTodayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSyncMessage('Backup exported to a local JSON file.');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = await backupService.importDatabaseFromJson(content);
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

  if (isEditingProfile) {
    return (
      <ProfileView
        user={user}
        goals={goals}
        onUpdateProfile={(updatedData) => {
          onUpdateUser(updatedData);
          setIsEditingProfile(false);
        }}
        onBack={() => setIsEditingProfile(false)}
        onLogout={() => {
          if (confirm('Reset local state to fresh demo seed?')) {
            localStorage.clear();
            window.location.reload();
          }
        }}
      />
    );
  }

  // ตัวช่วยแปลงค่า darkMode ให้เป็นประเภท string เพื่อเปรียบเทียบใน UI
  const currentThemeMode: 'light' | 'dark' | 'system' = 
    user.darkMode === 'system' ? 'system' : user.darkMode ? 'dark' : 'light';

  return (
    <div className="pb-28 pt-2 px-4 max-w-md mx-auto space-y-4">

      {/* User Profile Card */}
      <div className="bg-accent doodle-border doodle-shadow p-5 relative overflow-hidden text-[#1A1A1A]">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-16 h-16 rounded-full object-cover doodle-border-sm border-2 border-black bg-white"
            />
            <button
              onClick={() => setIsEditingProfile(true)}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white doodle-border-sm flex items-center justify-center text-xs shadow-[1px_1px_0px_#000] hover:scale-110 transition-transform text-black"
              title="Edit Profile"
            >
              ✏️
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black font-['Bricolage_Grotesque'] text-[#1A1A1A] truncate">
              {user.name}
            </h2>

            <div className="mt-1.5 inline-block">
              <select
                value={user.energyType}
                onChange={(e) => {
                  const type = e.target.value as EnergyType;
                  const peak = type === 'morning_owl' ? '08:00 - 12:00' : type === 'afternoon_lion' ? '13:00 - 17:00' : '19:00 - 23:00';
                  onUpdateUser({ energyType: type, peakHours: peak });
                }}
                className="bg-white text-black text-[11px] font-extrabold px-2.5 py-1 rounded-full border-2 border-black doodle-shadow-sm cursor-pointer"
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
      <div className="bg-white dark:bg-[#1e293b] doodle-border doodle-shadow overflow-hidden transition-colors">
        <button
          onClick={() => toggleSection('display')}
          className="w-full p-4 flex items-center justify-between font-extrabold text-sm font-['Space_Grotesk'] text-gray-900 dark:text-gray-100"
        >
          <span>{t.displayAndLanguage}</span>
          {openSection === 'display' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {openSection === 'display' && (
          <div className="p-4 pt-1 border-t-2 border-black dark:border-slate-700 space-y-4 text-xs font-bold">
            {/* Appearance Segmented Control */}
            <div>
              <span className="text-gray-600 dark:text-gray-400 mb-2 block">{t.appearance}</span>
              <div className="flex bg-gray-100 dark:bg-[#0f172a] doodle-border-sm p-1 gap-1">
                {[
                  { id: 'light', value: false, label: t.light },
                  { id: 'dark', value: true, label: t.dark },
                  { id: 'system', value: 'system', label: t.system }
                ].map((item) => {
                  const isSelected = currentThemeMode === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onUpdateUser({ darkMode: item.value as any })}
                      className={`flex-1 py-1.5 font-extrabold rounded-lg transition-all ${
                        isSelected
                          ? 'bg-white dark:bg-[#334155] text-black dark:text-white doodle-border-sm doodle-shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Theme Accent Dots */}
            <div>
              <span className="text-gray-600 dark:text-gray-400 mb-2 block">{t.themeAccent}</span>
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
                      className={`w-8 h-8 rounded-full border-2 border-black dark:border-white flex items-center justify-center doodle-btn ${
                        isSelected ? 'scale-110 ring-2 ring-black dark:ring-white' : ''
                      }`}
                      style={{ backgroundColor: accent.color }}
                    >
                      {isSelected && <Check className="w-4 h-4 stroke-[3] text-black" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-dashed border-gray-300 dark:border-slate-700 my-2" />

            {/* Language Selector */}
            <div className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">{t.languageLabel}</span>
              <select
                value={user.language}
                onChange={(e) => onUpdateUser({ language: e.target.value as Language })}
                className="bg-white dark:bg-[#0f172a] text-gray-900 dark:text-gray-100 doodle-border-sm p-1.5 text-xs font-black"
              >
                <option value="en">English (EN)</option>
                <option value="th">ไทย (TH)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Accordion 2: Home Screen Widget & PWA */}
      <div className="bg-white dark:bg-[#1e293b] doodle-border doodle-shadow overflow-hidden transition-colors">
        <button
          onClick={() => toggleSection('widget')}
          className="w-full p-4 flex items-center justify-between font-extrabold text-sm font-['Space_Grotesk'] text-gray-900 dark:text-gray-100"
        >
          <span>{t.homeScreenWidget}</span>
          {openSection === 'widget' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {openSection === 'widget' && (
          <div className="p-4 pt-1 border-t-2 border-black dark:border-slate-700 space-y-3 text-xs">
            <p className="text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
              Install Doodle Life as a standalone Progressive Web App (PWA) on your mobile or desktop home screen for instant offline access and native feel.
            </p>
            <button
              onClick={handleInstallApp}
              className="w-full bg-[#1A1A1A] dark:bg-[#0f172a] text-[var(--accent-color)] py-3 doodle-border border-[#1A1A1A] dark:border-slate-600 rounded-xl font-extrabold text-xs doodle-btn flex items-center justify-center gap-2"
            >
              <Smartphone className="w-4 h-4" /> {t.installAppBtn}
            </button>
          </div>
        )}
      </div>

      {/* Accordion 3: Fixed Schedule & Routine */}
      <div className="bg-white dark:bg-[#1e293b] doodle-border doodle-shadow overflow-hidden transition-colors">
        <button
          onClick={() => toggleSection('routines')}
          className="w-full p-4 flex items-center justify-between font-extrabold text-sm font-['Space_Grotesk'] text-gray-900 dark:text-gray-100"
        >
          <span>{t.fixedScheduleRoutine}</span>
          {openSection === 'routines' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {openSection === 'routines' && (
          <div className="p-4 pt-1 border-t-2 border-black dark:border-slate-700 space-y-2.5 text-xs">
            {[
              { title: 'Morning Sunlight & Routine', time: '07:00 - 07:30', icon: '🌅' },
              { title: 'Deep Focus Coding Block', time: user.peakHours, icon: '⚡' },
              { title: 'Evening Wind Down & Journal', time: '21:30 - 22:15', icon: '🌙' }
            ].map((r, i) => (
              <div key={i} className="bg-gray-50 dark:bg-[#0f172a] doodle-border-sm p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                  <span>{r.icon}</span>
                  <span className="font-bold">{r.title}</span>
                </div>
                <span className="font-black text-[10px] bg-accent text-[#1A1A1A] px-2 py-0.5 rounded border border-black">
                  {r.time}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Item 4: Goals & Objectives */}
      <button
        onClick={onNavigateToGoals}
        className="w-full bg-white dark:bg-[#1e293b] text-gray-900 dark:text-gray-100 doodle-border doodle-shadow p-4 flex items-center justify-between font-extrabold text-sm font-['Space_Grotesk'] doodle-btn text-left transition-colors"
      >
        <div className="flex items-center gap-2">
          <span>🎯</span>
          <span>{t.goalsAndObjectives}</span>
        </div>
        <span className="text-xs bg-accent text-[#1A1A1A] px-2 py-0.5 rounded border border-black font-black">
          Manage ➔
        </span>
      </button>

      {/* Accordion 6: Local Backup & Restore */}
      <div className="bg-white dark:bg-[#1e293b] doodle-border doodle-shadow overflow-hidden transition-colors">
        <button
          onClick={() => toggleSection('backup')}
          className="w-full p-4 flex items-center justify-between font-extrabold text-sm font-['Space_Grotesk'] text-gray-900 dark:text-gray-100"
        >
          <span>Backup & Restore</span>
          {openSection === 'backup' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {openSection === 'backup' && (
          <div className="p-4 pt-1 border-t-2 border-black dark:border-slate-700 space-y-3 text-xs">
            <p className="text-gray-600 dark:text-gray-300 font-medium">
              All your data stays on this device (Dexie.js / IndexedDB). Export a JSON backup to save a copy, or import one to restore it.
            </p>

            {syncMessage && (
              <p className="text-xs font-bold text-purple-900 dark:text-purple-200 bg-purple-50 dark:bg-purple-950/50 p-2 rounded border border-purple-300 dark:border-purple-800">
                {syncMessage}
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleExportBackup}
                className="flex-1 py-2 bg-gray-100 dark:bg-[#0f172a] text-gray-900 dark:text-gray-100 doodle-border-sm font-bold text-[11px] doodle-btn flex items-center justify-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> Export JSON
              </button>
              <label className="flex-1 py-2 bg-gray-100 dark:bg-[#0f172a] text-gray-900 dark:text-gray-100 doodle-border-sm font-bold text-[11px] doodle-btn flex items-center justify-center gap-1 cursor-pointer text-center">
                <Upload className="w-3.5 h-3.5" /> Import JSON
                <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Accordion 7: App Info */}
      <div className="bg-white dark:bg-[#1e293b] doodle-border doodle-shadow overflow-hidden transition-colors">
        <button
          onClick={() => toggleSection('info')}
          className="w-full p-4 flex items-center justify-between font-extrabold text-sm font-['Space_Grotesk'] text-gray-900 dark:text-gray-100"
        >
          <span>{t.appInfo}</span>
          {openSection === 'info' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {openSection === 'info' && (
          <div className="p-4 pt-1 border-t-2 border-black dark:border-slate-700 space-y-2 text-xs font-medium text-gray-700 dark:text-gray-300">
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
        className="w-full bg-white dark:bg-[#1e293b] text-[#93000A] dark:text-red-400 doodle-border border-[#93000A] dark:border-red-400 p-4 font-black text-sm flex items-center justify-center gap-2 doodle-btn doodle-shadow hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
      >
        <LogOut className="w-4 h-4" /> {t.logout}
      </button>
    </div>
  );
};