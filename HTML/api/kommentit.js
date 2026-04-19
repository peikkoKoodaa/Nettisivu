import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lfnoyulqffvqgtksvulg.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('kommentit')
        .select('*')
        .limit(res.limit)
        .order('id', { ascending: false });

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { teksti } = req.body || {};

      if (!teksti || !teksti.trim()) {
        return res.status(400).json({ error: 'Kommentti puuttuu.' });
      }

      const { error } = await supabase
        .from('kommentit')
        .insert([{ teksti: teksti.trim() }]);

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
