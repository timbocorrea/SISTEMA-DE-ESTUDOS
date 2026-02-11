
const parseMarkdownQuestionsPatched = (markdown: string): any[] => {
    const questions: any[] = [];

    // Improved splitting: Look for "### Questão", "### Question", "## Question" or numeric starts
    // We split by standard headers or question patterns
    const blocks = markdown.split(/\n\s*(?=#{1,3}\s+Questão|#{1,3}\s+Question|\d+[\)\.]\s+)/i).filter(b => b.trim().length > 0);

    for (const block of blocks) {
        const lines = block.split('\n').map(l => l.trimRight());
        if (lines.length === 0) continue;

        let questionText = "";
        let topic = "";
        let context = "";
        const options: any[] = [];
        let gabarito = "";
        let justificativa = "";
        let difficulty = "medium";

        let isParsingOptions = false;
        let isParsingStructure = 'header'; // header, topic, context, question, options, answer, justification

        // Regex definitions
        const topicRegex = /^\*\*Tópico:\*\*\s*(.+)$/i;
        const contextStartRegex = /^\*\*Contexto:\*\*\s*(.*)/i;
        const questionStartRegex = /^\*\*Pergunta:\*\*\s*(.*)/i;

        // Header Topic Regex: ### Questão 1 (Tópico: ...)
        const headerTopicRegex = /^#{1,3}\s+Questão\s+\d+\s*\((?:Tópico|Topic):\s*(.+)\)/i;

        // Options: "[ ] A) Text", "- [ ] A) Text", "A) Text"
        const optionRegex = /^(-\s*)?\[([ xX])\]\s*([A-Z]\))?\s*(.*)$|^([A-Z])[\)\.]\s*(.*)$/;
        const blockquoteRegex = /^>\s*(.+)$/;

        const gabaritoRegex = /^(?:Gabarito|Resposta|Correct|Answer|Resposta correta):\s*(.+)$/i;
        const justificativaRegex = /^(?:Justificativa|Explicação|Explanation|Feedback|Reason):\s*(.+)$/i;
        const difficultyRegex = /^(?:Dificuldade|Difficulty):\s*(.+)$/i;

        // Metadata with bold prefixes (e.g., **Gabarito:** or **Explicação:**)
        // These might appear at start of line
        const boldGabaritoRegex = /^\*\*(?:Gabarito|Resposta|Correct|Answer|Resposta correta):\*\*\s*(.+)$/i;
        const boldJustificativaRegex = /^\*\*(?:Justificativa|Explicação|Explanation|Feedback|Reason):\*\*\s*(.+)$/i;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();

            // Skip empty lines between clear sections, unless in text accumulation mode
            if (!line) {
                if (isParsingStructure === 'context') context += "\n";
                if (isParsingStructure === 'question') questionText += "\n";
                continue;
            }

            // Clean markdown bold/italic from start/end of line for metadata checks if needed
            // But be careful not to strip bold prefixes we want to match specifically
            const cleanLine = line.replace(/^\*\*|\*\*$/g, '').trim();

            // 0. Check Header Topic (if line is the first line or starts with #)
            const headerTopicMatch = line.match(headerTopicRegex);
            if (headerTopicMatch) {
                topic = headerTopicMatch[1].trim();
                // Don't continue, as the header line might contain other info? 
                // Usually header is just header.
                continue;
            }

            // 1. Detect Topics (explicit line)
            const topicMatch = line.match(topicRegex);
            if (topicMatch) {
                topic = topicMatch[1].trim();
                continue;
            }

            // 2. Detect Context
            const contextMatch = line.match(contextStartRegex);
            if (contextMatch) {
                context = contextMatch[1].trim();
                isParsingStructure = 'context';
                continue;
            }

            // 3. Detect Question Start
            const questionMatch = line.match(questionStartRegex);
            if (questionMatch) {
                questionText = questionMatch[1].trim();
                isParsingStructure = 'question';
                continue;
            }

            // 4. Detect Blockquotes (Answer/Justification)
            const blockquoteMatch = line.match(blockquoteRegex);
            if (blockquoteMatch) {
                let content = blockquoteMatch[1].trim();

                const innerGabaritoMatch = content.match(/^\*\*Resposta Correta:\*\*\s*([A-Z])/i);
                if (innerGabaritoMatch) { gabarito = innerGabaritoMatch[1]; continue; }

                const innerJustifMatch = content.match(/^(?:\[.*?\])?\*\*Justificativa:\*\*\s*(.+)/i);
                if (innerJustifMatch) { justificativa = innerJustifMatch[1].trim(); isParsingStructure = 'justification'; continue; }

                const stdGabarito = content.match(gabaritoRegex);
                if (stdGabarito) { gabarito = stdGabarito[1].trim(); continue; }

                if (isParsingStructure === 'justification') { justificativa += " " + content; }
                continue;
            }

            // 5. Check standard/bold metadata if not in blockquote
            // Check matches with bold prefix first
            if (line.match(boldGabaritoRegex)) { gabarito = line.match(boldGabaritoRegex)![1].trim(); continue; }
            if (line.match(boldJustificativaRegex)) { justificativa = line.match(boldJustificativaRegex)![1].trim(); isParsingStructure = 'justification'; continue; } // switch to Justification mode to capture multi-line explanations

            // Check matches without bold prefix (legacy or cleanLine)
            if (cleanLine.match(gabaritoRegex)) { gabarito = cleanLine.match(gabaritoRegex)![1].trim(); continue; }
            // If cleanLine matches justification, it might match "**Justificativa:** Text" -> "Justificativa: Text"
            if (cleanLine.match(justificativaRegex)) { justificativa = cleanLine.match(justificativaRegex)![1].trim(); isParsingStructure = 'justification'; continue; }

            if (line.match(difficultyRegex)) {
                const rawDiff = line.match(difficultyRegex)![1].trim().toLowerCase();
                if (rawDiff.includes('fácil') || rawDiff.includes('facil') || rawDiff.includes('easy')) difficulty = 'easy';
                else if (rawDiff.includes('difícil') || rawDiff.includes('dificil') || rawDiff.includes('hard')) difficulty = 'hard';
                else difficulty = 'medium';
                continue;
            }

            // 6. Parsing Flow & Options

            if (isParsingStructure === 'context') {
                if (line.match(questionStartRegex) || line.match(optionRegex)) {
                } else { context += "\n" + line; continue; }
            }

            if (isParsingStructure === 'justification') {
                // If we hit a separator or new header, we stop. But loop handles new header by splitting blocks.
                // So we just accumulate until end of block or next metadata?
                // Be careful not to swallow options if justification came before options (unlikely).
                justificativa += " " + line;
                continue;
            }

            const optMatch = line.match(optionRegex);
            if (optMatch) {
                isParsingStructure = 'options';
                let isCorrect = false;
                let key = "";
                let text = "";

                if (optMatch[2]) { // Bracket style
                    isCorrect = optMatch[2].toLowerCase() === 'x';
                    if (optMatch[3]) key = optMatch[3].replace(')', '');
                    text = optMatch[4];
                } else if (optMatch[5]) { // Simple "A) Text" style
                    key = optMatch[5];
                    text = optMatch[6];
                }

                text = text.trim().replace(/^["']|["']$/g, '').replace(/^[\*\s]+|[\*\s]+$/g, '').trim();
                options.push({ key: key, optionText: text, isCorrect: isCorrect });
                continue;
            }

            if (isParsingStructure !== 'justification' && isParsingStructure !== 'options') {
                if (cleanLine.match(/^(?:Data|Questão|Question)\s*[:\d]/i)) continue; // ignore "Questão 1" standalone lines if they existed, but we split by them now
                if (line.match(/^#{1,3}\s+Questão/i)) continue; // Extra safety if split kept header? split usually removes separator unless lookahead

                const cleanQuestionLine = line.replace(/^#{1,6}\s+/, '').replace(/^\d+[\)\.]\s+/, '');
                if (cleanQuestionLine) {
                    questionText += (questionText ? "\n" : "") + cleanQuestionLine;
                }
            }
        }

        let finalQuestionText = "";
        if (topic) finalQuestionText += `**Tópico:** ${topic}\n\n`;
        if (context) finalQuestionText += `**Contexto:** ${context.trim()}\n\n`;
        finalQuestionText += questionText.trim();
        if (justificativa) finalQuestionText += `\n\n> **Justificativa:** ${justificativa.trim()}`;

        if (gabarito) {
            const cleanGabarito = gabarito.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
            options.forEach((opt, idx) => {
                const optKey = opt.key ? opt.key.toUpperCase() : String.fromCharCode(65 + idx);
                if (optKey === cleanGabarito || opt.optionText.startsWith(gabarito + ")")) { opt.isCorrect = true; }
            });
        }

        if (finalQuestionText && options.length >= 2) {
            questions.push({
                questionText: finalQuestionText.trim(),
                options: options,
                gabarito: gabarito,
                justificativa: justificativa,
                difficulty: difficulty
            });
        }
    }
    return questions;
};

// NEW INPUT FORMAT
const markdownInputNew = `
### Questão 1 (Tópico: 1 Programação por blocos: variáveis e entrada de dados)

O texto descreve a evolução dos computadores de dispositivos de função única para a arquitetura de von Neumann...

A) A necessidade de alterar fisicamente os componentes ou desligar a máquina para mudar sua função.
B) A capacidade de armazenar tanto as instruções quanto os dados na memória de acesso aleatório (RAM), eliminando interruptores externos.
C) O uso de sistemas decimais em vez de binários para processar instruções complexas de entrada e saída.
D) A separação total entre a unidade de memória e a unidade de processamento, impedindo a interação entre dados e instruções.

**Gabarito:** B

**Explicação:** O texto afirma explicitamente que os computadores com arquitetura von Neumann são conhecidos como programas armazenados...

--- 
`;

console.log("Running PATCHED Parser on Format 2...");
const results = parseMarkdownQuestionsPatched(markdownInputNew);
console.log(JSON.stringify(results, null, 2));

if (results.length > 0) {
    const q1 = results[0];
    console.log("--- Check Q1 ---");
    console.log("Topic extracted?", q1.questionText.includes("**Tópico:** 1 Programação por blocos"));
    console.log("Gabarito found?", q1.gabarito === 'B');
    console.log("Justification found?", q1.justificativa.includes("O texto afirma explicitamente"));
    console.log("Correct Option Set?", q1.options.find((o: any) => o.key === 'B').isCorrect);
} else {
    console.error("No questions parsed!");
}
export { };
