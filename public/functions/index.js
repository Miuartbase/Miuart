const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const { Resend } = require('resend'); // 👈 AFEGIR AQUESTA LLINIA

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

// 👇 AFEGIR AQUESTA NOVA FUNCIÓ PER AL CONTACTE AMB RESEND
exports.enviarContacto = functions.https.onRequest(async (req, res) => {
  // Configurar CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  // Manejar preflight request
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Verificar que es POST
  if (req.method !== 'POST') {
    return res.status(405).send('Método no permitido');
  }

  const { nombre, email, mensaje } = req.body;

  if (!nombre || !email || !mensaje) {
    return res.status(400).json({ 
      error: 'Faltan datos: nombre, email, mensaje' 
    });
  }

  try {
    console.log('📤 Enviando email de contacto via Resend...');

    // Inicializar Resend (REEMPLAÇA amb la teva API key)
    const resend = new Resend('re_la_teva_api_key_de_resend'); // 👈 POSA LA TEVA API KEY AQUÍ

    const data = await resend.emails.send({
      from: 'MiUArt Contact <onboarding@resend.dev>',
      to: 'miuartbase@gmail.com',
      subject: `📧 Nuevo mensaje de contacto de ${nombre}`,
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Nuevo Mensaje de Contacto - MiUArt</title>
          <style>
            body { font-family: Arial, sans-serif; background:#f4f4f4; margin:0; padding:0; }
            .container { max-width:600px; margin:20px auto; background:white; border-radius:8px; overflow:hidden; box-shadow:0 0 10px rgba(0,0,0,0.1); }
            .header { background:#e9acc8; color:white; padding:20px; text-align:center; }
            .header h1 { margin:0; font-size:24px; }
            .content { padding:25px; }
            .section { margin-bottom:20px; }
            .section h2 { color:#e9acc8; border-bottom:1px solid #eee; padding-bottom:8px; font-size:18px; }
            .info-item { margin-bottom:12px; }
            .label { font-weight:bold; color:#555; display:inline-block; width:80px; }
            .message-box { background:#f8f9fa; border:1px solid #e9ecef; border-radius:8px; padding:15px; margin:15px 0; }
            .footer { background:#f8f9fa; padding:15px; text-align:center; font-size:12px; color:#666; }
            .action-btn { background:#e9acc8; color:white; padding:8px 16px; text-decoration:none; border-radius:5px; display:inline-block; margin:5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📧 Nuevo Mensaje de Contacto</h1>
              <p>Has recibido un nuevo mensaje desde MiUArt</p>
            </div>
            
            <div class="content">
              <div class="section">
                <h2>Información del Contacto</h2>
                <div class="info-item">
                  <span class="label">Nombre:</span> ${escapeHtml(nombre)}
                </div>
                <div class="info-item">
                  <span class="label">Email:</span> ${escapeHtml(email)}
                </div>
                <div class="info-item">
                  <span class="label">Fecha:</span> ${new Date().toLocaleString('es-ES')}
                </div>
              </div>
              
              <div class="section">
                <h2>Mensaje</h2>
                <div class="message-box">
                  ${escapeHtml(mensaje).replace(/\n/g, '<br>')}
                </div>
              </div>

              <div style="text-align:center; margin:20px 0;">
                <a href="mailto:${escapeHtml(email)}" class="action-btn">📧 Responder</a>
              </div>
            </div>

            <div class="footer">
              <p>© 2025 MiUArt | Sistema de Contacto Automático</p>
              <p><small>Email enviado via Resend + Cloud Functions</small></p>
            </div>
          </div>
        </body>
        </html>
      `,
      reply_to: email
    });

    console.log('✅ Email enviado correctamente:', data);
    return res.status(200).json({ 
      success: true, 
      message: 'Email enviado correctamente',
      id: data.id 
    });

  } catch (error) {
    console.error('❌ Error enviando email:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Función auxiliar para escapar HTML
function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}