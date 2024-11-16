const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: 'https://aceitera.onrender.com',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use(bodyParser.json());
app.use(express.static('public'));

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Faltan configuraciones de SUPABASE_URL o SUPABASE_KEY.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// **Rutas**
// Obtener productos
app.get('/productos', async (req, res) => {
    try {
        const { data, error } = await supabase.from('productos').select('*');
        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Error al obtener productos:', err.message);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

// Registrar venta
app.post('/ventas', async (req, res) => {
    console.log('Datos recibidos:', req.body);
    const { productoId, cantidad_vendida } = req.body;

    // Validación inicial de datos
    if (!productoId || isNaN(cantidad_vendida) || cantidad_vendida <= 0) {
        return res.status(400).json({ error: 'Datos inválidos. Verifica el producto y la cantidad.' });
    }

    try {
        // Verificar existencia del producto y su inventario
        const { data: producto, error: productoError } = await supabase
            .from('productos')
            .select('id, cantidad, precio')
            .eq('id', productoId)
            .single();

        if (productoError || !producto) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
 if (producto.cantidad < cantidad_vendida) {
            return res.status(400).json({ error: 'No hay suficiente inventario para completar la venta.' });
        }

        // Registrar la venta
        const { data: venta, error: ventaError } = await supabase
            .from('ventas')
            .insert([{ productoId, cantidad_vendida }]);

        if (ventaError) throw ventaError;

        // Actualizar el inventario del producto
        const { error: updateError } = await supabase
            .from('productos')
            .update({ cantidad: producto.cantidad - cantidad_vendida })
            .eq('id', productoId);

        if (updateError) throw updateError;

        res.status(201).json({ message: 'Venta registrada exitosamente', venta });
    } catch (err) {
        console.error('Error al registrar la venta:', err.message);
        res.status(500).json({ error: 'Error al registrar la venta.' });
    }
    
});
// Obtener ventas
app.get('/ventas', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('ventas')
            .select(`
                id,
                cantidad_vendida,
                fecha,
                productoId:productos (
                    nombre,
                    precio
                )
            `);

        if (error) throw error;

        const ventas = data.map(venta => ({
            id: venta.id,
            cantidad_vendida: venta.cantidad_vendida,
            fecha: venta.fecha,
            productoNombre: venta.productoId.nombre,
            precio: venta.productoId.precio
        }));

        res.json(ventas);
    } catch (err) {
        console.error('Error al obtener ventas:', err.message);
        res.status(500).json({ error: 'Error al obtener ventas.' });
    }
});