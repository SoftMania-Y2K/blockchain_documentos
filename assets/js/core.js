// core.js
const WalletApp = {
    usuarioDatos: null,
    wallet: null,
    cryptoKey: null,
    currentChain: null,

    init: function () {
        if (this.bindEvents) this.bindEvents(); // Solo si está definido
    },

    // Helper: Convertir ArrayBuffer a hex string
    arrayBufferToHex: function (buffer) {
        return Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    },

    // Helper: Leer archivo como ArrayBuffer
    readFileAsArrayBuffer: function (file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    },

    // Helper: Leer archivo como texto
    readFileAsText: function (file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    },

    // Helper: Formatear tamaño de archivo
    formatFileSize: function (bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
};
