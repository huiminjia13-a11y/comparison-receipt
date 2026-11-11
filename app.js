(function () {
  "use strict";

  var STORAGE_KEY = "tonight-comparison-receipt-v1";
  /* 想到了谁：前任只是其中一种，不是主题 */
  var WHO = [
    { id: "past", label: "过去的自己" },
    { id: "offer", label: "那个 offer" },
    { id: "exco", label: "前公司" },
    { id: "classmate", label: "同学" },
    { id: "friend", label: "朋友" },
    { id: "ex", label: "前任" },
    { id: "sudden", label: "突然冒出来的人" },
    { id: "anon", label: "不想说是谁" }
  ];
  var DURATIONS = [
    { id: "seconds", label: "刚闪过几秒" },
    { id: "tonight", label: "今晚反复" },
    { id: "days", label: "已经好几天" }
  ];

  /* 常用词 / 拼一句：离线点选；野心 + 夜里打转，不是鸡汤 */
  /* 首屏只露 8 个，其余进「更多」——减轻表单压迫感 */
  var FEELING_PRIMARY = [
    "想", "气", "不服", "酸", "思念", "空", "怒火", "又气又想"
  ];
  var FEELING_MORE = [
    "惦记", "来不及", "憋", "慌", "烦", "麻", "累", "眼红",
    "上头", "咬牙", "说不清", "想赢", "不服气", "还在想", "空得很",
    "来不及了", "比较上头", "夜里又冒出来", "羡慕到牙痒"
  ];
  var FEELING_WORDS = FEELING_PRIMARY.concat(FEELING_MORE);
  var FEELING_PHRASES = [];
  /* 称呼建议：不与上方「想到了谁」chips 重复（前公司 / offer / 同学已在 who） */
  var WHO_NAME_WORDS = [
    "他", "她", "那个人", "不想写名字"
  ];
  var THEY_HAVE_WORDS = [
    "那个 offer", "头衔", "看起来很确定的人生", "胆子", "钱", "房子", "签证", "节奏", "人脉"
  ];
  var STAMPS = ["已付无法退款", "今晚结算", "还在想", "不服"];
  var THOUGHT_COUNT_KEY = "tonight-comparison-receipt-thought-n-v1";
  var FEELING_MORE_OPEN = false;
  /* 轻量拼音→感觉词（静态、无网络）；气 / 想 / 不服 都覆盖 */
  var PINYIN_FEELING = {
    xiang: ["想", "思念", "想赢"],
    xiangying: ["想赢"],
    qi: ["气", "怒火"],
    nu: ["怒火", "气"],
    nuhuo: ["怒火"],
    sinian: ["思念"],
    dianji: ["惦记"],
    suan: ["酸"],
    kong: ["空", "空得很"],
    kongdehen: ["空得很"],
    laibuji: ["来不及", "来不及了"],
    laibujile: ["来不及了"],
    shuo: ["说不清"],
    shuoqingchu: ["说不清"],
    buqingchu: ["说不清"],
    bie: ["憋"],
    huang: ["慌"],
    fan: ["烦"],
    xianmu: ["羡慕到牙痒"],
    yanmu: ["眼红"],
    yanhong: ["眼红"],
    ma: ["麻"],
    lei: ["累"],
    bufu: ["不服", "不服气"],
    bufuqi: ["不服气"],
    shangtou: ["上头", "比较上头"],
    bijiao: ["比较上头"],
    yaoya: ["咬牙"],
    youqiyouxiang: ["又气又想"],
    qixiang: ["又气又想"],
    haizaixiang: ["还在想"],
    yeli: ["夜里又冒出来"],
    yelimao: ["夜里又冒出来"]
  };

  var app = document.getElementById("app");
  var whoChips = document.getElementById("who-chips");
  var durationChips = document.getElementById("duration-chips");
  var whoName = document.getElementById("who-name");
  var theyHave = document.getElementById("they-have");
  var feeling = document.getElementById("feeling");
  var btnPrint = document.getElementById("btn-print");
  var receiptEl = document.getElementById("receipt");
  var receiptStage = document.getElementById("receipt-stage");
  var printer = document.getElementById("printer");
  var led = document.getElementById("led");
  var printStatus = document.getElementById("print-status");
  var ticketActions = document.getElementById("ticket-actions");
  var afterTitle = document.getElementById("after-title");
  var afterCopy = document.getElementById("after-copy");
  var drawerList = document.getElementById("drawer-list");
  var settleSlip = document.getElementById("settle-slip");
  var pet = document.getElementById("pet");
  var petNameTag = document.getElementById("pet-name-tag");
  var printHint = document.getElementById("print-hint");
  var shareSheet = document.getElementById("share-sheet");
  var shareStatus = document.getElementById("share-status");
  var shareBtn = document.getElementById("btn-share-ticket");
  var shareSheetTitle = document.getElementById("share-sheet-title");
  var shareSheetCopy = document.getElementById("share-sheet-copy");
  var plazaLine = document.getElementById("plaza-line");
  var tonightChip = document.getElementById("tonight-chip");
  var weekBanner = document.getElementById("week-banner");
  var shareKind = "ticket";
  var shareMode = "public";
  var SHARE_TEXT_TICKET = "今晚的比较小票。公开安全空票脸 · 已付无法退款";
  var SHARE_TEXT_TEAR = "今晚撕了一张。公开安全空票脸 · 已付无法退款";
  var SHARE_TEXT_WEEK = "本周总票。账单式存根 · 已付无法退款";
  var PET_NAME_KEY = "tonight-comparison-receipt-pet-name";
  var NIGHT_KEY = "tonight-comparison-receipt-night-v1";
  var EMOTION_BUCKETS = ["酸", "不服", "想", "气", "空", "其他"];
  var WEEKDAY_ZH = {
    Mon: "周一",
    Tue: "周二",
    Wed: "周三",
    Thu: "周四",
    Fri: "周五",
    Sat: "周六",
    Sun: "周日"
  };

  var state = {
    whoId: "",
    durationId: "",
    ticket: null,
    printTimer: null,
    timers: [],
    canAct: false,
    tonightIndex: 0,
    remote: null,
    remoteOk: false,
    remotePending: true
  };

  /* 匿名计数：Abacus（CountAPI 继任）。只传固定 key，不传票面/名字/感觉原文。 */
  var COUNTER_NS = "huiminjia13-comparison-receipt";
  var COUNTER_BASE = "https://abacus.jasoncameron.dev";
  var EMO_KEY = {
    "酸": "emo-suan",
    "不服": "emo-bufu",
    "想": "emo-xiang",
    "气": "emo-qi",
    "空": "emo-kong",
    "其他": "emo-qita"
  };

  function counterUrl(action, key) {
    return COUNTER_BASE + "/" + action + "/" + COUNTER_NS + "/" + encodeURIComponent(key);
  }

  function canUseRemoteCounter() {
    try {
      return location.protocol === "http:" || location.protocol === "https:";
    } catch (e) {
      return false;
    }
  }

  function fetchCounterJson(url) {
    return fetch(url, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
      cache: "no-store"
    }).then(function (res) {
      if (!res.ok) throw new Error("counter " + res.status);
      return res.json();
    }).then(function (data) {
      var n = Number(data && data.value);
      if (!isFinite(n) || n < 0) throw new Error("bad value");
      return n;
    });
  }

  function hitCounter(key) {
    if (!canUseRemoteCounter()) return Promise.reject(new Error("offline"));
    return fetchCounterJson(counterUrl("hit", key));
  }

  function getCounter(key) {
    if (!canUseRemoteCounter()) return Promise.reject(new Error("offline"));
    return fetchCounterJson(counterUrl("get", key)).catch(function () {
      return 0;
    });
  }

  function later(fn, ms) {
    var id = window.setTimeout(fn, ms);
    state.timers.push(id);
    return id;
  }

  function clearTimers() {
    state.timers.forEach(function (id) { window.clearTimeout(id); });
    state.timers = [];
  }

  /* ---------- 声音：Web Audio 现场合成，不加载任何文件 ---------- */
  var SOUND_KEY = "tonight-comparison-receipt-sound";
  var soundToggle = document.getElementById("sound-toggle");
  var Sound = (function () {
    var ctx = null;
    var master = null;
    var noiseBuf = null;
    var enabled = true;
    var printBus = null;
    try {
      enabled = localStorage.getItem(SOUND_KEY) !== "off";
    } catch (e) {
      enabled = true;
    }

    function ensure() {
      if (!enabled) return null;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!ctx) {
        try {
          ctx = new AC();
        } catch (e) {
          return null;
        }
        var lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 4200;
        lp.Q.value = 0.5;
        master = ctx.createGain();
        master.gain.value = 0.2;
        lp.connect(master);
        master.connect(ctx.destination);
        master.input = lp;
        var len = Math.floor(ctx.sampleRate * 2);
        noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
        var data = noiseBuf.getChannelData(0);
        for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      }
      if (ctx.state === "suspended" && ctx.resume) ctx.resume();
      return ctx;
    }

    function noise(at, dur, dest) {
      var src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;
      src.connect(dest);
      src.start(at, Math.random() * 1.5);
      src.stop(at + dur + 0.05);
      return src;
    }

    function filter(type, freq, q) {
      var f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q || 0.7;
      return f;
    }

    // 热敏打印机：很轻的走纸摩擦声 + 细碎的步进“嗒嗒”
    function printFeed(duration) {
      if (!ensure()) return;
      stopPrint();
      var t0 = ctx.currentTime + 0.02;
      printBus = ctx.createGain();
      printBus.gain.value = 1;
      printBus.connect(master.input);

      var hiss = ctx.createGain();
      hiss.gain.setValueAtTime(0, t0);
      hiss.gain.linearRampToValueAtTime(0.16, t0 + 0.25);
      hiss.gain.setValueAtTime(0.16, t0 + duration - 0.4);
      hiss.gain.linearRampToValueAtTime(0, t0 + duration);
      var bp = filter("bandpass", 2300, 1.4);
      bp.connect(hiss);
      hiss.connect(printBus);
      noise(t0, duration, bp);

      var motor = ctx.createOscillator();
      motor.type = "triangle";
      motor.frequency.value = 118;
      var mg = ctx.createGain();
      mg.gain.setValueAtTime(0, t0);
      mg.gain.linearRampToValueAtTime(0.05, t0 + 0.2);
      mg.gain.setValueAtTime(0.05, t0 + duration - 0.35);
      mg.gain.linearRampToValueAtTime(0, t0 + duration);
      motor.connect(mg);
      mg.connect(printBus);
      motor.start(t0);
      motor.stop(t0 + duration + 0.05);

      var tickBp = filter("highpass", 2600, 0.7);
      var tickGain = ctx.createGain();
      tickGain.gain.value = 0;
      tickBp.connect(tickGain);
      tickGain.connect(printBus);
      noise(t0, duration, tickBp);
      for (var t = 0.08; t < duration - 0.1; t += 0.038 + Math.random() * 0.012) {
        var a = t0 + t;
        var level = 0.22 * (0.6 + Math.random() * 0.4);
        tickGain.gain.setValueAtTime(level, a);
        tickGain.gain.exponentialRampToValueAtTime(0.0008, a + 0.012);
      }
    }

    function stopPrint() {
      if (printBus && ctx) {
        var now = ctx.currentTime;
        try {
          printBus.gain.cancelScheduledValues(now);
          printBus.gain.setValueAtTime(printBus.gain.value, now);
          printBus.gain.linearRampToValueAtTime(0, now + 0.08);
        } catch (e) { /* ignore */ }
        var old = printBus;
        window.setTimeout(function () { try { old.disconnect(); } catch (e) { /* ignore */ } }, 200);
      }
      printBus = null;
    }

    // 盖章：闷闷的一下
    function thunk() {
      if (!ensure()) return;
      var t0 = ctx.currentTime + 0.01;
      var osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(150, t0);
      osc.frequency.exponentialRampToValueAtTime(55, t0 + 0.14);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.75, t0 + 0.006);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.22);
      osc.connect(g);
      g.connect(master.input);
      osc.start(t0);
      osc.stop(t0 + 0.25);

      var lp = filter("lowpass", 520, 0.8);
      var ng = ctx.createGain();
      ng.gain.setValueAtTime(0.4, t0);
      ng.gain.exponentialRampToValueAtTime(0.001, t0 + 0.06);
      lp.connect(ng);
      ng.connect(master.input);
      noise(t0, 0.08, lp);
    }

    // 撕纸：一串细碎的噪声颗粒，滤波频率慢慢往上走
    function tear(delay, duration) {
      if (!ensure()) return;
      var t0 = ctx.currentTime + (delay || 0);
      var dur = duration || 0.65;
      var hp = filter("highpass", 380, 0.7);
      var bp = filter("bandpass", 1100, 0.9);
      bp.frequency.setValueAtTime(1000, t0);
      bp.frequency.linearRampToValueAtTime(2600, t0 + dur);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0, t0);
      hp.connect(bp);
      bp.connect(g);
      g.connect(master.input);
      noise(t0, dur + 0.1, hp);
      var t = 0;
      while (t < dur) {
        var p = t / dur;
        var shape = Math.min(1, p * 5) * (1 - p * 0.55);
        var grain = 0.004 + Math.random() * 0.012;
        var a = t0 + t;
        g.gain.setValueAtTime(shape * (0.35 + Math.random() * 0.65) * 0.9, a);
        g.gain.exponentialRampToValueAtTime(0.002, a + grain);
        t += grain + Math.random() * 0.01;
      }
      g.gain.setValueAtTime(0.002, t0 + dur);
      g.gain.linearRampToValueAtTime(0, t0 + dur + 0.05);
    }

    // 纸片落下时很轻的沙沙声
    function rustle(delay, level) {
      if (!ensure()) return;
      var t0 = ctx.currentTime + (delay || 0);
      var bp = filter("bandpass", 3200, 0.6);
      var g = ctx.createGain();
      var peak = level || 0.12;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(peak, t0 + 0.09);
      g.gain.linearRampToValueAtTime(peak * 0.4, t0 + 0.2);
      g.gain.linearRampToValueAtTime(0, t0 + 0.38);
      bp.connect(g);
      g.connect(master.input);
      noise(t0, 0.42, bp);
    }

    function purr(delay) {
      if (!ensure()) return;
      var t0 = ctx.currentTime + (delay || 0);
      var osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = 28;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.045, t0 + 0.08);
      g.gain.setValueAtTime(0.045, t0 + 0.28);
      g.gain.linearRampToValueAtTime(0, t0 + 0.5);
      osc.connect(g);
      g.connect(master.input);
      osc.start(t0);
      osc.stop(t0 + 0.55);
    }

    function paws(delay) {
      if (!ensure()) return;
      var t0 = ctx.currentTime + (delay || 0);
      for (var i = 0; i < 4; i++) {
        var a = t0 + i * 0.07;
        var bp = filter("bandpass", 900 + i * 120, 0.8);
        var g = ctx.createGain();
        g.gain.setValueAtTime(0, a);
        g.gain.linearRampToValueAtTime(0.06, a + 0.012);
        g.gain.exponentialRampToValueAtTime(0.001, a + 0.05);
        bp.connect(g);
        g.connect(master.input);
        noise(a, 0.06, bp);
      }
    }

    function setEnabled(on) {
      enabled = on;
      try {
        localStorage.setItem(SOUND_KEY, on ? "on" : "off");
      } catch (e) { /* ignore */ }
      if (!on) {
        stopPrint();
        if (ctx && ctx.suspend) ctx.suspend();
      } else {
        ensure();
      }
    }

    return {
      unlock: ensure,
      printFeed: printFeed,
      stopPrint: stopPrint,
      thunk: thunk,
      tear: tear,
      rustle: rustle,
      purr: purr,
      paws: paws,
      isEnabled: function () { return enabled; },
      setEnabled: setEnabled
    };
  })();

  function syncSoundToggle() {
    var on = Sound.isEnabled();
    soundToggle.textContent = on ? "声音 开" : "声音 关";
    soundToggle.setAttribute("aria-pressed", on ? "true" : "false");
  }
  syncSoundToggle();
  soundToggle.addEventListener("click", function () {
    Sound.setEnabled(!Sound.isEnabled());
    syncSoundToggle();
  });

  function loadStore() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { seq: 0, archived: [], torn: [] };
      var data = JSON.parse(raw);
      if (!data || typeof data !== "object") return { seq: 0, archived: [], torn: [] };
      var archived = Array.isArray(data.archived) ? data.archived : [];
      var torn = Array.isArray(data.torn) ? data.torn : [];
      return {
        seq: Number(data.seq) || 0,
        archived: archived,
        torn: torn
      };
    } catch (e) {
      return { seq: 0, archived: [], torn: [] };
    }
  }

  function saveStore(store) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (e) {
      /* private mode: keep going in memory only */
    }
  }

  function nightKey(date) {
    var p = shanghaiParts(date || new Date());
    return p.year + "-" + p.month + "-" + p.day;
  }

  function emptyEmotions() {
    var o = {};
    EMOTION_BUCKETS.forEach(function (k) { o[k] = 0; });
    return o;
  }

  function bucketFeeling(raw) {
    var feel = String(raw || "");
    if (/酸|眼红|羡慕/.test(feel)) return "酸";
    if (/不服/.test(feel)) return "不服";
    if (/想|惦记|思念|还在想/.test(feel)) return "想";
    if (/气|怒|上头|咬牙|烦/.test(feel)) return "气";
    if (/空|麻|累/.test(feel)) return "空";
    if (!feel.trim()) return "其他";
    return "其他";
  }

  function loadNight() {
    var key = nightKey(new Date());
    var blank = { night: key, prints: 0, emotions: emptyEmotions() };
    try {
      var raw = localStorage.getItem(NIGHT_KEY);
      if (!raw) return blank;
      var data = JSON.parse(raw);
      if (!data || data.night !== key) return blank;
      var emotions = emptyEmotions();
      var src = data.emotions && typeof data.emotions === "object" ? data.emotions : {};
      EMOTION_BUCKETS.forEach(function (k) {
        emotions[k] = Number(src[k]) || 0;
      });
      return {
        night: key,
        prints: Number(data.prints) || 0,
        emotions: emotions
      };
    } catch (e) {
      return blank;
    }
  }

  function saveNight(night) {
    try {
      localStorage.setItem(NIGHT_KEY, JSON.stringify(night));
    } catch (e) { /* ignore */ }
  }

  function topEmotionFrom(emotions, totalHint) {
    var top = "酸";
    var topN = -1;
    EMOTION_BUCKETS.forEach(function (k) {
      if ((emotions[k] || 0) > topN) {
        topN = emotions[k] || 0;
        top = k;
      }
    });
    var denom = Number(totalHint);
    if (!isFinite(denom) || denom <= 0) {
      denom = EMOTION_BUCKETS.reduce(function (a, k) {
        return a + (emotions[k] || 0);
      }, 0);
    }
    var pct = denom > 0 ? Math.round((topN / denom) * 100) : 0;
    return { top: top, pct: pct, topN: topN };
  }

  function plazaSnapshot() {
    var local = loadNight();
    if (state.remoteOk && state.remote) {
      var remote = state.remote;
      var rank = topEmotionFrom(remote.emotions, remote.prints);
      return {
        night: local.night,
        localPrints: local.prints,
        source: "remote",
        opens: remote.opens,
        prints: remote.prints,
        people: remote.prints,
        top: rank.top,
        pct: rank.pct,
        emotions: remote.emotions
      };
    }
    var localRank = topEmotionFrom(local.emotions, local.prints);
    return {
      night: local.night,
      localPrints: local.prints,
      source: state.remotePending ? "pending" : "local",
      opens: 0,
      prints: local.prints,
      people: local.prints,
      top: localRank.top,
      pct: localRank.pct,
      emotions: local.emotions
    };
  }

  function recordTonightPrint(feeling) {
    var night = loadNight();
    night.prints += 1;
    var bucket = bucketFeeling(feeling);
    night.emotions[bucket] = (night.emotions[bucket] || 0) + 1;
    saveNight(night);
    state.tonightIndex = night.prints;
    return { night: night, bucket: bucket };
  }

  function formatPlazaLine(snap) {
    var localBit = snap.localPrints
      ? "本机今晚 " + snap.localPrints + " 张 · "
      : "本机今晚还没打 · ";
    if (snap.source === "pending") {
      return localBit + "正在连广场计数…";
    }
    if (snap.source === "remote") {
      var emoBit =
        snap.prints > 0
          ? " · " + snap.pct + "% 选了『" + snap.top + "』"
          : "";
      return (
        localBit +
        "广场累计打开 " +
        snap.opens +
        " · 打票 " +
        snap.prints +
        emoBit +
        "（匿名实计 · 不含票面）"
      );
    }
    var localEmo =
      snap.localPrints > 0
        ? " · 本机 " + snap.pct + "% 『" + snap.top + "』"
        : "";
    return localBit + "广场计数暂时连不上 · 只显示本机" + localEmo + "（不含票面）";
  }

  function refreshPlaza() {
    var snap = plazaSnapshot();
    if (plazaLine) plazaLine.textContent = formatPlazaLine(snap);
    if (tonightChip) {
      if (state.tonightIndex > 0) {
        tonightChip.hidden = false;
        if (snap.source === "remote") {
          tonightChip.textContent =
            "今晚第 " + state.tonightIndex + " 张 · 广场累计打票 " + snap.prints;
        } else if (snap.source === "pending") {
          tonightChip.textContent = "今晚第 " + state.tonightIndex + " 张 · 广场计数连接中";
        } else {
          tonightChip.textContent =
            "今晚第 " + state.tonightIndex + " 张 · 广场未连上 · 本机 " + snap.localPrints;
        }
      } else {
        tonightChip.hidden = true;
      }
    }
  }

  function applyRemoteCounts(opens, prints, emotions) {
    state.remote = {
      opens: opens,
      prints: prints,
      emotions: emotions
    };
    state.remoteOk = true;
    state.remotePending = false;
    refreshPlaza();
  }

  function markRemoteFailed() {
    state.remoteOk = false;
    state.remotePending = false;
    refreshPlaza();
  }

  function loadRemotePlaza() {
    if (!canUseRemoteCounter()) {
      markRemoteFailed();
      return Promise.resolve();
    }
    state.remotePending = true;
    refreshPlaza();
    var emoGets = EMOTION_BUCKETS.map(function (label) {
      return getCounter(EMO_KEY[label]).then(function (n) {
        return { label: label, n: n };
      });
    });
    return Promise.all([
      getCounter("opens"),
      getCounter("prints"),
      Promise.all(emoGets)
    ]).then(function (parts) {
      var emotions = emptyEmotions();
      parts[2].forEach(function (row) {
        emotions[row.label] = row.n;
      });
      applyRemoteCounts(parts[0], parts[1], emotions);
    }).catch(function () {
      markRemoteFailed();
    });
  }

  function bumpRemoteOpen() {
    if (!canUseRemoteCounter()) {
      markRemoteFailed();
      return;
    }
    hitCounter("opens").then(function (opens) {
      var prev = state.remote || { opens: 0, prints: 0, emotions: emptyEmotions() };
      applyRemoteCounts(opens, prev.prints, prev.emotions);
      return loadRemotePlaza();
    }).catch(function () {
      markRemoteFailed();
    });
  }

  function bumpRemotePrint(bucket) {
    if (!canUseRemoteCounter()) return;
    var emoKey = EMO_KEY[bucket] || EMO_KEY["其他"];
    /* 乐观更新：第二张起广场计数不再慢一拍 */
    var prev = state.remote || { opens: 0, prints: 0, emotions: emptyEmotions() };
    var optimisticEmo = emptyEmotions();
    EMOTION_BUCKETS.forEach(function (k) {
      optimisticEmo[k] = (prev.emotions && prev.emotions[k]) || 0;
    });
    optimisticEmo[bucket] = (optimisticEmo[bucket] || 0) + 1;
    applyRemoteCounts(prev.opens, (prev.prints || 0) + 1, optimisticEmo);
    var seq = (state.printBumpSeq = (state.printBumpSeq || 0) + 1);
    Promise.all([hitCounter("prints"), hitCounter(emoKey)])
      .then(function (parts) {
        if (seq !== state.printBumpSeq) return;
        var emotions = emptyEmotions();
        if (state.remote && state.remote.emotions) {
          EMOTION_BUCKETS.forEach(function (k) {
            emotions[k] = state.remote.emotions[k] || 0;
          });
        }
        emotions[bucket] = Math.max(parts[1], emotions[bucket] || 0);
        var opens = state.remote ? state.remote.opens : 0;
        applyRemoteCounts(opens, Math.max(parts[0], state.remote ? state.remote.prints : 0), emotions);
      })
      .catch(function () {
        loadRemotePlaza();
      });
  }

  /* 缺桶时 hit 一次注册 key，避免 emo-qi / emo-kong / emo-qita 404 */
  function ensureEmoKeys() {
    if (!canUseRemoteCounter()) return;
    var flag = "tonight-receipt-emo-seed-v1";
    try {
      if (sessionStorage.getItem(flag) === "1") return;
      sessionStorage.setItem(flag, "1");
    } catch (e) { /* ignore */ }
    EMOTION_BUCKETS.forEach(function (label, i) {
      var key = EMO_KEY[label];
      window.setTimeout(function () {
        fetch(counterUrl("get", key), {
          method: "GET",
          mode: "cors",
          credentials: "omit",
          cache: "no-store"
        })
          .then(function (res) {
            return res.json().then(function (data) {
              return { ok: res.ok, data: data };
            });
          })
          .then(function (pack) {
            var missing =
              !pack.ok ||
              (pack.data && pack.data.error) ||
              (pack.data && typeof pack.data.value === "undefined");
            if (missing) return hitCounter(key);
            return pack.data.value;
          })
          .catch(function () {
            return hitCounter(key).catch(function () { return 0; });
          });
      }, 120 * i);
    });
  }

  /* 「今晚」日界 / 周结算：Asia/Shanghai。票面时钟：浏览器本地时区（Intl），避免东京机显示上海差一小时。 */
  var NIGHT_TZ = "Asia/Shanghai";

  function isShanghaiSunday(date) {
    var p = shanghaiParts(date || new Date());
    return p.weekday === "Sun";
  }

  function weekdayZhFromParts(p) {
    return WEEKDAY_ZH[p.weekday] || p.weekday || "—";
  }

  function formatPartsInZone(date, timeZone) {
    var opts = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    };
    if (timeZone) opts.timeZone = timeZone;
    var parts = new Intl.DateTimeFormat("en-GB", opts).formatToParts(date);
    var map = {};
    parts.forEach(function (p) {
      map[p.type] = p.value;
    });
    /* en-GB + hour12:false 偶发 "24" → 归一成 00 */
    if (map.hour === "24") map.hour = "00";
    return map;
  }

  function shanghaiParts(date) {
    return formatPartsInZone(date, NIGHT_TZ);
  }

  /* 票面日期/时间：本机时区 */
  function faceClockParts(date) {
    return formatPartsInZone(date, null);
  }

  function shanghaiHour(date) {
    var h = parseInt(shanghaiParts(date).hour, 10);
    return isNaN(h) ? 0 : h;
  }

  function isNightShiftHour(date) {
    var h = shanghaiHour(date);
    return h >= 0 && h < 5;
  }

  function weekStartKey(date) {
    var p = shanghaiParts(date);
    /* 中午 +08:00，用 UTC 日历日推周一，避免浏览器本地时区干扰。 */
    var noon = new Date(p.year + "-" + p.month + "-" + p.day + "T12:00:00+08:00");
    var day = noon.getUTCDay();
    var offset = day === 0 ? -6 : 1 - day;
    noon.setUTCDate(noon.getUTCDate() + offset);
    var y = noon.getUTCFullYear();
    var m = String(noon.getUTCMonth() + 1).padStart(2, "0");
    var d = String(noon.getUTCDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }

  function padNo(n) {
    return String(n).padStart(4, "0");
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function whoLabel(id) {
    var found = WHO.filter(function (w) { return w.id === id; })[0];
    return found ? found.label : "";
  }

  function durationLabel(id) {
    var found = DURATIONS.filter(function (w) { return w.id === id; })[0];
    return found ? found.label : "";
  }

  function objectLine(ticket) {
    var name = (ticket.whoName || "").trim();
    var label = ticket.whoLabel;
    if (ticket.whoId === "anon" && !name) return "匿名";
    if (name && label) return name + " · " + label;
    if (name) return name;
    return label;
  }

  function renderChips(root, items, group) {
    root.innerHTML = "";
    items.forEach(function (item) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.dataset.id = item.id;
      btn.dataset.group = group;
      btn.setAttribute("role", "radio");
      btn.setAttribute("aria-checked", "false");
      btn.textContent = item.label;
      root.appendChild(btn);
    });
  }

  function selectedId(root) {
    var on = root.querySelector('[aria-checked="true"]');
    return on ? on.dataset.id : "";
  }

  function thoughtReady() {
    return Boolean(selectedId(whoChips) || whoName.value.trim());
  }

  function printReady() {
    /* 感觉、停留、比较一口都不挡打印。门槛只是「今天你想到了谁」。 */
    return thoughtReady();
  }

  function syncPrintEnabled() {
    var ok = printReady();
    btnPrint.setAttribute("aria-disabled", ok ? "false" : "true");
    btnPrint.classList.toggle("is-wait", !ok);
    btnPrint.textContent = ok ? "打印" : "先写想到了谁";
    syncThoughtNHint();
    if (ok && printHint) printHint.hidden = true;
  }

  function nudgeWho() {
    var block = document.getElementById("who-block");
    if (block) {
      block.classList.remove("is-shake");
      void block.offsetWidth;
      block.classList.add("is-shake");
    }
    if (printHint) printHint.hidden = false;
    if (whoName) whoName.focus();
  }

  function show(name) {
    app.dataset.screen = name;
    if (shareSheet) shareSheet.hidden = true;
    if (name === "landing" || name === "form") petMood("idle");
    if (name === "landing") refreshPlaza();
  }

  function selectChip(root, id) {
    root.querySelectorAll(".chip").forEach(function (c) {
      c.setAttribute("aria-checked", c.dataset.id === id ? "true" : "false");
    });
  }

  function resetForm() {
    state.whoId = "past";
    state.durationId = "";
    whoName.value = "";
    theyHave.value = "";
    feeling.value = "";
    selectChip(whoChips, "past");
    durationChips.querySelectorAll(".chip").forEach(function (c) {
      c.setAttribute("aria-checked", "false");
    });
    var pinyinBox = document.getElementById("feeling-pinyin");
    var pinyinList = document.getElementById("feeling-pinyin-list");
    if (pinyinBox) pinyinBox.hidden = true;
    if (pinyinList) pinyinList.innerHTML = "";
    petMood("idle");
    syncPrintEnabled();
  }

  function petMood(mood) {
    if (!pet) return;
    pet.classList.remove("is-gone");
    if (mood === "idle") {
      pet.dataset.pose = "loaf";
      pet.dataset.mood = "idle";
      return;
    }
    if (mood === "gone") {
      pet.dataset.mood = "gone";
      pet.classList.add("is-gone");
      return;
    }
    if (reducedMotion()) {
      if (mood === "pride") {
        pet.dataset.mood = "flick";
        later(function () {
          pet.dataset.pose = "back";
          pet.dataset.mood = "proud";
        }, 400);
        return;
      }
      if (mood === "flee") {
        pet.dataset.mood = "fade";
        later(function () { pet.classList.add("is-gone"); }, 400);
        return;
      }
      if (mood === "watch" || mood === "blink" || mood === "flick") {
        pet.dataset.mood = mood;
        return;
      }
      pet.dataset.mood = "idle";
      return;
    }
    pet.dataset.mood = mood;
    if (mood === "pride") {
      pet.dataset.pose = "loaf";
      later(function () {
        pet.dataset.pose = "back";
        pet.dataset.mood = "proud";
      }, 520);
    }
    if (mood === "flee") {
      later(function () { pet.classList.add("is-gone"); }, 680);
    }
    if (mood === "blink") {
      later(function () { pet.dataset.mood = "watch"; }, 280);
    }
  }

  function receiptRow(k, v) {
    if (!String(v || "").trim()) return "";
    return '<div class="row"><span class="k">' + k + "</span><span>" + escapeHtml(v) + "</span></div>";
  }

  function feelingTone(raw) {
    var feel = String(raw || "");
    if (/怒火|怒/.test(feel)) return "怒火";
    if (/思念|惦记/.test(feel)) return "思念";
    if (/酸|眼红|羡慕/.test(feel)) return "酸";
    if (/不服/.test(feel)) return "不服";
    if (/空|空得很|麻/.test(feel)) return "空";
    if (/想赢|上头|比较上头/.test(feel)) return "想赢";
    if (/想|还在想/.test(feel)) return "想";
    if (/气|烦|咬牙|憋/.test(feel)) return "气";
    if (!feel.trim()) return "空票";
    return "其他";
  }

  function pickStamp(ticket) {
    /* 凌晨夜班章（上海 00:00–05:00）：稀有，压过普通感觉章 */
    if (ticket && ticket.nightShift) return "凌晨夜班";
    var tone = feelingTone(ticket && ticket.feeling);
    if (tone === "怒火") return "怒火入账";
    if (tone === "思念") return "还在想";
    if (tone === "酸") return "已酸过";
    if (tone === "不服") return "不服";
    if (tone === "空") return "空账一笔";
    if (tone === "想赢") return "想赢未退";
    if (tone === "想") return "还在想";
    if (tone === "气") return "今晚结算";
    if (tone === "空票") return "已付无法退款";
    var pool = STAMPS;
    return pool[((ticket && ticket.no) || 0) % pool.length];
  }

  function settlementLine(ticket) {
    if (ticket && ticket.nightShift) {
      return "夜班加盖。<br>别人睡了，你还在记账。<br><strong>凌晨结算 · 无法退款。</strong>";
    }
    var tone = feelingTone(ticket && ticket.feeling);
    if (tone === "怒火") return "火气过秤。<br>烫，但算数。<br><strong>怒火入账 · 不退。</strong>";
    if (tone === "思念") return "惦记过秤。<br>不解释好不好。<br><strong>还在想 · 已付。</strong>";
    if (tone === "酸") return "酸也是燃料。<br>牙痒也记一笔。<br><strong>已酸过 · 无法退款。</strong>";
    if (tone === "不服") return "不服气，也算数。<br>不说服你。<br><strong>不服 · 今晚结算。</strong>";
    if (tone === "空") return "空着也出票。<br>空白不是没发生。<br><strong>空账一笔 · 已付。</strong>";
    if (tone === "想赢") return "想赢写进存根。<br>赢不赢另说。<br><strong>想赢未退 · 已付。</strong>";
    if (tone === "想") return "又想到了。<br>记下就好。<br><strong>还在想 · 无法退款。</strong>";
    if (tone === "气") return "气过这一下。<br>不评价你。<br><strong>今晚结算 · 已付。</strong>";
    if (tone === "空票") return "比较不是病。<br>是燃料。<br><strong>今晚结算 · 已付无法退款。</strong>";
    return "这一笔入账。<br>不排名、不诊断。<br><strong>今晚结算 · 已付无法退款。</strong>";
  }

  function petReactToFeeling(feeling) {
    var tone = feelingTone(feeling);
    if (tone === "怒火" || tone === "气") {
      petMood("flick");
      later(function () { petMood("watch"); }, 480);
      return;
    }
    if (tone === "思念" || tone === "想") {
      petMood("blink");
      later(function () { petMood("watch"); }, 320);
      return;
    }
    if (tone === "酸" || tone === "不服" || tone === "想赢") {
      petMood("watch");
      return;
    }
    petMood("blink");
  }

  function normalizeThoughtKey(ticketOrParts) {
    var name = "";
    var label = "";
    var whoId = "";
    if (typeof ticketOrParts === "string") {
      name = ticketOrParts.trim();
    } else if (ticketOrParts) {
      name = String(ticketOrParts.whoName || "").trim();
      label = String(ticketOrParts.whoLabel || "").trim();
      whoId = String(ticketOrParts.whoId || "").trim();
    }
    if (name) return "n:" + name.toLowerCase();
    if (whoId && whoId !== "anon") return "id:" + whoId;
    if (label) return "l:" + label;
    return "";
  }

  function loadThoughtCounts() {
    try {
      var raw = localStorage.getItem(THOUGHT_COUNT_KEY);
      if (!raw) return {};
      var data = JSON.parse(raw);
      return data && typeof data === "object" ? data : {};
    } catch (e) {
      return {};
    }
  }

  function saveThoughtCounts(map) {
    try {
      localStorage.setItem(THOUGHT_COUNT_KEY, JSON.stringify(map));
    } catch (e) { /* ignore */ }
  }

  function peekThoughtCount(key) {
    if (!key) return 0;
    var map = loadThoughtCounts();
    return Number(map[key]) || 0;
  }

  function bumpThoughtCount(key) {
    if (!key) return 1;
    var map = loadThoughtCounts();
    map[key] = (Number(map[key]) || 0) + 1;
    saveThoughtCounts(map);
    return map[key];
  }

  function currentThoughtKey() {
    return normalizeThoughtKey({
      whoId: selectedId(whoChips),
      whoLabel: whoLabel(selectedId(whoChips)),
      whoName: whoName.value.trim()
    });
  }

  function syncThoughtNHint() {
    var el = document.getElementById("thought-n-hint");
    if (!el) return;
    var key = currentThoughtKey();
    var n = peekThoughtCount(key);
    /* 已打过至少一次后，再想到同一人 → 第 N+1 次预告 */
    if (key && n >= 1) {
      el.hidden = false;
      el.textContent = "这是你第 " + (n + 1) + " 次想到 TA";
    } else {
      el.hidden = true;
      el.textContent = "";
    }
  }

  function receiptHtml(ticket) {
    var stamp = ticket.stamp || pickStamp(ticket);
    var settle = ticket.settlement || settlementLine(ticket);
    var tonight = ticket.tonightIndex ? "今晚第 " + ticket.tonightIndex + " 张" : "合计 今晚 × 1";
    var nth =
      ticket.thoughtN && ticket.thoughtN >= 2
        ? '<div class="receipt-nth">这是你第 ' + ticket.thoughtN + " 次想到 TA</div>"
        : "";
    return (
      '<div class="receipt-head">今晚的比较小票</div>' +
      '<div class="receipt-sub">今天想到了谁 · 热敏存根</div>' +
      '<div class="dash"></div>' +
      '<div class="row"><span class="k">日期</span><span>' + escapeHtml(ticket.date) + "</span></div>" +
      '<div class="row"><span class="k">时间</span><span>' + escapeHtml(ticket.clock) + "</span></div>" +
      '<div class="row"><span class="k">想到</span><span>' + escapeHtml(objectLine(ticket)) + "</span></div>" +
      nth +
      receiptRow("感觉", ticket.feeling) +
      receiptRow("停留", ticket.durationLabel) +
      receiptRow("比一口", ticket.theyHave) +
      '<div class="dash"></div>' +
      '<div class="verdict">' + settle + "</div>" +
      '<div class="dash"></div>' +
      '<div class="receipt-no"><span>No. ' + padNo(ticket.no) + "</span><span>" + escapeHtml(tonight) + "</span></div>" +
      '<div class="stamp-slot"><div class="stamp">' + escapeHtml(stamp) + "</div></div>" +
      '<div class="receipt-foot">本机存根 · 默认不分享。<br>票面时钟为本机时区 · 「今晚」按上海日界。<br>不是心理咨询、不算命、不保证心情变好。</div>'
    );
  }

  function buildTicket() {
    var store = loadStore();
    var no = store.seq + 1;
    var now = new Date();
    var face = faceClockParts(now);
    var nightShift = isNightShiftHour(now);
    var draft = {
      no: no,
      whoId: selectedId(whoChips),
      whoLabel: whoLabel(selectedId(whoChips)),
      whoName: whoName.value.trim(),
      theyHave: theyHave.value.trim(),
      feeling: feeling.value.trim(),
      durationId: selectedId(durationChips),
      durationLabel: durationLabel(selectedId(durationChips)),
      /* 票面时钟：本机时区；weekKey / 今晚仍按上海 */
      clock: face.hour + ":" + face.minute,
      date: face.year + "-" + face.month + "-" + face.day,
      weekday: face.weekday,
      createdAt: now.toISOString(),
      weekKey: weekStartKey(now),
      nightShift: nightShift
    };
    var thoughtKey = normalizeThoughtKey(draft);
    draft.thoughtN = bumpThoughtCount(thoughtKey);
    draft.stamp = pickStamp(draft);
    draft.settlement = settlementLine(draft);
    return draft;
  }

  function reducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  var PRINT_MS = 2400;

  function startPrint() {
    if (!printReady()) {
      nudgeWho();
      return;
    }
    Sound.unlock();
    var store = loadStore();
    var ticket = buildTicket();
    store.seq = ticket.no;
    saveStore(store);
    var recorded = recordTonightPrint(ticket.feeling);
    ticket.tonightIndex = recorded.night.prints;
    bumpRemotePrint(recorded.bucket);
    state.ticket = ticket;
    state.canAct = false;
    clearTimers();
    petMood("watch");

    receiptStage.className = "receipt-stage";
    receiptStage.innerHTML = "";
    receiptEl = document.createElement("article");
    receiptEl.className = "receipt";
    receiptEl.id = "receipt";
    receiptEl.innerHTML = receiptHtml(ticket);
    receiptStage.appendChild(receiptEl);

    printer.classList.remove("is-done");
    led.classList.add("on");
    printStatus.textContent = "出票中";
    ticketActions.hidden = true;
    if (tonightChip) tonightChip.hidden = true;
    show("ticket");

    if (reducedMotion()) {
      receiptEl.classList.add("is-shown");
      Sound.printFeed(0.9);
      later(finishPrint, 900);
      return;
    }

    Sound.printFeed(PRINT_MS / 1000);
    window.requestAnimationFrame(function () {
      receiptEl.classList.add("is-out");
    });
    later(finishPrint, PRINT_MS + 100);
  }

  // 纸完全出来 → 盖章落下 → 才出现「归档 / 撕掉」
  function finishPrint() {
    led.classList.remove("on");
    printer.classList.add("is-done");
    if (receiptEl) {
      receiptEl.classList.add("is-shown");
      receiptEl.classList.remove("is-out");
      receiptEl.classList.add("is-stamped");
    }
    var reduce = reducedMotion();
    // 章的动画在约 60% 处“落地”
    later(function () {
      Sound.thunk();
      petReactToFeeling(state.ticket && state.ticket.feeling);
    }, reduce ? 0 : 180);
    later(function () {
      printStatus.textContent = "请取票";
      ticketActions.hidden = false;
      state.canAct = true;
      refreshPlaza();
      maybeAskPetName();
    }, reduce ? 150 : 520);
  }

  function archiveTicket() {
    if (!state.ticket || !state.canAct) return;
    state.canAct = false;
    var store = loadStore();
    store.archived.push({
      no: state.ticket.no,
      date: state.ticket.date,
      clock: state.ticket.clock,
      who: objectLine(state.ticket),
      theyHave: state.ticket.theyHave,
      feeling: state.ticket.feeling,
      duration: state.ticket.durationLabel,
      createdAt: state.ticket.createdAt,
      weekKey: state.ticket.weekKey,
      hour: parseInt(state.ticket.clock, 10)
    });
    saveStore(store);

    ticketActions.hidden = true;
    printStatus.textContent = "";
    if (reducedMotion()) {
      petMood("pride");
      Sound.purr(0);
      later(function () { goAfter("archive"); }, 800);
      return;
    }
    receiptEl.classList.add("is-archiving");
    later(function () {
      petMood("pride");
      Sound.purr(0);
    }, 800);
    later(function () {
      goAfter("archive");
    }, 1600);
  }

  // 生成一条锯齿撕口：两半的 clip-path 和撕裂线用同一组点，边缘严丝合缝
  function tearPoints() {
    var pts = [];
    var steps = 26;
    var x = 50;
    for (var i = 0; i <= steps; i++) {
      var y = (i / steps) * 100;
      var jag = (i % 2 === 0 ? 1 : -1) * (1.5 + Math.random() * 3.5);
      x = Math.max(40, Math.min(60, 50 + (x - 50) * 0.4 + jag + (Math.random() - 0.5) * 3));
      pts.push([Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
    }
    return pts;
  }

  function halfClip(pts, side) {
    var edge = side === "left" ? "0%" : "100%";
    var path = pts.map(function (p) { return p[0] + "% " + p[1] + "%"; });
    return "polygon(" + edge + " 0%, " + path.join(", ") + ", " + edge + " 100%)";
  }

  /* 撕口高潮后立刻进「已撕掉」，不再空等打印机画面 */
  var TEAR_MS = 980;
  var TEAR_CLIMAX_MS = 520;

  function spawnTearBurst() {
    var host = document.getElementById("tear-burst");
    if (!host) {
      host = document.createElement("div");
      host.id = "tear-burst";
      host.className = "tear-burst";
      host.setAttribute("aria-hidden", "true");
      document.body.appendChild(host);
    }
    host.innerHTML = "";
    host.classList.add("is-on");
    var colors = ["#f3eee0", "#e8e1d0", "#c42b22", "#e8c37a", "#d7ccbb", "#f0a040"];
    for (var i = 0; i < 28; i++) {
      var bit = document.createElement("span");
      bit.className = i % 3 === 0 ? "tear-burst-bit is-confetti" : "tear-burst-bit";
      var dx = (Math.random() - 0.5) * 220;
      var dy = -40 - Math.random() * 160;
      var rot = (Math.random() - 0.5) * 520;
      bit.style.setProperty("--dx", dx.toFixed(1) + "px");
      bit.style.setProperty("--dy", dy.toFixed(1) + "px");
      bit.style.setProperty("--rot", rot.toFixed(1) + "deg");
      bit.style.left = 42 + Math.random() * 16 + "%";
      bit.style.top = 38 + Math.random() * 18 + "%";
      bit.style.background = colors[i % colors.length];
      bit.style.animationDelay = (Math.random() * 0.08).toFixed(2) + "s";
      host.appendChild(bit);
    }
    later(function () {
      host.classList.remove("is-on");
      host.innerHTML = "";
    }, 1100);
  }

  function tearTicket() {
    if (!state.ticket || !state.canAct) return;
    state.canAct = false;
    ticketActions.hidden = true;
    printStatus.textContent = "";
    var store = loadStore();
    store.torn = store.torn || [];
    store.torn.push({ weekKey: state.ticket.weekKey, at: state.ticket.createdAt });
    saveStore(store);
    petMood("flee");
    Sound.paws(0);
    Sound.unlock();

    if (reducedMotion()) {
      Sound.tear(0, 0.35);
      spawnTearBurst();
      receiptEl.classList.add("is-fading");
      later(function () {
        goAfter("tear");
      }, 420);
      return;
    }

    var pts = tearPoints();
    var html = receiptEl.innerHTML;
    var line = pts.map(function (p) { return p[0] + "," + p[1]; }).join(" ");

    ["left", "right"].forEach(function (side) {
      var half = document.createElement("div");
      half.className = "receipt-half " + side;
      half.style.clipPath = halfClip(pts, side);
      half.style.webkitClipPath = halfClip(pts, side);
      half.innerHTML = '<article class="receipt is-shown is-stamped">' + html + "</article>";
      receiptStage.appendChild(half);
    });

    var svgNS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "tear-line");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("aria-hidden", "true");
    var poly = document.createElementNS(svgNS, "polyline");
    poly.setAttribute("points", line);
    poly.setAttribute("pathLength", "1");
    poly.setAttribute("vector-effect", "non-scaling-stroke");
    svg.appendChild(poly);
    receiptStage.appendChild(svg);

    receiptEl.style.visibility = "hidden";
    receiptStage.classList.add("is-tearing");

    Sound.tear(0.12, 0.48);
    Sound.rustle(0.55, 0.14);
    later(function () {
      spawnTearBurst();
      Sound.rustle(0, 0.1);
    }, TEAR_CLIMAX_MS);
    later(function () {
      goAfter("tear");
    }, TEAR_MS);
  }

  function goAfter(kind) {
    clearTimers();
    Sound.stopPrint();
    if (kind === "archive") {
      afterTitle.textContent = "已归档";
      afterCopy.textContent = "进抽屉了。今晚结过一次。";
      pet.dataset.pose = "back";
      pet.dataset.mood = "proud";
      pet.classList.remove("is-gone");
      if (shareBtn) {
        shareBtn.hidden = false;
        shareBtn.textContent = "分享今晚的账单";
      }
      shareKind = "ticket";
    } else {
      afterTitle.textContent = "已撕掉";
      afterCopy.textContent = "撕了。不留底。";
      petMood("gone");
      if (shareBtn) {
        shareBtn.hidden = false;
        shareBtn.textContent = "分享今晚撕了一张";
      }
      shareKind = "tear";
    }
    show("after");
  }

  function thisWeekTickets() {
    var key = weekStartKey(new Date());
    return loadStore().archived.filter(function (t) {
      return t.weekKey === key;
    });
  }

  function thisWeekTorn() {
    var key = weekStartKey(new Date());
    return (loadStore().torn || []).filter(function (t) {
      return t.weekKey === key;
    });
  }

  function hourSlot(clock) {
    var h = parseInt(String(clock || "0"), 10);
    if (isNaN(h)) h = 0;
    if (h < 6) return "凌晨";
    if (h < 12) return "上午";
    if (h < 18) return "下午";
    return "晚上";
  }

  function modeOf(list) {
    var counts = {};
    list.forEach(function (k) {
      if (!k) return;
      counts[k] = (counts[k] || 0) + 1;
    });
    var best = "";
    var n = 0;
    Object.keys(counts).forEach(function (k) {
      if (counts[k] > n) {
        n = counts[k];
        best = k;
      }
    });
    return best || "—";
  }

  function weekSummary() {
    var tickets = thisWeekTickets();
    var torn = thisWeekTorn();
    var x = tickets.length;
    var y = torn.length;
    var n = x + y;
    var who = modeOf(tickets.map(function (t) { return t.who; }));
    var slot = modeOf(tickets.map(function (t) { return hourSlot(t.clock); }));
    var feel = modeOf(tickets.map(function (t) { return (t.feeling || "").trim(); }));
    var byDay = {};
    var acidByDay = {};
    tickets.forEach(function (t) {
      var day = t.date || "";
      byDay[day] = (byDay[day] || 0) + 1;
      if (/酸|眼红|羡慕/.test(String(t.feeling || ""))) {
        acidByDay[day] = (acidByDay[day] || 0) + 1;
      }
    });
    var peakDay = "";
    var peakN = 0;
    Object.keys(byDay).forEach(function (d) {
      if (byDay[d] > peakN) {
        peakN = byDay[d];
        peakDay = d;
      }
    });
    var acidDay = "";
    var acidN = 0;
    Object.keys(acidByDay).forEach(function (d) {
      if (acidByDay[d] > acidN) {
        acidN = acidByDay[d];
        acidDay = d;
      }
    });
    function dayLabel(iso) {
      if (!iso) return "—";
      var fake = new Date(iso + "T12:00:00+08:00");
      var p = shanghaiParts(fake);
      return weekdayZhFromParts(p);
    }
    return {
      tickets: tickets,
      torn: torn,
      archived: x,
      tornCount: y,
      total: n,
      who: who,
      slot: slot,
      feel: feel || "—",
      peakDayLabel: dayLabel(peakDay),
      acidDayLabel: acidDay ? dayLabel(acidDay) : "",
      weekKey: weekStartKey(new Date()),
      byDay: byDay
    };
  }

  function renderDrawer() {
    var summary = weekSummary();
    if (weekBanner) {
      weekBanner.hidden = !isShanghaiSunday(new Date());
    }
    settleSlip.innerHTML =
      '<div class="settle-head">本周结算单</div>' +
      '<div class="dash"></div>' +
      '<div class="row"><span class="k">出票</span><span>' + summary.total + "</span></div>" +
      '<div class="row"><span class="k">归档</span><span>' + summary.archived + "</span></div>" +
      '<div class="row"><span class="k">撕掉</span><span>' + summary.tornCount + "</span></div>" +
      '<div class="dash"></div>' +
      '<div class="row"><span class="k">最常想到</span><span>' + escapeHtml(summary.who) + "</span></div>" +
      '<div class="row"><span class="k">最常时段</span><span>' + escapeHtml(summary.slot) + "</span></div>" +
      '<div class="row"><span class="k">最常感觉</span><span>' + escapeHtml(summary.feel) + "</span></div>" +
      (summary.acidDayLabel
        ? '<div class="row"><span class="k">最酸的是</span><span>' + escapeHtml(summary.acidDayLabel) + "</span></div>"
        : "") +
      '<div class="dash"></div>' +
      '<div class="settle-foot">撕掉的不留底。本机不评价、不排名。可导出周总票晒图。</div>';

    drawerList.innerHTML = "";
    if (!summary.tickets.length) {
      var empty = document.createElement("li");
      empty.className = "drawer-empty";
      empty.textContent = "本周还空着。想到谁就打一张。比较可以空着。";
      drawerList.appendChild(empty);
      return;
    }
    summary.tickets
      .slice()
      .reverse()
      .forEach(function (t) {
        var li = document.createElement("li");
        var extra = t.theyHave ? " · 比一口 " + t.theyHave : "";
        li.innerHTML =
          '<div class="meta">' +
          escapeHtml(t.date) +
          " " +
          escapeHtml(t.clock) +
          " · No. " +
          padNo(t.no) +
          "</div>" +
          "<div>" +
          escapeHtml(t.who) +
          extra +
          "</div>";
        drawerList.appendChild(li);
      });
  }

  function onChipClick(e) {
    var btn = e.target.closest(".chip");
    if (!btn) return;
    var root = btn.parentElement;
    if (btn.dataset.group === "duration" && btn.getAttribute("aria-checked") === "true") {
      btn.setAttribute("aria-checked", "false");
      syncPrintEnabled();
      return;
    }
    root.querySelectorAll(".chip").forEach(function (c) {
      c.setAttribute("aria-checked", c === btn ? "true" : "false");
    });
    syncPrintEnabled();
  }

  renderChips(whoChips, WHO, "who");
  renderChips(durationChips, DURATIONS, "duration");

  whoChips.addEventListener("click", onChipClick);
  durationChips.addEventListener("click", onChipClick);
  feeling.addEventListener("input", syncPrintEnabled);
  whoName.addEventListener("input", syncPrintEnabled);

  document.getElementById("btn-start").addEventListener("click", function () {
    Sound.unlock();
    resetForm();
    show("form");
  });
  document.getElementById("btn-form-back").addEventListener("click", function () {
    show("landing");
  });
  btnPrint.addEventListener("click", startPrint);
  document.getElementById("btn-archive").addEventListener("click", archiveTicket);
  document.getElementById("btn-tear").addEventListener("click", tearTicket);
  document.getElementById("btn-again").addEventListener("click", function () {
    resetForm();
    show("form");
  });
  document.getElementById("btn-open-drawer").addEventListener("click", function () {
    renderDrawer();
    show("drawer");
  });
  document.getElementById("btn-after-drawer").addEventListener("click", function () {
    renderDrawer();
    show("drawer");
  });
  document.getElementById("btn-drawer-new").addEventListener("click", function () {
    resetForm();
    show("form");
  });
  document.getElementById("btn-drawer-home").addEventListener("click", function () {
    show("landing");
  });

  function isImeComposing(e, el) {
    if (el && el.dataset.composing === "1") return true;
    return Boolean(
      e.isComposing ||
      e.keyCode === 229 ||
      e.which === 229 ||
      e.key === "Process" ||
      e.key === "Unidentified"
    );
  }

  function renderSuggestChips(root, words, mode) {
    if (!root) return;
    root.innerHTML = "";
    words.forEach(function (word) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "suggest-chip";
      btn.dataset.value = word;
      btn.dataset.mode = mode || "set";
      btn.textContent = word;
      root.appendChild(btn);
    });
  }

  function fillFromChip(input, value, mode) {
    if (!input) return;
    if (input.dataset.composing === "1") return;
    var next = value;
    var cur = input.value.trim();
    /* 同一词再点一次 → 拼一句（追加）；已有别的词时也可追加短句 */
    if (mode === "append" || (cur && cur !== value && input.id === "feeling")) {
      next = cur ? cur + "，" + value : value;
      if (next.length > (input.maxLength || 40)) next = value;
    } else if (cur === value && input.id === "feeling") {
      /* 再点同一词不重复填 */
      input.focus();
      return;
    }
    input.value = next;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
  }

  function normalizePinyin(raw) {
    return String(raw || "")
      .toLowerCase()
      .replace(/[^a-z]/g, "");
  }

  function feelingCandidates(raw) {
    var key = normalizePinyin(raw);
    if (!key || key.length < 2) return [];
    if (PINYIN_FEELING[key]) return PINYIN_FEELING[key].slice();
    var hits = [];
    Object.keys(PINYIN_FEELING).forEach(function (k) {
      if (k.indexOf(key) === 0 || key.indexOf(k) === 0) {
        PINYIN_FEELING[k].forEach(function (w) {
          if (hits.indexOf(w) === -1) hits.push(w);
        });
      }
    });
    return hits.slice(0, 6);
  }

  function syncFeelingPinyin() {
    var box = document.getElementById("feeling-pinyin");
    var list = document.getElementById("feeling-pinyin-list");
    if (!box || !list || !feeling) return;
    if (feeling.dataset.composing === "1") {
      box.hidden = true;
      return;
    }
    var raw = feeling.value.trim();
    /* 已有中文就不打扰；只在像拼音的拉丁输入时出候选 */
    if (!raw || /[\u4e00-\u9fff]/.test(raw)) {
      box.hidden = true;
      list.innerHTML = "";
      return;
    }
    var cands = feelingCandidates(raw);
    if (!cands.length) {
      box.hidden = true;
      list.innerHTML = "";
      return;
    }
    list.innerHTML = "";
    cands.forEach(function (word) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "suggest-chip is-pinyin";
      btn.dataset.value = word;
      btn.dataset.mode = "set";
      btn.setAttribute("role", "option");
      btn.textContent = word;
      list.appendChild(btn);
    });
    box.hidden = false;
  }

  function renderFeelingSuggest() {
    var root = document.getElementById("feeling-suggest");
    if (!root) return;
    root.innerHTML = "";
    var words = FEELING_MORE_OPEN
      ? FEELING_PRIMARY.concat(FEELING_MORE)
      : FEELING_PRIMARY.slice();
    words.forEach(function (word) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "suggest-chip";
      btn.dataset.value = word;
      btn.dataset.mode = "set";
      btn.textContent = word;
      root.appendChild(btn);
    });
    if (!FEELING_MORE_OPEN && FEELING_MORE.length) {
      var more = document.createElement("button");
      more.type = "button";
      more.className = "suggest-chip is-more";
      more.textContent = "更多";
      more.setAttribute("aria-expanded", "false");
      more.addEventListener("click", function (e) {
        e.stopPropagation();
        FEELING_MORE_OPEN = true;
        renderFeelingSuggest();
      });
      root.appendChild(more);
    }
  }

  renderFeelingSuggest();
  renderSuggestChips(document.getElementById("who-name-suggest"), WHO_NAME_WORDS, "set");
  renderSuggestChips(document.getElementById("they-have-suggest"), THEY_HAVE_WORDS, "set");

  document.querySelectorAll(".suggest-chips").forEach(function (root) {
    root.addEventListener("click", function (e) {
      var btn = e.target.closest(".suggest-chip");
      if (!btn) return;
      var forId = root.id === "feeling-pinyin-list" ? "feeling" : root.getAttribute("data-for");
      var input = document.getElementById(forId);
      fillFromChip(input, btn.dataset.value, btn.dataset.mode || "set");
      if (forId === "feeling") {
        var box = document.getElementById("feeling-pinyin");
        if (box) box.hidden = true;
      }
    });
  });

  ["who-name", "they-have", "feeling", "pet-name-input"].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.setAttribute("lang", "zh-CN");
    el.setAttribute("inputmode", "text");
    el.setAttribute("spellcheck", "false");
    el.setAttribute("autocapitalize", "off");
    el.setAttribute("autocorrect", "off");
    el.addEventListener("compositionstart", function () {
      el.dataset.composing = "1";
      if (el === feeling) {
        var box = document.getElementById("feeling-pinyin");
        if (box) box.hidden = true;
      }
    });
    el.addEventListener("compositionend", function () {
      el.dataset.composing = "";
      if (el === feeling) {
        syncPrintEnabled();
        syncFeelingPinyin();
      }
      if (el === whoName) syncPrintEnabled();
    });
    el.addEventListener("input", function () {
      if (el.dataset.composing === "1") return;
      if (el === feeling) syncFeelingPinyin();
      if (el === whoName) syncThoughtNHint();
    });
    el.addEventListener("keydown", function (e) {
      if (isImeComposing(e, el)) return;
      if (e.key !== "Enter") return;
      if (el === whoName || el === theyHave || el === feeling) {
        e.preventDefault();
        startPrint();
      }
    });
    /* 手机打好粘贴到云桌面：粘贴后同步打印按钮与拼音栏 */
    el.addEventListener("paste", function () {
      window.setTimeout(function () {
        if (el.dataset.composing === "1") return;
        if (el === feeling) {
          syncPrintEnabled();
          syncFeelingPinyin();
        }
      }, 0);
    });
  });

  function readPetName() {
    try {
      return localStorage.getItem(PET_NAME_KEY);
    } catch (e) {
      return "";
    }
  }

  function writePetName(name) {
    try {
      localStorage.setItem(PET_NAME_KEY, name);
    } catch (e) { /* ignore */ }
    petNameTag.textContent = name || "";
  }

  function wirePetNameSlip() {
    var slip = document.getElementById("name-slip");
    if (!slip || slip.dataset.wired === "1") return;
    slip.dataset.wired = "1";
    document.getElementById("btn-name-ok").addEventListener("click", function () {
      var v = document.getElementById("pet-name-input").value.trim();
      writePetName(v);
      slip.hidden = true;
    });
    document.getElementById("btn-name-skip").addEventListener("click", function () {
      writePetName("");
      slip.hidden = true;
    });
  }

  /* 第一次见到它：等首张票打出 / 猫出现后再问，不打断 landing */
  function maybeAskPetName() {
    var existing = readPetName();
    if (existing !== null) {
      petNameTag.textContent = existing;
      return;
    }
    var slip = document.getElementById("name-slip");
    if (!slip) return;
    wirePetNameSlip();
    slip.hidden = false;
  }

  (function initPetName() {
    var existing = readPetName();
    if (existing !== null) {
      petNameTag.textContent = existing;
      return;
    }
    var slip = document.getElementById("name-slip");
    if (slip) slip.hidden = true;
  })();

  function shareCaption() {
    if (shareKind === "week") return SHARE_TEXT_WEEK;
    if (shareKind === "tear") return SHARE_TEXT_TEAR;
    return SHARE_TEXT_TICKET;
  }

  function shareFileName() {
    if (shareKind === "week") return "本周总票.png";
    if (shareKind === "tear") return "今晚撕了一张.png";
    return "今晚晒图卡.png";
  }

  function syncShareModeUi() {
    var pub = document.getElementById("share-mode-public");
    var priv = document.getElementById("share-mode-private");
    if (pub) {
      pub.classList.toggle("is-on", shareMode === "public");
      pub.setAttribute("aria-pressed", shareMode === "public" ? "true" : "false");
    }
    if (priv) {
      priv.classList.toggle("is-on", shareMode === "private");
      priv.setAttribute("aria-pressed", shareMode === "private" ? "true" : "false");
    }
    if (shareSheetCopy) {
      if (shareKind === "week") {
        shareSheetCopy.textContent =
          shareMode === "public"
            ? "周总票默认打码：只晒次数、时段、最酸的一天与金句。不含想到的人。"
            : "本机完整周总票会带上归档条目。只给你自己看，别默认发社交。";
      } else {
        shareSheetCopy.textContent =
          shareMode === "public"
            ? "公开安全：名字与感觉打成 ████，只留日期、票号、今晚第几张、章与金句。一键 PNG。"
            : "本机完整：带上想到/感觉/比一口。只存在这台设备的选择，默认仍建议公开安全。";
      }
    }
    if (shareSheetTitle) {
      if (shareKind === "week") shareSheetTitle.textContent = "本周总票";
      else if (shareKind === "tear") shareSheetTitle.textContent = "撕票晒图";
      else shareSheetTitle.textContent = "一键晒图卡";
    }
  }

  function drawStamp(ctx, cx, cy, label) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-18 * Math.PI / 180);
    ctx.strokeStyle = "#c42b22";
    ctx.fillStyle = "#c42b22";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 64, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = "700 22px PingFang SC, Hiragino Sans GB, Noto Sans SC, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label || "不服", 0, 0);
    ctx.restore();
  }

  function drawPaperShell(ctx, w, h, x, y, pw, ph) {
    ctx.fillStyle = "#14120f";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#2a2318";
    ctx.beginPath();
    ctx.ellipse(w / 2, -40, 520, 280, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f3eee0";
    ctx.fillRect(x, y, pw, ph);

    /* 热敏齿孔 */
    ctx.fillStyle = "#14120f";
    for (var i = 0; i < pw / 16; i++) {
      ctx.beginPath();
      ctx.arc(x + 8 + i * 16, y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 8 + i * 16, y + ph, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    /* 轻微纸纹 */
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.fillStyle = "#6a5a40";
    for (var g = 0; g < 40; g++) {
      ctx.fillRect(x + 12, y + 24 + g * 22, pw - 24, 1);
    }
    ctx.restore();
  }

  function drawDash(ctx, x, pw, yy) {
    ctx.strokeStyle = "#cfc6b4";
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(x + 40, yy);
    ctx.lineTo(x + pw - 40, yy);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawRow(ctx, x, y, label, value, paperRight) {
    ctx.textAlign = "left";
    ctx.font = "26px ui-monospace, Menlo, monospace";
    ctx.fillStyle = "#4a453c";
    ctx.fillText(label, x + 56, y);
    ctx.fillStyle = "#1c1a16";
    var gap = x + 56 + ctx.measureText(String(label)).width + 28;
    var minX = x + 200;
    var valueX = Math.max(minX, gap);
    var text = String(value || "");
    if (paperRight) {
      var maxW = paperRight - valueX - 24;
      while (text.length > 1 && ctx.measureText(text).width > maxW) {
        text = text.slice(0, -1);
      }
    }
    ctx.fillText(text, valueX, y);
  }

  function drawTicketCard(kind, mode) {
    var ticket = state.ticket;
    var privateMode = mode === "private" && ticket;
    var w = 720;
    var h = 1280;
    var canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext("2d");
    var x = 90;
    var y = 140;
    var pw = 540;
    var ph = 980;
    drawPaperShell(ctx, w, h, x, y, pw, ph);

    var title = kind === "tear" ? "今晚撕了一张" : "今晚的比较小票";
    ctx.fillStyle = "#1c1a16";
    ctx.textAlign = "center";
    ctx.font = "700 34px PingFang SC, Hiragino Sans GB, Noto Sans SC, sans-serif";
    ctx.fillText(title, w / 2, y + 78);
    ctx.fillStyle = "#4a453c";
    ctx.font = "20px PingFang SC, Hiragino Sans GB, Noto Sans SC, sans-serif";
    ctx.fillText(privateMode ? "本机完整 · 热敏存根" : "公开安全 · 空票脸存根", w / 2, y + 118);

    drawDash(ctx, x, pw, y + 148);

    var dateStr = ticket ? ticket.date : nightKey(new Date());
    var clockStr = ticket ? ticket.clock : "——";
    var noStr = ticket ? padNo(ticket.no) : "0000";
    var tonightStr = ticket && ticket.tonightIndex ? "今晚第 " + ticket.tonightIndex + " 张" : "今晚 × 1";
    var whoStr = privateMode ? objectLine(ticket) : "████";
    var feelStr = privateMode ? (ticket.feeling || "—") : "████";
    var biteStr = privateMode ? (ticket.theyHave || "—") : "████";
    var stamp = ticket ? (ticket.stamp || pickStamp(ticket)) : "今晚结算";
    var settlePlain = ticket
      ? String(ticket.settlement || settlementLine(ticket)).replace(/<br\s*\/?>/gi, " ").replace(/<\/?strong>/gi, "")
      : "比较不是病。是燃料。";
    if (settlePlain.length > 28) settlePlain = settlePlain.slice(0, 28) + "…";

    var right = x + pw;
    drawRow(ctx, x, y + 210, "日期", dateStr, right);
    drawRow(ctx, x, y + 270, "时间", clockStr, right);
    drawRow(ctx, x, y + 330, "票号", "No. " + noStr, right);
    drawRow(ctx, x, y + 390, "次序", tonightStr, right);
    drawRow(ctx, x, y + 450, "想到", whoStr, right);
    drawRow(ctx, x, y + 510, "感觉", feelStr, right);
    drawRow(ctx, x, y + 570, "比一口", biteStr, right);

    drawDash(ctx, x, pw, y + 620);

    ctx.textAlign = "center";
    ctx.fillStyle = "#c9a227";
    ctx.font = "700 34px PingFang SC, Hiragino Sans GB, Noto Sans SC, sans-serif";
    ctx.fillText(stamp, w / 2, y + 700);
    ctx.fillStyle = "#4a453c";
    ctx.font = "22px PingFang SC, Hiragino Sans GB, Noto Sans SC, sans-serif";
    ctx.fillText(privateMode ? settlePlain : "比较不是病。是燃料。", w / 2, y + 760);
    ctx.fillText(privateMode ? "本机完整票脸 · 自行决定是否外传" : "公开默认打码 · 不含真名与感受", w / 2, y + 820);
    ctx.fillText("不是心理咨询、不算命、不保证心情变好。", w / 2, y + 870);

    drawStamp(ctx, x + pw - 120, y + 900, stamp);

    ctx.fillStyle = "rgba(232, 195, 122, 0.75)";
    ctx.font = "16px PingFang SC, sans-serif";
    ctx.fillText(title + "  ·  " + (privateMode ? "本机完整" : "公开安全") + " · 已付无法退款", w / 2, h - 48);
    return canvas;
  }

  function drawWeekCard(mode) {
    var summary = weekSummary();
    var privateMode = mode === "private";
    var lines = Math.max(7, summary.tickets.length);
    var w = 720;
    var h = Math.min(2400, 980 + lines * 54);
    var canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext("2d");
    var x = 70;
    var y = 80;
    var pw = 580;
    var ph = h - 160;
    drawPaperShell(ctx, w, h, x, y, pw, ph);

    ctx.fillStyle = "#1c1a16";
    ctx.textAlign = "center";
    ctx.font = "700 34px PingFang SC, Hiragino Sans GB, Noto Sans SC, sans-serif";
    ctx.fillText("本周总票", w / 2, y + 70);
    ctx.fillStyle = "#4a453c";
    ctx.font = "20px PingFang SC, Hiragino Sans GB, Noto Sans SC, sans-serif";
    ctx.fillText("账单式存根 · 周 " + summary.weekKey + " 起", w / 2, y + 110);

    drawDash(ctx, x, pw, y + 140);

    var right = x + pw;
    var yy = y + 200;
    drawRow(ctx, x, yy, "出票次数", summary.total + " 次", right);
    yy += 56;
    drawRow(ctx, x, yy, "归档", String(summary.archived), right);
    yy += 56;
    drawRow(ctx, x, yy, "撕掉", String(summary.tornCount), right);
    yy += 56;
    drawRow(ctx, x, yy, "最常时段", summary.slot || "—", right);
    yy += 56;
    drawRow(ctx, x, yy, "最常感觉", privateMode ? (summary.feel || "—") : "████", right);
    yy += 56;
    if (summary.acidDayLabel) {
      drawRow(ctx, x, yy, "最酸的是", summary.acidDayLabel, right);
      yy += 56;
    } else if (summary.peakDayLabel && summary.peakDayLabel !== "—") {
      drawRow(ctx, x, yy, "最忙的是", summary.peakDayLabel, right);
      yy += 56;
    }
    drawRow(ctx, x, yy, "最常想到", privateMode ? (summary.who || "—") : "████", right);
    yy += 40;
    drawDash(ctx, x, pw, yy);
    yy += 50;

    ctx.textAlign = "left";
    ctx.fillStyle = "#4a453c";
    ctx.font = "22px PingFang SC, Hiragino Sans GB, Noto Sans SC, sans-serif";
    ctx.fillText(privateMode ? "本周明细（本机）" : "本周明细（打码）", x + 56, yy);
    yy += 40;

    if (!summary.tickets.length) {
      ctx.fillStyle = "#1c1a16";
      ctx.font = "24px ui-monospace, Menlo, monospace";
      ctx.fillText("本周还空着。", x + 56, yy + 20);
      yy += 60;
    } else {
      summary.tickets.forEach(function (t) {
        if (yy > y + ph - 180) return;
        ctx.fillStyle = "#4a453c";
        ctx.font = "18px ui-monospace, Menlo, monospace";
        ctx.fillText(t.date + " " + t.clock + "  No." + padNo(t.no), x + 56, yy);
        yy += 28;
        ctx.fillStyle = "#1c1a16";
        ctx.font = "22px ui-monospace, Menlo, monospace";
        if (privateMode) {
          var bite = t.theyHave ? " · " + t.theyHave : "";
          ctx.fillText((t.who || "—") + bite, x + 56, yy);
        } else {
          ctx.fillText("████  ·  ████", x + 56, yy);
        }
        yy += 42;
      });
    }

    drawDash(ctx, x, pw, Math.min(yy + 10, y + ph - 140));
    ctx.textAlign = "center";
    ctx.fillStyle = "#c9a227";
    ctx.font = "700 34px PingFang SC, Hiragino Sans GB, Noto Sans SC, sans-serif";
    ctx.fillText("已付 · 无法退款", w / 2, y + ph - 90);
    ctx.fillStyle = "#4a453c";
    ctx.font = "20px PingFang SC, Hiragino Sans GB, Noto Sans SC, sans-serif";
    ctx.fillText("本周结算完毕。比较不是病。是燃料。", w / 2, y + ph - 48);

    drawStamp(ctx, x + pw - 110, y + ph - 120, "今晚结算");

    ctx.fillStyle = "rgba(232, 195, 122, 0.75)";
    ctx.font = "16px PingFang SC, sans-serif";
    ctx.fillText("本周总票  ·  " + (privateMode ? "本机完整" : "公开安全") + " · 已付无法退款", w / 2, h - 36);
    return canvas;
  }

  function drawBillCanvas(kind, mode) {
    var m = mode || shareMode;
    if (kind === "week") return drawWeekCard(m);
    return drawTicketCard(kind, m);
  }

  function canvasPngBlob(canvas, cb) {
    if (canvas.toBlob) {
      canvas.toBlob(function (blob) {
        cb(blob || null);
      }, "image/png");
      return;
    }
    try {
      var data = canvas.toDataURL("image/png");
      var bin = atob(data.split(",")[1]);
      var arr = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      cb(new Blob([arr], { type: "image/png" }));
    } catch (e) {
      cb(null);
    }
  }

  function setShareStatus(msg) {
    if (shareStatus) shareStatus.textContent = msg || "";
  }

  function openShareSheet(kind) {
    if (kind === "week") shareKind = "week";
    else if (kind === "tear") shareKind = "tear";
    else shareKind = "ticket";
    shareMode = "public";
    syncShareModeUi();
    setShareStatus(shareMode === "public" ? "默认公开安全。一点就下载 PNG。" : "");
    if (shareSheet) shareSheet.hidden = false;
  }

  function closeShareSheet() {
    if (shareSheet) shareSheet.hidden = true;
    setShareStatus("");
  }

  function shareNative() {
    var text = shareCaption();
    var canvas = drawBillCanvas(shareKind, shareMode);
    canvasPngBlob(canvas, function (blob) {
      var file = blob ? new File([blob], shareFileName(), { type: "image/png" }) : null;
      var payload = { title: shareSheetTitle ? shareSheetTitle.textContent : "晒图卡", text: text };
      if (file && navigator.canShare) {
        try {
          if (navigator.canShare({ files: [file] })) payload.files = [file];
        } catch (e) { /* ignore */ }
      }
      if (navigator.share) {
        navigator.share(payload).then(function () {
          setShareStatus("已交给系统分享。");
        }).catch(function () {
          setShareStatus("已取消。可复制文案或下载图片。");
        });
        return;
      }
      setShareStatus("这台设备没有系统分享。请下载 PNG。");
    });
  }

  function shareCopy() {
    var text = shareCaption();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        setShareStatus(shareMode === "public" ? "已复制公开文案。" : "已复制（完整模式仍建议慎发）。");
      }).catch(function () {
        fallbackCopy(text);
      });
      return;
    }
    fallbackCopy(text);
  }

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      setShareStatus("已复制文案。");
    } catch (e) {
      setShareStatus(text);
    }
    document.body.removeChild(ta);
  }

  function shareDownload() {
    var canvas = drawBillCanvas(shareKind, shareMode);
    canvasPngBlob(canvas, function (blob) {
      if (!blob) {
        setShareStatus("这台浏览器不能导出图片。");
        return;
      }
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = shareFileName();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      later(function () { URL.revokeObjectURL(url); }, 1500);
      setShareStatus(
        shareMode === "public"
          ? "已下载公开晒图 PNG。"
          : "已下载本机完整 PNG。外传前请再确认。"
      );
    });
  }

  function setShareMode(mode) {
    shareMode = mode === "private" ? "private" : "public";
    syncShareModeUi();
    setShareStatus(shareMode === "public" ? "已切到公开安全。" : "已切到本机完整。");
  }

  if (shareBtn) {
    shareBtn.addEventListener("click", function () {
      openShareSheet(shareKind);
    });
  }
  var exportBtn = document.getElementById("btn-export-card");
  if (exportBtn) {
    exportBtn.addEventListener("click", function () {
      if (!state.ticket) return;
      openShareSheet("ticket");
    });
  }
  var weekBillBtn = document.getElementById("btn-week-bill");
  if (weekBillBtn) {
    weekBillBtn.addEventListener("click", function () {
      openShareSheet("week");
    });
  }
  var modePublic = document.getElementById("share-mode-public");
  var modePrivate = document.getElementById("share-mode-private");
  if (modePublic) modePublic.addEventListener("click", function () { setShareMode("public"); });
  if (modePrivate) modePrivate.addEventListener("click", function () { setShareMode("private"); });
  document.getElementById("btn-share-native").addEventListener("click", shareNative);
  document.getElementById("btn-share-copy").addEventListener("click", shareCopy);
  document.getElementById("btn-share-download").addEventListener("click", shareDownload);
  document.getElementById("btn-share-close").addEventListener("click", closeShareSheet);

  /* 启动：本机今晚 + 匿名远程计数（失败则诚实标本机） */
  try {
    state.tonightIndex = loadNight().prints || 0;
  } catch (e) {
    state.tonightIndex = 0;
  }
  refreshPlaza();
  ensureEmoKeys();
  bumpRemoteOpen();
})();
