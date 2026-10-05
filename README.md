# Picasso Inventory Hub

Actúa como un desarrollador Frontend experto en React, Tailwind CSS y Shadcn UI. Necesito crear un prototipo funcional para una aplicación web de inventario llamada "Picasso Autosport", diseñada para un taller de hojalatería y pintura automotriz. 

El sistema debe tener un diseño limpio, moderno y corporativo, utilizando las siguientes directrices de diseño y arquitectura:

1. SISTEMA DE DISEÑO Y UI:

- Paleta de colores principal: Fondo general gris muy claro o blanco (#F8F9FA). Barras de navegación, encabezados de tablas y botones primarios en negro o azul marino muy oscuro (#0F172A). Acentos y botones secundarios (como el botón de login o menús activos) en color arena/beige (#E5D3B3). Alertas en rojo suave/pastel para poco stock y verde para estados activos.

- Tipografía: Sans-serif moderna (Inter o Roboto).

- Estilo de componentes: Tarjetas (cards) blancas con bordes muy sutiles y esquinas redondeadas (border-radius: 12px a 16px). Botones estilo píldora (totalmente redondeados) para acciones principales y botones cuadrados con esquinas suaves para controles de cantidad (+ y -).

2. ARQUITECTURA DE NAVEGACIÓN Y LAYOUT:

- Pantalla de Login: Centrada, con un espacio para el logo negro de "Picasso Autosport" con detalles rojos. Inputs de usuario y contraseña redondeados, y un botón de "Iniciar sesión" en color arena.

- Layout Principal (Post-login): 

  - Topbar (Barra superior): Debe contener 4 botones de acción principales para el Administrador: "Insumos", "Usuarios", "Reportes" y "Cerrar Sesión" (Logout).

  - Sidebar (Panel izquierdo): Dinámico. Cambiará sus opciones dependiendo de la sección seleccionada en la barra superior.

3. VISTAS Y PANTALLAS A DESARROLLAR:

A) Inicio (Dashboard):

- Mensaje de bienvenida destacado en la parte superior.

- Tarjeta de "Alertas de Stock": Una tabla limpia que muestre los insumos (como thinner, lijas, barniz) que están "POR ACABARSE" o "SIN EXISTENCIA", utilizando insignias (badges) rojas.

B) Sección "Insumos" (Gestión de inventario):

- Al hacer clic en "Insumos" en el Topbar, el Sidebar izquierdo debe mostrar el título "Insumos" con 2 sub-opciones: "Reabastecer" y "Entregar".

- Vista "Reabastecer Insumos": Mostrar un título claro. Abajo, un grid o lista de tarjetas. Cada tarjeta debe mostrar: la imagen del insumo, el nombre, y controles con botones de "+" y "-" para indicar la cantidad a ingresar. Al final de la página, fijar dos botones: "Guardar" (primario) y "Cancelar" (secundario).

- Vista "Entregar" (Asignación): Una interfaz estilo "Carrito de compras" para añadir de forma rápida insumos solicitados por los trabajadores, con un botón para registrar el retiro.

C) Sección "Usuarios":

- Una tabla de "Cuentas Registradas" que muestre el Nombre, Usuario, Rol (ej. Administrador, Encargado) y Estado (con badge verde de "ACTIVO").

- Incluir un botón primario oscuro "+ Crear Usuario" para darlos de alta en el punto de entrega.

D) Sección "Reportes":

- Una vista de "Bitácora de Actividades" (Audit Log) mostrando fecha, usuario, acción (ENTRADA, SALIDA, EDICIÓN), y detalle del movimiento.

- Un botón en la parte superior derecha para "Exportar Reporte" (simulando exportación a Excel).

4. INTERACTIVIDAD:

- Añadir estados de "hover" sutiles en todos los botones y filas de las tablas.

- Los botones de + y - en la pantalla de "Reabastecer" deben actualizar un contador numérico en tiempo real.

- Usa íconos de la librería Lucide React (ej. carrito de compras, usuarios, archivo de texto, log out) para acompañar los textos de los botones y menús.

Por favor, genera el código completo del prototipo asegurando que la navegación entre las vistas superiores y los menús laterales funcione correctamente mediante estados de React.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/12b66ebf-b08d-4d2f-a408-8baffcd827e2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
