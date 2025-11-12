import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cpdqmrebwbtcczhclelx.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('kommentit')
      .select('*')
      .order('aika', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { teksti } = req.body;
    const { error } = await supabase.from('kommentit').insert([{ teksti }]);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  res.status(405).end();
}
