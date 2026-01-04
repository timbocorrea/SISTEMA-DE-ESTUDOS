/**
 * Type-Safe Mappers for converting Database DTOs to Domain Entities
 * These mappers ensure that data from the database is correctly transformed
 * into our domain model with proper validation and type safety.
 */

import {
    DatabaseQuizResponse,
    DatabaseQuizQuestionResponse,
    DatabaseQuizOptionResponse,
    DatabaseBankQuestionResponse,
    DatabaseBankOptionResponse,
    DatabaseQuizAttemptResponse
} from '../types/supabase-dtos';
import { Quiz, QuizQuestion, QuizOption, QuizAttemptResult } from '../domain/quiz-entities';
import { QuestionDifficulty } from '../domain/quiz-entities';

/**
 * Mapper for Quiz entities
 */
export class QuizMapper {
    /**
     * Maps a database quiz response to a Quiz domain entity
     */
    static fromDatabase(dto: DatabaseQuizResponse, questions: QuizQuestion[] = []): Quiz {
        return new Quiz(
            dto.id,
            dto.lesson_id,
            dto.title,
            dto.description,
            dto.passing_score,
            questions,
            dto.is_manually_released,
            dto.questions_count,
            dto.pool_difficulty as QuestionDifficulty | null
        );
    }
}

/**
 * Mapper for QuizQuestion entities
 */
export class QuizQuestionMapper {
    /**
     * Maps a database quiz question response to a QuizQuestion domain entity
     */
    static fromDatabase(dto: DatabaseQuizQuestionResponse, options: QuizOption[]): QuizQuestion {
        // Convert question_type to supported QuestionType
        // Note: 'short_answer' from DTquestion mapped to 'multiple_choice' for compatibility
        const questionType = dto.question_type === 'short_answer' ? 'multiple_choice' : dto.question_type as 'multiple_choice' | 'true_false';

        return new QuizQuestion(
            dto.id,
            dto.quiz_id,
            dto.question_text,
            questionType,
            dto.position,
            dto.points,
            options,
            dto.difficulty as QuestionDifficulty | undefined,
            dto.image_url || undefined
        );
    }
}

/**
 * Mapper for QuizOption entities
 */
export class QuizOptionMapper {
    /**
     * Maps a database quiz option response to a QuizOption object
     */
    static fromDatabase(dto: DatabaseQuizOptionResponse): QuizOption {
        return {
            id: dto.id,
            questionId: dto.question_id,
            optionText: dto.option_text,
            isCorrect: dto.is_correct,
            position: dto.position
        };
    }
}

/**
 * Mapper for Question Bank entities
 */
export class QuestionBankMapper {
    /**
     * Maps a database bank question response to a QuizQuestion domain entity
     */
    static fromDatabase(dto: DatabaseBankQuestionResponse, options: QuizOption[]): QuizQuestion {
        // Generate a temporary quiz_id for bank questions (they're not tied to a specific quiz yet)
        const tempQuizId = `bank_${dto.id}`;

        return new QuizQuestion(
            dto.id,
            tempQuizId,
            dto.question_text,
            'multiple_choice', // Bank questions are typically multiple choice
            0, // Position will be set when added to a quiz
            dto.points,
            options,
            dto.difficulty as QuestionDifficulty,
            dto.image_url || undefined
        );
    }
}

/**
 * Mapper for Question Bank Options
 */
export class BankOptionMapper {
    /**
     * Maps a database bank option response to a QuizOption object
     */
    static fromDatabase(dto: DatabaseBankOptionResponse): QuizOption {
        return {
            id: dto.id,
            questionId: dto.question_id,
            optionText: dto.option_text,
            isCorrect: dto.is_correct,
            position: dto.position
        };
    }
}

/**
 * Mapper for Quiz Attempt Results
 */
export class QuizAttemptMapper {
    /**
     * Maps a database quiz attempt response to a QuizAttemptResult domain object
     */
    static fromDatabase(dto: DatabaseQuizAttemptResponse, totalPoints: number): QuizAttemptResult {
        const earnedPoints = Math.round((dto.score / 100) * totalPoints);

        return {
            score: dto.score,
            passed: dto.passed,
            earnedPoints,
            totalPoints
        };
    }
}
