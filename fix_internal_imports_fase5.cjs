const fs = require('fs');
const path = require('path');

const projectRoot = __dirname;
const componentsDir = path.join(projectRoot, 'components');

const filesToFix = [
    { path: 'components/features/admin/AdminSettingsPage.tsx', origDir: componentsDir },
    { path: 'components/features/admin/UserManagement.tsx', origDir: componentsDir },
    { path: 'components/features/admin/UserDetailsModal.tsx', origDir: componentsDir },
    { path: 'components/features/classroom/VideoPlayer.tsx', origDir: path.join(componentsDir, 'features/classroom/components') },
    { path: 'components/features/classroom/NotesSidebar.tsx', origDir: path.join(componentsDir, 'lesson') },
    { path: 'components/features/classroom/QuizWidget.tsx', origDir: path.join(componentsDir, 'lesson') },
    { path: 'components/features/dashboard/WeeklySummary.tsx', origDir: path.join(componentsDir, 'dashboard') },
    { path: 'components/features/dashboard/CourseCard.tsx', origDir: path.join(componentsDir, 'dashboard') }
];

filesToFix.forEach(fileInfo => {
    const absFilePath = path.join(projectRoot, fileInfo.path);
    if (!fs.existsSync(absFilePath)) return;

    let content = fs.readFileSync(absFilePath, 'utf8');
    let changed = false;

    const importRegex = /(?:import|export)\s+(?:.*?from\s+)?['"](\.\/|\.\.\/)(.*?)['"]/gs;

    content = content.replace(importRegex, (match, dots, rest) => {
        // Resolve against original directory!
        const targetAbs = path.resolve(fileInfo.origDir, dots + rest);

        // Get path relative to project root
        let targetRelRoot = path.relative(projectRoot, targetAbs).replace(/\\/g, '/');

        // Construct new import using `@/`
        const newImportString = `@/${targetRelRoot}`;
        changed = true;

        return match.replace(new RegExp(`['"]${dots.replace(/\./g, '\\.')}${rest.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`), `'${newImportString}'`);
    });

    if (changed) {
        fs.writeFileSync(absFilePath, content, 'utf8');
        console.log(`Rewrote internal relative imports in ${fileInfo.path}`);
    }
});
