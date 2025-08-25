function generarTableroSopa(palabras, config) {
    const grid = Array.from({length: config.ROWS}, () => 
        Array(config.COLS).fill(""));
    
    // Intentar colocar cada palabra
    palabras.forEach(({word}) => {
        const tries = 300;
        for (let t = 0; t < tries; t++) {
            const direction = directions[Math.floor(Math.random() * directions.length)];
            const startR = Math.floor(Math.random() * config.ROWS);
            const startC = Math.floor(Math.random() * config.COLS);
            
            if (canPlaceWord(grid, word, startR, startC, direction.dr, direction.dc, config)) {
                for (let i = 0; i < word.length; i++) {
                    grid[startR + direction.dr * i][startC + direction.dc * i] = word[i];
                }
                break;
            }
        }
    });

    // Rellenar espacios vacíos
    for (let r = 0; r < config.ROWS; r++) {
        for (let c = 0; c < config.COLS; c++) {
            if (grid[r][c] === "") {
                grid[r][c] = config.ALPHABET[
                    Math.floor(Math.random() * config.ALPHABET.length)
                ];
            }
        }
    }

    return grid;
}

function canPlaceWord(grid, word, r, c, dr, dc, config) {
    for (let i = 0; i < word.length; i++) {
        const rr = r + dr * i;
        const cc = c + dc * i;
        if (rr < 0 || cc < 0 || rr >= config.ROWS || cc >= config.COLS) {
            return false;
        }
        if (grid[rr][cc] !== "" && grid[rr][cc] !== word[i]) {
            return false;
        }
    }
    return true;
}

const directions = [
    { dr: 0, dc: 1 },   // Horizontal →
    { dr: 1, dc: 0 },    // Vertical ↓
    { dr: 1, dc: 1 },    // Diagonal ↘
    { dr: 1, dc: -1 },   // Diagonal ↙
    { dr: 0, dc: -1 },   // Horizontal ←
    { dr: -1, dc: 0 },   // Vertical ↑
    { dr: -1, dc: -1 },  // Diagonal ↖
    { dr: -1, dc: 1 }    // Diagonal ↗
];


// sopa-helper.js
async function seleccionarPalabraAleatoria(pool, idMateria) {
    const [rows] = await pool.query(
        "SELECT palabra, pista FROM palabras WHERE id_materia = ? ORDER BY RAND() LIMIT 1",
        [idMateria]
    );
    return rows[0] || { palabra: "SINPALABRA", pista: "No hay pista" };
}

module.exports = {
    generarTableroSopa,
    canPlaceWord,
    seleccionarPalabraAleatoria,
    directions
};