/*
  # Fix Equipment Info RLS Policies

  1. Changes
    - Drop existing restrictive policies that require authentication
    - Add new policies allowing public access for equipment_info table
    
  2. Security
    - This is a business tool without authentication
    - Match the same public access pattern as inspections and inspection_items tables
    
  3. Important Notes
    - Equipment info is tied to inspections via foreign key
    - Public access is appropriate for this use case
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view equipment info for their inspections" ON equipment_info;
DROP POLICY IF EXISTS "Users can insert equipment info for their inspections" ON equipment_info;
DROP POLICY IF EXISTS "Users can update equipment info for their inspections" ON equipment_info;
DROP POLICY IF EXISTS "Users can delete equipment info for their inspections" ON equipment_info;

-- Create new public access policies
CREATE POLICY "Allow public read access to equipment_info"
  ON equipment_info FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to equipment_info"
  ON equipment_info FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to equipment_info"
  ON equipment_info FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to equipment_info"
  ON equipment_info FOR DELETE
  USING (true);
