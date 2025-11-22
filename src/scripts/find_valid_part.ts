import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env file manually
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

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function findValidPart() {
    const { data, error } = await supabase
        .from('bom_master')
        .select('parent_part, child_part, part_name')
        .limit(5);

    if (error) {
        console.error('Error fetching BOM:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Found valid parts:');
        data.forEach(item => {
            console.log(`Parent: ${item.parent_part}, Child: ${item.child_part}, Name: ${item.part_name}`);
        });
    } else {
        console.log('No parts found in bom_master');
    }
}

findValidPart();
