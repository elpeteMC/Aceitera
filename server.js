const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: 'https://aceitera.netlify.app', // Asegúrate de que este es el dominio correcto del frontend
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use(bodyParser.json());
app.use(express.static('public'));

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Faltan configuraciones de SUPABASE_URL o SUPABASE_KEY. Verifica tus variables de entorno.');
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

// Agregar productos
app.post('/productos', async (req, res) => {
    const { nombre, precio, cantidad, descripcion } = req.body;
    try {
        const { data, error } = await supabase
            .from('productos')
            .insert([{ nombre, precio, cantidad, descripcion }]);
        if (error) throw error;
        res.status(201).json({ message: 'Producto agregado', producto: data });
    } catch (err) {
        console.error('Error al agregar producto:', err.message);
        res.status(500).json({ error: 'Error al agregar producto' });
    }
});

// Eliminar producto
app.delete('/productos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase.from('productos').delete().eq('id', id);
        if (error) throw error;
        res.status(200).json({ message: 'Producto eliminado' });
    } catch (err) {
        console.error('Error al eliminar producto:', err.message);
        res.status(500).json({ error: 'Error al eliminar producto' });
    }
});

// Registrar venta
// Registrar venta
app.post('/ventas', async (req, res) => {
    const { productoid, cantidad_vendida } = req.body;

    if (!productoid || isNaN(cantidad_vendida) || cantidad_vendida <= 0) {
        return res.status(400).json({ error: 'Datos inválidos. Verifica el producto y la cantidad.' });
    }

    try {
        // Verificar existencia y cantidad del producto
        const { data: producto, error: productError } = await supabase
            .from('productos')
            .select('cantidad') // Debes usar "cantidad" porque es la columna del inventario
            .eq('id', productoid)
            .single();

        if (productError || !producto) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        if (producto.cantidad < cantidad_vendida) {
            return res.status(400).json({ error: 'Cantidad insuficiente en inventario' });
        }

        // Actualizar inventario
        const nuevaCantidad = producto.cantidad - cantidad_vendida;
        const { error: updateError } = await supabase
            .from('productos')
            .update({ cantidad: nuevaCantidad })
            .eq('id', productoid);

        if (updateError) {
            throw updateError;
        }

        // Registrar la venta
        const { data: venta, error: ventaError } = await supabase
            .from('ventas')
            .insert([{ productoid, cantidad_vendida, fecha: new Date().toISOString() }]);

        if (ventaError) {
            throw ventaError;
        }

        res.status(201).json({ message: 'Venta registrada correctamente', venta });
    } catch (err) {
        console.error('Error al registrar venta:', err.message);
        res.status(500).json({ error: 'Error al registrar venta' });
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
                productoid (
                    nombre,
                    precio
                )
            `);
        if (error) throw error;

        // Procesar ventas para simplificar la estructura de respuesta
        const ventas = data.map(venta => ({
            id: venta.id,
            cantidad_vendida: venta.cantidad_vendida,
            fecha: venta.fecha,
            productoNombre: venta.productoid.nombre,
            precio: venta.productoid.precio
        }));

        res.json(ventas);
    } catch (err) {
        console.error('Error al obtener ventas:', err.message);
        res.status(500).json({ error: 'Error al obtener ventas' });
    }
});


// Página de inicio
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
