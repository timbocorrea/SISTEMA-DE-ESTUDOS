
const parseMarkdownQuestionsPOC = (markdown: string): any[] => {
    const questions: any[] = [];

    // Improved block splitting: Look for "### Questão" or similar headers as primary delimiters
    // The previous regex split on any header or number, which might be too aggressive if questions contain lists
    const blocks = markdown.split(/\n\s*(?=#{3}\s+Questão\s+\d+)/i).filter(b => b.trim().length > 0);

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
        const contextRegex = /^\*\*Contexto:\*\*\s*(.+)$/i; // Simple one-line context
        const contextStartRegex = /^\*\*Contexto:\*\*\s*(.*)/i;
        const questionStartRegex = /^\*\*Pergunta:\*\*\s*(.*)/i;

        // Options: "[ ] A) Text", "- [ ] A) Text", "A) Text"
        const optionRegex = /^(-\s*)?\[([ xX])\]\s*([A-Z]\))?\s*(.*)$|^([A-Z])[\)\.]\s*(.*)$/;

        // Answer/Justification in blockquotes
        const blockquoteRegex = /^>\s*(.+)$/;

        let buffer = ""; // For multi-line fields

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();

            // Skip empty lines between clear sections, but keep them in multi-line text if needed
            if (!line) continue;

            // 1. Detect Topics
            const topicMatch = line.match(topicRegex);
            if (topicMatch) {
                topic = topicMatch[1].trim();
                continue;
            }

            // 2. Detect Context (Simple or Start)
            const contextMatch = line.match(contextStartRegex);
            if (contextMatch) {
                context = contextMatch[1].trim();
                // Check if context continues on next lines (until **Pergunta:** or Options)
                // We'll treat subsequent lines as part of context until we hit a known keyword
                isParsingStructure = 'context';
                continue;
            }

            // 3. Detect Question
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

                // Check for **Resposta Correta:** inside blockquote
                const gabaritoMatch = content.match(/^\*\*Resposta Correta:\*\*\s*([A-Z])/i);
                if (gabaritoMatch) {
                    gabarito = gabaritoMatch[1];
                    continue;
                }

                // Check for Justificativa inside blockquote (potentially with [cite_start])
                // Remove [cite tags] for cleaner text if needed, or keep them. 
                // The user format has: > [cite_start]**Justificativa:** ...
                const justifMatch = content.match(/^(?:\[.*?\])?\*\*Justificativa:\*\*\s*(.+)/i);
                if (justifMatch) {
                    justificativa = justifMatch[1].trim();
                    isParsingStructure = 'justification';
                    continue;
                }

                // If we are in justification mode, append line
                if (isParsingStructure === 'justification') {
                    justificativa += " " + content;
                }
                continue;
            }

            // 5. Check dependencies for parsing flow
            // If we are parsing context, append to context until we see **Pergunta:**
            if (isParsingStructure === 'context' && !line.match(questionStartRegex)) {
                context += "\n" + line;
                continue;
            }

            // If we are parsing question, append to questionText until we see Options
            if (isParsingStructure === 'question') {
                // Check if line looks like an option
                if (line.match(optionRegex)) {
                    isParsingStructure = 'options';
                    // Fall through to option parsing
                } else {
                    questionText += "\n" + line;
                    continue;
                }
            }

            // 6. Parsing Options
            const optMatch = line.match(optionRegex);
            if (optMatch) {
                isParsingStructure = 'options';
                let isCorrect = false;
                let key = "";
                let text = "";

                // Analyzying capture groups from: /^(-\s*)?\[([ xX])\]\s*([A-Z]\))?\s*(.*)$|^([A-Z])[\)\.]\s*(.*)$/
                // Group 2: [x] check
                // Group 3: A)
                // Group 4: Text
                // Group 5: A (if no brackets)
                // Group 6: Text (if no brackets)

                if (optMatch[2]) { // Bracket style
                    isCorrect = optMatch[2].toLowerCase() === 'x';
                    if (optMatch[3]) key = optMatch[3].replace(')', '');
                    text = optMatch[4];
                } else if (optMatch[5]) { // Simple "A) Text" style
                    key = optMatch[5];
                    text = optMatch[6];
                }

                // Cleanup text
                text = text.trim();

                options.push({
                    key: key,
                    optionText: text,
                    isCorrect: isCorrect
                });
                continue;
            }
        }

        // Post-processing

        // 1. Combine Context + Question if needed, or keep separate? 
        // The existing system puts everything in "questionText". 
        // Let's prepend Context and Topic to questionText for now, as that's safe.
        let finalQuestionText = "";
        if (topic) finalQuestionText += `**Tópico:** ${topic}\n\n`;
        if (context) finalQuestionText += `**Contexto:** ${context}\n\n`;
        finalQuestionText += questionText;

        // 2. Validate correctly selected option vs Gabarito
        if (gabarito) {
            options.forEach(opt => {
                if (opt.key === gabarito || opt.optionText.startsWith(gabarito + ")")) {
                    opt.isCorrect = true;
                }
            });
        }

        // 3. Append Justification to text (standard practice in this app based on analysis)
        if (justificativa) {
            finalQuestionText += `\n\n> **Justificativa:** ${justificativa}`;
        }

        if (finalQuestionText && options.length >= 2) {
            questions.push({
                questionText: finalQuestionText.trim(),
                options: options,
                points: 1, // Default
                difficulty: 'medium' // Parsing difficulty not implemented in this specific user format yet
            });
        }
    }

    return questions;
};

// ... (Test data and execution code similar to previous script)
const markdownInputPOC = `
# Questionário: Fundamentos da Programação por Blocos e Arquitetura de Computadores
**Baseado no Capítulo 3: Variáveis e programação por blocos**

---

## Instruções
Este questionário de nível avançado testa a compreensão dos conceitos de arquitetura de Von Neumann...

---

### Questão 1
**Tópico:** 1. Programação por blocos: variáveis e entrada de dados
**Contexto:** O texto diferencia computadores antigos... [cite_start]O texto afirma...

**Pergunta:** Com base na definição de "programas armazenados"...

- [ ] A) A capacidade de processar dados decimais...
- [ ] B) A existência de uma memória de acesso aleatório...
- [ ] C) A separação física entre a Unidade Lógica...
- [ ] D) A substituição de transistores por chips...

> **Resposta Correta:** B
> [cite_start]**Justificativa:** O texto explica que a inovação foi permitir que...
`;

console.log("Running POC Parser...");
const results = parseMarkdownQuestionsPOC(markdownInputPOC);
console.log(JSON.stringify(results, null, 2));

if (results.length > 0) {
    const q1 = results[0];
    console.log("--- Check Q1 ---");
    console.log("Text starts with Tópico?", q1.questionText.startsWith("**Tópico:**"));
    console.log("Options count:", q1.options.length);
    console.log("Correct option found:", q1.options.find((o: any) => o.isCorrect)?.key);
    console.log("Justification present?", q1.questionText.includes("**Justificativa:**"));
} else {
    console.error("No questions parsed!");
}
export { };
