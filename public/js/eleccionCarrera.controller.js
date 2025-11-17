document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('careerForm');
    const select = document.getElementById('carrera');
    const submitBtn = document.getElementById('submitBtn');
    const helpText = document.querySelector('.help-text');
    
    // Estado inicial
    updateButtonState();
    
    // Validación en tiempo real
    select.addEventListener('change', function() {
        const isValid = this.value !== '';
        
        updateButtonState();
        updateVisualFeedback(isValid);
        
        if (isValid) {
            triggerSuccessAnimation();
        }
    });
    
    // Validación al enviar
    form.addEventListener('submit', function(e) {
        if (!select.value) {
            e.preventDefault();
            triggerErrorAnimation();
            showHelpText('Por favor, selecciona una carrera antes de continuar');
        }
    });
    
    // Funciones auxiliares
    function updateButtonState() {
        submitBtn.disabled = !select.value;
    }
    
    function updateVisualFeedback(isValid) {
        if (isValid) {
            select.style.borderColor = 'var(--verde-exito)';
            select.style.background = 'linear-gradient(to right, #f8fff8, var(--blanco))';
            hideHelpText();
        } else {
            select.style.borderColor = 'var(--gris-medio)';
            select.style.background = 'var(--blanco)';
        }
    }
    
    function triggerSuccessAnimation() {
        submitBtn.style.animation = 'none';
        setTimeout(() => {
            submitBtn.style.animation = 'pulseGlow 1s ease-in-out';
        }, 10);
    }
    
    function triggerErrorAnimation() {
        select.style.animation = 'none';
        setTimeout(() => {
            select.style.animation = 'shake 0.5s ease-in-out';
            select.style.borderColor = 'var(--rojo-error)';
        }, 10);
    }
    
    function showHelpText(message) {
        helpText.textContent = message;
        helpText.style.display = 'block';
        helpText.style.color = 'var(--rojo-error)';
    }
    
    function hideHelpText() {
        helpText.style.display = 'none';
    }
    
    // Animación de shake para errores
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-8px); }
            75% { transform: translateX(8px); }
        }
    `;
    document.head.appendChild(style);
});

    document.addEventListener('DOMContentLoaded', function() {
    const particlesContainer = document.createElement('div');
    particlesContainer.className = 'aurora-particles';
    document.body.appendChild(particlesContainer);

    for (let i = 0; i < 15; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.width = `${Math.random() * 6 + 2}px`;
        particle.style.height = particle.style.width;
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        particle.style.animationDelay = `${Math.random() * 5}s`;
        particle.style.background = Math.random() > 0.5 ? 'var(--verde-fosforescente)' : 'var(--azul-aurora)';
        particlesContainer.appendChild(particle);
    }
    });
