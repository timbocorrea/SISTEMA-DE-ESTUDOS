import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCourse } from '../contexts/CourseContext';
import { Course } from '../domain/entities';

// We need to access the repository. 
// Ideally, avoiding importing Context inside the hook that the Context uses would be circular.
// Use Service pattern instantiated in Context, or passed here.
// But React Query hooks usually live outside context or used BY context.
// Let's assume we pass the service or use a Service Locator/Hook.
// For now, to solve the circular dependency (Context uses Hook uses Service from Context),
// we will instantiate the hook inside the Context or make sure the service is available.
// In CourseContext.tsx, we instantiate CourseService.
// Let's adapt this hook to accept the service or user ID.

import { CourseService } from '../services/CourseService';
// We need to get the instance of service. 
// Since we used `createSupabaseClient` directly in Context, let's export a singleton or hook for service.
// Or just let the Context handle the queries using `useQuery` directly for simplicity in Phase 3 refactor.
// BUT the plan was to create `useCourses`.

// Let's refactor CourseContext to instantiate the service and specific React Query calls.
// And create this file as a collection of query definitions if we can pass the service.

export const useCoursesList = (service: CourseService, userId: string | undefined, enabled: boolean) => {
    return useQuery({
        queryKey: ['courses', 'list', userId],
        queryFn: async () => {
            if (!userId) return [];
            const summaries = await service.getCoursesSummary(userId);
            // Map summary to Course entity with empty modules to be lightweight
            // This satisfies the UI expectation of Course[] without the heavy load
            return summaries.map(s => new Course(
                s.id,
                s.title,
                s.description,
                s.imageUrl,
                [] // Empty modules for summary view
            ));
        },
        enabled: enabled && !!userId,
        staleTime: 1000 * 60 * 10, // 10 minutes
    });
};

export const useCourseDetails = (service: CourseService, courseId: string | null, userId: string | undefined) => {
    return useQuery({
        queryKey: ['course', courseId, userId],
        queryFn: async () => {
            if (!courseId) return null;
            // We need a method in Service to get single course which calls repo.getCourseById
            // Existing 'fetchAvailableCourses' returned all.
            // We need 'getCourseById' exposed in Service.
            // Checking CourseService... I need to update it as well.
            return service.getCourseById(courseId, userId);
        },
        enabled: !!courseId && !!userId,
        staleTime: 1000 * 60 * 30, // 30 minutes
    });
};
