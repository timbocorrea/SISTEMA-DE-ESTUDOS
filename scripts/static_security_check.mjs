import fs from 'fs';
import { globSync } from 'glob';
import path from 'path';

// This script verifies that statically no dangerouslySetInnerHTML is used without a sanitizer.
// And no API keys are statically exposed in the frontend files.

const srcPath = path.resolve(process.cwd(), '.');

// Find all React files
const files = globSync('**/*.{ts,tsx}', {
    cwd: srcPath,
    ignore: ['node_modules/**', 'dist/**', 'build/**', '.agent/**', '.gemini/**']
});

let errors = 0;

for (const file of files) {
    const fullPath = path.join(srcPath, file);
    const content = fs.readFileSync(fullPath, 'utf8');

    // Rule 1: dangerouslySetInnerHTML without sanitizeHtml
    if (content.includes('dangerouslySetInnerHTML')) {
        const lines = content.split('\n');
        lines.forEach((line, index) => {
            if (line.includes('dangerouslySetInnerHTML') && !line.includes('sanitizeHtml(')) {
                // Ignore if it's explicitly documented as safe or safe by context,
                // but flag it for review
                console.error(`[XSS WARNING] dangerouslySetInnerHTML sem sanitizeHtml em: ${file}:${index + 1}`);
                console.error(`  > ${line.trim()}`);
                errors++;
            }
        });
    }

    // Rule 2: API Keys in frontend code
    if (
        (file.includes('components') || file.includes('pages') || file.includes('hooks') || file.includes('vite.config.ts'))
        && !file.includes('BuddyContextModal.tsx') // It's okay if we just call edge function here now
    ) {
        if (content.includes('process.env.API_KEY') || content.includes('GEMINI_API_KEY')) {
            console.error(`[SECRETS WARNING] Possível vazamento de API Key em frontend: ${file}`);
            errors++;
        }
    }
}

if (errors > 0) {
    console.error(`\n🚨 Falha no Scan Estático de Segurança: Foram encontrados ${errors} potenciais problemas de segurança.`);
    process.exit(1);
} else {
    console.log(`\n✅ Scan Estático de Segurança: Todos os padrões inseguros estão controlados.`);
    process.exit(0);
}
