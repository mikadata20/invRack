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

async function debugLookup() {
    // Use a known parent part from previous context or just pick one
    const parentPart = "IKKYB1GNP418101"; // From user's previous message

    console.log(`Testing lookup for Parent Part: ${parentPart}`);

    // 1. Test with maybeSingle AND limit(1) (The Fix)
    console.log("\n--- Test 1: limit(1).maybeSingle() ---");
    const { data: data1, error: error1 } = await supabase
        .from("bom_master")
        .select("model, cyl")
        .eq("parent_part", parentPart)
        .limit(1)
        .maybeSingle();

    if (error1) {
        console.error("Error with maybeSingle:", error1);
    } else {
        console.log("Result maybeSingle:", data1);
    }

    // 2. Test with limit(1).maybeSingle() or just select
    console.log("\n--- Test 2: limit(1) ---");
    const { data: data2, error: error2 } = await supabase
        .from("bom_master")
        .select("model, cyl")
        .eq("parent_part", parentPart)
        .limit(1);

    if (error2) {
        console.error("Error with limit(1):", error2);
    } else {
        console.log("Result limit(1):", data2);
    }
}

debugLookup();
