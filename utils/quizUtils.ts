import { QuizQuestion, QuizOption } from '../domain/quiz-entities';

const isValidUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

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
            // Fix: Include 'respostaCorreta' and 'correct_option' and ensure we handle numeric 0 which might evaluate to false in || chain.
            let rawGabarito = q.gabarito ?? q.resposta ?? q.respostaCorreta ?? q.correct ?? q.correct_option ?? "";
            const gabarito = String(rawGabarito).trim().toUpperCase();

            // Generate valid UUID for question if not provided or invalid
            const generateUUID = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
            const questionId = (q.id && isValidUUID(q.id)) ? q.id : generateUUID();

            const normalizedOptions = opts
                .map((o: any) => {
                    const optionText = o.optionText || o.text || o.texto || "";
                    let isCorrect = Boolean(o.isCorrect || o.is_correct || o.correta);

                    // If we have a gabarito, try to match it against key, letter index, numeric index, or text
                    if (gabarito !== "") {
                        const optionKey = String(o.key || "").toUpperCase();
                        const optionLetter = String.fromCharCode(65 + o.index).toUpperCase(); // A, B, C...
                        const optionIndex = String(o.index);

                        if (
                            optionKey === gabarito ||
                            optionLetter === gabarito ||
                            optionIndex === gabarito ||
                            optionText.toUpperCase() === gabarito
                        ) {
                            isCorrect = true;
                        }
                    }

                    const optionId = (o.id && isValidUUID(o.id)) ? o.id : generateUUID();

                    return new QuizOption(
                        optionId,
                        questionId,
                        optionText,
                        isCorrect,
                        o.index
                    );
                })
                .filter(o => o.optionText);

            return new QuizQuestion(
                questionId,
                'temp-quiz',
                text,
                'multiple_choice',
                q.numero || 0,
                q.points || q.pontos || 1,
                normalizedOptions,
                q.dificuldade || q.difficulty || 'medium'
            );
        })
        .filter((q: QuizQuestion) => q.questionText && q.options?.length >= 2);
};


export const parseMarkdownQuestions = (markdown: string): any[] => {
    const questions: any[] = [];

    // Improved splitting: look for headers or question numbers at the start of lines
    // This handles both "## Question" and "1. Question" styles
    const blocks = markdown.split(/\n\s*(?=#{1,3}\s+|\d+[\)\.]\s+)/).filter(b => b.trim().length > 0);

    for (const block of blocks) {
        const lines = block.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length === 0) continue;

        let questionText = "";
        const options: any[] = [];
        let gabarito = "";
        let justificativa = "";
        let difficulty = "medium";
        let isParsingOptions = false;

        // Expanded regex for options to handle:
        // 1. A) Text
        // 2. [ ] Text
        // 3. - [ ] Text
        // 4. - [ ] "Text"
        // 5. - "a)" Text
        const optionRegex = /^([a-zA-Z0-9]+)[\)\.]\s*(.*)$|^(-\s*)?\[([ xX])\]\s*(.*)$|^[\-\*]\s*(.*)$/;
        const gabaritoRegex = /^(?:Gabarito|Resposta|Correct|Answer|Resposta correta):\s*(.+)$/i;
        const justificativaRegex = /^(?:Justificativa|Explicação|Explanation|Feedback|Reason):\s*(.+)$/i;
        const difficultyRegex = /^(?:Dificuldade|Difficulty):\s*(.+)$/i;

        for (const line of lines) {
            // Clean markdown bold/italic from start/end of line for metadata checks
            const cleanLine = line.replace(/^\*\*|\*\*$/g, '').trim();

            const gabaritoMatch = cleanLine.match(gabaritoRegex);
            const justificativaMatch = cleanLine.match(justificativaRegex);
            const difficultyMatch = cleanLine.match(difficultyRegex);

            if (gabaritoMatch) {
                gabarito = gabaritoMatch[1].trim();
                continue;
            }

            if (justificativaMatch) {
                justificativa = justificativaMatch[1].trim();
                continue;
            }

            if (difficultyMatch) {
                const rawDiff = difficultyMatch[1].trim().toLowerCase();
                // Map Portuguese terms to English values expected by DB constraint
                if (rawDiff.includes('fácil') || rawDiff.includes('facil') || rawDiff.includes('easy')) {
                    difficulty = 'easy';
                } else if (rawDiff.includes('médio') || rawDiff.includes('medio') || rawDiff.includes('medium')) {
                    difficulty = 'medium';
                } else if (rawDiff.includes('difícil') || rawDiff.includes('dificil') || rawDiff.includes('hard')) {
                    difficulty = 'hard';
                } else {
                    difficulty = 'medium'; // fallback
                }
                continue;
            }

            // Check if it's an option
            const optionMatch = line.match(optionRegex);
            if (optionMatch) {
                isParsingOptions = true;
                let key = "";
                let text = "";
                let markedCorrect = false;

                if (optionMatch[1]) {
                    // "A) Text"
                    key = optionMatch[1];
                    text = optionMatch[2];
                } else if (optionMatch[4]) {
                    // "[ ] Text" or "- [x] Text"
                    const checkMark = optionMatch[4].toLowerCase();
                    markedCorrect = checkMark === 'x';
                    text = optionMatch[5];

                    // Handle inner quotes or AI prefixes like "- [ ] "a)" Text" or "- [ ] **a)** Text"
                    text = text.replace(/^["']|["']$/g, '').trim();
                    // Match pattern: optional asterisks, key (A/1), dot/paren, optional asterisks, any space
                    const innerPrefix = text.match(/^([\*\s]*)?([a-zA-Z0-9]+)[\)\.]([\*\s]*)?\s*(.*)$/);
                    if (innerPrefix) {
                        key = innerPrefix[2];
                        text = innerPrefix[4];
                    }
                } else if (optionMatch[6]) {
                    // "- Text"
                    text = optionMatch[6];
                }

                // Final cleaning: 
                // 1. Remove optional markdown markers at start/end of the resulting string
                // 2. Remove redundant internal keys if they leaked (e.g. "**a)**")
                text = text.replace(/^[\*\s]+|[\*\s]+$/g, '') // remove leading/trailing stars and space
                    .replace(/^([a-zA-Z0-9]+)[\)\.]\s*/, '') // remove redundant internal prefix "a) "
                    .replace(/^[\*\s]+|[\*\s]+$/g, '') // one more star cleanup
                    .trim();

                options.push({
                    key: key,
                    optionText: text,
                    isCorrect: markedCorrect
                });
                continue;
            }

            // If we haven't started parsing options, append to question text
            if (!isParsingOptions) {
                // Ignore metadata-like lines in question text
                if (cleanLine.match(/^(?:Data|Questão|Question)\s*[:\d]/i)) continue;

                const cleanQuestionLine = line.replace(/^#{1,6}\s+/, '').replace(/^\d+[\)\.]\s+/, '');
                if (cleanQuestionLine) {
                    questionText += (questionText ? "\n" : "") + cleanQuestionLine;
                }
            }
        }

        if (questionText && options.length >= 2) {
            questions.push({
                questionText: questionText,
                options: options,
                gabarito: gabarito,
                justificativa: justificativa,
                difficulty: difficulty || 'medium'
            });
        }
    }

    return questions;
};
