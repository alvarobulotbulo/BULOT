import { MercadoPagoConfig, Preference } from 'mercadopago';
import nodemailer from 'nodemailer';

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { items, customer } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'El carrito está vacío' });
    }

    const preferenceItems = items.map(item => ({
      title: item.name,
      quantity: Number(item.quantity) || 1,
      unit_price: Number(item.price) || 0,
      currency_id: 'CLP'
    }));

    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        items: preferenceItems,
        back_urls: {
          success: 'https://bulotweb.vercel.app',
          failure: 'https://bulotweb.vercel.app',
          pending: 'https://bulotweb.vercel.app'
        },
        auto_return: 'approved'
      }
    });

    const itemsListHtml = items.map(i => `<li><b>${i.name}</b> - Cantidad: ${i.quantity} - $${i.price}</li>`).join('');
    const mailOptions = {
      email: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO,
      subject: '🔥 ¡Nuevo Pedido en Bulot SpA!',
      html: `
        <h2>¡Tienes una nueva venta / cotización en Bulot!</h2>
        <h3>Datos del Cliente:</h3>
        <p><b>Nombre:</b> ${customer?.name || 'No indicado'}</p>
        <p><b>Teléfono:</b> ${customer?.phone || 'No indicado'}</p>
        <p><b>Dirección:</b> ${customer?.address || 'No indicado'}</p>
        <h3>Productos:</h3>
        <ul>${itemsListHtml}</ul>
      `
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ init_point: result.init_point });
  } catch (error) {
    console.error('Error en pasarela:', error);
    return res.status(500).json({ error: 'Error interno al procesar el pago' });
  }
}
