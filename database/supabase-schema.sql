-- AI Tools Database Schema for Supabase PostgreSQL
-- Migration from localStorage to cloud storage with offline sync

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  google_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  picture_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ DEFAULT NOW()
);

-- User settings (API keys, preferences)
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  setting_key VARCHAR(100) NOT NULL,
  setting_value JSONB NOT NULL,
  encrypted BOOLEAN DEFAULT FALSE,
  encryption_metadata JSONB, -- {salt, iv} for decryption
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, setting_key)
);

-- Tags library
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL, -- Original ID from localStorage
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  is_custom BOOLEAN DEFAULT FALSE,
  action TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tag_id)
);

-- AI Instructions
CREATE TABLE ai_instructions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  instruction_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_custom BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, instruction_id)
);

-- Templates
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  template_id INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  text TEXT NOT NULL,
  category VARCHAR(100),
  is_custom BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, template_id)
);

-- Projects (stored as JSONB for complex nested structure)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  project_id BIGINT NOT NULL, -- Original ID from localStorage (timestamp)
  name VARCHAR(255) NOT NULL,
  color VARCHAR(50),
  data JSONB NOT NULL, -- Full project data including nested texts
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

-- Sync metadata (tracks last sync per key)
CREATE TABLE sync_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  storage_key VARCHAR(100) NOT NULL,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, storage_key)
);

-- Create indexes for performance
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX idx_tags_user_id ON tags(user_id);
CREATE INDEX idx_ai_instructions_user_id ON ai_instructions(user_id);
CREATE INDEX idx_templates_user_id ON templates(user_id);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_sync_metadata_user_id ON sync_metadata(user_id);

-- Enable Row-Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_metadata ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own data

-- Users table policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (id = (current_setting('app.user_id', true)::uuid));

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (id = (current_setting('app.user_id', true)::uuid));

-- User settings policies
CREATE POLICY "Users can access own settings" ON user_settings
  FOR ALL USING (user_id = (current_setting('app.user_id', true)::uuid));

-- Tags policies
CREATE POLICY "Users can access own tags" ON tags
  FOR ALL USING (user_id = (current_setting('app.user_id', true)::uuid));

-- AI Instructions policies
CREATE POLICY "Users can access own instructions" ON ai_instructions
  FOR ALL USING (user_id = (current_setting('app.user_id', true)::uuid));

-- Templates policies
CREATE POLICY "Users can access own templates" ON templates
  FOR ALL USING (user_id = (current_setting('app.user_id', true)::uuid));

-- Projects policies
CREATE POLICY "Users can access own projects" ON projects
  FOR ALL USING (user_id = (current_setting('app.user_id', true)::uuid));

-- Sync metadata policies
CREATE POLICY "Users can access own sync metadata" ON sync_metadata
  FOR ALL USING (user_id = (current_setting('app.user_id', true)::uuid));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at columns
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_instructions_updated_at BEFORE UPDATE ON ai_instructions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE users IS 'User accounts authenticated via Google OAuth';
COMMENT ON TABLE user_settings IS 'User preferences and encrypted API keys';
COMMENT ON TABLE tags IS 'TextBuilder tags library';
COMMENT ON TABLE ai_instructions IS 'AI instruction presets';
COMMENT ON TABLE templates IS 'Text templates';
COMMENT ON TABLE projects IS 'TextBuilder projects with nested structure stored as JSONB';
COMMENT ON TABLE sync_metadata IS 'Tracks last sync timestamps for offline sync';
