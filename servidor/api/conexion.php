<?php
/*
 * conexion.php — Abre la conexión con la base de datos usando PDO.
 *
 * La primera vez que se usa el sistema, la base de datos todavía no existe.
 * En ese caso este archivo la crea solo, ejecutando el script
 * base-de-datos/picasso_inventario.sql (tablas + datos iniciales).
 * Así basta con encender XAMPP y abrir http://localhost/picasso
 */

require_once __DIR__ . '/config.php';

function conectar(): PDO
{
    static $pdo = null;          // se reutiliza la misma conexión durante la petición
    if ($pdo !== null) {
        return $pdo;
    }

    $opciones = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // los errores de SQL lanzan excepción
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // cada fila llega como arreglo asociativo
        PDO::ATTR_EMULATE_PREPARES   => false,                  // consultas preparadas reales (evita inyección SQL)
    ];

    // 1) Conectarse al servidor MySQL (todavía sin elegir base de datos)
    $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PUERTO . ';charset=utf8mb4';
    $pdo = new PDO($dsn, DB_USUARIO, DB_CLAVE, $opciones);

    // 2) Si la base de datos no existe o está vacía, se instala
    $existe = $pdo->query("SHOW DATABASES LIKE '" . DB_NOMBRE . "'")->fetchColumn();
    if (!$existe) {
        instalarBaseDeDatos($pdo);
    }
    $pdo->exec('USE `' . DB_NOMBRE . '`');
    if (!$pdo->query("SHOW TABLES LIKE 'usuario'")->fetchColumn()) {
        instalarBaseDeDatos($pdo);
        $pdo->exec('USE `' . DB_NOMBRE . '`');
    }

    return $pdo;
}

/** Ejecuta el script SQL (crea la base de datos, las 6 tablas y los datos iniciales). */
function instalarBaseDeDatos(PDO $pdo): void
{
    $sql = file_get_contents(__DIR__ . '/../base-de-datos/picasso_inventario.sql');
    $sql = preg_replace('/^\s*--.*$/m', '', $sql);           // quita los comentarios de una línea
    foreach (preg_split('/;\s*\R/', $sql) as $sentencia) {   // separa en sentencias por «;» al final de línea
        if (trim($sentencia) !== '') {
            $pdo->exec($sentencia);
        }
    }
}
