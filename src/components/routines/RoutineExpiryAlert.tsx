import React from 'react';
import { Routine, Language } from '../../types';
import { getPendingExpiryNotifications } from '../../utils/routineEngine';
import { Clock, Trash2, RotateCcw, X } from 'lucide-react';

interface RoutineExpiryAlertProps {
  routines: Routine[];
  language: Language;
  onDeleteRoutine: (routineId: string) => void;
  onRenewRoutine: (routineId: string) => void;
  onAcknowledge: (routineId: string) => void;
}

/**
 * 🗂️ Lifecycle & Categories — Pop-up แจ้งเตือน Routine ที่หมดอายุแล้ว
 * แสดงทีละรายการ (คิว) ให้ผู้ใช้เลือก "ลบออก" หรือ "ตั้งต่อ" ทุกครั้งที่มี Routine
 * ที่ถูกระบบตั้งสถานะเป็น 'expired' โดยที่ผู้ใช้ยังไม่ได้ตัดสินใจ (expiredAcknowledged=false)
 */
export const RoutineExpiryAlert: React.FC<RoutineExpiryAlertProps> = ({
  routines,
  language,
  onDeleteRoutine,
  onRenewRoutine,
  onAcknowledge
}) => {
  const pending = getPendingExpiryNotifications(routines);
  if (pending.length === 0) return null;

  const current = pending[0];
  const isTh = language === 'th';

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--paper-bg)] doodle-border doodle-shadow-lg max-w-sm w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between gap-2">
          <div className="w-10 h-10 rounded-full bg-[var(--danger-bg-soft)] doodle-border-sm flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-[var(--danger-text)]" />
          </div>
          <button
            onClick={() => onAcknowledge(current.id)}
            className="p-1 hover:bg-gray-200 rounded-full shrink-0"
            title={isTh ? 'ไว้ทีหลัง' : 'Later'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <h3 className="font-extrabold text-base font-['Bricolage_Grotesque'] text-[var(--text-main)]">
            {isTh ? 'กิจวัตรหมดอายุแล้ว' : 'Routine expired'}
          </h3>
          <p className="text-xs font-bold text-gray-700 mt-1.5 leading-relaxed">
            {isTh ? (
              <>
                Routine <span className="text-[var(--danger-text)]">[{current.title}]</span> หมดอายุแล้ว
                ต้องการลบออก หรือตั้งต่อ?
              </>
            ) : (
              <>
                Routine <span className="text-[var(--danger-text)]">[{current.title}]</span> has expired.
                Do you want to delete it or continue it?
              </>
            )}
          </p>
        </div>

        {pending.length > 1 && (
          <p className="text-[10px] font-bold text-gray-400">
            {isTh
              ? `ยังมีอีก ${pending.length - 1} รายการรอการตัดสินใจ`
              : `${pending.length - 1} more waiting`}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onDeleteRoutine(current.id)}
            className="flex-1 py-2.5 bg-white doodle-border-sm font-bold text-xs doodle-btn flex items-center justify-center gap-1.5 text-red-600"
          >
            <Trash2 className="w-3.5 h-3.5" /> {isTh ? 'ลบออก' : 'Delete'}
          </button>
          <button
            onClick={() => onRenewRoutine(current.id)}
            className="flex-1 py-2.5 bg-[var(--ink-solid)] text-[var(--accent-color)] doodle-border border-[var(--ink-black)] font-extrabold text-xs doodle-btn flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> {isTh ? 'ตั้งต่อ' : 'Renew'}
          </button>
        </div>
      </div>
    </div>
  );
};
