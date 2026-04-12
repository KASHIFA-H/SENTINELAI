import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://lyznbmtmhmgunvujdcxq.supabase.co'
const SUPABASE_KEY = 'sb_publishable_sTF3oznlqezGyS7gBSFkUg_IYvE6RbO'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
