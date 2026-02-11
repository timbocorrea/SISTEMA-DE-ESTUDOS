
import { parseMarkdownQuestions } from './utils/quizUtils';

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
        if (q1.gabarito !== 'B') console.error(`FAILED: Gabarito is ${q1.gabarito}, expected B`);
        if (!q1.justificativa) console.error("FAILED: Justificativa missing");
        if (q1.options.length !== 4) console.error(`FAILED: Expected 4 options, got ${q1.options.length}`);
    }
}
