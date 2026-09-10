// ======================================================================
// 🟠 WEB PENJUAL  (folder: penjual/)
// File: seller.js
// ======================================================================

/*
  seller.js
  ---------
  Semua tampilan & aksi untuk web PENJUAL (situs berdiri sendiri):
  login/daftar -> kelola menu (+foto) -> kelola pesanan masuk -> profil toko
  (+foto toko, +QRIS) & cetak/unduh QR -> ringkasan.
  Bergantung pada: state & go() dari app.js, sGet/sSet/sList/sDel/sUploadImage
  dari storage.js, fungsi bantu dari utils.js, dan BUYER_SITE_URL dari site-config.js.
*/

const SELLER_CATS = [
  { id:'makanan', label:'🍔 Makanan' },
  { id:'minuman', label:'🥤 Minuman' },
  { id:'snack', label:'🍟 Snack' },
  { id:'lainnya', label:'✨ Lainnya' },
];

/* ---------- login / daftar ---------- */
function renderSellerAuth(){
  const app = document.getElementById('app');
  app.innerHTML = `
  <div class="topbar"><div><h2>🏮 Dashboard Penjual</h2><div class="sub">Kelola toko kamu di alun-alun</div></div></div>
  <div class="content">
    <div class="tabbar" style="border-radius:999px;overflow:hidden;margin-bottom:16px;position:static;background:var(--ink-2);">
      <button id="tabLogin" class="active" onclick="switchAuthTab('login')">Masuk</button>
      <button id="tabReg" onclick="switchAuthTab('reg')">Daftar Toko Baru</button>
    </div>
    <div id="authForm"></div>
    <p class="muted" style="text-align:center;margin-top:18px;">
      Cuma mau lihat cara pembeli memesan? <a href="${BUYER_SITE_URL}" target="_blank">Buka web pembeli</a>
    </p>
  </div>`;
  switchAuthTab('login');
}

function switchAuthTab(tab){
  document.getElementById('tabLogin').className = tab === 'login' ? 'active' : '';
  document.getElementById('tabReg').className = tab === 'reg' ? 'active' : '';
  const el = document.getElementById('authForm');
  if(tab === 'login'){
    el.innerHTML = `
    <div class="card">
      <div class="field"><label>Username</label><input id="lu" type="text" placeholder="username"></div>
      <div class="field"><label>Password</label>
        <div class="pwd-wrap">
          <input id="lp" type="password" placeholder="••••••">
          <button type="button" class="pwd-toggle" onclick="togglePwd('lp', this)">Lihat</button>
        </div>
      </div>
      <button class="btn btn-primary" onclick="doLogin()">Masuk</button>
      <p id="loginMsg" class="muted" style="margin-top:8px;"></p>
    </div>`;
  } else {
    el.innerHTML = `
    <div class="card">
      <div class="field"><label>Nama toko</label><input id="ru" type="text" placeholder="contoh: Nasi Goreng Bu Sri"></div>
      <div class="field"><label>Deskripsi singkat</label><input id="rd" type="text" placeholder="contoh: Nasi goreng & mie goreng"></div>
      <div class="field"><label>Kategori toko</label>
        <select id="rcat">${SELLER_CATS.map(c => `<option value="${c.id}">${c.label}</option>`).join('')}</select>
      </div>
      <div class="field"><label>Username</label><input id="rus" type="text" placeholder="username unik"></div>
      <div class="field"><label>Password</label>
        <div class="pwd-wrap">
          <input id="rp" type="password" placeholder="buat password">
          <button type="button" class="pwd-toggle" onclick="togglePwd('rp', this)">Lihat</button>
        </div>
      </div>
      <button class="btn btn-primary" onclick="doRegister()">Daftar & Masuk</button>
      <p id="regMsg" class="muted" style="margin-top:8px;"></p>
    </div>`;
  }
}

async function doRegister(){
  const name = document.getElementById('ru').value.trim();
  const desc = document.getElementById('rd').value.trim();
  const category = document.getElementById('rcat').value;
  const username = document.getElementById('rus').value.trim();
  const pass = document.getElementById('rp').value;
  const msg = document.getElementById('regMsg');
  if(!name || !username || !pass){ msg.textContent = 'Lengkapi semua kolom.'; return; }
  const existing = await sGet('seller:' + username, true);
  if(existing){ msg.textContent = 'Username sudah dipakai, pilih yang lain.'; return; }
  const storeId = genId();
  await sSet('store:' + storeId, {id:storeId, name, desc, category, ownerUsername:username}, true);
  await sSet('seller:' + username, {password:pass, storeId, storeName:name}, true);
  await sSet('session', username, false);
  state.seller = {username, storeId, storeName:name};
  go('seller-dash', {sellerTab:'menu'});
}

async function doLogin(){
  const username = document.getElementById('lu').value.trim();
  const pass = document.getElementById('lp').value;
  const msg = document.getElementById('loginMsg');
  const acc = await sGet('seller:' + username, true);
  if(!acc || acc.password !== pass){ msg.textContent = 'Username atau password salah.'; return; }
  await sSet('session', username, false);
  state.seller = {username, storeId:acc.storeId, storeName:acc.storeName};
  go('seller-dash', {sellerTab:'menu'});
}

async function doLogout(){
  await sDel('session', false);
  state.seller = {username:null, storeId:null, storeName:null};
  go('seller-auth');
}

/* ---------- dashboard ---------- */
async function renderSellerDash(){
  const app = document.getElementById('app');
  app.innerHTML = `
  <div class="topbar">
    <div style="flex:1;"><h2>${escapeHtml(state.seller.storeName || 'Toko Saya')}</h2><div class="sub">@${escapeHtml(state.seller.username || '')}</div></div>
    <button class="btn btn-sm btn-outline" onclick="doLogout()">Keluar</button>
  </div>
  <div class="content" id="dashContent"></div>
  <div class="tabbar">
    <button id="t-menu" onclick="switchDashTab('menu')">🍢<span>Menu</span></button>
    <button id="t-orders" onclick="switchDashTab('orders')">🧾<span>Pesanan</span></button>
    <button id="t-store" onclick="switchDashTab('store')">🏮<span>Toko &amp; QR</span></button>
    <button id="t-sum" onclick="switchDashTab('summary')">📊<span>Ringkasan</span></button>
  </div>`;
  switchDashTab(state.sellerTab || 'menu');
}

function switchDashTab(tab){
  state.sellerTab = tab;
  ['menu','orders','store','summary'].forEach(t => {
    const b = document.getElementById('t-' + (t === 'summary' ? 'sum' : t));
    if(b) b.className = t === tab ? 'active' : '';
  });
  if(tab === 'menu') renderDashMenu();
  else if(tab === 'orders') renderDashOrders();
  else if(tab === 'store') renderDashStore();
  else renderDashSummary();
}

/* ---- tab: menu ---- */
async function renderDashMenu(){
  const el = document.getElementById('dashContent');
  const keys = await sList('menu:' + state.seller.storeId + ':', true);
  const items = (await Promise.all(keys.map(k => sGet(k, true)))).filter(Boolean);
  el.innerHTML = `
  <div class="card">
    <h3>Tambah Menu</h3>
    <div class="upload-row" style="margin-top:10px;">
      <label class="photo-upload upload-square" id="mPhotoBox">
        <input type="file" accept="image/*" id="mPhoto" onchange="previewImageInput(this,'mPhotoPreview')">
        <img id="mPhotoPreview">
        <span class="ph-ic">📷</span><span>Foto</span>
      </label>
      <div class="upload-text">Tambahkan foto makanan/minuman supaya menu lebih menarik di mata pembeli. Opsional, bisa dilewati.</div>
    </div>
    <div class="field"><label>Nama menu</label><input id="mName" type="text" placeholder="contoh: Es Teh Manis"></div>
    <div class="field"><label>Harga (Rp)</label><input id="mPrice" type="number" placeholder="5000"></div>
    <div class="field"><label>Kategori</label>
      <select id="mCat">${SELLER_CATS.map(c => `<option value="${c.id}">${c.label}</option>`).join('')}</select>
    </div>
    <button class="btn btn-primary" id="mAddBtn" onclick="addMenu()">Tambahkan</button>
  </div>
  <div class="section-title">Menu kamu (${items.length})</div>
  ${items.length === 0 ? '<div class="empty"><span class="empty-ic">🍽️</span>Belum ada menu. Tambahkan menu pertama kamu di atas.</div>' :
    items.map(m => `
    <div class="menu-card">
      <div class="menu-thumb" style="${m.photoURL ? `background-image:url('${m.photoURL}')` : ''}">${m.photoURL ? '' : (SELLER_CATS.find(c=>c.id===m.category)?.label.split(' ')[0] || '🍽️')}</div>
      <div class="menu-info">
        <div class="menu-name">${escapeHtml(m.name)}</div>
        <div class="menu-price">${rupiah(m.price)}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
        <div class="switch ${m.available !== false ? 'on' : ''}" onclick="toggleMenu('${m.id}', ${m.available === false})"><div class="knob"></div></div>
        <button class="linklike" style="color:var(--chili);" onclick="deleteMenu('${m.id}')">Hapus</button>
      </div>
    </div>`).join('')}
  `;
}

async function addMenu(){
  const name = document.getElementById('mName').value.trim();
  const price = Number(document.getElementById('mPrice').value);
  const category = document.getElementById('mCat').value;
  const fileInput = document.getElementById('mPhoto');
  if(!name || !price){ alert('Isi nama dan harga menu.'); return; }
  const btn = document.getElementById('mAddBtn');
  btn.disabled = true; btn.textContent = 'Menyimpan…';
  const id = genId();
  let photoURL = null;
  const file = fileInput.files && fileInput.files[0];
  if(file){
    try{
      const blob = await resizeImageToBlob(file, 900, 0.75);
      photoURL = await sUploadImage(`stores/${state.seller.storeId}/menu/${id}.jpg`, blob);
    }catch(e){ console.error(e); }
  }
  await sSet('menu:' + state.seller.storeId + ':' + id, {id, storeId:state.seller.storeId, name, price, category, photoURL, available:true}, true);
  renderDashMenu();
}

async function toggleMenu(id, makeAvailable){
  const key = 'menu:' + state.seller.storeId + ':' + id;
  const m = await sGet(key, true);
  if(!m) return;
  m.available = makeAvailable;
  await sSet(key, m, true);
  renderDashMenu();
}

async function deleteMenu(id){
  if(!confirm('Hapus menu ini?')) return;
  const key = 'menu:' + state.seller.storeId + ':' + id;
  const m = await sGet(key, true);
  await sDel(key, true);
  if(m && m.photoURL){ await sDeleteImage(`stores/${state.seller.storeId}/menu/${id}.jpg`); }
  renderDashMenu();
}

/* ---- tab: pesanan ---- */
async function renderDashOrders(){
  const el = document.getElementById('dashContent');
  el.innerHTML = '<div class="empty">Memuat pesanan…</div>';
  const keys = await sList('order:', true);
  let orders = (await Promise.all(keys.map(k => sGet(k, true)))).filter(Boolean);
  orders = orders.filter(o => o.storeId === state.seller.storeId).sort((a,b) => b.createdAt - a.createdAt);
  if(orders.length === 0){ el.innerHTML = '<div class="empty"><span class="empty-ic">🧾</span>Belum ada pesanan masuk.</div>'; return; }
  const totalTables = await getTotalTables();
  el.innerHTML = orders.map(o => {
    const idx = STATUS_FLOW.indexOf(o.status);
    const next = STATUS_FLOW[idx + 1];
    const mapOpen = state.mapOpenFor === o.id;
    const payLabel = o.paymentMethod === 'qris' ? 'QRIS' : 'Tunai';
    const payStatus = o.paymentStatus || (o.paymentMethod === 'qris' ? 'lunas' : 'bayar_ditempat');
    return `<div class="card">
      <div class="row">
        <div><strong>Meja No. ${o.table}</strong> <span class="muted">· ${new Date(o.createdAt).toLocaleTimeString('id-ID')}</span></div>
        <span class="badge badge-${o.status}">${STATUS_LABEL[o.status]}</span>
      </div>
      <div style="margin:10px 0;">
        ${o.items.map(it => `<div class="muted" style="display:flex;justify-content:space-between;font-size:13.5px;"><span>${it.qty}× ${escapeHtml(it.name)}</span><span>${rupiah(it.price*it.qty)}</span></div>`).join('')}
      </div>
      <div class="row"><strong>${rupiah(o.total)}</strong><span class="badge badge-${payStatus}">${payLabel} ${payStatus === 'lunas' ? '· Lunas' : '· Bayar di tempat'}</span></div>
      <div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <button class="linklike" onclick="toggleMap('${o.id}')">${mapOpen ? 'Sembunyikan lokasi meja' : 'Lihat lokasi meja'}</button>
        ${next ? `<button class="btn btn-sm btn-primary" style="margin-left:auto;" onclick="advanceOrder('${o.id}')">Tandai: ${STATUS_LABEL[next]}</button>` : `<span class="muted" style="margin-left:auto;">Pesanan selesai</span>`}
      </div>
      ${mapOpen ? `<div class="map-wrap" style="margin-top:10px;">${tableMapSVG(o.table, totalTables)}</div>` : ''}
    </div>`;
  }).join('');
}

function toggleMap(orderId){
  state.mapOpenFor = state.mapOpenFor === orderId ? null : orderId;
  renderDashOrders();
}

async function advanceOrder(orderId){
  const key = 'order:' + orderId;
  const o = await sGet(key, true);
  if(!o) return;
  const idx = STATUS_FLOW.indexOf(o.status);
  if(idx < STATUS_FLOW.length - 1){ o.status = STATUS_FLOW[idx + 1]; await sSet(key, o, true); }
  renderDashOrders();
}

/* ---- tab: toko & QR ---- */
async function renderDashStore(){
  const el = document.getElementById('dashContent');
  const store = await sGet('store:' + state.seller.storeId, true);
  el.innerHTML = `
  <div class="card">
    <h3>Foto Toko</h3>
    <p class="muted" style="margin:4px 0 10px;">Tampil di daftar lapak yang dilihat pembeli.</p>
    <label class="photo-upload upload-banner" id="stPhotoBox">
      <input type="file" accept="image/*" id="stPhoto" onchange="uploadStorePhoto(this)">
      <img id="stPhotoPreview" src="${store?.photoURL || ''}" style="${store?.photoURL ? 'display:block;' : ''}">
      <span class="ph-ic">📷</span><span id="stPhotoLabel">${store?.photoURL ? 'Ganti foto toko' : 'Tambah foto toko'}</span>
    </label>
  </div>
  <div class="card">
    <h3>Profil Toko</h3>
    <div class="field" style="margin-top:10px;"><label>Nama toko</label><input id="stName" type="text" value="${escapeHtml(store?.name || '')}"></div>
    <div class="field"><label>Deskripsi</label><input id="stDesc" type="text" value="${escapeHtml(store?.desc || '')}"></div>
    <div class="field"><label>Kategori toko</label>
      <select id="stCat">${SELLER_CATS.map(c => `<option value="${c.id}" ${store?.category === c.id ? 'selected' : ''}>${c.label}</option>`).join('')}</select>
    </div>
    <div class="field">
      <label>Toko kamu paling dekat dengan meja nomor berapa?</label>
      <input id="stNearTable" type="number" min="1" max="30" value="${store?.nearTable || ''}" placeholder="contoh: 5">
    </div>
    <p class="faint" style="margin-top:-6px;">Ini dipakai untuk mengurutkan toko dari yang terdekat saat pembeli scan QR di suatu meja — tanpa perlu izin lokasi apa pun.</p>
    <button class="btn btn-primary" onclick="saveStore()">Simpan Perubahan</button>
    <p id="stMsg" class="muted" style="margin-top:8px;"></p>
  </div>
  <div class="card">
    <h3>QRIS Pembayaran</h3>
    <p class="muted" style="margin:4px 0 10px;">Unggah gambar QRIS toko kamu (dari QRIS bank/e-wallet/merchant kamu). Kalau ini terisi, pembeli bisa memilih bayar QRIS langsung ke akun kamu saat checkout.</p>
    <label class="photo-upload" style="height:150px;" id="qrisPhotoBox">
      <input type="file" accept="image/*" id="qrisPhoto" onchange="uploadQrisPhoto(this)">
      <img id="qrisPhotoPreview" src="${store?.qrisImage || ''}" style="${store?.qrisImage ? 'display:block;object-fit:contain;background:#fff;' : ''}">
      <span class="ph-ic">▣</span><span id="qrisPhotoLabel">${store?.qrisImage ? 'Ganti gambar QRIS' : 'Unggah gambar QRIS'}</span>
    </label>
  </div>
  <div class="card">
    <h3>QR Kode Meja</h3>
    <p class="muted">Cetak dan tempel di tiap meja. Setiap QR membawa pembeli langsung ke <strong>web pembeli</strong> dengan nomor meja terisi otomatis.</p>
    <div class="field"><label>Jumlah meja</label><input id="qrCount" type="number" value="8" min="1" max="30"></div>
    <button class="btn btn-outline" onclick="renderQRs()">Buat QR</button>
    <div id="qrGrid" class="qr-grid"></div>
    <div class="qr-actions" id="qrActions" style="display:none;">
      <button class="btn btn-primary btn-block-sm" onclick="printAllQRs()">🖨️ Cetak Semua</button>
      <button class="btn btn-outline btn-block-sm" onclick="downloadAllQRs()">⬇️ Unduh Semua</button>
    </div>
    <p class="faint" style="margin-top:10px;">QR ini memakai alamat: ${escapeHtml(BUYER_SITE_URL)}<br>Kalau alamat web pembeli berubah, ubah dulu di file <code>site-config.js</code>, lalu buat ulang QR di sini.</p>
  </div>`;
}

async function uploadStorePhoto(input){
  const file = input.files && input.files[0];
  if(!file) return;
  const label = document.getElementById('stPhotoLabel');
  const oldLabel = label.textContent;
  label.textContent = 'Mengunggah…';
  previewImageInput(input, 'stPhotoPreview');
  try{
    const blob = await resizeImageToBlob(file, 1000, 0.78);
    const url = await sUploadImage(`stores/${state.seller.storeId}/photo.jpg`, blob);
    if(!url){ alert('Gagal mengunggah foto. Pastikan Firebase Storage sudah diaktifkan (lihat firebase-config.js).'); label.textContent = oldLabel; return; }
    const store = await sGet('store:' + state.seller.storeId, true) || {id: state.seller.storeId};
    store.photoURL = url;
    await sSet('store:' + state.seller.storeId, store, true);
    label.textContent = 'Ganti foto toko';
  }catch(e){
    console.error(e);
    alert('Gagal memproses foto.');
    label.textContent = oldLabel;
  }
}

async function uploadQrisPhoto(input){
  const file = input.files && input.files[0];
  if(!file) return;
  const label = document.getElementById('qrisPhotoLabel');
  const preview = document.getElementById('qrisPhotoPreview');
  const oldLabel = label.textContent;
  label.textContent = 'Mengunggah…';
  previewImageInput(input, 'qrisPhotoPreview');
  preview.style.objectFit = 'contain';
  preview.style.background = '#fff';
  try{
    const blob = await resizeImageToBlob(file, 700, 0.85);
    const url = await sUploadImage(`stores/${state.seller.storeId}/qris.jpg`, blob);
    if(!url){ alert('Gagal mengunggah QRIS. Pastikan Firebase Storage sudah diaktifkan (lihat firebase-config.js).'); label.textContent = oldLabel; return; }
    const store = await sGet('store:' + state.seller.storeId, true) || {id: state.seller.storeId};
    store.qrisImage = url;
    await sSet('store:' + state.seller.storeId, store, true);
    label.textContent = 'Ganti gambar QRIS';
  }catch(e){
    console.error(e);
    alert('Gagal memproses gambar QRIS.');
    label.textContent = oldLabel;
  }
}

async function saveStore(){
  const store = await sGet('store:' + state.seller.storeId, true) || {id: state.seller.storeId};
  store.name = document.getElementById('stName').value.trim();
  store.desc = document.getElementById('stDesc').value.trim();
  store.category = document.getElementById('stCat').value;
  const nt = Number(document.getElementById('stNearTable').value);
  store.nearTable = nt || null;
  await sSet('store:' + state.seller.storeId, store, true);
  const acc = await sGet('seller:' + state.seller.username, true);
  if(acc){ acc.storeName = store.name; await sSet('seller:' + state.seller.username, acc, true); }
  state.seller.storeName = store.name;
  document.getElementById('stMsg').textContent = 'Tersimpan.';
  renderSellerDash();
}

let _lastQRs = [];
async function renderQRs(){
  const n = Number(document.getElementById('qrCount').value) || 8;
  await sSet('config:totalTables', {total:n}, true);
  const grid = document.getElementById('qrGrid');
  const base = BUYER_SITE_URL.replace(/\/+$/, '');
  _lastQRs = [];
  let html = '';
  for(let i = 1; i <= n; i++){
    const url = base + '/?table=' + i;
    const qrImg = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(url);
    _lastQRs.push({ n: i, img: qrImg });
    html += `<div class="qr-card">
      <img src="${qrImg}" alt="QR Meja ${i}">
      <div class="qr-label">Meja No. ${i}</div>
      <button class="qr-dl" onclick="downloadImageURL('${qrImg}','qr-meja-${i}.png')">Unduh</button>
    </div>`;
  }
  grid.innerHTML = html;
  document.getElementById('qrActions').style.display = n > 0 ? 'flex' : 'none';
}

async function downloadAllQRs(){
  if(_lastQRs.length === 0) return;
  for(const q of _lastQRs){
    await downloadImageURL(q.img, `qr-meja-${q.n}.png`);
    await new Promise(r => setTimeout(r, 300)); // beri jeda supaya browser tidak memblokir unduhan beruntun
  }
}

function printAllQRs(){
  if(_lastQRs.length === 0){ alert('Buat QR dulu sebelum mencetak.'); return; }
  const storeName = escapeHtml(state.seller.storeName || 'Toko');
  const win = window.open('', '_blank');
  const cards = _lastQRs.map(q => `
    <div style="width:33.3%;box-sizing:border-box;padding:10px;display:inline-block;text-align:center;page-break-inside:avoid;">
      <div style="border:1.5px dashed #999;border-radius:10px;padding:14px 8px;">
        <img src="${q.img}" style="width:100%;max-width:180px;" />
        <div style="font-family:sans-serif;font-weight:700;margin-top:8px;font-size:14px;">${storeName}</div>
        <div style="font-family:sans-serif;font-size:12px;color:#555;">Meja No. ${q.n}</div>
      </div>
    </div>`).join('');
  win.document.write(`
    <!doctype html><html><head><title>Cetak QR - ${storeName}</title>
    <meta charset="UTF-8">
    <style>
      body{font-family:sans-serif;margin:16px;}
      @media print{ @page{ margin:10mm; } }
    </style>
    </head><body onload="setTimeout(function(){window.print();}, 500)">
    ${cards}
    </body></html>`);
  win.document.close();
}

/* ---- tab: ringkasan ---- */
async function renderDashSummary(){
  const el = document.getElementById('dashContent');
  const keys = await sList('order:', true);
  let orders = (await Promise.all(keys.map(k => sGet(k, true)))).filter(Boolean);
  orders = orders.filter(o => o.storeId === state.seller.storeId);
  const selesai = orders.filter(o => o.status === 'selesai');
  const totalPendapatan = selesai.reduce((a,o) => a + o.total, 0);
  const belumSelesai = orders.length - selesai.length;
  el.innerHTML = `
  <div class="card"><div class="muted">Total pesanan masuk</div><h3>${orders.length}</h3></div>
  <div class="card"><div class="muted">Pesanan selesai</div><h3>${selesai.length}</h3></div>
  <div class="card"><div class="muted">Sedang berjalan</div><h3>${belumSelesai}</h3></div>
  <div class="card"><div class="muted">Pendapatan (pesanan selesai)</div><h3>${rupiah(totalPendapatan)}</h3></div>
  `;
}
