<?php
// Configuración de la base de datos
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'wallet_segura');

// Rutas del sistema
define('DOCUMENTOS_DIR', __DIR__ . '/../documentos/');
define('BLOCKCHAIN_DIR', __DIR__ . '/../blockchain/');
define('TEMP_DIR', __DIR__ . '/../temp/');

// Configuración de seguridad
define('MAX_FILE_SIZE', 50 * 1024 * 1024); // 50MB
define('ALLOWED_FILE_TYPES', [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
]);

// Conexión a la base de datos
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

if ($conn->connect_error) {
    die("Error de conexión: " . $conn->connect_error);
}

// Crear directorios si no existen
if (!file_exists(DOCUMENTOS_DIR)) {
    mkdir(DOCUMENTOS_DIR, 0755, true);
}

if (!file_exists(BLOCKCHAIN_DIR)) {
    mkdir(BLOCKCHAIN_DIR, 0755, true);
}

if (!file_exists(TEMP_DIR)) {
    mkdir(TEMP_DIR, 0755, true);
}

// Función para limpiar datos de entrada
function cleanInput($data) {
    global $conn;
    return htmlspecialchars(stripslashes(trim($conn->real_escape_string($data))));
}

// Función para generar nombres de archivo seguros
function generateSafeFilename($filename) {
    $extension = pathinfo($filename, PATHINFO_EXTENSION);
    $basename = md5(pathinfo($filename, PATHINFO_FILENAME) . time());
    return $basename . '.' . $extension;
}
?>