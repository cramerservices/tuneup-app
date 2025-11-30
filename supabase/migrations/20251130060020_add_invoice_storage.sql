/*
  # Add Invoice Storage to Database

  1. New Table
    - `invoices`
      - `id` (uuid, primary key)
      - `inspection_id` (uuid, foreign key to inspections)
      - `customer_name` (text)
      - `address` (text)
      - `inspection_date` (date)
      - `technician_name` (text)
      - `invoice_date` (timestamptz)
      - `services` (jsonb) - stores service selections and prices
      - `approved_suggestions` (jsonb) - stores approved recommendations with prices
      - `additional_work` (jsonb) - stores additional line items
      - `subtotal` (decimal)
      - `tax` (decimal)
      - `total` (decimal)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `invoices` table
    - Add policies for authenticated users to manage invoices

  3. Important Notes
    - Links invoices to their parent inspection records
    - Stores pricing and line item details as JSON for flexibility
    - Tracks when invoice was generated
*/

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid REFERENCES inspections(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  address text DEFAULT '',
  inspection_date date NOT NULL,
  technician_name text NOT NULL,
  invoice_date timestamptz DEFAULT now(),
  services jsonb DEFAULT '{}',
  approved_suggestions jsonb DEFAULT '[]',
  additional_work jsonb DEFAULT '[]',
  subtotal decimal(10, 2) DEFAULT 0,
  tax decimal(10, 2) DEFAULT 0,
  total decimal(10, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own invoices"
  ON invoices
  FOR SELECT
  TO authenticated
  USING (auth.jwt()->>'email' = technician_name);

CREATE POLICY "Users can insert their own invoices"
  ON invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt()->>'email' = technician_name);

CREATE POLICY "Users can update their own invoices"
  ON invoices
  FOR UPDATE
  TO authenticated
  USING (auth.jwt()->>'email' = technician_name)
  WITH CHECK (auth.jwt()->>'email' = technician_name);

CREATE POLICY "Users can delete their own invoices"
  ON invoices
  FOR DELETE
  TO authenticated
  USING (auth.jwt()->>'email' = technician_name);
