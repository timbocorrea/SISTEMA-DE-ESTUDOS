const fs = require('fs');
const path = require('path');

const COMPONENTS_DIR = path.join(__dirname, 'components');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
    });
}

const replacements = [
    {
        find: /import \{ createSupabaseClient \} from ['"](.*?)services\/supabaseClient['"];?/g,
        replace: "" // We will add the specific repository imports dynamically or just remove this line where matched, and then prepend imports if repositories are used.
    }
];

// Instead of complex AST, let's do targeted regex replacements for the exact repository instantiations that were flagged:
// new SupabaseCourseRepository(createSupabaseClient()) -> courseRepository
// new SupabaseQuestionBankRepository(createSupabaseClient()) -> questionBankRepository
// new SupabaseAdminRepository(createSupabaseClient()) -> adminRepository

let modifiedCount = 0;

walkDir(COMPONENTS_DIR, (filePath) => {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Remove the createSupabaseClient import
    content = content.replace(/import\s*\{\s*createSupabaseClient\s*\}\s*from\s*['"][.\/a-zA-Z0-9_-]+services\/supabaseClient['"];?\s*\n?/g, '');

    // Replace the specific direct usages inline
    const hasCourseRepo = /new SupabaseCourseRepository\(\s*createSupabaseClient\(\)\s*\)/.test(content) || /new SupabaseCourseRepository\(\s*supabase\s*\)/.test(content);
    if (hasCourseRepo) {
        content = content.replace(/new SupabaseCourseRepository\(\s*createSupabaseClient\(\)\s*\)/g, 'courseRepository');
        content = content.replace(/new SupabaseCourseRepository\(\s*supabase\s*\)/g, 'courseRepository');
    }

    const hasQuestionRepo = /new SupabaseQuestionBankRepository\(\s*createSupabaseClient\(\)\s*\)/.test(content) || /new SupabaseQuestionBankRepository\(\s*supabase\s*\)/.test(content);
    if (hasQuestionRepo) {
        content = content.replace(/new SupabaseQuestionBankRepository\(\s*createSupabaseClient\(\)\s*\)/g, 'questionBankRepository');
        content = content.replace(/new SupabaseQuestionBankRepository\(\s*supabase\s*\)/g, 'questionBankRepository');
    }

    const hasAdminRepo = /new SupabaseAdminRepository\(\s*createSupabaseClient\(\)\s*\)/.test(content) || /new SupabaseAdminRepository\(\s*supabase\s*\)/.test(content);
    if (hasAdminRepo) {
        content = content.replace(/new SupabaseAdminRepository\(\s*createSupabaseClient\(\)\s*\)/g, 'adminRepository');
        content = content.replace(/new SupabaseAdminRepository\(\s*supabase\s*\)/g, 'adminRepository');
    }

    // Replace dynamic imports (e.g. const { createSupabaseClient } = await import(...))
    content = content.replace(/const\s*\{\s*createSupabaseClient\s*\}\s*=\s*await\s*import\(['"][.\/a-zA-Z0-9_-]+services\/supabaseClient['"]\);?\s*\n?/g, '');

    // Clean up local supabase instantiations if they are standalone
    content = content.replace(/const\s+supabase\s*=\s*createSupabaseClient\(\);?/g, '');

    // If there were modifications to repositories, add the import to the top of the file
    let importsToAdd = [];
    if (hasCourseRepo) importsToAdd.push('courseRepository');
    if (hasQuestionRepo) importsToAdd.push('questionBankRepository');
    if (hasAdminRepo) importsToAdd.push('adminRepository');

    // Remove original repository imports
    if (hasCourseRepo) content = content.replace(/import\s*\{\s*SupabaseCourseRepository\s*\}\s*from\s*['"][.\/a-zA-Z0-9_-]+repositories\/SupabaseCourseRepository['"];?\s*\n?/g, '');
    if (hasQuestionRepo) content = content.replace(/import\s*\{\s*SupabaseQuestionBankRepository\s*\}\s*from\s*['"][.\/a-zA-Z0-9_-]+repositories\/SupabaseQuestionBankRepository['"];?\s*\n?/g, '');
    if (hasAdminRepo) content = content.replace(/import\s*\{\s*SupabaseAdminRepository\s*\}\s*from\s*['"][.\/a-zA-Z0-9_-]+repositories\/SupabaseAdminRepository['"];?\s*\n?/g, '');

    // Remove dynamic repository imports
    if (hasCourseRepo) content = content.replace(/const\s*\{\s*SupabaseCourseRepository\s*\}\s*=\s*await\s*import\(['"][.\/a-zA-Z0-9_-]+repositories\/SupabaseCourseRepository['"]\);?\s*\n?/g, '');
    if (hasQuestionRepo) content = content.replace(/const\s*\{\s*SupabaseQuestionBankRepository\s*\}\s*=\s*await\s*import\(['"][.\/a-zA-Z0-9_-]+repositories\/SupabaseQuestionBankRepository['"]\);?\s*\n?/g, '');
    if (hasAdminRepo) content = content.replace(/const\s*\{\s*SupabaseAdminRepository\s*\}\s*=\s*await\s*import\(['"][.\/a-zA-Z0-9_-]+repositories\/SupabaseAdminRepository['"]\);?\s*\n?/g, '');

    if (importsToAdd.length > 0) {
        // Find relative path to services/Dependencies
        const fileDir = path.dirname(filePath);
        let relPath = path.relative(fileDir, path.join(__dirname, 'services', 'Dependencies')).replace(/\\/g, '/');
        if (!relPath.startsWith('.')) relPath = './' + relPath;

        const importStatement = `import { ${importsToAdd.join(', ')} } from '${relPath}';\n`;
        // Insert right after the last generic react/library import, or just at line 1
        content = importStatement + content;
    }

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        modifiedCount++;
    }
});

console.log(`Modified ${modifiedCount} component files successfully.`);
