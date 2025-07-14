WalletApp.loadBlockchain = async function () {
    // Verificación más robusta de la wallet
    if (!this.wallet || !this.wallet.walletId) {
        this.showAlert('No hay wallet activa para cargar la blockchain', 'warning');
        return;
    }

    try {
        // Mostrar indicador de carga
        this.showLoadingIndicator(true);
        
        const response = await fetch(`backend/descargar.php?action=chain&walletId=${this.wallet.walletId}`, {
            headers: {
                'Cache-Control': 'no-cache'
            }
        });

        // Manejo más detallado de respuestas
        if (response.status === 404) {
            this.currentChain = [];
            document.getElementById('documentsTableBody').innerHTML = '';
            document.getElementById('downloadAllBtn').disabled = true;
            this.showAlert('Blockchain vacía. No hay archivos aún.', 'info');
            return;
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        const chainText = await response.text();
        
        // Verificar que la respuesta no esté vacía
        if (!chainText || chainText.trim() === '') {
            throw new Error('La respuesta del servidor está vacía');
        }

        const chainLines = chainText.split('\n').filter(line => line.trim() !== '');
        this.currentChain = [];

        const tableBody = document.getElementById('documentsTableBody');
        if (!tableBody) {
            throw new Error('No se encontró el elemento documentsTableBody');
        }
        tableBody.innerHTML = '';

        // Contador para bloques válidos
        let validBlocksCount = 0;

        for (const line of chainLines) {
            try {
                const block = JSON.parse(line);
                
                // Validación básica del bloque
                if (!block.hash || !block.firma) {
                    console.warn('Bloque inválido - falta hash o firma:', block);
                    continue;
                }

                const blockCopy = { ...block };
                const signature = blockCopy.firma;
                delete blockCopy.firma;

                const blockJson = JSON.stringify(blockCopy);
                const hashToVerify = await crypto.subtle.digest(
                    'SHA-256',
                    new TextEncoder().encode(blockJson + block.hash)
                );
                const hashHex = this.arrayBufferToHex(hashToVerify);
                const isValid = hashHex === signature;

                if (isValid) validBlocksCount++;

                this.currentChain.push({ ...block, isValid });

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${block.nombre || 'Sin nombre'}</td>
                    <td>${block.tipo || 'Desconocido'}</td>
                    <td>${this.formatFileSize(block.tamaño || 0)}</td>
                    <td>${block.fecha ? new Date(block.fecha).toLocaleString() : 'Fecha desconocida'}</td>
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

        // Actualizar UI según bloques válidos
        const downloadAllBtn = document.getElementById('downloadAllBtn');
        if (downloadAllBtn) {
            downloadAllBtn.disabled = validBlocksCount === 0;
        }

        // Configurar eventos de descarga
        document.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const hash = e.target.closest('[data-hash]').getAttribute('data-hash');
                this.downloadFile(hash);
            });
        });

        this.showAlert(`Blockchain cargada con ${validBlocksCount} archivos válidos`, 'success');
    } catch (error) {
        console.error('Error al cargar blockchain:', error);
        this.showAlert(`Error al cargar la blockchain: ${error.message}`, 'danger');
    } finally {
        // Ocultar indicador de carga
        this.showLoadingIndicator(false);
    }
};

// Función auxiliar para mostrar/ocultar carga (debes implementarla)
WalletApp.showLoadingIndicator = function(show) {
    const loader = document.getElementById('loadingIndicator');
    if (loader) {
        loader.style.display = show ? 'block' : 'none';
    }
};

WalletApp.downloadFile = async function (hash) {
    if (!this.wallet?.aesKey || !this.currentChain) {
        this.showAlert('No hay wallet activa o blockchain cargada', 'warning');
        return;
    }

    try {
        // 1. Obtener el bloque de la blockchain
        const block = this.currentChain.find(b => b.hash === hash);
        if (!block) throw new Error('Archivo no encontrado en la blockchain');
        if (!block.isValid) {
            this.showAlert('No se puede descargar un archivo con firma inválida', 'warning');
            return;
        }

        // 2. Validación exhaustiva del IV
        if (!block.iv || typeof block.iv !== 'string' || block.iv.length !== 24 || !/^[0-9a-f]+$/i.test(block.iv)) {
            throw new Error(`IV inválido o mal formado: ${block.iv}`);
        }

        // 3. Conversión del IV a Uint8Array
        const iv = new Uint8Array(
            block.iv.match(/../g).map(h => {
                const byte = parseInt(h, 16);
                if (isNaN(byte)) throw new Error(`Byte inválido en IV: ${h}`);
                return byte;
            })
        );

        // 4. Verificación profunda de la clave AES
        if (!this.wallet.aesKey || 
            this.wallet.aesKey.algorithm.name !== 'AES-GCM' || 
            this.wallet.aesKey.algorithm.length !== 256 ||
            this.wallet.aesKey.type !== 'secret') {
            
            console.error('Clave AES inválida:', this.wallet.aesKey);
            throw new Error('La clave AES no es válida para descifrado AES-GCM-256');
        }

        // 5. Descarga del contenido cifrado con verificación
        const response = await fetch(`backend/descargar.php?action=file&walletId=${this.wallet.walletId}&hash=${hash}`);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error en el servidor: ${response.status} - ${errorText}`);
        }

        const encryptedContent = await response.arrayBuffer();
        if (!encryptedContent || encryptedContent.byteLength < 16) { // Mínimo para AES-GCM
            throw new Error(`Contenido cifrado inválido (tamaño: ${encryptedContent.byteLength} bytes)`);
        }

        // 6. Descifrado con manejo de errores mejorado
        let decryptedContent;
        try {
            decryptedContent = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv,
                    additionalData: new Uint8Array(0), // Necesario en algunas implementaciones
                    tagLength: 128 // Debe coincidir con el cifrado
                },
                this.wallet.aesKey,
                encryptedContent
            );
        } catch (e) {
            console.error('Detalles técnicos del error:', {
                error: e,
                errorName: e.name,
                errorMessage: e.message,
                iv: Array.from(iv),
                keyAlgorithm: this.wallet.aesKey.algorithm,
                encryptedSize: encryptedContent.byteLength,
                blockMetadata: {
                    nombre: block.nombre,
                    tamaño: block.tamaño,
                    tipo: block.tipo,
                    fecha: block.fecha
                }
            });
            
            throw new Error(`Fallo técnico de descifrado (${e.name}). Por favor contacte al soporte con estos detalles.`);
        }

        // 7. Verificación del resultado descifrado
        if (!decryptedContent || decryptedContent.byteLength === 0) {
            throw new Error('El contenido descifrado está vacío');
        }

        // 8. Creación y descarga del archivo
        const blob = new Blob([decryptedContent], { type: block.tipo || 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = block.nombre || `documento_${hash.substring(0, 8)}`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);

        this.showAlert(`Archivo "${block.nombre}" descargado correctamente`, 'success');
    } catch (error) {
        console.error('Error completo en la descarga:', {
            timestamp: new Date().toISOString(),
            walletId: this.wallet?.walletId,
            errorDetails: {
                name: error.name,
                message: error.message,
                stack: error.stack
            },
            systemInfo: {
                userAgent: navigator.userAgent,
                platform: navigator.platform
            }
        });

        let userMessage = 'Error al descargar el archivo. ';
        if (error.message.includes('OperationError')) {
            userMessage += 'Posibles causas:\n';
            userMessage += '1. La clave de descifrado no coincide\n';
            userMessage += '2. El archivo fue cifrado con parámetros diferentes\n';
            userMessage += '3. Los datos están corruptos';
        } else {
            userMessage += error.message;
        }

        this.showAlert(userMessage, 'danger');
    }
};

WalletApp.downloadAllValidAsZip = async function () {
    if (!this.wallet?.aesKey || !this.currentChain) {
        this.showAlert('No hay wallet activa o blockchain cargada', 'warning');
        return;
    }

    const validBlocks = this.currentChain.filter(b => b.isValid);
    if (validBlocks.length === 0) {
        this.showAlert('No hay archivos válidos para descargar', 'warning');
        return;
    }

    try {
        const zip = new JSZip();
        const folder = zip.folder(`wallet_${this.wallet.walletId.substring(0, 8)}`);

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
            const bar = progressDiv.querySelector('.progress-bar');
            const label = progressDiv.querySelector('.progress-percentage');
            bar.style.width = `${percent}%`;
            label.textContent = `${percent}%`;
        };

        updateProgress(5);

        for (let i = 0; i < validBlocks.length; i++) {
            const block = validBlocks[i];
            try {
                const response = await fetch(`backend/descargar.php?action=file&walletId=${this.wallet.walletId}&hash=${block.hash}`);
                if (!response.ok) continue;

                const encryptedContent = await response.arrayBuffer();
                const iv = new Uint8Array(block.iv.match(/../g).map(h => parseInt(h, 16)));

                let decryptedContent;
                try {
                    decryptedContent = await crypto.subtle.decrypt(
                        { name: 'AES-GCM', iv: iv },
                        this.wallet.aesKey,
                        encryptedContent
                    );
                } catch (e) {
                    console.error(`Error al descifrar ${block.nombre}:`, e);
                    continue;
                }
                
                folder.file(block.nombre, decryptedContent);
                updateProgress(5 + ((i + 1) * 90 / validBlocks.length));
            } catch (e) {
                console.error(`Error al procesar ${block.nombre}:`, e);
            }
        }

        updateProgress(95);
        const zipBlob = await zip.generateAsync({ type: 'blob' }, (meta) => {
            updateProgress(95 + meta.percent * 0.05);
        });

        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wallet_${this.wallet.walletId.substring(0, 8)}_docs.zip`;
        a.click();
        URL.revokeObjectURL(url);

        updateProgress(100);
        progressDiv.querySelector('.progress-bar').classList.add('bg-success');
        this.showAlert(`ZIP con ${validBlocks.length} archivos descargado con éxito`, 'success');
    } catch (error) {
        this.showAlert('Error al generar el ZIP: ' + error.message, 'danger');
        console.error(error);
    }
};

WalletApp.filterValidDocuments = function () {
    const showOnlyValid = document.getElementById('showOnlyValid').checked;
    document.querySelectorAll('#documentsTableBody tr').forEach(row => {
        const isValid = row.querySelector('.signature-valid') !== null;
        row.style.display = (showOnlyValid && !isValid) ? 'none' : '';
    });
};

// Función auxiliar para convertir ArrayBuffer a hexadecimal
WalletApp.arrayBufferToHex = function (buffer) {
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
};

// Función auxiliar para formatear tamaño de archivo
WalletApp.formatFileSize = function (bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};