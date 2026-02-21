import os
import re

files = [
  'App.tsx',
  'components/AdminContentManagement.tsx',
  'components/AdminSettingsPage.tsx',
  'components/BuddyFullPage.tsx',
  'components/CourseEnrollmentModal.tsx',
  'components/CreateCourseModal.tsx',
  'components/CreateLessonModal.tsx',
  'components/ErrorFallback.tsx'
]

replacements = [
    (r'\bpurple-', 'cyan-'),
    (r'\bviolet-', 'teal-'),
    (r'(?i)#8B5CF6', '#14b8a6')
]

for f in files:
    if os.path.exists(f):
        with open(f, 'r', encoding='utf-8') as file:
            c = file.read()
        
        new_c = c
        for p, r in replacements:
            new_c = re.sub(p, r, new_c)
        
        if new_c != c:
            with open(f, 'w', encoding='utf-8') as file:
                file.write(new_c)
            print(f'Updated {f}')
