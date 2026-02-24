-- VERIFICAR POLÍTICAS EXISTENTES E POSSÍVEIS PROBLEMAS
-- Execute este SQL para debug

-- 1. Ver todas as policies da tabela profiles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- 2. Ver todas as policies de user_course_assignments
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_course_assignments';

-- 3. Verificar se há foreign keys que impedem a exclusão
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name  
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'profiles';

-- 4. Testar se você consegue deletar manualmente (substitua USER_ID_AQUI)
-- CUIDADO: Isso vai deletar de verdade!
-- DELETE FROM profiles WHERE id = 'USER_ID_AQUI';
