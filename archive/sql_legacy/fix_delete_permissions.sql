-- ADICIONAR POLÍTICA RLS PARA PERMITIR EXCLUSÃO DE USUÁRIOS
-- Execute este SQL no Supabase SQL Editor

-- Policy para permitir que INSTRUCTORs deletem profiles
-- ATENÇÃO: Isso permite que admins deletem qualquer perfil, incluindo outros admins
CREATE POLICY "Instructors can delete any profile"
ON profiles
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'INSTRUCTOR'
  )
);

-- Opcional: Policy mais restritiva que impede deletar outros instrutores
-- Comente a policy acima e descomente esta se preferir:
/*
CREATE POLICY "Instructors can delete student profiles only"
ON profiles
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles admin
    WHERE admin.id = auth.uid()
    AND admin.role = 'INSTRUCTOR'
  )
  AND role = 'STUDENT'  -- Só permite deletar estudantes
);
*/

-- Policy para permitir que INSTRUCTORs deletem atribuições de cursos
CREATE POLICY "Instructors can delete course assignments"
ON user_course_assignments
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'INSTRUCTOR'
  )
);

-- Verificar policies atuais (opcional, apenas para debug)
-- SELECT * FROM pg_policies WHERE tablename IN ('profiles', 'user_course_assignments');
