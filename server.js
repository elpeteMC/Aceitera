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

/**
 * Obtener productos
 */
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

/**
 * Agregar productos
 */
app.post('/productos', async (req, res) => {
    const { 
        nombre, precio_costo, precio_publico, cantidad_existencia, codigo_barras, codigo_producto, marca, numero_factura, proveedor, ganancia 
    } = req.body;

    // Validaciones
    if (!nombre || precio_costo <= 0 || precio_publico <= 0 || cantidad_existencia < 0) {
        return res.status(400).json({ error: 'Datos inválidos. Verifica los campos ingresados.' });
    }

    try {
        // Calcular la ganancia
        const ganancia = precio_publico - precio_costo;

        const { data, error } = await supabase
    .from('productos')
    .insert([{ 
        nombre, precio_costo, precio_publico, cantidad_existencia, codigo_barras, codigo_producto, marca, numero_factura, proveedor, ganancia 
    }])
    .select(); // Asegura que devuelva la fila insertada
    if (error) throw error;

        res.status(201).json({ message: 'Producto agregado', producto: data });
    } catch (err) {
        console.error('Error al agregar producto:', err.message);
        res.status(500).json({ error: 'Error al agregar producto.' });
    }
});

// Obtener productos
app.get('/productos', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('productos')
            .select('*');

        if (error) throw error;

        res.status(200).json(data);
    } catch (err) {
        console.error('Error al obtener productos:', err.message);
        res.status(500).json({ error: 'Error al obtener productos.' });
    }
});



/**
 * Eliminar producto y sus ventas asociadas
 */
app.delete('/productos/:id', async (req, res) => {
    const { id } = req.params;

    try {
        console.log(`Iniciando eliminación del producto con ID: ${id}`);

        // Validar ventas asociadas
        const { data: ventasAsociadas, error: ventasError } = await supabase
            .from('ventas')
            .select('id')
            .eq('productoid', id); // Ajustar 'productoid' si el campo tiene otro nombre

        if (ventasError) {
            console.error('Error al verificar ventas asociadas:', ventasError.message);
            throw ventasError;
        }

        if (ventasAsociadas.length > 0) {
            console.log(`Se encontraron ${ventasAsociadas.length} ventas asociadas al producto con ID ${id}. Eliminándolas...`);

            // Eliminar ventas asociadas al producto
            const { error: ventasDeleteError } = await supabase
                .from('ventas')
                .delete()
                .eq('productoid', id); // Ajustar 'productoid' si es necesario

            if (ventasDeleteError) {
                console.error('Error al eliminar ventas asociadas:', ventasDeleteError.message);
                throw ventasDeleteError;
            }
            console.log('Ventas asociadas eliminadas con éxito.');
        }

        // Eliminar el producto
        console.log(`Eliminando producto con ID: ${id}`);
        const { error: productoDeleteError } = await supabase
            .from('productos')
            .delete()
            .eq('id', id);

        if (productoDeleteError) {
            console.error('Error al eliminar el producto:', productoDeleteError.message);
            throw productoDeleteError;
        }

        console.log(`Producto con ID ${id} eliminado con éxito.`);
        res.status(200).json({ message: 'Producto y ventas asociadas eliminados con éxito.' });
    } catch (err) {
        console.error('Error al eliminar producto o ventas asociadas:', err.message);
        res.status(500).json({
            error: 'No se pudo eliminar el producto o sus ventas asociadas. Verifique los registros.'
        });
    }
});

/**
 * Registrar una nueva venta
 */
app.post('/ventas', async (req, res) => {
    const { productoid, cantidad_vendida } = req.body;

    if (!productoid || isNaN(cantidad_vendida) || cantidad_vendida <= 0) {
        return res.status(400).json({ error: 'Datos inválidos. Verifica el producto y la cantidad.' });
    }

    try {
        // Verificar si el producto existe
        const { data: producto, error: productError } = await supabase
            .from('productos')
            .select('id, cantidad_existencia, precio_publico, ganancia')
            .eq('id', productoid)
            .single();

        if (productError || !producto) {
            return res.status(404).json({ error: 'El producto no existe.' });
        }

        // Validar inventario
        if (producto.cantidad_existencia < cantidad_vendida) {
            return res.status(400).json({ error: 'Cantidad insuficiente en inventario.' });
        }

        // Actualizar inventario
        const nuevaCantidad = producto.cantidad_existencia - cantidad_vendida;
        const { error: updateError } = await supabase
            .from('productos')
            .update({ cantidad_existencia: nuevaCantidad })
            .eq('id', productoid);

        if (updateError) throw updateError;

        // Calcular totales
        const totalVenta = producto.precio_publico * cantidad_vendida;
        const totalGanancia = producto.ganancia * cantidad_vendida;

        // Registrar venta
        const { error: ventaError } = await supabase
            .from('ventas')
            .insert([{
                productoid,
                cantidad_vendida,
                fecha: new Date().toISOString(),
                total: totalVenta,
                ganancia: totalGanancia,
            }]);

        if (ventaError) throw ventaError;

        res.status(201).json({ message: 'Venta registrada correctamente.' });
    } catch (err) {
        console.error('Error al registrar la venta:', err.message);
        res.status(500).json({ error: 'Error al registrar la venta.' });
    }
});
/**
 * Obtener ventas con nombres de productos
 */
app.get('/ventas', async (req, res) => {
    try {
        // Obtener las ventas
        const { data: ventas, error: ventasError } = await supabase
            .from('ventas')
            .select('id, cantidad_vendida, fecha, total, ganancia, productoid');

        if (ventasError) throw ventasError;

        // Obtener nombres de productos
        const { data: productos, error: productosError } = await supabase
            .from('productos')
            .select('id, nombre');

        if (productosError) throw productosError;

        // Relacionar ventas con productos
        const ventasConProductos = ventas.map((venta) => {
            const producto = productos.find((prod) => prod.id === venta.productoid);
            return {
                id: venta.id,
                producto: producto ? producto.nombre : 'Producto no disponible',
                cantidad_vendida: venta.cantidad_vendida,
                total: venta.total,
                ganancia: venta.ganancia,
                fecha: venta.fecha,
            };
        });

        res.json(ventasConProductos);
    } catch (err) {
        console.error('Error al obtener ventas:', err.message);
        res.status(500).json({ error: 'Error al obtener ventas.' });
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
