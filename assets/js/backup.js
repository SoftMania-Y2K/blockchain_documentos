// backup.js
WalletApp.downloadBackup = async function () {
    if (!this.wallet?.walletId) {
        this.showAlert('No hay wallet activa para descargar backup', 'warning');
        return;
    }

    try {
        const [chainRes, blobRes] = await Promise.all([
            fetch(`backend/descargar.php?action=chain&walletId=${this.wallet.walletId}`),
            fetch(`backend/descargar.php?action=blob&walletId=${this.wallet.walletId}`)
        ]);

        if (!chainRes.ok) throw new Error(`Error al descargar blockchain: ${chainRes.statusText}`);
        if (!blobRes.ok) throw new Error(`Error al descargar blob: ${blobRes.statusText}`);

        const chainText = await chainRes.text();
        const blobContent = await blobRes.blob();

        const zip = new JSZip();
        zip.file(`wallet_${this.wallet.walletId}.chain`, chainText);
        zip.file(`wallet_${this.wallet.walletId}.blob`, blobContent);

        const zipContent = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipContent);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wallet_${this.wallet.walletId}_backup.zip`;
        a.click();
        URL.revokeObjectURL(url);

        this.showAlert('Backup descargado con éxito', 'success');
    } catch (error) {
        this.showAlert('Error al descargar backup: ' + error.message, 'danger');
        console.error(error);
    }
};

WalletApp.uploadBackup = async function () {
    if (!this.wallet?.walletId) {
        this.showAlert('No hay wallet activa para subir backup', 'warning');
        return;
    }

    const blobFile = document.getElementById('backupBlobFile')?.files[0];
    const chainFile = document.getElementById('backupChainFile')?.files[0];

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

        if (!response.ok) throw new Error(`Error en el servidor: ${response.statusText}`);
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
};
