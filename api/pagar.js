import { MercadoPagoConfig, Preference } from 'mercadopago';
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { items, customer } = req.body;

    // 1. Configurar Mercado Pago
    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const preference = new Preference(client);

    const result = await preference.create({
      body: {
        items: items.map(item => ({
          title: item.title,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          currency_id: 'CLP',
        })),
        back_urls: {
          success: "https://www.bulot.cl/?status=success",
          failure: "https://www.bulot.cl/?status=failure",
          pending: "https://www.bulot.cl/?status=pending",
        },
        auto_return: "approved",
      }
    });

    // 2. Enviar notificación por correo electrónico si están configuradas las variables
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.EMAIL_TO) {
      try {
        let transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });

        let detalleHtml = items.map(i => `<li>${i.quantity}x ${i.title} - $${i.unit_price.toLocaleString('es-CL')} CLP</li>`).join('');
        let totalGeneral = items.reduce((acc, i) => acc + (i.unit_price * i.quantity), 0);

        await transporter.sendMail({
          from: `"Tienda Bulot" <${process.env.EMAIL_USER}>`,
          to: process.env.EMAIL_TO,
          subject: '🔥 ¡Nueva Cotización / Intento de Pago en Bulot!',
          html: `
            <h2>¡Hola Álvaro! Tienes un nuevo movimiento en la web:</h2>
            <p><strong>Detalle de los productos:</strong></p>
            <ul>${detalleHtml}</ul>
            <p><strong>Total Estimado:</strong> $${totalGeneral.toLocaleString('es-CL')} CLP</p>
          `,
        });
      } catch (emailError) {
        console.error("Error al enviar el correo (no bloquea el pago):", emailError);
      }
    }

    return res.status(200).json({ init_point: result.init_point });
  } catch (error) {
    console.error("Error al crear la preferencia de Mercado Pago:", error);
    return res.status(500).json({ error: 'Error al conectar con la pasarela de pagos' });
  }
}
