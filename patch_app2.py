with open('App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''        <button
          onClick={() => {
            let foundCourseId;
            for (const course of adminCourses) {
              for (const module of course.modules || []) {
                if (module.lessons?.some((l: any) => l.id === activeLessonId)) {
                  foundCourseId = course.id;
                  break;
                }
              }
              if (foundCourseId) break;
            }
            const targetCourseId = foundCourseId || activeCourse?.id;
            
            if (targetCourseId) {
              window.open(`/course/${targetCourseId}/lesson/${activeLessonId}`, '_blank');
            } else {
              import('sonner').then(({ toast }) => toast.error('Não foi possível identificar o curso desta aula para pré-visualização.'));
            }
          }}'''

replacement = '''        <button
          onClick={() => {
            let foundCourseId;
            for (const course of adminCourses) {
              for (const module of course.modules || []) {
                if (module.lessons?.some((l: any) => l.id === activeLessonId)) {
                  foundCourseId = course.id;
                  break;
                }
              }
              if (foundCourseId) break;
            }
            const targetCourseId = foundCourseId || activeCourse?.id;
            
            if (targetCourseId) {
              const event = new CustomEvent('previewAsStudent', { detail: { lessonId: activeLessonId } });
              window.dispatchEvent(event);
              
              setTimeout(() => {
                window.open(`/course/${targetCourseId}/lesson/${activeLessonId}?preview=true`, '_blank');
              }, 100);
            } else {
              import('sonner').then(({ toast }) => toast.error('Não foi possível identificar o curso desta aula para pré-visualização.'));
            }
          }}'''

import re
# we use exact match replacement so it doesn't fail
if target in content:
    new_content = content.replace(target, replacement)
    with open('App.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('Replaced exact payload')
else:
    print('Target not found exactly. Check App.tsx for modifications.')
