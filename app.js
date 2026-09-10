(function(){
'use strict';
var PW='23824',SK='gp_spots',TAB_ALL='TẤT CẢ';
var DIST=['Quận 1','Quận 2','Quận 3','Quận 4','Quận 5','Quận 6','Quận 7','Quận 8','Quận 9','Quận 10','Quận 11','Quận 12','Bình Thạnh','Phú Nhuận','Tân Bình','Tân Phú','Gò Vấp','Thủ Đức','Bình Tân','Nhà Bè','Khác'];
var EM=['🅿️','🚗','🏍️','🚙','🛵','🏢','🏬','🏪','🗺️','📍','🚦','🛣️','🚘','🌳','🌆','⛽','🏗️','🎯','🏛️','🏫'];
var CO=[['#00d4ff','#38bdf8'],['#ff2d78','#ff6b9d'],['#7c3aed','#a78bfa'],['#10b981','#34d399'],['#f59e0b','#fbbf24'],['#ef4444','#f87171'],['#8b5cf6','#c084fc'],['#06b6d4','#22d3ee'],['#ec4899','#f472b6'],['#14b8a6','#2dd4bf'],['#f97316','#fb923c'],['#6366f1','#818cf8'],['#22c55e','#4ade80'],['#3b82f6','#60a5fa']];
function h(s){var v=0;for(var i=0;i<s.length;i++){v=((v<<5)-v)+s.charCodeAt(i);v=v&v}return Math.abs(v)}
function rE(n){return EM[h(n)%EM.length]}
function rC(n){return CO[h(n+'c')%CO.length]}
function ini(n){if(!n)return'?';var w=n.replace(/[^a-zA-ZÀ-ỹ0-9\s]/g,'').trim().split(/\s+/);return w.length>=2?(w[0][0]+w[1][0]).toUpperCase():n.substring(0,2).toUpperCase()}

var $s=document.getElementById('search'),$ba=document.getElementById('btn-add'),$bt=document.getElementById('btn-theme');
var $tabs=document.getElementById('tabs'),$grid=document.getElementById('grid'),$emp=document.getElementById('empty');
var $toast=document.getElementById('toast'),$rt=document.getElementById('rt-bar');
var spots=[],tab=TAB_ALL,sq='',tt=null;

// Theme
(function(){var t=localStorage.getItem('gp-theme');if(t)document.documentElement.setAttribute('data-theme',t)})();
function togTheme(){var c=document.documentElement.getAttribute('data-theme');var n=c==='dark'?'light':'dark';document.documentElement.setAttribute('data-theme',n);localStorage.setItem('gp-theme',n);$bt.textContent=n==='dark'?'🌙':'☀️'}

function toast(m){$toast.textContent=m;$toast.classList.add('show');clearTimeout(tt);tt=setTimeout(function(){$toast.classList.remove('show')},2500)}

// Realtime
function now(){return new Date()}
function isEven(){return now().getDate()%2===0}
function dType(){return isEven()?'even':'odd'}
function dLabel(){return isEven()?'CHẴN':'LẺ'}
function tStr(){var d=now();return p2(d.getHours())+':'+p2(d.getMinutes())}
function p2(n){return n<10?'0'+n:''+n}
function fDate(){var d=now();return p2(d.getDate())+'/'+p2(d.getMonth()+1)+'/'+d.getFullYear()}
function pT(t){var p=t.split(':');return parseInt(p[0],10)*60+parseInt(p[1],10)}

function isBanned(bh){
  if(!bh||!bh.length)return false;
  var n=pT(tStr());
  for(var i=0;i<bh.length;i++){if(n>=pT(bh[i][0])&&n<pT(bh[i][1]))return true}
  return false;
}
function nextBan(bh){
  if(!bh||!bh.length)return null;
  var n=pT(tStr());
  for(var i=0;i<bh.length;i++){if(n<pT(bh[i][0]))return bh[i]}
  return null;
}
function pStatus(it){
  var r={ok:true,cls:'st-ok',lbl:'✅ Đậu được'};
  if(it.ban_eo){
    if(it.ban_eo===dType()){r.ok=false;r.cls='st-ban';r.lbl='🚫 Cấm hôm nay (ngày '+dLabel()+')';return r}
  }
  if(it.ban_h&&it.ban_h.length){
    if(isBanned(it.ban_h)){r.ok=false;r.cls='st-ban';r.lbl='🚫 Đang cấm giờ!';return r}
    var nb=nextBan(it.ban_h);
    if(nb){r.cls='st-warn';r.lbl='⚠️ Đậu được — Cấm lúc '+nb[0]}
    else{r.lbl='✅ Hết giờ cấm'}
  }
  return r;
}
function fmtBH(bh){if(!bh||!bh.length)return'';return bh.map(function(x){return x[0]+'-'+x[1]}).join(' | ')}

function updateRT(){
  var d=now(),dn=['CN','T2','T3','T4','T5','T6','T7'][d.getDay()];
  $rt.innerHTML='<span class="rt-i rd">📅 '+dn+' '+fDate()+'</span><span class="rt-i re">📊 Ngày '+d.getDate()+' ('+dLabel()+')</span><span class="rt-i rt">🕐 '+tStr()+':'+p2(d.getSeconds())+'</span>';
}
updateRT();setInterval(updateRT,1000);
setInterval(function(){if(spots.length)render()},60000);

// Storage
function load(){try{var d=localStorage.getItem(SK);spots=d?JSON.parse(d):[]}catch(e){spots=[]}}
function save(){try{localStorage.setItem(SK,JSON.stringify(spots))}catch(e){}}
function delSpot(id){spots=spots.filter(function(s){return s.id!==id});save();render();toast('🗑️ Đã xóa')}

// Render
function getCats(){var c=[];for(var i=0;i<spots.length;i++){if(c.indexOf(spots[i].dist)===-1)c.push(spots[i].dist)}return c}

function render(){
  var cats=getCats();
  $tabs.innerHTML='';
  var all=[TAB_ALL].concat(cats);
  for(var i=0;i<all.length;i++){
    var b=document.createElement('button');b.className='tab-btn';
    b.setAttribute('aria-selected',all[i]===tab?'true':'false');
    b.dataset.cat=all[i];b.textContent=all[i];$tabs.appendChild(b);
  }
  var items=spots.slice();
  if(tab!==TAB_ALL)items=items.filter(function(s){return s.dist===tab});
  if(sq){var q=sq.toLowerCase();items=items.filter(function(s){
    return(s.name||'').toLowerCase().indexOf(q)!==-1||(s.addr||'').toLowerCase().indexOf(q)!==-1||(s.note||'').toLowerCase().indexOf(q)!==-1||(s.dist||'').toLowerCase().indexOf(q)!==-1
  })}
  if(!items.length){$emp.style.display='';$grid.style.display='none';return}
  $emp.style.display='none';$grid.style.display='';
  var gd={},od=[];
  for(var j=0;j<items.length;j++){var d=items[j].dist||'Khác';if(!gd[d]){gd[d]=[];od.push(d)}gd[d].push(items[j])}
  $grid.innerHTML='';
  for(var c=0;c<od.length;c++){
    var cn=od[c],ci=gd[cn];
    var sec=document.createElement('div');sec.className='cat-sec';
    var tw=document.createElement('div');tw.className='cat-t';
    var h3=document.createElement('h3');h3.textContent=cn+' ('+ci.length+')';
    tw.appendChild(h3);sec.appendChild(tw);
    var gr=document.createElement('div');gr.className='cat-g';
    for(var k=0;k<ci.length;k++)gr.appendChild(mkCard(ci[k]));
    sec.appendChild(gr);$grid.appendChild(sec);
  }
}

function mkCard(it){
  var card=document.createElement('div');card.className='app-card';
  var nm=it.name||'Bãi xe',em=rE(nm),co=rC(nm),ii=ini(nm);
  // Icon
  var ib=document.createElement('div');ib.className='ic-box';
  ib.style.background='linear-gradient(135deg,'+co[0]+','+co[1]+')';
  var e1=document.createElement('span');e1.className='ic-em';e1.textContent=em;ib.appendChild(e1);
  var e2=document.createElement('span');e2.className='ic-in';e2.textContent=ii;ib.appendChild(e2);
  card.appendChild(ib);
  // Info
  var info=document.createElement('div');info.className='c-info';
  // Name row
  var nr=document.createElement('div');nr.className='c-row';
  var ne=document.createElement('span');ne.className='c-name';ne.textContent=nm;nr.appendChild(ne);
  var tl={xe_may:'XE MÁY',oto:'Ô TÔ',both:'XM & ÔTÔ'};
  if(it.type){var bg=document.createElement('span');bg.className='c-badge b-'+it.type;bg.textContent=tl[it.type]||it.type;nr.appendChild(bg)}
  info.appendChild(nr);
  // Address
  if(it.addr){var ad=document.createElement('div');ad.className='c-addr';ad.textContent='📍 '+it.addr;info.appendChild(ad)}
  // Meta
  var mp=[];
  if(it.hours)mp.push('🕐 '+it.hours);
  if(it.ban_eo)mp.push('📊 Cấm ngày '+(it.ban_eo==='even'?'CHẴN':'LẺ'));
  if(it.ban_h&&it.ban_h.length)mp.push('⏰ '+fmtBH(it.ban_h));
  if(mp.length){var mt=document.createElement('div');mt.className='c-meta';mt.textContent=mp.join(' • ');info.appendChild(mt)}
  // Price
  if(it.price){var pr=document.createElement('div');pr.className='c-price';pr.textContent='💰 '+it.price;info.appendChild(pr)}
  // Note
  if(it.note){var nt=document.createElement('div');nt.className='c-note';nt.textContent='💡 '+it.note;info.appendChild(nt)}
  // Status
  var st=pStatus(it);
  var se=document.createElement('div');se.className='st-badge '+st.cls;se.textContent=st.lbl;info.appendChild(se);
  // Actions
  var ac=document.createElement('div');ac.className='c-acts';
  if(it.lat&&it.lng){
    var mb=document.createElement('a');mb.className='map-btn';
    mb.href='https://www.google.com/maps/search/?api=1&query='+it.lat+','+it.lng;
    mb.target='_blank';mb.rel='noopener';mb.textContent='🗺️ Chỉ đường';
    mb.onclick=function(e){e.stopPropagation()};ac.appendChild(mb);
  }
  var db=document.createElement('button');db.className='del-btn';db.textContent='🗑️ Xóa';
  db.onclick=function(e){e.stopPropagation();if(confirm('Xóa "'+it.name+'"?'))delSpot(it.id)};
  ac.appendChild(db);info.appendChild(ac);
  card.appendChild(info);return card;
}

// Password modal
function pwPrompt(cb){
  var ov=document.createElement('div');ov.className='ov';
  ov.innerHTML='<div class="pw-mod"><h3>🔐 Nhập mật khẩu</h3><p style="font-size:.8rem;color:var(--dim);margin-bottom:4px">Xác nhận để thêm chỗ đậu xe</p><input type="password" id="pw-i" placeholder="••••••" maxlength="20" autocomplete="off"><p class="pw-err" id="pw-e">❌ Sai mật khẩu!</p><div class="pw-btns"><button class="btn-cancel" id="pw-n">Hủy</button><button class="btn-ok" id="pw-y">Xác nhận</button></div></div>';
  document.body.appendChild(ov);
  var inp=document.getElementById('pw-i'),err=document.getElementById('pw-e');
  setTimeout(function(){inp.focus()},100);
  function cl(){document.body.removeChild(ov)}
  function go(){
    if(inp.value===PW){cl();cb()}
    else{err.style.display='block';inp.value='';inp.focus();var m=ov.querySelector('.pw-mod');m.classList.add('shake');setTimeout(function(){m.classList.remove('shake')},500)}
  }
  document.getElementById('pw-n').onclick=cl;
  document.getElementById('pw-y').onclick=go;
  inp.onkeydown=function(e){if(e.keyCode===13)go()};
  ov.onclick=function(e){if(e.target===ov)cl()};
}

// Add form modal
function addForm(){
  var ov=document.createElement('div');ov.className='ov';
  var opts=DIST.map(function(d){return'<option value="'+d+'">'+d+'</option>'}).join('');
  ov.innerHTML='<div class="add-mod"><h3>🅿️ Thêm chỗ đậu xe</h3>'+
    '<div class="af"><label>Tên địa điểm *</label><input id="f-n" placeholder="VD: Bãi xe Vincom Q1"></div>'+
    '<div class="af"><label>Quận / Khu vực *</label><select id="f-d">'+opts+'</select></div>'+
    '<div class="af"><label>Địa chỉ *</label><input id="f-a" placeholder="VD: 72 Lê Thánh Tôn, Q1"></div>'+
    '<div class="af"><label>Loại xe</label><select id="f-t"><option value="oto">Ô tô</option><option value="xe_may">Xe máy</option><option value="both">Xe máy & Ô tô</option></select></div>'+
    '<div class="af"><label>Giờ hoạt động</label><input id="f-h" placeholder="VD: 6:00-22:00 hoặc 24/7"></div>'+
    '<div class="af"><label>Phí gửi xe (để trống = miễn phí)</label><input id="f-p" placeholder="VD: 10.000đ/giờ hoặc 80.000đ/ngày"></div>'+
    '<div class="af"><label>Ghi chú</label><input id="f-no" placeholder="VD: Free 2h đầu khi mua sắm"></div>'+
    '<div class="af"><label>Cấm chẵn/lẻ</label><select id="f-eo"><option value="">Không cấm</option><option value="even">Cấm ngày CHẴN</option><option value="odd">Cấm ngày LẺ</option></select></div>'+
    '<div class="af"><label>Cấm giờ (cách bởi dấu | )</label><input id="f-bh" placeholder="VD: 06:00-09:00 | 16:00-19:00"></div>'+
    '<div class="af"><label>Tọa độ (paste từ Google Maps)</label><input id="f-ll" placeholder="VD: 10.7688, 106.6932"></div>'+
    '<div class="pw-btns"><button class="btn-cancel" id="a-n">Hủy</button><button class="btn-ok" id="a-y">✅ Thêm</button></div></div>';
  document.body.appendChild(ov);
  setTimeout(function(){document.getElementById('f-n').focus()},100);
  function cl(){document.body.removeChild(ov)}
  document.getElementById('a-n').onclick=cl;
  ov.onclick=function(e){if(e.target===ov)cl()};
  document.getElementById('a-y').onclick=function(){
    var name=document.getElementById('f-n').value.trim();
    var addr=document.getElementById('f-a').value.trim();
    if(!name||!addr){toast('❌ Cần nhập tên và địa chỉ!');return}
    var bhStr=document.getElementById('f-bh').value.trim(),banH=[];
    if(bhStr){var ps=bhStr.split('|');for(var i=0;i<ps.length;i++){var m=ps[i].trim().match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);if(m)banH.push([m[1],m[2]])}}
    var priceVal=document.getElementById('f-p').value.trim();
    var llStr=document.getElementById('f-ll').value.trim(),lat=null,lng=null;
    if(llStr){var lm=llStr.match(/([\d.]+)\s*[,\s]\s*([\d.]+)/);if(lm){lat=parseFloat(lm[1]);lng=parseFloat(lm[2])}}
    var spot={
      id:Date.now().toString(36)+Math.random().toString(36).substr(2,4),
      name:name,dist:document.getElementById('f-d').value,
      addr:addr,type:document.getElementById('f-t').value,
      hours:document.getElementById('f-h').value.trim()||'24/7',
      price:priceVal||'Miễn phí',
      note:document.getElementById('f-no').value.trim(),
      ban_eo:document.getElementById('f-eo').value||null,
      ban_h:banH,lat:lat,lng:lng
    };
    spots.push(spot);save();cl();render();toast('✅ Đã thêm "'+name+'"');
  };
}

// Events
$ba.onclick=function(){pwPrompt(addForm)};
$bt.onclick=togTheme;
$tabs.onclick=function(e){var b=e.target.closest('.tab-btn');if(b){tab=b.dataset.cat;render()}};
var db=null;
$s.oninput=function(){clearTimeout(db);db=setTimeout(function(){sq=$s.value.trim();render()},200)};

// Init
load();render();
})();
