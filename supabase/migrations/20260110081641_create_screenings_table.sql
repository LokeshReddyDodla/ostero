/*
  # Create Osteoporosis Screening Tables

  ## Overview
  This migration creates the database schema for the AiHealth OsteoFlag screening system,
  an AI-assisted clinical decision support tool for opportunistic osteoporosis risk screening.

  ## New Tables
  
  ### `screenings`
  Stores individual screening attempts with patient data, risk factors, and assessment results.
  
  **Columns:**
  - `id` (uuid, primary key) - Unique screening identifier
  - `created_at` (timestamptz) - Screening timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  - `patient_age_years` (int) - Patient age at screening
  - `sex` (text) - Patient sex (female/male/other/unknown)
  - `cxr_view` (text) - X-ray view type (PA/AP/lateral/unknown)
  - `cxr_image_path` (text) - Storage path for uploaded X-ray image
  - `risk_factors` (jsonb) - Clinical risk factors object
  - `bmd_data` (jsonb) - Optional BMD/DXA data
  - `model_name` (text) - Vision model identifier
  - `model_risk_score` (numeric) - Raw model probability (0-1)
  - `model_uncertainty` (numeric) - Model uncertainty score (0-1)
  - `final_risk_score` (int) - Computed risk score (0-100)
  - `risk_band` (text) - Risk category (low/moderate/high/very_high)
  - `screening_flag` (text) - Flag status (flag/no_flag/needs_review)
  - `urgency` (text) - Urgency level (routine/soon/priority)
  - `summary_one_liner` (text) - Brief summary for clinician
  - `recommendation_clinician` (text) - Clinician-facing recommendation
  - `patient_facing_message` (text) - Patient-safe message
  - `safety_disclaimer` (text) - Required safety disclaimer
  - `audit_log` (jsonb) - Logic trace and inputs used
  - `status` (text) - Processing status (pending/completed/error)
  - `clinician_id` (uuid) - Future: authenticated clinician reference
  
  ## Security
  - Enable RLS on screenings table
  - For MVP: Allow public insert (will be restricted in production)
  - Allow authenticated users to read their own screenings
  
  ## Notes
  - This is a clinical decision support tool, NOT a diagnostic system
  - All outputs require clinician review and judgment
  - Data should be handled with HIPAA compliance considerations
*/

-- Create screenings table
CREATE TABLE IF NOT EXISTS screenings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Patient demographics
  patient_age_years int,
  sex text CHECK (sex IN ('female', 'male', 'other', 'unknown')),
  cxr_view text CHECK (cxr_view IN ('PA', 'AP', 'lateral', 'unknown')),
  cxr_image_path text,
  
  -- Clinical inputs
  risk_factors jsonb DEFAULT '{}'::jsonb,
  bmd_data jsonb DEFAULT '{}'::jsonb,
  
  -- Model outputs
  model_name text DEFAULT 'cxr-osteoflag-v0',
  model_risk_score numeric CHECK (model_risk_score >= 0 AND model_risk_score <= 1),
  model_uncertainty numeric CHECK (model_uncertainty >= 0 AND model_uncertainty <= 1),
  
  -- Computed results
  final_risk_score int CHECK (final_risk_score >= 0 AND final_risk_score <= 100),
  risk_band text CHECK (risk_band IN ('low', 'moderate', 'high', 'very_high')),
  screening_flag text CHECK (screening_flag IN ('flag', 'no_flag', 'needs_review')),
  urgency text CHECK (urgency IN ('routine', 'soon', 'priority')),
  
  -- Clinical outputs
  summary_one_liner text,
  recommendation_clinician text,
  patient_facing_message text,
  safety_disclaimer text,
  audit_log jsonb DEFAULT '{}'::jsonb,
  
  -- Status tracking
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'error', 'needs_review')),
  clinician_id uuid
);

-- Enable Row Level Security
ALTER TABLE screenings ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to insert screenings (MVP - will be restricted in production)
CREATE POLICY "Allow public insert for MVP"
  ON screenings
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Allow authenticated users to read all screenings (MVP - will be user-scoped in production)
CREATE POLICY "Allow authenticated users to read screenings"
  ON screenings
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow anon users to read their newly created screenings
CREATE POLICY "Allow anon users to read screenings"
  ON screenings
  FOR SELECT
  TO anon
  USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_screenings_created_at ON screenings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_screenings_status ON screenings(status);
CREATE INDEX IF NOT EXISTS idx_screenings_clinician_id ON screenings(clinician_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_screenings_updated_at
  BEFORE UPDATE ON screenings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();