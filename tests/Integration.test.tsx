import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CourseProvider } from '../contexts/CourseContext';
import { useAuth } from '../contexts/AuthContext';
import StudentDashboard from '../components/StudentDashboard';
import { Course, Module, Lesson, User } from '../domain/entities';

// Mocks
vi.mock('../contexts/AuthContext');
const mockUseAuth = useAuth as unknown as ReturnType<typeof vi.fn>;

const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
});

// Setup mock data
const mockCourse = new Course('c1', 'Test Course', 'Description', null, null, null, []);
// Mock User with necessary methods to avoid class instance issues in test env
const mockUser = {
    id: 'u1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'STUDENT',
    xp: 0,
    level: 1,
    calculateLevelProgress: () => 50,
    getRemainingXpForNextLevel: () => 500,
    checkAndAddAchievements: () => null,
    achievements: []
};

describe('Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseAuth.mockReturnValue({
            user: mockUser,
            isAdmin: false
        });
    });

    it('renders dashboard with courses', async () => {
        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <StudentDashboard
                        user={mockUser as any}
                        courses={[mockCourse]}
                        onCourseClick={vi.fn()}
                    />
                </MemoryRouter>
            </QueryClientProvider>
        );

        expect(screen.getByText('Test Course')).toBeInTheDocument();
        expect(screen.getByText('Meu Dashboard')).toBeInTheDocument();
    });

    it('handles course click navigation', async () => {
        const handleCourseClick = vi.fn();

        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <StudentDashboard
                        user={mockUser as any}
                        courses={[mockCourse]}
                        onCourseClick={handleCourseClick}
                    />
                </MemoryRouter>
            </QueryClientProvider>
        );

        // Target the action button which actually has the click handler in Cards mode
        fireEvent.click(screen.getByText('Continuar'));
        expect(handleCourseClick).toHaveBeenCalledWith('c1');
    });

    // Note: Testing actual routing integration inside App.tsx is complex due to many providers.
    // Testing component interaction boundaries (like above) is often sufficient for integration.
});
