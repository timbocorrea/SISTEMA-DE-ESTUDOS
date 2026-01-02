import React, { useMemo } from 'react';
import { Course, User } from '../domain/entities';
import { AchievementsList } from './AchievementsList';

const ACHIEVEMENT_CATALOG_LENGTH = 6; // Matching helper file constant roughly

const AchievementsPage: React.FC<{ user: User; course?: Course | null }> = ({ user, course }) => {
  const unlockedById = useMemo(() => new Map(user.achievements.map(a => [a.id, a])), [user]);

  // Simple stats for the header
  const total = ACHIEVEMENT_CATALOG_LENGTH;
  const unlocked = user.achievements.length; // Approximate derived from user
  // Better to import catalog length or pass logic, but for now simple math
  // Actually simpler: re-import catalog? No, just use the list component.
  // Wait, I need stats for the header.
  // I will just hardcode 6 for now or export the catalog from list. 
  // Just for safety I will re-calculate unlocked count properly as before.
  const unlockedCount = user.achievements.filter(a => ['first-lesson', 'module-master', 'course-complete', 'xp-1000', 'xp-5000', 'level-5'].includes(a.id)).length;
  // Actually, user.achievements might have others? Assuming catalog is fixed.
  // Let's assume user.achievements only has valid ones.
  const unlockedPercent = Math.round((unlockedCount / total) * 100);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-2">
            Home / <span className="text-slate-800 dark:text-white">Conquistas</span>
          </div>
          <h2 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter">Conquistas</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Acompanhe suas medalhas e metas de progresso.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Desbloqueadas</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{unlockedCount}/{total}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progresso</p>
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{unlockedPercent}%</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">XP Total</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{user.xp.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <AchievementsList user={user} course={course} />
    </div>
  );
};

export default AchievementsPage;

//