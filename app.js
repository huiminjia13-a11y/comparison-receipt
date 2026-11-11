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
  var FEELING_WORDS = [
    "想", "气", "惦记", "不服", "空", "来不及",
    "怒火", "思念", "酸", "憋", "慌", "烦",
    "麻", "累", "眼红", "上头", "咬牙", "说不清"
  ];
  var FEELING_PHRASES = [
    "又气又想", "想赢", "不服气", "还在想", "空得很",
    "来不及了", "比较上头", "夜里又冒出来", "羡慕到牙痒"
  ];
  var WHO_NAME_WORDS = [
    "他", "她", "前公司", "那个 offer", "以前的自己", "突然想到的人", "同学", "旧人"
  ];
  var THEY_HAVE_WORDS = [
    "那个 offer", "头衔", "看起来很确定的人生", "胆子", "钱", "房子", "签证", "节奏", "人脉"
  ];
  var STAMPS = ["已付无法退款", "今晚结算", "还在想", "不服"];

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
  var shareKind = "ticket";
  var SHARE_TEXT_TICKET = "今晚的账单。空票脸 · 已付无法退款";
  var SHARE_TEXT_TEAR = "今晚撕了一张。空票脸 · 已付无法退款";
  var PET_NAME_KEY = "tonight-comparison-receipt-pet-name";

  var state = {
    whoId: "",
    durationId: "",
    ticket: null,
    printTimer: null,
    timers: [],
    canAct: false
  };

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

  function tokyoParts(date) {
    var parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(date);
    var map = {};
    parts.forEach(function (p) {
      map[p.type] = p.value;
    });
    return map;
  }

  function weekStartKey(date) {
    var p = tokyoParts(date);
    var local = new Date(p.year + "-" + p.month + "-" + p.day + "T12:00:00");
    var day = local.getDay();
    var offset = day === 0 ? -6 : 1 - day;
    local.setDate(local.getDate() + offset);
    var y = local.getFullYear();
    var m = String(local.getMonth() + 1).padStart(2, "0");
    var d = String(local.getDate()).padStart(2, "0");
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
      if (mood === "watch" || mood === "blink") {
        pet.dataset.mood = mood === "blink" ? "blink" : "watch";
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

  function pickStamp(ticket) {
    var feel = String((ticket && ticket.feeling) || "");
    if (/不服/.test(feel)) return "不服";
    if (/想|惦记|思念|还在想/.test(feel)) return "还在想";
    if (/气|怒|上头|咬牙|眼红/.test(feel)) return "今晚结算";
    var pool = STAMPS;
    return pool[((ticket && ticket.no) || 0) % pool.length];
  }

  function receiptHtml(ticket) {
    var stamp = pickStamp(ticket);
    return (
      '<div class="receipt-head">今晚的比较小票</div>' +
      '<div class="receipt-sub">今天想到了谁 · 热敏存根</div>' +
      '<div class="dash"></div>' +
      '<div class="row"><span class="k">时间</span><span>' + escapeHtml(ticket.clock) + "</span></div>" +
      '<div class="row"><span class="k">想到</span><span>' + escapeHtml(objectLine(ticket)) + "</span></div>" +
      receiptRow("感觉", ticket.feeling) +
      receiptRow("停留", ticket.durationLabel) +
      receiptRow("比一口", ticket.theyHave) +
      '<div class="dash"></div>' +
      '<div class="verdict">比较不是病。<br>是燃料。<br><strong>今晚结算 · 已付无法退款。</strong></div>' +
      '<div class="dash"></div>' +
      '<div class="receipt-no"><span>No. ' + padNo(ticket.no) + "</span><span>合计 今晚 × 1</span></div>" +
      '<div class="stamp-slot"><div class="stamp">' + escapeHtml(stamp) + "</div></div>" +
      '<div class="receipt-foot">本机存根 · 默认不分享。<br>不是心理咨询、不算命、不保证心情变好。</div>'
    );
  }

  function buildTicket() {
    var store = loadStore();
    var no = store.seq + 1;
    var now = new Date();
    var p = tokyoParts(now);
    return {
      no: no,
      whoId: selectedId(whoChips),
      whoLabel: whoLabel(selectedId(whoChips)),
      whoName: whoName.value.trim(),
      theyHave: theyHave.value.trim(),
      feeling: feeling.value.trim(),
      durationId: selectedId(durationChips),
      durationLabel: durationLabel(selectedId(durationChips)),
      clock: p.hour + ":" + p.minute,
      date: p.year + "-" + p.month + "-" + p.day,
      weekday: p.weekday,
      createdAt: now.toISOString(),
      weekKey: weekStartKey(now)
    };
  }

  function reducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  var PRINT_MS = 3600;

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
      petMood("blink");
    }, reduce ? 0 : 200);
    later(function () {
      printStatus.textContent = "请取票";
      ticketActions.hidden = false;
      state.canAct = true;
      petMood("watch");
    }, reduce ? 150 : 700);
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

  var TEAR_MS = 1900;
  var TEAR_PAUSE_MS = 400;

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
      Sound.tear(0, 0.4);
      receiptEl.classList.add("is-fading");
      later(function () {
        goAfter("tear");
      }, 700);
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

    // 0–0.25s 绷紧；0.25–0.9s 撕口从上往下走；0.9–1.9s 两半分开、落下、淡出；再停 0.4s
    Sound.tear(0.24, 0.66);
    Sound.rustle(1.05, 0.12);
    Sound.rustle(1.35, 0.08);
    later(function () {
      goAfter("tear");
    }, TEAR_MS + TEAR_PAUSE_MS);
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

  function renderDrawer() {
    var tickets = thisWeekTickets();
    var torn = thisWeekTorn();
    var x = tickets.length;
    var y = torn.length;
    var n = x + y;
    var who = modeOf(tickets.map(function (t) { return t.who; }));
    var slot = modeOf(tickets.map(function (t) { return hourSlot(t.clock); }));
    var feel = modeOf(tickets.map(function (t) { return (t.feeling || "").trim(); }));
    settleSlip.innerHTML =
      '<div class="settle-head">本周结算单</div>' +
      '<div class="dash"></div>' +
      '<div class="row"><span class="k">出票</span><span>' + n + "</span></div>" +
      '<div class="row"><span class="k">归档</span><span>' + x + "</span></div>" +
      '<div class="row"><span class="k">撕掉</span><span>' + y + "</span></div>" +
      '<div class="dash"></div>' +
      '<div class="row"><span class="k">最常想到</span><span>' + escapeHtml(who) + "</span></div>" +
      '<div class="row"><span class="k">最常时段</span><span>' + escapeHtml(slot) + "</span></div>" +
      '<div class="row"><span class="k">最常感觉</span><span>' + escapeHtml(feel) + "</span></div>" +
      '<div class="dash"></div>' +
      '<div class="settle-foot">撕掉的不留底。本机不评价、不排名。</div>';

    drawerList.innerHTML = "";
    if (!tickets.length) {
      var empty = document.createElement("li");
      empty.className = "drawer-empty";
      empty.textContent = "本周还空着。想到谁就打一张。比较可以空着。";
      drawerList.appendChild(empty);
      return;
    }
    tickets
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

  renderSuggestChips(
    document.getElementById("feeling-suggest"),
    FEELING_WORDS.concat(FEELING_PHRASES),
    "set"
  );
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

  (function initPetName() {
    var existing = readPetName();
    var slip = document.getElementById("name-slip");
    if (existing !== null) {
      petNameTag.textContent = existing;
      return;
    }
    if (!slip) return;
    slip.hidden = false;
    document.getElementById("btn-name-ok").addEventListener("click", function () {
      var v = document.getElementById("pet-name-input").value.trim();
      writePetName(v);
      slip.hidden = true;
    });
    document.getElementById("btn-name-skip").addEventListener("click", function () {
      writePetName("");
      slip.hidden = true;
    });
  })();

  function shareCaption() {
    return shareKind === "tear" ? SHARE_TEXT_TEAR : SHARE_TEXT_TICKET;
  }

  function drawBillCanvas(kind) {
    var w = 720;
    var h = 1280;
    var canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = "#14120f";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#2a2318";
    ctx.beginPath();
    ctx.ellipse(360, -40, 520, 280, 0, 0, Math.PI * 2);
    ctx.fill();

    var x = 90;
    var y = 180;
    var pw = 540;
    var ph = 860;
    ctx.fillStyle = "#f3eee0";
    ctx.fillRect(x, y, pw, ph);

    ctx.fillStyle = "#14120f";
    for (var i = 0; i < pw / 16; i++) {
      ctx.beginPath();
      ctx.arc(x + 8 + i * 16, y, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#1c1a16";
    ctx.textAlign = "center";
    ctx.font = "700 36px PingFang SC, Hiragino Sans GB, Noto Sans SC, sans-serif";
    ctx.fillText(kind === "tear" ? "今晚撕了一张" : "今晚的账单", w / 2, y + 80);
    ctx.fillStyle = "#4a453c";
    ctx.font = "22px PingFang SC, Hiragino Sans GB, Noto Sans SC, sans-serif";
    ctx.fillText("空票脸 · 热敏存根", w / 2, y + 120);

    function dash(yy) {
      ctx.strokeStyle = "#cfc6b4";
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(x + 40, yy);
      ctx.lineTo(x + pw - 40, yy);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    dash(y + 150);

    /* 默认空票脸：人名 / 感觉打码，不带出本机真票 */
    ctx.textAlign = "left";
    ctx.font = "26px ui-monospace, Menlo, monospace";
    ctx.fillStyle = "#4a453c";
    ctx.fillText("时间", x + 56, y + 220);
    ctx.fillStyle = "#1c1a16";
    ctx.fillText("今晚", x + 160, y + 220);
    ctx.fillStyle = "#4a453c";
    ctx.fillText("想到", x + 56, y + 290);
    ctx.fillStyle = "#1c1a16";
    ctx.fillText("████", x + 160, y + 290);
    ctx.fillStyle = "#4a453c";
    ctx.fillText("感觉", x + 56, y + 360);
    ctx.fillStyle = "#1c1a16";
    ctx.fillText("████", x + 160, y + 360);
    ctx.fillStyle = "#4a453c";
    ctx.fillText("比一口", x + 56, y + 430);
    ctx.fillStyle = "#1c1a16";
    ctx.fillText("████", x + 180, y + 430);

    dash(y + 480);

    /* 唯一金句：可截图传播，不暴露本机内容 */
    ctx.textAlign = "center";
    ctx.fillStyle = "#c9a227";
    ctx.font = "700 34px PingFang SC, Hiragino Sans GB, Noto Sans SC, sans-serif";
    ctx.fillText("已付 · 无法退款", w / 2, y + 560);

    dash(y + 610);
    ctx.font = "22px PingFang SC, Hiragino Sans GB, Noto Sans SC, sans-serif";
    ctx.fillStyle = "#4a453c";
    ctx.fillText("合计 今晚结算 × 1", w / 2, y + 660);
    ctx.fillText("默认不分享真票。本机存根。", w / 2, y + 780);
    ctx.fillText("不是心理咨询、不算命、不保证心情变好。", w / 2, y + 816);

    ctx.save();
    ctx.translate(x + pw - 110, y + 700);
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
    ctx.fillText("不服", 0, 0);
    ctx.restore();

    ctx.fillStyle = "rgba(232, 195, 122, 0.7)";
    ctx.font = "16px PingFang SC, sans-serif";
    ctx.fillText((kind === "tear" ? "今晚撕了一张" : "今晚的账单") + "  ·  空票脸 · 已付无法退款", w / 2, h - 64);
    return canvas;
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
    shareStatus.textContent = msg || "";
  }

  function openShareSheet(kind) {
    shareKind = kind === "tear" ? "tear" : "ticket";
    setShareStatus("");
    shareSheet.hidden = false;
  }

  function closeShareSheet() {
    shareSheet.hidden = true;
    setShareStatus("");
  }

  function shareNative() {
    var text = shareCaption();
    var canvas = drawBillCanvas(shareKind);
    canvasPngBlob(canvas, function (blob) {
      var file = blob ? new File([blob], "今晚的账单.png", { type: "image/png" }) : null;
      var payload = { title: "今晚的账单", text: text };
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
      setShareStatus("这台设备没有系统分享。请复制文案或下载图片。");
    });
  }

  function shareCopy() {
    var text = shareCaption();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        setShareStatus("已复制：不含想到的人与感受。");
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
      setShareStatus("已复制：不含想到的人与感受。");
    } catch (e) {
      setShareStatus(text);
    }
    document.body.removeChild(ta);
  }

  function shareDownload() {
    var canvas = drawBillCanvas(shareKind);
    canvasPngBlob(canvas, function (blob) {
      if (!blob) {
        setShareStatus("这台浏览器不能导出图片。");
        return;
      }
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "今晚的账单.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      later(function () { URL.revokeObjectURL(url); }, 1500);
      setShareStatus("已下载图片：不含想到的人与感受。");
    });
  }

  document.getElementById("btn-share-ticket").addEventListener("click", function () {
    openShareSheet(shareKind);
  });
  document.getElementById("btn-share-native").addEventListener("click", shareNative);
  document.getElementById("btn-share-copy").addEventListener("click", shareCopy);
  document.getElementById("btn-share-download").addEventListener("click", shareDownload);
  document.getElementById("btn-share-close").addEventListener("click", closeShareSheet);
})();
