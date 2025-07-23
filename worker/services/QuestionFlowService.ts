import type { Env } from '../types';

export interface QuestionFlowSession {
  id: string;
  sessionId: string;
  teamId: string;
  service: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  applicableQuestions: string[];
  answers: Record<string, any>;
  status: 'active' | 'completed' | 'abandoned';
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface QuestionFlowTemplate {
  id: string;
  teamId: string;
  service: string;
  templateVersion: string;
  questions: any[];
  totalQuestions: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class QuestionFlowService {
  constructor(private env: Env) {}

  // Create or get a question flow session
  async getOrCreateSession(sessionId: string, teamId: string, service: string): Promise<QuestionFlowSession> {
    // Check if session already exists
    const existingSession = await this.env.DB.prepare(`
      SELECT * FROM question_flow_sessions 
      WHERE session_id = ? AND team_id = ? AND service = ? AND status = 'active'
    `).bind(sessionId, teamId, service).first();

    if (existingSession) {
      return this.mapSessionFromRow(existingSession);
    }

    // Get team config to extract questions
    const teamRow = await this.env.DB.prepare('SELECT config FROM teams WHERE id = ?').bind(teamId).first();
    if (!teamRow) {
      throw new Error('Team not found');
    }

    const teamConfig = JSON.parse(teamRow.config as string);
    const serviceQuestions = teamConfig.serviceQuestions?.[service];

    if (!serviceQuestions) {
      throw new Error(`No questions configured for service: ${service}`);
    }

    // Extract questions and determine applicable ones
    let questions: any[] = [];
    if (Array.isArray(serviceQuestions)) {
      questions = serviceQuestions;
    } else if (serviceQuestions?.questions) {
      questions = serviceQuestions.questions;
    } else {
      throw new Error(`Invalid question format for service: ${service}`);
    }

    // Initially, all questions without conditions are applicable
    const applicableQuestions = questions
      .filter(q => !q.condition)
      .map(q => typeof q === 'string' ? `q${questions.indexOf(q) + 1}` : q.id);

    // Create new session
    const flowSessionId = crypto.randomUUID();
    await this.env.DB.prepare(`
      INSERT INTO question_flow_sessions (
        id, session_id, team_id, service, current_question_index, total_questions, 
        applicable_questions, answers, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'), datetime('now'))
    `).bind(
      flowSessionId,
      sessionId,
      teamId,
      service,
      0,
      questions.length,
      JSON.stringify(applicableQuestions),
      JSON.stringify({}),
    ).run();

    return {
      id: flowSessionId,
      sessionId,
      teamId,
      service,
      currentQuestionIndex: 0,
      totalQuestions: questions.length,
      applicableQuestions,
      answers: {},
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  // Get the next question in the flow
  async getNextQuestion(sessionId: string): Promise<any> {
    const session = await this.env.DB.prepare(`
      SELECT * FROM question_flow_sessions 
      WHERE session_id = ? AND status = 'active'
    `).bind(sessionId).first();

    if (!session) {
      throw new Error('No active question flow session found');
    }

    const mappedSession = this.mapSessionFromRow(session);
    
    // Get team config to access question details
    const teamRow = await this.env.DB.prepare('SELECT config FROM teams WHERE id = ?').bind(mappedSession.teamId).first();
    const teamConfig = JSON.parse(teamRow.config as string);
    const serviceQuestions = teamConfig.serviceQuestions?.[mappedSession.service];

    let questions: any[] = [];
    if (Array.isArray(serviceQuestions)) {
      questions = serviceQuestions;
    } else if (serviceQuestions?.questions) {
      questions = serviceQuestions.questions;
    }

    // Get applicable questions based on current answers
    const applicableQuestions = this.getApplicableQuestions(questions, mappedSession.answers);
    
    if (mappedSession.currentQuestionIndex >= applicableQuestions.length) {
      // No more questions
      return null;
    }

    const currentQuestion = applicableQuestions[mappedSession.currentQuestionIndex];
    return currentQuestion;
  }

  // Store an answer and update the flow
  async storeAnswer(sessionId: string, questionId: string, answer: string, questionData: any): Promise<void> {
    // Store the answer in matter_questions table
    const matterQuestionId = crypto.randomUUID();
    await this.env.DB.prepare(`
      INSERT INTO matter_questions (
        id, session_id, team_id, question_id, question_type, question_options, 
        question_condition, question, answer, source, is_conditional, condition_met,
        metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ai-form', ?, ?, ?, datetime('now'))
    `).bind(
      matterQuestionId,
      sessionId,
      questionData.teamId,
      questionId,
      questionData.type || 'text',
      questionData.options ? JSON.stringify(questionData.options) : null,
      questionData.condition ? JSON.stringify(questionData.condition) : null,
      questionData.question,
      answer,
      questionData.condition ? true : false,
      true, // condition_met - we'll refine this logic
      JSON.stringify(questionData)
    ).run();

    // Update the session with new answer and recalculate applicable questions
    const session = await this.env.DB.prepare(`
      SELECT * FROM question_flow_sessions 
      WHERE session_id = ? AND status = 'active'
    `).bind(sessionId).first();

    if (!session) {
      throw new Error('No active question flow session found');
    }

    const mappedSession = this.mapSessionFromRow(session);
    const updatedAnswers = { ...mappedSession.answers, [questionId]: answer };

    // Get team config to recalculate applicable questions
    const teamRow = await this.env.DB.prepare('SELECT config FROM teams WHERE id = ?').bind(mappedSession.teamId).first();
    const teamConfig = JSON.parse(teamRow.config as string);
    const serviceQuestions = teamConfig.serviceQuestions?.[mappedSession.service];

    let questions: any[] = [];
    if (Array.isArray(serviceQuestions)) {
      questions = serviceQuestions;
    } else if (serviceQuestions?.questions) {
      questions = serviceQuestions.questions;
    }

    const applicableQuestions = this.getApplicableQuestions(questions, updatedAnswers);

    // Update session
    await this.env.DB.prepare(`
      UPDATE question_flow_sessions 
      SET current_question_index = ?, applicable_questions = ?, answers = ?, updated_at = datetime('now')
      WHERE session_id = ? AND status = 'active'
    `).bind(
      mappedSession.currentQuestionIndex + 1,
      JSON.stringify(applicableQuestions.map(q => typeof q === 'string' ? q : q.id)),
      JSON.stringify(updatedAnswers),
      sessionId
    ).run();
  }

  // Get applicable questions based on current answers
  private getApplicableQuestions(questions: any[], answers: Record<string, any>): any[] {
    return questions.filter(q => {
      if (!q.condition) return true;
      
      const fieldValue = answers[q.condition.field];
      return fieldValue === q.condition.value;
    });
  }

  // Complete a question flow session
  async completeSession(sessionId: string): Promise<void> {
    await this.env.DB.prepare(`
      UPDATE question_flow_sessions 
      SET status = 'completed', completed_at = datetime('now'), updated_at = datetime('now')
      WHERE session_id = ? AND status = 'active'
    `).bind(sessionId).run();
  }

  // Map database row to QuestionFlowSession
  private mapSessionFromRow(row: any): QuestionFlowSession {
    return {
      id: row.id,
      sessionId: row.session_id,
      teamId: row.team_id,
      service: row.service,
      currentQuestionIndex: row.current_question_index,
      totalQuestions: row.total_questions,
      applicableQuestions: JSON.parse(row.applicable_questions || '[]'),
      answers: JSON.parse(row.answers || '{}'),
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at
    };
  }
} 