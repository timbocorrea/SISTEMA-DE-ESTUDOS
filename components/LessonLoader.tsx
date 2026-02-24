import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCourse } from '../contexts/CourseContext';
import LessonViewer from '@/components/features/classroom/LessonViewer';
import LessonSkeleton from './skeletons/LessonSkeleton';
import { useLessonStore } from '../stores/useLessonStore';
import { User } from '../domain/entities';
import { useTheme } from '../contexts/ThemeContext';

interface LessonLoaderProps {
    user: User;
    onTrackAction: (action: string) => void;
    onToggleSidebar?: () => void;
}

const LessonLoader: React.FC<LessonLoaderProps> = ({ user, onTrackAction, onToggleSidebar }) => {
    const { lessonId } = useParams<{ lessonId: string }>();
    const navigate = useNavigate();
    const {
        activeCourse,
        activeLesson,
        selectLesson,
        updateProgress,
        markBlockAsRead,
        markVideoWatched,
        markAudioListened,
        isLoadingCourses
    } = useCourse();

    const [sidebarTab, setSidebarTab] = React.useState<'materials' | 'notes'>('materials');
    const { contentTheme, setContentTheme } = useLessonStore();
    const { theme } = useTheme();

    // Sync URL -> Context
    useEffect(() => {
        if (lessonId && activeCourse) {
            // Only select if not already active or different
            if (activeLesson?.id !== lessonId) {
                selectLesson(lessonId);
            }
        }
    }, [lessonId, activeCourse, activeLesson, selectLesson]);

    // Sync content theme with global theme on change.
    useEffect(() => {
        setContentTheme(theme);
    }, [theme, setContentTheme]);

    if (isLoadingCourses) {
        return <LessonSkeleton />;
    }

    if (!activeCourse) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <i className="fas fa-exclamation-circle text-4xl text-slate-300"></i>
                <p className="text-slate-500">Curso não carregado.</p>
                <button onClick={() => navigate('/courses')} className="text-indigo-600 font-bold hover:underline">
                    Ir para Meus Cursos
                </button>
            </div>
        );
    }

    if (!activeLesson) {
        return <LessonSkeleton />;
    }

    return (
        <LessonViewer
            course={activeCourse}
            lesson={activeLesson}
            user={user}
            onLessonSelect={(l) => navigate(`/course/${activeCourse.id}/lesson/${l.id}`)}
            onProgressUpdate={async (secs, blockId) => await updateProgress(secs, blockId)}
            onBlockRead={markBlockAsRead}
            onVideoWatched={markVideoWatched}
            onAudioListened={markAudioListened}
            onBackToLessons={() => navigate(`/course/${activeCourse.id}`)}
            onBackToModules={() => navigate(`/course/${activeCourse.id}`)}
            sidebarTab={sidebarTab}
            setSidebarTab={setSidebarTab}
            onTrackAction={onTrackAction}
            onToggleSidebar={onToggleSidebar}
        />
    );
};

export default LessonLoader;
