<?php
header('Content-Type: application/json');

// ========== ВАШИ ДАННЫЕ ДЛЯ ВКОНТАКТЕ ==========
$access_token = "vk1.a.jpx_GVj8ILIYTMRoo0eqk7vVHj4ZcHDTjwJRBpyiNMaiUeNmEVdJD8yQ5hwqofn0hYchonNR33Er5CsMjNCjiQNB78wiLyaqAqLFBpDUvMUWvUI4_aO9uzr23WArAvTTxlS6bY88VXfKF74c40_6Dk5GRa2OOqxZkHBEeLqASKahPtkLqHGFa-bKMiFZSVJJ";
$group_id = "-vk1.a.jpx_GVj8ILIYTMRoo0eqk7vVHj4ZcHDTjwJRBpyiNMaiUeNmEVdJD8yQ5hwqofn0hYchonNR33Er5CsMjNCjiQNB78wiLyaqAqLFBpDUvMUWvUI4_aO9uzr23WArAvTTxlS6bY88VXfKF74c40_6Dk5GRa2OOqxZkHBEeLqASKahPtkLqHGFa-bKMiFZSVJJ"; // ВАЖНО: ВСТАВЬТЕ СЮДА ID ВАШЕГО СООБЩЕСТВА С МИНУСОМ! Например: -123456789
$api_version = "5.131";
// =============================================

// Получаем данные из запроса
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['title']) || !isset($input['content'])) {
    echo json_encode(['success' => false, 'error' => 'Не переданы параметры']);
    exit;
}

$title = trim($input['title']);
$content = trim($input['content']);
$category = isset($input['category']) ? trim($input['category']) : 'НОВОСТИ';

// Формируем текст для ВК
$date = date('d.m.Y H:i');
$message = "📢 " . $category . "\n\n";
$message .= "📌 " . $title . "\n\n";
$message .= $content . "\n\n";
$message .= "📅 " . $date . "\n\n";
$message .= "✨ Литературный Оазис\n";
$message .= "#литературныйоазис #книги #новости";

// Отправляем запрос в ВК
$url = "https://api.vk.com/method/wall.post";
$params = array(
    'access_token' => $access_token,
    'owner_id' => $group_id,
    'message' => $message,
    'from_group' => 1,
    'v' => $api_version
);

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$result = curl_exec($ch);
curl_close($ch);

$response = json_decode($result, true);

if (isset($response['response']['post_id'])) {
    echo json_encode([
        'success' => true, 
        'post_id' => $response['response']['post_id'],
        'message' => 'Опубликовано в ВК!'
    ]);
} else {
    $error = isset($response['error']['error_msg']) ? $response['error']['error_msg'] : 'Неизвестная ошибка';
    echo json_encode(['success' => false, 'error' => $error]);
}
?>
