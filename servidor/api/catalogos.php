<?php
/*
 * catalogos.php — Listas para los formularios de insumos (RF-01, RF-03 y RF-05).
 *
 *   GET → categorías (tabla CATEGORIA), marcas (tabla MARCA), unidades de medida
 *         y las unidades que se permiten en cada categoría.
 */

require_once __DIR__ . '/funciones.php';

exigirSesion();
$pdo = conectar();

responder([
    // Orden que pidió el cliente: lijas y cintas primero, barniz al final
    'categorias' => $pdo->query(
        "SELECT idCategoria, nombreCategoria FROM categoria
         ORDER BY FIELD(nombreCategoria, 'Lijas', 'Cintas', 'Pinturas', 'Solventes', 'Consumibles', 'Barnices'), nombreCategoria"
    )->fetchAll(),
    'marcas'     => $pdo->query('SELECT idMarca, nombreMarca FROM marca ORDER BY nombreMarca')->fetchAll(),
    // Valores del diccionario de datos del ERS para el campo «unidad» (funciones.php)
    'unidades'   => UNIDADES,
    // Unidades permitidas en cada categoría (excepción 4c de RF-01), para avisar desde la pantalla
    'unidadesPorCategoria' => UNIDADES_POR_CATEGORIA,
]);
