-- Migration: Initial schema for log transformations and reports
-- Created: 2025-10-18

-- Stores each log transformation
CREATE TABLE log_transformations (
  id SERIAL PRIMARY KEY,
  api_version INTEGER NOT NULL,
  author TEXT NULL,
  raw_log TEXT NOT NULL,
  filter_code TEXT NOT NULL,
  generated_output TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Stores reports about incorrect transformations
CREATE TABLE transformation_reports (
  id SERIAL PRIMARY KEY,
  transformation_id INTEGER NOT NULL REFERENCES log_transformations(id),
  remarks TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_transformation_reports_transformation_id
  ON transformation_reports(transformation_id);
