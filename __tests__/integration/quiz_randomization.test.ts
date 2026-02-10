import { describe, it, expect } from 'vitest';
import { createSupabaseClient } from '../../services/supabaseClient';
import { SupabaseQuestionBankRepository } from '../../repositories/SupabaseQuestionBankRepository';

describe('Quiz Randomization Logic', () => {
    it('should exclude specified IDs from random selection', async () => {
        const supabase = createSupabaseClient();
        const repo = new SupabaseQuestionBankRepository(supabase);

        // 1. Fetch a small batch of random questions (e.g., 2)
        // We use a small number to increase the chance of collision if exclusion wasn't working,
        // and to work even with a small question bank.
        const firstBatch = await repo.getRandomQuestions(2, {});

        if (firstBatch.length === 0) {
            console.warn('Skipping test: No questions in bank.');
            return;
        }

        const firstBatchIds = firstBatch.map(q => q.id);
        console.log('First batch IDs:', firstBatchIds);

        // 2. Fetch another batch, excluding the first batch IDs
        const secondBatch = await repo.getRandomQuestions(2, {
            excludeIds: firstBatchIds
        });

        const secondBatchIds = secondBatch.map(q => q.id);
        console.log('Second batch IDs:', secondBatchIds);

        // 3. Verify no overlap
        const intersection = secondBatchIds.filter(id => firstBatchIds.includes(id));

        expect(intersection).toHaveLength(0);

        // Optional: If we have enough questions, second batch should not be empty
        // logic: if total questions > firstBatch.length, secondBatch should have items
        // We can't strictly assert this without knowing total count, but we can log it.
        if (secondBatch.length === 0) {
            console.warn('Second batch empty. Possibly not enough questions in bank to support exclusion.');
        }
    });

    it('should respect the requested count', async () => {
        const supabase = createSupabaseClient();
        const repo = new SupabaseQuestionBankRepository(supabase);

        const count = 1;
        const questions = await repo.getRandomQuestions(count, {});

        if (questions.length > 0) {
            expect(questions.length).toBeLessThanOrEqual(count);
        }
    });
});
