const express = require('express');
const router = express.Router();

router.get("/minijuegos", (req, res) => {
    res.render("minijuego", {
        title: "Minijuegos",
        user: req.session.user || null
    });
});

router.get('/crucigrama', (req, res) => {
  const crucigramas = [
    {
      id: 1,
      grid: [
        [ { number: 1 }, { letter: null }, { letter: null }, { letter: null }, { letter: null }, { letter: null } ],
        [ { letter: null }, { letter: null }, { number: 2 }, { letter: null }, { letter: null }, { letter: null } ],
        [ { letter: null }, { letter: null }, { letter: null }, { letter: null }, { letter: null }, { letter: null } ],
        [ { letter: null }, { letter: null }, { letter: null }, { letter: null }, { letter: null }, { letter: null } ]
      ],
      clues: [
        { direction: 'across', number: 1, clue: 'Estrella que da luz y calor', answer: 'SOL' },
        { direction: 'down', number: 2, clue: 'Lugar donde compras productos', answer: 'TIENDA' }
      ],
      answers: {
        1: "SOL",
        2: "TIENDA"
      },
      positions: {
        1: [ {row:0, col:0}, {row:0, col:1}, {row:0, col:2} ],
        2: [ {row:0, col:2}, {row:1, col:2}, {row:2, col:2}, {row:3, col:2}, {row:4, col:2}, {row:5, col:2} ]
      }
    },

    {
      id: 2,
      grid: [
        [ { number: 1 }, { letter: null }, { letter: null }, { number: 3 }, { letter: null }, { letter: null } ],
        [ { letter: null }, { letter: null }, { letter: null }, { letter: null }, { letter: null }, { letter: null } ],
        [ { number: 2 }, { letter: null }, { letter: null }, {letter: null }, {letter: null }, {letter: null } ],
        [ { letter: null }, { letter: null }, { letter: null }, { letter: null }, {letter: null }, {letter: null } ],
        [ { letter: null }, { letter: null }, { letter: null }, {letter: null }, {letter: null }, {letter: null } ],
        [ { letter: null }, { letter: null }, { letter: null }, { letter:null }, {letter: null }, {letter: null } ]
      ],
      clues: [
        { direction: 'across', number: 1, clue: 'Comida italiana famosa', answer: 'PIZZA' },
        { direction: 'down', number: 2, clue: 'Animal que ladra', answer: 'PERRO' },
        { direction: 'down', number: 3, clue: 'Lo que haces con los ojos', answer: 'VER' }
      ],
      answers: {
        1: "PIZZA",
        2: "PERRO",
        3: "VER"
      },
      positions: {
        1: [ {row:0, col:0}, {row:0, col:1}, {row:0, col:2}, {row:0, col:3}, {row:0, col:4} ],
        2: [ {row:2, col:0}, {row:3, col:0}, {row:4, col:0}, {row:5, col:0}, {row:6, col:0} ],
        3: [ {row:0, col:3}, {row:1, col:3}, {row:2, col:3} ]
      }
    },

    {
      id: 3,
      grid: [
        [ { number: 1 }, { letter: null }, { letter: null }, { letter: null }, { letter: null }, { letter: null } ],
        [ { letter: null }, { number: 2 }, { letter: null }, { letter: null }, { letter: null }, { letter: null } ],
        [ { letter: null }, { letter: null }, { letter: null }, { letter: null }, { letter: null }, { letter: null } ],
        [ { letter: null }, { letter: null }, { letter: null }, { letter: null }, { letter: null }, { letter: null } ]
      ],
      clues: [
        { direction: 'across', number: 1, clue: 'Lugar donde estudias', answer: 'ESCUELA' },
        { direction: 'down', number: 2, clue: 'Lo que haces con las orejas', answer: 'OIR' }
      ],
      answers: {
        1: "ESCUELA",
        2: "OIR"
      },
      positions: {
        1: [ {row:0, col:0}, {row:0, col:1}, {row:0, col:2}, {row:0, col:3}, {row:0, col:4}, {row:0, col:5}, {row:0, col:6} ],
        2: [ {row:0, col:1}, {row:1, col:1}, {row:2, col:1} ]
      }
    },

    {
      id: 4,
      grid: [
        [ { number: 1 }, { letter: null }, { letter: null }, { letter: null }, { letter: null }, { letter: null } ],
        [ { letter: null }, { letter: null }, { letter: null }, { number: 2 }, { letter: null }, { letter: null } ],
        [ { letter: null }, { letter: null }, { letter: null }, { letter: null }, { letter: null }, { letter: null } ],
        [ { letter: null }, { letter: null }, { letter: null }, { letter: null }, { letter: null }, { letter: null } ]
      ],
      clues: [
        { direction: 'across', number: 1, clue: 'Animal que canta en la mañana', answer: 'GALLINA' },
        { direction: 'down', number: 2, clue: 'Sonido de la lluvia', answer: 'PLOP' }
      ],
      answers: {
        1: "GALLINA",
        2: "PLOP"
      },
      positions: {
        1: [ {row:0, col:0}, {row:0, col:1}, {row:0, col:2}, {row:0, col:3}, {row:0, col:4}, {row:0, col:5}, {row:0, col:6} ],
        2: [ {row:0, col:3}, {row:1, col:3}, {row:2, col:3}, {row:3, col:3} ]
      }
    }
  ];

  res.render('crucigrama', { crucigramas });



});

module.exports = router;
