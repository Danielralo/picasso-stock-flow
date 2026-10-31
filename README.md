# Sistema de Inventario · Picasso Autosport

Sistema web local para controlar el inventario del taller de hojalatería y pintura **Picasso Autosport**. Permite dar de alta, editar y dar de baja insumos, registrar entradas (Reabastecer) y salidas (Entregar), ver alertas de stock, exportar reportes a Excel, consultar la bitácora y administrar las cuentas de usuario.

Proyecto de **Ingeniería de Software** · Instituto Tecnológico de León · Ingeniería en Sistemas Computacionales
Docente: Saez de Nanclares Rodríguez Ruth
Equipo: Cruz Garduño Isaac Emmanuel · Becerra Godínez Cristofer Haret · Ramos López Héctor Daniel

---

## Probarlo en tu computadora

Necesitas **Windows** y **XAMPP 8** (Apache + PHP 8 + MySQL). No necesitas Node.js.

1. **Descarga el proyecto.** En GitHub presiona el botón verde **Code › Download ZIP** y descomprímelo. También puedes usar `git clone https://github.com/Danielralo/picasso-stock-flow.git`.
2. **Instala XAMPP** desde https://www.apachefriends.org y deja la carpeta que propone (`C:\xampp`).
3. **Haz doble clic en `instalar-en-xampp.bat`.** Copia el sistema a `C:\xampp\htdocs\picasso`.
4. **Abre el XAMPP Control Panel** y presiona **Start** en **Apache** y en **MySQL**.
5. **Entra a http://localhost/picasso**

La primera vez, el sistema crea solo la base de datos `picasso_inventario` con sus 6 tablas y datos de ejemplo. No hay que importar nada en phpMyAdmin.

### Cuentas de prueba

| Usuario | Contraseña | Rol |
|---|---|---|
| `hramos` | `picasso` | Administrador (dueño) |
| `lmarquez` | `encargado` | Encargado de Almacén |

### Si algo no funciona

| Qué pasa | Qué hacer |
|---|---|
| «No hay conexión con el servidor» | Apache o MySQL están apagados: enciéndelos en XAMPP. |
| Apache no enciende | Otro programa usa el puerto 80. Ciérralo o cambia el puerto de Apache a 8080 y entra a http://localhost:8080/picasso |
| «Access denied for user 'root'» | Tu MySQL tiene contraseña: escríbela en `C:\xampp\htdocs\picasso\api\config.php` (`DB_CLAVE`). |
| Quiero empezar con datos limpios | En http://localhost/phpmyadmin elimina la base `picasso_inventario` y vuelve a abrir el sistema: se crea de nuevo. |
| No llega el correo de «¿Olvidaste tu contraseña?» | El correo del Administrador de ejemplo es `hramos@example.com`. Cámbialo por el tuyo en **Usuarios › Editar** y configura una cuenta de Gmail en `C:\xampp\sendmail\sendmail.ini` (ver `MANUAL_TECNICO.md`, RNF-09). Sin correo configurado, la solicitud queda en **Usuarios** para que otro Administrador asigne la contraseña. |

---

## Qué hay en cada carpeta

| Carpeta o archivo | Qué es |
|---|---|
| `servidor/api/` | La API en PHP (backend): sesión, usuarios, insumos, entradas, salidas y reportes. |
| `servidor/base-de-datos/` | `picasso_inventario.sql`: crea la base de datos, las 6 tablas en 3FN y los datos iniciales. |
| `src/` | Código fuente de las pantallas (React + TypeScript + Tailwind CSS). |
| `spa/` | Punto de entrada de la versión que se instala en XAMPP. |
| `pantallas-compiladas/` | Las pantallas ya compiladas que se copian a XAMPP. Se generan con `npm run build:xampp`; no se editan a mano. |
| `public/` | Icono de la página y `robots.txt`. |
| `documentacion/` | ERS, Modelo de Diseño, modelo relacional, guía de estudio del código y el prompt original de Lovable. |
| `instalar-en-xampp.bat` | Instala el sistema en XAMPP sin Node.js. |
| `publicar-en-xampp.bat` | Vuelve a compilar las pantallas (requiere Node.js) y las instala en XAMPP. |
| `MANUAL_TECNICO.md` | Cómo funciona cada parte y cómo resolver problemas. |

## Documentación

| Documento | Para qué |
|---|---|
| [`documentacion/Documento_de_Especificacion_de_Requisitos_Final.docx`](documentacion/Documento_de_Especificacion_de_Requisitos_Final.docx) | ERS según el estándar IEEE 830. |
| [`documentacion/Modelo_de_Diseño_Final.docx`](documentacion/Modelo_de_Diseño_Final.docx) | Arquitectura, modelo entidad-relación, normalización y casos de uso con sus diagramas. |
| [`documentacion/Modelo_Relacional_y_Normalizacion.xlsx`](documentacion/Modelo_Relacional_y_Normalizacion.xlsx) | Modelo relacional y normalización hasta 3FN. |
| [`documentacion/Guia_de_estudio_del_codigo.docx`](documentacion/Guia_de_estudio_del_codigo.docx) | Explica cada carpeta, cada archivo y cada línea del código. |
| [`MANUAL_TECNICO.md`](MANUAL_TECNICO.md) | Resumen técnico y solución de problemas. |

---

## Para programar

1. Instala **Node.js 20 o más nuevo** desde https://nodejs.org
2. En la carpeta del proyecto ejecuta `npm install`.
3. Con Apache y MySQL encendidos, ejecuta `npm run dev`. Las pantallas se recargan solas y usan la API de XAMPP en `/picasso/api` (ver `vite.config.ts` y `.env.development`).
4. Para ver los cambios en `http://localhost/picasso`, haz doble clic en `publicar-en-xampp.bat`. Sube también a GitHub la carpeta `pantallas-compiladas/` para que los demás puedan probar sin Node.js.

**Tecnologías:** React 19, TypeScript, Tailwind CSS 4 y componentes shadcn/ui en las pantallas; PHP 8 con PDO en la API; MySQL (MariaDB de XAMPP) en la base de datos.

**Lovable:** el primer prototipo de las pantallas se generó con [Lovable](https://lovable.dev) y este repositorio sigue conectado a ese proyecto: lo que se sube a `main` también aparece allá. El prompt original está en `documentacion/prompt-original-lovable.md`.
