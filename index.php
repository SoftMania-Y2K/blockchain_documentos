<?php
session_start();
require_once __DIR__ . '/backend/config.php';
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wallet Segura - Gestión Documental Cifrada</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css">
    <style>
        .tab-content {
            padding: 20px;
            border-left: 1px solid #ddd;
            border-right: 1px solid #ddd;
            border-bottom: 1px solid #ddd;
            border-radius: 0 0 5px 5px;
        }
        .signature-valid {
            color: green;
        }
        .signature-invalid {
            color: red;
        }
        .progress {
            height: 25px;
        }
        .certificate-container {
            border: 2px solid #0d6efd;
            border-radius: 10px;
            padding: 20px;
            background-color: #f8f9fa;
            font-family: 'Courier New', monospace;
        }
        .certificate-header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 1px solid #0d6efd;
            padding-bottom: 10px;
        }
        .certificate-footer {
            text-align: center;
            margin-top: 20px;
            border-top: 1px solid #0d6efd;
            padding-top: 10px;
            font-size: 0.8em;
        }
    </style>
</head>
<body>
    <div class="container mt-4">
        <h1 class="text-center mb-4">Wallet Segura</h1>
        
        <!-- Alertas -->
        <div id="alerts-container"></div>
        
        <!-- Pestañas -->
        <ul class="nav nav-tabs" id="walletTabs" role="tablist">
            <li class="nav-item" role="presentation">
                <button class="nav-link active" id="login-tab" data-bs-toggle="tab" data-bs-target="#login" type="button" role="tab">🔐 Login</button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="wallet-tab" data-bs-toggle="tab" data-bs-target="#wallet" type="button" role="tab" disabled>💼 Wallet</button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="upload-tab" data-bs-toggle="tab" data-bs-target="#upload" type="button" role="tab" disabled>📝 Subir</button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="view-tab" data-bs-toggle="tab" data-bs-target="#view" type="button" role="tab" disabled>📄 Ver</button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="sync-tab" data-bs-toggle="tab" data-bs-target="#sync" type="button" role="tab" disabled>🔁 Sincronizar</button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="cert-tab" data-bs-toggle="tab" data-bs-target="#cert" type="button" role="tab" disabled>🧾 Certificados</button>
            </li>
        </ul>
        
        <div class="tab-content" id="walletTabsContent">
            <!-- Pestaña Login -->
            <div class="tab-pane fade show active" id="login" role="tabpanel">
                <form id="loginForm" class="row g-3">
                    <div class="col-md-4">
                        <label for="usuario" class="form-label">Usuario</label>
                        <input type="text" class="form-control" id="usuario" required>
                    </div>
                    <div class="col-md-4">
                        <label for="dni" class="form-label">DNI</label>
                        <input type="text" class="form-control" id="dni" required>
                    </div>
                    <div class="col-md-4">
                        <label for="email" class="form-label">Email</label>
                        <input type="email" class="form-control" id="email" required>
                    </div>
                    <div class="col-12">
                        <button type="submit" class="btn btn-primary">Ingresar</button>
                    </div>
                </form>
            </div>
            
            <!-- Pestaña Wallet -->
            <div class="tab-pane fade" id="wallet" role="tabpanel">
                <div class="row">
                    <div class="col-md-6">
                        <h3>Generar Nueva Wallet</h3>
                        <p>Al generar una nueva wallet, se creará una clave privada única que deberás guardar de forma segura.</p>
                        <button id="generateWalletBtn" class="btn btn-primary">Generar Wallet</button>
                    </div>
                    <div class="col-md-6">
                        <h3>Cargar Wallet Existente</h3>
                        <div class="mb-3">
                            <label for="walletKeyFile" class="form-label">Seleccionar archivo .key</label>
                            <input class="form-control" type="file" id="walletKeyFile">
                        </div>
                        <button id="loadWalletBtn" class="btn btn-secondary">Cargar Wallet</button>
                    </div>
                </div>
                
                <div id="walletInfoContainer" class="mt-4" style="display: none;">
                    <div class="card">
                        <div class="card-header">
                            Información de la Wallet
                        </div>
                        <div class="card-body">
                            <p><strong>Wallet ID:</strong> <span id="walletIdDisplay"></span></p>
                            <div class="d-flex gap-2">
                                <button id="downloadKeyBtn" class="btn btn-outline-primary">Descargar .key</button>
                                <button id="downloadCertBtn" class="btn btn-outline-success">Descargar .crt</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Pestaña Subir -->
            <div class="tab-pane fade" id="upload" role="tabpanel">
                <div class="mb-3">
                    <label for="documentFiles" class="form-label">Seleccionar archivos para cifrar y subir</label>
                    <input class="form-control" type="file" id="documentFiles" multiple>
                </div>
                <button id="uploadFilesBtn" class="btn btn-primary" disabled>Subir documentos cifrados</button>
                
                <div id="uploadProgressContainer" class="mt-3"></div>
            </div>
            
            <!-- Pestaña Ver -->
            <div class="tab-pane fade" id="view" role="tabpanel">
                <div class="mb-3">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="showOnlyValid">
                        <label class="form-check-label" for="showOnlyValid">Mostrar solo archivos con firma válida</label>
                    </div>
                </div>
                
                <div class="mb-3">
                    <button id="loadChainBtn" class="btn btn-primary">Cargar Blockchain</button>
                    <button id="downloadAllBtn" class="btn btn-success" disabled>Descargar todos los válidos como ZIP</button>
                </div>
                
                <div class="table-responsive">
                    <table class="table table-striped table-hover">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Tipo</th>
                                <th>Tamaño</th>
                                <th>Fecha</th>
                                <th>Firma</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="documentsTableBody">
                            <tr>
                                <td colspan="6" class="text-center">No hay documentos cargados</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Pestaña Sincronizar -->
            <div class="tab-pane fade" id="sync" role="tabpanel">
                <div class="row">
                    <div class="col-md-6">
                        <h3>Descargar Backup</h3>
                        <p>Descarga tus archivos cifrados y la blockchain para guardarlos localmente.</p>
                        <button id="downloadBackupBtn" class="btn btn-primary">Descargar Backup</button>
                    </div>
                    <div class="col-md-6">
                        <h3>Restaurar Backup</h3>
                        <div class="mb-3">
                            <label for="backupBlobFile" class="form-label">Archivo .blob</label>
                            <input class="form-control" type="file" id="backupBlobFile">
                        </div>
                        <div class="mb-3">
                            <label for="backupChainFile" class="form-label">Archivo .chain</label>
                            <input class="form-control" type="file" id="backupChainFile">
                        </div>
                        <button id="uploadBackupBtn" class="btn btn-secondary">Subir Backup</button>
                    </div>
                </div>
            </div>
            
            <!-- Pestaña Certificados -->
            <!-- Añadir en la pestaña de Certificados -->
                <div class="tab-pane fade" id="cert" role="tabpanel">
                    <div class="row">
                        <!-- Generar Certificado -->
                        <div class="col-md-6">
                            <h3>Generar Certificado</h3>
                            <div class="mb-3">
                                <label class="form-label">Clave Privada (.key)</label>
                                <input type="file" id="privateKeyFile" class="form-control">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Nueva Clave de Certificado</label>
                                <input type="password" id="certPassword" class="form-control" placeholder="Mínimo 6 caracteres">
                            </div>
                            <button id="generateCertBtn" class="btn btn-primary">Generar</button>
                        </div>
                        
                        <!-- Usar Certificado -->
                        <div class="col-md-6">
                            <h3>Validar Certificado</h3>
                            <div class="mb-3">
                                <label class="form-label">Certificado (.crt)</label>
                                <input type="file" id="certificateFile" class="form-control">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Clave de Certificado</label>
                                <input type="password" id="certValidatePassword" class="form-control">
                            </div>
                            <button id="validateCertBtn" class="btn btn-success">Validar</button>
                        </div>
                    </div>
                    
                    <!-- Resultados -->
                    <div id="certResult" class="mt-4"></div>
                </div>
        </div>
    </div>

  

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
    <!-- Cambia esto en tu index.html -->
<!--<script src="assets/js/app.js" type="module"></script> -->

<!-- Core y utilidades base -->
<script src="assets/js/core.js"></script>
<script src="assets/js/ui.js"></script>

<!-- Funcionalidades principales -->
<script src="assets/js/login.js"></script>
<script src="assets/js/wallet.js"></script>
<script src="assets/js/certificates.js"></script>
<script src="assets/js/upload.js"></script>
<script src="assets/js/blockchain.js"></script>
<script src="assets/js/backup.js"></script>

<!-- Asociación de eventos -->
<script src="assets/js/events.js"></script>

<!-- Inicialización -->
<script src="assets/js/main.js"></script>

</body>
</html>