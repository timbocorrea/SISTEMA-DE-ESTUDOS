import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCourse } from '../contexts/CourseContext';
import LessonViewer from './LessonViewer';
import { User } from '../domain/entities';

interface LessonLoaderProps {
    user: User;
    theme: 'light' | 'dark';
}

const LessonLoader: React.FC<LessonLoaderProps> = ({ user, theme }) => {
    const { lessonId } = useParams<{ lessonId: string }>();
    const navigate = useNavigate();
    const {
        activeCourse,
        activeLesson,
        selectLesson,
        updateProgress,
        isLoadingCourses
    } = useCourse();

    // Sync URL -> Context
    useEffect(() => {
        if (lessonId && activeCourse) {
            // Only select if not already active or different
            if (activeLesson?.id !== lessonId) {
                selectLesson(lessonId);
            }
        }
    }, [lessonId, activeCourse, activeLesson, selectLesson]);

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
        // If we have course but no lesson, and we tried to select it... valid ID check?
        // For now, assume loading or not found.
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <div className="animate-pulse flex flex-col items-center">
                    <i className="fas fa-circle-notch fa-spin text-3xl text-indigo-400 mb-2"></i>
                    <p className="text-slate-500">Carregando aula...</p>
                </div>
                {/* Debug Info optionally */}
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
            contentTheme={theme}
            setContentTheme={() => { }} // Simplified, maybe connect to App handler if props drilling
            sidebarTab='materials'
            setSidebarTab={() => { }}
            onTrackAction={() => { }}
        />
    );
};

export default LessonLoader;
