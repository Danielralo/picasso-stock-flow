<?php
/*
 * Ejemplo de backend PHP/MySQL (PDO) para registrar un ticket de reabastecimiento.
 * Recibe: { "id_usuario": 1, "detalles": [ { "id_insumo": "TH100", "cantidad_agregada": 2.5 }, ... ] }
 *
 * Tablas esperadas (3FN):
 *   CREATE TABLE TICKETS_REABASTECIMIENTO (
 *     id_ticket INT AUTO_INCREMENT PRIMARY KEY,
 *     id_usuario INT NOT NULL,
 *     fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 *     FOREIGN KEY (id_usuario) REFERENCES USUARIOS(id_usuario)
 *   );
 *   CREATE TABLE TICKET_DETALLES (
 *     id_detalle INT AUTO_INCREMENT PRIMARY KEY,
 *     id_ticket INT NOT NULL,
 *     id_insumo VARCHAR(20) NOT NULL,
 *     cantidad_agregada DECIMAL(10,2) NOT NULL CHECK (cantidad_agregada > 0),
 *     FOREIGN KEY (id_ticket) REFERENCES TICKETS_REABASTECIMIENTO(id_ticket),
 *     FOREIGN KEY (id_insumo) REFERENCES INSUMOS(id_insumo)
 *   );
 */
header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
$idUsuario = (int)($input['id_usuario'] ?? 0);
$detalles = $input['detalles'] ?? [];

if ($idUsuario <= 0 || !is_array($detalles) || count($detalles) === 0) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Payload inválido']);
    exit;
}

$pdo = new PDO('mysql:host=localhost;dbname=picasso;charset=utf8mb4', 'usuario', 'clave', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);

try {
    $pdo->beginTransaction();

    // 1) Ticket general
    $pdo->prepare('INSERT INTO TICKETS_REABASTECIMIENTO (id_usuario, fecha) VALUES (?, NOW())')
        ->execute([$idUsuario]);
    $idTicket = (int)$pdo->lastInsertId();

    // 2) Detalle y 3) UPDATE de stock, dentro de la misma transacción
    $insDetalle = $pdo->prepare('INSERT INTO TICKET_DETALLES (id_ticket, id_insumo, cantidad_agregada) VALUES (?, ?, ?)');
    $updStock = $pdo->prepare('UPDATE INSUMOS SET stock_actual = stock_actual + ? WHERE id_insumo = ?');

    foreach ($detalles as $d) {
        $id = (string)($d['id_insumo'] ?? '');
        $cant = (float)($d['cantidad_agregada'] ?? 0);
        if ($id === '' || $cant <= 0) {
            throw new InvalidArgumentException('Detalle inválido');
        }
        $insDetalle->execute([$idTicket, $id, $cant]);
        $updStock->execute([$cant, $id]);
        if ($updStock->rowCount() === 0) {
            throw new InvalidArgumentException("Insumo inexistente: $id");
        }
    }

    $pdo->commit();
    echo json_encode(['ok' => true, 'id_ticket' => $idTicket]);
} catch (Throwable $e) {
    $pdo->rollBack();
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
