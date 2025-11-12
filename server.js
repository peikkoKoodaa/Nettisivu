const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // palvelee index.html ja kuvat

// Supabase client
const supabaseUrl = 'https://cpdqmrebwbtcczhclelx.supabase.co'; // projektisi URL
const supabaseKey = process.env.SUPABASE_KEY;                     // lisää Vercel env:iin
const supabase = createClient(supabaseUrl, supabaseKey);

app.get('/kommentit', async (req, res) => {
  const { data, error } = await supabase
    .from('kommentit')
    .select('*')
    .order('aika', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/kommentit', async (req, res) => {
  const { teksti } = req.body;
  if (!teksti) return res.status(400).json({ error: 'Teksti puuttuu' });

  const { data, error } = await supabase
    .from('kommentit')
    .insert([{ teksti }])
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});