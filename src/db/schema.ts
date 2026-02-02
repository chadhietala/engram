/**
 * SQLite schema for the Engram system
 */

export const SCHEMA = `
-- Core memory storage
CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('working', 'short_term', 'long_term', 'collective')),
  content TEXT NOT NULL,
  embedding BLOB,
  metadata TEXT NOT NULL,
  session_id TEXT NOT NULL,
  stage TEXT NOT NULL CHECK(stage IN ('conceptual', 'semantic', 'syntactic')),
  strength REAL DEFAULT 1.0,
  decay_factor REAL DEFAULT 1.0,
  access_count INTEGER DEFAULT 0,
  last_accessed INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
CREATE INDEX IF NOT EXISTS idx_memories_session_id ON memories(session_id);
CREATE INDEX IF NOT EXISTS idx_memories_stage ON memories(stage);
CREATE INDEX IF NOT EXISTS idx_memories_strength ON memories(strength);
CREATE INDEX IF NOT EXISTS idx_memories_last_accessed ON memories(last_accessed);

-- Semantic key/value pairs for filtered retrieval
CREATE TABLE IF NOT EXISTS semantic_keys (
  id TEXT PRIMARY KEY,
  memory_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  weight REAL DEFAULT 1.0,
  FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_semantic_keys_memory_id ON semantic_keys(memory_id);
CREATE INDEX IF NOT EXISTS idx_semantic_keys_key ON semantic_keys(key);
CREATE INDEX IF NOT EXISTS idx_semantic_keys_key_value ON semantic_keys(key, value);

-- Patterns recognized from memories
CREATE TABLE IF NOT EXISTS patterns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  stage TEXT NOT NULL CHECK(stage IN ('conceptual', 'semantic', 'syntactic')),
  dialectic_phase TEXT NOT NULL CHECK(dialectic_phase IN ('thesis', 'antithesis', 'synthesis')),
  embedding BLOB,
  confidence REAL DEFAULT 0.5,
  usage_count INTEGER DEFAULT 0,
  success_rate REAL DEFAULT 0.0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_patterns_stage ON patterns(stage);
CREATE INDEX IF NOT EXISTS idx_patterns_dialectic_phase ON patterns(dialectic_phase);
CREATE INDEX IF NOT EXISTS idx_patterns_confidence ON patterns(confidence);

-- Pattern-memory associations
CREATE TABLE IF NOT EXISTS pattern_memories (
  pattern_id TEXT NOT NULL,
  memory_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (pattern_id, memory_id),
  FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE,
  FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
);

-- Theses (initial beliefs/patterns)
CREATE TABLE IF NOT EXISTS theses (
  id TEXT PRIMARY KEY,
  pattern_id TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active', 'challenged', 'synthesized')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_theses_pattern_id ON theses(pattern_id);
CREATE INDEX IF NOT EXISTS idx_theses_status ON theses(status);

-- Thesis exemplar memories
CREATE TABLE IF NOT EXISTS thesis_memories (
  thesis_id TEXT NOT NULL,
  memory_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (thesis_id, memory_id),
  FOREIGN KEY (thesis_id) REFERENCES theses(id) ON DELETE CASCADE,
  FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
);

-- Antitheses (contradictions/challenges)
CREATE TABLE IF NOT EXISTS antitheses (
  id TEXT PRIMARY KEY,
  thesis_id TEXT NOT NULL,
  content TEXT NOT NULL,
  contradiction_type TEXT NOT NULL CHECK(contradiction_type IN ('direct', 'refinement', 'edge_case', 'context_dependent')),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (thesis_id) REFERENCES theses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_antitheses_thesis_id ON antitheses(thesis_id);

-- Antithesis exemplar memories
CREATE TABLE IF NOT EXISTS antithesis_memories (
  antithesis_id TEXT NOT NULL,
  memory_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (antithesis_id, memory_id),
  FOREIGN KEY (antithesis_id) REFERENCES antitheses(id) ON DELETE CASCADE,
  FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
);

-- Syntheses (resolutions)
CREATE TABLE IF NOT EXISTS syntheses (
  id TEXT PRIMARY KEY,
  thesis_id TEXT NOT NULL,
  content TEXT NOT NULL,
  resolution TEXT NOT NULL,
  skill_candidate INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (thesis_id) REFERENCES theses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_syntheses_thesis_id ON syntheses(thesis_id);
CREATE INDEX IF NOT EXISTS idx_syntheses_skill_candidate ON syntheses(skill_candidate);

-- Synthesis-antithesis associations
CREATE TABLE IF NOT EXISTS synthesis_antitheses (
  synthesis_id TEXT NOT NULL,
  antithesis_id TEXT NOT NULL,
  PRIMARY KEY (synthesis_id, antithesis_id),
  FOREIGN KEY (synthesis_id) REFERENCES syntheses(id) ON DELETE CASCADE,
  FOREIGN KEY (antithesis_id) REFERENCES antitheses(id) ON DELETE CASCADE
);

-- Synthesis exemplar memories
CREATE TABLE IF NOT EXISTS synthesis_memories (
  synthesis_id TEXT NOT NULL,
  memory_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (synthesis_id, memory_id),
  FOREIGN KEY (synthesis_id) REFERENCES syntheses(id) ON DELETE CASCADE,
  FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
);

-- Dialectic cycles (tracking the evolution process)
CREATE TABLE IF NOT EXISTS dialectic_cycles (
  id TEXT PRIMARY KEY,
  pattern_id TEXT NOT NULL,
  thesis_id TEXT NOT NULL,
  synthesis_id TEXT,
  status TEXT NOT NULL CHECK(status IN ('active', 'resolved')),
  created_at INTEGER NOT NULL,
  resolved_at INTEGER,
  FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE,
  FOREIGN KEY (thesis_id) REFERENCES theses(id) ON DELETE CASCADE,
  FOREIGN KEY (synthesis_id) REFERENCES syntheses(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_dialectic_cycles_pattern_id ON dialectic_cycles(pattern_id);
CREATE INDEX IF NOT EXISTS idx_dialectic_cycles_status ON dialectic_cycles(status);

-- Cycle-antithesis associations
CREATE TABLE IF NOT EXISTS cycle_antitheses (
  cycle_id TEXT NOT NULL,
  antithesis_id TEXT NOT NULL,
  PRIMARY KEY (cycle_id, antithesis_id),
  FOREIGN KEY (cycle_id) REFERENCES dialectic_cycles(id) ON DELETE CASCADE,
  FOREIGN KEY (antithesis_id) REFERENCES antitheses(id) ON DELETE CASCADE
);

-- Generated skills
CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  version TEXT NOT NULL,
  source_pattern_id TEXT NOT NULL,
  source_synthesis_id TEXT NOT NULL,
  instructions TEXT NOT NULL,
  complexity TEXT NOT NULL CHECK(complexity IN ('simple', 'moderate', 'complex')),
  status TEXT NOT NULL CHECK(status IN ('draft', 'validated', 'published', 'deprecated')),
  file_path TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (source_pattern_id) REFERENCES patterns(id) ON DELETE CASCADE,
  FOREIGN KEY (source_synthesis_id) REFERENCES syntheses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);
CREATE INDEX IF NOT EXISTS idx_skills_status ON skills(status);

-- Embedding cache
CREATE TABLE IF NOT EXISTS embedding_cache (
  content_hash TEXT PRIMARY KEY,
  embedding BLOB NOT NULL,
  model TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Sessions tracking
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  memory_count INTEGER DEFAULT 0,
  consolidated INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);

-- FTS5 full-text search for fast keyword matching (standalone, not external content)
CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
  memory_id,
  content,
  tool_name,
  tags,
  semantic_values,
  tokenize='porter unicode61'
);

-- Triggers to keep FTS5 in sync with memories table
CREATE TRIGGER IF NOT EXISTS memories_fts_insert AFTER INSERT ON memories BEGIN
  INSERT INTO memories_fts(memory_id, content, tool_name, tags, semantic_values)
  VALUES (
    NEW.id,
    NEW.content,
    COALESCE(json_extract(NEW.metadata, '$.toolName'), ''),
    COALESCE(json_extract(NEW.metadata, '$.tags'), ''),
    ''
  );
END;

CREATE TRIGGER IF NOT EXISTS memories_fts_delete AFTER DELETE ON memories BEGIN
  DELETE FROM memories_fts WHERE memory_id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS memories_fts_update AFTER UPDATE ON memories BEGIN
  DELETE FROM memories_fts WHERE memory_id = OLD.id;
  INSERT INTO memories_fts(memory_id, content, tool_name, tags, semantic_values)
  VALUES (
    NEW.id,
    NEW.content,
    COALESCE(json_extract(NEW.metadata, '$.toolName'), ''),
    COALESCE(json_extract(NEW.metadata, '$.tags'), ''),
    ''
  );
END;

-- Trigger to update semantic_values when semantic_keys change
CREATE TRIGGER IF NOT EXISTS semantic_keys_fts_insert AFTER INSERT ON semantic_keys BEGIN
  UPDATE memories_fts
  SET semantic_values = (
    SELECT COALESCE(group_concat(value, ' '), '')
    FROM semantic_keys
    WHERE memory_id = NEW.memory_id
  )
  WHERE memory_id = NEW.memory_id;
END;
`;

export const MIGRATIONS: string[] = [];

/**
 * Rebuild FTS5 index from existing memories
 * Call this after schema changes or to fix sync issues
 */
export const REBUILD_FTS = `
  DELETE FROM memories_fts;
  INSERT INTO memories_fts(memory_id, content, tool_name, tags, semantic_values)
  SELECT
    m.id,
    m.content,
    COALESCE(json_extract(m.metadata, '$.toolName'), ''),
    COALESCE(json_extract(m.metadata, '$.tags'), ''),
    COALESCE((SELECT group_concat(value, ' ') FROM semantic_keys WHERE memory_id = m.id), '')
  FROM memories m;
`;
