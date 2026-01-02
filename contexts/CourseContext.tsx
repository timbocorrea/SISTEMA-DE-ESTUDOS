import React, { createContext, useContext, useEffect, useState } from 'react';
import { Course, Lesson, Module } from '../domain/entities';
import { CourseService } from '../services/CourseService';
import { SupabaseCourseRepository } from '../repositories/SupabaseCourseRepository';
import { createSupabaseClient } from '../services/supabaseClient';
import { useAuth } from './AuthContext';
import { useCoursesList, useCourseDetails } from '../hooks/useCourses';

interface CourseContextType {
    availableCourses: any[]; // CourseSummary[] | Course[] - relaxed for transition
    enrolledCourses: Course[];
    activeCourse: Course | null;
    activeModule: Module | null;
    activeLesson: Lesson | null;
    isLoadingCourses: boolean;

    selectCourse: (courseId: string) => void;
    selectModule: (moduleId: string) => void;
    selectLesson: (lessonId: string) => void;

    updateProgress: (watchedSeconds: number) => Promise<void>;
    enrollInCourse: (courseId: string) => Promise<void>;

    courseService: CourseService;
}

const CourseContext = createContext<CourseContextType | undefined>(undefined);

export const CourseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    // State for Active Items
    const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
    const [activeModule, setActiveModule] = useState<Module | null>(null);
    const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);

    // Initialize Service (Memoized)
    // We instantiate it once. Since repository is stateless, this is fine.
    const courseService = React.useMemo(() => new CourseService(new SupabaseCourseRepository(createSupabaseClient())), []);

    // 1. Fetch Lists (Summary)
    const coursesListQuery = useCoursesList(courseService, user?.id, !!user);
    const availableCourses = (coursesListQuery.data || []) as unknown as Course[];

    // 2. Fetch Active Course Details
    const courseDetailsQuery = useCourseDetails(courseService, activeCourseId, user?.id);
    const activeCourse = courseDetailsQuery.data || null;

    const isLoadingCourses = coursesListQuery.isLoading || courseDetailsQuery.isLoading;
    const enrolledCourses = availableCourses; // Keeping simplified for now as per plan

    // Reset module/lesson when course changes (handled partly effectively by activeCourse changing, 
    // but explicit reset on ID change is good).
    useEffect(() => {
        if (!activeCourseId) {
            setActiveModule(null);
            setActiveLesson(null);
        }
    }, [activeCourseId]);

    const selectCourse = (courseId: string) => {
        if (activeCourseId !== courseId) {
            setActiveCourseId(courseId);
            setActiveModule(null);
            setActiveLesson(null);
        }
    };

    const selectModule = (moduleId: string) => {
        if (!activeCourse) return;
        const mod = activeCourse.modules.find(m => m.id === moduleId);
        if (mod) {
            setActiveModule(mod);
            setActiveLesson(null);
        }
    };

    const selectLesson = (lessonId: string) => {
        if (!activeCourse) return;
        for (const mod of activeCourse.modules) {
            const lesson = mod.lessons.find(l => l.id === lessonId);
            if (lesson) {
                setActiveModule(mod);
                setActiveLesson(lesson);
                return;
            }
        }
    };

    const updateProgress = async (watchedSeconds: number) => {
        if (!activeLesson || !activeCourse || !user) return;
        // Optimistic
        activeLesson.updateProgress(watchedSeconds);
        // Server
        await courseService.updateUserProgress(user, activeLesson, activeCourse, activeLesson.isCompleted);
        // Force update (context ref ref) - React Query might not refetch immediately.
        // We might need to manually invalidate or set query data.
        // queryClient.setQueryData... (need access to client)
    };

    const enrollInCourse = async (courseId: string) => {
        if (!user) return;
        await courseService.enrollUserInCourse(user.id, courseId);
        // Invalidate queries
        // coursesListQuery.refetch();
    };

    const value = {
        availableCourses: availableCourses as any, // Type adaptation
        enrolledCourses: availableCourses as any, // Simplified for now (all visible)
        activeCourse,
        activeModule,
        activeLesson,
        isLoadingCourses,
        selectCourse,
        selectModule,
        selectLesson,
        updateProgress,
        enrollInCourse,
        courseService
    };

    return (
        <CourseContext.Provider value={value}>
            {children}
        </CourseContext.Provider>
    );
};

export const useCourse = () => {
    const context = useContext(CourseContext);
    if (context === undefined) {
        throw new Error('useCourse must be used within a CourseProvider');
    }
    return context;
};
