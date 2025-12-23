-- Supabase Storage Setup para Upload de Arquivos
-- Execute este script no SQL Editor do Supabase

-- 1. Criar bucket para materiais de aula
insert into storage.buckets (id, name, public)
values ('lesson-resources', 'lesson-resources', true)
on conflict (id) do nothing;

-- 2. Permitir uploads autenticados
create policy "Authenticated users can upload lesson resources"
on storage.objects for insert
to authenticated
with check (bucket_id = 'lesson-resources');

-- 3. Permitir leitura pública (para alunos acessarem)
create policy "Public can view lesson resources"
on storage.objects for select
to public
using (bucket_id = 'lesson-resources');

-- 4. Permitir deletar apenas próprios arquivos ou se for instrutor
create policy "Users can delete own lesson resources"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'lesson-resources' AND (
    auth.uid() = owner OR
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'INSTRUCTOR'
    )
  )
);

-- Verificar se bucket foi criado
select * from storage.buckets where id = 'lesson-resources';
