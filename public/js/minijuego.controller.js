    const materias = [
      { id_materia: 1, descripcion: "Ahorcado", url: "/ahorcado" },
      { id_materia: 2, descripcion: "Sopa de letras", url: '/sopa'},
      { id_materia: 3, descripcion: "Gato ", url: "/gato" },
      { id_materia: 4, descripcion: "Serpientes y Escaleras", url: "/serpientes_escaleras" }
    ];

    const carousel = document.getElementById('carousel');
    const cardCount = materias.length;
    const theta = 360 / cardCount;
    const radius = 300;
    let currIndex = 0;

    materias.forEach((materia, i) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.textContent = materia.descripcion;
      const angle = theta * i;
      card.style.transform = `rotateY(${angle}deg) translateZ(${radius}px)`;
      card.onclick = () => {
        currIndex = i;
        rotateCarousel();
        setTimeout(() => {
          window.location.href = materias[currIndex].url;
        }, 500);
      };
      carousel.appendChild(card);
    });

    function rotateCarousel() {
      const angle = currIndex * -theta;
      carousel.style.transition = 'transform 1s ease-in-out';
      carousel.style.transform = `translateZ(-${radius}px) rotateY(${angle}deg)`;
    }

    document.getElementById('prevBtn').addEventListener('click', () => {
      currIndex = (currIndex - 1 + cardCount) % cardCount;
      rotateCarousel();
    });

    document.getElementById('nextBtn').addEventListener('click', () => {
      currIndex = (currIndex + 1) % cardCount;
      rotateCarousel();
    });

    document.getElementById('randomBtn').addEventListener('click', () => {
      const randomIndex = Math.floor(Math.random() * cardCount);
      currIndex = randomIndex;
      rotateCarousel();

      setTimeout(() => {
        window.location.href = materias[currIndex].url;
      }, 1000);
    });

    rotateCarousel();