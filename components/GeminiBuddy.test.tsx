import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import GeminiBuddy from './GeminiBuddy';
// Mock Supabase
vi.mock('../services/supabaseClient', () => ({
    createSupabaseClient: vi.fn(),
}));

const mockInvoke = vi.fn();
(createSupabaseClient as any).mockReturnValue({
    functions: {
        invoke: mockInvoke,
    },
});

// Mock Auth
vi.mock('../contexts/AuthContext', () => ({
    useAuth: () => ({ user: { id: 'u1', name: 'Test' } }),
}));

// Mock Router
vi.mock('react-router-dom', () => ({
    useLocation: () => ({ pathname: '/' }),
}));

describe('GeminiBuddy', () => {
    // Increase timeout for this suite due to 5s delay in component
    vi.setConfig({ testTimeout: 15000 });

    it('shows error message/fallback when AI service fails', async () => {
        // Mock failure
        mockInvoke.mockResolvedValue({ data: null, error: { message: 'Service Unavailable' } });

        render(<GeminiBuddy />);

        // Open chat
        // Open chat - verify button exists after delay
        // Open chat - verify button exists after delay (5s delay in component)
        const fab = await screen.findByRole('button', { name: /abrir assistente ia/i }, { timeout: 6000 });
        // Note: The button might not have accessible name 'gemini', checking icon or class is harder. 
        // Let's rely on finding by role or specific class selector if usually button.
        // Looking at code: it's a button with an img.
        fireEvent.click(fab);

        // Type message
        const input = screen.getByPlaceholderText(/digite sua dúvida/i);
        fireEvent.change(input, { target: { value: 'Hello' } });
        fireEvent.click(screen.getByRole('button', { name: /^enviar$/i }));

        // Wait for error handling
        await waitFor(() => {
            expect(screen.getByText(/Erro: Service Unavailable/i)).toBeInTheDocument();
        });
    });
});
