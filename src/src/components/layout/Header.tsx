import React from 'react';
import { UserProfile, ActiveTab } from '../../types';
import { useTranslation } from '../../utils/translations';
import { Sparkles, Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface HeaderProps {
  user: UserProfile;
  activeTab: ActiveTab;
  isOnline: boolean;
  isSyncing: boolean;
  onSync: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  activeTab,
  isOnline,
  isSyncing,
  onSync,
  onOpenSettings
}) => {
  const t = useTranslation(user.language);

  const getTitle = () => {
    switch (activeTab) {
      case 'calendar':
        return t.calendar;
      case 'tasks':
        return t.tasks;
      case 'chat':
        return t.aiChatTitle;
      case 'myspace':
        return t.mySpaceTitle;
      case 'settings':
      case 'goals_flow':
        return t.settingsTitle;
      default:
        return 'Doodle Life';
    }
  };

  const getEnergyEmoji = (energy: string) => {
    switch (energy) {
      case 'morning_owl':
        return '🌅 Morning Owl';
      case 'afternoon_lion':
        return '🦁 Afternoon Lion';
      case 'night_owl':
        return '🌙 Night Owl';
      default:
        return '⚡ Energized';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[#FCF9F8] border-b-[3px] border-[#1A1A1A] px-4 py-3 shadow-[0_3px_0px_#1A1A1A]">
      <div className="max-w-md mx-auto flex items-center justify-between gap-2">
        {/* Left: User Avatar & Quick Info */}
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-2 text-left group transition-transform active:scale-95"
          title="Open Settings"
        >
          <div className="relative">
            <img
              src={user.avatarUrl && user.avatarUrl.trim() !== '' 
                ? user.avatarUrl 
                : 'https://cdn.pfps.gg/pfps/5129-default-blue.png'}
              alt={user.name}
              className="w-10 h-10 rounded-full object-cover doodle-border-sm border-2 border-[#1A1A1A] doodle-shadow-sm bg-[#FFE66D]"
            />
            <span className="absolute -bottom-1 -right-1 text-xs"></span>
          </div>
          <div className="hidden sm:block">
            <h2 className="text-xs font-bold leading-tight line-clamp-1">{user.name}</h2>
            <span className="text-[10px] font-semibold bg-[#FFE66D] px-1.5 py-0.5 rounded-full border border-black inline-block mt-0.5">
              {getEnergyEmoji(user.energyType)}
            </span>
          </div>
        </button>

        {/* Center: Screen Title */}
        <h1 className="text-lg md:text-xl font-extrabold tracking-tight text-center flex-1 truncate px-2 font-['Bricolage_Grotesque']">
          {getTitle()}
        </h1>

        {/* Right: Sync & Status Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="p-2 doodle-border-sm bg-white hover:bg-[#FFE66D] doodle-shadow-sm doodle-btn flex items-center justify-center text-xs font-bold shrink-0"
            title={isOnline ? 'Sync Dexie & Cloud' : 'Offline Mode (Local Dexie)'}
          >
            {isSyncing ? (
              <RefreshCw className="w-4 h-4 animate-spin text-[#1A1A1A]" />
            ) : isOnline ? (
              <Wifi className="w-4 h-4 text-emerald-600" />
            ) : (
              <WifiOff className="w-4 h-4 text-amber-600" />
            )}
          </button>

          <div className="w-7 h-7 rounded-full bg-[#FFE66D] border-2 border-black flex items-center justify-center font-bold text-xs doodle-shadow-sm">
            ⚡
          </div>
        </div>
      </div>
    </header>
  );
};
