<?php
/**
 * GiraFila — Lightweight LAN Central Persistence API (SQLite)
 * Aligned with HARNESS/Security/SecurityGovernance.md and DatabaseAndRls.md
 * Zero external dependencies: Uses native PHP 8.4 PDO SQLite
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$dbPath = __DIR__ . DIRECTORY_SEPARATOR . 'girafila.db';

try {
    $pdo = new PDO('sqlite:' . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo->exec("PRAGMA secure_delete = ON;");

    // Initialize SQLite tables if not present
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            date TEXT NOT NULL,
            location TEXT NOT NULL,
            description TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            event_id INTEGER NOT NULL,
            allows_children INTEGER NOT NULL DEFAULT 1,
            allows_adults INTEGER NOT NULL DEFAULT 1,
            only_children INTEGER NOT NULL DEFAULT 0,
            only_adults INTEGER NOT NULL DEFAULT 0,
            attendant_name TEXT NOT NULL,
            description TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (event_id) REFERENCES events (id)
        );

        CREATE TABLE IF NOT EXISTS visitors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id INTEGER NOT NULL,
            qr_code INTEGER NOT NULL,
            name TEXT NOT NULL,
            gender TEXT,
            age INTEGER,
            is_child INTEGER NOT NULL DEFAULT 0,
            phone TEXT,
            has_phone INTEGER NOT NULL DEFAULT 0,
            guardian_qr_code INTEGER,
            created_at TEXT NOT NULL,
            UNIQUE(event_id, qr_code),
            FOREIGN KEY (event_id) REFERENCES events (id)
        );

        CREATE TABLE IF NOT EXISTS attendances (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id INTEGER NOT NULL,
            service_id INTEGER NOT NULL,
            visitor_qr_code INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            UNIQUE(event_id, service_id, visitor_qr_code),
            FOREIGN KEY (event_id) REFERENCES events (id),
            FOREIGN KEY (service_id) REFERENCES services (id)
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            entity TEXT NOT NULL,
            record_id TEXT NOT NULL,
            action TEXT NOT NULL,
            before_json TEXT,
            after_json TEXT,
            data_json TEXT,
            trace_hash TEXT NOT NULL,
            timestamp TEXT NOT NULL
        );
    ");

    // Dynamic column additions for existing databases
    try { $pdo->exec("ALTER TABLE services ADD COLUMN allows_children INTEGER NOT NULL DEFAULT 1"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE services ADD COLUMN allows_adults INTEGER NOT NULL DEFAULT 1"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE visitors ADD COLUMN gender TEXT"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE visitors ADD COLUMN age INTEGER"); } catch (Exception $e) {}

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'GF-SYSTEM-SYS-001', 'message' => 'Erro ao inicializar base de dados SQLite: ' . $e->getMessage()]);
    exit;
}

$entity = $_GET['entity'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

function getJsonInput() {
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?: [];
}

try {
    switch ($entity) {
        case 'info':
            $hostIp = gethostbyname(gethostname());
            echo json_encode([
                'status' => 'online',
                'storage' => 'SQLite (LAN Central)',
                'host' => gethostname(),
                'ip' => $hostIp,
                'time' => gmdate('Y-m-d\TH:i:s\Z')
            ]);
            break;

        case 'events':
            if ($method === 'GET') {
                $stmt = $pdo->query("SELECT * FROM events ORDER BY id DESC");
                echo json_encode($stmt->fetchAll());
            } elseif ($method === 'POST') {
                $data = getJsonInput();
                $stmt = $pdo->prepare("INSERT INTO events (name, date, location, description, created_at) VALUES (:name, :date, :location, :description, :created_at)");
                $stmt->execute([
                    ':name' => $data['name'],
                    ':date' => $data['date'],
                    ':location' => $data['location'],
                    ':description' => $data['description'] ?? '',
                    ':created_at' => $data['created_at'] ?? gmdate('Y-m-d\TH:i:s\Z')
                ]);
                $id = $pdo->lastInsertId();
                echo json_encode(array_merge(['id' => (int)$id], $data));
            } elseif ($method === 'PUT') {
                $id = (int)($_GET['id'] ?? 0);
                $data = getJsonInput();
                $stmt = $pdo->prepare("UPDATE events SET name=:name, date=:date, location=:location, description=:description WHERE id=:id");
                $stmt->execute([
                    ':name' => $data['name'],
                    ':date' => $data['date'],
                    ':location' => $data['location'],
                    ':description' => $data['description'] ?? '',
                    ':id' => $id
                ]);
                $row = $pdo->query("SELECT * FROM events WHERE id = $id")->fetch();
                echo json_encode($row);
            } elseif ($method === 'DELETE') {
                $id = (int)($_GET['id'] ?? 0);
                // Check for dependent services
                $check = $pdo->prepare("SELECT COUNT(*) as cnt FROM services WHERE event_id = :id");
                $check->execute([':id' => $id]);
                if ($check->fetch()['cnt'] > 0) {
                    http_response_code(409);
                    echo json_encode(['error' => 'GF-EVENT-REG-001', 'message' => 'Evento possui serviços vinculados.']);
                    exit;
                }
                // Check for dependent visitors
                $checkV = $pdo->prepare("SELECT COUNT(*) as cnt FROM visitors WHERE event_id = :id");
                $checkV->execute([':id' => $id]);
                if ($checkV->fetch()['cnt'] > 0) {
                    http_response_code(409);
                    echo json_encode(['error' => 'GF-EVENT-REG-001', 'message' => 'Evento possui visitantes vinculados.']);
                    exit;
                }
                $pdo->prepare("DELETE FROM events WHERE id = :id")->execute([':id' => $id]);
                $pdo->prepare("DELETE FROM audit_logs WHERE entity = 'events' AND record_id = :id")->execute([':id' => (string)$id]);
                $pdo->exec("VACUUM;");
                echo json_encode(['status' => 'deleted', 'id' => $id]);
            }
            break;

        case 'services':
            if ($method === 'GET') {
                if (!empty($_GET['event_id'])) {
                    $stmt = $pdo->prepare("SELECT * FROM services WHERE event_id = :event_id ORDER BY id DESC");
                    $stmt->execute([':event_id' => (int)$_GET['event_id']]);
                } else {
                    $stmt = $pdo->query("SELECT * FROM services ORDER BY id DESC");
                }
                $list = array_map(function($row) {
                    $row['id'] = (int)$row['id'];
                    $row['event_id'] = (int)$row['event_id'];
                    $row['allows_children'] = isset($row['allows_children']) ? (bool)$row['allows_children'] : (!$row['only_adults']);
                    $row['allows_adults'] = isset($row['allows_adults']) ? (bool)$row['allows_adults'] : (!$row['only_children']);
                    $row['only_children'] = (bool)$row['only_children'];
                    $row['only_adults'] = (bool)$row['only_adults'];
                    return $row;
                }, $stmt->fetchAll());
                echo json_encode($list);
            } elseif ($method === 'POST') {
                $data = getJsonInput();

                $allowsChildren = isset($data['allows_children']) ? (!empty($data['allows_children']) ? 1 : 0) : (!empty($data['only_children']) ? 1 : 1);
                $allowsAdults = isset($data['allows_adults']) ? (!empty($data['allows_adults']) ? 1 : 0) : (!empty($data['only_adults']) ? 1 : 1);
                $onlyChildren = ($allowsChildren && !$allowsAdults) ? 1 : 0;
                $onlyAdults = ($allowsAdults && !$allowsChildren) ? 1 : 0;

                $stmt = $pdo->prepare("INSERT INTO services (name, event_id, allows_children, allows_adults, only_children, only_adults, attendant_name, description, created_at) VALUES (:name, :event_id, :allows_children, :allows_adults, :only_children, :only_adults, :attendant_name, :description, :created_at)");
                $stmt->execute([
                    ':name' => $data['name'],
                    ':event_id' => (int)$data['event_id'],
                    ':allows_children' => $allowsChildren,
                    ':allows_adults' => $allowsAdults,
                    ':only_children' => $onlyChildren,
                    ':only_adults' => $onlyAdults,
                    ':attendant_name' => $data['attendant_name'],
                    ':description' => $data['description'] ?? '',
                    ':created_at' => $data['created_at'] ?? gmdate('Y-m-d\TH:i:s\Z')
                ]);
                $id = $pdo->lastInsertId();
                $data['id'] = (int)$id;
                $data['allows_children'] = (bool)$allowsChildren;
                $data['allows_adults'] = (bool)$allowsAdults;
                $data['only_children'] = (bool)$onlyChildren;
                $data['only_adults'] = (bool)$onlyAdults;
                echo json_encode($data);
            } elseif ($method === 'PUT') {
                $id = (int)($_GET['id'] ?? 0);
                $data = getJsonInput();
                $allowsChildren = !empty($data['allows_children']) ? 1 : 0;
                $allowsAdults = !empty($data['allows_adults']) ? 1 : 0;
                $onlyChildren = ($allowsChildren && !$allowsAdults) ? 1 : 0;
                $onlyAdults = ($allowsAdults && !$allowsChildren) ? 1 : 0;
                $stmt = $pdo->prepare("UPDATE services SET name=:name, event_id=:event_id, allows_children=:allows_children, allows_adults=:allows_adults, only_children=:only_children, only_adults=:only_adults, attendant_name=:attendant_name, description=:description WHERE id=:id");
                $stmt->execute([
                    ':name' => $data['name'],
                    ':event_id' => (int)$data['event_id'],
                    ':allows_children' => $allowsChildren,
                    ':allows_adults' => $allowsAdults,
                    ':only_children' => $onlyChildren,
                    ':only_adults' => $onlyAdults,
                    ':attendant_name' => $data['attendant_name'],
                    ':description' => $data['description'] ?? '',
                    ':id' => $id
                ]);
                $row = $pdo->query("SELECT * FROM services WHERE id = $id")->fetch();
                $row['id'] = (int)$row['id'];
                $row['event_id'] = (int)$row['event_id'];
                $row['allows_children'] = (bool)$row['allows_children'];
                $row['allows_adults'] = (bool)$row['allows_adults'];
                $row['only_children'] = (bool)$row['only_children'];
                $row['only_adults'] = (bool)$row['only_adults'];
                echo json_encode($row);
            } elseif ($method === 'DELETE') {
                $id = (int)($_GET['id'] ?? 0);
                // Check for dependent attendances
                $check = $pdo->prepare("SELECT COUNT(*) as cnt FROM attendances WHERE service_id = :id");
                $check->execute([':id' => $id]);
                if ($check->fetch()['cnt'] > 0) {
                    http_response_code(409);
                    echo json_encode(['error' => 'GF-SERV-REG-001', 'message' => 'Serviço possui atendimentos vinculados.']);
                    exit;
                }
                $pdo->prepare("DELETE FROM services WHERE id = :id")->execute([':id' => $id]);
                $pdo->prepare("DELETE FROM audit_logs WHERE entity = 'services' AND record_id = :id")->execute([':id' => (string)$id]);
                $pdo->exec("VACUUM;");
                echo json_encode(['status' => 'deleted', 'id' => $id]);
            }
            break;

        case 'visitors':
            if ($method === 'GET') {
                if (!empty($_GET['visitor_id'])) {
                    $stmt = $pdo->prepare("SELECT * FROM visitors WHERE id = :id LIMIT 1");
                    $stmt->execute([':id' => (int)$_GET['visitor_id']]);
                    $row = $stmt->fetch();
                    if ($row) {
                        $row['id'] = (int)$row['id'];
                        $row['event_id'] = (int)$row['event_id'];
                        $row['qr_code'] = (int)$row['qr_code'];
                        $row['gender'] = $row['gender'] ?? null;
                        $row['age'] = $row['age'] !== null ? (int)$row['age'] : null;
                        $row['is_child'] = (bool)$row['is_child'];
                        $row['has_phone'] = (bool)$row['has_phone'];
                        $row['guardian_qr_code'] = $row['guardian_qr_code'] ? (int)$row['guardian_qr_code'] : null;
                    }
                    echo json_encode($row ?: null);
                } elseif (!empty($_GET['event_id']) && !empty($_GET['qr_code'])) {
                    $stmt = $pdo->prepare("SELECT * FROM visitors WHERE event_id = :event_id AND qr_code = :qr_code LIMIT 1");
                    $stmt->execute([
                        ':event_id' => (int)$_GET['event_id'],
                        ':qr_code' => (int)$_GET['qr_code']
                    ]);
                    $row = $stmt->fetch();
                    if ($row) {
                        $row['id'] = (int)$row['id'];
                        $row['event_id'] = (int)$row['event_id'];
                        $row['qr_code'] = (int)$row['qr_code'];
                        $row['gender'] = $row['gender'] ?? null;
                        $row['age'] = $row['age'] !== null ? (int)$row['age'] : null;
                        $row['is_child'] = (bool)$row['is_child'];
                        $row['has_phone'] = (bool)$row['has_phone'];
                        $row['guardian_qr_code'] = $row['guardian_qr_code'] ? (int)$row['guardian_qr_code'] : null;
                    }
                    echo json_encode($row ?: null);
                } elseif (!empty($_GET['event_id'])) {
                    $stmt = $pdo->prepare("SELECT * FROM visitors WHERE event_id = :event_id ORDER BY id DESC");
                    $stmt->execute([':event_id' => (int)$_GET['event_id']]);
                    $list = array_map(function($row) {
                        $row['id'] = (int)$row['id'];
                        $row['event_id'] = (int)$row['event_id'];
                        $row['qr_code'] = (int)$row['qr_code'];
                        $row['gender'] = $row['gender'] ?? null;
                        $row['age'] = $row['age'] !== null ? (int)$row['age'] : null;
                        $row['is_child'] = (bool)$row['is_child'];
                        $row['has_phone'] = (bool)$row['has_phone'];
                        $row['guardian_qr_code'] = $row['guardian_qr_code'] ? (int)$row['guardian_qr_code'] : null;
                        return $row;
                    }, $stmt->fetchAll());
                    echo json_encode($list);
                } else {
                    // Dashboard: sem filtro retorna todos os visitantes
                    $stmt = $pdo->query("SELECT * FROM visitors ORDER BY id DESC");
                    $list = array_map(function($row) {
                        $row['id'] = (int)$row['id'];
                        $row['event_id'] = (int)$row['event_id'];
                        $row['qr_code'] = (int)$row['qr_code'];
                        $row['gender'] = $row['gender'] ?? null;
                        $row['age'] = $row['age'] !== null ? (int)$row['age'] : null;
                        $row['is_child'] = (bool)$row['is_child'];
                        $row['has_phone'] = (bool)$row['has_phone'];
                        $row['guardian_qr_code'] = $row['guardian_qr_code'] ? (int)$row['guardian_qr_code'] : null;
                        return $row;
                    }, $stmt->fetchAll());
                    echo json_encode($list);
                }
            } elseif ($method === 'POST') {
                $data = getJsonInput();

                // Uniqueness check
                $check = $pdo->prepare("SELECT id FROM visitors WHERE event_id = :event_id AND qr_code = :qr_code");
                $check->execute([
                    ':event_id' => (int)$data['event_id'],
                    ':qr_code' => (int)$data['qr_code']
                ]);
                if ($check->fetch()) {
                    http_response_code(409);
                    echo json_encode(['error' => 'GF-VISIT-REG-001', 'message' => 'QR Code já cadastrado para outro participante neste evento.']);
                    exit;
                }

                $stmt = $pdo->prepare("INSERT INTO visitors (event_id, qr_code, name, gender, age, is_child, phone, has_phone, guardian_qr_code, created_at) VALUES (:event_id, :qr_code, :name, :gender, :age, :is_child, :phone, :has_phone, :guardian_qr_code, :created_at)");
                $stmt->execute([
                    ':event_id' => (int)$data['event_id'],
                    ':qr_code' => (int)$data['qr_code'],
                    ':name' => $data['name'],
                    ':gender' => $data['gender'] ?? null,
                    ':age' => isset($data['age']) && $data['age'] !== '' ? (int)$data['age'] : null,
                    ':is_child' => !empty($data['is_child']) ? 1 : 0,
                    ':phone' => $data['phone'] ?? null,
                    ':has_phone' => !empty($data['has_phone']) ? 1 : 0,
                    ':guardian_qr_code' => !empty($data['guardian_qr_code']) ? (int)$data['guardian_qr_code'] : null,
                    ':created_at' => $data['created_at'] ?? gmdate('Y-m-d\TH:i:s\Z')
                ]);
                $id = $pdo->lastInsertId();
                echo json_encode(array_merge(['id' => (int)$id], $data));
            } elseif ($method === 'PUT') {
                $id = (int)($_GET['id'] ?? 0);
                $data = getJsonInput();
                $hasPhone = !empty($data['has_phone']) ? 1 : 0;
                $phone = $hasPhone ? ($data['phone'] ?? null) : null;
                $stmt = $pdo->prepare("UPDATE visitors SET name = :name, gender = :gender, age = :age, phone = :phone, has_phone = :has_phone WHERE id = :id");
                $stmt->execute([
                    ':name' => $data['name'],
                    ':gender' => $data['gender'] ?? null,
                    ':age' => isset($data['age']) && $data['age'] !== '' ? (int)$data['age'] : null,
                    ':phone' => $phone,
                    ':has_phone' => $hasPhone,
                    ':id' => $id
                ]);
                $row = $pdo->query("SELECT * FROM visitors WHERE id = $id")->fetch();
                if ($row) {
                    $row['id'] = (int)$row['id'];
                    $row['event_id'] = (int)$row['event_id'];
                    $row['qr_code'] = (int)$row['qr_code'];
                    $row['gender'] = $row['gender'] ?? null;
                    $row['age'] = $row['age'] !== null ? (int)$row['age'] : null;
                    $row['is_child'] = (bool)$row['is_child'];
                    $row['has_phone'] = (bool)$row['has_phone'];
                    $row['guardian_qr_code'] = $row['guardian_qr_code'] ? (int)$row['guardian_qr_code'] : null;
                }
                echo json_encode($row ?: null);
            } elseif ($method === 'DELETE') {
                $id = (int)($_GET['id'] ?? 0);
                
                $vStmt = $pdo->prepare("SELECT * FROM visitors WHERE id = :id LIMIT 1");
                $vStmt->execute([':id' => $id]);
                $visitor = $vStmt->fetch();
                if (!$visitor) {
                    http_response_code(404);
                    echo json_encode(['error' => 'NOT_FOUND', 'message' => 'Participante não encontrado.']);
                    exit;
                }

                // 1. Bloqueio: participante possui atendimentos registrados no evento
                $checkAtt = $pdo->prepare("SELECT COUNT(*) as cnt FROM attendances WHERE event_id = :event_id AND visitor_qr_code = :qr_code");
                $checkAtt->execute([
                    ':event_id' => (int)$visitor['event_id'],
                    ':qr_code' => (int)$visitor['qr_code']
                ]);
                if ($checkAtt->fetch()['cnt'] > 0) {
                    http_response_code(409);
                    echo json_encode([
                        'error' => 'GF-VISIT-REG-004',
                        'message' => 'Não é possível excluir: participante possui atendimentos registrados.'
                    ]);
                    exit;
                }

                // 2. Bloqueio: este ticket é referenciado por outro membro familiar (criança ou adulto co-responsável)
                $checkLinked = $pdo->prepare("SELECT COUNT(*) as cnt FROM visitors WHERE event_id = :event_id AND guardian_qr_code = :qr_code");
                $checkLinked->execute([
                    ':event_id' => (int)$visitor['event_id'],
                    ':qr_code'  => (int)$visitor['qr_code']
                ]);
                if ($checkLinked->fetch()['cnt'] > 0) {
                    http_response_code(409);
                    echo json_encode([
                        'error'   => 'GF-VISIT-REG-005',
                        'message' => 'Não é possível excluir: existem membros familiares vinculados ao ticket deste participante.'
                    ]);
                    exit;
                }

                $pdo->prepare("DELETE FROM visitors WHERE id = :id")->execute([':id' => $id]);
                $pdo->prepare("DELETE FROM audit_logs WHERE entity = 'visitors' AND record_id = :id")->execute([':id' => (string)$id]);
                $pdo->exec("VACUUM;");
                echo json_encode(['status' => 'deleted', 'id' => $id]);
            }
            break;

        case 'attendances':
            if ($method === 'GET') {
                if (!empty($_GET['id'])) {
                    $stmt = $pdo->prepare("SELECT * FROM attendances WHERE id = :id LIMIT 1");
                    $stmt->execute([':id' => (int)$_GET['id']]);
                    $row = $stmt->fetch();
                    if ($row) {
                        $row['id'] = (int)$row['id'];
                        $row['event_id'] = (int)$row['event_id'];
                        $row['service_id'] = (int)$row['service_id'];
                        $row['visitor_qr_code'] = (int)$row['visitor_qr_code'];
                    }
                    echo json_encode($row ?: null);
                } elseif (!empty($_GET['event_id']) && !empty($_GET['service_id']) && !empty($_GET['qr_code'])) {
                    $stmt = $pdo->prepare("SELECT * FROM attendances WHERE event_id = :event_id AND service_id = :service_id AND visitor_qr_code = :qr_code LIMIT 1");
                    $stmt->execute([
                        ':event_id' => (int)$_GET['event_id'],
                        ':service_id' => (int)$_GET['service_id'],
                        ':qr_code' => (int)$_GET['qr_code']
                    ]);
                    $row = $stmt->fetch();
                    if ($row) {
                        $row['id'] = (int)$row['id'];
                        $row['event_id'] = (int)$row['event_id'];
                        $row['service_id'] = (int)$row['service_id'];
                        $row['visitor_qr_code'] = (int)$row['visitor_qr_code'];
                    }
                    echo json_encode($row ?: null);
                } elseif (!empty($_GET['event_id']) && !empty($_GET['service_id'])) {
                    $stmt = $pdo->prepare("SELECT * FROM attendances WHERE event_id = :event_id AND service_id = :service_id ORDER BY id DESC");
                    $stmt->execute([
                        ':event_id' => (int)$_GET['event_id'],
                        ':service_id' => (int)$_GET['service_id']
                    ]);
                    $list = array_map(function($row) {
                        $row['id'] = (int)$row['id'];
                        $row['event_id'] = (int)$row['event_id'];
                        $row['service_id'] = (int)$row['service_id'];
                        $row['visitor_qr_code'] = (int)$row['visitor_qr_code'];
                        return $row;
                    }, $stmt->fetchAll());
                    echo json_encode($list);
                } elseif (!empty($_GET['event_id'])) {
                    // Dashboard: atendimentos filtrados apenas por evento
                    $stmt = $pdo->prepare("SELECT * FROM attendances WHERE event_id = :event_id ORDER BY id DESC");
                    $stmt->execute([':event_id' => (int)$_GET['event_id']]);
                    $list = array_map(function($row) {
                        $row['id'] = (int)$row['id'];
                        $row['event_id'] = (int)$row['event_id'];
                        $row['service_id'] = (int)$row['service_id'];
                        $row['visitor_qr_code'] = (int)$row['visitor_qr_code'];
                        return $row;
                    }, $stmt->fetchAll());
                    echo json_encode($list);
                } else {
                    // Dashboard: sem filtro retorna todos os atendimentos
                    $stmt = $pdo->query("SELECT * FROM attendances ORDER BY id DESC");
                    $list = array_map(function($row) {
                        $row['id'] = (int)$row['id'];
                        $row['event_id'] = (int)$row['event_id'];
                        $row['service_id'] = (int)$row['service_id'];
                        $row['visitor_qr_code'] = (int)$row['visitor_qr_code'];
                        return $row;
                    }, $stmt->fetchAll());
                    echo json_encode($list);
                }
            } elseif ($method === 'POST') {
                $data = getJsonInput();

                // Anti-fraud duplication check
                $check = $pdo->prepare("SELECT * FROM attendances WHERE event_id = :event_id AND service_id = :service_id AND visitor_qr_code = :qr_code");
                $check->execute([
                    ':event_id' => (int)$data['event_id'],
                    ':service_id' => (int)$data['service_id'],
                    ':qr_code' => (int)$data['visitor_qr_code']
                ]);
                $existing = $check->fetch();
                if ($existing) {
                    http_response_code(409);
                    echo json_encode([
                        'error' => 'GF-ATTEND-REG-002',
                        'message' => 'Atendimento já realizado para este participante neste serviço.',
                        'existingAttendance' => $existing
                    ]);
                    exit;
                }

                $stmt = $pdo->prepare("INSERT INTO attendances (event_id, service_id, visitor_qr_code, created_at) VALUES (:event_id, :service_id, :visitor_qr_code, :created_at)");
                $stmt->execute([
                    ':event_id' => (int)$data['event_id'],
                    ':service_id' => (int)$data['service_id'],
                    ':visitor_qr_code' => (int)$data['visitor_qr_code'],
                    ':created_at' => $data['created_at'] ?? gmdate('Y-m-d\TH:i:s\Z')
                ]);
                $id = $pdo->lastInsertId();
                echo json_encode(array_merge(['id' => (int)$id], $data));
            } elseif ($method === 'DELETE') {
                $id = (int)($_GET['id'] ?? 0);
                $pdo->prepare("DELETE FROM attendances WHERE id = :id")->execute([':id' => $id]);
                $pdo->prepare("DELETE FROM audit_logs WHERE entity = 'attendances' AND record_id = :id")->execute([':id' => (string)$id]);
                $pdo->exec("VACUUM;");
                echo json_encode(['status' => 'deleted', 'id' => $id]);
            }
            break;

        case 'audit_logs':
            if ($method === 'POST') {
                $data = getJsonInput();
                $stmt = $pdo->prepare("INSERT INTO audit_logs (user_id, entity, record_id, action, before_json, after_json, data_json, trace_hash, timestamp) VALUES (:user_id, :entity, :record_id, :action, :before_json, :after_json, :data_json, :trace_hash, :timestamp)");
                $stmt->execute([
                    ':user_id' => $data['user_id'] ?? 'voluntario-local',
                    ':entity' => $data['entity'],
                    ':record_id' => (string)$data['record_id'],
                    ':action' => $data['action'],
                    ':before_json' => isset($data['before']) ? json_encode($data['before']) : null,
                    ':after_json' => isset($data['after']) ? json_encode($data['after']) : null,
                    ':data_json' => isset($data['data']) ? json_encode($data['data']) : null,
                    ':trace_hash' => $data['trace_hash'] ?? 'tr_' . bin2hex(random_bytes(4)),
                    ':timestamp' => $data['timestamp'] ?? gmdate('Y-m-d\TH:i:s\Z')
                ]);
                echo json_encode(['status' => 'logged']);
            }
            break;

        case 'counts':
            // Returns record counts per entity — used by Secret Menu to populate toggle badges
            echo json_encode([
                'events'      => (int)$pdo->query("SELECT COUNT(*) FROM events")->fetchColumn(),
                'services'    => (int)$pdo->query("SELECT COUNT(*) FROM services")->fetchColumn(),
                'visitors'    => (int)$pdo->query("SELECT COUNT(*) FROM visitors")->fetchColumn(),
                'attendances' => (int)$pdo->query("SELECT COUNT(*) FROM attendances")->fetchColumn(),
            ]);
            break;

        case 'clean':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'GF-CLEAN-SYS-001', 'message' => 'Método não permitido.']);
                break;
            }
            $data = getJsonInput();
            $cleanAttendances = !empty($data['attendances']);
            $cleanVisitors    = !empty($data['visitors']);
            $cleanServices    = !empty($data['services']);
            $cleanEvents      = !empty($data['events']);

            $deleted = ['attendances' => 0, 'visitors' => 0, 'services' => 0, 'events' => 0];

            // 1º — Atendimentos (libera vínculos com visitantes e serviços)
            if ($cleanAttendances) {
                $deleted['attendances'] = (int)$pdo->query("SELECT COUNT(*) FROM attendances")->fetchColumn();
                $pdo->exec("DELETE FROM attendances");
                $pdo->exec("DELETE FROM audit_logs WHERE entity = 'attendances'");
            }

            // 2º — Visitantes (um grupo familiar por vez, excluindo primeiro as crianças depois os adultos)
            if ($cleanVisitors) {
                $deleted['visitors'] = (int)$pdo->query("SELECT COUNT(*) FROM visitors")->fetchColumn();

                // Identifica grupos familiares que possuem dependentes vinculados
                $guardians = $pdo->query("SELECT DISTINCT event_id, guardian_qr_code FROM visitors WHERE guardian_qr_code IS NOT NULL")->fetchAll();

                $delChildrenStmt = $pdo->prepare("DELETE FROM visitors WHERE event_id = ? AND guardian_qr_code = ? AND is_child = 1");
                $delOtherDepsStmt = $pdo->prepare("DELETE FROM visitors WHERE event_id = ? AND guardian_qr_code = ? AND is_child = 0");
                $delGuardianStmt = $pdo->prepare("DELETE FROM visitors WHERE event_id = ? AND qr_code = ?");

                foreach ($guardians as $g) {
                    $eventId = $g['event_id'];
                    $guardianQr = $g['guardian_qr_code'];

                    // Primeiro as crianças do grupo familiar
                    $delChildrenStmt->execute([$eventId, $guardianQr]);
                    // Depois adultos dependentes vinculados ao mesmo responsável
                    $delOtherDepsStmt->execute([$eventId, $guardianQr]);
                    // Por fim o adulto responsável pelo grupo familiar
                    $delGuardianStmt->execute([$eventId, $guardianQr]);
                }

                // Exclui visitantes restantes (sem dependentes ou sem grupo familiar)
                $pdo->exec("DELETE FROM visitors");
                $pdo->exec("DELETE FROM audit_logs WHERE entity = 'visitors'");
            }

            // 3º — Serviços (sem atendimentos restantes)
            if ($cleanServices) {
                $deleted['services'] = (int)$pdo->query("SELECT COUNT(*) FROM services")->fetchColumn();
                $pdo->exec("DELETE FROM services");
                $pdo->exec("DELETE FROM audit_logs WHERE entity = 'services'");
            }

            // 4º — Eventos
            if ($cleanEvents) {
                $deleted['events'] = (int)$pdo->query("SELECT COUNT(*) FROM events")->fetchColumn();
                $pdo->exec("DELETE FROM events");
                $pdo->exec("DELETE FROM audit_logs WHERE entity = 'events'");
            }

            // Compactação física do arquivo SQLite
            $pdo->exec("VACUUM;");

            echo json_encode(['status' => 'cleaned', 'deleted' => $deleted]);
            break;

        default:
            http_response_code(404);
            echo json_encode(['error' => 'ENTITY_NOT_FOUND']);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'GF-SYSTEM-SYS-001', 'message' => $e->getMessage()]);
}
