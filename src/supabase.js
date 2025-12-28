import { createClient } from '@supabase/supabase-js'

// ★★★ ここに先ほどコピーした情報を貼り付け ★★★
const supabaseUrl = 'https://ecenvhtxhjqtpcxhpjfe.supabase.co/'
const supabaseAnonKey = 'sb_publishable_hzKU2bA44_xxIDiuLsaN0w_GBgHLQED'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

