import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};

envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envVars[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
    }
});

const supabaseUrl = envVars['VITE_SUPABASE_URL'];
const supabaseKey = envVars['VITE_SUPABASE_PUBLISHABLE_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

async function listParts() {
    console.log("Listing top 5 parent parts...");
    const { data, error } = await supabase
        .from("bom_master")
        .select("parent_part, model, cyl")
        .limit(5);

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Found parts:", data);
    }
}

listParts();
