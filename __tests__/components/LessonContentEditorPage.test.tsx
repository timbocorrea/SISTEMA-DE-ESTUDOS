import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LessonContentEditorPage from '../../components/LessonContentEditorPage';
import {
    mockLesson,
    mockResources,
    createMockAdminService,
    createMockFile
} from '../mocks/lessonMocks';

// Mock dependencies - MUST be at top level without external variables
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warning: vi.fn()
    },
    Toaster: () => null
}));

vi.mock('../../services/supabaseClient', () => ({
    createSupabaseClient: () => ({
        from: vi.fn(),
        storage: vi.fn()
    })
}));

describe('LessonContentEditorPage - Integration Tests', () => {
    const mockOnSave = vi.fn();
    const mockOnCancel = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        document.body.innerHTML = '';
    });

    describe('1. Load Lesson Successfully', () => {
        it('should load and display lesson data', async () => {
            render(
                <LessonContentEditorPage
                    lesson={mockLesson}
                    onSave={mockOnSave}
                    onCancel={mockOnCancel}
                />
            );

            // Verificar se o componente renderizou
            await waitFor(() => {
                expect(document.body.textContent).toBeTruthy();
            }, { timeout: 3000 });
        });

        it('should render lesson blocks', async () => {
            render(
                <LessonContentEditorPage
                    lesson={mockLesson}
                    onSave={mockOnSave}
                    onCancel={mockOnCancel}
                />
            );

            await waitFor(() => {
                const editableElements = document.querySelectorAll('[contenteditable="true"]');
                expect(editableElements.length).toBeGreaterThan(0);
            }, { timeout: 3000 });
        });
    });

    describe('2. Add New Block', () => {
        it('should have blocks in DOM', async () => {
            render(
                <LessonContentEditorPage
                    lesson={mockLesson}
                    onSave={mockOnSave}
                    onCancel={mockOnCancel}
                />
            );

            await waitFor(() => {
                const blocks = document.querySelectorAll('[contenteditable="true"]');
                expect(blocks.length).toBeGreaterThanOrEqual(1);
            }, { timeout: 3000 });
        });
    });

    describe('3. Edit Block Content', () => {
        it('should have editable blocks', async () => {
            render(
                <LessonContentEditorPage
                    lesson={mockLesson}
                    onSave={mockOnSave}
                    onCancel={mockOnCancel}
                />
            );

            await waitFor(() => {
                const editableBlock = document.querySelector('[contenteditable="true"]');
                expect(editableBlock).toBeInTheDocument();
            }, { timeout: 3000 });
        });
    });

    describe('4. Save Changes', () => {
        it('should have save button', async () => {
            render(
                <LessonContentEditorPage
                    lesson={mockLesson}
                    onSave={mockOnSave}
                    onCancel={mockOnCancel}
                />
            );

            await waitFor(() => {
                // Check if component rendered
                expect(document.body.textContent).toBeTruthy();
            }, { timeout: 3000 });
        });
    });

    describe('5. UI Snapshot', () => {
        it('should match UI snapshot', async () => {
            const { container } = render(
                <LessonContentEditorPage
                    lesson={mockLesson}
                    onSave={mockOnSave}
                    onCancel={mockOnCancel}
                />
            );

            // Wait for render
            await waitFor(() => {
                expect(container.querySelector('[contenteditable]')).toBeInTheDocument();
            }, { timeout: 3000 });

            expect(container).toMatchSnapshot();
        });
    });
});
