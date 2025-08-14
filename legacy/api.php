<?php
// Wild Trivia – lightweight single-room JSON store API (hardened)
header('Content-Type: application/json');

// CORS: allow only same-origin
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$host   = $_SERVER['HTTP_HOST']   ?? '';
if ($origin) {
  $oHost = parse_url($origin, PHP_URL_HOST);
  if ($oHost && $oHost === $host) { header('Access-Control-Allow-Origin: '.$origin); header('Vary: Origin'); }
}
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: POST');

$DATA_DIR = __DIR__.'/data';
$ROOM_ID  = 'ROOM';
if (!is_dir($DATA_DIR)) { @mkdir($DATA_DIR, 0777, true); }

function respond($arr){ echo json_encode($arr, JSON_UNESCAPED_UNICODE); exit; }
function error_out($msg,$code=400){ http_response_code($code); respond(['error'=>$msg]); }
function room_path($id){ global $DATA_DIR; return $DATA_DIR.'/room_'.preg_replace('/[^A-Z0-9]/','',strtoupper($id)).'.json'; }

function read_room($id){ $p=room_path($id); if(!file_exists($p)) return null; $fp=fopen($p,'r'); if(!$fp) return null; $lk=flock($fp,LOCK_SH); $json=stream_get_contents($fp); if($lk) flock($fp,LOCK_UN); fclose($fp); $data=json_decode($json,true); return $data?:null; }
function write_room($id,$data){ $p=room_path($id); $tmp=$p.'.tmp'; $fp=fopen($tmp,'w'); if(!$fp) return false; $lk=flock($fp,LOCK_EX); fwrite($fp,json_encode($data, JSON_UNESCAPED_UNICODE)); fflush($fp); if($lk) flock($fp,LOCK_UN); fclose($fp); rename($tmp,$p); return true; }

function sanitize_name($name){ $name=trim((string)$name); $name=preg_replace("/[^\p{L}\p{N} _\-'\.]/u",'', $name); $name=preg_replace('/\s+/', ' ', $name); if($name==='') $name='Player'; return mb_substr($name,0,20,'UTF-8'); }
function is_host($room,$playerId){ return isset($room['hostId']) && $room['hostId']===$playerId; }
function ensure_answers_assoc(&$room){ if(!isset($room['answers'])||!is_array($room['answers'])) $room['answers']=[]; $fix=[]; foreach($room['answers'] as $q=>$m){ $fix[(string)$q]=is_array($m)?$m:[]; } $room['answers']=$fix; }

function apply_patch($room,$patch,$playerId,$isHost){
  ensure_answers_assoc($room);
  foreach($patch as $k=>$v){
    // Host-only fields
    if(in_array($k,['state','settings','questions','qIndex','countdownEndsAt','questionEndsAt','intermissionEndsAt','gifIndex','build'],true)){
      if(!$isHost) continue;
      if($k==='settings' && is_array($v)){
        $next = $room['settings'] ?? ['categoryIds'=>[], 'questionCount'=>null, 'questionTimeSec'=>null];
        if(isset($v['categoryIds']) && is_array($v['categoryIds'])){
          $ids = array_values(array_unique(array_map('intval',$v['categoryIds'])));
          $next['categoryIds'] = array_slice($ids,0,5);
        }
        if(array_key_exists('questionCount',$v)){
          $allowed=[5,10,15,20]; $qc=$v['questionCount']; if(in_array($qc,$allowed,true)) $next['questionCount']=$qc;
        }
        if(array_key_exists('questionTimeSec',$v)){
          $allowed=[10,15,20]; $t=$v['questionTimeSec']; if(in_array($t,$allowed,true)) $next['questionTimeSec']=$t;
        }
        $room['settings']=$next; continue;
      }
      if($k==='questions' && is_array($v)) { $room['questions']=$v; continue; }
      $room[$k]=$v; continue;
    }

    if($k==='answers' && is_array($v)){
      foreach($v as $qIdx=>$ansMap){
        $qKey=(string)$qIdx; if(!isset($room['questions'][$qIdx])) continue;
        $correct = $room['questions'][$qIdx]['correct'] ?? null;
        if(!isset($room['answers'][$qKey])||!is_array($room['answers'][$qKey])) $room['answers'][$qKey]=[];
        if(is_array($ansMap)){
          $client=$ansMap[$playerId]??null; $ansText=(is_array($client)&&isset($client['answer']))?(string)$client['answer']:null;
          if($ansText!==null){ $room['answers'][$qKey][$playerId]=['answer'=>$ansText,'correct'=>($correct!==null && $ansText===$correct),'at'=>round(microtime(true)*1000)]; }
        }
      }
      continue;
    }
  }
  return $room;
}

$input = file_get_contents('php://input');
$payload = json_decode($input,true) ?: [];
$action = $_GET['action'] ?? $_POST['action'] ?? $payload['action'] ?? '';

switch($action){
  case 'joinOrCreate': {
    global $ROOM_ID; $name=sanitize_name($payload['name'] ?? 'Player'); $playerId=$payload['playerId'] ?? bin2hex(random_bytes(8));
    $room=read_room($ROOM_ID);
    if(!$room){
      $room=[
        'id'=>$ROOM_ID,
        'hostId'=>$playerId,
        'state'=>'lobby',
        'settings'=>['categoryIds'=>[], 'questionCount'=>null, 'questionTimeSec'=>null],
        'players'=>[$playerId=>['id'=>$playerId,'name'=>$name,'score'=>0]],
        'countdownEndsAt'=>0,
        'intermissionEndsAt'=>0,
        'qIndex'=>-1,
        'questions'=>[],
        'answers'=>[],
        'createdAt'=>round(microtime(true)*1000),
        'gameNo'=>0,
        'gifIndex'=>0,
      ];
      write_room($ROOM_ID,$room); respond(['ok'=>true,'room'=>$room]);
    }
    if(count($room['players'])>=10 && !isset($room['players'][$playerId])) error_out('Room is full',403);
    $room['players'][$playerId] = $room['players'][$playerId] ?? ['id'=>$playerId,'name'=>$name,'score'=>0];
    $room['players'][$playerId]['name'] = $name;
    write_room($ROOM_ID,$room); respond(['ok'=>true,'room'=>$room]);
  }

  case 'getRoom': {
    global $ROOM_ID; $room=read_room($ROOM_ID); if(!$room) error_out('Room not found',404); respond(['ok'=>true,'room'=>$room]);
  }

  case 'updateRoom': {
    if($_SERVER['REQUEST_METHOD']!=='POST') error_out('POST required',405);
    global $ROOM_ID; $patch=$payload['patch'] ?? null; $playerId=$payload['playerId'] ?? null; if(!is_array($patch)) error_out('Missing patch'); if(!$playerId) error_out('Missing playerId');
    $room=read_room($ROOM_ID); if(!$room) error_out('Room not found',404);
    $room=apply_patch($room,$patch,$playerId,is_host($room,$playerId));
    write_room($ROOM_ID,$room); respond(['ok'=>true,'room'=>$room]);
  }

  case 'wipeAndReset': {
    if($_SERVER['REQUEST_METHOD']!=='POST') error_out('POST required',405);
    global $ROOM_ID; $playerId=$payload['playerId'] ?? null; $existing=read_room($ROOM_ID); if(!$existing) error_out('Room not found',404); if(!is_host($existing,$playerId)) error_out('Only host can reset');
    $players=$existing['players'] ?? [];
    foreach($players as $pid=>$p){ $players[$pid]['score']=0; }
    $settings=$existing['settings'] ?? ['categoryIds'=>[], 'questionCount'=>null, 'questionTimeSec'=>null];
    $hostId=$existing['hostId'] ?? array_key_first($players);
    @unlink(room_path($ROOM_ID));
    $room=[
      'id'=>$ROOM_ID,
      'hostId'=>$hostId,
      'state'=>'lobby',
      'settings'=>$settings,
      'players'=>$players,
      'countdownEndsAt'=>0,
      'intermissionEndsAt'=>0,
      'qIndex'=>-1,
      'questions'=>[],
      'answers'=>[],
      'createdAt'=>round(microtime(true)*1000),
      'gameNo'=>($existing['gameNo'] ?? 0)+1,
      'gifIndex'=>0,
    ];
    write_room($ROOM_ID,$room); respond(['ok'=>true,'room'=>$room]);
  }

  case 'nukeRoom': {
    if($_SERVER['REQUEST_METHOD']!=='POST') error_out('POST required',405);
    global $ROOM_ID; $playerId=$payload['playerId'] ?? null; $existing=read_room($ROOM_ID); if($existing && !is_host($existing,$playerId)) error_out('Only host can reset');
    @unlink(room_path($ROOM_ID)); respond(['ok'=>true]);
  }

  default: error_out('Unknown action');
}
