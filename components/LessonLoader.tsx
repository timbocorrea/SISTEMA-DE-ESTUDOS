import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCourse } from '../contexts/CourseContext';
import LessonViewer from './LessonViewer';
import { User } from '../domain/entities';

interface LessonLoaderProps {
    user: User;
    theme: 'light' | 'dark';
    onTrackAction: (action: string) => void;
}

const LessonLoader: React.FC<LessonLoaderProps> = ({ user, theme, onTrackAction }) => {
    const { lessonId } = useParams<{ lessonId: string }>();
    const navigate = useNavigate();
    const {
        activeCourse,
        activeLesson,
        selectLesson,
        updateProgress,
        isLoadingCourses
    } = useCourse();

    const [sidebarTab, setSidebarTab] = React.useState<'materials' | 'notes'>('materials');
    // Local state for content theme, initialized with global theme but independent after
    const [contentTheme, setContentTheme] = React.useState<'light' | 'dark'>(theme);

    // Sync URL -> Context
    useEffect(() => {
        if (lessonId && activeCourse) {
            // Only select if not already active or different
            if (activeLesson?.id !== lessonId) {
                selectLesson(lessonId);
            }
        }
    }, [lessonId, activeCourse, activeLesson, selectLesson]);

    // Optional: Update local theme if global theme changes, OR keep it strictly independent.
    // User requested "only inside content field", implies independence.
    // However, a sync on mount or prop change is often expected unless overridden.
    // For now, let's keep it simple: it starts with global theme, then acts independently.
    // If the user changes global theme while viewing, we can decide to sync or not.
    // Let's sync it so it feels responsive to global changes too, but local toggle only affects local.
    useEffect(() => {
        setContentTheme(theme);
    }, [theme]);

    if (isLoadingCourses) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
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
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <div className="animate-pulse flex flex-col items-center">
                    <i className="fas fa-circle-notch fa-spin text-3xl text-indigo-400 mb-2"></i>
                    <p className="text-slate-500">Carregando aula...</p>
                </div>
            </div>
        );
    }

    return (
        <LessonViewer
            course={activeCourse}
            lesson={activeLesson}
            user={user}
            onLessonSelect={(l) => navigate(`/course/${activeCourse.id}/lesson/${l.id}`)}
            onProgressUpdate={async (secs, blockId) => await updateProgress(secs)}
            onBackToLessons={() => navigate(`/course/${activeCourse.id}`)}
            onBackToModules={() => navigate(`/course/${activeCourse.id}`)}
            contentTheme={contentTheme}
            setContentTheme={setContentTheme}
            sidebarTab={sidebarTab}
            setSidebarTab={setSidebarTab}
            onTrackAction={onTrackAction}
        />
    );
};

export default LessonLoader;
