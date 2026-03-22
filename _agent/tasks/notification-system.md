# Plano de Implementação: Sistema de Notificações

O objetivo é adicionar um ícone de notificações no topo da plataforma que avise ao aluno sobre:
1. Respostas em suas postagens no fórum.
2. Mensagens diretas enviadas por professores ou administradores (Masters).

## 🗃️ 1. Banco de Dados (Supabase)
Criar uma tabela `notifications` para centralizar os avisos.

```sql
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL, -- 'forum_reply', 'direct_message', 'system'
  link text, -- ex: /course/ID/lesson/ID
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY notifications_select_self ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY notifications_update_self ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
-- Permitir que o sistema (pós-gatilho ou RPC) ou administradores criem notificações
CREATE POLICY notifications_insert_system ON public.notifications FOR INSERT WITH CHECK (true);
```

## 🏗️ 2. Domínio e Repositórios
- **`domain/entities.ts`**: Adicionar a classe `Notification`.
- **`repositories/NotificationRepository.ts`**: Novo repositório para gerenciar notificações.
- **`repositories/LessonForumRepository.ts`** e **`services/AdminService.ts`**: Integrar a criação de notificações no fluxo de resposta e mensagens.

## 🎨 3. UI/UX (Frontend)
- **`components/ui/NotificationBell.tsx`**: Ícone do sino com contador.
- **`components/ui/NotificationList.tsx`**: Dropdown ou Modal flutuante para exibir as notificações.
- **`App.tsx`**: Posicionar no topbar.

## 🤝 4. Mensagens do Professor
- Adicionar no `UserDetailsModal.tsx` um botão "Enviar Mensagem" que cria uma notificação direta para o aluno.
