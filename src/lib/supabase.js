import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vmngvivqpiqbfzmaynme.supabase.co';
const supabaseAnonKey = 'sb_publishable_3E32q_q5GAnRWEMHwgTOAg_DOGC0lSl';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
