import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCourse } from '../contexts/CourseContext';
import LessonViewer from './LessonViewer';
import LessonSkeleton from './skeletons/LessonSkeleton';
import { useLessonStore } from '../stores/useLessonStore';
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
    const { contentTheme, setContentTheme } = useLessonStore();

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
    useEffect(() => {
        setContentTheme(theme);
    }, [theme]);
    // User requested "only inside content field", implies independence.
    // However, a sync on mount or prop change is often expected unless overridden.
    // For now, let's keep it simple: it starts with global theme, then acts independently.
    // If the user changes global theme while viewing, we can decide to sync or not.
    // Let's sync it so it feels responsive to global changes too, but local toggle only affects local.
    useEffect(() => {
        setContentTheme(theme);
    }, [theme]);

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
            onProgressUpdate={async (secs, blockId) => await updateProgress(secs)}
            onBackToLessons={() => navigate(`/course/${activeCourse.id}`)}
            onBackToModules={() => navigate(`/course/${activeCourse.id}`)}
            sidebarTab={sidebarTab}
            setSidebarTab={setSidebarTab}
            onTrackAction={onTrackAction}
        />
    );
};

export default LessonLoader;
