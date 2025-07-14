// upload.js
WalletApp.handleFileSelection = function (e) {
    const files = e.target.files;
    document.getElementById('uploadFilesBtn').disabled = files.length === 0;
};

WalletApp.uploadFiles = async function () {
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

        const updateProgress = (percent) => {
            const progressBar = progressDiv.querySelector('.progress-bar');
            const progressText = progressDiv.querySelector('.progress-percentage');
            progressBar.style.width = `${percent}%`;
            progressText.textContent = `${percent}%`;
        };

        try {
            updateProgress(5);
            const fileContent = await this.readFileAsArrayBuffer(file);
            updateProgress(10);

            const originalHash = await crypto.subtle.digest('SHA-256', fileContent);
            const originalHashHex = this.arrayBufferToHex(originalHash);
            updateProgress(15);

            const iv = crypto.getRandomValues(new Uint8Array(12));
            updateProgress(20);

            const encryptedContent = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                this.wallet.aesKey,
                fileContent
            );
            updateProgress(60);

            const metadata = {
                nombre: file.name,
                tipo: file.type,
                tamaño: encryptedContent.byteLength,
                iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
                hash: originalHashHex,
                usuario: this.usuarioDatos.usuario,
                dni: this.usuarioDatos.dni,
                email: this.usuarioDatos.email,
                fecha: new Date().toISOString(),
                walletId: this.wallet.walletId
            };

            const metadataJson = JSON.stringify(metadata);
            const metadataHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(metadataJson + originalHashHex));
            metadata.firma = this.arrayBufferToHex(metadataHash);
            updateProgress(80);

            const formData = new FormData();
            formData.append('walletId', this.wallet.walletId);
            formData.append('archivo', new Blob([encryptedContent]), `${originalHashHex}.blob`);
            formData.append('metadata', JSON.stringify(metadata));

            const response = await fetch('backend/subir.php', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error(`Error en el servidor: ${response.statusText}`);

            updateProgress(100);
            progressDiv.querySelector('.progress-bar').classList.add('bg-success');
            this.showAlert(`Archivo "${file.name}" subido con éxito`, 'success');
        } catch (error) {
            progressDiv.querySelector('.progress-bar').classList.add('bg-danger');
            this.showAlert(`Error al subir "${file.name}": ${error.message}`, 'danger');
            console.error(error);
        }
    }
};
