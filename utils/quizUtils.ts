import { QuizQuestion, QuizOption } from '../domain/quiz-entities';

export const normalizeQuestions = (parsed: any[]) => {
    return parsed
        .map((q: any) => {
            // Determine question text from various possible keys
            let text = q.questionText || q.enunciado || q.pergunta || q.texto || q.prompt || q.question || "";

            // Append justification if available
            const justification = q.justificativa || q.explicacao || q.feedback || q.reason || q.justification;
            if (justification && text) {
                text += `\n\n*Justificativa:* ${justification}`;
            }

            // Determine options from various possible keys
            let opts: any[] = [];
            const rawOptions = q.options || q.alternativas || q.opcoes || q.choices || q.respostas || q.answers || [];

            if (Array.isArray(rawOptions)) {
                opts = rawOptions.map((o, idx) => {
                    if (typeof o === 'string') return { optionText: o, index: idx };
                    return { ...o, index: idx };
                });
            } else if (typeof rawOptions === 'object' && rawOptions !== null) {
                opts = Object.entries(rawOptions).map(([key, val], idx) => ({
                    key: key,
                    optionText: String(val),
                    index: idx
                }));
            }

            // Determine correct answer (gabarito)
            const gabarito = String(q.gabarito || q.resposta || q.correct || "").trim().toUpperCase();

            const normalizedOptions = opts
                .map((o: any) => {
                    const optionText = o.optionText || "";
                    let isCorrect = Boolean(o.isCorrect);

                    // If we have a gabarito, try to match it against key, letter index, or text
                    if (gabarito) {
                        const optionKey = String(o.key || "").toUpperCase();
                        const optionLetter = String.fromCharCode(65 + o.index).toUpperCase(); // A, B, C...

                        if (optionKey === gabarito || optionLetter === gabarito || optionText.toUpperCase() === gabarito) {
                            isCorrect = true;
                        }
                    }

                    return new QuizOption(
                        o.id || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)),
                        q.id || 'temp-q',
                        optionText,
                        isCorrect,
                        o.index
                    );
                })
                .filter(o => o.optionText);

            return new QuizQuestion(
                q.id || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)),
                'temp-quiz',
                text,
                'multiple_choice',
                q.numero || 0,
                q.points || q.pontos || 1,
                normalizedOptions,
                q.difficulty || q.dificuldade || 'medium'
            );
        })
        .filter((q: QuizQuestion) => q.questionText && q.options?.length >= 2);
};
