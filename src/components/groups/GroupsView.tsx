// src/components/groups/GroupsView.tsx
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  UserPlus, 
  Clock,
  ArrowLeft, 
  Search, 
  UserCheck, 
  AlertCircle,
  ChevronRight,
  MapPin,
  Trash2,
  Pencil
} from 'lucide-react';

// Import Firebase Config & Firestore Methods
import { db, auth } from '../../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  arrayUnion, 
  addDoc, 
  deleteDoc,
  onSnapshot 
} from 'firebase/firestore';

// Interfaces
interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface GroupMember {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Member';
}

interface GroupTask {
  id: string;
  groupId: string;
  title: string;
  description?: string;
  category?: string;
  quadrant?: string;
  noTimeLimit?: boolean;
  startTime?: string;
  endTime?: string;
  durationHrs?: number;
  durationMins?: number;
  location?: string;
  sharedBy: string;
  creatorId: string;
  responses?: { [userId: string]: 'ACCEPTED' | 'REJECTED' }; 
}

interface Group {
  id: string;
  name: string;
  description: string;
  membersCount: number;
  pendingTasksCount: number;
  members: GroupMember[];
}

// Custom Inline SVG Icons
const IconClose = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const IconCheck = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
  </svg>
);

const IconShield = ({ className = "w-3 h-3" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

export const GroupsView: React.FC = () => {
  // Main States
  const [groups, setGroups] = useState<Group[]>([]);
  const [tasks, setTasks] = useState<GroupTask[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  // Modal States
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);

  // Form States - Group
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [activeTab, setActiveTab] = useState<'tasks' | 'members'>('tasks');

  // Form States - Task
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [category, setCategory] = useState('Study');
  const [quadrant, setQuadrant] = useState('Do Now (Urgent & Imp');
  const [noTimeLimit, setNoTimeLimit] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('09:30');
  const [durationHrs, setDurationHrs] = useState<number>(0);
  const [durationMins, setDurationMins] = useState<number>(30);
  const [location, setLocation] = useState('');

  // Search User States
  const [searchEmail, setSearchEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const currentUser = auth.currentUser;

  // Real-time Fetch Groups
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'groups'), (snapshot) => {
      const fetchedGroups: Group[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Group, 'id'>),
      }));
      setGroups(fetchedGroups);

      if (selectedGroup) {
        const updated = fetchedGroups.find((g) => g.id === selectedGroup.id);
        if (updated) {
          setSelectedGroup(updated);
        } else {
          setSelectedGroup(null); // ถ้ารถกลุ่มที่เลือกอยู่โดนลบ ให้เด้งกลับหน้าหลัก
        }
      }
    });

    return () => unsubscribe();
  }, [selectedGroup?.id]);

  // Real-time Fetch Tasks
  useEffect(() => {
    if (!selectedGroup) return;

    const q = query(collection(db, 'groupTasks'), where('groupId', '==', selectedGroup.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTasks: GroupTask[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<GroupTask, 'id'>),
      }));
      setTasks(fetchedTasks);
    });

    return () => unsubscribe();
  }, [selectedGroup]);

  // Search User
  useEffect(() => {
    if (!searchEmail.trim()) {
      setFoundUser(null);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    const timer = setTimeout(async () => {
      try {
        const q = query(
          collection(db, 'users'),
          where('email', '==', searchEmail.trim().toLowerCase())
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          const userData = {
            id: userDoc.id,
            name: userDoc.data().name || userDoc.data().displayName || 'Unknown',
            email: userDoc.data().email,
            avatarUrl: userDoc.data().avatarUrl,
          };

          const isAlreadyMember = selectedGroup?.members.some((m) => m.email === userData.email);
          if (isAlreadyMember) {
            setSearchError('ผู้ใช้นี้เป็นสมาชิกในกลุ่มนี้อยู่แล้ว');
            setFoundUser(null);
          } else {
            setFoundUser(userData);
            setSearchError(null);
          }
        } else {
          setFoundUser(null);
          setSearchError('ไม่พบผู้ใช้งานด้วย Email นี้ในระบบ');
        }
      } catch (error) {
        console.error('Error searching user:', error);
        setSearchError('เกิดข้อผิดพลาดในการค้นหาข้อมูล');
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchEmail, selectedGroup]);

  const resetTaskForm = () => {
    setEditingTaskId(null);
    setTaskTitle('');
    setTaskDescription('');
    setCategory('Study');
    setQuadrant('Do Now (Urgent & Imp');
    setNoTimeLimit(false);
    setStartTime('09:00');
    setEndTime('09:30');
    setDurationHrs(0);
    setDurationMins(30);
    setLocation('');
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      const newGroupData = {
        name: newGroupName,
        description: newGroupDesc,
        membersCount: 1,
        pendingTasksCount: 0,
        members: [
          { 
            id: currentUser?.uid || 'me', 
            name: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'คุณ (Me)', 
            email: currentUser?.email || 'you@example.com', 
            role: 'Owner' 
          }
        ]
      };

      await addDoc(collection(db, 'groups'), newGroupData);
      setNewGroupName('');
      setNewGroupDesc('');
      setShowCreateGroupModal(false);
    } catch (error) {
      console.error('Error creating group:', error);
      alert('เกิดข้อผิดพลาดในการสร้างกลุ่ม');
    }
  };

  // ฟังก์ชันลบกลุ่ม (เฉพาะ Owner)
  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;

    const confirmDelete = window.confirm(
      `คุณต้องการลบกลุ่ม "${selectedGroup.name}" และงานทั้งหมดในกลุ่มนี้ใช่หรือไม่?\nการกระทำนี้ไม่สามารถย้อนกลับได้`
    );

    if (!confirmDelete) return;

    try {
      // 1. ลบ Task ทั้งหมดที่เกี่ยวข้องกับกลุ่มนี้
      const taskQuery = query(collection(db, 'groupTasks'), where('groupId', '==', selectedGroup.id));
      const taskSnapshot = await getDocs(taskQuery);
      
      const deletePromises = taskSnapshot.docs.map((taskDoc) => 
        deleteDoc(doc(db, 'groupTasks', taskDoc.id))
      );
      await Promise.all(deletePromises);

      // 2. ลบตัวกลุ่มออกจาก Firestore
      await deleteDoc(doc(db, 'groups', selectedGroup.id));

      setSelectedGroup(null);
      alert('ลบกลุ่มเรียบร้อยแล้ว');
    } catch (error) {
      console.error('Error deleting group:', error);
      alert('เกิดข้อผิดพลาดในการลบกลุ่ม');
    }
  };

  const handleConfirmInvite = async () => {
    if (!foundUser || !selectedGroup) return;

    const newMember: GroupMember = {
      id: foundUser.id,
      name: foundUser.name,
      email: foundUser.email,
      role: 'Member'
    };

    try {
      const groupRef = doc(db, 'groups', selectedGroup.id);
      await updateDoc(groupRef, {
        membersCount: (selectedGroup.membersCount || 0) + 1,
        members: arrayUnion(newMember)
      });

      setSearchEmail('');
      setFoundUser(null);
      setShowInviteModal(false);
    } catch (error) {
      console.error('Error adding member:', error);
      alert('เกิดข้อผิดพลาดในการเพิ่มสมาชิก');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !selectedGroup || !currentUser) return;

    try {
      await addDoc(collection(db, 'groupTasks'), {
        groupId: selectedGroup.id,
        title: taskTitle,
        description: taskDescription,
        category,
        quadrant,
        noTimeLimit,
        startTime: noTimeLimit ? '' : startTime,
        endTime: noTimeLimit ? '' : endTime,
        durationHrs,
        durationMins,
        location,
        sharedBy: currentUser.displayName || currentUser.email?.split('@')[0] || 'สมาชิกในกลุ่ม',
        creatorId: currentUser.uid,
        responses: {}
      });

      resetTaskForm();
      setShowAddTaskModal(false);
    } catch (error) {
      console.error('Error adding task:', error);
      alert('เกิดข้อผิดพลาดในการสร้างงาน');
    }
  };

  const openEditTaskModal = (task: GroupTask) => {
    setEditingTaskId(task.id);
    setTaskTitle(task.title || '');
    setTaskDescription(task.description || '');
    setCategory(task.category || 'Study');
    setQuadrant(task.quadrant || 'Do Now (Urgent & Imp');
    setNoTimeLimit(task.noTimeLimit || false);
    setStartTime(task.startTime || '09:00');
    setEndTime(task.endTime || '09:30');
    setDurationHrs(task.durationHrs || 0);
    setDurationMins(task.durationMins || 0);
    setLocation(task.location || '');
    setShowEditTaskModal(true);
  };

  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTaskId || !taskTitle.trim()) return;

    try {
      const taskRef = doc(db, 'groupTasks', editingTaskId);
      await updateDoc(taskRef, {
        title: taskTitle,
        description: taskDescription,
        category,
        quadrant,
        noTimeLimit,
        startTime: noTimeLimit ? '' : startTime,
        endTime: noTimeLimit ? '' : endTime,
        durationHrs,
        durationMins,
        location,
      });

      resetTaskForm();
      setShowEditTaskModal(false);
    } catch (error) {
      console.error('Error updating task:', error);
      alert('เกิดข้อผิดพลาดในการแก้ไขงาน');
    }
  };

  const handleTaskResponse = async (taskId: string, status: 'ACCEPTED' | 'REJECTED') => {
    if (!currentUser) {
      alert('กรุณาล็อกอินก่อนทำการตอบรับงาน');
      return;
    }

    try {
      const taskRef = doc(db, 'groupTasks', taskId);
      await updateDoc(taskRef, {
        [`responses.${currentUser.uid}`]: status
      });
    } catch (error) {
      console.error('Error updating task response:', error);
      alert('ไม่สามารถอัปเดตสถานะได้');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('คุณต้องการลบงานนี้ใช่หรือไม่?')) return;

    try {
      await deleteDoc(doc(db, 'groupTasks', taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('เกิดข้อผิดพลาดในการลบงาน');
    }
  };

  // ตรวจสอบว่าผู้ใช้ปัจจุบันเป็น Owner ของกลุ่มหรือไม่
  const isGroupOwner = selectedGroup?.members.some(
    (m) => m.email === currentUser?.email && m.role === 'Owner'
  );

  return (
    <div className="pb-24 pt-3 px-4 max-w-md mx-auto space-y-4 font-sans text-gray-800">
      
      {!selectedGroup ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="text-xl font-extrabold tracking-tight font-['Bricolage_Grotesque'] flex items-center gap-2">
                <Users className="w-6 h-6 text-black shrink-0" />
                กลุ่มของฉัน (Groups)
              </h1>
              <p className="text-[11px] font-bold text-gray-500 mt-0.5">
                จัดการกลุ่มและแชร์รายการงานร่วมกับทีมของคุณ
              </p>
            </div>
            <button
              onClick={() => setShowCreateGroupModal(true)}
              className="flex items-center gap-1 bg-accent px-3 py-2 doodle-border-sm doodle-shadow-sm text-xs font-black doodle-btn shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>สร้างกลุ่มใหม่</span>
            </button>
          </div>

          {groups.length === 0 ? (
            <div className="bg-white doodle-border doodle-shadow p-8 text-center space-y-3">
              <span className="text-4xl block">👥</span>
              <h3 className="font-extrabold text-base font-['Bricolage_Grotesque']">ยังไม่มีกลุ่มในระบบ</h3>
              <p className="text-xs font-medium text-gray-600 max-w-xs mx-auto">
                เริ่มต้นด้วยการสร้างกลุ่มใหม่เพื่อแชร์งาน และทำงานร่วมกับเพื่อนของคุณ
              </p>
              <button
                onClick={() => setShowCreateGroupModal(true)}
                className="mt-2 bg-[var(--ink-solid)] text-white px-4 py-2 rounded-xl text-xs font-bold doodle-btn inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-[var(--accent-color)]" />
                สร้างกลุ่มแรกของคุณ
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => (
                <div
                  key={group.id}
                  onClick={() => setSelectedGroup(group)}
                  className="bg-white doodle-border doodle-shadow p-4 relative transition-all cursor-pointer hover:bg-amber-50/30 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent doodle-border-sm flex items-center justify-center font-black font-['Bricolage_Grotesque'] text-lg shrink-0">
                        {group.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-base leading-snug font-['Bricolage_Grotesque'] group-hover:underline">
                          {group.name}
                        </h3>
                        <p className="text-xs text-gray-600 line-clamp-1 mt-0.5">
                          {group.description || 'ไม่มีคำอธิบายกลุ่ม'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t-2 border-black flex items-center justify-between text-xs font-extrabold">
                    <div className="flex items-center gap-1.5 text-gray-700">
                      <Users className="w-3.5 h-3.5" />
                      <span>{group.members?.length || 0} สมาชิก</span>
                    </div>
                    <div className="flex items-center gap-1 text-black bg-gray-100 px-2.5 py-1 rounded-md doodle-border-sm font-bold text-[11px]">
                      <span>รายละเอียด</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedGroup(null)}
              className="flex items-center gap-1 text-xs font-extrabold bg-white px-3 py-1.5 doodle-border-sm doodle-btn"
            >
              <ArrowLeft className="w-4 h-4" />
              ย้อนกลับไปหน้ากลุ่มทั้งหมด
            </button>

            {/* ปุ่มลบกลุ่ม (แสดงเฉพาะ Owner) */}
            {isGroupOwner && (
              <button
                onClick={handleDeleteGroup}
                className="flex items-center gap-1 bg-red-100 hover:bg-red-200 text-red-600 px-3 py-1.5 doodle-border-sm text-xs font-extrabold doodle-btn"
                title="ลบกลุ่มนี้"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ลบกลุ่ม</span>
              </button>
            )}
          </div>

          <div className="bg-white doodle-border doodle-shadow p-4 space-y-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h1 className="text-xl font-black font-['Bricolage_Grotesque'] leading-tight">{selectedGroup.name}</h1>
                  <p className="text-xs font-medium text-gray-600 mt-1">{selectedGroup.description || 'ไม่มีคำอธิบายกลุ่ม'}</p>
                </div>
                <button
                  onClick={() => {
                    setSearchEmail('');
                    setFoundUser(null);
                    setSearchError(null);
                    setShowInviteModal(true);
                  }}
                  className="flex items-center gap-1 bg-accent px-3 py-1.5 doodle-border-sm text-xs font-black doodle-btn shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  เชิญเพื่อน
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t-2 border-black">
              <button
                onClick={() => setActiveTab('tasks')}
                className={`py-2 text-xs font-black text-center doodle-border-sm transition-all ${
                  activeTab === 'tasks'
                    ? 'bg-accent doodle-shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                งานในกลุ่ม ({tasks.length})
              </button>
              <button
                onClick={() => setActiveTab('members')}
                className={`py-2 text-xs font-black text-center doodle-border-sm transition-all ${
                  activeTab === 'members'
                    ? 'bg-accent doodle-shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                สมาชิก ({selectedGroup.members?.length || 0})
              </button>
            </div>
          </div>

          {activeTab === 'tasks' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-sm font-['Bricolage_Grotesque']">งานที่แชร์ร่วมกัน</h3>
                <button 
                  onClick={() => setShowAddTaskModal(true)}
                  className="bg-accent hover:bg-yellow-400 text-black px-3 py-1.5 doodle-border-sm text-xs font-black doodle-btn flex items-center gap-1 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  เพิ่มงานใหม่
                </button>
              </div>

              {tasks.length === 0 ? (
                <div className="bg-white doodle-border doodle-shadow p-6 text-center space-y-2">
                  <span className="text-3xl">📝</span>
                  <p className="text-xs font-bold text-gray-600">ยังไม่มีงานที่ถูกเพิ่มในกลุ่มนี้</p>
                  <button
                    onClick={() => setShowAddTaskModal(true)}
                    className="mt-2 bg-[var(--ink-solid)] text-white px-3 py-1.5 rounded-xl text-xs font-bold doodle-btn inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3 text-[var(--accent-color)]" /> เพิ่มงานใหม่
                  </button>
                </div>
              ) : (
                tasks.map((task) => {
                  const myStatus = currentUser ? task.responses?.[currentUser.uid] : undefined;
                  const isCreator = currentUser?.uid === task.creatorId;

                  return (
                    <div key={task.id} className="bg-white doodle-border doodle-shadow p-4 space-y-3">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className="font-extrabold text-base text-[var(--text-main)] leading-snug">{task.title}</h4>
                          {task.category && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-black bg-gray-100">
                              {task.category}
                            </span>
                          )}
                        </div>
                        
                        {task.description && (
                          <p className="text-xs font-medium text-gray-600 mb-2 whitespace-pre-line">{task.description}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-gray-500">
                          {task.noTimeLimit ? (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> ไม่ระบุเวลา
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> {task.startTime} - {task.endTime} ({task.durationHrs}h {task.durationMins}m)
                            </span>
                          )}
                          {task.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" /> {task.location}
                            </span>
                          )}
                          <span>• โดย: {task.sharedBy}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {isCreator && (
                            <>
                              <button
                                onClick={() => openEditTaskModal(task)}
                                title="แก้ไขงานนี้"
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                title="ลบงานนี้"
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {!myStatus && (
                            <>
                              <button
                                onClick={() => handleTaskResponse(task.id, 'ACCEPTED')}
                                className="flex items-center gap-1 bg-[#9DD9D2] hover:bg-teal-300 px-3 py-1.5 doodle-border-sm text-xs font-black doodle-btn"
                              >
                                <IconCheck className="w-3.5 h-3.5" /> ยืนยันรับงาน
                              </button>
                              <button
                                onClick={() => handleTaskResponse(task.id, 'REJECTED')}
                                className="flex items-center gap-1 bg-[#FF4D4D] text-white hover:bg-red-600 px-3 py-1.5 doodle-border-sm text-xs font-black doodle-btn"
                              >
                                <IconClose className="w-3.5 h-3.5" /> ไม่ยืนยัน
                              </button>
                            </>
                          )}

                          {myStatus === 'ACCEPTED' && (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-[11px] font-black bg-[#9DD9D2] text-black px-2.5 py-1 doodle-border-sm">
                                <IconCheck className="w-3.5 h-3.5" /> คุณยืนยันแล้ว
                              </span>
                              <button 
                                onClick={() => handleTaskResponse(task.id, 'REJECTED')}
                                className="text-xs font-bold text-gray-500 hover:text-red-600 underline"
                              >
                                เปลี่ยนใจ
                              </button>
                            </div>
                          )}

                          {myStatus === 'REJECTED' && (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-[11px] font-black bg-[#FF4D4D] text-white px-2.5 py-1 doodle-border-sm">
                                <IconClose className="w-3.5 h-3.5" /> คุณปฏิเสธงานนี้
                              </span>
                              <button 
                                onClick={() => handleTaskResponse(task.id, 'ACCEPTED')}
                                className="text-xs font-bold text-gray-500 hover:text-emerald-700 underline"
                              >
                                เปลี่ยนใจ
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'members' && (
            <div className="bg-white doodle-border doodle-shadow divide-y-2 divide-black">
              {selectedGroup.members?.map((member) => (
                <div key={member.id || member.email} className="p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-accent doodle-border-sm font-black flex items-center justify-center text-sm font-['Bricolage_Grotesque']">
                      {(member.name || member.email).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-black">{member.name}</p>
                      <p className="text-[10px] font-semibold text-gray-500">{member.email}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black px-2.5 py-0.5 doodle-border-sm flex items-center gap-1 ${
                    member.role === 'Owner' 
                      ? 'bg-amber-200 text-black' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {member.role === 'Owner' && <IconShield className="w-3 h-3" />}
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal 1: สร้างกลุ่มใหม่ */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white doodle-border doodle-shadow-lg max-w-md w-full p-5 space-y-4">
            <div className="flex justify-between items-center border-b-2 border-black pb-2">
              <h3 className="font-extrabold text-lg font-['Bricolage_Grotesque']">
                สร้างกลุ่มใหม่
              </h3>
              <button 
                onClick={() => setShowCreateGroupModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <IconClose className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-3 text-xs font-bold">
              <div>
                <label className="block mb-1 text-gray-700">ชื่อกลุ่ม *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น แก๊งโปรเจกต์ Todo App"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-3 py-2 doodle-border-sm focus:outline-none focus:bg-amber-50"
                />
              </div>

              <div>
                <label className="block mb-1 text-gray-700">คำอธิบายกลุ่ม</label>
                <textarea
                  placeholder="ระบุวัตถุประสงค์หรือรายละเอียดสั้นๆ..."
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className="w-full px-3 py-2 doodle-border-sm focus:outline-none focus:bg-amber-50 h-20 resize-none font-normal"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 doodle-border-sm font-bold doodle-btn"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-accent doodle-border-sm font-black doodle-btn"
                >
                  ยืนยันสร้างกลุ่ม
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: เพิ่มงานใหม่ */}
      {showAddTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border-2 border-black p-5 max-w-sm w-full space-y-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b-2 border-black pb-2">
              <h3 className="font-bold text-base text-gray-900">
                เพิ่มงานใหม่
              </h3>
              <button 
                onClick={() => {
                  resetTaskForm();
                  setShowAddTaskModal(false);
                }}
                className="p-1 text-gray-500 hover:text-black"
              >
                <IconClose className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3 text-xs font-bold text-gray-700">
              
              <div>
                <label className="block mb-1 font-bold text-gray-800">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Read Chapter 4"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block mb-1 font-bold text-gray-800">รายละเอียด (ไม่บังคับ)</label>
                <input
                  type="text"
                  placeholder="เพิ่มรายละเอียดเกี่ยวกับงานนี้..."
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none font-normal"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1 font-bold text-gray-800">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-black rounded-xl bg-white text-gray-800 focus:outline-none"
                  >
                    <option value="Study">Study</option>
                    <option value="Work">Work</option>
                    <option value="Personal">Personal</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-bold text-gray-800">Quadrant</label>
                  <select
                    value={quadrant}
                    onChange={(e) => setQuadrant(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-black rounded-xl bg-white text-gray-800 focus:outline-none truncate"
                  >
                    <option value="Do Now (Urgent & Imp">Do Now (Urgent & Imp</option>
                    <option value="Schedule (Not Urgent & Imp)">Schedule (Not Urgent)</option>
                    <option value="Delegate (Urgent & Not Imp)">Delegate (Urgent)</option>
                    <option value="Eliminate (Not Urgent & Not Imp)">Eliminate</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between border-2 border-black rounded-xl px-3 py-2.5 bg-gray-50">
                <span className="font-bold text-gray-800">ไม่ระบุเวลา</span>
                <button
                  type="button"
                  onClick={() => setNoTimeLimit(!noTimeLimit)}
                  className={`w-11 h-6 rounded-full border-2 border-black transition-colors relative flex items-center ${
                    noTimeLimit ? 'bg-sky-300' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-white border-2 border-black transition-transform transform ${
                      noTimeLimit ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {!noTimeLimit && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block mb-1 font-bold text-gray-800">Start Time</label>
                      <div className="relative">
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-black rounded-xl text-center font-extrabold text-sm text-gray-800 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block mb-1 font-bold text-gray-800">End Time</label>
                      <div className="relative">
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-black rounded-xl text-center font-extrabold text-sm text-gray-800 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block mb-1 font-bold text-gray-800">Duration (Hrs)</label>
                      <input
                        type="number"
                        min="0"
                        value={durationHrs}
                        onChange={(e) => setDurationHrs(Number(e.target.value))}
                        className="w-full px-3 py-2 border-2 border-black rounded-xl text-center text-gray-800 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-bold text-gray-800">Duration (Mins)</label>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={durationMins}
                        onChange={(e) => setDurationMins(Number(e.target.value))}
                        className="w-full px-3 py-2 border-2 border-black rounded-xl text-center text-gray-800 focus:outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block mb-1 font-bold text-gray-800">สถานที่ (ไม่บังคับ)</label>
                <input
                  type="text"
                  placeholder="e.g. Library Room 301"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none font-normal"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    resetTaskForm();
                    setShowAddTaskModal(false);
                  }}
                  className="flex-1 py-2.5 bg-gray-100 border-2 border-black rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-accent border-2 border-black rounded-xl font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 transition-all"
                >
                  บันทึกงาน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: แก้ไขงาน */}
      {showEditTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border-2 border-black p-5 max-w-sm w-full space-y-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b-2 border-black pb-2">
              <h3 className="font-bold text-base text-gray-900">
                แก้ไขงาน
              </h3>
              <button 
                onClick={() => {
                  resetTaskForm();
                  setShowEditTaskModal(false);
                }}
                className="p-1 text-gray-500 hover:text-black"
              >
                <IconClose className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditTask} className="space-y-3 text-xs font-bold text-gray-700">
              
              <div>
                <label className="block mb-1 font-bold text-gray-800">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Read Chapter 4"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block mb-1 font-bold text-gray-800">รายละเอียด (ไม่บังคับ)</label>
                <input
                  type="text"
                  placeholder="เพิ่มรายละเอียดเกี่ยวกับงานนี้..."
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none font-normal"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1 font-bold text-gray-800">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-black rounded-xl bg-white text-gray-800 focus:outline-none"
                  >
                    <option value="Study">Study</option>
                    <option value="Work">Work</option>
                    <option value="Personal">Personal</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-bold text-gray-800">Quadrant</label>
                  <select
                    value={quadrant}
                    onChange={(e) => setQuadrant(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-black rounded-xl bg-white text-gray-800 focus:outline-none truncate"
                  >
                    <option value="Do Now (Urgent & Imp">Do Now (Urgent & Imp</option>
                    <option value="Schedule (Not Urgent & Imp)">Schedule (Not Urgent)</option>
                    <option value="Delegate (Urgent & Not Imp)">Delegate (Urgent)</option>
                    <option value="Eliminate (Not Urgent & Not Imp)">Eliminate</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between border-2 border-black rounded-xl px-3 py-2.5 bg-gray-50">
                <span className="font-bold text-gray-800">ไม่ระบุเวลา</span>
                <button
                  type="button"
                  onClick={() => setNoTimeLimit(!noTimeLimit)}
                  className={`w-11 h-6 rounded-full border-2 border-black transition-colors relative flex items-center ${
                    noTimeLimit ? 'bg-sky-300' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-white border-2 border-black transition-transform transform ${
                      noTimeLimit ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {!noTimeLimit && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block mb-1 font-bold text-gray-800">Start Time</label>
                      <div className="relative">
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-black rounded-xl text-center font-extrabold text-sm text-gray-800 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block mb-1 font-bold text-gray-800">End Time</label>
                      <div className="relative">
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-black rounded-xl text-center font-extrabold text-sm text-gray-800 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block mb-1 font-bold text-gray-800">Duration (Hrs)</label>
                      <input
                        type="number"
                        min="0"
                        value={durationHrs}
                        onChange={(e) => setDurationHrs(Number(e.target.value))}
                        className="w-full px-3 py-2 border-2 border-black rounded-xl text-center text-gray-800 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-bold text-gray-800">Duration (Mins)</label>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={durationMins}
                        onChange={(e) => setDurationMins(Number(e.target.value))}
                        className="w-full px-3 py-2 border-2 border-black rounded-xl text-center text-gray-800 focus:outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block mb-1 font-bold text-gray-800">สถานที่ (ไม่บังคับ)</label>
                <input
                  type="text"
                  placeholder="e.g. Library Room 301"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none font-normal"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    resetTaskForm();
                    setShowEditTaskModal(false);
                  }}
                  className="flex-1 py-2.5 bg-gray-100 border-2 border-black rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-500 text-white border-2 border-black rounded-xl font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 transition-all"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: เชิญเพื่อนเข้ากลุ่ม */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white doodle-border doodle-shadow-lg max-w-sm w-full p-5 space-y-4">
            <div className="flex justify-between items-center border-b-2 border-black pb-2">
              <h3 className="font-extrabold text-base font-['Bricolage_Grotesque']">
                เชิญเพื่อนเข้ากลุ่ม
              </h3>
              <button 
                onClick={() => setShowInviteModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <IconClose className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block mb-1 font-extrabold text-gray-700">ค้นหาด้วย Email</label>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="กรอก email สมาชิก..."
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 doodle-border-sm focus:outline-none focus:bg-amber-50 font-bold"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              {isSearching && (
                <div className="py-4 text-center text-xs font-bold text-gray-500 animate-pulse">
                  กำลังค้นหา...
                </div>
              )}

              {searchError && (
                <div className="p-2.5 bg-red-50 border-2 border-red-500 rounded-xl text-red-600 flex items-center gap-2 font-bold text-[11px]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{searchError}</span>
                </div>
              )}

              {foundUser && (
                <div className="p-3 bg-emerald-50 border-2 border-black rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-300 border border-black rounded-lg font-black flex items-center justify-center">
                      {foundUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-extrabold text-black text-xs">{foundUser.name}</p>
                      <p className="text-[10px] text-gray-600 font-semibold">{foundUser.email}</p>
                    </div>
                  </div>
                  <UserCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 py-2 bg-gray-100 doodle-border-sm font-bold doodle-btn"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={!foundUser}
                  onClick={handleConfirmInvite}
                  className={`flex-1 py-2 doodle-border-sm font-black doodle-btn ${
                    foundUser ? 'bg-accent hover:bg-amber-400' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  เพิ่มสมาชิก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};