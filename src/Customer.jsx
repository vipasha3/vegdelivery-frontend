import axios from 'axios'
import React, { useState, useEffect } from 'react';
const API = 'https://vegdelivery-backend-production.up.railway.app'


export default function Customer() {
  const [lang, setLang] = useState('FR');
  const [activeTab, setActiveTab] = useState('Home');
  const [searchQuery, setSearchQuery] = useState(''); 
  const [cart, setCart] = useState({}); 
  const [paymentMethod, setPaymentMethod] = useState('COD'); 
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  useEffect(() => {
    axios.get(`${API}/api/products`)
      .then(res => {
        const active = (res.data.data || []).map(p => ({
          id: p.id,
          name_en: p.name_en,
          name_fr: p.name_fr,
          price: p.price_gnf,
          img: p.image_url || '',
          status: p.is_active

        }))
        setProducts(active)
      })
      .catch(err => console.log('API error:', err));
    
    fetchOrders();
  }, []);

  
  const fetchOrders = async () => {
    setIsLoading(true); // લોડિંગ શરૂ
    try {
      const res = await axios.get(`${API}/api/orders`);
      setOrders(res.data.data || res.data || []);
    } catch (err) {
      console.log('Error fetching orders:', err);
    } finally {
      setIsLoading(false); // લોડિંગ પૂરું
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed': return 'bg-blue-100 text-blue-700';
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-rose-100 text-rose-700';
      default: return 'bg-yellow-100 text-yellow-700';
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.reload();
  };

  const t = {
    FR: { 
      title: 'GUINÉE VERTS', 
      market: 'BIOMARCHÉ DYNAMIQUE', 
      search: 'Rechercher des légumes...', 
      add: 'Ajouter au panier', 
      empty: 'Votre panier est vide', 
      total: 'Montant Total', 
      placeOrder: 'PASSER LA COMMANDE', 
      history: 'HISTORIQUE DES COMMANDES', 
      profile: 'MON PROFIL', 
      orderNo: 'Commande', 
      statusPending: 'En attente', 
      successAlert: 'Commande passée avec succès !',
      tabHome: 'Accueil',
      tabCart: 'Mon Panier',
      tabOrders: 'Commandes',
      tabProfile: 'Profil',
      cartTitle: 'MON PANIER',
      profileTitle: 'MON PROFIL',
      guestUser: 'Client Invité',
      langSettings: 'Paramètres de langue',
      logout: 'Se déconnecter',
      langBtnFr: 'Français',
      langBtnEn: 'English',
      unit: ' kg',
      payTitle: 'MODE DE PAIEMENT',
      payCod: 'Espèces à la livraison',
      payMobile: 'Mobile Money / Orange'
    },
    EN: { 
      title: 'GUINEA GREENS', 
      market: 'DYNAMIC BIOMARKET', 
      search: 'Search vegetables...', 
      add: 'Add to Cart', 
      empty: 'Your cart is empty', 
      total: 'Total Amount', 
      placeOrder: 'PLACE ORDER', 
      history: 'ORDER HISTORY', 
      profile: 'MY PROFILE', 
      orderNo: 'Order', 
      statusPending: 'Pending', 
      successAlert: 'Order placed successfully!',
      tabHome: 'Home',
      tabCart: 'My Cart',
      tabOrders: 'Orders',
      tabProfile: 'Profile',
      cartTitle: 'MY CART',
      profileTitle: 'MY PROFILE',
      guestUser: 'Guest Customer',
      langSettings: 'Language Settings',
      logout: 'Logout',
      langBtnFr: 'FR',
      langBtnEn: 'EN',
      unit: 'kg',
      payTitle: 'PAYMENT METHOD',
      payCod: 'Cash on Delivery (COD)',
      payMobile: 'Mobile Money / Orange'
    }
  };

  const formatCurrency = (amount) => {
    return lang === 'FR' ? amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FG' : amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' GNF';
  };

  const handleQtyChange = (id, delta) => {
    setCart(prev => {
      const currentQty = prev[id] || 0;
      const newQty = currentQty + delta;
      if (newQty <= 0) {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      }
      return { ...prev, [id]: newQty };
    });
  };

  const removeItemFromCart = (id) => {
    setCart(prev => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  const calculateItemTotal = (id, price) => (cart[id] || 0) * price;
  const calculateGrandTotal = () => {
    return products.reduce((sum, p) => sum + (cart[p.id] ? calculateItemTotal(p.id, p.price) : 0), 0);
  };
  

  const handlePlaceOrder = async () => {
    if (Object.keys(cart).length === 0) return;

    const orderedItems = Object.keys(cart).map(id => {
      const p = products.find(item => item.id === id);
      return {
        product_id: id,
        name: lang === 'FR' ? (p?.name_fr || 'N/A') : (p?.name_en || 'N/A'),
        qty: cart[id]
      };
    });

    const newOrder = { items: orderedItems, total: calculateGrandTotal(), payment_method: paymentMethod, status: 'Pending' };
    try {
      await axios.post(`${API}/api/orders`, newOrder);
      alert(t[lang].successAlert);
      setCart({});
      await fetchOrders();
      setActiveTab('Orders');
    } catch (err) {
      console.error('Error placing order:', err);
      alert('Failed to place order.');
    }
  };

  const filteredProducts = products.filter(p => {
    const productName = lang === 'FR' ? p.name_fr : p.name_en;
    return productName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
  <div className="flex justify-center min-h-[100dvh] bg-slate-100 font-sans antialiased">
    <div className="w-full max-w-[480px] h-[100dvh] bg-[#f8fafc] flex flex-col overflow-hidden relative shadow-lg">
        
        {/* Header */}
        <div className="bg-[#008751] text-white p-5 pt-8 shrink-0 z-30 relative pointer-events-auto">
          <div className="flex justify-between items-center mb-4 relative z-30">
            <span className="text-[13px] font-extrabold tracking-wider">{t[lang].title}</span>
            <div className="flex bg-white/15 rounded-lg p-0.5 text-[10px] font-bold backdrop-blur-sm pointer-events-auto">
              <button onClick={() => setLang('FR')} className={`px-2.5 py-1 rounded-md cursor-pointer relative z-40 block transition-all duration-200 ${lang === 'FR' ? 'bg-white text-[#008751] shadow-sm' : 'text-white/90'}`}>{t[lang].langBtnFr}</button>
              <button onClick={() => setLang('EN')} className={`px-2.5 py-1 rounded-md cursor-pointer relative z-40 block transition-all duration-200 ${lang === 'EN' ? 'bg-white text-[#008751] shadow-sm' : 'text-white/90'}`}>{t[lang].langBtnEn}</button>
            </div>
          </div>
          
          {activeTab === 'Home' && (
            <div className="relative w-full flex items-center z-30 pointer-events-auto">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t[lang].search} 
                className="w-full bg-white text-slate-800 placeholder-slate-400 rounded-xl py-2 pl-4 pr-10 text-xs font-medium outline-none shadow-[0_4px_12px_rgba(0,0,0,0.05)] min-h-[38px] relative z-50 cursor-text pointer-events-auto block"
              />
              <div className="absolute right-3 text-slate-400 text-xs z-50 pointer-events-none">🔍</div>
            </div>
          )}
        </div>

        {/* Scrollable Content View */}
        <div className="flex-1 overflow-y-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden relative z-10 pointer-events-auto">
          
          {activeTab === 'Home' && (
            <div className="relative z-10 pointer-events-auto">
              <h2 className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-3.5 pl-0.5">{t[lang].market}</h2>
              <div className="grid grid-cols-2 gap-3 w-full">
                {filteredProducts.map(p => {
                  const currentQty = cart[p.id] || 0;
                  return (
                    <div key={p.id} className="bg-white rounded-2xl p-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between relative z-10 pointer-events-auto">
                      <div className="w-full h-28 rounded-xl mb-2.5 bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center text-5xl">{p.name_fr.toLowerCase().includes("tomat") ? "🍅" : p.name_fr.toLowerCase().includes("carot") ? "🥕" : p.name_fr.toLowerCase().includes("oignon") ? "🧅" : "🥬"}</div>
                      <div className="px-0.5 mb-2.5">
                        <p className="text-[13px] font-semibold text-slate-800 tracking-tight leading-tight truncate">{lang === 'FR' ? p.name_fr : p.name_en}</p>
                        <p className="text-[11px] text-emerald-600 font-bold mt-0.5">{formatCurrency(p.price)} / {t[lang].unit.trim()}</p>
                      </div>
                      
                      {currentQty === 0 ? (
                        <button 
                          onClick={() => handleQtyChange(p.id, 0.5)}
                          className="w-full bg-[#eefbf6] text-[#008751] py-2 rounded-xl text-[11px] font-bold cursor-pointer relative z-30 block min-h-[36px] transition-all duration-200 active:scale-95 text-center"
                        >
                          + {t[lang].add}
                        </button>
                      ) : (
                        <div className="flex justify-between items-center bg-[#eefbf6] rounded-xl p-1 text-[11px] w-full min-h-[36px] relative z-20 pointer-events-auto">
                          <button 
                            onClick={() => handleQtyChange(p.id, -0.5)} 
                            className="w-7 h-7 bg-white rounded-lg flex items-center justify-center font-bold shadow-sm cursor-pointer relative z-30 text-slate-700"
                          >
                            -
                          </button>
                          <span className="font-bold text-slate-800 px-0.5">{currentQty} {t[lang].unit.trim()}</span>
                          <button 
                            onClick={() => handleQtyChange(p.id, 0.5)} 
                            className="w-7 h-7 bg-[#008751] text-white rounded-lg flex items-center justify-center font-bold shadow-sm cursor-pointer relative z-30"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'My Cart' && (
            <div className="flex flex-col h-full justify-between relative z-10 pointer-events-auto">
              <div>
                <h2 className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-4 pl-0.5">{t[lang].cartTitle}</h2>
                {Object.keys(cart).length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-12">{t[lang].empty}</p>
                ) : (
                  <div className="space-y-2.5 pointer-events-auto">
                    {Object.keys(cart).map(prodId => {
                      const p = products.find(item => item.id === prodId);
                      const qty = cart[prodId];
                      if (!p) return null;
                      return (
                        <div key={prodId} className="bg-white p-3 rounded-xl shadow-sm flex justify-between items-center relative z-10">
                          <div className="flex-1 pr-2">
                            <p className="text-xs font-semibold text-slate-800">{lang === 'FR' ? p.name_fr : p.name_en}</p>
                            <p className="text-[11px] text-emerald-600 font-bold mt-0.5">{formatCurrency(calculateItemTotal(p.id, p.price))}</p>
                          </div>
                          <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl relative z-20">
                            <button onClick={() => handleQtyChange(p.id, -0.5)} className="w-5 h-5 bg-white text-slate-600 rounded-md flex items-center justify-center text-xs font-bold cursor-pointer shadow-sm">-</button>
                            <span className="text-[10px] font-bold text-slate-800 min-w-[36px] text-center">{qty}{t[lang].unit}</span>
                            <button onClick={() => handleQtyChange(p.id, 0.5)} className="w-5 h-5 bg-[#008751] text-white rounded-md flex items-center justify-center text-xs font-bold cursor-pointer shadow-sm">+</button>
                            <button 
                              onClick={() => removeItemFromCart(p.id)} 
                              className="ml-1 text-[9px] text-rose-500 bg-rose-50 w-5 h-5 rounded-md font-bold flex items-center justify-center cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {Object.keys(cart).length > 0 && (
                <div className="pt-4 mt-4 pointer-events-auto">
                  <div className="mb-4 bg-white p-3 rounded-xl shadow-sm">
                    <h3 className="text-[9px] font-bold text-slate-400 tracking-wider mb-2">{t[lang].payTitle}</h3>
                    <div className="space-y-1.5">
                      <button 
                        onClick={() => setPaymentMethod('COD')}
                        className={`w-full text-left p-2.5 rounded-lg text-xs font-bold cursor-pointer flex items-center justify-between ${paymentMethod === 'COD' ? 'bg-emerald-50 text-[#008751]' : 'bg-slate-50 text-slate-600'}`}
                      >
                        <span>💵 {t[lang].payCod}</span>
                        {paymentMethod === 'COD' && <span className="text-xs">✓</span>}
                      </button>
                      
                      <button 
                        onClick={() => setPaymentMethod('MOBILE')}
                        className={`w-full text-left p-2.5 rounded-lg text-xs font-bold cursor-pointer flex items-center justify-between ${paymentMethod === 'MOBILE' ? 'bg-emerald-50 text-[#008751]' : 'bg-slate-50 text-slate-600'}`}
                      >
                        <span>📱 {t[lang].payMobile}</span>
                        {paymentMethod === 'MOBILE' && <span className="text-xs">✓</span>}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-4 px-1">
                    <span>{t[lang].total}</span>

                    <span className="text-emerald-600 text-df font-extrabold">{formatCurrency(calculateGrandTotal())}</span>
=======
                    <span className="text-emerald-600 text-xs font-extrabold">{formatCurrency(calculateGrandTotal())}</span>
                  </div>
                  <button onClick={handlePlaceOrder} className="w-full bg-[#008751] text-white py-3 rounded-xl font-bold text-[12px] tracking-wider cursor-pointer shadow-md block text-center active:scale-[0.98]">
                    {t[lang].placeOrder}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'Orders' && (

            <div className="space-y-3 relative z-10 pointer-events-auto">
              <h2 className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-4 pl-0.5">{t[lang].history}</h2>
              {orders.map(order => (
                <div key={order.id} className="bg-white p-3.5 rounded-xl shadow-sm">
                  <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-50">
                    <span className="text-[11px] font-bold text-slate-800">{t[lang].orderNo} #{order.id}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${order.color}`}>
                      {lang === 'FR' ? order.status_fr : order.status_en}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                    <span>{lang === 'FR' ? order.date_fr : order.date_en}</span>
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-bold text-[9px]">
                      {order.payMethod === 'COD' ? '💵 COD' : '📱 Mobile'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium mt-1 leading-tight">{lang === 'FR' ? order.items_fr : order.items_en}</p>
                  <p className="text-xs font-bold text-slate-800 mt-2 text-right">{formatCurrency(order.total)}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'Profile' && (
            
            <div className="space-y-4 relative z-10 pointer-events-auto">
              <h2 className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-3 pl-0.5">{t[lang].profileTitle}</h2>
              <div className="bg-white p-5 rounded-2xl shadow-sm text-center">
                <div className="w-14 h-14 bg-emerald-50 text-[#008751] font-bold rounded-full flex items-center justify-center text-lg mx-auto mb-3">GG</div>
                <h3 className="text-xs font-bold">{t[lang].guestUser}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">+224 622 00 00 00</p>
                <div className="mt-5 pt-3 border-t border-slate-50 flex flex-col gap-2 relative z-20">
                  <button className="w-full bg-slate-50 text-slate-600 font-semibold py-2 rounded-xl text-[11px] cursor-pointer block">
                    {t[lang].langSettings}
                  </button>

                  <button 
                    onClick={handleLogout} 
                    className="w-full bg-rose-50 text-rose-600 font-semibold py-2 rounded-xl text-[11px] cursor-pointer block"
                  >          
                    {t[lang].logout}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        
        <div className="h-16 bg-white flex justify-around items-center shrink-0 shadow-[0_-8px_30px_rgba(0,0,0,0.03)] pb-1 z-30 relative pointer-events-auto">
          {[
            { id: 'Home', icon: '🏠', labelKey: 'tabHome' },
            { id: 'My Cart', icon: '🛒', labelKey: 'tabCart' },
            { id: 'Orders', icon: '📦', labelKey: 'tabOrders' },
            { id: 'Profile', icon: '👤', labelKey: 'tabProfile' }
          ].map(tab => {
            const isSelected = activeTab === tab.id;
            return (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id)} 
                className={`flex flex-col items-center gap-0.5 min-w-[65px] cursor-pointer relative z-40 block transition-all duration-200 ${isSelected ? 'text-[#008751] scale-105' : 'text-slate-400'}`}
              >
                <span className="text-base">{tab.icon}</span>
                <span className={`text-[9px] tracking-wide truncate max-w-full ${isSelected ? 'font-bold' : 'font-medium'}`}>
                  {t[lang][tab.labelKey]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
