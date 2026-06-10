import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = "https://tagudlekyyduqmidlkmm.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhZ3VkbGVreXlkdXFtaWRsa21tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5Njg5MDQsImV4cCI6MjA5NjU0NDkwNH0.HVJ2UlQj_nhclngHLUgHrgGVtDjVtscXpTuKXiJd6uQ"

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
if(supabase.auth){
    console.log("Holbogdson");
    console.log(supabase.auth);
}