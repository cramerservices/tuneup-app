/*
  # Add Equipment Information to Inspections

  1. New Table
    - `equipment_info`
      - `id` (uuid, primary key)
      - `inspection_id` (uuid, foreign key to inspections)
      - `service_type` (text) - furnace, ac, or hot_water_tank
      - `brand` (text) - equipment brand/manufacturer
      - `model_number` (text) - equipment model number
      - `serial_number` (text) - equipment serial number
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `equipment_info` table
    - Add policy for authenticated users to manage equipment info for their inspections

  3. Important Notes
    - Each inspection can have multiple equipment entries (one per service type)
    - Equipment information is optional but recommended for complete records
*/

CREATE TABLE IF NOT EXISTS equipment_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid REFERENCES inspections(id) ON DELETE CASCADE,
  service_type text NOT NULL,
  brand text DEFAULT '',
  model_number text DEFAULT '',
  serial_number text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE equipment_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view equipment info for their inspections"
  ON equipment_info
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = equipment_info.inspection_id
      AND inspections.technician_name = auth.jwt()->>'email'
    )
  );

CREATE POLICY "Users can insert equipment info for their inspections"
  ON equipment_info
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = equipment_info.inspection_id
      AND inspections.technician_name = auth.jwt()->>'email'
    )
  );

CREATE POLICY "Users can update equipment info for their inspections"
  ON equipment_info
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = equipment_info.inspection_id
      AND inspections.technician_name = auth.jwt()->>'email'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = equipment_info.inspection_id
      AND inspections.technician_name = auth.jwt()->>'email'
    )
  );

CREATE POLICY "Users can delete equipment info for their inspections"
  ON equipment_info
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = equipment_info.inspection_id
      AND inspections.technician_name = auth.jwt()->>'email'
    )
  );
