import { createClient } from '@supabase/supabase-js';

// Use service role key for backend, anon key for frontend
const supabaseUrl =
	process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey =
	process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Prefer service role key if available (backend), otherwise anon key (frontend)
const supabaseKey = supabaseServiceRoleKey || supabaseAnonKey;

if (!supabaseUrl || !supabaseKey) {
	throw new Error(
		'Missing Supabase environment variables. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (for backend) or SUPABASE_ANON_KEY (for frontend)'
	);
}

export const supabase = createClient(supabaseUrl, supabaseKey);
