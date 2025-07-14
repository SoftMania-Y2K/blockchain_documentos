<?php
require_once __DIR__ . '/config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

// Verificar que se hayan enviado todos los datos necesarios
if (!isset($_POST['walletId']) || !isset($_FILES['archivo']) || !isset($_POST['metadata'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Datos incompletos']);
    exit;
}

$walletId = cleanInput($_POST['walletId']);
$metadata = json_decode($_POST['metadata'], true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['error' => 'Metadatos JSON inválidos']);
    exit;
}

// Validar walletId (64 caracteres hexadecimales)
if (!preg_match('/^[a-f0-9]{64}$/', $walletId)) {
    http_response_code(400);
    echo json_encode(['error' => 'Wallet ID inválido']);
    exit;
}

// Validar archivo
$file = $_FILES['archivo'];
if ($file['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'Error al subir el archivo: ' . $file['error']]);
    exit;
}

if ($file['size'] > MAX_FILE_SIZE) {
    http_response_code(400);
    echo json_encode(['error' => 'El archivo excede el tamaño máximo permitido']);
    exit;
}

// Verificar que el hash en los metadatos coincida con el nombre del archivo
$expectedFilename = $metadata['hash'] . '.blob';
if ($file['name'] !== $expectedFilename) {
    http_response_code(400);
    echo json_encode(['error' => 'El nombre del archivo no coincide con el hash']);
    exit;
}

// Rutas de los archivos
$blobFilePath = DOCUMENTOS_DIR . 'documentos_' . $walletId . '.blob';
$chainFilePath = BLOCKCHAIN_DIR . 'wallet_' . $walletId . '.chain';
$metadata['tamaño'] = $file['size'];
// Guardar el archivo cifrado (append al blob)
if (file_put_contents($blobFilePath, file_get_contents($file['tmp_name']), FILE_APPEND) === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Error al guardar el archivo cifrado']);
    exit;
}

// Guardar los metadatos en la blockchain (append al chain)
if (file_put_contents($chainFilePath, json_encode($metadata) . PHP_EOL, FILE_APPEND) === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Error al guardar los metadatos']);
    exit;
}

echo json_encode(['success' => true]);
?>