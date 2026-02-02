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
            // Fix: Include 'respostaCorreta' and 'correct_option' and ensure we handle numeric 0 which might evaluate to false in || chain.
            let rawGabarito = q.gabarito ?? q.resposta ?? q.respostaCorreta ?? q.correct ?? q.correct_option ?? "";
            const gabarito = String(rawGabarito).trim().toUpperCase();

            const normalizedOptions = opts
                .map((o: any) => {
                    const optionText = o.optionText || "";
                    let isCorrect = Boolean(o.isCorrect);

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

export const parseMarkdownQuestions = (markdown: string): any[] => {
    const questions: any[] = [];
    // Split by double newlines or lines starting with '###' or multiple dashes to separate questions
    const blocks = markdown.split(/\n\s*\n|(?=\n\s*#{1,3}\s+)/).filter(b => b.trim().length > 0);

    for (const block of blocks) {
        const lines = block.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length === 0) continue;

        let questionText = "";
        const options: any[] = [];
        let gabarito = "";
        let justificativa = "";
        let isParsingOptions = false;

        // Try to identify the question text (usually the first lines until an option starts)
        // Options usually start with "A)", "a)", "1.", "-", "*", "- [ ]", "[ ]", "- [x]", "[x]"
        // Regex groups:
        // 1: Parenthesis/Dot style (A., 1)
        // 2: Text for group 1
        // 3: Checklist style checkbox [ ] or [x] or [X] (optional dash prefix handled by start anchor)
        // 4: Text for group 3
        // 5: Bullet style (- or *)
        // 6: Text for group 5
        const optionRegex = /^([a-zA-Z0-9]+)[\)\.]\s+(.+)$|^(-\s*)?\[([ xX])\]\s+(.+)$|^[\-\*]\s+(.+)$/;
        const gabaritoRegex = /^(?:Gabarito|Resposta|Correct|Answer):\s*(.+)$/i;
        const justificativaRegex = /^(?:Justificativa|Explicação|Explanation|Feedback|Reason):\s*(.+)$/i;

        for (const line of lines) {
            // Check for metadata at bottom
            const gabaritoMatch = line.match(gabaritoRegex);
            const justificativaMatch = line.match(justificativaRegex);

            if (gabaritoMatch) {
                gabarito = gabaritoMatch[1].trim();
                continue;
            }

            if (justificativaMatch) {
                justificativa = justificativaMatch[1].trim();
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
                    // Clean "**A)**" prefix if present inside checklist text
                    // Example: "- [ ] **A)** Text" -> Key A, Text "Text"
                    const innerPrefix = text.match(/^\*\*([a-zA-Z0-9]+)\)[\*]*\s+(.+)$/);
                    if (innerPrefix) {
                        key = innerPrefix[1];
                        text = innerPrefix[2];
                    }
                } else if (optionMatch[6]) {
                    // "- Text"
                    text = optionMatch[6];
                }

                // Check if the option is marked as correct inline (e.g. *Option Text*)
                let isCorrect = markedCorrect;
                if (!isCorrect) {
                    if (text.startsWith('*') && text.endsWith('*')) {
                        isCorrect = true;
                        text = text.slice(1, -1);
                    } else if (text.startsWith('**') && text.endsWith('**')) {
                        isCorrect = true;
                        text = text.slice(2, -2);
                    }
                }

                options.push({
                    key: key,
                    optionText: text.trim(),
                    isCorrect: isCorrect
                });
                continue;
            }

            // If we haven't started parsing options, append to question text
            if (!isParsingOptions) {
                // Remove Markdown headers if present
                const cleanLine = line.replace(/^#{1,6}\s+/, '').replace(/^\d+[\)\.]\s+/, '');
                questionText += (questionText ? "\n" : "") + cleanLine;
            }
        }

        if (questionText && options.length >= 2) {
            questions.push({
                questionText: questionText,
                options: options,
                gabarito: gabarito,
                justificativa: justificativa,
                difficulty: 'medium' // default
            });
        }
    }

    return questions;
};
