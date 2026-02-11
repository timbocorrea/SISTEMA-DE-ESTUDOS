
const parseMarkdownQuestions = (markdown: string): any[] => {
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

const markdownInput = `
# Questionário: Fundamentos da Programação por Blocos e Arquitetura de Computadores
**Baseado no Capítulo 3: Variáveis e programação por blocos**

---

## Instruções
Este questionário de nível avançado testa a compreensão dos conceitos de arquitetura de Von Neumann, lógica de coordenadas e manipulação de memória no ambiente Scratch. Analise os trechos citados e escolha a alternativa correta.

---

### Questão 1
**Tópico:** 1. Programação por blocos: variáveis e entrada de dados
**Contexto:** O texto diferencia computadores antigos (função única) da arquitetura moderna proposta por John von Neumann. [cite_start]O texto afirma: *"Nessa arquitetura, cada computador teria memória, mecanismos de entrada e saída, um controle central..."* e *"Isso significa que o computador não precisa de interruptores externos ou outras influências para funcionar."*[cite: 26, 28].

**Pergunta:** Com base na definição de "programas armazenados" apresentada no material, qual é a característica técnica fundamental que permite a flexibilidade da arquitetura de Von Neumann em comparação aos computadores anteriores a 1940?

- [ ] A) A capacidade de processar dados decimais em vez de binários, facilitando a interface com o usuário humano.
- [ ] B) A existência de uma memória de acesso aleatório (RAM) onde tanto as instruções do programa quanto os dados são armazenados juntos, eliminando a necessidade de reconfiguração física.
- [ ] C) A separação física entre a Unidade Lógica e Aritmética e a Unidade de Controle, permitindo que o processamento ocorra sem consumo de energia.
- [ ] D) A substituição de transistores por chips de silicone, que impedem que os dados sejam apagados quando o computador é desligado.

> **Resposta Correta:** B
> [cite_start]**Justificativa:** O texto explica que a inovação foi permitir que *"Todas as instruções e os dados são armazenados na memória de acesso aleatório (RAM)"* [cite: 29][cite_start], ao contrário das máquinas anteriores que exigiam *"alterar a máquina fisicamente"*[cite: 18].
`;

console.log("Parsing markdown...");
const questions = parseMarkdownQuestions(markdownInput);
console.log(JSON.stringify(questions, null, 2));

if (questions.length === 0) {
    console.error("FAILED: No questions parsed.");
} else {
    const q1 = questions.find(q => q.questionText.includes("característica técnica fundamental"));
    if (!q1) {
        console.error("FAILED: Question 1 not found.");
    } else {
        console.log("Question 1 found.");
        let failed = false;

        // Debug output
        console.log(`Parsed Context/Text start: ${q1.questionText.substring(0, 50)}...`);
        console.log(`Parsed Gabarito: ${q1.gabarito}`);
        console.log(`Parsed Justificativa: ${q1.justificativa}`);

        if (q1.gabarito !== 'B') {
            console.error(`FAILED: Gabarito is '${q1.gabarito}', expected 'B'`);
            failed = true;
        }
        if (!q1.justificativa) {
            console.error("FAILED: Justificativa missing or empty");
            failed = true;
        }
        if (q1.options.length !== 4) {
            console.error(`FAILED: Expected 4 options, got ${q1.options.length}`);
            failed = true;
        }
        if (!q1.questionText.includes("Contexto:")) {
            console.warn("WARNING: Context missing from question text (might be separate field if we change schema)");
        }
    }
}
