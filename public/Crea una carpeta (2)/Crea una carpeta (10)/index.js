const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

// Configurar el transporter de nodemailer (usando Gmail como ejemplo)
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: functions.config().gmail.email,
    pass: functions.config().gmail.password
  }
});

exports.enviarEmailComanda = functions.firestore
  .document('comandas/{comandaId}')
  .onCreate(async (snap, context) => {
    const comanda = snap.data();
    const comandaId = context.params.comandaId;

    // Formatear lista de productos
    const listaProductos = comanda.productos.map(producto => 
      `• ${producto.nombre} (${producto.variante}) - ${producto.cantidad} x ${producto.precio}€ = ${(producto.cantidad * producto.precio).toFixed(2)}€`
    ).join('\n');

    // Formatear dirección
    const direccionCompleta = `
${comanda.cliente.direccion}
${comanda.cliente.infoAdicional}
${comanda.cliente.codigoPostal} ${comanda.cliente.ciudad}
${comanda.cliente.pais}
    `.trim();

    const emailAdmin = 'miuartbase@gmail.com';

    const mailOptions = {
      from: functions.config().gmail.email,
      to: emailAdmin,
      subject: `📦 Nueva Comanda Miuart - ${comandaId}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .header { background: #e9acc8; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; }
                .section { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
                .producto { padding: 8px 0; border-bottom: 1px solid #eee; }
                .totals { background: #f9f9f9; padding: 15px; border-radius: 8px; }
                .total-line { display: flex; justify-content: space-between; margin: 5px 0; }
                .total-final { font-weight: bold; font-size: 1.2em; border-top: 2px solid #333; padding-top: 10px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🛍️ Nueva Comanda Recibida</h1>
                <p>Número de pedido: <strong>${comandaId}</strong></p>
            </div>
            
            <div class="content">
                <div class="section">
                    <h2>👤 Información del Cliente</h2>
                    <p><strong>Nombre:</strong> ${comanda.cliente.nombre} ${comanda.cliente.apellidos}</p>
                    <p><strong>Email:</strong> ${comanda.cliente.email}</p>
                    <p><strong>Teléfono:</strong> ${comanda.cliente.telefono}</p>
                    <p><strong>Dirección:</strong><br>${direccionCompleta}</p>
                </div>

                <div class="section">
                    <h2>📋 Productos Pedidos</h2>
                    ${comanda.productos.map(producto => `
                        <div class="producto">
                            <strong>${producto.nombre}</strong><br>
                            Variante: ${producto.variante}<br>
                            Cantidad: ${producto.cantidad} x ${producto.precio}€ = <strong>${(producto.cantidad * producto.precio).toFixed(2)}€</strong>
                        </div>
                    `).join('')}
                </div>

                <div class="section totals">
                    <h2>💰 Resumen de Pago</h2>
                    <div class="total-line">
                        <span>Subtotal:</span>
                        <span>${comanda.totals.subtotal.toFixed(2)}€</span>
                    </div>
                    ${comanda.totals.descuento > 0 ? `
                    <div class="total-line">
                        <span>Descuento:</span>
                        <span>-${comanda.totals.descuento.toFixed(2)}€</span>
                    </div>
                    ` : ''}
                    <div class="total-line">
                        <span>Envío:</span>
                        <span>${comanda.totals.envio.toFixed(2)}€</span>
                    </div>
                    <div class="total-line">
                        <span>IVA (21%):</span>
                        <span>${comanda.totals.iva.toFixed(2)}€</span>
                    </div>
                    <div class="total-line total-final">
                        <span>TOTAL:</span>
                        <span>${comanda.totals.total.toFixed(2)}€</span>
                    </div>
                </div>

                ${comanda.cuponAplicado ? `
                <div class="section">
                    <h2>🎫 Cupón Aplicado</h2>
                    <p><strong>Código:</strong> ${comanda.cuponAplicado.codigo}</p>
                    <p><strong>Descuento:</strong> ${comanda.cuponAplicado.descuento}%</p>
                </div>
                ` : ''}

                <div class="section">
                    <p><strong>Fecha de la comanda:</strong> ${new Date(comanda.fecha.toDate()).toLocaleString('es-ES')}</p>
                    <p><strong>Estado:</strong> ${comanda.estado}</p>
                </div>
            </div>
        </body>
        </html>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('Email de comanda enviado correctamente');
      return null;
    } catch (error) {
      console.error('Error enviando email:', error);
      throw new Error('Error enviando email de comanda');
    }
  });