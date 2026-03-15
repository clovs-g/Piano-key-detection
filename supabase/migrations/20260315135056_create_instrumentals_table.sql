/*
  # Create instrumentals table for backing track storage

  1. New Tables
    - `instrumentals`
      - `id` (uuid, primary key) - Unique identifier for each instrumental
      - `title` (text) - Name/title of the instrumental track
      - `audio_url` (text) - URL to the audio file in Supabase Storage
      - `duration` (integer) - Duration of the instrumental in seconds
      - `tempo` (integer) - BPM (beats per minute) of the track
      - `key` (text) - Musical key of the instrumental
      - `file_size` (integer) - Size of the audio file in bytes
      - `created_at` (timestamptz) - When the instrumental was created
      
  2. Security
    - Enable RLS on `instrumentals` table
    - Add policies for public access (insert, select, delete)
*/

CREATE TABLE IF NOT EXISTS instrumentals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Untitled Instrumental',
  audio_url text NOT NULL,
  duration integer DEFAULT 0,
  tempo integer DEFAULT 120,
  key text DEFAULT '',
  file_size integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE instrumentals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert instrumentals"
  ON instrumentals
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can view instrumentals"
  ON instrumentals
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can delete instrumentals"
  ON instrumentals
  FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can update instrumentals"
  ON instrumentals
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
