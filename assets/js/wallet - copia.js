// wallet.js
WalletApp.generateWallet = async function () {
    try {
        const privateKey = window.crypto.getRandomValues(new Uint8Array(32));
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', privateKey);
        const walletId = this.arrayBufferToHex(hashBuffer);

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

        this.wallet = {
            privateKey: privateKey,
            walletId: walletId,
            aesKey: aesKey
        };

        document.getElementById('walletIdDisplay').textContent = walletId;
        document.getElementById('walletInfoContainer').style.display = 'block';

        this.showAlert('Wallet generada con éxito. Guarda tu clave privada (.key) en un lugar seguro.', 'success');
    } catch (error) {
        this.showAlert('Error al generar la wallet: ' + error.message, 'danger');
        console.error(error);
    }
};

WalletApp.loadWalletFromFile = async function () {
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

        const hashBuffer = await window.crypto.subtle.digest('SHA-256', privateKey);
        const walletId = this.arrayBufferToHex(hashBuffer);

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

        this.wallet = {
            privateKey: privateKey,
            walletId: walletId,
            aesKey: aesKey
        };

        document.getElementById('walletIdDisplay').textContent = walletId;
        document.getElementById('walletInfoContainer').style.display = 'block';

        this.showAlert('Wallet cargada con éxito.', 'success');
    } catch (error) {
        this.showAlert('Error al cargar la wallet: ' + error.message, 'danger');
        console.error(error);
    }
};

WalletApp.downloadWalletKey = function () {
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
};
