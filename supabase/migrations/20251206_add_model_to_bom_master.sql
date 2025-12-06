-- Add default_model_url column to bom_master table
ALTER TABLE bom_master 
ADD COLUMN default_model_url text;

COMMENT ON COLUMN bom_master.default_model_url IS 'URL of the Teachable Machine model associated with this part';
