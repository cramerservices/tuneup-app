/*
  # HVAC Tune-Up Inspection System

  1. New Tables
    - `inspections`
      - `id` (uuid, primary key)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
      - `customer_name` (text)
      - `address` (text)
      - `technician_name` (text)
      - `inspection_date` (date)
      - `notes` (text, general notes for the inspection)
      
    - `inspection_items`
      - `id` (uuid, primary key)
      - `inspection_id` (uuid, foreign key to inspections)
      - `category` (text, e.g., "Thermostat & Controls")
      - `item_name` (text, e.g., "Verify thermostat operation")
      - `completed` (boolean, default false)
      - `notes` (text, notes for this specific item)
      - `severity` (integer, 0-10 scale, default 0)
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on both tables
    - Add policies for public access (since this is a business tool)
    
  3. Indexes
    - Add index on inspection_id for faster lookups
    - Add index on inspection_date for sorting

  4. Important Notes
    - Severity scale: 0 = no issue, 10 = critical issue
    - All items start unchecked with severity 0
    - Each inspection can have multiple items
*/

CREATE TABLE IF NOT EXISTS inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  customer_name text DEFAULT '',
  address text DEFAULT '',
  technician_name text DEFAULT '',
  inspection_date date DEFAULT CURRENT_DATE,
  notes text DEFAULT ''
);

CREATE TABLE IF NOT EXISTS inspection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid REFERENCES inspections(id) ON DELETE CASCADE,
  category text NOT NULL,
  item_name text NOT NULL,
  completed boolean DEFAULT false,
  notes text DEFAULT '',
  severity integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to inspections"
  ON inspections FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to inspections"
  ON inspections FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to inspections"
  ON inspections FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to inspections"
  ON inspections FOR DELETE
  USING (true);

CREATE POLICY "Allow public read access to inspection_items"
  ON inspection_items FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to inspection_items"
  ON inspection_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to inspection_items"
  ON inspection_items FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to inspection_items"
  ON inspection_items FOR DELETE
  USING (true);

CREATE INDEX IF NOT EXISTS idx_inspection_items_inspection_id 
  ON inspection_items(inspection_id);

CREATE INDEX IF NOT EXISTS idx_inspections_date 
  ON inspections(inspection_date DESC);
