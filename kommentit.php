<?php
header('Content-Type: application/json');
$db = new SQLite3('db.sqlite');
$db->exec('CREATE TABLE IF NOT EXISTS kommentit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teksti TEXT NOT NULL,
    aika DATETIME DEFAULT CURRENT_TIMESTAMP
)');

$method = $_SERVER['REQUEST_METHOD'];

if($method == 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if(!empty($data['teksti'])) {
        $stmt = $db->prepare('INSERT INTO kommentit (teksti) VALUES (:teksti)');
        $stmt->bindValue(':teksti', $data['teksti'], SQLITE3_TEXT);
        $stmt->execute();
        echo json_encode(['status' => 'ok']);
    }
} else if($method == 'GET') {
    $result = $db->query('SELECT * FROM kommentit ORDER BY aika DESC');
    $kommentit = [];
    while($row = $result->fetchArray(SQLITE3_ASSOC)) {
        $kommentit[] = $row;
    }
    echo json_encode($kommentit);
}
?>