// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://blgattdqvzsayfilghil.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsZ2F0dGRxdnpzYXlmaWxnaGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc4NjU2MDAsImV4cCI6MjA1MzQ0MTYwMH0.GUJnmEUJ4ByY7SbeKER0FdxTex_vu9H66HB2jngfwtg";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);