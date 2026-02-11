
import { parseMarkdownQuestions } from './utils/quizUtils';

const format1 = `
# Questionário 1
**Tópico:** Tópico 1
**Contexto:** Contexto 1
**Pergunta:** Pergunta 1
- [x] A) Opção A
- [ ] B) Opção B
> **Resposta Correta:** A
> **Justificativa:** Justificativa 1
`;

const format2 = `
### Questão 2 (Tópico: Tópico 2)
Pergunta 2
A) Opção A
B) Opção B
**Gabarito:** B
**Explicação:** Justificativa 2
---
`;

console.log("Verifying formats...");
try {
    const questions1 = parseMarkdownQuestions(format1);
    const questions2 = parseMarkdownQuestions(format2);

    console.log("Format 1 parsed:", questions1.length);
    console.log("Format 1 Topic:", questions1[0]?.questionText.includes("**Tópico:** Tópico 1"));

    console.log("Format 2 parsed:", questions2.length);
    console.log("Format 2 Topic:", questions2[0]?.questionText.includes("**Tópico:** Tópico 2"));
    console.log("Format 2 Gabarito:", questions2[0]?.gabarito === 'B');

} catch (e) {
    console.error("Error:", e);
}
