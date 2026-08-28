import React, { Suspense, lazy, useState } from 'react'; // 👈 1. เพิ่ม useState
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { LoginView } from './components/auth/LoginView';

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
// 👈 2. Import ProfileView แบบ Lazy
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
    addJournal,
    deleteJournal
  } = useApp();

  // 👈 3. เพิ่ม State สำหรับเปิด/ปิด Profile Overlay
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // 1. ถ้าผู้ใช้ยังไม่ได้เข้าสู่ระบบ ให้แสดงหน้า Login ทันที
  if (!authUser) {
    return <LoginView />;
  }

  const pendingCount = tasks.filter(t => !t.completed).length;

  return (
    <div className={`min-h-screen bg-[#FCF9F8] text-[#1A1A1A] flex flex-col font-['Manrope'] selection:bg-[#FFE66D] selection:text-black ${user.darkMode ? 'dark-theme' : ''}`}>
      <Header
        user={user}
        activeTab={activeTab}
        isOnline={isOnline}
        isSyncing={isSyncing}
        onSync={syncNow}
        onOpenSettings={() => setIsProfileOpen(true)} // 👈 4. เปลี่ยนให้เปิด Profile แทน
      />

      <main className="flex-1 w-full max-w-md mx-auto relative">
        <Suspense fallback={<ViewLoadingFallback />}>
          {activeTab === 'calendar' && (
            <CalendarView
              user={user}
              tasks={tasks}
              goals={goals}
              onToggleTask={toggleTask}
              onAddTask={addTask}
              onUpdateTask={updateTask}
              onDeleteTask={deleteTask}
              onRescheduleBatch={rescheduleBatch}
            />
          )}

          {activeTab === 'tasks' && (
            <TasksView
              user={user}
              tasks={tasks}
              goals={goals}
              onToggleTask={toggleTask}
              onAddTask={addTask}
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
              onUpdateUser={updateUser}
              onNavigateToGoals={() => setActiveTab('goals_flow')}
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

          {/* 👈 5. เพิ่ม Modal แสดง ProfileView ซ้อนทับเมื่อถูกกด */}
          {isProfileOpen && (
            <div className="fixed inset-0 z-50 bg-[#FCF9F8] overflow-y-auto">
              <ProfileView
                user={user}
                goals={goals}
                onUpdateProfile={(updatedData) => {
                  updateUser(updatedData);
                  setIsProfileOpen(false);
                }}
                onBack={() => setIsProfileOpen(false)}
                onLogout={() => {
                  if (confirm('Reset local state to fresh demo seed?')) {
                    localStorage.clear();
                    window.location.reload();
                  }
                }}
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