const fs = require('fs');
const path = require('path');

const projectRoot = __dirname;
const componentsDir = path.join(projectRoot, 'components');

const filesToFix = [
    'components/features/admin/audit/AuditPage.tsx',
    'components/features/student/dashboard/StudentDashboard.tsx',
    'components/features/classroom/LessonViewer.tsx',
    'components/features/classroom/components/VideoPlayer.tsx'
];

// Rewrite internal relative paths of moved files
filesToFix.forEach(relFilePath => {
    const absFilePath = path.join(projectRoot, relFilePath);
    if (!fs.existsSync(absFilePath)) return;

    let content = fs.readFileSync(absFilePath, 'utf8');

    const importRegex = /(?:import|export)\s+(?:.*?from\s+)?['"](\.\/|\.\.\/)(.*?)['"]/gs;

    content = content.replace(importRegex, (match, dots, rest) => {
        // Original directory of all these files was 'components'
        const originalDir = componentsDir;
        // Resolve against original directory!
        const targetAbs = path.resolve(originalDir, dots + rest);

        // Get path relative to project root
        let targetRelRoot = path.relative(projectRoot, targetAbs).replace(/\\/g, '/');

        // Construct new import using `@/`
        const newImportString = `@/${targetRelRoot}`;

        return match.replace(new RegExp(`['"]${dots.replace(/\./g, '\\.')}${rest.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`), `'${newImportString}'`);
    });

    fs.writeFileSync(absFilePath, content, 'utf8');
    console.log(`Rewrote internal relative imports in ${relFilePath}`);
});

// Fix specific broken references to the moved files in OTHER files
const replacements = [
    {
        file: 'components/features/classroom/components/VideoPlayer.tsx',
        replace: [
            { from: /import \{ courseRepository \}.*/g, to: "import { courseRepository } from '@/services/Dependencies';" }
        ]
    },
    {
        file: 'components/LessonLoader.tsx',
        replace: [
            { from: /from '\.\/LessonViewer'/g, to: "from '@/components/features/classroom/LessonViewer'" }
        ]
    },
    {
        file: 'components/lesson/VideoPlayerWidget.tsx',
        replace: [
            { from: /from '\.\.\/VideoPlayer'/g, to: "from '@/components/features/classroom/components/VideoPlayer'" }
        ]
    }
];

replacements.forEach(({ file, replace }) => {
    const abs = path.join(projectRoot, file);
    if (fs.existsSync(abs)) {
        let content = fs.readFileSync(abs, 'utf8');
        replace.forEach(r => {
            content = content.replace(r.from, r.to);
        });
        fs.writeFileSync(abs, content, 'utf8');
        console.log(`Fixed external reference in ${file}`);
    }
});
