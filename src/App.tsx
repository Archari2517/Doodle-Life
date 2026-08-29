import React, { Suspense, lazy, useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { LoginView } from './components/auth/LoginView';
import { RoutineExpiryAlert } from './components/routines/RoutineExpiryAlert';

const CalendarView = lazy(() =>
  import('./components/calendar/CalendarView').then(m => ({ default: m.CalendarView }))
);
const TasksView = lazy(() =>
  import('./components/tasks/TasksView').then(m => ({ default: m.TasksView }))
);
const AiChatView = lazy(() =>
  import('./components/chat/AiChatView').then(m => ({ default: m.AiChatView }))
);
const MySpaceView = lazy(() =>
  import('./components/myspace/MySpaceView').then(m => ({ default: m.MySpaceView }))
);
const SettingsView = lazy(() =>
  import('./components/settings/SettingsView').then(m => ({ default: m.SettingsView }))
);
const GoalsView = lazy(() =>
  import('./components/goals/GoalsView').then(m => ({ default: m.GoalsView }))
);
const ProfileView = lazy(() =>
  import('./components/settings/ProfileView').then(m => ({ default: m.ProfileView }))
);

const ViewLoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center py-24">
    <div className="doodle-border doodle-shadow bg-white px-6 py-4 flex items-center gap-3">
      <div className="w-4 h-4 rounded-full bg-[#1A1A1A] animate-pulse" />
      <span className="font-extrabold text-sm font-['Space_Grotesk']">Loading...</span>
    </div>
  </div>
);

const MainContent: React.FC = () => {
  const {
    user,
    authUser,
    isSyncing,
    tasks,
    goals,
    routines,
    journals,
    activeTab,
    setActiveTab,
    isOnline,
    syncNow,
    updateUser,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    rescheduleBatch,
    addGoal,
    deleteGoal,
    toggleGoalComplete,
    togglePinGoal,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    toggleRoutineActive,
    ensureMonthEvents,
    renewRoutine,
    acknowledgeRoutineExpiry,
    addJournal,
    deleteJournal,
    logout
  } = useApp();

  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // 🚪 ออกจากระบบจริง (Firebase signOut) — authUser จะกลายเป็น null หลังจากนี้ ทำให้
  // MainContent เด้งกลับไปแสดง <LoginView /> โดยอัตโนมัติ (ดูเงื่อนไข `if (!authUser)` ด้านล่าง)
  // และผู้ใช้จะไม่สามารถเข้าหน้าอื่นได้จนกว่าจะเข้าสู่ระบบใหม่
  const handleLogout = async () => {
    const confirmMsg = user.language === 'th'
      ? 'ยืนยันออกจากระบบ?'
      : 'Are you sure you want to log out?';
    if (window.confirm(confirmMsg)) {
      await logout();
    }
  };

  // ⚡ Dynamic Theme Management (Dark Mode & Theme Accent Switcher)
  useEffect(() => {
    if (!user) return;

    const root = document.documentElement;

    // 1. ตรวจสอบค่า Dark Mode อย่างละเอียด (รองรับ true, false, 'system')
    let isDark = false;
    if (user.darkMode === true) {
      isDark = true;
    } else if (user.darkMode === 'system') {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    // สลับ Class ที่ระดับ <html> สำหรับ Tailwind dark:
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // 2. จัดการ Theme Accent Hex Color
    const accentHexMap: Record<string, string> = {
      yellow: '#FFE66D',
      coral: '#FF9F9F',
      sky: '#9DD9D2',
      mint: '#C1E1C1',
      blue: '#A8D8FF'
    };

    const currentAccent = accentHexMap[user.themeAccent] || '#A8D8FF';
    root.style.setProperty('--accent-color', currentAccent);
  }, [user?.darkMode, user?.themeAccent]);

  if (!authUser) {
    return <LoginView />;
  }

  const pendingCount = tasks.filter(t => !t.completed).length;

  return (
    /* 👈 ถอด ${user.darkMode ? 'dark-theme' : ''} ออกเพื่อไม่ให้สไตล์ตีกัน ให้ควบคุมผ่าน class "dark" บน <html> จุดเดียว */
    <div className="min-h-screen bg-[#FCF9F8] dark:bg-gray-900 text-[#1A1A1A] dark:text-gray-100 flex flex-col font-['Manrope'] selection:bg-accent selection:text-black transition-colors duration-200">
      {/* 🗂️ Lifecycle & Categories — Pop-up แจ้งเตือน Routine ที่หมดอายุ */}
      <RoutineExpiryAlert
        routines={routines}
        language={user.language}
        onDeleteRoutine={deleteRoutine}
        onRenewRoutine={(id) => renewRoutine(id)}
        onAcknowledge={acknowledgeRoutineExpiry}
      />

      <Header
        user={user}
        activeTab={activeTab}
        isOnline={isOnline}
        isSyncing={isSyncing}
        onSync={syncNow}
        onOpenSettings={() => setIsProfileOpen(true)}
      />

      <main className="flex-1 w-full max-w-md mx-auto relative">
        <Suspense fallback={<ViewLoadingFallback />}>
          {activeTab === 'calendar' && (
            <CalendarView
              user={user}
              tasks={tasks}
              goals={goals}
              routines={routines}
              onToggleTask={toggleTask}
              onAddTask={addTask}
              onUpdateTask={updateTask}
              onDeleteTask={deleteTask}
              onRescheduleBatch={rescheduleBatch}
              onEnsureMonthEvents={ensureMonthEvents}
            />
          )}

          {activeTab === 'tasks' && (
            <TasksView
              user={user}
              tasks={tasks}
              goals={goals}
              onToggleTask={toggleTask}
              onAddTask={addTask}
              onUpdateTask={updateTask}
              onDeleteTask={deleteTask}
              onNavigateToGoals={() => setActiveTab('goals_flow')}
            />
          )}

          {activeTab === 'chat' && (
            <AiChatView
              user={user}
              goals={goals}
              tasks={tasks}
              onAddTask={addTask}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'myspace' && (
            <MySpaceView
              user={user}
              tasks={tasks}
              goals={goals}
              journals={journals}
              onAddJournal={addJournal}
              onDeleteJournal={deleteJournal}
              onAddTask={addTask}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              user={user}
              goals={goals}
              routines={routines}
              onUpdateUser={updateUser}
              onNavigateToGoals={() => setActiveTab('goals_flow')}
              onAddRoutine={addRoutine}
              onUpdateRoutine={updateRoutine}
              onDeleteRoutine={deleteRoutine}
              onToggleRoutineActive={toggleRoutineActive}
              onRenewRoutine={(id) => renewRoutine(id)}
              onLogout={handleLogout}
            />
          )}

          {activeTab === 'goals_flow' && (
            <GoalsView
              user={user}
              goals={goals}
              tasks={tasks}
              onAddGoal={addGoal}
              onDeleteGoal={deleteGoal}
              onToggleGoalComplete={toggleGoalComplete}
              onTogglePinGoal={togglePinGoal}
              onBack={() => setActiveTab('tasks')}
            />
          )}

          {isProfileOpen && (
            <div className="fixed inset-0 z-50 bg-[#FCF9F8] dark:bg-gray-900 overflow-y-auto">
              <ProfileView
                user={user}
                goals={goals}
                onUpdateProfile={(updatedData) => {
                  updateUser(updatedData);
                  setIsProfileOpen(false);
                }}
                onBack={() => setIsProfileOpen(false)}
                onLogout={handleLogout}
              />
            </div>
          )}
        </Suspense>
      </main>

      <BottomNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        language={user.language}
        pendingTasksCount={pendingCount}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}