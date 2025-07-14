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

$usuario = cleanInput($input['usuario'] ?? '');
$dni = cleanInput($input['dni'] ?? '');
$email = cleanInput($input['email'] ?? '');

if (empty($usuario) || empty($dni) || empty($email)) {
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

// Consultar usuario en la base de datos
$stmt = $conn->prepare("SELECT id FROM usuarios WHERE usuario = ? AND dni = ? AND email = ?");
$stmt->bind_param("sss", $usuario, $dni, $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    http_response_code(401);
    echo json_encode(['error' => 'Credenciales inválidas']);
    exit;
}

$user = $result->fetch_assoc();

// Iniciar sesión
session_start();
$_SESSION['user_id'] = $user['id'];
$_SESSION['usuario'] = $usuario;
$_SESSION['dni'] = $dni;
$_SESSION['email'] = $email;

echo json_encode([
    'success' => true,
    'usuario' => $usuario,
    'dni' => $dni,
    'email' => $email
]);
?>