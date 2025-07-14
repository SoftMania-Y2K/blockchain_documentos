// events.js
WalletApp.bindEvents = function () {
    // Login
    document.getElementById('loginForm')?.addEventListener('submit', this.handleLogin.bind(this));

    // Wallet
    document.getElementById('generateWalletBtn')?.addEventListener('click', this.generateWallet.bind(this));
    document.getElementById('loadWalletBtn')?.addEventListener('click', this.loadWalletFromFile.bind(this));
    document.getElementById('downloadKeyBtn')?.addEventListener('click', this.downloadWalletKey.bind(this));

    // Subir archivos
    document.getElementById('documentFiles')?.addEventListener('change', this.handleFileSelection.bind(this));
    document.getElementById('uploadFilesBtn')?.addEventListener('click', this.uploadFiles.bind(this));

    // Ver archivos
    document.getElementById('loadChainBtn')?.addEventListener('click', this.loadBlockchain.bind(this));
    document.getElementById('downloadAllBtn')?.addEventListener('click', this.downloadAllValidAsZip.bind(this));
    document.getElementById('showOnlyValid')?.addEventListener('change', this.filterValidDocuments.bind(this));

    // Sincronización
    document.getElementById('downloadBackupBtn')?.addEventListener('click', this.downloadBackup.bind(this));
    document.getElementById('uploadBackupBtn')?.addEventListener('click', this.uploadBackup.bind(this));

    // Certificados
    document.getElementById('generateCertBtn')?.addEventListener('click', this.handleGenerateCert.bind(this));
    document.getElementById('validateCertBtn')?.addEventListener('click', this.handleValidateCert.bind(this));
};
