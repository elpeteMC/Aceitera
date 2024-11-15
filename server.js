const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');


const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.static('public'));
app.use(bodyParser.json());

// Configuración de Supabase
const supabaseUrl = 'https://ponaowtbwxttwzndtfsa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvbmFvd3Rid3h0dHd6bmR0ZnNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE2MTkzNTYsImV4cCI6MjA0NzE5NTM1Nn0.q1uNT4zBw3HlEDxO7M_sNN-Y2wXbb4qml6f4Is8N7Zw';
const supabase = createClient(supabaseUrl, supabaseKey);

// Ruta GET para obtener productos
app.get('/productos', async (req, res) => {
    console.log("GET /productos llamado"); // Mensaje de depuración
    try {
        const { data, error } = await supabase
            .from('productos') // Asegúrate de que el nombre coincide con tu tabla en Supabase
            .select('*');
        
        if (error) throw error;
        
        console.log("Productos obtenidos:", data); // Imprimir datos obtenidos
        res.json(data);
    } catch (err) {
        console.error('Error al obtener productos:', err);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});


// Ruta POST para agregar productos

app.post('/productos', async (req, res) => {
    const { nombre, precio, cantidad, descripcion } = req.body;

    try {
        const { data, error } = await supabase
            .from('productos')
            .insert([{ nombre, precio, cantidad, descripcion }]);

        if (error) {
            console.error('Error de Supabase:', error); // Log detallado del error
            throw error;
        }

        res.status(201).json({ message: 'Producto agregado', producto: data });
    } catch (err) {
        res.status(500).json({ error: 'Error al agregar el producto', detalle: err.message });
    }
});
// Ruta DELETE para eliminar un producto
app.delete('/productos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase
            .from('productos')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.status(200).json({ message: 'Producto eliminado' });
    } catch (err) {
        res.status(500).json({ error: 'Error al eliminar producto' });
    }
});


app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
// Ruta para registrar una venta
app.post('/ventas', async (req, res) => {
    const { productoId, cantidad_vendida } = req.body;
    console.log("Datos recibidos:", { productoId, cantidad_vendida }); // Depuración inicial

    try {
        // Verificar existencia y cantidad del producto
        const { data: producto, error: productError } = await supabase
            .from('productos')
            .select('cantidad')
            .eq('id', productoId)
            .single();

        if (productError) {
            console.error("Error al obtener producto:", productError);
            throw productError;
        }
        console.log("Producto encontrado:", producto); // Depuración de producto encontrado

        // Verificar si hay suficiente inventario
        if (!producto || producto.cantidad < cantidad_vendida) {
            console.warn("Cantidad insuficiente en inventario");
            return res.status(400).json({ error: 'Cantidad insuficiente en inventario' });
        }

        // Actualizar inventario
        const nuevaCantidad = producto.cantidad - cantidad_vendida;
        const { error: updateError } = await supabase
            .from('productos')
            .update({ cantidad: nuevaCantidad })
            .eq('id', productoId);

        if (updateError) {
            console.error("Error al actualizar inventario:", updateError);
            throw updateError;
        }
        console.log("Inventario actualizado, nueva cantidad:", nuevaCantidad); // Depuración de inventario

        // Registrar la venta
        const { data: venta, error: ventaError } = await supabase
            .from('ventas')
            .insert([{ productoId, cantidad_vendida, fecha: new Date().toISOString() }]);

        if (ventaError) {
            console.error("Error al registrar venta:", ventaError);
            throw ventaError;
        }
        console.log("Venta registrada exitosamente:", venta); // Depuración de venta registrada

        res.status(201).json({ message: 'Venta registrada correctamente', venta });
    } catch (err) {
        console.error('Error al registrar venta:', err);
        res.status(500).json({ error: 'Error al registrar la venta', detalle: err.message });
    }
});

