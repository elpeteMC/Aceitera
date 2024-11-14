const mysql = require('mysql2');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Conexión a la base de datos MySQL en Railway
const db = mysql.createConnection({
    host: 'tu-host-en-railway',
    user: 'tu-usuario',
    password: 'tu-contraseña',
    database: 'tu-base-de-datos',
    port: 'tu-puerto'
});

db.connect((err) => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err);
    } else {
        console.log('Conectado a la base de datos en Railway');
    }
});

// Ejemplo de ruta para verificar conexión
app.get('/productos', (req, res) => {
    db.query('SELECT * FROM productos', (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error al obtener productos' });
        }
        res.json(results);
    });
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
