// RoomNetwork v3 — mạng phòng cố định "Hội Quán" (BroadcastChannel + MQTT over WSS + PeerJS)
//
// Mô hình:
//  * MỘT phòng cố định (ROOM_ID), không có mã phòng. Danh tính người chơi lưu bền trong localStorage
//    (đóng tab / tắt trình duyệt vẫn giữ id). `?p=xyz` tạo danh tính riêng để test nhiều người trong 1 trình duyệt.
//  * Mọi gói tin có `dir`: 'to-host' | 'to-clients' | 'beacon'. Host chỉ nhận to-host, client chỉ nhận to-clients.
//  * Beacon: host phát nhịp tim mỗi 2.5 s trên kênh chung (không phụ thuộc game). Client / watchBeacon nghe để biết
//    host còn sống, đang chơi game nào, phase/stateSeq/epoch nào. Host cũ nhận beacon của host mới hơn → onSuperseded.
//  * Presence: client gửi ROOM_PING mỗi 4 s; host ghi lastSeen mọi gói tin, isClientOnline = thấy trong 12 s.
//  * Reconnect: khi tab hiện lại / có mạng / pageshow / focus → ép MQTT nối lại, mở lại PeerJS, gọi onConnected()
//    để game module JOIN lại và nhận đồng bộ đầy đủ. Có watchdog cho "socket zombie" của iOS.
//  * Ba kênh độc lập, kênh nào lỗi / thiếu (CDN hỏng) cũng không ảnh hưởng kênh còn lại và không bao giờ throw.
window.RoomNetwork = (() => {
  const PREFIX = 'hoiquan-party-v4-m9x4k2';
  const ROOM_ID = 'hoiquan';
  const ROOM_LABEL = 'Hội Quán';
  const MQTT_BROKER_URL = 'wss://broker.emqx.io:8084/mqtt';

  const BEACON_EVERY = 2500;
  const BEACON_THROTTLE = 300;
  const PING_EVERY = 4000;
  const ONLINE_WINDOW = 12000;
  const PRESENCE_EVERY = 2000;
  const HOST_FRESH = 9000;
  const STATUS_EVERY = 2000;
  const WATCHDOG_EVERY = 5000;
  const ZOMBIE_AFTER = 12000;
  const RECREATE_MIN_GAP = 10000;
  const NEVER_SEEN_GRACE = 20000;
  const PEER_RETRY = 4000;
  const WAKE_DEBOUNCE = 400;
  const HIDDEN_STALE = 5000;
  const WAKE_RECREATE_GAP = 3000;
  const BACKOFF_MAX = 60000;
  const WATCH_SILENCE = 9000;
  const WATCH_FIRST = 5000;
  const SEEN_LIMIT = 800;
  const LARGE_PAYLOAD_BYTES = 1800;

  const noop = () => {};
  const rand = () => Math.random().toString(36).slice(2, 9);
  const isFn = (f) => typeof f === 'function';

  // ---------------- Danh tính ----------------
  const memoryIds = {};

  function profileSuffix() {
    try {
      const p = new URLSearchParams(window.location.search).get('p');
      const clean = p ? p.replace(/[^a-zA-Z0-9]/g, '') : '';
      if (clean) return '_p' + clean;
    } catch (_) {}
    return '';
  }

  function storageKey(base) {
    return base + profileSuffix();
  }

  function getClientId() {
    const key = storageKey('hq_client_id');
    let id = null;
    try {
      id = window.localStorage.getItem(key);
    } catch (_) {}
    if (!id) {
      id = memoryIds[key] || 'c_' + rand() + Date.now().toString(36).slice(-4);
      memoryIds[key] = id;
      try {
        window.localStorage.setItem(key, id);
      } catch (_) {}
    }
    return id;
  }

  const CLUB_STORAGE_KEY = 'hq_club_key_v4';

  function computeSiteClubKey() {
    try {
      const loc = window.location || {};
      const rawPath = String(loc.pathname || '/')
        .replace(/\/index\.html$/i, '/')
        .replace(/\/+$/, '');
      const seed = `${String(loc.origin || 'hoiquan').toLowerCase()}${rawPath.toLowerCase()}`;
      let h = 2166136261;
      for (let i = 0; i < seed.length; i++) {
        h ^= seed.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      const code = (h >>> 0).toString(36).slice(0, 6).padStart(6, '0');
      return 'hq_' + code;
    } catch (_) {
      return 'hq_hoiquan';
    }
  }

  const DEFAULT_CLUB = computeSiteClubKey();
  try {
    window.localStorage.removeItem('hq_club_key');
  } catch (_) {}

  function sanitizeClubKey(raw) {
    return String(raw == null ? '' : raw)
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .toLowerCase()
      .slice(0, 24);
  }

  function readClubKeyFromUrl() {
    try {
      const urlParam = new URLSearchParams(window.location.search).get('club');
      if (urlParam) {
        const clean = sanitizeClubKey(urlParam);
        if (clean) {
          try {
            window.localStorage.setItem(CLUB_STORAGE_KEY, clean);
          } catch (_) {}
          return clean;
        }
      }
    } catch (_) {}
    return '';
  }

  function readClubKeyFromStorage() {
    try {
      return sanitizeClubKey(window.localStorage.getItem(CLUB_STORAGE_KEY));
    } catch (_) {
      return '';
    }
  }

  function getClubKey() {
    return readClubKeyFromUrl() || readClubKeyFromStorage() || DEFAULT_CLUB;
  }

  function setClubKey(key) {
    const clean = sanitizeClubKey(key) || DEFAULT_CLUB;
    try {
      window.localStorage.setItem(CLUB_STORAGE_KEY, clean);
    } catch (_) {}
    return clean;
  }

  function ensureHostClubKey() {
    const key = getClubKey();
    try {
      window.localStorage.setItem(CLUB_STORAGE_KEY, key);
    } catch (_) {}
    return key;
  }

  function resetClubKey() {
    const generated = DEFAULT_CLUB;
    try {
      window.localStorage.setItem(CLUB_STORAGE_KEY, generated);
    } catch (_) {}
    return generated;
  }

  function buildShareUrl() {
    try {
      const base = window.location.origin + window.location.pathname;
      const club = getClubKey();
      return club ? `${base}?club=${encodeURIComponent(club)}` : base;
    } catch (_) {
      return '';
    }
  }

  // ---------------- Tiện ích ----------------
  function createSeenCache() {
    const seen = new Set();
    return (id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      if (seen.size > SEEN_LIMIT) seen.delete(seen.values().next().value);
      return true;
    };
  }

  function isPageVisible() {
    try {
      return typeof document === 'undefined' || document.visibilityState !== 'hidden';
    } catch (_) {
      return true;
    }
  }

  // Quản lý timer + listener để destroy() dọn sạch.
  function createScope() {
    const timers = new Set();
    const unlisten = [];
    let dead = false;
    return {
      get dead() {
        return dead;
      },
      every(fn, ms) {
        if (dead) return null;
        const t = setInterval(() => {
          if (!dead) fn();
        }, ms);
        timers.add(t);
        return t;
      },
      after(fn, ms) {
        if (dead) return null;
        const t = setTimeout(() => {
          timers.delete(t);
          if (!dead) fn();
        }, ms);
        timers.add(t);
        return t;
      },
      clear(t) {
        if (t == null) return;
        clearTimeout(t);
        clearInterval(t);
        timers.delete(t);
      },
      listen(target, evt, fn) {
        if (dead || !target || !isFn(target.addEventListener)) return;
        try {
          target.addEventListener(evt, fn);
          unlisten.push(() => target.removeEventListener(evt, fn));
        } catch (_) {}
      },
      dispose() {
        dead = true;
        timers.forEach((t) => {
          clearTimeout(t);
          clearInterval(t);
        });
        timers.clear();
        unlisten.splice(0).forEach((f) => {
          try {
            f();
          } catch (_) {}
        });
      }
    };
  }

  // Gọi khi app "thức dậy" (debounce 400 ms). fn(stale): stale = tab bị ẩn > 5 s hoặc vừa có mạng lại
  // → socket MQTT nhiều khả năng là zombie (iOS), nên dựng lại thay vì chỉ reconnect.
  function listenWake(scope, fn) {
    let t = null;
    let hiddenAt = 0;
    let stale = false;
    const trigger = () => {
      scope.clear(t);
      t = scope.after(() => {
        const s = stale;
        stale = false;
        fn(s);
      }, WAKE_DEBOUNCE);
    };
    scope.listen(typeof document !== 'undefined' ? document : null, 'visibilitychange', () => {
      if (!isPageVisible()) {
        hiddenAt = Date.now();
        return;
      }
      if (hiddenAt && Date.now() - hiddenAt > HIDDEN_STALE) stale = true;
      hiddenAt = 0;
      trigger();
    });
    scope.listen(window, 'online', () => {
      stale = true;
      trigger();
    });
    ['pageshow', 'focus'].forEach((evt) => scope.listen(window, evt, trigger));
  }

  // Sau khi thức dậy: socket nghi ngờ → dựng lại (cách nhau ≥ 3 s), ngược lại chỉ nối lại nếu đứt.
  function wakeMqtt(link, stale) {
    if (stale && link.sinceRecreate() >= WAKE_RECREATE_GAP) link.recreate();
    else link.ensure();
  }

  function openBroadcast(name, onPacket) {
    if (typeof window.BroadcastChannel !== 'function') return null;
    try {
      const bc = new window.BroadcastChannel(name);
      bc.onmessage = (ev) => onPacket(ev && ev.data);
      return bc;
    } catch (_) {
      return null;
    }
  }

  function closeQuietly(obj, method) {
    try {
      if (obj && isFn(obj[method])) obj[method]();
    } catch (_) {}
  }

  // ---------------- MQTT link ----------------
  // opts: { topics, clientTag, onPacket(obj), onSubscribed(), onState() }
  function createMqttLink(opts) {
    let client = null;
    let dead = false;
    let lastRecreate = 0;

    function open() {
      if (dead || !window.mqtt || !isFn(window.mqtt.connect)) return;
      try {
        const c = window.mqtt.connect(MQTT_BROKER_URL, {
          clientId: `hq3_${opts.clientTag}_${rand()}${rand().slice(0, 3)}`,
          clean: true,
          keepalive: 20,
          connectTimeout: 8000,
          reconnectPeriod: 2000
        });
        client = c;
        const live = () => !dead && client === c;
        c.on('connect', () => {
          if (!live()) return;
          try {
            c.subscribe(opts.topics, { qos: 0 }, () => {
              if (live()) opts.onSubscribed();
            });
          } catch (_) {}
          opts.onState();
        });
        c.on('message', (_topic, buf) => {
          if (!live()) return;
          let obj = null;
          try {
            obj = JSON.parse(buf.toString());
          } catch (_) {
            return;
          }
          try {
            opts.onPacket(obj);
          } catch (_) {}
        });
        ['offline', 'close', 'error', 'end'].forEach((evt) =>
          c.on(evt, () => {
            if (live()) opts.onState();
          })
        );
      } catch (_) {
        client = null;
      }
    }

    function isUp() {
      return !!(client && client.connected);
    }

    function recreate() {
      if (dead) return;
      lastRecreate = Date.now();
      const old = client;
      client = null;
      try {
        if (old) old.end(true);
      } catch (_) {}
      open();
      opts.onState();
    }

    return {
      open,
      isUp,
      publish(topic, text) {
        if (!isUp()) return;
        try {
          client.publish(topic, text, { qos: 0 });
        } catch (_) {}
      },
      ensure() {
        if (dead) return;
        if (!client) return open();
        if (!client.connected) {
          try {
            client.reconnect();
          } catch (_) {
            recreate();
          }
        }
      },
      recreate,
      sinceRecreate: () => Date.now() - lastRecreate,
      close() {
        dead = true;
        const old = client;
        client = null;
        try {
          if (old) old.end(true);
        } catch (_) {}
      }
    };
  }

  // Watchdog socket zombie (iOS): MQTT nói "connected" nhưng im lặng quá lâu.
  function startZombieWatchdog(scope, link, getLastHeard) {
    const startedAt = Date.now();
    let gap = RECREATE_MIN_GAP;
    let lastHeardSeen = 0;
    scope.every(() => {
      const heard = getLastHeard();
      if (heard > lastHeardSeen) {
        lastHeardSeen = heard;
        gap = RECREATE_MIN_GAP;
      }
      if (!isPageVisible() || !link.isUp() || link.sinceRecreate() < gap) return;
      const now = Date.now();
      if (!heard && now - startedAt < NEVER_SEEN_GRACE) return;
      if (now - (heard || startedAt) > ZOMBIE_AFTER) {
        link.recreate();
        gap = Math.min(gap * 2, BACKOFF_MAX);
      }
    }, WATCHDOG_EVERY);
  }

  // ---------------- Session ----------------
  function createSession(opts) {
    opts = opts || {};
    const gameType = opts.gameType;
    const isHost = !!opts.isHost;
    const onMessage = isFn(opts.onMessage) ? opts.onMessage : noop;
    const onStatus = isFn(opts.onStatus) ? opts.onStatus : noop;
    const onConnected = isFn(opts.onConnected) ? opts.onConnected : noop;
    const onBeacon = isFn(opts.onBeacon) ? opts.onBeacon : noop;
    const onPresence = isFn(opts.onPresence) ? opts.onPresence : noop;
    const onSuperseded = isFn(opts.onSuperseded) ? opts.onSuperseded : noop;
    const onLogDelta = isFn(opts.onLogDelta) ? opts.onLogDelta : null;

    const clientId = isHost ? getClientId() + '_host' : getClientId();
    const inst = rand();
    const hostSince = Date.now();
    const scope = createScope();
    const remember = createSeenCache();
    const wantDir = isHost ? 'to-host' : 'to-clients';
    const outDir = isHost ? 'to-clients' : 'to-host';
    const effectiveClub = isHost ? ensureHostClubKey() : getClubKey();
    const hostPeerId = `hq4-${ROOM_ID}-${effectiveClub}-${gameType}-host`;
    const topicBase = `${PREFIX}/${ROOM_ID}_${effectiveClub}`;
    const topicIn = `${topicBase}/${gameType}/${wantDir}`;
    const topicOut = `${topicBase}/${gameType}/${outDir}`;
    const topicBeacon = `${topicBase}/beacon`;

    let closed = false;
    let hostLastSeen = 0;
    let superseded = false;
    let beaconInfo = { phase: null, stateSeq: null, epoch: null };
    let lastBeaconAt = 0;
    let beaconTrail = null;
    const lastSeen = {};
    let prevOnline = '';
    let lastStatusKey = null;

    let bcGame = null;
    let bcBeacon = null;
    let peer = null;
    let peerOpen = false;
    let hostConn = null;
    let hostConnAt = 0;
    const peerConns = new Map();
    const peerByClientId = new Map();
    let lastSentLogSeq = 0;

    // ----- nhận -----
    function safeCall(fn, arg) {
      try {
        fn(arg);
      } catch (_) {}
    }

    function handleBeacon(raw) {
      const p = raw.payload;
      if (!p || typeof p !== 'object') return;
      if (isHost) {
        if (superseded) return;
        const other = p.hostId !== clientId || raw.inst !== inst;
        if (other && Number(p.hostSince) > hostSince) {
          superseded = true;
          safeCall(onSuperseded);
        }
        return;
      }
      if (p.game === gameType) {
        hostLastSeen = Date.now();
        reportStatus();
      }
      safeCall(onBeacon, p);
    }

    function handleIncoming(raw) {
      if (closed || !raw || typeof raw !== 'object' || !raw.msgId) return;
      if (raw.roomCode && raw.roomCode !== ROOM_ID) return;
      if (raw.clubKey && raw.clubKey !== effectiveClub) return;
      const isBeacon = raw.type === 'ROOM_BEACON';
      if (raw.senderId === clientId && !(isBeacon && raw.inst && raw.inst !== inst)) return;
      if (!remember(raw.msgId)) return;
      if (isBeacon) {
        if (raw.dir === 'beacon') handleBeacon(raw);
        return;
      }
      if (raw.dir !== wantDir) return;
      if (!isHost && raw.targetId && raw.targetId !== clientId) return;
      if (isHost) {
        if (raw.senderId) lastSeen[raw.senderId] = Date.now();
      } else {
        hostLastSeen = Date.now();
        reportStatus();
      }
      if (typeof raw.type === 'string' && raw.type.indexOf('ROOM_') === 0) return;
      if (raw.type === 'LOG_DELTA' && onLogDelta) {
        safeCall(onLogDelta, raw.payload);
      }
      safeCall(onMessage, raw);
    }

    // ----- gửi -----
    function makePacket(type, payload, targetId, dir) {
      return {
        msgId: `${clientId}_${Date.now()}_${rand()}`,
        roomCode: ROOM_ID,
        clubKey: effectiveClub,
        senderId: clientId,
        targetId: targetId || null,
        dir,
        type,
        payload: payload === undefined ? {} : payload,
        ts: Date.now(),
        inst
      };
    }

    function emit(packet, bc, topic) {
      remember(packet.msgId);
      if (bc) {
        try {
          bc.postMessage(packet);
        } catch (_) {}
      }
      let text = null;
      try {
        text = JSON.stringify(packet);
      } catch (_) {
        return;
      }
      const isLarge = text.length > LARGE_PAYLOAD_BYTES;
      const now = Date.now();

      if (!isHost && packet.dir === 'to-host') {
        let peerSent = false;
        if (hostConn && hostConn.open) {
          try {
            hostConn.send(packet);
            peerSent = true;
          } catch (_) {}
        }
        if (!(peerSent && isLarge)) {
          mqtt.publish(topic, text);
        }
        return;
      }

      if (isHost && packet.targetId) {
        const entry = peerByClientId.get(packet.targetId);
        let peerSent = false;
        if (entry && entry.conn && entry.conn.open) {
          try {
            entry.conn.send(packet);
            peerSent = true;
          } catch (_) {}
        }
        const entryFresh = entry && now - entry.lastAt <= ONLINE_WINDOW;
        if (!(peerSent && isLarge && entryFresh)) {
          mqtt.publish(topic, text);
        }
        return;
      }

      if (isHost && !packet.targetId) {
        const sentConns = new Set();
        peerConns.forEach((conn) => {
          if (conn && conn.open) {
            try {
              conn.send(packet);
              sentConns.add(conn);
            } catch (_) {}
          }
        });

        let skipMqtt = false;
        if (isLarge && packet.type !== 'ROOM_BEACON') {
          const onlineList = Object.keys(lastSeen).filter((id) => now - lastSeen[id] <= ONLINE_WINDOW);
          if (
            onlineList.length > 0 &&
            onlineList.every((id) => {
              const entry = peerByClientId.get(id);
              return (
                entry &&
                entry.conn &&
                entry.conn.open &&
                now - entry.lastAt <= ONLINE_WINDOW &&
                sentConns.has(entry.conn)
              );
            })
          ) {
            skipMqtt = true;
          }
        }
        if (!skipMqtt) {
          mqtt.publish(topic, text);
        }
        return;
      }

      mqtt.publish(topic, text);
    }

    function send(type, payload, targetId) {
      if (closed) return;
      emit(makePacket(type, payload, targetId, outDir), bcGame, topicOut);
    }

    // ----- beacon (host) -----
    function publishBeacon() {
      if (closed || !isHost) return;
      lastBeaconAt = Date.now();
      const payload = {
        game: gameType,
        hostId: clientId,
        hostSince,
        phase: beaconInfo.phase,
        stateSeq: beaconInfo.stateSeq,
        epoch: beaconInfo.epoch,
        ts: lastBeaconAt
      };
      emit(makePacket('ROOM_BEACON', payload, null, 'beacon'), bcBeacon, topicBeacon);
    }

    function setBeaconInfo(info) {
      if (closed || !isHost || !info || typeof info !== 'object') return;
      ['phase', 'stateSeq', 'epoch'].forEach((k) => {
        if (Object.prototype.hasOwnProperty.call(info, k)) beaconInfo[k] = info[k];
      });
      const wait = BEACON_THROTTLE - (Date.now() - lastBeaconAt);
      if (wait <= 0) return publishBeacon();
      if (beaconTrail == null) {
        beaconTrail = scope.after(() => {
          beaconTrail = null;
          publishBeacon();
        }, wait);
      }
    }

    // ----- presence -----
    function onlineIds() {
      const now = Date.now();
      return Object.keys(lastSeen)
        .filter((id) => now - lastSeen[id] <= ONLINE_WINDOW)
        .sort()
        .join('|');
    }

    function isClientOnline(id) {
      return !!lastSeen[id] && Date.now() - lastSeen[id] <= ONLINE_WINDOW;
    }

    function sendPing() {
      if (!isHost) send('ROOM_PING', {});
    }

    // ----- trạng thái -----
    function reportStatus() {
      if (closed) return;
      let text;
      let online;
      if (isHost) {
        const cloud = mqtt.isUp();
        const p2p = peerOpen;
        online = cloud || p2p;
        text = online
          ? `🟢 Đang phát sóng (${[cloud ? 'Cloud' : '', p2p ? 'P2P' : ''].filter(Boolean).join(' + ')})`
          : '🟠 Nội bộ / đang nối mạng…';
      } else {
        online = hostLastSeen > 0 && Date.now() - hostLastSeen <= HOST_FRESH;
        text = online ? '🟢 Đã kết nối' : '🟠 Đang nối lại…';
      }
      const key = text + '|' + online;
      if (key === lastStatusKey) return;
      lastStatusKey = key;
      safeCall(() => onStatus(text, online));
    }

    // ----- MQTT -----
    const mqtt = createMqttLink({
      topics: [topicIn, topicBeacon],
      clientTag: clientId,
      onPacket: handleIncoming,
      onSubscribed() {
        sendPing();
        if (isHost) publishBeacon();
        safeCall(onConnected);
      },
      onState: reportStatus
    });

    // ----- PeerJS (best effort) -----
    function registerConn(conn, key) {
      conn.on('open', () => {
        if (closed) return;
        peerConns.set(key, conn);
        if (isHost) {
          publishBeacon();
        } else {
          sendPing();
          safeCall(onConnected);
        }
        reportStatus();
      });
      conn.on('data', (data) => {
        if (data && data.senderId && (!data.clubKey || data.clubKey === effectiveClub)) {
          peerByClientId.set(data.senderId, { conn, lastAt: Date.now() });
        }
        handleIncoming(data);
      });
      const gone = () => {
        if (peerConns.get(key) === conn) peerConns.delete(key);
        peerByClientId.forEach((entry, id) => {
          if (entry && entry.conn === conn) peerByClientId.delete(id);
        });
        if (hostConn === conn) hostConn = null;
      };
      conn.on('close', gone);
      conn.on('error', gone);
    }

    function newPeer(id) {
      const p = id ? new window.Peer(id) : new window.Peer();
      peer = p;
      const live = () => !closed && peer === p;
      p.on('open', () => {
        if (!live()) return;
        peerOpen = true;
        reportStatus();
        if (!isHost) connectToHost();
      });
      p.on('disconnected', () => {
        if (!live()) return;
        peerOpen = false;
        reportStatus();
        try {
          p.reconnect();
        } catch (_) {}
      });
      p.on('close', () => {
        if (peer === p) peer = null;
        peerOpen = false;
        reportStatus();
      });
      p.on('error', (err) => {
        if (!live()) return;
        if (err && err.type === 'unavailable-id') {
          peer = null;
          peerOpen = false;
          closeQuietly(p, 'destroy');
          reportStatus();
        }
      });
      if (isHost) {
        p.on('connection', (conn) => {
          if (live()) registerConn(conn, conn.peer || rand());
        });
      }
    }

    function connectToHost() {
      if (closed || !peer || !peerOpen) return;
      if (hostConn && (hostConn.open || Date.now() - hostConnAt < 2 * PEER_RETRY)) return;
      closeQuietly(hostConn, 'close');
      try {
        hostConn = peer.connect(hostPeerId, { reliable: true });
        hostConnAt = Date.now();
        registerConn(hostConn, 'host');
      } catch (_) {
        hostConn = null;
      }
    }

    function ensurePeer() {
      if (closed || typeof window.Peer !== 'function') return;
      try {
        if (!peer || peer.destroyed) {
          peer = null;
          peerOpen = false;
          newPeer(isHost ? hostPeerId : null);
        } else if (peer.disconnected) {
          peer.reconnect();
        } else if (!isHost) {
          connectToHost();
        }
      } catch (_) {}
    }

    // ----- khởi động -----
    bcGame = openBroadcast(`${PREFIX}_${ROOM_ID}_${effectiveClub}_${gameType}`, handleIncoming);
    bcBeacon = openBroadcast(`${PREFIX}_${ROOM_ID}_${effectiveClub}_beacon`, handleIncoming);
    mqtt.open();
    ensurePeer();
    scope.every(ensurePeer, PEER_RETRY);

    if (isHost) {
      scope.every(publishBeacon, BEACON_EVERY);
      prevOnline = onlineIds();
      scope.every(() => {
        const cur = onlineIds();
        if (cur !== prevOnline) {
          prevOnline = cur;
          safeCall(onPresence);
        }
      }, PRESENCE_EVERY);
      publishBeacon();
    } else {
      scope.every(sendPing, PING_EVERY);
      startZombieWatchdog(scope, mqtt, () => hostLastSeen);
    }
    scope.every(reportStatus, STATUS_EVERY);

    listenWake(scope, (stale) => {
      if (isHost) mqtt.ensure();
      else wakeMqtt(mqtt, stale);
      ensurePeer();
      sendPing();
      if (isHost) publishBeacon();
      safeCall(onConnected);
      reportStatus();
    });

    reportStatus();

    function destroy() {
      if (closed) return;
      closed = true;
      scope.dispose();
      mqtt.close();
      closeQuietly(bcGame, 'close');
      closeQuietly(bcBeacon, 'close');
      bcGame = bcBeacon = null;
      peerConns.forEach((c) => closeQuietly(c, 'close'));
      peerConns.clear();
      peerByClientId.clear();
      closeQuietly(hostConn, 'close');
      hostConn = null;
      closeQuietly(peer, 'destroy');
      peer = null;
    }

    function sendLogDelta(entryOrEntries, targetId) {
      if (closed || !entryOrEntries) return;
      const list = Array.isArray(entryOrEntries)
        ? entryOrEntries.filter((x) => x != null)
        : [entryOrEntries];
      if (!list.length) return;
      const payload = {
        entries: list,
        entry: list[list.length - 1]
      };
      emit(makePacket('LOG_DELTA', payload, targetId || null, outDir), bcGame, topicOut);
    }

    function sendNewLogs(allLogs, targetId) {
      if (closed || !Array.isArray(allLogs) || !allLogs.length) return;
      let maxSeq = lastSentLogSeq;
      const newEntries = [];
      for (let idx = 0; idx < allLogs.length; idx++) {
        const e = allLogs[idx];
        if (e == null) continue;
        const seq = e && typeof e === 'object' && typeof e.seq === 'number' ? e.seq : idx + 1;
        if (seq > lastSentLogSeq) {
          newEntries.push(e);
          if (seq > maxSeq) maxSeq = seq;
        }
      }
      if (!newEntries.length) return;
      lastSentLogSeq = maxSeq;
      sendLogDelta(newEntries, targetId);
    }

    function resetLogCursor() {
      lastSentLogSeq = 0;
    }

    return {
      clientId,
      roomCode: ROOM_ID,
      clubKey: effectiveClub,
      gameType,
      isHost,
      send,
      sendLogDelta,
      sendNewLogs,
      resetLogCursor,
      destroy,
      setBeaconInfo,
      isClientOnline,
      getHostLastSeen: () => hostLastSeen
    };
  }

  // ---------------- watchBeacon ----------------
  function watchBeacon(cb) {
    const callback = isFn(cb) ? cb : noop;
    const scope = createScope();
    const remember = createSeenCache();
    const startedAt = Date.now();
    const myId = 'w_' + rand();
    let lastBeacon = 0;
    let silentFired = false;
    let stopped = false;
    const effectiveClub = getClubKey();

    function handle(raw) {
      if (stopped || !raw || typeof raw !== 'object' || !raw.msgId) return;
      if (raw.type !== 'ROOM_BEACON' || raw.dir !== 'beacon') return;
      if (raw.roomCode && raw.roomCode !== ROOM_ID) return;
      if (raw.clubKey && raw.clubKey !== effectiveClub) return;
      if (!remember(raw.msgId)) return;
      if (!raw.payload || typeof raw.payload !== 'object') return;
      lastBeacon = Date.now();
      silentFired = false;
      try {
        callback(raw.payload);
      } catch (_) {}
    }

    const bc = openBroadcast(`${PREFIX}_${ROOM_ID}_${effectiveClub}_beacon`, handle);
    const mqtt = createMqttLink({
      topics: [`${PREFIX}/${ROOM_ID}_${effectiveClub}/beacon`],
      clientTag: myId,
      onPacket: handle,
      onSubscribed: noop,
      onState: noop
    });
    mqtt.open();

    scope.every(() => {
      if (silentFired) return;
      const now = Date.now();
      const silent = lastBeacon ? now - lastBeacon > WATCH_SILENCE : now - startedAt > WATCH_FIRST;
      if (!silent) return;
      silentFired = true;
      try {
        callback(null);
      } catch (_) {}
    }, 1000);

    startZombieWatchdog(scope, mqtt, () => lastBeacon);
    listenWake(scope, (stale) => wakeMqtt(mqtt, stale));

    function stop() {
      if (stopped) return;
      stopped = true;
      scope.dispose();
      mqtt.close();
      closeQuietly(bc, 'close');
    }
    stop.stop = stop;
    return stop;
  }

  // iOS bfcache: trang được khôi phục từ cache → tải lại để có trạng thái sạch.
  try {
    window.addEventListener('pageshow', (event) => {
      if (event && event.persisted) {
        try {
          window.location.reload();
        } catch (_) {}
      }
    });
  } catch (_) {}

  return {
    ROOM_ID,
    ROOM_LABEL,
    getClubKey,
    setClubKey,
    ensureHostClubKey,
    resetClubKey,
    storageKey,
    getClientId,
    getOrCreateClientId: getClientId,
    generateRoomCode: () => ROOM_ID,
    buildShareUrl,
    createSession,
    watchBeacon
  };
})();
window.Network = window.RoomNetwork;
