
// Mock of the CURRENT implementation for testing
const parseMarkdownQuestionsCurrent = (markdown: string): any[] => {
    const questions: any[] = [];

    // Improved block splitting: Look for standard headers, question numbers, or metadata headers as primary delimiters
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
        const contextRegex = /^\*\*Contexto:\*\*\s*(.+)$/i;
        const contextStartRegex = /^\*\*Contexto:\*\*\s*(.*)/i;
        const questionStartRegex = /^\*\*Pergunta:\*\*\s*(.*)/i;

        const optionRegex = /^(-\s*)?\[([ xX])\]\s*([A-Z]\))?\s*(.*)$|^([A-Z])[\)\.]\s*(.*)$/;
        const blockquoteRegex = /^>\s*(.+)$/;
        const gabaritoRegex = /^(?:Gabarito|Resposta|Correct|Answer|Resposta correta):\s*(.+)$/i;
        const justificativaRegex = /^(?:Justificativa|Explicação|Explanation|Feedback|Reason):\s*(.+)$/i;
        const difficultyRegex = /^(?:Dificuldade|Difficulty):\s*(.+)$/i;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (!line) {
                if (isParsingStructure === 'context') context += "\n";
                if (isParsingStructure === 'question') questionText += "\n";
                continue;
            }

            const cleanLine = line.replace(/^\*\*|\*\*$/g, '').trim();

            const topicMatch = line.match(topicRegex);
            if (topicMatch) { topic = topicMatch[1].trim(); continue; }

            const contextMatch = line.match(contextStartRegex);
            if (contextMatch) { context = contextMatch[1].trim(); isParsingStructure = 'context'; continue; }

            const questionMatch = line.match(questionStartRegex);
            if (questionMatch) { questionText = questionMatch[1].trim(); isParsingStructure = 'question'; continue; }

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

            if (line.match(gabaritoRegex)) { gabarito = line.match(gabaritoRegex)![1].trim(); continue; }
            if (line.match(justificativaRegex)) { justificativa = line.match(justificativaRegex)![1].trim(); continue; }

            if (isParsingStructure === 'context') {
                if (line.match(questionStartRegex) || line.match(optionRegex)) {
                } else { context += "\n" + line; continue; }
            }

            const optMatch = line.match(optionRegex);
            if (optMatch) {
                isParsingStructure = 'options';
                let isCorrect = false;
                let key = "";
                let text = "";
                if (optMatch[2]) {
                    isCorrect = optMatch[2].toLowerCase() === 'x';
                    if (optMatch[3]) key = optMatch[3].replace(')', '');
                    text = optMatch[4];
                } else if (optMatch[5]) {
                    key = optMatch[5];
                    text = optMatch[6];
                }
                text = text.trim().replace(/^["']|["']$/g, '').replace(/^[\*\s]+|[\*\s]+$/g, '').trim();
                options.push({ key: key, optionText: text, isCorrect: isCorrect });
                continue;
            }

            if (isParsingStructure !== 'justification' && isParsingStructure !== 'options') {
                if (cleanLine.match(/^(?:Data|Questão|Question)\s*[:\d]/i)) continue;
                const cleanQuestionLine = line.replace(/^#{1,6}\s+/, '').replace(/^\d+[\)\.]\s+/, '');
                if (cleanQuestionLine) { questionText += (questionText ? "\n" : "") + cleanQuestionLine; }
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

O texto descreve a evolução dos computadores de dispositivos de função única para a arquitetura de von Neumann. Com base na definição de 'programas armazenados' apresentada, qual é a característica fundamental que diferencia essa arquitetura dos modelos anteriores a 1940?

A) A necessidade de alterar fisicamente os componentes ou desligar a máquina para mudar sua função.
B) A capacidade de armazenar tanto as instruções quanto os dados na memória de acesso aleatório (RAM), eliminando interruptores externos.
C) O uso de sistemas decimais em vez de binários para processar instruções complexas de entrada e saída.
D) A separação total entre a unidade de memória e a unidade de processamento, impedindo a interação entre dados e instruções.

**Gabarito:** B

**Explicação:** O texto afirma explicitamente que os computadores com arquitetura von Neumann são conhecidos como programas armazenados...

--- 
`;

console.log("Running POC Parser on Format 2...");
const results = parseMarkdownQuestionsCurrent(markdownInputNew);
console.log(JSON.stringify(results, null, 2));

if (results.length > 0) {
    const q1 = results[0];
    console.log("--- Check Q1 ---");
    console.log("Topic extracted?", q1.questionText.includes("**Tópico:**"));
    console.log("Gabarito found?", q1.gabarito);
    // In new format, Topic is in header, not separate line. Current parser likely misses it.
    // Question text starts immediately. Current parser likely treats it as question text (good).
    // Options start with "A)". Current parser handles this.
    // Gabarito is "**Gabarito:** B". Current parser has `gabaritoRegex` which might catch this if `cleanLine` handles the stars.
    // Explicação is "**Explicação:**". Current parser has `justificativaRegex` which checks for "Justificativa|Explicação".

    // The main issue might be:
    // 1. Topic extraction from "### Questão 1 (Tópico: ...)"
    // 2. Ensuring "Questão 1" header doesn't get swallowed or if it does, the topic is saved.
} else {
    console.error("No questions parsed!");
}
export { };
