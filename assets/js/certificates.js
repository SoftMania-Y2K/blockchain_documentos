// certificates.js
WalletApp.generatePKICertificate = async function (privateKey, password) {
    try {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');

        const certInfo = {
            version: "1.0",
            walletId: this.wallet.walletId,
            userData: this.usuarioDatos,
            issuedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            salt: saltHex
        };

        const hmacKey = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(password + saltHex),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );

        const signature = await crypto.subtle.sign(
            'HMAC',
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
};

WalletApp.validateCertificate = async function (certData, password) {
    try {
        const hmacKey = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(password + certData.info.salt),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );

        const isValid = await crypto.subtle.verify(
            'HMAC',
            hmacKey,
            new Uint8Array(certData.signature.match(/../g).map(h => parseInt(h, 16))),
            new TextEncoder().encode(JSON.stringify(certData.info))
        );

        const isExpired = new Date(certData.info.expiresAt) < new Date();
        return isValid && !isExpired;
    } catch (error) {
        console.error("Error en validateCertificate:", error);
        return false;
    }
};

WalletApp.handleGenerateCert = async function () {
    const privateKeyFile = document.getElementById('privateKeyFile')?.files[0];
    const password = document.getElementById('certPassword')?.value;

    if (!privateKeyFile || password.length < 6) {
        this.showAlert("Se requiere clave privada y password (6+ caracteres)", "warning");
        return;
    }

    try {
        const privateKey = await this.readFileAsArrayBuffer(privateKeyFile);
        const cert = await this.generatePKICertificate(new Uint8Array(privateKey), password);

        const blob = new Blob([JSON.stringify(cert, null, 2)], { type: 'application/json' });
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
};

WalletApp.handleValidateCert = async function () {
    const certFile = document.getElementById('certificateFile')?.files[0];
    const password = document.getElementById('certValidatePassword')?.value;

    if (!certFile || !password) {
        this.showAlert("Se requiere certificado y password", "warning");
        return;
    }

    try {
        const certData = JSON.parse(await this.readFileAsText(certFile));
        const isValid = await this.validateCertificate(certData, password);

        const resultDiv = document.getElementById('certResult');
        resultDiv.innerHTML = isValid
            ? `<div class="alert alert-success">✅ Certificado válido</div>`
            : `<div class="alert alert-danger">⚠️ Certificado inválido o expirado</div>`;

        if (isValid) {
            window.activeCertificate = certData;
        }
    } catch (error) {
        this.showAlert("Error: " + error.message, "danger");
    }
};
