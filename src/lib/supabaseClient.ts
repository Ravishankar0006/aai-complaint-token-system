import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = "https://kajyxzblsyyptweagnkg.supabase.co";
export const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imthanl4emJsc3l5cHR3ZWFnbmtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMDA0MDMsImV4cCI6MjA5OTY3NjQwM30.76U4GFWzgN5dY3V2k3_9YL07hwBCu6xruHi1A5bqQm0";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
