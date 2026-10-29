// backend/server.js
const express = require('express');
const cors = require('cors');
const { OAuth2Client } = require('google-auth-library');
// const pool = require('./db'); // Conexión a tu base de datos (PostgreSQL/MySQL)

const app = express();
app.use(cors());
app.use(express.json());

const apuestasJ3 = []; // temporal: sustituir por la base de datos

const CLIENT_ID = "TU_CLIENT_ID_REAL.apps.googleusercontent.com";
const client = new OAuth2Client(CLIENT_ID);

// 1. Endpoint de Autenticación con Google
app.post('/api/auth/google', async (req, res) => {
    try {
        const { token } = req.body;
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID,
        });
        const payload = ticket.getPayload();
        
        const { sub: google_id, name: nombre, email, picture: avatar } = payload;

        // Lógica de Base de Datos: Buscar o insertar el usuario
        // let usuario = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        // Si no existe, se inserta en la tabla `usuarios`.

        res.json({ success: true, mensaje: "Autenticado con éxito", usuario: { nombre, email, avatar } });
    } catch (error) {
        res.status(401).json({ success: false, error: "Token inválido" });
    }
});

// 2. Endpoint para Obtener las Apuestas de la Jornada 3
app.get('/api/apuestas/jornada/3', async (req, res) => {
    try {
        // const apuestas = await pool.query('SELECT a.*, u.nombre, u.avatar FROM apuestas a JOIN usuarios u ON a.usuario_id = u.id WHERE a.jornada = 3');
        // res.json(apuestas.rows);
        res.json(apuestasJ3);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener las apuestas" });
    }
});

// 3. Endpoint para Registrar o Actualizar una Apuesta (Evita duplicados)
app.post('/api/apuestas', async (req, res) => {
    try {
        const { email, nombre, jugador, categoria, prediccion } = req.body;
        if (!email || !jugador || !categoria || !prediccion) {
            return res.status(400).json({ error: "Faltan datos de la apuesta" });
        }
        
        // Validar que el usuario existe, comprobar si ya apostó en la jornada 3 
        // e insertar o actualizar en la tabla `apuestas`.

        // Almacén en memoria mientras no hay base de datos: una apuesta por email
        const i = apuestasJ3.findIndex(a => a.email === email);
        const apuesta = { email, nombre, jugador, categoria, prediccion, jornada: 3 };
        if (i >= 0) apuestasJ3[i] = apuesta; else apuestasJ3.push(apuesta);

        res.json({ success: true, mensaje: "Apuesta guardada correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error al guardar la apuesta" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor de Tinellers FC corriendo en el puerto ${PORT}`);
});