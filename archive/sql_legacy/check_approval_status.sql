-- VERIFICAR STATUS DE APROVAÇÃO DO USUÁRIO JOSÉ
-- Execute este SQL no Supabase para verificar se o campo foi atualizado corretamente

-- Ver o status atual do José
SELECT 
  id,
  email,
  name,
  role,
  approval_status,
  approved_at,
  approved_by,
  rejection_reason
FROM profiles
WHERE email LIKE '%jose%';

-- Ver TODOS os usuários com seus status
SELECT 
  email,
  name,
  approval_status,
  rejection_reason
FROM profiles
ORDER BY 
  CASE approval_status
    WHEN 'pending' THEN 1
    WHEN 'rejected' THEN 2
    WHEN 'approved' THEN 3
    ELSE 4
  END,
  email;
