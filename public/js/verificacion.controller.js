    document.addEventListener('DOMContentLoaded', () => {
        const params = new URLSearchParams(window.location.search);
        const correo = params.get('correo');
        const reenviarBtn = document.getElementById('reenviarCorreo');
        const temporizadorSpan = document.getElementById('temporizador');
        const mensajeExitoDiv = document.getElementById('mensaje-exito');

        if (correo) {
            document.getElementById('correo').textContent = correo;
        }

        let tiempoRestante = 5 * 60 ; // 10 minutos
        let temporizadorIntervalo;
        let verificacionIntervalo;

        function actualizarTemporizador() {
            if (tiempoRestante <= 0) {
                temporizadorSpan.textContent = "Token expirado. Puedes reenviar el correo.";
                reenviarBtn.style.display = 'block';
                clearInterval(temporizadorIntervalo);
                clearInterval(verificacionIntervalo);
                return;
            }

            const minutos = Math.floor(tiempoRestante / 60);
            const segundos = tiempoRestante % 60;
            temporizadorSpan.textContent = `Tu token expira en ${minutos}:${segundos < 10 ? '0' + segundos : segundos}`;
            tiempoRestante--;
        }

        async function verificarEstadoCorreo() {
            if (!correo) return;
            try {
                const response = await fetch(`/verificar-estado-correo?correo=${encodeURIComponent(correo)}`);
                const data = await response.json();

                if (data.estado === 'verificado') {
                    window.location.href = '/login?verificado=true';
                } else if (data.estado === 'expirado') {
                    temporizadorSpan.textContent = "Token expirado. Puedes reenviar el correo.";
                    reenviarBtn.style.display = 'block';
                    clearInterval(verificacionIntervalo);
                    clearInterval(temporizadorIntervalo);
                }
            } catch (error) {
                console.error("Error al verificar estado:", error);
            }
        }

        reenviarBtn.addEventListener('click', async () => {
            try {
                const response = await fetch('/reenviar-verificacion', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ correo })
                });
                const data = await response.json();

                if (data.ok) {
                    mensajeExitoDiv.textContent = data.mensaje;
                    mensajeExitoDiv.style.display = 'block';
                    reenviarBtn.style.display = 'none';

                    tiempoRestante = 10 * 60;
                    actualizarTemporizador();
                    temporizadorIntervalo = setInterval(actualizarTemporizador, 1000);
                    verificacionIntervalo = setInterval(verificarEstadoCorreo, 10000);
                } else {
                    alert(`Error: ${data.mensaje}`);
                }
            } catch (error) {
                console.error("Error al reenviar correo:", error);
                alert("Error al reenviar correo. Inténtalo de nuevo más tarde.");
            }
        });

        actualizarTemporizador();
        temporizadorIntervalo = setInterval(actualizarTemporizador, 1000);
        verificacionIntervalo = setInterval(verificarEstadoCorreo, 10000);
    });