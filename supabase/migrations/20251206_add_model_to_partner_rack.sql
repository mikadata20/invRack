-- Add default_model_url column to partner_rack table
ALTER TABLE partner_rack 
ADD COLUMN default_model_url text;

COMMENT ON COLUMN partner_rack.default_model_url IS 'URL of the Teachable Machine model associated with this part';
