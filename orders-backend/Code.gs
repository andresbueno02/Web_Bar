/**
 * Backend de pedidos de Atlantida Cafe.
 *
 * Recibe el pedido hecho desde la web (POST con JSON) y lo publica
 * automáticamente en el grupo de Telegram del bar. La misma URL también
 * recibe los toques del botón "Marcar como hecho" (webhook del bot).
 *
 * DESPLIEGUE:
 * 1. Crea un proyecto nuevo en https://script.google.com y pega este archivo como Code.gs.
 * 2. Menú "Configuración del proyecto" > "Propiedades del script" > añade:
 *      BOT_TOKEN     = token que te da @BotFather al crear el bot
 *      CHAT_ID       = id del grupo de Telegram donde debe publicar (el bot debe estar añadido al grupo)
 *      ORDERS_TOKEN  = el mismo valor que ORDERS_TOKEN en app.js (Web_Bar), para que este
 *                      script rechace cualquier pedido que no venga de la web oficial.
 * 3. Implementar > Nueva implementación > Aplicación web:
 *      Ejecutar como: Yo
 *      Quién tiene acceso: Cualquier usuario
 * 4. Copia la URL de la implementación y ponla en ORDERS_ENDPOINT dentro de app.js (Web_Bar).
 * 5. Registra esa misma URL como webhook del bot (una sola vez), visitando en el navegador:
 *      https://api.telegram.org/bot<TOKEN>/setWebhook?url=<URL_DEL_WEB_APP>
 *    Esto hace que Telegram reenvíe aquí los toques del botón "Marcar como hecho".
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

    // Los toques de botón que llegan vía webhook de Telegram traen "callback_query";
    // los pedidos que manda la web nunca tienen esa clave.
    if (payload && payload.callback_query) {
      handleCallbackQuery(payload);
      return jsonResponse({ ok: true });
    }

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
  // Solo acepta pedidos que traigan el token compartido con app.js: evita que alguien
  // copie la URL pública del endpoint (visible en el JS del navegador) y la use para
  // floodear el grupo de Telegram del bar sin pasar por la web.
  const tokenEsperado = getScriptProperty_('ORDERS_TOKEN');
  const tokenRecibido = String(payload && payload.token || '');
  if (tokenRecibido !== tokenEsperado) throw new Error('No autorizado.');

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
    const opcionTxt = item.opcion ? ' (' + item.opcion + ')' : '';
    return '• ' + item.cantidad + 'x ' + item.producto + opcionTxt;
  });

  let mensaje = '🛎️ Nuevo pedido — Mesa ' + pedido.mesa + '\n\n' + lineas.join('\n');
  if (pedido.notas) {
    mensaje += '\n\n📝 Notas: ' + pedido.notas;
  }
  return mensaje;
}

function enviarATelegram(texto) {
  const chatId = getScriptProperty_('CHAT_ID');

  const reply_markup = {
    inline_keyboard: [[{ text: '✅ Marcar como hecho', callback_data: 'done' }]]
  };

  llamarTelegram_('sendMessage', {
    chat_id: chatId,
    text: texto,
    reply_markup: reply_markup
  });
}

// Se ejecuta cuando alguien del equipo pulsa "✅ Marcar como hecho" en el grupo.
// El mensaje original NUNCA se borra ni se reemplaza: solo se le antepone el
// prefijo "✅ COMPLETADO" y se quita el botón, para poder seguir leyendo y
// apuntando el pedido completo (mesa, productos, notas) después de marcarlo.
function handleCallbackQuery(update) {
  const callback = update.callback_query;
  const chatId = callback.message.chat.id;
  const messageId = callback.message.message_id;
  const textoOriginal = callback.message.text || '';

  if (textoOriginal.indexOf('✅ COMPLETADO') !== 0) {
    llamarTelegram_('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text: '✅ COMPLETADO\n\n' + textoOriginal,
      reply_markup: { inline_keyboard: [] }
    });
  }

  // Obligatorio: si no se llama, el móvil de quien pulsó se queda con el
  // icono de "cargando" en el botón indefinidamente.
  llamarTelegram_('answerCallbackQuery', { callback_query_id: callback.id });
}

function getScriptProperty_(name) {
  const value = PropertiesService.getScriptProperties().getProperty(name);
  if (!value) throw new Error('Falta la propiedad del script "' + name + '".');
  return value;
}

function llamarTelegram_(metodo, body) {
  const token = getScriptProperty_('BOT_TOKEN');
  const url = 'https://api.telegram.org/bot' + token + '/' + metodo;
  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    throw new Error('Telegram (' + metodo + ') respondió ' + status + ': ' + response.getContentText());
  }
  return response;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Comprobación rápida de que la implementación en vivo está actualizada
// (visitar la URL del Web App directamente en el navegador hace GET, no POST).
function doGet(e) {
  return ContentService.createTextOutput('VERSION-CON-BOTON-OK - ' + new Date());
}
