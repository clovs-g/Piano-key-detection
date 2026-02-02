/*
  # Create recordings table for audio storage

  1. New Tables
    - `recordings`
      - `id` (uuid, primary key) - Unique identifier for each recording
      - `title` (text) - Name/title of the recording
      - `audio_url` (text) - URL to the audio file in Supabase Storage
      - `duration` (integer) - Duration of the recording in seconds
      - `detected_key` (text) - Musical key detected during recording
      - `detected_mode` (text) - Mode (major/minor) detected during recording
      - `created_at` (timestamptz) - When the recording was created
      - `file_size` (integer) - Size of the audio file in bytes
      
  2. Security
    - Enable RLS on `recordings` table
    - Add policy for anyone to insert recordings (since no auth yet)
    - Add policy for anyone to view recordings
    - Add policy for anyone to delete recordings
*/

CREATE TABLE IF NOT EXISTS recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Untitled Recording',
  audio_url text NOT NULL,
  duration integer DEFAULT 0,
  detected_key text DEFAULT '',
  detected_mode text DEFAULT 'major',
  created_at timestamptz DEFAULT now(),
  file_size integer DEFAULT 0
);

ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert recordings"
  ON recordings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can view recordings"
  ON recordings
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can delete recordings"
  ON recordings
  FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can update recordings"
  ON recordings
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);