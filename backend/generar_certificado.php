<?php
require_once __DIR__ . '/config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['error' => 'Datos JSON inválidos']);
    exit;
}

$privateKey = $input['privateKey'] ?? '';
$usuario = $input['usuario'] ?? '';
$dni = $input['dni'] ?? '';
$email = $input['email'] ?? '';

if (empty($privateKey) || empty($usuario) || empty($dni) || empty($email)) {
    http_response_code(400);
    echo json_encode(['error' => 'Todos los campos son requeridos']);
    exit;
}

// Validar formato de DNI (8 dígitos numéricos)
if (!preg_match('/^\d{8}$/', $dni)) {
    http_response_code(400);
    echo json_encode(['error' => 'DNI inválido, debe contener 8 dígitos']);
    exit;
}

// Validar formato de email
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Email inválido']);
    exit;
}

try {
    // Crear objeto de certificado
    $certData = [
        'version' => '1.0',
        'usuario' => $usuario,
        'dni' => $dni,
        'email' => $email,
        'fechaEmision' => date('c'),
        'emisor' => 'Wallet Segura'
    ];
    
    // Calcular wallet ID (SHA-256 de la clave privada)
    $walletId = hash('sha256', hex2bin($privateKey));
    $certData['walletId'] = $walletId;
    
    // Calcular hash del certificado
    $certJson = json_encode($certData);
    $hash = hash('sha256', $certJson);
    $certData['firma'] = $hash;
    
    echo json_encode([
        'success' => true,
        'certificado' => $certData,
        'walletId' => $walletId
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error al generar el certificado: ' . $e->getMessage()]);
}
?>