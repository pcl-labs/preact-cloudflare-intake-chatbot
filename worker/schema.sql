-- Blawby AI Chatbot Database Schema

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT,
  config JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_info JSON,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  matter_id TEXT, -- Optional: link to specific matter for tighter integration
  content TEXT NOT NULL,
  is_user BOOLEAN NOT NULL,
  metadata JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id),
  FOREIGN KEY (matter_id) REFERENCES matters(id)
);



-- Contact form submissions table
CREATE TABLE IF NOT EXISTS contact_forms (
  id TEXT PRIMARY KEY,
  conversation_id TEXT,
  team_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT NOT NULL,
  matter_details TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'contacted', 'consultation_scheduled', 'closed'
  assigned_lawyer TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id),
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- Services table
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  requires_payment BOOLEAN DEFAULT FALSE,
  payment_amount INTEGER,
  intake_form JSON,
  active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  matter_id TEXT, -- Link to matter instead of just conversation
  conversation_id TEXT, -- Optional: keep conversation link for context
  team_id TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  preferred_date DATETIME NOT NULL,
  preferred_time TEXT,
  matter_type TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'completed', 'cancelled'
  payment_status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'refunded'
  payment_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (matter_id) REFERENCES matters(id),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id),
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- Lawyers table for team member management
CREATE TABLE IF NOT EXISTS lawyers (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  specialties JSON, -- Array of practice areas
  status TEXT DEFAULT 'active', -- 'active', 'inactive', 'on_leave'
  role TEXT DEFAULT 'attorney', -- 'attorney', 'paralegal', 'admin'
  hourly_rate INTEGER, -- in cents
  bar_number TEXT,
  license_state TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- Matters table to represent legal matters
CREATE TABLE IF NOT EXISTS matters (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  matter_type TEXT NOT NULL, -- e.g., 'Family Law', 'Employment Law', etc.
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'lead', -- 'lead', 'open', 'in_progress', 'completed', 'archived'
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  assigned_lawyer_id TEXT,
  lead_source TEXT, -- 'website', 'referral', 'advertising', etc.
  estimated_value INTEGER, -- in cents
  billable_hours REAL DEFAULT 0,
  flat_fee INTEGER, -- in cents, if applicable
  retainer_amount INTEGER, -- in cents
  retainer_balance INTEGER DEFAULT 0, -- in cents
  statute_of_limitations DATE,
  court_jurisdiction TEXT,
  opposing_party TEXT,
  matter_number TEXT, -- Changed from case_number to matter_number
  tags JSON, -- Array of tags for categorization
  custom_fields JSON, -- Flexible metadata storage
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  closed_at DATETIME,
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (assigned_lawyer_id) REFERENCES lawyers(id)
);

-- Matter events table for matter activity logs
CREATE TABLE IF NOT EXISTS matter_events (
  id TEXT PRIMARY KEY,
  matter_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'note', 'call', 'email', 'meeting', 'filing', 'payment', 'status_change'
  title TEXT NOT NULL,
  description TEXT,
  event_date DATETIME NOT NULL,
  created_by_lawyer_id TEXT,
  billable_time REAL DEFAULT 0, -- hours
  billing_rate INTEGER, -- in cents per hour
  amount INTEGER, -- in cents, for expenses/payments
  tags JSON, -- Array of tags
  metadata JSON, -- Additional structured data
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (matter_id) REFERENCES matters(id),
  FOREIGN KEY (created_by_lawyer_id) REFERENCES lawyers(id)
);

-- Files table (replaces uploaded_files) - general-purpose file management
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  matter_id TEXT, -- Optional: link to specific matter
  session_id TEXT, -- Optional: link to chat session
  conversation_id TEXT, -- Optional: link to conversation
  original_name TEXT NOT NULL,
  file_name TEXT NOT NULL, -- Storage filename
  file_path TEXT, -- Full storage path
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT,
  checksum TEXT, -- For integrity verification
  description TEXT,
  tags JSON, -- Array of tags for categorization
  access_level TEXT DEFAULT 'private', -- 'public', 'private', 'team', 'client'
  shared_with JSON, -- Array of user IDs who have access
  version INTEGER DEFAULT 1,
  parent_file_id TEXT, -- For versioning
  is_deleted BOOLEAN DEFAULT FALSE,
  uploaded_by_lawyer_id TEXT,
  metadata JSON, -- Additional file metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (matter_id) REFERENCES matters(id),
  FOREIGN KEY (parent_file_id) REFERENCES files(id),
  FOREIGN KEY (uploaded_by_lawyer_id) REFERENCES lawyers(id)
);

-- AI Training Data Tables --

-- Chat logs table for long-term storage of chat sessions
CREATE TABLE IF NOT EXISTS chat_logs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  team_id TEXT,
  role TEXT NOT NULL, -- 'user' | 'assistant' | 'system'
  content TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- Matter questions table for Q&A pairs from intake (enhanced for conditional questions)
CREATE TABLE IF NOT EXISTS matter_questions (
  id TEXT PRIMARY KEY,
  matter_id TEXT,
  session_id TEXT, -- Link to question flow session
  team_id TEXT,
  question_id TEXT, -- Unique identifier for the question (e.g., family_issue_type)
  question_type TEXT DEFAULT 'text', -- Type of question: text, choice, date, email
  question_options JSON, -- JSON array of options for choice questions
  question_condition JSON, -- JSON object defining when this question should be asked
  question_order INTEGER, -- Order of question in the flow
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  source TEXT DEFAULT 'ai-form', -- 'ai-form' | 'human-entry' | 'followup'
  is_conditional BOOLEAN DEFAULT FALSE, -- Whether this question has conditional logic
  condition_met BOOLEAN DEFAULT TRUE, -- Whether the condition was met when this question was asked
  metadata JSON, -- Additional structured data
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (matter_id) REFERENCES matters(id)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_matter_questions_matter_id ON matter_questions(matter_id);
CREATE INDEX IF NOT EXISTS idx_matter_questions_question_id ON matter_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_matter_questions_session_id ON matter_questions(session_id);

-- AI generated summaries table for markdown matter summaries
CREATE TABLE IF NOT EXISTS ai_generated_summaries (
  id TEXT PRIMARY KEY,
  matter_id TEXT,
  summary TEXT NOT NULL,
  model_used TEXT,
  prompt_snapshot TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (matter_id) REFERENCES matters(id)
);

-- AI feedback table for user quality ratings and intent tags
CREATE TABLE IF NOT EXISTS ai_feedback (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  team_id TEXT,
  rating INTEGER, -- 1-5 scale
  thumbs_up BOOLEAN,
  comments TEXT,
  intent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- Question Flow Management Tables --

-- Question flow sessions table for tracking active question flows
CREATE TABLE IF NOT EXISTS question_flow_sessions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  service TEXT NOT NULL,
  current_question_index INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  applicable_questions JSON, -- Array of question IDs that are applicable based on conditions
  answers JSON, -- Current answers for conditional logic evaluation
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'abandoned'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- Add indexes for question flow sessions
CREATE INDEX IF NOT EXISTS idx_question_flow_sessions_session_id ON question_flow_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_question_flow_sessions_team_id ON question_flow_sessions(team_id);

-- Question flow templates table for caching question configurations
CREATE TABLE IF NOT EXISTS question_flow_templates (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  service TEXT NOT NULL,
  template_version TEXT DEFAULT '1.0',
  questions JSON NOT NULL, -- Full question structure with conditions
  total_questions INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- Add unique constraint to prevent duplicate templates
CREATE UNIQUE INDEX IF NOT EXISTS idx_question_flow_templates_unique 
ON question_flow_templates(team_id, service, template_version);

-- Question flow analytics table for performance tracking
CREATE TABLE IF NOT EXISTS question_flow_analytics (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  service TEXT NOT NULL,
  question_id TEXT NOT NULL,
  question_type TEXT NOT NULL,
  total_asked INTEGER DEFAULT 0,
  total_answered INTEGER DEFAULT 0,
  total_skipped INTEGER DEFAULT 0, -- Due to conditions not being met
  average_time_to_answer REAL, -- in seconds
  completion_rate REAL, -- percentage
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- Add indexes for analytics
CREATE INDEX IF NOT EXISTS idx_question_flow_analytics_team_service ON question_flow_analytics(team_id, service);
CREATE INDEX IF NOT EXISTS idx_question_flow_analytics_question_id ON question_flow_analytics(question_id);

-- Webhook logs table for tracking webhook deliveries
CREATE TABLE IF NOT EXISTS webhook_logs (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  webhook_type TEXT NOT NULL, -- 'matter_creation', 'matter_details', 'contact_form', 'appointment'
  webhook_url TEXT NOT NULL,
  payload JSON NOT NULL,
  status TEXT NOT NULL, -- 'pending', 'success', 'failed', 'retry'
  http_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- Insert default team
INSERT INTO teams (id, name, config) VALUES 
('test-team', 'Test Law Firm', '{"aiModel": "llama", "requiresPayment": false}');

-- Views for easier querying --

-- Question flow summary view
CREATE VIEW question_flow_summary AS
SELECT 
  qfs.session_id,
  qfs.team_id,
  qfs.service,
  qfs.current_question_index,
  qfs.total_questions,
  qfs.status,
  COUNT(mq.id) as questions_answered,
  qfs.created_at,
  qfs.updated_at
FROM question_flow_sessions qfs
LEFT JOIN matter_questions mq ON qfs.session_id = mq.session_id
GROUP BY qfs.id, qfs.session_id, qfs.team_id, qfs.service, qfs.current_question_index, qfs.total_questions, qfs.status, qfs.created_at, qfs.updated_at;

-- Insert sample lawyers
INSERT INTO lawyers (id, team_id, name, email, phone, specialties, role, hourly_rate, bar_number, license_state) VALUES 
('lawyer-1', 'test-team', 'Sarah Johnson', 'sarah@testlawfirm.com', '555-0101', '["Family Law", "Divorce", "Child Custody"]', 'attorney', 35000, 'CA123456', 'CA'),
('lawyer-2', 'test-team', 'Michael Chen', 'michael@testlawfirm.com', '555-0102', '["Employment Law", "Workplace Discrimination"]', 'attorney', 40000, 'CA789012', 'CA'),
('paralegal-1', 'test-team', 'Emily Rodriguez', 'emily@testlawfirm.com', '555-0103', '["Legal Research", "Document Preparation"]', 'paralegal', 7500, NULL, NULL); 