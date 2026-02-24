const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');

const projectRoot = __dirname;
// We need to find all .ts and .tsx files
const allFiles = globSync('**/*.{ts,tsx}', {
    cwd: projectRoot,
    ignore: ['node_modules/**', 'dist/**', 'supabase/functions/**']
});

const moves = [
    { name: 'AuditPage', newPath: '@/components/features/admin/AuditPage' },
    { name: 'AdminSettingsPage', newPath: '@/components/features/admin/AdminSettingsPage' },
    { name: 'UserManagement', newPath: '@/components/features/admin/UserManagement' },
    { name: 'UserDetailsModal', newPath: '@/components/features/admin/UserDetailsModal' },
    { name: 'LessonViewer', newPath: '@/components/features/classroom/LessonViewer' },
    { name: 'VideoPlayer', newPath: '@/components/features/classroom/VideoPlayer' },
    { name: 'QuizWidget', newPath: '@/components/features/classroom/QuizWidget' },
    { name: 'NotesSidebar', newPath: '@/components/features/classroom/NotesSidebar' },
    { name: 'StudentDashboard', newPath: '@/components/features/dashboard/StudentDashboard' },
    { name: 'RecentActivity', newPath: '@/components/features/dashboard/RecentActivity' },
    { name: 'WeeklySummary', newPath: '@/components/features/dashboard/WeeklySummary' },
    { name: 'CourseCard', newPath: '@/components/features/dashboard/CourseCard' }
];

allFiles.forEach(file => {
    const absPath = path.join(projectRoot, file);
    let content = fs.readFileSync(absPath, 'utf8');
    let changed = false;

    moves.forEach(move => {
        // Find import paths concluding with the file name ignoring the extension
        // e.g. import ... from '../../components/dashboard/CourseCard'
        // e.g. import ... from './CourseCard'
        const regex = new RegExp(`(import\\s+.*?from\\s+['"])(.*?\\/?${move.name})(['"])`, 'g');
        const dynamicRegex = new RegExp(`(import\\(['"])(.*?\\/?${move.name})(['"])`, 'g');

        // Only replace if it doesn't already start with the exact newPath
        if (regex.test(content) || dynamicRegex.test(content)) {
            content = content.replace(regex, (match, p1, p2, p3) => {
                if (p2 === move.newPath) return match;
                changed = true;
                return `${p1}${move.newPath}${p3}`;
            });
            content = content.replace(dynamicRegex, (match, p1, p2, p3) => {
                if (p2 === move.newPath) return match;
                changed = true;
                return `${p1}${move.newPath}${p3}`;
            });
        }
    });

    if (changed) {
        fs.writeFileSync(absPath, content, 'utf8');
        console.log(`Updated imports in ${file}`);
    }
});
