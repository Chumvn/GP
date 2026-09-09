/* ============================================================
   app.js — GỬI XE FREE SÀI GÒN
   User-added spots + password 23824 + realtime cấm chẵn/lẻ/giờ
   ============================================================ */
(function () {
  'use strict';
  var PASSWORD = '23824';
  var STORAGE_KEY = 'gp_spots';
  var TAB_ALL = 'TẤT CẢ';
  var TOAST_DUR = 2800;

  var EMOJI_POOL = ['🅿️','🚗','🏍️','🚙','🛵','🏢','🏬','🏪','🏥','🏫','🏛️','🎯','🗺️','📍','🚦','🛣️','🚘','🌳','🌆','⛽'];
  var COLOR_PAIRS = [
    ['#00d4ff','#38bdf8'],['#ff2d78','#ff6b9d'],['#7c3aed','#a78bfa'],['#10b981','#34d399'],
    ['#f59e0b','#fbbf24'],['#ef4444','#f87171'],['#8b5cf6','#c084fc'],['#06b6d4','#22d3ee'],
    ['#ec4899','#f472b6'],['#14b8a6','#2dd4bf'],['#f97316','#fb923c'],['#6366f1','#818cf8'],
    ['#22c55e','#4ade80'],['#3b82f6','#60a5fa'],['#e11d48','#fb7185']
  ];
  var DISTRICTS = ['Quận 1','Quận 2','Quận 3','Quận 4','Quận 5','Quận 6','Quận 7','Quận 8','Quận 9','Quận 10','Quận 11','Quận 12','Bình Thạnh','Phú Nhuận','Tân Bình','Tân Phú','Gò Vấp','Thủ Đức','Bình Tân','Nhà Bè','Hóc Môn','Củ Chi','Cần Giờ','Khác'];

  function hash(s){var h=0;for(var i=0;i<s.length;i++){h=((h<<5)-h)+s.charCodeAt(i);h=h&h}return Math.abs(h)}
  function rEmoji(n){return EMOJI_POOL[hash(n)%EMOJI_POOL.length]}
  function rColors(n){return COLOR_PAIRS[hash(n+'c')%COLOR_PAIRS.length]}
  function initials(n){if(!n)return'?';var w=n.replace(/[^a-zA-ZÀ-ỹ0-9\s]/g,'').trim().split(/\s+/);return w.length>=2?(w[0][0]+w[1][0]).toUpperCase():n.substring(0,2).toUpperCase()}

  /* DOM */
  var $search=document.getElementById('search-input');
  var $btnAdd=document.getElementById('btn-add');
  var $btnTheme=document.getElementById('btn-theme');
  var $status=document.getElementById('status-line');
  var $tabs=document.getElementById('tabs-bar');
  var $grid=document.getElementById('cards-grid');
  var $empty=document.getElementById('empty-state');
  var $toast=document.getElementById('toast');
  var $rtBar=document.getElementById('realtime-bar');

  var spots=[],activeTab=TAB_ALL,searchQ='',toastT=null;

  /* THEME */
  (function(){var s=localStorage.getItem('gp-theme');if(s)document.documentElement.setAttribute('data-theme',s)})();
  function toggleTheme(){var c=document.documentElement.getAttribute('data-theme');var n=c==='dark'?'light':'dark';document.documentElement.setAttribute('data-theme',n);localStorage.setItem('gp-theme',n)}

  /* TOAST */
  function showToast(m){$toast.textContent=m;$toast.style.display='';$toast.classList.add('show');clearTimeout(toastT);toastT=setTimeout(function(){$toast.classList.remove('show');setTimeout(function(){$toast.style.display='none'},300)},TOAST_DUR)}

  /* ==================== REALTIME ==================== */
  function now(){return new Date()}
  function isEven(){return now().getDate()%2===0}
  function dayType(){return isEven()?'even':'odd'}
  function dayLabel(){return isEven()?'CHẴN':'LẺ'}
  function timeStr(){var d=now();return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0')}
  function fullDate(){var d=now();return d.getDate().toString().padStart(2,'0')+'/'+(d.getMonth()+1).toString().padStart(2,'0')+'/'+d.getFullYear()}
  function parseT(t){var p=t.split(':');return parseInt(p[0],10)*60+parseInt(p[1],10)}

  function isBannedNow(bh){
    if(!bh||bh.length===0)return false;
    var n=parseT(timeStr());
    for(var i=0;i<bh.length;i++){if(n>=parseT(bh[i][0])&&n<parseT(bh[i][1]))return true}
    return false;
  }
  function nextBan(bh){
    if(!bh||bh.length===0)return null;
    var n=parseT(timeStr());
    for(var i=0;i<bh.length;i++){if(n<parseT(bh[i][0]))return bh[i]}
    return null;
  }
  function parkStatus(it){
    var r={ok:true,cls:'status-ok',lbl:'✅ Đậu được'};
    if(it.ban_even_odd){
      if(it.ban_even_odd===dayType()){r.ok=false;r.cls='status-ban';r.lbl='🚫 Cấm hôm nay (ngày '+dayLabel()+')';return r}
    }
    if(it.ban_hours&&it.ban_hours.length>0){
      if(isBannedNow(it.ban_hours)){
        r.ok=false;r.cls='status-ban';r.lbl='🚫 Đang trong giờ cấm!';return r;
      }else{
        var nb=nextBan(it.ban_hours);
        if(nb){r.cls='status-warn';r.lbl='⚠️ Đậu được — Cấm lúc '+nb[0]}
        else{r.lbl='✅ Đậu được — Hết giờ cấm'}
      }
    }
    return r;
  }
  function fmtBanH(bh){if(!bh||bh.length===0)return'';return bh.map(function(h){return h[0]+'-'+h[1]}).join(' | ')}

  function updateRT(){
    var d=now(),dn=['CN','T2','T3','T4','T5','T6','T7'][d.getDay()];
    $rtBar.innerHTML='<span class="rt-item rt-date">📅 '+dn+' '+fullDate()+'</span>'+
      '<span class="rt-item rt-even">📊 Ngày '+d.getDate()+' ('+dayLabel()+')</span>'+
      '<span class="rt-item rt-time">🕐 '+timeStr()+':'+d.getSeconds().toString().padStart(2,'0')+'</span>';
  }
  updateRT();setInterval(updateRT,1000);
  setInterval(function(){if(spots.length>0)render()},60000);

  /* ==================== STORAGE ==================== */
  function loadSpots(){
    try{var d=localStorage.getItem(STORAGE_KEY);spots=d?JSON.parse(d):[];return spots}
    catch(e){spots=[];return spots}
  }
  function saveSpots(){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(spots))}catch(e){}
  }
  function deleteSpot(id){
    spots=spots.filter(function(s){return s.id!==id});
    saveSpots();render();
    showToast('🗑️ Đã xóa địa điểm');
  }

  /* ==================== RENDER ==================== */
  function getCategories(){
    var cats=[];
    for(var i=0;i<spots.length;i++){if(cats.indexOf(spots[i].district)===-1)cats.push(spots[i].district)}
    return cats;
  }

  function render(){
    var cats=getCategories();
    // Tabs
    $tabs.innerHTML='';
    var allNames=[TAB_ALL].concat(cats);
    for(var i=0;i<allNames.length;i++){
      var btn=document.createElement('button');btn.className='tab-btn focusable';
      btn.setAttribute('role','tab');btn.setAttribute('aria-selected',allNames[i]===activeTab?'true':'false');
      btn.dataset.category=allNames[i];btn.textContent=allNames[i];$tabs.appendChild(btn);
    }
    // Filter
    var items=spots.slice();
    if(activeTab!==TAB_ALL)items=items.filter(function(s){return s.district===activeTab});
    if(searchQ){var q=searchQ.toLowerCase();items=items.filter(function(s){
      return(s.name&&s.name.toLowerCase().indexOf(q)!==-1)||(s.address&&s.address.toLowerCase().indexOf(q)!==-1)||(s.note&&s.note.toLowerCase().indexOf(q)!==-1)||(s.district&&s.district.toLowerCase().indexOf(q)!==-1)
    })}

    if(items.length===0){$empty.style.display='';$grid.style.display='none';$status.textContent='🅿️ '+spots.length+' địa điểm';return}
    $empty.style.display='none';$grid.style.display='';

    // Group by district
    var grouped={},order=[];
    for(var j=0;j<items.length;j++){
      var d=items[j].district||'Khác';
      if(!grouped[d]){grouped[d]=[];order.push(d)}
      grouped[d].push(items[j]);
    }
    $grid.innerHTML='';
    var frag=document.createDocumentFragment();
    for(var c=0;c<order.length;c++){
      var cn=order[c],ci=grouped[cn];
      var sec=document.createElement('div');sec.className='category-section';
      var tw=document.createElement('div');tw.className='category-title';
      var h3=document.createElement('h3');h3.textContent=cn+' ('+ci.length+')';
      tw.appendChild(h3);sec.appendChild(tw);
      var grid=document.createElement('div');grid.className='category-grid';
      for(var k=0;k<ci.length;k++)grid.appendChild(createCard(ci[k]));
      sec.appendChild(grid);frag.appendChild(sec);
    }
    $grid.appendChild(frag);
    $status.textContent='🅿️ '+spots.length+' địa điểm • '+timeStr();
  }

  /* ==================== CARD ==================== */
  function createCard(it){
    var card=document.createElement('div');card.className='app-card';
    // Icon
    var iw=document.createElement('div');iw.className='app-card__icon-wrap';
    var nm=it.name||'Bãi xe';var em=rEmoji(nm);var co=rColors(nm);var ini=initials(nm);
    var ib=document.createElement('div');ib.className='app-card__icon-box';
    ib.style.background='linear-gradient(135deg,'+co[0]+','+co[1]+')';
    var emEl=document.createElement('span');emEl.className='icon-emoji';emEl.textContent=em;ib.appendChild(emEl);
    var inEl=document.createElement('span');inEl.className='icon-initials';inEl.textContent=ini;ib.appendChild(inEl);
    iw.appendChild(ib);card.appendChild(iw);

    var info=document.createElement('div');info.className='app-card__info';
    // Name + badges
    var nr=document.createElement('div');nr.className='app-card__name-row';
    var ne=document.createElement('span');ne.className='app-card__name';ne.textContent=nm;nr.appendChild(ne);
    var tl={'xe_may':'XE MÁY','oto':'Ô TÔ','both':'XM & ÔTÔ'};
    if(it.type){var bg=document.createElement('span');bg.className='app-card__badge badge-'+it.type;bg.textContent=tl[it.type]||it.type;nr.appendChild(bg)}
    info.appendChild(nr);

    // Address
    if(it.address){var ad=document.createElement('div');ad.className='app-card__desc';ad.textContent='📍 '+it.address;info.appendChild(ad)}
    // Meta
    var meta=document.createElement('div');meta.className='app-card__meta';var mp=[];
    if(it.hours)mp.push('🕐 '+it.hours);
    if(it.ban_even_odd)mp.push('📊 Cấm ngày '+(it.ban_even_odd==='even'?'CHẴN':'LẺ'));
    if(it.ban_hours&&it.ban_hours.length>0)mp.push('⏰ '+fmtBanH(it.ban_hours));
    if(mp.length>0){meta.textContent=mp.join(' • ');info.appendChild(meta)}
    // Note
    if(it.note){var nt=document.createElement('div');nt.className='app-card__desc';nt.style.marginTop='2px';nt.textContent='💡 '+it.note;info.appendChild(nt)}
    // Status
    var st=parkStatus(it);
    var stEl=document.createElement('div');stEl.className='status-badge '+st.cls;stEl.textContent=st.lbl;info.appendChild(stEl);

    // Buttons row
    var btns=document.createElement('div');btns.className='card-actions';
    // Map
    if(it.lat&&it.lng){
      var mb=document.createElement('a');mb.className='spot-map-btn';
      mb.href='https://www.google.com/maps/search/?api=1&query='+it.lat+','+it.lng;
      mb.target='_blank';mb.rel='noopener';mb.textContent='🗺️ Chỉ đường';
      mb.addEventListener('click',function(e){e.stopPropagation()});btns.appendChild(mb);
    }
    // Delete
    var del=document.createElement('button');del.className='spot-del-btn';del.textContent='🗑️ Xóa';
    del.addEventListener('click',function(e){e.stopPropagation();if(confirm('Xóa "'+it.name+'"?'))deleteSpot(it.id)});
    btns.appendChild(del);
    info.appendChild(btns);

    card.appendChild(info);return card;
  }

  /* ==================== PASSWORD MODAL ==================== */
  function showPasswordPrompt(callback){
    var ov=document.createElement('div');ov.className='pw-overlay show';
    ov.innerHTML='<div class="pw-modal"><div class="pw-modal__header"><span class="pw-modal__icon">🔐</span><h3 class="pw-modal__title">Nhập mật khẩu</h3></div>'+
      '<p class="pw-modal__app-name">🅿️ Thêm chỗ đậu xe mới</p>'+
      '<input type="password" class="pw-modal__input" id="pw-inp" placeholder="Nhập mật khẩu..." autocomplete="off" maxlength="20">'+
      '<p class="pw-modal__error" id="pw-err" style="display:none">❌ Sai mật khẩu!</p>'+
      '<div class="pw-modal__buttons"><button class="pw-modal__btn pw-btn-cancel" id="pw-no">Hủy</button><button class="pw-modal__btn pw-btn-ok" id="pw-yes">Xác nhận</button></div></div>';
    document.body.appendChild(ov);
    var inp=document.getElementById('pw-inp'),err=document.getElementById('pw-err');
    setTimeout(function(){inp.focus()},100);
    function close(){document.body.removeChild(ov)}
    function submit(){
      if(inp.value===PASSWORD){close();callback()}
      else{err.style.display='';inp.value='';inp.focus();var m=ov.querySelector('.pw-modal');m.classList.add('shake');setTimeout(function(){m.classList.remove('shake')},500)}
    }
    document.getElementById('pw-no').addEventListener('click',close);
    document.getElementById('pw-yes').addEventListener('click',submit);
    inp.addEventListener('keydown',function(e){if(e.keyCode===13)submit()});
    ov.addEventListener('click',function(e){if(e.target===ov)close()});
  }

  /* ==================== ADD FORM MODAL ==================== */
  function showAddForm(){
    var ov=document.createElement('div');ov.className='pw-overlay show';
    var distOpts=DISTRICTS.map(function(d){return'<option value="'+d+'">'+d+'</option>'}).join('');
    ov.innerHTML='<div class="add-modal">'+
      '<h3 class="add-modal__title">🅿️ Thêm chỗ đậu xe</h3>'+
      '<div class="add-field"><label>Tên địa điểm *</label><input id="f-name" placeholder="VD: Bãi xe Công viên 23/9"></div>'+
      '<div class="add-field"><label>Quận / Khu vực *</label><select id="f-dist">'+distOpts+'</select></div>'+
      '<div class="add-field"><label>Địa chỉ *</label><input id="f-addr" placeholder="VD: 123 Nguyễn Huệ, Q1"></div>'+
      '<div class="add-field"><label>Loại xe</label><select id="f-type"><option value="xe_may">Xe máy</option><option value="oto">Ô tô</option><option value="both">Xe máy & Ô tô</option></select></div>'+
      '<div class="add-field"><label>Giờ hoạt động</label><input id="f-hours" placeholder="VD: 6:00 - 22:00 hoặc 24/7"></div>'+
      '<div class="add-field"><label>Ghi chú</label><input id="f-note" placeholder="VD: Miễn phí ban đêm"></div>'+
      '<div class="add-field"><label>Cấm chẵn/lẻ</label><select id="f-eo"><option value="">Không cấm</option><option value="even">Cấm ngày CHẴN</option><option value="odd">Cấm ngày LẺ</option></select></div>'+
      '<div class="add-field"><label>Cấm giờ (mốc, cách bởi dấu |)</label><input id="f-bh" placeholder="VD: 06:00-09:00 | 16:00-19:00"></div>'+
      '<div class="add-field"><label>Tọa độ (tùy chọn)</label><div style="display:flex;gap:8px"><input id="f-lat" placeholder="Latitude" style="flex:1"><input id="f-lng" placeholder="Longitude" style="flex:1"></div></div>'+
      '<div class="pw-modal__buttons"><button class="pw-modal__btn pw-btn-cancel" id="add-no">Hủy</button><button class="pw-modal__btn pw-btn-ok" id="add-yes">✅ Thêm</button></div>'+
    '</div>';
    document.body.appendChild(ov);
    setTimeout(function(){document.getElementById('f-name').focus()},100);
    function close(){document.body.removeChild(ov)}
    document.getElementById('add-no').addEventListener('click',close);
    ov.addEventListener('click',function(e){if(e.target===ov)close()});
    document.getElementById('add-yes').addEventListener('click',function(){
      var name=document.getElementById('f-name').value.trim();
      var dist=document.getElementById('f-dist').value;
      var addr=document.getElementById('f-addr').value.trim();
      if(!name||!addr){showToast('❌ Cần nhập tên và địa chỉ!');return}
      // Parse ban_hours
      var bhStr=document.getElementById('f-bh').value.trim();
      var banHours=[];
      if(bhStr){
        var parts=bhStr.split('|');
        for(var i=0;i<parts.length;i++){
          var p=parts[i].trim();
          var m=p.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
          if(m)banHours.push([m[1],m[2]]);
        }
      }
      var spot={
        id:Date.now().toString(36)+Math.random().toString(36).substr(2,4),
        name:name,
        district:dist,
        address:addr,
        type:document.getElementById('f-type').value,
        hours:document.getElementById('f-hours').value.trim()||'24/7',
        note:document.getElementById('f-note').value.trim(),
        ban_even_odd:document.getElementById('f-eo').value||null,
        ban_hours:banHours,
        lat:parseFloat(document.getElementById('f-lat').value)||null,
        lng:parseFloat(document.getElementById('f-lng').value)||null,
        created:new Date().toISOString()
      };
      spots.push(spot);saveSpots();close();render();
      showToast('✅ Đã thêm "'+name+'"');
    });
  }

  /* ==================== EVENTS ==================== */
  $btnAdd.addEventListener('click',function(){showPasswordPrompt(showAddForm)});
  $btnTheme.addEventListener('click',toggleTheme);
  $tabs.addEventListener('click',function(e){var b=e.target.closest('.tab-btn');if(b){activeTab=b.dataset.category;render()}});
  var deb=null;
  $search.addEventListener('input',function(){clearTimeout(deb);deb=setTimeout(function(){searchQ=$search.value.trim();render()},200)});

  /* INIT */
  loadSpots();render();
})();
