/**
 * Backend de pedidos de Atlantida Cafe.
 *
 * Recibe el pedido hecho desde la web (POST con JSON) y lo publica
 * automáticamente en el grupo de Telegram del bar.
 *
 * DESPLIEGUE:
 * 1. Crea un proyecto nuevo en https://script.google.com y pega este archivo como Code.gs.
 * 2. Menú "Configuración del proyecto" > "Propiedades del script" > añade:
 *      BOT_TOKEN = token que te da @BotFather al crear el bot
 *      CHAT_ID   = id del grupo de Telegram donde debe publicar (el bot debe estar añadido al grupo)
 * 3. Implementar > Nueva implementación > Aplicación web:
 *      Ejecutar como: Yo
 *      Quién tiene acceso: Cualquier usuario
 * 4. Copia la URL de la implementación y ponla en ORDERS_ENDPOINT dentro de app.js (Web_Bar).
 *
 * El token y el chat id NUNCA se escriben aquí en texto plano ni en el código de la web:
 * viven solo en las Propiedades del script, fuera del control de versiones.
 */

const MAX_ITEMS = 30;
const MAX_CANTIDAD = 20;
const MAX_NOTAS_LENGTH = 300;

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const pedido = validarPedido(payload);
    enviarATelegram(formatearMensaje(pedido));
    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

// Valida y normaliza el payload recibido. Lanza un error descriptivo si algo no cuadra,
// para no publicar nunca en Telegram un pedido corrupto o potencialmente abusivo.
function validarPedido(payload) {
  const mesa = String(payload && payload.mesa || '').trim();
  if (!mesa) throw new Error('Falta el número de mesa.');
  if (mesa.length > 40) throw new Error('Mesa inválida.');

  const itemsRaw = Array.isArray(payload && payload.items) ? payload.items : [];
  if (itemsRaw.length === 0) throw new Error('El pedido no tiene productos.');
  if (itemsRaw.length > MAX_ITEMS) throw new Error('Demasiadas líneas en el pedido.');

  const items = itemsRaw.map(function (raw) {
    const producto = String(raw && raw.producto || '').trim();
    const cantidad = parseInt(raw && raw.cantidad, 10);
    const opcion = String(raw && raw.opcion || '').trim();

    if (!producto || producto.length > 120) throw new Error('Producto inválido.');
    if (!Number.isInteger(cantidad) || cantidad <= 0 || cantidad > MAX_CANTIDAD) {
      throw new Error('Cantidad inválida para "' + producto + '".');
    }
    if (opcion.length > 80) throw new Error('Opción inválida.');

    return { producto: producto, cantidad: cantidad, opcion: opcion };
  });

  const notas = String(payload && payload.notas || '').trim().slice(0, MAX_NOTAS_LENGTH);

  return { mesa: mesa, items: items, notas: notas };
}

function formatearMensaje(pedido) {
  const lineas = pedido.items.map(function (item) {
    const opcionTxt = item.opcion ? ' (con ' + item.opcion + ')' : '';
    return '• ' + item.cantidad + 'x ' + item.producto + opcionTxt;
  });

  let mensaje = '🛎️ Nuevo pedido — Mesa ' + pedido.mesa + '\n\n' + lineas.join('\n');
  if (pedido.notas) {
    mensaje += '\n\n📝 Notas: ' + pedido.notas;
  }
  return mensaje;
}

function enviarATelegram(texto) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('BOT_TOKEN');
  const chatId = props.getProperty('CHAT_ID');
  if (!token || !chatId) throw new Error('Faltan BOT_TOKEN o CHAT_ID en las propiedades del script.');

  const url = 'https://api.telegram.org/bot' + token + '/sendMessage';
  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ chat_id: chatId, text: texto }),
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    throw new Error('Telegram respondió ' + status + ': ' + response.getContentText());
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
