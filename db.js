const sqlite3 = require('sqlite3').verbose();

// Conectar a la base de datos (se creará automáticamente si no existe)
const db = new sqlite3.Database('./aceitera.db', (err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err.message);
  } else {
    console.log('Conectado a la base de datos de SQLite.');
  }
});

// Crear la tabla productos con todas las columnas necesarias
db.run(`
  CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT,
    nombre TEXT NOT NULL,
    precio REAL NOT NULL,
    cantidad INTEGER,
    categoria TEXT
  )
`);

// Crear la tabla ventas con la clave foránea de producto_id
db.run(`
  CREATE TABLE IF NOT EXISTS ventas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_id INTEGER NOT NULL,
    cantidad_vendida INTEGER NOT NULL,
    fecha TEXT NOT NULL,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
  )
`);

module.exports = db;
