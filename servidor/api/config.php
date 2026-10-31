<?php
/*
 * config.php — Datos para conectarse a MySQL (MariaDB) de XAMPP.
 *
 * Con XAMPP recién instalado el usuario es «root» y no tiene contraseña.
 * Si en tu computadora le pusiste contraseña a root, escríbela en DB_CLAVE.
 */

define('DB_HOST', getenv('PICASSO_DB_HOST') ?: '127.0.0.1');
define('DB_PUERTO', getenv('PICASSO_DB_PUERTO') ?: '3306');
define('DB_NOMBRE', 'picasso_inventario');
define('DB_USUARIO', getenv('PICASSO_DB_USUARIO') ?: 'root');
define('DB_CLAVE', getenv('PICASSO_DB_CLAVE') ?: '');

// Hora de México para las fechas de la bitácora y de las salidas.
date_default_timezone_set('America/Mexico_City');

/*
 * Correo (RNF-09 para el Administrador).
 * El correo sale con la función mail() de PHP, que usa el «sendmail» de XAMPP
 * (C:\xampp\sendmail\sendmail.ini tiene la cuenta de Gmail que envía).
 *
 * DIRECCION_SISTEMA: dirección que va en el enlace del correo.
 * MINUTOS_ENLACE:    tiempo que sirve el enlace.
 */
define('DIRECCION_SISTEMA', getenv('PICASSO_URL') ?: 'http://localhost/picasso/');
define('MINUTOS_ENLACE', 30);
