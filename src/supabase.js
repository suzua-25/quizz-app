import { createClient } from '@supabase/supabase-js'

// ★★★ ここに先ほどコピーした情報を貼り付け ★★★
// const supabaseUrl = 'https://ecenvhtxhjqtpcxhpjfe.supabase.co/'
// const supabaseAnonKey = 'sb_publishable_hzKU2bA44_xxIDiuLsaN0w_GBgHLQED'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://ecenvhtxhjqtpcxhpjfe.supabase.co/'
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'https://ecenvhtxhjqtpcxhpjfe.supabase.co/'



export const supabase = createClient(supabaseUrl, supabaseAnonKey)

