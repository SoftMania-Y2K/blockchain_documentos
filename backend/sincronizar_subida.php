<?php
require_once __DIR__ . '/config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

// Verificar que se hayan enviado todos los datos necesarios
if (!isset($_POST['walletId']) || !isset($_FILES['blob']) || !isset($_FILES['chain'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Datos incompletos']);
    exit;
}

$walletId = cleanInput($_POST['walletId']);
$blobFile = $_FILES['blob'];
$chainFile = $_FILES['chain'];

// Validar walletId (64 caracteres hexadecimales)
if (!preg_match('/^[a-f0-9]{64}$/', $walletId)) {
    http_response_code(400);
    echo json_encode(['error' => 'Wallet ID inválido']);
    exit;
}

// Validar archivos
if ($blobFile['error'] !== UPLOAD_ERR_OK || $chainFile['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'Error al subir los archivos']);
    exit;
}

// Verificar nombres de archivo
$expectedBlobName = 'documentos_' . $walletId . '.blob';
$expectedChainName = 'wallet_' . $walletId . '.chain';

if ($blobFile['name'] !== $expectedBlobName || $chainFile['name'] !== $expectedChainName) {
    http_response_code(400);
    echo json_encode(['error' => 'Los nombres de los archivos no coinciden con el wallet ID']);
    exit;
}

// Rutas de destino
$blobFilePath = DOCUMENTOS_DIR . $expectedBlobName;
$chainFilePath = BLOCKCHAIN_DIR . $expectedChainName;

// Mover los archivos a su ubicación final
if (!move_uploaded_file($blobFile['tmp_name'], $blobFilePath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Error al guardar el archivo blob']);
    exit;
}

if (!move_uploaded_file($chainFile['tmp_name'], $chainFilePath)) {
    // Intentar eliminar el blob si falla la chain
    @unlink($blobFilePath);
    http_response_code(500);
    echo json_encode(['error' => 'Error al guardar el archivo chain']);
    exit;
}

echo json_encode(['success' => true]);
?>