const express = require('express');
const pool = require('./db');
const bcrypt = require('bcrypt');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('InduVision funcionando');
});

app.get('/prueba-db', async (req, res) => {
    try {
        const resultado = await pool.query(
            'SELECT current_database() AS base_actual'
        );

        res.json(resultado.rows[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: 'Error al conectar con PostgreSQL'
        });
    }
});

app.get('/api/maquinas', async (req, res) => {
    try {
        const resultado = await pool.query(
            'SELECT * FROM vw_estado_maquinas ORDER BY id_maquina'
        );

        res.json(resultado.rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: 'Error al obtener las maquinas'
        });
    }
});

app.post('/login', async (req, res) => {
    try {

        const { email, password } = req.body;

        const resultado = await pool.query(
            `SELECT *
             FROM usuario
             WHERE email = $1`,
            [email]
        );

        if (resultado.rows.length === 0) {
            return res.status(401).json({
                mensaje: 'Email o contraseña incorrectos'
            });
        }

        const usuario = resultado.rows[0];

        if (!usuario.activo) {
            return res.status(403).json({
                mensaje: 'Usuario desactivado'
            });
        }

        const passwordCorrecta = await bcrypt.compare(
            password,
            usuario.password_hash
        );

        if (!passwordCorrecta) {
            return res.status(401).json({
                mensaje: 'Email o contraseña incorrectos'
            });
        }

        res.json({
            mensaje: 'Login correcto',
            usuario: {
                id: usuario.id_usuario,
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.rol
            }
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: 'Error interno del servidor'
        });
    }
});

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Servidor InduVision ejecutándose en http://localhost:${PORT}`);
});