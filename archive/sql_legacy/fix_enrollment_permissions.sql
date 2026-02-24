-- Allow Instructors to INSERT course_enrollments (assign users to courses)
DROP POLICY IF EXISTS enrollments_insert_instructor ON public.course_enrollments;
CREATE POLICY enrollments_insert_instructor ON public.course_enrollments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'INSTRUCTOR'
    )
  );

-- Allow Instructors to DELETE course_enrollments (remove users from courses)
DROP POLICY IF EXISTS enrollments_delete_instructor ON public.course_enrollments;
CREATE POLICY enrollments_delete_instructor ON public.course_enrollments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'INSTRUCTOR'
    )
  );

-- Allow Instructors to UPDATE course_enrollments (e.g. change active status)
DROP POLICY IF EXISTS enrollments_update_instructor ON public.course_enrollments;
CREATE POLICY enrollments_update_instructor ON public.course_enrollments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'INSTRUCTOR'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'INSTRUCTOR'
    )
  );
