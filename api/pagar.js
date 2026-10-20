const { MercadoPagoConfig, Preference } = require('mercadopago');
const nodemailer = require('nodemailer');

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
        const { items, client: clientData } = req.body;

        const preference = new Preference(client);
        const result = await preference.create({
            body: {
                items: items,
                payer: {
                    name: clientData.name,
                    email: clientData.email,
                    phone: { number: clientData.phone },
                    address: { street_name: clientData.address }
                },
                back_urls: {
                    success: "https://bulotweb.vercel.app/exito.html",
                    failure: "https://bulotweb.vercel.app/error.html",
                    pending: "https://bulotweb.vercel.app/pending.html"
                },
                auto_return: "approved",
            }
        });

        const detalleProductos = items.map(i => `- ${i.quantity}x ${i.title} ($${i.unit_price} CLP)`).join('\n');

        await transporter.sendMail({
            from: `"Tienda Bulot" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_TO,
            subject: `🔥 ¡Nuevo pedido de ${clientData.name} en Bulot!`,
            text: `Se ha generado una orden de compra:\n\nCLIENTE:\nNombre: ${clientData.name}\nTeléfono: ${clientData.phone}\nEmail: ${clientData.email}\nDirección: ${clientData.address}, ${clientData.comuna}\n\nPRODUCTOS:\n${detalleProductos}`
        });

        return res.status(200).json({ init_point: result.init_point });

    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ error: "Error al procesar el pago" });
    }
}
