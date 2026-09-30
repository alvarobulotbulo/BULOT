export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { items } = req.body;

    const preferenceData = {
      items: items,
      back_urls: {
        success: "https://bulotweb.vercel.app",
        failure: "https://bulotweb.vercel.app",
        pending: "https://bulotweb.vercel.app"
      },
      auto_return: "approved"
    };

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`
      },
      body: JSON.stringify(preferenceData)
    });

    const data = await response.json();

    if (data.init_point) {
      return res.status(200).json({ init_point: data.init_point });
    } else {
      return res.status(400).json({ error: 'No se pudo generar la preferencia', details: data });
    }

  } catch (error) {
    return res.status(500).json({ error: 'Error interno del servidor', message: error.message });
  }
}
