// login.js
WalletApp.handleLogin = async function (e) {
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

            // Habilitar pestañas (menos login)
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
};
