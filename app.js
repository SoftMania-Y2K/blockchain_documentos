// Objeto global para almacenar datos de la aplicación
const WalletApp = {
    usuarioDatos: null,
    wallet: null,
    cryptoKey: null,
    currentChain: null,
    
    // Inicialización de la aplicación
    init: function() {
        this.bindEvents();
    },
    
    // Vincular eventos
   bindEvents: function() {
    // Login
    document.getElementById('loginForm').addEventListener('submit', this.handleLogin.bind(this));
    
    // Wallet
    document.getElementById('generateWalletBtn').addEventListener('click', this.generateWallet.bind(this));
    document.getElementById('loadWalletBtn').addEventListener('click', this.loadWalletFromFile.bind(this));
    document.getElementById('downloadKeyBtn').addEventListener('click', this.downloadWalletKey.bind(this));
    // ELIMINAR: downloadCertBtn (ahora se usa handleGenerateCert)
    
    // Subir archivos
    document.getElementById('documentFiles').addEventListener('change', this.handleFileSelection.bind(this));
    document.getElementById('uploadFilesBtn').addEventListener('click', this.uploadFiles.bind(this));
    
    // Ver archivos
    document.getElementById('loadChainBtn').addEventListener('click', this.loadBlockchain.bind(this));
    document.getElementById('downloadAllBtn').addEventListener('click', this.downloadAllValidAsZip.bind(this));
    document.getElementById('showOnlyValid').addEventListener('change', this.filterValidDocuments.bind(this));
    
    // Sincronización
    document.getElementById('downloadBackupBtn').addEventListener('click', this.downloadBackup.bind(this));
    document.getElementById('uploadBackupBtn').addEventListener('click', this.uploadBackup.bind(this));
    
    // ===== NUEVO SISTEMA DE CERTIFICADOS =====
    // Generación de certificado
    document.getElementById('generateCertBtn').addEventListener('click', this.handleGenerateCert.bind(this));
    // Validación de certificado
    document.getElementById('validateCertBtn').addEventListener('click', this.handleValidateCert.bind(this));
    
    // Helper para leer archivos como texto (añadir solo si no existe)
    if (!this.readFileAsText) {
        this.readFileAsText = function(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsText(file);
            });
        };
    }
},
    
    // Mostrar alerta
    showAlert: function(message, type = 'success') {
        const alertsContainer = document.getElementById('alerts-container');
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.role = 'alert';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        alertsContainer.appendChild(alert);
        
        // Auto-eliminar después de 5 segundos
        setTimeout(() => {
            alert.remove();
        }, 5000);
    },
    
    // Manejar login
    handleLogin: async function(e) {
        e.preventDefault();
        
        const usuario = document.getElementById('usuario').value;
        const dni = document.getElementById('dni').value;
        const email = document.getElementById('email').value;
        
        try {
            const response = await fetch('backend/login.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ usuario, dni, email })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.usuarioDatos = {
                    usuario: data.usuario,
                    dni: data.dni,
                    email: data.email
                };
                
                // Habilitar pestañas
                document.querySelectorAll('#walletTabs .nav-link:not(#login-tab)').forEach(tab => {
                    tab.disabled = false;
                });
                
                // Activar pestaña de wallet
                document.getElementById('wallet-tab').click();
                
                this.showAlert('Login exitoso. Ahora puedes generar o cargar tu wallet.', 'success');
            } else {
                this.showAlert(data.error || 'Error en el login', 'danger');
            }
        } catch (error) {
            this.showAlert('Error de conexión: ' + error.message, 'danger');
        }
    },
    
    // Generar nueva wallet
    generateWallet: async function() {
        try {
            // Generar clave privada aleatoria de 256 bits (32 bytes)
            const privateKey = window.crypto.getRandomValues(new Uint8Array(32));
            
            // Calcular wallet ID como SHA-256 de la clave privada
            const hashBuffer = await window.crypto.subtle.digest('SHA-256', privateKey);
            const walletId = this.arrayBufferToHex(hashBuffer);
            
            // Derivar clave AES para cifrado de archivos
            const keyMaterial = await window.crypto.subtle.importKey(
                'raw',
                privateKey,
                { name: 'PBKDF2' },
                false,
                ['deriveKey']
            );
            
            const aesKey = await window.crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: new TextEncoder().encode('WalletSeguraSalt'),
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                keyMaterial,
                { name: 'AES-GCM', length: 256 },
                true,
                ['encrypt', 'decrypt']
            );
            
            // Guardar datos en el objeto wallet
            this.wallet = {
                privateKey: privateKey,
                walletId: walletId,
                aesKey: aesKey
            };
            
            // Mostrar información de la wallet
            document.getElementById('walletIdDisplay').textContent = walletId;
            document.getElementById('walletInfoContainer').style.display = 'block';
            
            this.showAlert('Wallet generada con éxito. Guarda tu clave privada (.key) en un lugar seguro.', 'success');
        } catch (error) {
            this.showAlert('Error al generar la wallet: ' + error.message, 'danger');
            console.error(error);
        }
    },
    
    // Cargar wallet desde archivo .key
    loadWalletFromFile: async function() {
        const fileInput = document.getElementById('walletKeyFile');
        const file = fileInput.files[0];
        
        if (!file) {
            this.showAlert('Por favor selecciona un archivo .key', 'warning');
            return;
        }
        
        try {
            const fileContent = await this.readFileAsArrayBuffer(file);
            const privateKey = new Uint8Array(fileContent);
            
            if (privateKey.length !== 32) {
                throw new Error('El archivo .key no tiene el tamaño correcto (32 bytes)');
            }
            
            // Calcular wallet ID como SHA-256 de la clave privada
            const hashBuffer = await window.crypto.subtle.digest('SHA-256', privateKey);
            const walletId = this.arrayBufferToHex(hashBuffer);
            
            // Derivar clave AES para cifrado de archivos
            const keyMaterial = await window.crypto.subtle.importKey(
                'raw',
                privateKey,
                { name: 'PBKDF2' },
                false,
                ['deriveKey']
            );
            
            const aesKey = await window.crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: new TextEncoder().encode('WalletSeguraSalt'),
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                keyMaterial,
                { name: 'AES-GCM', length: 256 },
                true,
                ['encrypt', 'decrypt']
            );
            
            // Guardar datos en el objeto wallet
            this.wallet = {
                privateKey: privateKey,
                walletId: walletId,
                aesKey: aesKey
            };
            
            // Mostrar información de la wallet
            document.getElementById('walletIdDisplay').textContent = walletId;
            document.getElementById('walletInfoContainer').style.display = 'block';
            
            this.showAlert('Wallet cargada con éxito.', 'success');
        } catch (error) {
            this.showAlert('Error al cargar la wallet: ' + error.message, 'danger');
            console.error(error);
        }
    },
    
    // Descargar clave privada (.key)
    downloadWalletKey: function() {
        if (!this.wallet || !this.wallet.privateKey) {
            this.showAlert('No hay wallet activa para descargar', 'warning');
            return;
        }
        
        const blob = new Blob([this.wallet.privateKey], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wallet_${this.wallet.walletId.substring(0, 8)}.key`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },
    
  
    // Manejar selección de archivos para subir
    handleFileSelection: function(e) {
        const files = e.target.files;
        if (files.length > 0) {
            document.getElementById('uploadFilesBtn').disabled = false;
        }
    },
    
    // Subir archivos cifrados al servidor
    uploadFiles: async function() {

         if (!window.activeCertificate) {
        this.showAlert("Debes validar un certificado primero", "warning");
        document.getElementById('cert-tab').click();
        return;
    }
        if (!this.wallet || !this.wallet.aesKey) {
            this.showAlert('No hay wallet activa para cifrar archivos', 'warning');
            return;
        }
        
        const files = document.getElementById('documentFiles').files;
        if (files.length === 0) {
            this.showAlert('No hay archivos seleccionados', 'warning');
            return;
        }
        
        const progressContainer = document.getElementById('uploadProgressContainer');
        progressContainer.innerHTML = '';
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            // Crear elemento de progreso
            const progressDiv = document.createElement('div');
            progressDiv.className = 'mb-3';
            progressDiv.innerHTML = `
                <div class="d-flex justify-content-between">
                    <span>${file.name}</span>
                    <span class="progress-percentage">0%</span>
                </div>
                <div class="progress">
                    <div class="progress-bar" role="progressbar" style="width: 0%"></div>
                </div>
            `;
            progressContainer.appendChild(progressDiv);
            
            try {
                // Actualizar progreso
                const updateProgress = (percent) => {
                    const progressBar = progressDiv.querySelector('.progress-bar');
                    const progressText = progressDiv.querySelector('.progress-percentage');
                    progressBar.style.width = `${percent}%`;
                    progressText.textContent = `${percent}%`;
                };
                
                updateProgress(5);
                
                // Leer archivo como ArrayBuffer
                const fileContent = await this.readFileAsArrayBuffer(file);
                updateProgress(10);
                
                // Calcular hash del archivo original
                const originalHash = await window.crypto.subtle.digest('SHA-256', fileContent);
                const originalHashHex = this.arrayBufferToHex(originalHash);
                updateProgress(15);
                
                // Generar IV aleatorio
                const iv = window.crypto.getRandomValues(new Uint8Array(12));
                updateProgress(20);
                
                // Cifrar archivo con AES-GCM
                const encryptedContent = await window.crypto.subtle.encrypt(
                    {
                        name: 'AES-GCM',
                        iv: iv
                    },
                    this.wallet.aesKey,
                    fileContent
                );
                updateProgress(60);
                
                // Crear bloque de metadatos
                const metadata = {
                    nombre: file.name,
                    tipo: file.type,
                    tamaño: file.size,
                    iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
                    hash: originalHashHex,
                    usuario: this.usuarioDatos.usuario,
                    dni: this.usuarioDatos.dni,
                    email: this.usuarioDatos.email,
                    fecha: new Date().toISOString(),
                    walletId: this.wallet.walletId
                };
                
                // Firmar el bloque de metadatos
                const metadataJson = JSON.stringify(metadata);
                const metadataHash = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(metadataJson + originalHashHex));
                metadata.firma = this.arrayBufferToHex(metadataHash);
                updateProgress(80);
                
                // Enviar al servidor
                const formData = new FormData();
                formData.append('walletId', this.wallet.walletId);
                formData.append('archivo', new Blob([encryptedContent]), `${originalHashHex}.blob`);
                formData.append('metadata', JSON.stringify(metadata));
                
                const response = await fetch('backend/subir.php', {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    throw new Error(`Error en el servidor: ${response.statusText}`);
                }
                
                updateProgress(100);
                progressDiv.querySelector('.progress-bar').classList.add('bg-success');
                
                this.showAlert(`Archivo "${file.name}" subido con éxito`, 'success');
            } catch (error) {
                progressDiv.querySelector('.progress-bar').classList.add('bg-danger');
                this.showAlert(`Error al subir "${file.name}": ${error.message}`, 'danger');
                console.error(error);
            }
        }
    },
    
    // Cargar blockchain desde el servidor
    loadBlockchain: async function() {
        if (!this.wallet || !this.wallet.walletId) {
            this.showAlert('No hay wallet activa para cargar la blockchain', 'warning');
            return;
        }
        
        try {
            const response = await fetch(`backend/descargar.php?action=chain&walletId=${this.wallet.walletId}`);
            
            if (!response.ok) {
                throw new Error(`Error al cargar la blockchain: ${response.statusText}`);
            }
            
            const chainText = await response.text();
            const chainLines = chainText.split('\n').filter(line => line.trim() !== '');
            this.currentChain = [];
            
            const tableBody = document.getElementById('documentsTableBody');
            tableBody.innerHTML = '';
            
            for (const line of chainLines) {
                try {
                    const block = JSON.parse(line);
                    
                    // Verificar firma
                    const blockCopy = {...block};
                    const signature = blockCopy.firma;
                    delete blockCopy.firma;
                    
                    const blockJson = JSON.stringify(blockCopy);
                    const hashToVerify = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(blockJson + block.hash));
                    const hashHex = this.arrayBufferToHex(hashToVerify);
                    
                    const isValid = hashHex === signature;
                    this.currentChain.push({...block, isValid});
                    
                    // Agregar fila a la tabla
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${block.nombre}</td>
                        <td>${block.tipo || 'Desconocido'}</td>
                        <td>${this.formatFileSize(block.tamaño)}</td>
                        <td>${new Date(block.fecha).toLocaleString()}</td>
                        <td class="${isValid ? 'signature-valid' : 'signature-invalid'}">
                            ${isValid ? '✅ Válida' : '⚠️ Inválida'}
                        </td>
                        <td>
                            <button class="btn btn-sm btn-primary download-btn" data-hash="${block.hash}">
                                <i class="bi bi-download"></i> Descargar
                            </button>
                        </td>
                    `;
                    tableBody.appendChild(row);
                } catch (error) {
                    console.error('Error al procesar bloque:', error);
                }
            }
            
            // Habilitar botón de descarga ZIP si hay archivos válidos
            const hasValidFiles = this.currentChain.some(block => block.isValid);
            document.getElementById('downloadAllBtn').disabled = !hasValidFiles;
            
            // Vincular eventos de descarga
            document.querySelectorAll('.download-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const hash = e.target.getAttribute('data-hash') || 
                                e.target.parentElement.getAttribute('data-hash');
                    this.downloadFile(hash);
                });
            });
            
            this.showAlert('Blockchain cargada con éxito', 'success');
        } catch (error) {
            this.showAlert('Error al cargar la blockchain: ' + error.message, 'danger');
            console.error(error);
        }
    },
    
    // Descargar archivo individual
    downloadFile: async function(hash) {
        if (!this.wallet || !this.wallet.aesKey || !this.currentChain) {
            this.showAlert('No hay wallet activa o blockchain cargada', 'warning');
            return;
        }
        
        try {
            // Buscar el bloque correspondiente
            const block = this.currentChain.find(b => b.hash === hash);
            if (!block) {
                throw new Error('Archivo no encontrado en la blockchain');
            }
            
            if (!block.isValid) {
                this.showAlert('No se puede descargar un archivo con firma inválida', 'warning');
                return;
            }
            
            // Descargar el archivo cifrado
            const response = await fetch(`backend/descargar.php?action=file&walletId=${this.wallet.walletId}&hash=${hash}`);
            
            if (!response.ok) {
                throw new Error(`Error al descargar el archivo: ${response.statusText}`);
            }
            
            const encryptedContent = await response.arrayBuffer();
            
            // Convertir IV de hex a Uint8Array
            const iv = new Uint8Array(block.iv.match(/../g).map(h => parseInt(h, 16)));
            
            // Descifrar el archivo
            const decryptedContent = await window.crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                this.wallet.aesKey,
                encryptedContent
            );
            
            // Crear blob y descargar
            const blob = new Blob([decryptedContent], { type: block.tipo });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = block.nombre;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showAlert(`Archivo "${block.nombre}" descargado con éxito`, 'success');
        } catch (error) {
            this.showAlert('Error al descargar el archivo: ' + error.message, 'danger');
            console.error(error);
        }
    },
    
    // Descargar todos los archivos válidos como ZIP
    downloadAllValidAsZip: async function() {
        if (!this.wallet || !this.wallet.aesKey || !this.currentChain) {
            this.showAlert('No hay wallet activa o blockchain cargada', 'warning');
            return;
        }
        
        const validBlocks = this.currentChain.filter(block => block.isValid);
        if (validBlocks.length === 0) {
            this.showAlert('No hay archivos válidos para descargar', 'warning');
            return;
        }
        
        try {
            const zip = new JSZip();
            const folder = zip.folder(`wallet_${this.wallet.walletId.substring(0, 8)}`);
            
            // Mostrar progreso
            const progressDiv = document.createElement('div');
            progressDiv.className = 'mb-3';
            progressDiv.innerHTML = `
                <div class="d-flex justify-content-between">
                    <span>Preparando archivos ZIP...</span>
                    <span class="progress-percentage">0%</span>
                </div>
                <div class="progress">
                    <div class="progress-bar" role="progressbar" style="width: 0%"></div>
                </div>
            `;
            document.getElementById('uploadProgressContainer').appendChild(progressDiv);
            
            const updateProgress = (percent) => {
                const progressBar = progressDiv.querySelector('.progress-bar');
                const progressText = progressDiv.querySelector('.progress-percentage');
                progressBar.style.width = `${percent}%`;
                progressText.textContent = `${percent}%`;
            };
            
            updateProgress(5);
            
            // Procesar cada archivo válido
            for (let i = 0; i < validBlocks.length; i++) {
                const block = validBlocks[i];
                
                try {
                    // Descargar el archivo cifrado
                    const response = await fetch(`backend/descargar.php?action=file&walletId=${this.wallet.walletId}&hash=${block.hash}`);
                    
                    if (!response.ok) {
                        console.error(`Error al descargar ${block.nombre}: ${response.statusText}`);
                        continue;
                    }
                    
                    const encryptedContent = await response.arrayBuffer();
                    
                    // Convertir IV de hex a Uint8Array
                    const iv = new Uint8Array(block.iv.match(/../g).map(h => parseInt(h, 16)));
                    
                    // Descifrar el archivo
                    const decryptedContent = await window.crypto.subtle.decrypt(
                        {
                            name: 'AES-GCM',
                            iv: iv
                        },
                        this.wallet.aesKey,
                        encryptedContent
                    );
                    
                    // Agregar al ZIP
                    folder.file(block.nombre, decryptedContent);
                    
                    updateProgress(5 + (i + 1) * (90 / validBlocks.length));
                } catch (error) {
                    console.error(`Error al procesar ${block.nombre}:`, error);
                }
            }
            
            updateProgress(95);
            
            // Generar el ZIP
            const zipContent = await zip.generateAsync({ type: 'blob' }, (metadata) => {
                updateProgress(95 + (metadata.percent * 5 / 100));
            });
            
            // Descargar el ZIP
            const url = URL.createObjectURL(zipContent);
            const a = document.createElement('a');
            a.href = url;
            a.download = `wallet_${this.wallet.walletId.substring(0, 8)}_docs.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            progressDiv.querySelector('.progress-bar').classList.add('bg-success');
            updateProgress(100);
            
            this.showAlert(`ZIP con ${validBlocks.length} archivos descargado con éxito`, 'success');
        } catch (error) {
            this.showAlert('Error al generar el ZIP: ' + error.message, 'danger');
            console.error(error);
        }
    },
    
    // Filtrar documentos por validez de firma
    filterValidDocuments: function() {
        const showOnlyValid = document.getElementById('showOnlyValid').checked;
        const rows = document.querySelectorAll('#documentsTableBody tr');
        
        rows.forEach(row => {
            const isValid = row.querySelector('.signature-valid') !== null;
            row.style.display = (showOnlyValid && !isValid) ? 'none' : '';
        });
    },
    
    // Descargar backup completo (.blob y .chain)
    downloadBackup: async function() {
        if (!this.wallet || !this.wallet.walletId) {
            this.showAlert('No hay wallet activa para descargar backup', 'warning');
            return;
        }
        
        try {
            // Descargar blockchain
            const chainResponse = await fetch(`backend/descargar.php?action=chain&walletId=${this.wallet.walletId}`);
            if (!chainResponse.ok) {
                throw new Error(`Error al descargar la blockchain: ${chainResponse.statusText}`);
            }
            const chainContent = await chainResponse.text();
            
            // Descargar archivos blob
            const blobResponse = await fetch(`backend/descargar.php?action=blob&walletId=${this.wallet.walletId}`);
            if (!blobResponse.ok) {
                throw new Error(`Error al descargar el blob: ${blobResponse.statusText}`);
            }
            const blobContent = await blobResponse.blob();
            
            // Crear ZIP con ambos archivos
            const zip = new JSZip();
            zip.file(`wallet_${this.wallet.walletId}.chain`, chainContent);
            zip.file(`wallet_${this.wallet.walletId}.blob`, blobContent);
            
            const zipContent = await zip.generateAsync({ type: 'blob' });
            
            // Descargar el ZIP
            const url = URL.createObjectURL(zipContent);
            const a = document.createElement('a');
            a.href = url;
            a.download = `wallet_${this.wallet.walletId}_backup.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showAlert('Backup descargado con éxito', 'success');
        } catch (error) {
            this.showAlert('Error al descargar backup: ' + error.message, 'danger');
            console.error(error);
        }
    },
    
    // Subir backup (.blob y .chain)
    uploadBackup: async function() {
        if (!this.wallet || !this.wallet.walletId) {
            this.showAlert('No hay wallet activa para subir backup', 'warning');
            return;
        }
        
        const blobFile = document.getElementById('backupBlobFile').files[0];
        const chainFile = document.getElementById('backupChainFile').files[0];
        
        if (!blobFile || !chainFile) {
            this.showAlert('Debes seleccionar ambos archivos (.blob y .chain)', 'warning');
            return;
        }
        
        try {
            const formData = new FormData();
            formData.append('walletId', this.wallet.walletId);
            formData.append('blob', blobFile);
            formData.append('chain', chainFile);
            
            const response = await fetch('backend/sincronizar_subida.php', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`Error en el servidor: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.showAlert('Backup subido con éxito', 'success');
            } else {
                throw new Error(data.error || 'Error desconocido al subir backup');
            }
        } catch (error) {
            this.showAlert('Error al subir backup: ' + error.message, 'danger');
            console.error(error);
        }
    },
    
    calculateWalletId: async function(privateKey) {
        return Array.from(new Uint8Array(
            await crypto.subtle.digest('SHA-256', privateKey)
        )).map(b => b.toString(16).padStart(2, '0')).join('');
    },
       
    // Helper: Leer archivo como ArrayBuffer
    readFileAsArrayBuffer: function(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    },
    
    // Helper: Convertir ArrayBuffer a hex string
    arrayBufferToHex: function(buffer) {
        return Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    },
    
    // Helper: Formatear tamaño de archivo
    formatFileSize: function(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },



  // 1. Generar Certificado PKI (Versión Corregida)
generatePKICertificate: async function(privateKey, password) {
    try {
        // 1. Generar salt aleatorio
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
        
        // 2. Configurar certificado
        const certInfo = {
            version: "1.0",
            walletId: this.wallet.walletId,
            userData: this.usuarioDatos,
            issuedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 365*24*60*60*1000).toISOString(), // 1 año
            salt: saltHex
        };
        
        // 3. Importar clave HMAC (CORRECCIÓN IMPORTANTE)
        const hmacKey = await window.crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(password + saltHex),
            {
                name: 'HMAC',
                hash: { name: 'SHA-256' } // ¡Especificación del hash requerida!
            },
            false,
            ['sign']
        );
        
        // 4. Firmar certificado (CORRECCIÓN IMPORTANTE)
        const signature = await window.crypto.subtle.sign(
            {
                name: 'HMAC',
                hash: { name: 'SHA-256' } // ¡Especificación del hash requerida!
            },
            hmacKey,
            new TextEncoder().encode(JSON.stringify(certInfo))
        );
        
        return {
            info: certInfo,
            signature: Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('')
        };
        
    } catch (error) {
        console.error("Error en generatePKICertificate:", error);
        throw new Error("Error al generar certificado: " + error.message);
    }
},

// 2. Validar Certificado (Versión Compatible)
validateCertificate: async function(certData, password) {
    try {
        // 1. Importar clave HMAC
        const hmacKey = await window.crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(password + certData.info.salt),
            {
                name: 'HMAC',
                hash: { name: 'SHA-256' }
            },
            false,
            ['verify']
        );
        
        // 2. Verificar firma
        const isValid = await window.crypto.subtle.verify(
            {
                name: 'HMAC',
                hash: { name: 'SHA-256' }
            },
            hmacKey,
            new Uint8Array(certData.signature.match(/../g).map(h => parseInt(h, 16))),
            new TextEncoder().encode(JSON.stringify(certData.info))
        );
        
        // 3. Verificar fecha de expiración
        const isExpired = new Date(certData.info.expiresAt) < new Date();
        
        return isValid && !isExpired;
        
    } catch (error) {
        console.error("Error en validateCertificate:", error);
        return false;
    }
},

// 3. Manejadores de eventos para la nueva UI
handleGenerateCert: async function() {
    const privateKeyFile = document.getElementById('privateKeyFile').files[0];
    const password = document.getElementById('certPassword').value;
    
    if (!privateKeyFile || password.length < 6) {
        this.showAlert("Se requiere clave privada y password (6+ caracteres)", "warning");
        return;
    }

    try {
        const privateKey = await this.readFileAsArrayBuffer(privateKeyFile);
        const certificate = await this.generatePKICertificate(new Uint8Array(privateKey), password);
        
        // Descargar certificado
        const blob = new Blob([JSON.stringify(certificate, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cert_${this.wallet.walletId.substring(0, 8)}.crt`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showAlert("Certificado generado con éxito", "success");
    } catch (error) {
        this.showAlert("Error: " + error.message, "danger");
    }
},

handleValidateCert: async function() {
    const certFile = document.getElementById('certificateFile').files[0];
    const password = document.getElementById('certValidatePassword').value;
    
    if (!certFile || !password) {
        this.showAlert("Se requiere certificado y password", "warning");
        return;
    }

    try {
        const certData = JSON.parse(await this.readFileAsText(certFile));
        const isValid = await this.validateCertificate(certData, password);
        
        const resultDiv = document.getElementById('certResult');
        resultDiv.innerHTML = isValid ? 
            `<div class="alert alert-success">✅ Certificado válido</div>` :
            `<div class="alert alert-danger">⚠️ Certificado inválido o expirado</div>`;
        
        if (isValid) {
            window.activeCertificate = certData; // Guardar para uso posterior
        }
    } catch (error) {
        this.showAlert("Error: " + error.message, "danger");
    }
},




};

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    WalletApp.init();
});