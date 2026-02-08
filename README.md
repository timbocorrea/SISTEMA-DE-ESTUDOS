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
- **Node.js** 18.x ou superior
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
VITE_SUPABASE_URL=https://<YOUR_PROJECT_ID>.supabase.co
VITE_SUPABASE_ANON_KEY=<YOUR_SUPABASE_ANON_KEY>

# Google Gemini API
VITE_API_KEY=<YOUR_GEMINI_API_KEY>
```

**Onde encontrar as chaves:**
- **Supabase**: Acesse seu projeto em [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → API
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
   - **Build Command**: `npm run build` (executa `vite build` internamente)
   - **Output Directory**: `dist`

4. **Adicione as variáveis de ambiente**:
   ```
   VITE_SUPABASE_URL=https://<YOUR_PROJECT_ID>.supabase.co
   VITE_SUPABASE_ANON_KEY=<YOUR_SUPABASE_ANON_KEY>
   VITE_API_KEY=<YOUR_GEMINI_API_KEY>
   ```

5. **Clique em "Deploy"**

6. **⚠️ IMPORTANTE: Após o deploy, atualize o Supabase**:
   
   > **Atenção:** Sem esta configuração, a autenticação NÃO funcionará em produção!
   
   - Acesse seu projeto no [Supabase Dashboard](https://supabase.com/dashboard) → Authentication → URL Configuration
   - Em **Site URL**, adicione: `https://seu-app.vercel.app`
   - Em **Redirect URLs**, adicione: `https://seu-app.vercel.app/**`

## 🗄️ Configuração do Supabase

O banco de dados já está configurado com:
- ✅ Tabelas: courses, modules, lessons, lesson_resources, lesson_progress, profiles, course_enrollments, lesson_notes
- ✅ Row Level Security (RLS) habilitado
- ✅ Storage bucket para materiais de aula
- ✅ Autenticação configurada

Para recriar o banco em outro projeto Supabase, execute os scripts SQL:
1. [`database_migration.sql`](./database_migration.sql) - Cria tabelas e políticas RLS
2. [`storage_setup.sql`](./storage_setup.sql) - Configura buckets de armazenamento

## 📚 Estrutura do Projeto

```
src/
├── components/       # Componentes React reutilizáveis (UI)
│   ├── DropboxAudioBrowser.tsx
│   ├── LessonViewer.tsx
│   └── ...
├── domain/          # Modelos de domínio e tipos TypeScript
│   ├── Course.ts
│   ├── Lesson.ts
│   └── User.ts
├── repositories/    # Camada de acesso a dados (Supabase)
│   ├── SupabaseCourseRepository.ts
│   └── SupabaseUserRepository.ts
├── services/        # Lógica de negócio e integrações externas
│   ├── GeminiService.ts    # Integração com Google Gemini AI
│   └── AudioService.ts
├── hooks/           # Custom React hooks
│   ├── useAudioPlayer.ts
│   └── useCourses.ts
├── contexts/        # React Context providers
│   └── AuthContext.tsx
└── utils/           # Funções utilitárias
    └── formatters.ts
```

**Arquitetura:**
- **Domain-Driven Design (DDD)**: Modelos de domínio separados da infraestrutura
- **Repository Pattern**: Abstração da camada de dados
- **Service Layer**: Lógica de negócio isolada dos componentes

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. **Execute as validações locais:**
   ```bash
   npm run test      # Testes unitários com Vitest
   npm run build     # Verifica se o build está funcionando
   ```
4. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
5. Push para a branch (`git push origin feature/AmazingFeature`)
6. Abra um Pull Request

## 📝 Licença

Este projeto pertence a **timbocorrea**. Todos os direitos reservados.
