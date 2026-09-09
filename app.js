/* ============================================================
   app.js — GỬI XE FREE SÀI GÒN — Neo-Brutalist
   Realtime: cấm chẵn/lẻ + cấm giờ nhiều mốc
   ============================================================ */
(function () {
  'use strict';

  /* ---------- CONSTANTS ---------- */
  var DATA_URL = './data.json';
  var TAB_ALL = 'TẤT CẢ';
  var TOAST_DURATION = 2800;

  /* ---------- EMOJI & COLOR POOLS ---------- */
  var EMOJI_POOL = [
    '🅿️','🚗','🏍️','🚙','🛵','🏢','🏬','🏪','🏥','🏫',
    '🏛️','🎯','🗺️','📍','🚦','🛣️','🅿','🚘','🏠','🌳',
    '🏟️','🌆','🌃','🎪','🎡','⛽','🚧','🔑','🛒','🏗️'
  ];
  var COLOR_PAIRS = [
    ['#00d4ff','#38bdf8'],['#ff2d78','#ff6b9d'],['#7c3aed','#a78bfa'],
    ['#10b981','#34d399'],['#f59e0b','#fbbf24'],['#ef4444','#f87171'],
    ['#8b5cf6','#c084fc'],['#06b6d4','#22d3ee'],['#ec4899','#f472b6'],
    ['#14b8a6','#2dd4bf'],['#f97316','#fb923c'],['#6366f1','#818cf8'],
    ['#22c55e','#4ade80'],['#e11d48','#fb7185'],['#3b82f6','#60a5fa']
  ];

  /* ---------- HASH & RANDOM ---------- */
  function hashString(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
  function getRandomEmoji(n) { return EMOJI_POOL[hashString(n) % EMOJI_POOL.length]; }
  function getRandomColors(n) { return COLOR_PAIRS[hashString(n + '_c') % COLOR_PAIRS.length]; }
  function getInitials(n) {
    if (!n) return '?';
    var w = n.replace(/[^a-zA-ZÀ-ỹ0-9\s]/g, '').trim().split(/\s+/);
    return w.length >= 2 ? (w[0][0] + w[1][0]).toUpperCase() : n.substring(0, 2).toUpperCase();
  }

  /* ---------- DOM ---------- */
  var $search = document.getElementById('search-input');
  var $btnRefresh = document.getElementById('btn-refresh');
  var $btnTheme = document.getElementById('btn-theme');
  var $status = document.getElementById('status-line');
  var $tabs = document.getElementById('tabs-bar');
  var $skeleton = document.getElementById('skeleton');
  var $grid = document.getElementById('cards-grid');
  var $empty = document.getElementById('empty-state');
  var $toast = document.getElementById('toast');
  var $realtimeBar = document.getElementById('realtime-bar');

  /* ---------- STATE ---------- */
  var rawData = [], flatItems = [], categories = [];
  var activeTab = TAB_ALL, searchQuery = '', toastTimer = null;

  /* ---------- THEME ---------- */
  function initTheme() {
    var s = localStorage.getItem('gp-theme');
    if (s) document.documentElement.setAttribute('data-theme', s);
  }
  function toggleTheme() {
    var c = document.documentElement.getAttribute('data-theme');
    var n = c === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', n);
    localStorage.setItem('gp-theme', n);
  }
  initTheme();

  /* ---------- HELPERS ---------- */
  function setStatus(msg) { $status.textContent = msg; }
  function showToast(msg) {
    $toast.textContent = msg; $toast.style.display = '';
    $toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      $toast.classList.remove('show');
      setTimeout(function () { $toast.style.display = 'none'; }, 300);
    }, TOAST_DURATION);
  }

  /* ============================================================
     REALTIME: Cấm chẵn/lẻ + Cấm giờ
     ============================================================ */
  function getNow() { return new Date(); }
  function isEvenDay() { return getNow().getDate() % 2 === 0; }
  function getDayType() { return isEvenDay() ? 'even' : 'odd'; }
  function getDayLabel() { return isEvenDay() ? 'CHẴN' : 'LẺ'; }
  function getTimeStr() {
    var d = getNow();
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  }
  function getFullDateStr() {
    var d = getNow();
    return d.getDate().toString().padStart(2, '0') + '/' +
      (d.getMonth() + 1).toString().padStart(2, '0') + '/' + d.getFullYear();
  }

  // Parse "HH:MM" to minutes since midnight
  function parseTime(t) {
    var p = t.split(':');
    return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
  }

  // Check if current time falls within any banned time slot
  function isInBannedHours(banHours) {
    if (!banHours || banHours.length === 0) return false;
    var now = parseTime(getTimeStr());
    for (var i = 0; i < banHours.length; i++) {
      var start = parseTime(banHours[i][0]);
      var end = parseTime(banHours[i][1]);
      if (now >= start && now < end) return true;
    }
    return false;
  }

  // Get next banned time slot info
  function getNextBanSlot(banHours) {
    if (!banHours || banHours.length === 0) return null;
    var now = parseTime(getTimeStr());
    for (var i = 0; i < banHours.length; i++) {
      var start = parseTime(banHours[i][0]);
      if (now < start) return banHours[i];
    }
    return null;
  }

  // Check parking status for a spot
  function getParkingStatus(item) {
    var result = { canPark: true, reasons: [], statusClass: 'status-ok', label: '✅ Đậu được' };

    // Check even/odd ban
    if (item.ban_even_odd) {
      var today = getDayType();
      if (item.ban_even_odd === today) {
        result.canPark = false;
        result.reasons.push('🚫 Hôm nay ngày ' + getDayLabel() + ' — CẤM đậu');
        result.statusClass = 'status-ban';
        result.label = '🚫 Cấm hôm nay (ngày ' + getDayLabel() + ')';
        return result;
      }
    }

    // Check time ban
    if (item.ban_hours && item.ban_hours.length > 0) {
      if (isInBannedHours(item.ban_hours)) {
        result.canPark = false;
        result.statusClass = 'status-ban';
        result.label = '🚫 Đang cấm giờ!';
        // Find which slot
        var now = parseTime(getTimeStr());
        for (var i = 0; i < item.ban_hours.length; i++) {
          var s = parseTime(item.ban_hours[i][0]);
          var e = parseTime(item.ban_hours[i][1]);
          if (now >= s && now < e) {
            result.reasons.push('⏰ Đang trong giờ cấm ' + item.ban_hours[i][0] + '-' + item.ban_hours[i][1]);
            break;
          }
        }
        return result;
      } else {
        // Not banned now, but has future ban slots
        var next = getNextBanSlot(item.ban_hours);
        if (next) {
          result.statusClass = 'status-warn';
          result.label = '⚠️ Đậu được — Cấm lúc ' + next[0];
          result.reasons.push('Sắp cấm lúc ' + next[0] + '-' + next[1]);
        } else {
          result.label = '✅ Đậu được — Hết giờ cấm';
        }
      }
    }

    return result;
  }

  // Format ban_hours to display string
  function formatBanHours(banHours) {
    if (!banHours || banHours.length === 0) return '';
    return banHours.map(function (h) { return h[0] + '-' + h[1]; }).join(' | ');
  }

  /* ---------- REALTIME BAR ---------- */
  function updateRealtimeBar() {
    var d = getNow();
    var dayNum = d.getDate();
    var dayType = isEvenDay() ? 'CHẴN' : 'LẺ';
    var dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    var dayName = dayNames[d.getDay()];

    $realtimeBar.innerHTML =
      '<span class="rt-item rt-date">📅 ' + dayName + ' ' + getFullDateStr() + '</span>' +
      '<span class="rt-item rt-even">📊 Ngày ' + dayNum + ' (' + dayType + ')</span>' +
      '<span class="rt-item rt-time">🕐 ' + getTimeStr() + ':' + d.getSeconds().toString().padStart(2, '0') + '</span>';
  }
  updateRealtimeBar();
  setInterval(updateRealtimeBar, 1000);

  // Re-render cards every minute to update parking status
  setInterval(function () { if (flatItems.length > 0) applyFilters(); }, 60000);

  /* ---------- FETCH DATA ---------- */
  function fetchData() {
    $skeleton.style.display = '';
    $grid.style.display = 'none';
    $empty.style.display = 'none';
    setStatus('Đang tải dữ liệu...');

    fetch(DATA_URL)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (json) {
        processData(json);
        showToast('✅ Đã tải ' + flatItems.length + ' địa điểm');
      })
      .catch(function (err) {
        setStatus('Lỗi: ' + err.message);
        showToast('❌ Lỗi tải dữ liệu');
      });
  }

  function processData(json) {
    rawData = json;
    flatItems = [];
    categories = [];
    for (var c = 0; c < json.length; c++) {
      var cat = json[c];
      if (cat.category && categories.indexOf(cat.category) === -1) categories.push(cat.category);
      if (cat.items) {
        for (var i = 0; i < cat.items.length; i++) {
          var item = cat.items[i];
          item._category = cat.category;
          item._uid = cat.category + '|' + i;
          flatItems.push(item);
        }
      }
    }
    buildTabs();
    applyFilters();
    $skeleton.style.display = 'none';
    $grid.style.display = '';
    setStatus('🅿️ ' + flatItems.length + ' địa điểm • Cập nhật ' +
      getNow().getHours().toString().padStart(2, '0') + ':' +
      getNow().getMinutes().toString().padStart(2, '0'));
  }

  /* ---------- TABS ---------- */
  function buildTabs() {
    var frag = document.createDocumentFragment();
    var all = [TAB_ALL].concat(categories);
    for (var i = 0; i < all.length; i++) {
      var btn = document.createElement('button');
      btn.className = 'tab-btn focusable';
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', all[i] === activeTab ? 'true' : 'false');
      btn.dataset.category = all[i];
      btn.textContent = all[i];
      frag.appendChild(btn);
    }
    $tabs.innerHTML = '';
    $tabs.appendChild(frag);
  }

  /* ---------- FILTER / RENDER ---------- */
  function applyFilters() {
    var items = flatItems.slice();
    if (activeTab !== TAB_ALL) {
      items = items.filter(function (it) { return it._category === activeTab; });
    }
    if (searchQuery) {
      var q = searchQuery.toLowerCase();
      items = items.filter(function (it) {
        return (it.name && it.name.toLowerCase().indexOf(q) !== -1) ||
          (it.address && it.address.toLowerCase().indexOf(q) !== -1) ||
          (it.note && it.note.toLowerCase().indexOf(q) !== -1) ||
          (it._category && it._category.toLowerCase().indexOf(q) !== -1);
      });
    }
    if (activeTab === TAB_ALL) {
      renderFlatList(items);
    } else {
      renderCategorySections(items);
    }
  }

  function renderFlatList(items) {
    $grid.innerHTML = '';
    if (items.length === 0) { $empty.style.display = ''; return; }
    $empty.style.display = 'none';
    var frag = document.createDocumentFragment();
    var section = document.createElement('div');
    section.className = 'category-section';
    var tw = document.createElement('div');
    tw.className = 'category-title';
    var h3 = document.createElement('h3');
    h3.textContent = '🅿️ Tất cả địa điểm (' + items.length + ')';
    tw.appendChild(h3);
    section.appendChild(tw);
    var grid = document.createElement('div');
    grid.className = 'category-grid';
    for (var j = 0; j < items.length; j++) grid.appendChild(createCard(items[j]));
    section.appendChild(grid);
    frag.appendChild(section);
    $grid.appendChild(frag);
  }

  function renderCategorySections(items) {
    $grid.innerHTML = '';
    if (items.length === 0) { $empty.style.display = ''; return; }
    $empty.style.display = 'none';
    var grouped = {}, order = [];
    for (var i = 0; i < items.length; i++) {
      var cat = items[i]._category || 'Khác';
      if (!grouped[cat]) { grouped[cat] = []; order.push(cat); }
      grouped[cat].push(items[i]);
    }
    var frag = document.createDocumentFragment();
    for (var c = 0; c < order.length; c++) {
      var catName = order[c], catItems = grouped[catName];
      var section = document.createElement('div');
      section.className = 'category-section';
      var tw = document.createElement('div');
      tw.className = 'category-title';
      var h3 = document.createElement('h3');
      h3.textContent = catName + ' (' + catItems.length + ')';
      tw.appendChild(h3);
      section.appendChild(tw);
      var grid = document.createElement('div');
      grid.className = 'category-grid';
      for (var j = 0; j < catItems.length; j++) grid.appendChild(createCard(catItems[j]));
      section.appendChild(grid);
      frag.appendChild(section);
    }
    $grid.appendChild(frag);
  }

  /* ---------- CREATE CARD ---------- */
  function createCard(it) {
    var card = document.createElement('div');
    card.className = 'app-card';

    // ICON
    var iconWrap = document.createElement('div');
    iconWrap.className = 'app-card__icon-wrap';
    var name = it.name || 'Bãi xe';
    var emoji = getRandomEmoji(name);
    var colors = getRandomColors(name);
    var initials = getInitials(name);
    var iconEl = document.createElement('div');
    iconEl.className = 'app-card__icon-box';
    iconEl.style.background = 'linear-gradient(135deg,' + colors[0] + ',' + colors[1] + ')';
    var emojiEl = document.createElement('span');
    emojiEl.className = 'icon-emoji';
    emojiEl.textContent = emoji;
    iconEl.appendChild(emojiEl);
    var initEl = document.createElement('span');
    initEl.className = 'icon-initials';
    initEl.textContent = initials;
    iconEl.appendChild(initEl);
    iconWrap.appendChild(iconEl);
    card.appendChild(iconWrap);

    // INFO
    var info = document.createElement('div');
    info.className = 'app-card__info';

    // Name row + badges
    var nameRow = document.createElement('div');
    nameRow.className = 'app-card__name-row';
    var nameEl = document.createElement('span');
    nameEl.className = 'app-card__name';
    nameEl.textContent = name;
    nameRow.appendChild(nameEl);

    // Type badge
    var typeLabels = { 'xe_may': 'XE MÁY', 'oto': 'Ô TÔ', 'both': 'XM & ÔTÔ' };
    if (it.type) {
      var badge = document.createElement('span');
      badge.className = 'app-card__badge badge-' + it.type;
      badge.textContent = typeLabels[it.type] || it.type;
      nameRow.appendChild(badge);
    }
    info.appendChild(nameRow);

    // Address
    if (it.address) {
      var addr = document.createElement('div');
      addr.className = 'app-card__desc';
      addr.textContent = '📍 ' + it.address;
      info.appendChild(addr);
    }

    // Meta: hours + ban info
    var meta = document.createElement('div');
    meta.className = 'app-card__meta';
    var metaParts = [];
    if (it.hours) metaParts.push('🕐 ' + it.hours);
    if (it.ban_even_odd) {
      metaParts.push('📊 Cấm ngày ' + (it.ban_even_odd === 'even' ? 'CHẴN' : 'LẺ'));
    }
    if (it.ban_hours && it.ban_hours.length > 0) {
      metaParts.push('⏰ Cấm: ' + formatBanHours(it.ban_hours));
    }
    if (metaParts.length > 0) {
      meta.textContent = metaParts.join(' • ');
      info.appendChild(meta);
    }

    // Note
    if (it.note) {
      var noteEl = document.createElement('div');
      noteEl.className = 'app-card__desc';
      noteEl.style.marginTop = '2px';
      noteEl.textContent = '💡 ' + it.note;
      info.appendChild(noteEl);
    }

    // REALTIME STATUS
    var status = getParkingStatus(it);
    var statusEl = document.createElement('div');
    statusEl.className = 'status-badge ' + status.statusClass;
    statusEl.textContent = status.label;
    info.appendChild(statusEl);

    // Google Maps button (universal link for all devices)
    if (it.lat && it.lng) {
      var mapBtn = document.createElement('a');
      mapBtn.className = 'spot-map-btn';
      mapBtn.href = 'https://www.google.com/maps/search/?api=1&query=' + it.lat + ',' + it.lng;
      mapBtn.target = '_blank';
      mapBtn.rel = 'noopener';
      mapBtn.textContent = '🗺️ Chỉ đường';
      mapBtn.addEventListener('click', function (e) { e.stopPropagation(); });
      info.appendChild(mapBtn);
    }

    card.appendChild(info);
    return card;
  }

  /* ---------- TAB SELECT ---------- */
  function selectTab(category) {
    activeTab = category;
    var tabs = Array.prototype.slice.call($tabs.querySelectorAll('.tab-btn'));
    for (var i = 0; i < tabs.length; i++) {
      var sel = tabs[i].dataset.category === category;
      tabs[i].setAttribute('aria-selected', sel ? 'true' : 'false');
    }
    applyFilters();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- EVENTS ---------- */
  $tabs.addEventListener('click', function (e) {
    var btn = e.target.closest('.tab-btn');
    if (btn) selectTab(btn.dataset.category);
  });
  var debounce = null;
  $search.addEventListener('input', function () {
    clearTimeout(debounce);
    debounce = setTimeout(function () {
      searchQuery = $search.value.trim();
      applyFilters();
    }, 200);
  });
  $btnRefresh.addEventListener('click', function () {
    showToast('🔄 Đang làm mới...');
    fetchData();
  });
  $btnTheme.addEventListener('click', toggleTheme);

  /* ---------- DEVICE ---------- */
  var DEVICE_INFO = {
    'android-tv': { icon: '📺', label: 'Android TV', color: '#00d4ff' },
    'android':    { icon: '🤖', label: 'Android',    color: '#2dd4bf' },
    'ios':        { icon: '🍎', label: 'iOS',        color: '#3b82f6' },
    'pc':         { icon: '🖥️', label: 'PC',         color: '#a78bfa' }
  };
  function detectDevice() {
    var ua = navigator.userAgent || '';
    if (/Android TV|SmartTV|SMART-TV|GoogleTV|AFT[A-Z]|Fire TV/i.test(ua)) return 'android-tv';
    if (/iPhone|iPod|iPad/i.test(ua)) return 'ios';
    if (/Macintosh/i.test(ua) && 'ontouchstart' in window) return 'ios';
    if (/Android/i.test(ua)) return 'android';
    return 'pc';
  }
  var DEVICE_MODE = detectDevice();
  function showDeviceIndicator() {
    var info = DEVICE_INFO[DEVICE_MODE] || DEVICE_INFO['pc'];
    var ind = document.createElement('span');
    ind.className = 'device-indicator';
    ind.innerHTML = ' • <span class="device-badge" style="background:' + info.color + '">' + info.icon + ' ' + info.label + '</span>';
    $status.appendChild(ind);
  }

  /* ---------- INIT ---------- */
  fetchData();
  setTimeout(showDeviceIndicator, 2000);

})();
