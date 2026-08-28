import React from 'react';
import { ActiveTab, Language } from '../../types';
import { useTranslation } from '../../utils/translations';
import { Calendar, CheckSquare, MessageSquare, Sprout, Settings } from 'lucide-react';

interface BottomNavProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  language: Language;
  pendingTasksCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  language,
  pendingTasksCount = 0
}) => {
  const t = useTranslation(language);

  const tabs: Array<{ id: ActiveTab; label: string; icon: React.ReactNode }> = [
    {
      id: 'calendar',
      label: t.calendar,
      icon: <Calendar className="w-5 h-5" />
    },
    {
      id: 'tasks',
      label: t.tasks,
      icon: (
        <div className="relative">
          <CheckSquare className="w-5 h-5" />
          {pendingTasksCount > 0 && (
            <span className="absolute -top-1.5 -right-2 bg-[#FF9F9F] border border-black text-[9px] font-bold px-1 rounded-full">
              {pendingTasksCount}
            </span>
          )}
        </div>
      )
    },
    {
      id: 'chat',
      label: t.chat,
      icon: <MessageSquare className="w-5 h-5" />
    },
    {
      id: 'myspace',
      label: t.mySpace,
      icon: <Sprout className="w-5 h-5" />
    },
    {
      id: 'settings',
      label: t.settings,
      icon: <Settings className="w-5 h-5" />
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#FCF9F8] dark:bg-gray-900 border-t-[3px] border-[#1A1A1A] py-2 px-3 shadow-[0_-3px_0px_#1A1A1A] transition-colors duration-200">
      <div className="max-w-md mx-auto flex items-center justify-around gap-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id || (tab.id === 'settings' && activeTab === 'goals_flow');
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-150 relative ${
                isActive
                  ? 'scale-105 font-bold text-[#1A1A1A] dark:text-gray-100'
                  : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-gray-100 font-medium opacity-80'
              }`}
            >
              {/* Highlight Circle for Active Tab */}
              {isActive ? (
                <div className="w-10 h-10 rounded-full bg-accent doodle-border-sm doodle-shadow-sm flex items-center justify-center mb-0.5 text-[#1A1A1A]">
                  {tab.icon}
                </div>
              ) : (
                <div className="w-10 h-10 flex items-center justify-center mb-0.5">
                  {tab.icon}
                </div>
              )}
              <span className={`text-[11px] tracking-tight ${isActive ? 'font-extrabold' : ''}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
