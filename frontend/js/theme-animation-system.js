// ========================================
// SISTEMA DE ANIMACIONES CON TEMAS
// Guarda este archivo en: /public/js/theme-animation-system.js
// ========================================

class ThemeAnimationManager {
  constructor(animationId, config) {
    this.animationElement = document.getElementById(animationId);
    this.config = config;
    this.currentTheme = this.getCurrentTheme();
    this.timeline = null;
    this.preloadedImages = [];
    
    if (!this.animationElement) {
      console.error(`No se encontró #${animationId}`);
      return;
    }
    
    this.init();
  }

  getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }


  getThemeConfig() {
    return this.config[this.currentTheme];
  }

  getFramePath(frameNumber) {
    const themeConfig = this.getThemeConfig();
    const paddedNumber = String(frameNumber).padStart(themeConfig.padding, '0');
    return `${themeConfig.path}${paddedNumber}${themeConfig.extension}`;
  }

  // 🆕 ACTUALIZAR IMAGEN INICIAL según tema
  updateInitialFrame() {
    const themeConfig = this.getThemeConfig();
    const initialFramePath = this.getFramePath(themeConfig.startFrame);
    this.animationElement.src = initialFramePath;
    console.log(`🖼️ Imagen inicial actualizada: ${initialFramePath}`);
  }

  preloadImages(callback) {
    const themeConfig = this.getThemeConfig();
    const { startFrame, endFrame, step } = themeConfig;
    
    const framesToLoad = [];
    for (let i = startFrame; i <= endFrame; i += step) {
      framesToLoad.push(i);
    }

    let loadedCount = 0;
    const totalFrames = framesToLoad.length;

    this.preloadedImages = [];

    framesToLoad.forEach(frameNumber => {
      const img = new Image();
      img.src = this.getFramePath(frameNumber);
      
      img.onload = () => {
        loadedCount++;
        if (loadedCount === totalFrames) {
          console.log(`✅ ${totalFrames} frames cargados (tema: ${this.currentTheme})`);
          callback();
        }
      };
      
      img.onerror = () => {
        console.error(`❌ Error: ${this.getFramePath(frameNumber)}`);
        loadedCount++;
        if (loadedCount === totalFrames) callback();
      };
      
      this.preloadedImages.push(img);
    });
  }

  createTimeline() {
    const themeConfig = this.getThemeConfig();
    const { startFrame, endFrame, step } = themeConfig;
    const totalFrames = Math.floor((endFrame - startFrame) / step) + 1;

    if (this.timeline) {
      this.timeline.kill();
    }

    this.timeline = gsap.timeline({ paused: true });

    this.timeline.to(this.animationElement, {
      duration: totalFrames / 15,
      ease: "none",
      onUpdate: () => {
        const progress = this.timeline.progress();
        const frameIndex = Math.min(
          Math.floor(progress * (totalFrames - 1)), 
          totalFrames - 1
        );
        const currentFrame = startFrame + frameIndex * step;
        this.animationElement.src = this.getFramePath(currentFrame);
      }
    });
  }

  setupEventListeners() {
    // Hover para reproducir
    this.animationElement.addEventListener('mouseenter', () => {
      this.timeline.restart();
    });

    // 🆕 Al salir del hover, volver al frame inicial del tema actual
    this.animationElement.addEventListener('mouseleave', () => {
      setTimeout(() => {
        if (this.timeline.progress() === 1) {
          this.updateInitialFrame();
        }
      }, 100);
    });

    // Escuchar cambios de tema
    this.observeThemeChanges();
  }

  observeThemeChanges() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          const newTheme = this.getCurrentTheme();
          if (newTheme !== this.currentTheme) {
            console.log(`🎨 Cambio de tema detectado: ${this.currentTheme} → ${newTheme}`);
            this.currentTheme = newTheme;
            this.reload();
          }
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
  }

  reload() {
    console.log('🔄 Recargando animación...');
    
    // 🆕 CAMBIAR IMAGEN INMEDIATAMENTE
    this.updateInitialFrame();
    
    // Luego precargar los nuevos frames
    this.preloadImages(() => {
      this.createTimeline();
      console.log('✨ Animación lista con nuevo tema');
    });
  }

  init() {
    // 🆕 Establecer imagen inicial correcta desde el principio
    this.updateInitialFrame();
    
    this.preloadImages(() => {
      this.createTimeline();
      this.setupEventListeners();
      console.log(`🎬 Animación inicializada (tema: ${this.currentTheme})`);
    });
  }
}

// ========================================
// CONFIGURACIONES POR ANIMACIÓN
// ========================================

// Animación 1: Exámenes (stuart_octavio_libro)
const animacion1Config = {
  light: {
    path: '/media/stuart_octavio_libro/stuart_octavio_libro_',
    extension: '.webp',
    startFrame: 1,
    endFrame: 141,
    step: 2,
    padding: 6 // stuart_octavio_libro_000001
  },
  dark: {
    path: '/media/stuart_octavio_libro/frame-',
    extension: '.webp',
    startFrame: 1,
    endFrame: 240,
    step: 2,
    padding: 0 // frame-1
  }
};

// Animación 2: Minijuegos (video_stuart_octavio)
const animacion2Config = {
  light: {
    path: '/media/video_stuart_octavio/video_stuart_octavio_',
    extension: '.webp',
    startFrame: 1,
    endFrame: 189,
    step: 2,
    padding: 6
  },
  dark: {
    path: '/media/video_stuart_octavio/frame-',
    extension: '.webp',
    startFrame: 1,
    endFrame: 150,
    step: 2,
    padding: 0
  }
};

// Animación 3: Datos (caminando_stuart_octavio)
const animacion3Config = {
  light: {
    path: '/media/caminando_stuart_octavio/caminando_stuart_octavio_',
    extension: '.webp',
    startFrame: 0,
    endFrame: 71,
    step: 2,
    padding: 3
  },
  dark: {
    path: '/media/caminando_stuart_octavio/frame-',
    extension: '.webp',
    startFrame: 1,
    endFrame: 150,
    step: 2,
    padding: 0
  }
};

// Animación 5: Simulador (video_admision_000)
const animacion5Config = {
  light: {
    path: '/media/video_admision_000/video_admision_',
    extension: '.webp',
    startFrame: 0,
    endFrame: 66,
    step: 1,
    padding: 3
  },
  dark: {
    path: '/media/video_admision_000/frame-',
    extension: '.webp',
    startFrame: 1,
    endFrame: 300,
    step: 2,
    padding: 0
  }
};

// Animación 6: Competitivo
const animacion6Config = {
  light: {
    path: '/media/animacion-competitivo/animacion-competitivo_',
    extension: '.webp',
    startFrame: 1,
    endFrame: 188,
    step: 2,
    padding: 6
  },
  dark: {
    path: '/media/animacion-competitivo/animacion-competitivo_',
    extension: '.webp',
    startFrame: 1,
    endFrame: 188,
    step: 2,
    padding: 6
  }
};

// Animación 7: Clasificación
const animacion7Config = {
  light: {
    path: '/media/video_clasifica/video_clasifica_',
    extension: '.webp',
    startFrame: 1,
    endFrame: 189,
    step: 2,
    padding: 6
  },
  dark: {
    path: '/media/video_clasifica/frame-',
    extension: '.webp',
    startFrame: 8,
    endFrame: 150,
    step: 2,
    padding: 0
  }
};

// ========================================
// INICIALIZACIÓN AUTOMÁTICA
// ========================================

document.addEventListener('DOMContentLoaded', function() {
  // Inicializar todas las animaciones que existan en la página
  const animations = [
    { id: 'duolingoAnimation', config: animacion1Config },
    { id: 'duolingoAnimation2', config: animacion2Config },
    { id: 'duolingoAnimation3', config: animacion3Config },
    { id: 'duolingoAnimation5', config: animacion5Config },
    { id: 'duolingoAnimation6', config: animacion6Config },
    { id: 'duolingoAnimation7', config: animacion7Config }
  ];

  animations.forEach(({ id, config }) => {
    if (document.getElementById(id)) {
      new ThemeAnimationManager(id, config);
    }
  });

  console.log('🎨 Sistema de animaciones por tema inicializado');
});