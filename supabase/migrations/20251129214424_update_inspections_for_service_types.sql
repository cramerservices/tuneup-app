/*
  # Update HVAC Inspections Schema for Service Types

  1. Changes to Tables
    - Add `service_types` column to inspections table
      - Stores array of selected services (furnace, ac, hot_water_tank)
    
    - Add `selected_suggestions` column to inspections table
      - Stores array of additional suggestions selected by technician
    
    - Update inspection_items to support type field
      - Distinguishes between regular items and suggestions

  2. New Columns
    - service_types (text array) - which services were selected
    - selected_suggestions (text array) - which additional items were suggested

  3. Important Notes
    - Service types: 'furnace', 'ac', 'hot_water_tank'
    - Summary report will show unchecked items with severity > 0
    - Additional suggestions are tracked separately
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspections' AND column_name = 'service_types'
  ) THEN
    ALTER TABLE inspections ADD COLUMN service_types text[] DEFAULT '{}';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspections' AND column_name = 'selected_suggestions'
  ) THEN
    ALTER TABLE inspections ADD COLUMN selected_suggestions text[] DEFAULT '{}';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_items' AND column_name = 'item_type'
  ) THEN
    ALTER TABLE inspection_items ADD COLUMN item_type text DEFAULT 'checklist';
  END IF;
END $$;
