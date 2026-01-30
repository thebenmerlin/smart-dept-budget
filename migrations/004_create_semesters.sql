-- Semesters table for academic semester management
-- Run this migration in your Neon database

CREATE TABLE IF NOT EXISTS semesters (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    semester_number INTEGER NOT NULL CHECK (semester_number IN (1, 2)),
    academic_year VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_semester_year UNIQUE (semester_number, academic_year)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_semesters_academic_year ON semesters(academic_year);
CREATE INDEX IF NOT EXISTS idx_semesters_active ON semesters(is_active);

-- Insert default semesters for current academic year (2025-26)
INSERT INTO semesters (name, semester_number, academic_year, start_date, end_date, is_active)
VALUES 
    ('Semester 1 (2025-26)', 1, '2025-26', '2025-07-01', '2025-12-31', false),
    ('Semester 2 (2025-26)', 2, '2025-26', '2026-01-01', '2026-06-30', true)
ON CONFLICT (semester_number, academic_year) DO NOTHING;
