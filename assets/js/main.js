// main.js
document.addEventListener('DOMContentLoaded', () => {
    if (typeof WalletApp !== 'undefined' && WalletApp.init) {
        WalletApp.init();
    } else {
        console.error("WalletApp no está definido o falta init(). Verifica el orden de los scripts.");
    }
});
