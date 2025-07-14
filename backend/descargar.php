<?php
require_once __DIR__ . '/config.php';

// Validar parámetros
$action = $_GET['action'] ?? '';
$walletId = $_GET['walletId'] ?? '';
$hash = $_GET['hash'] ?? '';

if (!in_array($action, ['chain', 'blob', 'file']) || !preg_match('/^[a-f0-9]{64}$/', $walletId)) {
    http_response_code(400);
    die('Parámetros inválidos');
}

// Rutas de los archivos
$blobFilePath = DOCUMENTOS_DIR . 'documentos_' . $walletId . '.blob';
$chainFilePath = BLOCKCHAIN_DIR . 'wallet_' . $walletId . '.chain';

if (!file_exists($blobFilePath) || !file_exists($chainFilePath)) {
    http_response_code(404);
    die('Archivos no encontrados para esta wallet');
}

switch ($action) {
    case 'chain':
        // Descargar blockchain completa
        header('Content-Type: text/plain');
        header('Content-Disposition: attachment; filename="wallet_' . $walletId . '.chain"');
        readfile($chainFilePath);
        break;
        
    case 'blob':
        // Descargar blob completo
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="documentos_' . $walletId . '.blob"');
        readfile($blobFilePath);
        break;
        
    case 'file':
        // Buscar el archivo específico en la blockchain
        $chainLines = file($chainFilePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        $found = false;
        $offset = 0;
        $length = 0;
        
        foreach ($chainLines as $line) {
            $block = json_decode($line, true);
            if ($block && isset($block['hash']) && $block['hash'] === $hash) {
                $found = true;
                $length = $block['tamaño']; // Asumimos que el tamaño cifrado es similar al original
                break;
            }
            $offset += strlen($line) + 1; // +1 por el carácter de nueva línea
        }
        
        if (!$found) {
            http_response_code(404);
            die('Archivo no encontrado en la blockchain');
        }
        
        // Leer el segmento del blob
        $blobHandle = fopen($blobFilePath, 'rb');
        fseek($blobHandle, $offset);
        $content = fread($blobHandle, $length);
        fclose($blobHandle);
        
        // Enviar el segmento
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="' . $hash . '.blob"');
        echo $content;
        break;
        
    default:
        http_response_code(400);
        die('Acción no válida');
}
?>