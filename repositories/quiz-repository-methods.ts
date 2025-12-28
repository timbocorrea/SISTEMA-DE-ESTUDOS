  // ============ QUIZ METHODS IMPLEMENTATION ============

  /**
   * Busca quiz completo (com perguntas e opções) por lesson_id
   */
  async getQuizByLessonId(lessonId: string): Promise < Quiz | null > {
    const { data: quizData, error: quizError } = await this.client
        .from('quizzes')
        .select(`
        id,
        lesson_id,
        title,
        description,
        passing_score,
        quiz_questions (
          id,
          quiz_id,
          question_text,
          question_type,
          position,
          points,
          quiz_options (
            id,
            question_id,
            option_text,
            is_correct,
            position
          )
        )
      `)
        .eq('lesson_id', lessonId)
        .maybeSingle();

    if(quizError) throw new DomainError(`Erro ao buscar quiz: ${quizError.message}`);
    if(!quizData) return null;

    // Mapear para entidades de domínio
    const questions = (quizData.quiz_questions || []).map((q: any) => {
        const options = (q.quiz_options || []).map((o: any) =>
            new QuizOption(o.id, o.question_id, o.option_text, o.is_correct, o.position)
        );
        return new QuizQuestion(
            q.id,
            q.quiz_id,
            q.question_text,
            q.question_type,
            q.position,
            q.points,
            options
        );
    });

    return new Quiz(
        quizData.id,
        quizData.lesson_id,
        quizData.title,
        quizData.description,
        quizData.passing_score,
        questions
    );
}

  /**
   * Cria quiz completo (quiz + perguntas + opções)
   */
  async createQuiz(quiz: Quiz): Promise < Quiz > {
    // 1. Inserir quiz
    const { data: quizData, error: quizError } = await this.client
        .from('quizzes')
        .insert({
            lesson_id: quiz.lessonId,
            title: quiz.title,
            description: quiz.description,
            passing_score: quiz.passingScore
        })
        .select()
        .single();

    if(quizError) throw new DomainError(`Erro ao criar quiz: ${quizError.message}`);

    // 2. Inserir perguntas
    for(const question of quiz.questions) {
    const { data: questionData, error: questionError } = await this.client
        .from('quiz_questions')
        .insert({
            quiz_id: quizData.id,
            question_text: question.questionText,
            question_type: question.questionType,
            position: question.position,
            points: question.points
        })
        .select()
        .single();

    if (questionError) throw new DomainError(`Erro ao criar pergunta: ${questionError.message}`);

    // 3. Inserir opções
    const options = question.options.map(o => ({
        question_id: questionData.id,
        option_text: o.optionText,
        is_correct: o.isCorrect,
        position: o.position
    }));

    const { error: optionsError } = await this.client
        .from('quiz_options')
        .insert(options);

    if (optionsError) throw new DomainError(`Erro ao criar opções: ${optionsError.message}`);
}

// Retornar quiz criado
const createdQuiz = await this.getQuizByLessonId(quiz.lessonId);
if (!createdQuiz) throw new DomainError('Quiz criado mas não foi possível recuperá-lo');
return createdQuiz;
  }

  /**
   * Atualiza quiz existente (apenas metadados, não perguntas)
   */
  async updateQuiz(quiz: Quiz): Promise < Quiz > {
    const { error } = await this.client
        .from('quizzes')
        .update({
            title: quiz.title,
            description: quiz.description,
            passing_score: quiz.passingScore
        })
        .eq('id', quiz.id);

    if(error) throw new DomainError(`Erro ao atualizar quiz: ${error.message}`);

    const updated = await this.getQuizByLessonId(quiz.lessonId);
    if(!updated) throw new NotFoundError('Quiz não encontrado após atualização');
    return updated;
}

  /**
   * Deleta quiz (CASCADE deleta perguntas e opções)
   */
  async deleteQuiz(quizId: string): Promise < void> {
    const { error } = await this.client
        .from('quizzes')
        .delete()
        .eq('id', quizId);

    if(error) throw new DomainError(`Erro ao deletar quiz: ${error.message}`);
}

  /**
   * Registra tentativa de quiz
   */
  async submitQuizAttempt(
    userId: string,
    quizId: string,
    score: number,
    passed: boolean,
    answers: Record<string, string>
): Promise < QuizAttempt > {
    const { data, error } = await this.client
        .from('quiz_attempts')
        .insert({
            user_id: userId,
            quiz_id: quizId,
            score,
            passed,
            answers
        })
        .select()
        .single();

    if(error) throw new DomainError(`Erro ao registrar tentativa: ${error.message}`);

    return new QuizAttempt(
        data.id,
        data.user_id,
        data.quiz_id,
        data.score,
        data.passed,
        data.answers,
        data.attempt_number,
        new Date(data.completed_at)
    );
}

  /**
   * Busca última tentativa do usuário
   */
  async getLatestQuizAttempt(userId: string, quizId: string): Promise < QuizAttempt | null > {
    const { data, error } = await this.client
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', userId)
        .eq('quiz_id', quizId)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if(error) throw new DomainError(`Erro ao buscar tentativa: ${error.message}`);
    if(!data) return null;

    return new QuizAttempt(
        data.id,
        data.user_id,
        data.quiz_id,
        data.score,
        data.passed,
        data.answers,
        data.attempt_number,
        new Date(data.completed_at)
    );
}

  /**
   * Busca todas as tentativas do usuário em um quiz
   */
  async getQuizAttempts(userId: string, quizId: string): Promise < QuizAttempt[] > {
    const { data, error } = await this.client
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', userId)
        .eq('quiz_id', quizId)
        .order('completed_at', { ascending: false });

    if(error) throw new DomainError(`Erro ao buscar tentativas: ${error.message}`);

    return(data || []).map(row =>
        new QuizAttempt(
            row.id,
            row.user_id,
            row.quiz_id,
            row.score,
            row.passed,
            row.answers,
            row.attempt_number,
            new Date(row.completed_at)
        )
    );
  }
}
