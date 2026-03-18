/*
  # Create Multilingual Songs Database

  1. New Tables
    - `songs`
      - `id` (uuid, primary key)
      - `title` (text) - Song title
      - `artist` (text) - Artist name
      - `key_signature` (text) - Musical key (C, D, E, F, G, A, B)
      - `mode` (text) - major or minor
      - `language` (text) - Song language (english, swahili, kirundi, kinyarwanda, lingala)
      - `lyrics_preview` (text) - First 500 characters of lyrics for preview
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `songs` table
    - Add policy for public read access (songs are read-only public data)

  3. Indexes
    - Index on language for faster queries
    - Index on key_signature for music detection matching

  Note: Actual full lyrics are not stored in database due to copyright restrictions.
  This table stores metadata and preview only.
*/

CREATE TABLE IF NOT EXISTS songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  artist text NOT NULL,
  key_signature text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('major', 'minor')),
  language text NOT NULL CHECK (language IN ('english', 'swahili', 'kirundi', 'kinyarwanda', 'lingala')),
  lyrics_preview text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS songs_language_idx ON songs(language);
CREATE INDEX IF NOT EXISTS songs_key_signature_idx ON songs(key_signature);
CREATE INDEX IF NOT EXISTS songs_language_key_idx ON songs(language, key_signature);

ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read songs"
  ON songs
  FOR SELECT
  TO public
  USING (true);
