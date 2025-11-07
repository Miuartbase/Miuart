const admin = require("firebase-admin");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

const MODO_PRUEBA = true; // ⚙️ Canvia a false quan vulguis enviar-ho a tots

// 🔹 Inicialització de Firestore
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
const db = admin.firestore();

exports.handler = async () => {
  console.log("🟦 Inici funció enviar-newsletter...");

  // ✅ Control per desactivar enviament completament
  if (process.env.NEWSLETTER_ENABLED !== "true") {
    console.log("⏸️ Newsletter desactivat per configuració.");
    return { statusCode: 200, body: "Newsletter desactivat." };
  }

  try {
    // 🔹 Obtenir logo
    const configDoc = await db.collection("config").doc("logo").get();
    const logoUrl = configDoc.exists ? configDoc.data().url : "";

    // 🔹 Productes en novetat
    const snap = await db.collection("productes").where("novedades", "==", true).get();
    if (snap.empty) {
      console.log("⚠️ Sense productes de novetat.");
      return { statusCode: 200, body: "Sense productes de novetat." };
    }

    const productosHTML = snap.docs.map((doc) => {
      const p = doc.data();
      const img = p.variants?.[0]?.imatges?.[0] || "";
      const nom = p.nombre || "Producto sin nombre";
      return `
        <div style="text-align:center; margin:30px auto;">
          <img src="${img}" alt="${nom}" style="width:280px; height:auto; border-radius:12px; box-shadow:0 2px 6px rgba(0,0,0,0.1);" />
          <h3 style="font-size:20px; color:#e9acc8; text-transform:uppercase; font-weight:700; margin-top:10px;">${nom}</h3>
        </div>
      `;
    }).join("");

    // 🔹 Bloc promocional
    const bloquePromocional = `
      <div style="text-align:center; margin:40px 0;">
        <h2 style="color:#e9acc8; font-size:22px; margin-bottom:10px;">🌸 Nueva colección primavera 🌸</h2>
        <p style="font-size:16px; color:#444;">Descubre las últimas creaciones exclusivas en nuestra tienda online.</p>
        <img src="https://res.cloudinary.com/dhfywi5e8/image/upload/v1720000000/promo.jpg" 
             alt="Promoción" style="width:320px; border-radius:10px; margin-top:10px;" />
      </div>
    `;

    // 🔹 Bloc Instagram
    const bloqueInstagram = `
      <div style="text-align:center; margin:50px 0;">
        <p style="font-size:16px; color:#333; margin-bottom:10px;">
          ¡Síguenos en Instagram y entérate de todas nuestras novedades!
        </p>
        <a href="https://www.instagram.com/miuart_oficial" target="_blank" style="text-decoration:none;">
          <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png" 
               alt="Instagram" style="width:40px; height:40px;" />
        </a>
      </div>
    `;

    // 🔹 Cos complet del correu
    const html = `
      <div style="font-family:Arial, sans-serif; background:#fdf2f8; padding:40px; color:#333;">
        <div style="max-width:600px; background:#fff; margin:0 auto; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.1);">
          <div style="text-align:center; padding:30px 20px;">
            <img src="${logoUrl}" alt="Logo MiUArt" style="width:160px; height:auto; margin-bottom:10px;" />
            <h1 style="font-size:22px; color:#e9acc8; margin:0;">Novedades de este mes en MiUArt</h1>
          </div>
          <div style="padding:20px;">
            ${productosHTML}
            ${bloquePromocional}
            ${bloqueInstagram}
          </div>
          <div style="background:#f8f9fa; text-align:center; padding:15px; font-size:12px; color:#666;">
            ©️ 2025 MiUArt. Todos los derechos reservados.<br>
            <small>Si no deseas recibir más correos, puedes darte de baja desde el enlace al pie del correo.</small>
          </div>
        </div>
      </div>
    `;

    // 🔹 Enviament
    const destinatarios = MODO_PRUEBA
      ? [{ email: "miuartclientes@gmail.com" }]
      : []; // 🟡 Llista buida = s’enviarà a tots de la llista Brevo

    const body = MODO_PRUEBA
      ? { sender: { name: "MiUArt", email: "no-reply@miuart.com" }, to: destinatarios, subject: "📰 Novedades del mes en MiUArt", htmlContent: html }
      : {
          sender: { name: "MiUArt", email: "no-reply@miuart.com" },
          subject: "📰 Novedades del mes en MiUArt",
          htmlContent: html,
          toField: "{{contact.EMAIL}}",
          listIds: [parseInt(process.env.BREVO_LIST_ID, 10) || 3],
        };

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": process.env.BREVO_API_KEY,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    console.log("✅ Newsletter enviat:", data);
    return { statusCode: 200, body: JSON.stringify(data) };

  } catch (error) {
    console.error("💥 Error al generar/enviar newsletter:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

// 🔹 Execució mensual automàtica
exports.config = {
  schedule: "@monthly",
};
