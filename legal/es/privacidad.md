# Política de privacidad

> Esta es una traducción al español. Si esta versión y la [versión en inglés](https://peacebestillapp.com/privacy) no dicen lo mismo, prevalece la versión en inglés.

Vigente desde: 20 de noviembre de 2026

Esta política cubre la app Peace Be Still y el sitio web peacebestillapp.com. Peace Be Still es una app de Spry Labs, el nombre comercial de Redwood Reserve Holdings LLC, una compañía de responsabilidad limitada de Wyoming. Escriba a info@peacebestillapp.com con cualquier pregunta o solicitud sobre privacidad.

En pocas palabras: no hay cuenta, nunca le pedimos su nombre, no hay anuncios y no vendemos ni compartimos información personal. Lo que usted escribe en el chat va a proveedores gratuitos de IA, que pueden guardarlo y aprender de ello.

## Lo que se queda en su teléfono

Su año de nacimiento, la puerta que eligió, su configuración, los versículos guardados, los resaltados, las entradas del diario, su racha y todo lo que grabe con su propia voz se quedan en su teléfono. Nunca los recibimos. Si borra la app, se borran.

## El chat

El chat es opcional. Antes de su primer chat, la app le pide permiso y le dice adónde van sus palabras.

Cada mensaje del chat pasa por nuestro servicio hasta un proveedor de IA, que escribe la respuesta. Los proveedores, en el orden en que se prueban, son Cloudflare Workers AI, Google Gemini (en su nivel gratuito) y modelos gratuitos a los que se llega por medio de OpenRouter. Estos proveedores pueden guardar y usar lo que usted escribe para mejorar sus servicios, y personas de esas empresas pueden leerlo. Por favor, no incluya nombres ni nada que lo identifique a usted o a otra persona.

Cada mensaje del chat se envía con su grupo de edad (adolescente o adulto), la puerta que eligió, la voz del chat y el idioma, para que la respuesta sea la adecuada; nada de esto está ligado a su nombre, porque la app nunca se lo pide. Su año de nacimiento nunca sale de su teléfono.

Cada mensaje pasa primero por un control de seguridad basado en palabras, dentro de nuestro propio código. Cuando ese control reconoce que un mensaje trata de autolesiones o abuso, nuestro código responde con líneas de ayuda para crisis y el mensaje no se envía a ningún modelo de IA. Todos los demás mensajes los lee primero un modelo de seguridad en Cloudflare Workers AI, antes de que se escriba una respuesta.

No guardamos el texto del chat. Pasa por nuestro servicio hasta el proveedor y desaparece de nuestro servicio en cuanto llega la respuesta.

## La memoria del chat de pago

Si usted está en la parte de pago, el chat puede recordar lo que le pesa. Esa memoria es un resumen corto, de 1,000 caracteres como máximo, que se guarda en nuestro servicio bajo un identificador de instalación anónimo y se envía con sus mensajes para que las respuestas recuerden. Se guarda hasta que usted la borre en Configuración, o hasta 30 días después de que termine su plan de pago, lo que pase primero. Las palabras sobre autolesiones o abuso nunca se guardan en la memoria.

## Sesiones hechas para usted

Si usted está en la parte de pago y pide una sesión hecha para usted, la escena o la preocupación que escriba se envía a nuestro servicio. Proveedores gratuitos de IA escriben el guion de la sesión a partir de sus palabras, y pueden guardar lo que usted escribe y aprender de ello, igual que en el chat (el formulario se lo dice antes de enviar). Hacemos el audio en nuestra propia computadora con un motor de voz de código abierto. Sus palabras escritas se borran en cuanto se hace el audio, y a más tardar 7 días después de que las envíe. El audio terminado se guarda para que usted lo escuche hasta que lo borre, o hasta 30 días después de que termine su plan de pago.

## Reportar una respuesta

Si usted reporta una respuesta o una sesión, guardamos esa respuesta, el motivo que eligió y la hora, durante 90 días, para que una persona la revise. Su mensaje y nada que lo identifique se guardan con ella.

## El identificador de instalación anónimo y los límites

Para que el chat siga siendo justo y gratis, nuestro servicio crea un identificador de instalación al azar la primera vez que usted usa el chat. No está ligado a su nombre, correo electrónico, número de teléfono ni cuenta de Apple. Nuestro servicio usa el identificador de instalación y un hash de un solo sentido de su dirección IP para contar los mensajes de cada día (1 conversación de hasta 10 mensajes al día en la parte gratis, hasta 100 mensajes al día en la parte de pago) y para frenar el abuso. Para que las respuestas no se repitan, nuestro servicio también guarda registros cortos de los patrones de las respuestas recientes de cada identificador de instalación: hashes con clave de 8 caracteres, sin ninguna palabra. Esos contadores y registros se borran en un plazo de 48 horas. También guardamos un conteo de todos los mensajes del chat por día, sin texto y sin identificador, para mantenernos dentro de los límites gratuitos de IA.

## El audio y la Biblia

El texto de la Biblia, el audio de la Biblia y las sesiones para dormir son archivos. Cuando su teléfono descarga uno, nuestro proveedor de hosting (Cloudflare) ve su dirección IP para poder entregarlo, como cualquier servicio de hosting web. No guardamos un registro de lo que usted escucha o lee.

## Compras

Apple se encarga de cada compra. Nunca vemos su nombre, su Apple ID ni su tarjeta de pago. RevenueCat, que administra las suscripciones por nosotros, recibe un identificador anónimo de usuario de la app, sus recibos de compra de Apple y datos básicos como la versión de la app, la versión de iOS y el país de la tienda, para que la app sepa si usted está en la parte de pago. Los diagnósticos de RevenueCat y su recolección de identificadores del dispositivo están desactivados en la app.

## Lo que nunca hacemos

No hay anuncios, ni SDK de anuncios, ni SDK de analítica. La app no le sigue el rastro en las apps ni en los sitios web de otras empresas, y no vendemos ni compartimos información personal. Las señales de Do Not Track (no rastrear) del navegador no aplican, porque no hay rastreo que detener.

## Niños

Peace Be Still pide el año de nacimiento antes que cualquier otra cosa.

Para menores de 13 años, la app no envía a nuestro servicio ningún chat, memoria, sesión hecha para ellos ni identificador de instalación, y el año de nacimiento se queda en el dispositivo. Los archivos de audio se descargan como cualquier archivo web: la dirección IP se usa solo para entregar el archivo. Las compras pasan por Apple, con uno de los padres por medio de Compartir en familia (Family Sharing).

No recopilamos a sabiendas información personal de niños menores de 13 años. Si usted cree que un niño nos envió información, escriba a info@peacebestillapp.com y la borraremos.

De 13 a 17 años, el chat usa la voz para adolescentes, y las compras de la parte de pago pasan por Solicitar la compra (Ask to Buy) de Apple cuando uno de los padres lo ha activado.

## Dónde se ofrece la app

La app se ofrece en los Estados Unidos y en otros países, pero no en el Espacio Económico Europeo, el Reino Unido ni Suiza, porque uno de nuestros proveedores gratuitos de IA no permite que su nivel gratuito atienda a personas de esos lugares.

## Cómo la protegemos

Todo lo que viaja entre la app y nuestro servicio va por HTTPS. El identificador de instalación va dentro de un token firmado para que nadie más pueda usar sus límites ni su memoria, y las direcciones IP se guardan solo como hashes de un solo sentido.

## El sitio web

El sitio web peacebestillapp.com no usa cookies y no tiene cuentas, anuncios ni scripts de rastreo. Usa Cloudflare Web Analytics, un contador de visitas que cuida la privacidad y no usa cookies; nos dice las páginas vistas, la página desde la que usted llegó, y su país y tipo de dispositivo, solo como cifras totales. Cloudflare, nuestro proveedor de hosting, procesa datos básicos de cada visita, como su dirección IP y el tipo de navegador, para entregar la página y proteger el sitio.

Hasta el 18 de noviembre de 2026, el sitio tenía un formulario para avisar cuando salga la app. Ya está cerrado. De las personas que se anotaron antes de esa fecha, guardamos el correo electrónico, el idioma de la página, la puerta elegida si la hubo, la página, la fecha y la hora, y la frase que aceptaron, solo para enviar un único correo de lanzamiento. Borramos toda la lista después de enviar ese correo. Para salir de la lista antes, use el enlace "Quitar mi correo" (en inglés, "Remove my email") que vio al anotarse, o el enlace del correo de lanzamiento.

## Sus opciones y sus derechos

Usted puede borrar la memoria del chat de pago y las sesiones hechas para usted en Configuración cuando quiera. Apple administra las suscripciones en la Configuración de su iPhone. Para cualquier otra cosa, escriba a info@peacebestillapp.com: puede preguntar qué guardamos sobre su identificador de instalación y pedirnos que borremos esos datos, y le responderemos a mano en un plazo de 30 días. Le damos el mismo trato, haga o no una solicitud. Estos derechos aplican dondequiera que usted viva, incluidos California y otros estados con leyes de privacidad.

## Cambios

Cuando esta política cambie, publicaremos aquí la nueva fecha y mostraremos un aviso en la app si el cambio es importante.

## Contacto

Spry Labs (Redwood Reserve Holdings LLC), 30 N. Gould St, Ste R, Sheridan, WY 82801, USA. Correo electrónico: info@peacebestillapp.com.
