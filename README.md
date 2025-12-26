<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Study System - Sistema de Estudos

Sistema de estudos com IA integrada, gamificação e gestão de conteúdo educacional.

## 🚀 Deploy em Produção

**Site em Produção**: [Em breve - após deploy na Vercel]

**Stack de Produção**:
- **Frontend**: Vercel
- **Backend**: Supabase (Database + Auth + Storage)
- **IA**: Google Gemini API

## 🛠️ Configuração Local

### Pré-requisitos
- Node.js 18.x ou superior
- Conta no [Supabase](https://supabase.com)
- [Google Gemini API Key](https://aistudio.google.com/app/apikey)

### 1. Clone o repositório
```bash
git clone https://github.com/timbocorrea/SISTEMA-DE-ESTUDOS.git
cd SISTEMA-DE-ESTUDOS
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto baseado no [.env.example](.env.example):

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://hhsiylkfkhyvosgrkgqo.supabase.co
VITE_SUPABASE_ANON_KEY=sua_supabase_anon_key

# Google Gemini API
VITE_API_KEY=sua_gemini_api_key
```

**Onde encontrar as chaves:**
- **Supabase**: [Project Settings → API](https://supabase.com/dashboard/project/hhsiylkfkhyvosgrkgqo/settings/api)
- **Gemini API**: [Google AI Studio](https://aistudio.google.com/app/apikey)

### 4. Execute o app
```bash
npm run dev
```

O app estará disponível em `http://localhost:3000`

## 📦 Deploy na Vercel

### Passo a Passo

1. **Acesse o [Vercel Dashboard](https://vercel.com/new)**

2. **Importe o repositório GitHub**:
   - Clique em "Add New Project"
   - Selecione o repositório: `timbocorrea/SISTEMA-DE-ESTUDOS`

3. **Configure o projeto**:
   - **Framework Preset**: Vite
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

4. **Adicione as variáveis de ambiente**:
   ```
   VITE_SUPABASE_URL=https://hhsiylkfkhyvosgrkgqo.supabase.co
   VITE_SUPABASE_ANON_KEY=sua_supabase_anon_key
   VITE_API_KEY=sua_gemini_api_key
   ```

5. **Clique em "Deploy"**

6. **Após o deploy, atualize o Supabase**:
   - Acesse: [Supabase Auth Settings](https://supabase.com/dashboard/project/hhsiylkfkhyvosgrkgqo/auth/url-configuration)
   - Em **Site URL**, adicione: `https://seu-app.vercel.app`
   - Em **Redirect URLs**, adicione: `https://seu-app.vercel.app/**`

## 🗄️ Configuração do Supabase

O banco de dados já está configurado com:
- ✅ Tabelas: courses, modules, lessons, lesson_resources, lesson_progress, profiles, course_enrollments, lesson_notes
- ✅ Row Level Security (RLS) habilitado
- ✅ Storage bucket para materiais de aula
- ✅ Autenticação configurada

Para recriar o banco em outro projeto Supabase, execute os scripts SQL:
1. [`database_migration.sql`](./database_migration.sql) - Cria tabelas e RLS policies
2. [`storage_setup.sql`](./storage_setup.sql) - Configura storage buckets

## 📚 Estrutura do Projeto

- **`/components`** - Componentes React reutilizáveis
- **`/domain`** - Modelos de domínio e tipos TypeScript
- **`/repositories`** - Camada de acesso a dados (Supabase)
- **`/services`** - Lógica de negócio e serviços externos

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto é privado e pertence a timbocorrea.
