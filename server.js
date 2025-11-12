const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // jos haluat palvella staattiset tiedostot

// SQLite tietokanta
const db = new sqlite3.Database('./db.sqlite', (err) => {
    if (err) console.error(err.message);
    else console.log('Connected to SQLite database.');
});

// Luo taulu, jos ei ole
db.run(`CREATE TABLE IF NOT EXISTS kommentit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teksti TEXT NOT NULL,
    aika DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Hae kommentit
app.get('/kommentit', (req, res) => {
    db.all('SELECT * FROM kommentit ORDER BY aika DESC', [], (err, rows) => {
        if (err) res.status(500).send(err.message);
        else res.json(rows);
    });
});

// Lisää kommentti
app.post('/kommentit', (req, res) => {
    const { teksti } = req.body;
    if (!teksti) return res.status(400).send('Kommentti puuttuu');
    db.run('INSERT INTO kommentit (teksti) VALUES (?)', [teksti], function(err) {
        if (err) res.status(500).send(err.message);
        else res.json({ id: this.lastID });
    });
});

app.listen(port, () => console.log(`Server running on port ${port}`));