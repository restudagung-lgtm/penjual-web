/*
  app.js (web penjual)
  --------------------
  Karena web ini berdiri sendiri, tidak ada halaman pilih peran lagi —
  langsung ke login/daftar, atau ke dashboard kalau sudah pernah login di HP ini.
  Harus dimuat PALING TERAKHIR di index.html.
*/

let state = {
  view: 'seller-auth',
  seller: { username: null, storeId: null, storeName: null },
  sellerTab: 'menu',
  mapOpenFor: null,
};

function go(view, extra){
  state.view = view;
  Object.assign(state, extra || {});
  render();
}

function render(){
  if(state.view === 'seller-auth') renderSellerAuth();
  else if(state.view === 'seller-dash') renderSellerDash();
  mountIcons();
}

/* ---------- nyalakan aplikasi ---------- */
(async function init(){
  const savedSession = await sGet('session', false);
  if(savedSession){
    const acc = await sGet('seller:' + savedSession, true);
    if(acc){
      state.seller = {username: savedSession, storeId: acc.storeId, storeName: acc.storeName};
      go('seller-dash', {sellerTab:'menu'});
      return;
    }
  }
  go('seller-auth');
})();

