# Manual técnico · Sistema de Inventario Picasso Autosport

Este documento explica cómo arrancar el sistema y cómo funciona cada parte del código, para que cualquier integrante del equipo pueda explicarlo. Sigue el Documento de Diseño, el ERS y el modelo relacional en 3FN (6 tablas).

---

## 1. Cómo arrancar el sistema

**Instalarlo (una sola vez por computadora).** Con XAMPP instalado en `C:\xampp`, haz doble clic en `instalar-en-xampp.bat` (está en la raíz del proyecto). Copia las pantallas ya compiladas (`pantallas-compiladas/`) y la API (`servidor/`) a `C:\xampp\htdocs\picasso`. No hace falta Node.js. Si XAMPP está en otra carpeta, el archivo te pide la ruta de `htdocs`.

**Usarlo:**

1. Abre el **XAMPP Control Panel** y presiona **Start** en **Apache** y en **MySQL**.
2. Abre el navegador en **http://localhost/picasso**
3. Inicia sesión.

| Usuario | Contraseña | Rol |
|---|---|---|
| `hramos` | `picasso` | Administrador (dueño), correo de ejemplo hramos@example.com |
| `lmarquez` | `encargado` | Encargado de Almacén |

Son las cuentas iniciales: conviene cambiar sus contraseñas en **Usuarios › Editar** al empezar a usar el sistema. Para que el correo de «¿Olvidaste tu contraseña?» llegue, cambia también el correo de `hramos` por uno real (ver sección 5, RNF-09).

**La primera vez** que se abre el sistema, la base de datos `picasso_inventario` todavía no existe. El archivo `api/conexion.php` la crea solo (tablas y datos iniciales) usando `base-de-datos/picasso_inventario.sql`. No hay que hacer nada más.

---

## 2. Cómo está armado

El sistema tiene tres partes y las tres viven en la misma computadora (RNF-03, sin internet; solo el correo para restablecer la contraseña del Administrador usa internet, RNF-09):

```
 Navegador                       Apache + PHP (XAMPP)                 MySQL / MariaDB (XAMPP)
 ┌───────────────────┐  pide    ┌─────────────────────────┐ consulta ┌──────────────────────┐
 │ 1. Pantallas      │ ───────► │ 2. API (carpeta api/)   │ ───────► │ 3. Base de datos     │
 │ React             │ ◄─────── │ revisa datos y reglas,  │ ◄─────── │ picasso_inventario   │
 │ (index.html)      │ responde │ guarda en la bitácora   │  guarda  │ 6 tablas en 3FN      │
 └───────────────────┘   JSON   └─────────────────────────┘          └──────────────────────┘
```

- **Pantallas (React):** lo que ve el usuario. No guardan datos: todo lo piden a la API.
- **API en PHP:** un archivo por tema (sesión, usuarios, insumos…). Revisa permisos y datos, aplica las reglas del diseño y responde en formato **JSON**.
- **Base de datos:** guarda la información en las 6 tablas del modelo relacional.

### Ejemplo de recorrido: «Registrar retiro» (RF-10)

1. El Encargado llena el carrito, escribe trabajador y vehículo/color y presiona **Registrar retiro** (pantalla *Entregar*, `views.tsx`).
2. La pantalla llama a `registrarSalida()` de `src/lib/api.ts`, que hace un `POST` a `api/salidas.php` con los datos en JSON.
3. `salidas.php` revisa la sesión, revisa que vengan trabajador y vehículo (excepción 3a) y abre una **transacción**.
4. Por cada insumo: lee la existencia, revisa que alcance (excepción 4a), descuenta `stockActual`, guarda un renglón en `salida_material` y recalcula la alerta (RF-06).
5. Guarda un renglón `SALIDA` en `bitacora_actividad` (RF-13) y confirma la transacción (`commit`).
6. Responde `{"ok": true, "detalle": "..."}` y la pantalla muestra «Retiro registrado».

Si algo falla a la mitad, se hace `rollBack()` y no se descuenta nada.

---

## 3. Carpetas y archivos

### En el proyecto (`picasso-stock-flow`)

| Ruta | Qué es |
|---|---|
| `servidor/api/` | La API en PHP (backend). |
| `servidor/base-de-datos/picasso_inventario.sql` | Script que crea la base de datos, las 6 tablas y los datos iniciales. |
| `src/lib/api.ts` | Única puerta de las pantallas hacia la API. |
| `src/lib/picasso-data.ts` | Tipos (Insumo, Usuario…) y funciones de apoyo de las pantallas. |
| `src/components/picasso/App.tsx` | Estructura general: inicio de sesión, barra superior, menú lateral. |
| `src/components/picasso/views.tsx` | Las pantallas: Panel, Alertas, Reabastecer, Entregar, Usuarios, Reportes. |
| `src/components/picasso/Login.tsx` | Inicio de sesión y «¿Olvidaste tu contraseña?». |
| `src/components/picasso/NuevoInsumoDialog.tsx` | Formulario de alta y edición de insumos. |
| `src/lib/excel-lista-compras.ts` | Genera los reportes de Excel (.xlsx) listos para imprimir. |
| `spa/` y `vite.xampp.config.ts` | Arman la versión que se copia a XAMPP (`npm run build:xampp`). |
| `pantallas-compiladas/` | Las pantallas ya compiladas (index.html, `assets/app.js`, estilos e imágenes). Se generan con `npm run build:xampp`; no se editan a mano. |
| `instalar-en-xampp.bat` | Copia `pantallas-compiladas/` y `servidor/` a `C:\xampp\htdocs\picasso`. No necesita Node.js. |
| `publicar-en-xampp.bat` | Vuelve a compilar las pantallas (necesita Node.js) y después ejecuta `instalar-en-xampp.bat`. |
| `documentacion/` | ERS, Modelo de Diseño, modelo relacional, guía de estudio del código y el prompt original de Lovable. |

La guía `documentacion/Guia_de_estudio_del_codigo.docx` explica cada carpeta, cada archivo y cada línea del código.

### En XAMPP (`C:\xampp\htdocs\picasso`)

```
picasso/
├── index.html            ← la página que abre el navegador
├── assets/               ← código de las pantallas (app.js), estilos e imágenes
├── api/                  ← los archivos PHP
└── base-de-datos/        ← el script SQL (protegido con .htaccess: no se puede descargar)
```

---

## 4. Base de datos `picasso_inventario`

Mismas tablas, columnas y relaciones que el modelo relacional en 3FN del Excel y del ERS.

| Tabla | Columnas | Para qué |
|---|---|---|
| `usuario` | **idUsuario** (PK), nombreCompleto, username (único), contraseñaUsuario (cifrada), emailUsuario (único), rolUsuario (Administrador / Encargado), estadoUsuario (ACTIVO / INACTIVO) | Cuentas con acceso (RNF-04 a RNF-09). |
| `categoria` | **idCategoria** (PK), nombreCategoria | Agrupa los insumos (RF-05). |
| `marca` | **idMarca** (PK), nombreMarca | Marca comercial (3FN). |
| `insumo` | **idInsumo** (PK, código del proveedor, ej. DC2000), nombreInsumo, descripcionBreve, *idCategoria* (FK), *idMarca* (FK), unidad, stockActual, stockMinimo, estadoAlerta | Catálogo y existencias (RF-01 a RF-06). |
| `salida_material` | **idSalida** (PK), fecha_Hora, *idUsuario* (FK), trabajadorDestino, *idInsumo* (FK), insumosRetirados | Un renglón por cada insumo entregado (RF-10). |
| `bitacora_actividad` | **idBitacora** (PK), fecha_HoraAccion, *idUsuario* (FK), tipoAccion (ALTA, BAJA, MODIFICACION, SALIDA, ENTRADA, LOGIN), modulo (Usuario / Insumo), detalleAccion | Registro de cada acción (RF-13). |

Relaciones (todas de uno a muchos): **Agrupa** (categoría → insumos), **Fabrica** (marca → insumos), **Registra** (usuario → salidas), **Afecta** (insumo → salidas) y **Realiza** (usuario → bitácora).

Reglas que cuida la propia base de datos:

- Claves foráneas: no se puede borrar un insumo con salidas ni un usuario con movimientos.
- `CHECK`: la existencia y el mínimo no pueden ser negativos y una salida siempre es mayor a 0.
- `UNIQUE`: no se repiten el usuario, el correo, la categoría ni la marca.
- Las cantidades son `DECIMAL(10,2)` para aceptar fracciones (ej. 0.25 litros, RF-08).

Para ver los datos: **http://localhost/phpmyadmin** › base de datos `picasso_inventario`.

---

## 5. La API, archivo por archivo

Todos los archivos responden JSON: `{"ok": true, ...}` cuando sale bien o `{"ok": false, "error": "mensaje"}` con un código HTTP (400 dato incorrecto, 401 sin sesión, 403 sin permiso, 404 no existe, 409 conflicto con una regla).

| Archivo | Método | Requisito | Qué hace |
|---|---|---|---|
| `config.php` | — | — | Datos de conexión (root sin contraseña, puerto 3306), zona horaria de México, dirección que va en el enlace del correo (`DIRECCION_SISTEMA`) y minutos que sirve (`MINUTOS_ENLACE`). |
| `conexion.php` | — | — | `conectar()`: abre PDO y, si no existe la base de datos, la instala con el script SQL. |
| `funciones.php` | — | — | Funciones comunes: `responder()`, `fallar()`, `leerDatos()`, `exigirSesion()`, `exigirAdministrador()`, `registrarBitacora()`, `actualizarEstadoAlerta()` y, para RNF-09, `crearEnlace()`, `cuentaDelEnlace()` y `enviarCorreo()`. |
| `sesion.php` | GET | — | Dice quién tiene la sesión abierta. |
| | POST `iniciar` | RNF-08 | Revisa la contraseña con `password_verify`, que la cuenta esté ACTIVA y registra LOGIN. |
| | POST `cerrar` | — | Cierra la sesión. |
| | POST `solicitar_clave` | RNF-09 | Si la cuenta existe y está activa: al Encargado le deja la solicitud al Administrador; al Administrador le manda un correo con un enlace. |
| | POST `revisar_enlace` | RNF-09 | Revisa que el enlace del correo siga sirviendo (paso 6). |
| | POST `restablecer` | RNF-09 | Guarda la contraseña nueva del Administrador (pasos 7 y 8). |
| `usuarios.php` | GET | RNF-05 | Lista de cuentas y solicitudes de clave pendientes. Solo Administrador. |
| | POST | RNF-04 | Crea la cuenta (usuario no repetido, contraseña cifrada). |
| | PUT | RNF-06 | Edita nombre, correo, rol y, si se escribe, la contraseña nueva. |
| | PATCH | RNF-08 | Dar de baja / Reactivar (nunca al único Administrador activo). |
| | DELETE | RNF-07 | Elimina solo cuentas sin movimientos y que no sean el único Administrador. |
| `catalogos.php` | GET | RF-01, RF-05 | Categorías, marcas, unidades y qué unidades van con cada categoría, para el formulario de insumos. |
| `insumos.php` | GET | RF-02, RF-05, RF-06 | Lista de insumos con categoría, marca y estado, en el orden del taller. |
| | POST | RF-01 | Alta con existencia 0 y estado SIN EXISTENCIA; código no repetido; unidad según la categoría; registra la marca nueva si se escribió. |
| | PUT | RF-03 | Edita los datos (no la existencia) con las mismas reglas del alta y recalcula la alerta. |
| | DELETE | RF-04 | Da de baja solo si no tiene salidas. |
| `reabastecimiento.php` | POST | RF-03 | Suma las entradas a la existencia (transacción) y registra ENTRADA. |
| `salidas.php` | POST | RF-07 a RF-10 | Registra el retiro del carrito (transacción, todo o nada) y registra SALIDA. |
| `reportes.php` | GET `consumo` | RF-11 | Suma de lo entregado por insumo en 7 o 30 días, de mayor a menor. |
| | GET `lista_compras` | RF-12 | Insumos POR ACABARSE o SIN EXISTENCIA (SIN EXISTENCIA primero). |
| | GET `bitacora` | RF-13 | Últimos 500 movimientos con el nombre del usuario (se obtiene con un JOIN, 3FN). |

### Reglas del alta y la edición de insumos (RF-01 y RF-03)

**Unidad según la categoría (excepción 4c).** La tabla `UNIDADES_POR_CATEGORIA` de `funciones.php` dice qué unidades van con cada categoría:

| Categoría | Unidades permitidas |
|---|---|
| Pinturas, Solventes y Barnices | Litros o Galones |
| Lijas | Pliegos, Piezas o Rollos |
| Cintas | Rollos |
| Consumibles | Piezas, Rollos o Pliegos |

`validarInsumo()` en `insumos.php` rechaza, por ejemplo, una pintura en Piezas o una cinta en Litros con el mensaje «La unidad «Piezas» no corresponde a la categoría Pinturas. Usa Litros o Galones.». `catalogos.php` manda esta misma tabla a la pantalla, así que el formulario avisa en cuanto se elige una combinación que no va (`errorDeUnidad()` en `NuevoInsumoDialog.tsx`) y no deja guardar. Para cambiar una regla basta con editar esa tabla en `funciones.php`.

**Marca nueva (excepción 3b).** En el selector de marca está la opción «+ Otra marca (escribirla)». Al guardar, la pantalla manda `marcaNueva` y `idDeMarca()` en `insumos.php`:

1. Busca si la marca ya existe. La comparación de MySQL (`utf8mb4_unicode_ci`) no distingue mayúsculas ni acentos, así que «sherwin williams» encuentra «Sherwin Williams» y no se repite.
2. Si no existe, la inserta en la tabla `marca` y registra «Registró la marca nueva «…»» en la bitácora.
3. La marca y el insumo se guardan en la misma transacción: si el insumo no se puede guardar (por ejemplo, el código ya existe), tampoco se guarda la marca.

### Cómo se calcula la alerta (RF-06)

`actualizarEstadoAlerta()` en `funciones.php` se llama después de cada alta, entrada, edición o salida:

```sql
UPDATE insumo SET estadoAlerta = CASE
  WHEN stockActual <= 0           THEN 'SIN EXISTENCIA'
  WHEN stockActual <= stockMinimo THEN 'POR ACABARSE'
  ELSE 'DISPONIBLE' END
WHERE idInsumo = ?
```

### «¿Olvidaste tu contraseña?» (RNF-09)

Depende del rol de la cuenta:

**Encargado: lo atiende el Administrador.** El modelo no tiene una tabla para solicitudes, así que se usa la bitácora:

1. El Encargado la pide → se guarda un renglón con el detalle «Solicitó restablecer su contraseña».
2. `usuarios.php` (GET) muestra al Administrador las solicitudes que todavía no tienen después un renglón «Asignó una contraseña nueva a @usuario».
3. Cuando el Administrador escribe una contraseña nueva en **Editar**, se guarda ese renglón y la solicitud desaparece de la lista.

**Administrador: le llega un correo** (si es el único Administrador, nadie más podría ayudarle).

1. `sesion.php` arma un enlace `http://localhost/picasso/?restablecer=idUsuario.vence.firma` y lo manda al correo de la cuenta con `mail()`.
2. La **firma** es un HMAC-SHA256 de `idUsuario|vence` usando como llave la **contraseña cifrada actual** (`hash_hmac` en `firmaEnlace()`). Nadie puede inventar un enlace porque no conoce esa contraseña cifrada, y en cuanto la contraseña cambia, la llave cambia y el enlace deja de servir: **se usa una sola vez y no hace falta una tabla nueva**.
3. `vence` es la hora límite (30 minutos, `MINUTOS_ENLACE`). Si ya pasó, el enlace no sirve (excepción 6a).
4. Al abrir el enlace, `App.tsx` cierra cualquier sesión abierta y `Login.tsx` muestra «Crear nueva contraseña». La pantalla llama a `revisar_enlace` y después a `restablecer`, que guarda la contraseña con `password_hash()` y registra «Asignó una contraseña nueva a @usuario» en la bitácora.
5. Para que nadie llene el correo de mensajes, si ya se mandó uno hace menos de 2 minutos no se manda otro (excepción 4c). Si no hay internet, se avisa y la solicitud queda en «Usuarios» para otro Administrador (excepción 4d).

**¿De dónde sale el correo?** `mail()` usa el programa *sendmail* de XAMPP, configurado en `C:\xampp\php\php.ini` (`sendmail_path`) y en `C:\xampp\sendmail\sendmail.ini` (servidor smtp.gmail.com, puerto 587, cuenta de Gmail y su **contraseña de aplicación**). Cada computadora usa su propia cuenta: en `sendmail.ini` se escriben `auth_username`, `auth_password` y `force_sender`. Esa contraseña nunca va en el código ni en GitHub. Si sendmail no está configurado, el sistema avisa y deja la solicitud en «Usuarios» (excepción 4d).

### Seguridad básica (para explicar)

- **Contraseñas cifradas:** se guardan con `password_hash()` y se comparan con `password_verify()`. Nunca en texto plano.
- **Consultas preparadas:** todas las consultas usan `prepare()` y `?`, lo que evita la inyección SQL.
- **Sesión de PHP:** después de iniciar sesión, PHP recuerda al usuario con la cookie `PHPSESSID`.
- **Permisos por rol:** `exigirAdministrador()` bloquea Usuarios y Reportes al Encargado (responde 403).
- **Transacciones:** en entradas y salidas, o se guarda todo o no se guarda nada.

---

## 6. Las pantallas

- **`src/lib/api.ts`** tiene una función por cada acción (`iniciarSesion`, `obtenerInsumos`, `registrarSalida`…). Cada una llama al archivo PHP y convierte los nombres de las columnas (`stockActual`) a los de las pantallas (`existencia`).
- **`useDatos()`** (en el mismo archivo) carga los datos al abrir una pantalla y da `recargar()` para pedirlos otra vez después de guardar.
- Si la API responde **401** (la sesión terminó o la cuenta se dio de baja), `App.tsx` regresa al inicio de sesión.
- El **carrito de entrega** (RF-07, RF-08 y RF-09) vive solo en la pantalla: la existencia cambia hasta presionar «Registrar retiro». Cada insumo se quita con su botón de basura y «Vaciar carrito» quita todos de una vez (RF-09).
- Los **reportes de Excel** se arman en el navegador con los datos que manda `reportes.php`.

---

## 7. Dónde se programa cada requisito

| Requisito | Pantalla (`views.tsx` / `Login.tsx`) | API |
|---|---|---|
| RNF-04 Alta de accesos | Usuarios › Crear usuario | `usuarios.php` POST |
| RNF-05 Consulta de accesos | Usuarios › Cuentas registradas | `usuarios.php` GET |
| RNF-06 Edición de accesos | Usuarios › Editar | `usuarios.php` PUT |
| RNF-07 Baja de accesos | Usuarios › Eliminar | `usuarios.php` DELETE |
| RNF-08 Bloqueo de cuentas | Usuarios › Dar de baja / Reactivar | `usuarios.php` PATCH, `sesion.php` |
| RNF-09 Restablecimiento de clave | Inicio de sesión › ¿Olvidaste tu contraseña? y pantalla «Crear nueva contraseña» (`Login.tsx`) | `sesion.php` + `usuarios.php` |
| RF-01 Alta de insumos | Reabastecer › Nuevo insumo (`NuevoInsumoDialog.tsx`) | `insumos.php` POST, `catalogos.php` |
| RF-02 Consulta de insumos | Buscador de Reabastecer y Entregar | `insumos.php` GET |
| RF-03 Edición de insumos | Reabastecer (cantidades y Editar) | `reabastecimiento.php`, `insumos.php` PUT |
| RF-04 Baja de insumos | Tarjeta › Dar de baja | `insumos.php` DELETE |
| RF-05 Categorización | Filtros de categoría | `insumos.php` GET, `catalogos.php` |
| RF-06 Alertas de stock | Panel general y Alertas | `actualizarEstadoAlerta()` |
| RF-07 a RF-09 Carrito | Entregar | (en la pantalla) |
| RF-10 Confirmación general | Entregar › Registrar retiro | `salidas.php` |
| RF-11 Reportes de consumo | Reportes › Consumo por periodo | `reportes.php?tipo=consumo` |
| RF-12 Lista de compras | Reportes › Exportar insumos bajos | `reportes.php?tipo=lista_compras` |
| RF-13 Bitácora | Reportes › Bitácora | `registrarBitacora()`, `reportes.php?tipo=bitacora` |

---

## 8. Cómo actualizar después de cambiar el código

- **Requisito:** Node.js 20 o más nuevo (https://nodejs.org). La primera vez, `publicar-en-xampp.bat` ejecuta `npm install`.
- **Para ver los cambios en XAMPP:** haz doble clic en `publicar-en-xampp.bat`. Vuelve a generar `pantallas-compiladas/` (`npm run build:xampp`) y ejecuta `instalar-en-xampp.bat`. Los datos de la base de datos no se tocan.
- **Para compartir los cambios:** sube a GitHub también la carpeta `pantallas-compiladas/`, así tus compañeros pueden probar sin Node.js.
- **Para programar con recarga automática:** con XAMPP encendido, ejecuta `npm run dev`. Las peticiones a `/picasso/api` se reenvían al Apache de XAMPP (ver `vite.config.ts` y `.env.development`), así que se usa la misma base de datos.
- Si solo cambias archivos PHP (`servidor/`), basta con `instalar-en-xampp.bat`.

---

## 9. Problemas comunes

| Síntoma | Qué hacer |
|---|---|
| «No hay conexión con el servidor» | Apache o MySQL están apagados: enciéndelos en XAMPP. |
| Apache no enciende | Otro programa usa el puerto 80 (por ejemplo, Skype o IIS). Ciérralo, o cambia el puerto de Apache (XAMPP › Apache › Config › httpd.conf, `Listen 8080`) y entra a http://localhost:8080/picasso |
| MySQL no enciende | Revisa que no haya otro MySQL abierto. En XAMPP › MySQL › Logs aparece el motivo. |
| «Error del servidor: Access denied for user 'root'» | Le pusiste contraseña a root: escríbela en `api/config.php` (`DB_CLAVE`). |
| Quiero empezar con la base de datos limpia | En phpMyAdmin elimina la base `picasso_inventario` y vuelve a abrir http://localhost/picasso: se crea de nuevo. |
| No llega el correo de «¿Olvidaste tu contraseña?» | Revisa la carpeta de spam y que haya internet. En `C:\xampp\sendmail\error.log` aparece el motivo (por ejemplo, «Username and Password not accepted»: la contraseña de aplicación de `sendmail.ini` ya no sirve). |
| El enlace del correo no abre | Ábrelo en la computadora donde está XAMPP (la dirección es `localhost`), antes de 30 minutos y una sola vez. Si no, pide otro. |
| Olvidé la contraseña del único Administrador y no hay internet | Las contraseñas están cifradas y no se pueden leer. Ejecuta en phpMyAdmin › SQL la consulta de abajo: regresa la cuenta `hramos` a la contraseña `picasso` y la deja ACTIVA. |

```sql
UPDATE usuario
SET `contraseñaUsuario` = '$2y$10$JTA37tpkcvsN6187x11K8uulIaDj9Zm9fLHbRI4Qag4K1m29SLS/.', estadoUsuario = 'ACTIVO'
WHERE username = 'hramos';
```

---

## 10. Preguntas que pueden hacer en la revisión

- **¿Por qué PHP y no Node?** Porque XAMPP ya trae Apache, PHP y MySQL; el sistema funciona en la computadora del taller sin instalar nada más ni usar internet (RNF-03).
- **¿Dónde se valida?** En las dos partes: la pantalla avisa rápido (por ejemplo, el botón deshabilitado) y la API vuelve a revisar todo antes de guardar, porque es la que manda.
- **¿Qué pasa si dos personas entregan el mismo material al mismo tiempo?** `salidas.php` lee la existencia con `SELECT ... FOR UPDATE` dentro de una transacción; si al guardar ya no alcanza, no descuenta nada (excepción 4a de RF-10).
- **¿Por qué no se guarda el nombre del usuario en la bitácora?** Por la 3FN: se guarda `idUsuario` y el nombre se obtiene de `usuario` con un JOIN.
- **¿Dónde quedan las entradas de material?** El modelo no tiene tabla de entradas: cada entrada suma a `stockActual` y queda registrada como `ENTRADA` en la bitácora (como dice el ERS en RI-02).
- **¿Por qué el Administrador recupera su contraseña por correo y el Encargado no?** Si el único Administrador olvida su contraseña, nadie más puede asignarle una. Es la única función que usa internet; todo lo demás funciona sin internet (RNF-03).
