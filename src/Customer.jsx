import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; 


export default function Customer() {
  const [lang, setLang] = useState(() => {
    // ૧. પહેલા localStorage ચેક કરો
    const savedLang = localStorage.getItem('preferred_lang');
    if (savedLang) return savedLang;
    const browserLang = navigator.language.split('-')[0];
    return (browserLang === 'fr' ? 'FR' : browserLang === 'zh' ? 'ZH' : 'EN');
  });

  const [userProfile, setUserProfile] = useState(() => {
    const saved = localStorage.getItem('customer_profile');
    return saved ? JSON.parse(saved) : { name: 'Guest Customer', phone: '', address: ''};
  });
  const [usageCount, setUsageCount] = useState(0);
  const [offers, setOffers] = useState([]); // આ લાઈન ઉમેરવી ખૂબ જરૂરી છે  
  const [activeTab, setActiveTab] = useState('Home');
  const [searchQuery, setSearchQuery] = useState(''); 
  const [cart, setCart] = useState({}); 
  const [paymentMethod, setPaymentMethod] = useState('COD'); 
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [profile, setProfile] = useState({ 
    name: '', 
    phone: '', 
    zone: '', 
    address: '', 
    landmark: '' 
  });
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [settings, setSettings] = useState({ minOrder: 0, fee: 0, welcome_offer_limit: 1 });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [couponCode, setCouponCode] = useState(""); // યુઝર જે કોડ ટાઈપ કરશે
  const [appliedCoupon, setAppliedCoupon] = useState(null); // જો કૂપન વેલિડ હશે તો અહીં સેવ થશે
  const [tempProfile, setTempProfile] = useState(userProfile); // Edit કરવા માટે
  const [orderDetails, setOrderDetails] = useState({ zone: '', address: '', landmark: '', instructions: '' });
  const [isNewUser, setIsNewUser] = useState(true);
  const [limit, setLimit] = useState(1);

  useEffect(() => {
    localStorage.setItem('preferred_lang', lang);
  }, [lang]);
  
  
  useEffect(() => {
    const savedProfile = localStorage.getItem('customer_profile');
    if (!savedProfile) {
      setIsLoggedIn(false);
    } else {
      setIsLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    const savedData = localStorage.getItem('customer_profile');
    if (savedData) {
      setProfile(JSON.parse(savedData));
      setIsLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    const checkUsage = async () => {
      if (userProfile?.phone) {
        const { count } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('om_phone', userProfile.phone)
          .eq('coupon_type', 'welcome');

        setUsageCount(count || 0);
      }
    };
    checkUsage();
  }, [userProfile, activeTab]);
  
  useEffect(() => {
  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('welcome_offer_limit')
        .maybeSingle();
      
      if (data) {
        setLimit(data.welcome_offer_limit);
        console.log("Settings updated successfully");
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    }
  };
  fetchSettings();
}, []);

useEffect(() => {
  const savedData = localStorage.getItem('customer_profile');
  if (savedData) {
    setUserProfile(JSON.parse(savedData));
  }
}, [showProfileModal]); // જ્યારે મોડલ બંધ થાય, ત્યારે આ ફરીથી ચેક કરશે

  // હોમ પેજની અંદર
  useEffect(() => {
    // `userProfile` ની અંદરનું એડ્રેસ ચેક કરો, માત્ર આખું ઓબ્જેક્ટ નહીં
    if (!userProfile?.address) {
      setShowLocationModal(true);
    }
  }, [userProfile?.address]); // [userProfile] ને બદલે [userProfile?.address] વાપરો

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // 1. Categories, Products, Settings (બધું એકસાથે)
        const [
          { data: cats },
          { data: prods },
          { data: settingsData },
          { data: offersData } // કૂપન્સ પણ અહીંથી જ લાવો
        ] = await Promise.all([
          supabase.from('categories').select('*'),
          supabase.from('products').select('*').eq('is_active', true),
          supabase.from('settings').select('*'),
          supabase.from('coupons').select('*').eq('status', 'Active')
        ]);

        if (cats) setCategories(cats);
        if (prods) setProducts(prods);
        if (offersData) setOffers(offersData);

        let limitValue = 1; // Default value

        if (settingsData) {
          const min = settingsData.find(s => s.key === 'min_order')?.value || 0;
          const fee = settingsData.find(s => s.key === 'delivery_fee')?.value || 0;
          const limitSetting = settingsData.find(s => s.key === 'max_orders_for_offer')?.value;
          const isOfferActive = settingsData.find(s => s.key === 'offer_active')?.value === 'true';

          limitValue = limitSetting ? Number(limitSetting) : 1;
          
          setSettings({ 
            minOrder: Number(min), 
            fee: Number(fee), 
            welcome_offer_limit: limitValue,
            isOfferActive: isOfferActive // અહીં અપડેટ કર્યું
          });
          setLimit(limitValue); // ડાયરેક્ટ લિમિટ સેટ કરો
          console.log("Settings Updated - Limit set to:", limitValue);
        }

        // 2. Orders fetch & usageCount
        if (profile.phone) {
          const { data: ords } = await supabase
            .from('orders')
            .select('*')
            .eq('om_phone', profile.phone);
          
          if (ords) {
            setOrders(ords);
            console.log("તમામ ઓર્ડર્સની વિગતો:", ords);
            const welcomeUsageCount = ords.filter(o => o.coupon_type && o.coupon_type.toLowerCase() === 'welcome').length;
            console.log("Total Orders:", ords.length);
            console.log("Full Settings Data from DB:", settingsData);
            
            console.log("Limit from settings:", limitValue);
            setUsageCount(welcomeUsageCount);
            console.log("Calculated Welcome Usage:", welcomeUsageCount);
            setIsNewUser(ords.length === 0); // નવો યુઝર ચેક
          }
        }
      } catch (err) {
        console.error("Error:", err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Realtime channel
    const channel = supabase
      .channel('realtime-data')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coupons' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile.phone, lang]);
  
  const fetchOrders = async () => {
    if (!profile.phone) return; // Jo login nathi to order na lavo
    setIsLoading(true);
    const { data, error } = await supabase.from('orders').select('*').eq('om_phone', profile.phone); 

    if (!error) {
      setOrders(data || []);
    } else {
      console.error("Error fetching orders:", error);
    }
    setIsLoading(false);
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
      welcome: 'Bienvenue', 
      name: 'Entrez votre nom', 
      phone: 'Entrez votre numéro', 
      signin: 'Connexion',
      editProfile: "Modifier le profil",
      contact: "Contactez-nous sur WhatsApp",
      total: "Total",
      pending: "En attente",
      delivered: "Livré",
      langSettings: "PARAMÈTRES DE LANGUE",
      title: 'GUINÉE VERTS', 
      market: 'BIOMARCHÉ DYNAMIQUE', 
      search: 'Rechercher des légumes...', 
      add: 'Ajouter au panier', 
      empty: 'Votre panier est vide', 
      address: "ADRESSE",
      edit: "Modifier",
      delivery: "Livraison",
      free: "GRATUIT",
      moreForFree: "de plus pour la livraison GRATUITE !",
      subtotal: "Sous-total",
      total: 'Montant Total', 
      placeOrder: 'PASSER LA COMMANDE', 
      history: 'HISTORIQUE DES COMMANDES', 
      profile: 'MON PROFIL', 
      orderNo: 'Commande', 
      statusPending: 'En attente', 
      successAlert: 'Commande passée avec succès !',
      tabHome: 'Accueil',
      noItems: 'Aucun détail d\'article',
      unlockedFree: "Vous avez débloqué la livraison GRATUITE !",
      tabCart: 'Mon Panier',
      tabOrders: 'Commandes',
      tabProfile: 'Profil',
      emptyCartAlert: 'Votre panier est vide ou le total est 0.',
      cartTitle: 'MON PANIER',
      profileTitle: 'MON PROFIL',
      guestUser: 'Client Invité',
      langSettings: 'Paramètres de langue',
      logout: 'Se déconnecter',
      langBtnFr: 'Français',
      langBtnEn: 'English',
      noOrders: "Aucune commande trouvée.",
      unit: ' kg',
      hello: "Bonjour,",
      payTitle: 'MODE DE PAIEMENT',
      payCod: 'Espèces à la livraison',
      payMobile: 'Mobile Money / Orange'
    },
    EN: { 
      welcome: 'Welcome',
      name: 'Enter your name',
      phone: 'Enter your phone number', 
      signin: 'Sign In',
      hello: "Hello,",
      editProfile: "Edit Profile",
      contact: "Contact Us on WhatsApp",
      total: "Total",
      pending: "Pending",
      delivered: "Delivered",
      noOrders: "No orders found.",
      unlockedFree: "You've unlocked FREE delivery!",
      address: "ADDRESS",
      edit: "Edit",
      delivery: "Delivery",
      free: "FREE",
      moreForFree: "more for FREE delivery!",
      subtotal: "Subtotal",
      langSettings: "LANGUAGE SETTINGS",
      title: 'GUINEA GREENS', 
      market: 'DYNAMIC BIOMARKET', 
      search: 'Search vegetables...', 
      add: 'Add to Cart', 
      empty: 'Your cart is empty', 
      total: 'Total Amount', 
      placeOrder: 'PLACE ORDER', 
      history: 'ORDER HISTORY', 
      noItems: 'No items details',
      profile: 'MY PROFILE', 
      orderNo: 'Order',
      emptyCartAlert: 'Cart is empty or total is 0. Please add items.', 
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
    },
    ZH: { 
      welcome: '欢迎', 
      name: '请输入您的姓名', 
      phone: '请输入您的电话', 
      signin: '登录',
      editProfile: "编辑个人资料",   
      contact: "通过WhatsApp联系我们",
      noOrders: "未找到订单。",
      total: "总计",
      pending: "待处理",
      unlockedFree: "您已解锁免费配送！",
      address: "地址",
      edit: "编辑",
      delivery: "配送费",
      free: "免费",
      moreForFree: "即可享受免费配送！",
      subtotal: "小计",
      delivered: "已送达",
      langSettings: "语言设置",
      title: '几内亚绿色', 
      market: '动态生物市场', 
      search: '搜索蔬菜...', 
      add: '加入购物车', 
      empty: '您的购物车是空的', 
      total: '总金额', 
      placeOrder: '下单', 
      history: '订单历史', 
      profile: '我的资料', 
      orderNo: '订单', 
      statusPending: '待处理', 
      successAlert: '订单已成功提交！',
      tabHome: '首页',
      noItems: '无物品详情',
      tabCart: '我的购物车',
      tabOrders: '订单',
      hello: "你好,",
      tabProfile: '资料',
      emptyCartAlert: '购物车为空或总金额为0。请添加商品。', 
      cartTitle: '我的购物车',
      profileTitle: '我的资料',
      guestUser: '访客',
      langSettings: '语言设置',
      logout: '登出',
      langBtnFr: '法文',
      langBtnEn: '英文',
      langBtnZh: '中文', // આ બટન માટે
      unit: ' 公斤',
      payTitle: '付款方式',
      payCod: '货到付款',
      payMobile: '移动支付 / Orange'
    }
  };

  

  const getGreeting = () => {
    const hour = new Date().getHours();
    // ભાષા પ્રમાણે ગ્રીટિંગ્સ
    if (lang === 'FR') {
      if (hour < 12) return 'Bonjour';
      if (hour < 18) return 'Bon après-midi';
      return 'Bonsoir';
    } else if (lang === 'ZH') {
      if (hour < 12) return '早上好';
      if (hour < 18) return '下午好';
      return '晚上好';
    } else {
      if (hour < 12) return 'Good Morning';
      if (hour < 18) return 'Good Afternoon';
      return 'Good Evening';
    }
  };

  const formatCurrency = (amount) => {
    // ૧. પહેલા કિંમતને નંબર બનાવો
    const val = Number(amount);
    
    // ૨. જો વેલ્યુ નંબર ન હોય તો 0 ગણો
    const price = isNaN(val) ? 0 : val;
    
    // ૩. ફોર્મેટિંગ કરો
    return lang === 'FR' 
      ? price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FG' 
      : price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' GNF';
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
      return { ...prev, [id]: Math.max(1, newQty) };
    });
  };

  const removeItemFromCart = (id) => {
    setCart(prev => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  const calculateSubTotal = () => {
    if (!products || products.length === 0) return 0;
    return Object.keys(cart).reduce((acc, id) => {
      const p = products.find(item => item.id === id);
      return acc + (p ? p.price_gnf * cart[id] : 0);
    }, 0);
  };

  const calculateItemTotal = (id, price) => (cart[id] || 0) * price;
  const calculateGrandTotal = () => {
    if (!products || products.length === 0) return 0;
    
    return products.reduce((sum, p) => {
      
      const qty = cart[p.id] || 0;

      const price = parseFloat(p.price_gnf || p.price) || 0;      
      return sum + (qty * price);
    }, 0);
  };

  const calculateFinalTotal = () => {
    if (!settings) return calculateSubTotal();
    
    const subTotal = calculateSubTotal(); // સાચું સબ-ટોટલ
    const minOrder = settings.minOrder || 0;
    const fee = settings.fee || 0;
    
    const delivery = subTotal < minOrder ? fee : 0;
    
    let total = subTotal + delivery;
    
    if (appliedCoupon) {
      const discountAmount = (subTotal * (appliedCoupon.discount_percent || 0)) / 100;
      total = total - discountAmount;
    }
    
    return Math.max(0, total); 
  };

  const handleApplyCoupon = async () => {
      // Helper function for translations
      const t = (en, fr, zh) => {
          if (lang === 'FR') return fr;
          if (lang === 'ZH') return zh;
          return en;
      };

      if (appliedCoupon) {
          alert(t("You have already applied a coupon. Please remove it to apply another one.", "Vous avez déjà appliqué un coupon. Veuillez le supprimer pour en appliquer un autre.", "您已经使用了优惠券。请先移除它以使用其他优惠券。"));
          return;
      }

      const userId = userProfile?.phone; 

      if (!userId || userId === 'No Phone' || userId === '') {
          alert(t("Please update your profile/login first!", "Veuillez d'abord mettre à jour votre profil/vous connecter !", "请先更新您的个人资料或登录！"));
          return;
      }

      if (!couponCode) {
          alert(t("Please enter a coupon code", "Veuillez entrer un code promo", "请输入优惠券代码"));
          return;
      }

      // ૧. કૂપન શોધો
      const { data: coupon, error } = await supabase
          .from('coupons')
          .select('*')
          .eq('code', couponCode)
          .eq('status', 'Active')
          .single();

      if (error || !coupon) {
          alert(t("Invalid or expired coupon!", "Coupon invalide ou expiré !", "优惠券无效或已过期！"));
          return;
      }

      const couponType = coupon.type || 'general';

      // ૨. કૂપનનો પ્રકાર 'welcome' હોય તો:
      if (couponType === 'welcome') {
          const { count: userUsageCount } = await supabase
              .from('orders')
              .select('id', { count: 'exact', head: true })
              .eq('om_phone', userId)
              .eq('coupon_code', couponCode);

          const { data: settings } = await supabase
              .from('settings')
              .select('welcome_offer_limit')
              .single();

          const limit = settings?.welcome_offer_limit || 5;

          if (userUsageCount >= limit) {
              alert(t("You have reached the maximum usage limit for this offer!", "Vous avez atteint la limite d'utilisation maximale pour cette offre !", "您已达到此优惠的使用上限！"));
              return;
          }
      
          if (usageCount >= (limit || 1)) {
              alert(t("You have already used this welcome offer!", "Vous avez déjà utilisé cette offre de bienvenue !", "您已经使用了此欢迎优惠！"));
              return;
          }
      }

      setAppliedCoupon({
          ...coupon,
          type: couponType
      });
      
      alert(t("Coupon applied successfully!", "Coupon appliqué avec succès !", "优惠券应用成功！"));
  };

  const handleRemoveCoupon = () => {
      setAppliedCoupon(null); // કૂપન કાઢી નાખો
      setCouponCode('');      // ઇનપુટ બોક્સ ખાલી કરો
      alert("Coupon removed successfully!");
  };

  const handlePlaceOrder = async () => {
      const savedProfile = JSON.parse(localStorage.getItem('customer_profile')) || {};

      if (!savedProfile.address) {
          alert("Please set your delivery address first!");
          return;
      }

      setIsLoading(true);

      try {
          // ૧. ઓર્ડર આઈટમ્સ તૈયાર કરો
          const orderedItems = Object.keys(cart).map(id => {
              const p = products.find(item => item.id === id);
              if (!p) return null;
              return { 
                  product_id: id, 
                  quantity: cart[id], 
                  unit_price_gnf: p.price_gnf || p.price 
              };
          }).filter(item => item !== null);

          if (orderedItems.length === 0) throw new Error("Cart is empty");

          // ૨. સ્ટોક ચેક અને ઘટાડો (એક સાથે કરી શકાય છે)
          for (const item of orderedItems) {
              const { data: prod, error: prodError } = await supabase
                  .from('products')
                  .select('stock, name_en')
                  .eq('id', item.product_id)
                  .single();

              if (prodError || !prod) throw new Error("Product not found");
              if (prod.stock < item.quantity) throw new Error(`Insufficient stock for ${prod.name_en}.`);

              const newStock = prod.stock - item.quantity;
              const { error: updateError } = await supabase
                  .from('products')
                  .update({ stock: newStock, is_active: newStock > 0 })
                  .eq('id', item.product_id);
              
              if (updateError) throw updateError;
          }

          // ૩. કેલ્ક્યુલેશન (settings ને ડિફોલ્ટ વેલ્યુ આપી જેથી એરર ન આવે)
          const subTotal = calculateSubTotal();
          const minOrder = settings?.minOrder || 0;
          const fee = settings?.fee || 0;
          const deliveryFee = subTotal < minOrder ? fee : 0;
          const discount = appliedCoupon ? (subTotal * (appliedCoupon.discount_percent || 0) / 100) : 0;
          const finalTotal = calculateFinalTotal();

          // ૪. નવો ઓર્ડર ઓબ્જેક્ટ
          const newOrder = {
              items: JSON.stringify(orderedItems),
              total_gnf: finalTotal,
              coupon_code: appliedCoupon ? appliedCoupon.code : null,
              coupon_type: appliedCoupon?.type || null, // સીધું સેટ કર્યું
              status: 'PENDING',
              customer_name: savedProfile.name || 'Guest Customer',
              om_phone: savedProfile.phone || 'No Phone', 
              full_address: savedProfile.address,
              delivery_fee: deliveryFee,
              discount_amount: discount,
              discount_percent: appliedCoupon ? appliedCoupon.discount_percent : 0,
          };

          const { error: insertError } = await supabase.from('orders').insert([newOrder]);
          if (insertError) throw insertError;

          alert(t[lang].successAlert);
          setCart({});
          setCouponCode(""); 
          setAppliedCoupon(null);
          await fetchOrders();
          setActiveTab('Orders');
          
      } catch (err) {
          console.error("Order Error:", err);
          alert('Error: ' + err.message);
      } finally {
          setIsLoading(false);
      }
  };

  const filteredProducts = products.filter(p => {
  // ૧. કેટેગરી ફિલ્ટર (Category Filter)
    const matchesCategory = selectedCategory === 'All' || p.category_id == selectedCategory;

    // ૨. સર્ચ ફિલ્ટર (Search Filter)
    let productName = '';
    if (lang === 'FR') {
      productName = p.name_fr || '';
    } else if (lang === 'ZH') {
      productName = p.name_zh || '';
    } else {
      productName = p.name_en || '';
    }
    const matchesSearch = productName.toString().toLowerCase().includes(searchQuery.toLowerCase());

    // બંને શરતો સાચી હોવી જોઈએ
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <h1 className="text-2xl font-bold text-[#008751]">GUINÉE VERTS</h1>
      </div>
    );
  }

  return (
    <div className="flex justify-center min-h-[100dvh] bg-slate-100">
      {!isLoggedIn ? (
        // --- લોગિન પેજ ---
        <div className="flex flex-col justify-center items-center p-6 w-full max-w-[480px] h-screen">
          {/* --- આ રીતે ફેરફાર કરો --- */}
          <h1 className="text-2xl font-bold text-[#008751] mb-6">{t[lang].welcome}</h1>

          <input 
            placeholder={t[lang].name} 
            className="w-full p-3 mb-3 rounded-lg border border-slate-200 outline-none text-sm"
            onChange={(e) => setProfile({...profile, name: e.target.value})}
          />
          <input 
            placeholder={t[lang].phone} 
            className="w-full p-3 mb-4 rounded-lg border border-slate-200 outline-none text-sm"
            onChange={(e) => setProfile({...profile, phone: e.target.value})}
          />

          

          <div className="w-full mb-6">
            {/* ભાષા પસંદગીનું ટેક્સ્ટ પણ ડાયનેમિક કર્યું */}
            <p className="text-sm font-bold text-slate-600 mb-2">
              {lang === 'FR' ? 'Choisir la langue' : lang === 'ZH' ? '选择语言' : 'Select Language'}
            </p>
            <div className="flex gap-2">
              {['FR', 'EN', 'ZH'].map((l) => (
                <button 
                  key={l}
                  onClick={() => setLang(l)}
                  className={`flex-1 py-2 rounded-lg font-bold text-sm ${lang === l ? 'bg-[#008751] text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
                >
                  {l === 'FR' ? 'FR' : l === 'EN' ? 'EN' : '中'}
                </button>
              ))}
            </div>
          </div>
          {/* ------------------------------------------- */}
          
          <button 
            onClick={() => {
              if(profile.name && profile.phone) {
                localStorage.setItem('customer_profile', JSON.stringify(profile));
                localStorage.setItem('preferred_lang', lang);
                setUserProfile(profile);
                setIsLoggedIn(true);
              } else {
                alert(lang === 'FR' ? "Veuillez entrer le nom et le numéro" : lang === 'ZH' ? "请输入姓名和电话" : "Please enter both name and phone number");
              }
            }}
            className="bg-[#008751] text-white py-3 px-6 rounded-lg w-full font-bold shadow-lg active:scale-95 transition-transform"
          >
            {t[lang].signin}
          </button>
        </div>
      ) : (
        // --- મુખ્ય એપ (Main App) ---
        <div className="w-full max-w-[480px] h-[100dvh] bg-[#f8fafc] flex flex-col overflow-hidden relative shadow-lg">

        
        {/* Header */}
        <div className="bg-[#008751] text-white p-5 pt-8 shrink-0 z-30 relative pointer-events-auto">
          <div className="flex justify-between items-start mb-4 relative z-30">
            <div className="flex flex-col">
              <h1 className="text-[14px] font-extrabold tracking-wider">{t[lang].title}</h1>
              <p className="text-[10px] opacity-80 font-medium mt-0.5">{getGreeting()}</p>
            </div>
            
            <div className="text-right">
              <p className="text-[9px] opacity-70">{t[lang].hello}</p>
              <p className="text-[11px] font-bold truncate max-w-[100px]">
                {userProfile.name || 'Guest'}
              </p>
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
              
              {/* Offers Section */}
              {offers && offers.length > 0 && (
                <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-4 rounded-2xl mb-4 text-white shadow-lg">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-90 mb-1">
                    🔥 {lang === 'FR' ? 'Offre Spéciale' : lang === 'ZH' ? '特别优惠' : 'Special Offer'}
                  </p>
                  {/* Home સેક્શનમાં આ બદલો */}
                  <div className="flex flex-col gap-1">
                    {offers.filter(off => off.type === 'welcome' ? usageCount < (limit || 1) : true)
                      .map((off) => (
                        <div key={off.id} className="flex justify-between items-center">
                          <span className="text-xs font-bold">
                            {/* અહીં નામ બતાવવા માટેનું લોજિક ઉમેરો */}
                            {lang === 'FR' ? off.name_fr : lang === 'ZH' ? off.name_zh : off.name_en} 
                            <span className="ml-2 font-normal opacity-80">({lang === 'FR' ? 'Code:' : lang === 'ZH' ? '代码:' : 'Code:'} {off.code})</span>
                            
                            {off.type === 'welcome' && limit !== null && (
                              <span className="text-emerald-100 ml-1 font-normal opacity-90">
                                {lang === 'FR' ? `(${Math.max(0, limit - usageCount)} restants)` : 
                                lang === 'ZH' ? `(剩余 ${Math.max(0, limit - usageCount)} 次)` : 
                                `(${Math.max(0, limit - usageCount)} uses left)`}
                              </span>
                            )}
                          </span>
                        </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Categories */}
              <div className="flex gap-2 overflow-x-auto pb-4 px-1">
                <button 
                  onClick={() => setSelectedCategory('All')}
                  className={`px-4 py-1 rounded-full text-xs font-bold ${selectedCategory === 'All' ? 'bg-[#008751] text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  {lang === 'FR' ? 'Tous' : lang === 'ZH' ? '全部' : 'All'}
                </button>
                
                {categories.map(cat => (
                  <button 
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap ${selectedCategory === cat.id ? 'bg-[#008751] text-white' : 'bg-gray-100 text-gray-600'}`}
                  >
                    {lang === 'FR' ? (cat.name_fr || cat.name_en) : 
                    lang === 'ZH' ? (cat.name_zh || cat.name_en) : 
                    cat.name_en}
                  </button>
                ))}
              </div>
              
              {/* Products Title */}
              <h2 className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-3.5 pl-0.5">{t[lang].market}</h2>
              
              {/* Product Grid */}
              <div className="grid grid-cols-2 gap-3 w-full">
                {products && products.length > 0 ? (
                  filteredProducts.map(p => {
                    const currentQty = cart[p.id] || 0;
                    return (
                      <div key={p.id} className="bg-white rounded-2xl p-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                        <div className="w-full h-28 rounded-xl mb-2.5 bg-gray-100 overflow-hidden relative">
                          <img 
                            src={p.image_url} 
                            alt={lang === 'FR' ? p.name_fr : lang === 'ZH' ? p.name_zh : p.name_en} 
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="px-0.5 mb-2.5">
                          <p className="text-[13px] font-semibold text-slate-800 truncate">
                            {lang === 'FR' ? (p.name_fr || p.name_en) : 
                            lang === 'ZH' ? (p.name_zh || p.name_en) : 
                            p.name_en}
                          </p>
                          <p className="text-[11px] text-emerald-600 font-bold mt-0.5">
                            {formatCurrency(p.price_gnf)} / {p.unit || 'kg'}
                          </p>
                        </div>
                        
                        {/* Button */}
                        {currentQty === 0 ? (
                          <button 
                            onClick={() => handleQtyChange(p.id, p.step || 0.5)}
                            className="w-full bg-[#eefbf6] text-[#008751] py-2 rounded-xl text-[11px] font-bold"
                          >
                            + {t[lang].add}
                          </button>
                        ) : (
                          <div className="flex justify-between items-center bg-[#eefbf6] rounded-xl p-1 text-[11px] w-full">
                            <button onClick={() => handleQtyChange(p.id, -(p.step || 0.5))} className="w-7 h-7 bg-white rounded-lg">-</button>
                            <span className="font-bold text-slate-800">{currentQty} {p.unit || 'kg'}</span>
                            <button onClick={() => handleQtyChange(p.id, p.step || 0.5)} className="w-7 h-7 bg-[#008751] text-white rounded-lg">+</button>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-2 text-center py-10 text-slate-400 text-xs">
                    {lang === 'FR' ? 'Aucun produit trouvé' : lang === 'ZH' ? '未找到产品' : 'No products found'}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'My Cart' && (
            <div className="flex flex-col h-full justify-between relative z-10 pointer-events-auto">
              <div className="flex-1 flex flex-col overflow-y-auto px-1">
                <h2 className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-4 pl-0.5">{t[lang].cartTitle}</h2>
                
        
                {/* ૧. ડાયનેમિક ઓફર સેક્શન (કાર્ટ માટે) */}
                {Object.keys(cart || {}).length > 0 && !appliedCoupon && offers && offers.length > 0 && (
                  <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg mb-4 shrink-0">
                    <p className="text-[9px] text-emerald-800 font-bold uppercase mb-2">
                      🔥 {lang === 'FR' ? 'Offres Disponibles' : lang === 'ZH' ? '可用优惠' : 'Available Offers'}
                    </p>
                    
                    {/* My Cart સેક્શનમાં આ બદલો */}
                    {offers.filter(off => off.type === 'welcome' ? usageCount < (limit || 1) : true)
                      .map((off) => (
                        <div key={off.id} className="mb-2">
                          <p className="text-[10px] text-emerald-600 font-bold">
                            ✨ {lang === 'FR' ? off.name_fr : lang === 'ZH' ? off.name_zh : off.name_en}
                            <span className="ml-2 bg-white px-1 rounded font-bold">({lang === 'FR' ? 'Code:' : lang === 'ZH' ? '代码:' : 'Code:'} {off.code})</span>
                            
                            {off.type === 'welcome' && limit !== null && (
                              <span className="ml-1 opacity-80">
                                {lang === 'FR' ? `(${Math.max(0, limit - usageCount)} restants)` : 
                                lang === 'ZH' ? `(剩余 ${Math.max(0, limit - usageCount)} 次)` : 
                                `(${Math.max(0, limit - usageCount)} uses left)`}
                              </span>
                            )}
                          </p>
                        </div>
                    ))}
                  </div>
                )}

                {Object.keys(cart || {}).length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-12">{t[lang].empty}</p>
                ) : (
                  <div className="space-y-2.5">
                    {Object.keys(cart).map(prodId => {
                      const p = products?.find(item => item.id === prodId);
                      const qty = cart[prodId];
                      if (!p) return null;
                      return (
                        <div key={prodId} className="bg-white p-3 rounded-xl shadow-sm flex justify-between items-center relative z-10">
                          <div className="flex-1 pr-2">
                            <p className="text-xs font-semibold text-slate-800">{lang === 'FR' ? p.name_fr : p.name_en}</p>
                            <p className="text-[11px] text-emerald-600 font-bold mt-0.5">{formatCurrency(calculateItemTotal(p.id, p.price_gnf))}</p>
                          </div>
                          <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl relative z-20">
                            <button onClick={() => handleQtyChange(p.id, -0.5)} className="w-5 h-5 bg-white text-slate-600 rounded-md flex items-center justify-center text-xs font-bold cursor-pointer shadow-sm">-</button>
                            <span className="text-[10px] font-bold text-slate-800 min-w-[36px] text-center">{qty}{t[lang].unit}</span>
                            <button onClick={() => handleQtyChange(p.id, 0.5)} className="w-5 h-5 bg-[#008751] text-white rounded-md flex items-center justify-center text-xs font-bold cursor-pointer shadow-sm">+</button>
                            <button onClick={() => removeItemFromCart(p.id)} className="ml-1 text-[9px] text-rose-500 bg-rose-50 w-5 h-5 rounded-md font-bold flex items-center justify-center cursor-pointer">✕</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {Object.keys(cart || {}).length > 0 && (
                <div className="pt-4 mt-2 pointer-events-auto border-t border-gray-100 bg-white shrink-0">
                  
                  {/* Coupon Input Section */}
                  <div className="mb-3">
                    {appliedCoupon ? (
                      <div className="flex justify-between items-center bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                        <span className="text-[11px] font-bold text-emerald-800">
                          {lang === 'FR' ? 'Appliqué' : lang === 'ZH' ? '已应用' : 'Applied'}: {appliedCoupon.code}
                        </span>
                        <button 
                          onClick={() => {
                            setAppliedCoupon(null);
                            setCouponCode('');
                          }}
                          className="text-rose-500 font-bold text-[10px] bg-rose-50 px-2 py-1 rounded"
                        >
                          {lang === 'FR' ? 'SUPPRIMER' : lang === 'ZH' ? '移除' : 'REMOVE'} ✕
                        </button>
                      </div>
                    ) : (
                      // જો કૂપન એપ્લાય ન હોય, તો ઇનપુટ બોક્સ બતાવો
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder={lang === 'FR' ? 'Code promo' : lang === 'ZH' ? '优惠券代码' : 'Coupon Code'}
                          className="flex-1 text-[11px] px-3 py-2 border rounded-lg outline-none"
                          value={couponCode || ""} 
                          onChange={(e) => setCouponCode(e.target.value)}
                        />
                        <button onClick={handleApplyCoupon} className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold text-[10px]">
                          {lang === 'FR' ? 'Appliquer' : lang === 'ZH' ? '使用' : 'Apply'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Address Section */}
                  <div className="bg-gray-50 p-3 rounded-xl mb-3">
                    <div className="flex justify-between items-center">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{t[lang].address}</p>
                      <button onClick={() => { setShowLocationModal(true); setShowProfileModal(false); }} className="text-[#008751] font-bold text-[10px]">{t[lang].edit}</button>
                    </div>
                    <p className="text-[11px] font-bold text-slate-700 truncate">{userProfile?.address || t[lang].addAddress}</p>
                  </div>

                  {/* Shipping Status */}
                  {settings && typeof settings.minOrder !== 'undefined' && (
                    <div className={`text-[10px] px-2 py-1.5 rounded-lg mb-3 text-center font-bold border ${calculateSubTotal() < settings.minOrder ? "text-amber-600 bg-amber-50 border-amber-200" : "text-emerald-600 bg-emerald-50 border-emerald-200"}`}>
                      {calculateSubTotal() < settings.minOrder ? `${formatCurrency(settings.minOrder - calculateSubTotal())} ${t[lang].moreForFree}` : `${t[lang].unlockedFree || "Free Delivery"} 🎉`}
                    </div>
                  )}

                  {/* Total Section */}
                  <div className="flex justify-between items-center px-1 mb-3">
                    <div className="text-[11px] font-bold text-slate-500">
                      <p>{t[lang].subtotal}: {formatCurrency(calculateSubTotal())}</p>
                      {appliedCoupon?.discount_percent && (
                        <p className="text-emerald-600 font-bold text-[10px]">
                          {lang === 'FR' ? 'Remise' : lang === 'ZH' ? '折扣' : 'Discount'}: -{appliedCoupon.discount_percent}%
                        </p>
                      )}
                      <p className={calculateSubTotal() < (settings?.minOrder || 0) ? "text-rose-600" : "text-emerald-600"}>
                        {lang === 'FR' ? 'Livraison' : lang === 'ZH' ? '配送费' : 'Delivery'}: {calculateSubTotal() < (settings?.minOrder || 0) ? formatCurrency(settings?.fee || 0) : (lang === 'FR' ? 'Gratuit' : lang === 'ZH' ? '免费' : 'Free')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{t[lang].total}</p>
                      <p className="text-emerald-600 text-sm font-extrabold">
                        {formatCurrency(typeof calculateFinalTotal === 'function' ? calculateFinalTotal() : calculateSubTotal())}
                      </p>
                    </div>
                  </div>

                  <button onClick={handlePlaceOrder} className="w-full bg-[#008751] text-white py-3 rounded-xl font-bold text-[12px] shadow-md active:scale-[0.98] transition">
                    {t[lang].placeOrder}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'Orders' && (
            <div className="space-y-3 relative z-10 pointer-events-auto">
              <h2 className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-4 pl-0.5">{t[lang].history}</h2>
              
              {orders.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-10">{t[lang].noOrders}</p>
              ) : (
                [...orders]
                  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                  .map(order => {
                  let items = [];
                  try {
                    items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
                  } catch (e) {
                    console.error("Error parsing items:", e);
                  }

                  return (
                    <div key={order.id} className="bg-white p-3.5 rounded-xl shadow-sm border border-slate-100">
                      <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-50">
                        <span className="text-[11px] font-bold text-slate-800">
                          {t[lang].orderNo} #{order.id.slice(0, 8)}
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${order.status === 'DELIVERED' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          {t[lang][order.status?.toLowerCase()] || order.status}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(order.created_at).toLocaleString('fr-FR', {
                            timeZone: 'Africa/Conakry',
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          })}
                        </span>
                      </div>

                      <div className="mt-2 space-y-1">
                        {/* ૧. પહેલા ડેટા ચેક કરો કે તે અસ્તિત્વમાં છે કે નહીં */}
                        {order.items ? (
                          (() => {
                            // ૨. જો તે string હોય તો તેને array માં ફેરવો (parse), નહીંતર સીધો use કરો
                            const parsedItems = typeof order.items === 'string' 
                              ? JSON.parse(order.items) 
                              : order.items;

                            // ૩. હવે map ફંક્શન વાપરો
                            return parsedItems.map((item, idx) => {
                              const p = products.find(prod => prod.id === item.product_id);
                              const prodName = p ? (lang === 'FR' ? p.name_fr : p.name_en) : 'Product';
                              
                              return (
                                <div key={idx} className="flex justify-between text-[11px] text-slate-600">
                                  <span>{item.quantity}{t[lang].unit} - {prodName}</span>
                                  <span>{formatCurrency(item.quantity * (item.unit_price_gnf || 0))}</span>
                                </div>
                              );
                            });
                          })()
                        ) : (
                          /* ૪. જો order.items NULL હોય તો આ મેસેજ દેખાશે */
                          <p className="text-[11px] text-slate-500 italic">No items details</p>
                        )}
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-50 space-y-0.5">
                        {/* ડિલિવરી ફી */}
                        <div className="flex justify-between text-[10px] text-slate-500">
                          <span>{lang === 'FR' ? 'Frais de livraison' : lang === 'ZH' ? '配送费' : 'Delivery Fee'}</span>
                          <span>
                              {order.delivery_fee > 0 
                                ? formatCurrency(order.delivery_fee) 
                                : (lang === 'FR' ? 'Gratuit' : lang === 'ZH' ? '免费' : 'Free')
                              }
                            </span>
                        </div>

                        {/* ડિસ્કાઉન્ટ (જો હોય તો જ બતાવશે) */}
                        {order.discount_amount > 0 && (
                          <div className="flex justify-between text-[10px] text-rose-500">
                            <span>{lang === 'FR' ? 'Remise' : lang === 'ZH' ? '折扣' : 'Discount'}
                              {order.discount_percent ? ` (${order.discount_percent}%)` : ''}
                            </span>
                            <span>-{formatCurrency(order.discount_amount)}</span>
                          </div>
                        )}
                      </div>

                      <p className="text-xs font-extrabold text-emerald-600 mt-3 pt-2 border-t border-slate-50 text-right">
                        {t[lang].total}: {formatCurrency(
                          (() => {
                            // ૧. અહીં ચેક કરો કે તે string છે તો parse કરો
                            const parsedItems = typeof order.items === 'string' 
                              ? JSON.parse(order.items) 
                              : (order.items || []);

                            // ૨. હવે reduce વાપરો
                            const subTotal = parsedItems.reduce((sum, item) => sum + (item.quantity * (item.unit_price_gnf || 0)), 0);
                            
                            // ૩. ફાઈનલ ટોટલ ગણો
                            return subTotal + (order.delivery_fee || 0) - (order.discount_amount || 0);
                          })()
                        )}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'Profile' && (
            <div className="relative z-[100] w-full h-full pointer-events-auto">
              
              {/* 1. યુઝર કાર્ડ (નામ અને પ્રોફાઇલ ફોટો) */}
              {console.log("Current userProfile state:", userProfile)}
              <div className="bg-white p-5 rounded-2xl shadow-sm text-center relative z-[60]">
                <div className="w-16 h-16 bg-emerald-50 text-[#008751] font-bold rounded-full flex items-center justify-center text-xl mx-auto mb-3">
                  {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'G'}
                </div>
                <h3 className="text-sm font-bold">{userProfile.name || t[lang].guestUser}</h3>
                <p className="text-xs text-slate-400">{userProfile.phone || '+224 ...'}</p>
                
                {/* ૧. યુઝર કાર્ડ માં આ બટન બદલો */}
                <button 
                  onClick={() => {
                    console.log("Edit Button Clicked"); // આનાથી ચેક થશે કે બટન ક્લિક થાય છે કે નહીં
                    setTempProfile(userProfile); // આ ખૂબ જરૂરી છે, જેથી મોડલમાં જૂનો ડેટા દેખાય
                    setShowProfileModal(true); // મોડલ ખોલવા માટે
                  }}
                  className="mt-3 text-[#008751] font-bold text-xs bg-emerald-50 px-4 py-1.5 rounded-lg cursor-pointer pointer-events-auto relative z-[70]"
                >
                  {t[lang].editProfile}
                </button>
              </div>

              {/* 2. સેટિંગ્સ અને સપોર્ટ સેક્શન */}
              <div className="mt-6">
                <button 
                  onClick={() => {
                    const phoneNumber = "224620721028"; // અહિયાં તમારો વોટ્સએપ નંબર (Country code સાથે, જેમ કે 224...)
                    const message = "Hello, I need help with my order.";
                    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, "_blank");
                  }}
                  className="w-full flex items-center justify-center gap-3 py-3 rounded-xl font-bold text-white bg-[#25D366] shadow-md hover:bg-[#128C7E] transition-all"
                >
                  {/* અહીં તમે WhatsApp નો લોગો પણ મૂકી શકો છો */}
                  <span>{t[lang]?.contact || t.EN.contact}</span>
                </button>
              </div>

              {/* 3. ભાષા સેટિંગ */}
              <div className="bg-white p-5 rounded-2xl shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-3">{t[lang].langSettings}</p>
                <div className="flex gap-2 mb-4">
                  <button onClick={() => setLang('FR')} className={`flex-1 py-2 rounded-xl text-[11px] font-bold ${lang === 'FR' ? 'bg-[#008751] text-white' : 'bg-slate-50 text-slate-600'}`}>Français</button>
                  <button onClick={() => setLang('EN')} className={`flex-1 py-2 rounded-xl text-[11px] font-bold ${lang === 'EN' ? 'bg-[#008751] text-white' : 'bg-slate-50 text-slate-600'}`}>English</button>
                  <button onClick={() => setLang('ZH')} className={`flex-1 py-2 rounded-xl text-[11px] font-bold ${lang === 'ZH' ? 'bg-[#008751] text-white' : 'bg-slate-50 text-slate-600'}`}>中文</button>
                </div>
                <button onClick={handleLogout} className="w-full bg-rose-50 text-rose-600 font-semibold py-2 rounded-xl text-[11px]">
                  {t[lang].logout}
                </button>
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
      )
    }  
    
    {showProfileModal && (
      <div className="fixed inset-0 bg-black/50 z-[9999] flex items-end justify-center">
        <div className="bg-white w-full rounded-t-3xl p-5 shadow-2xl animate-slide-up">
          <h2 className="text-lg font-bold mb-4">Edit Profile</h2>
          
          <label className="text-[10px] font-bold text-slate-400 uppercase">Name</label>
          <input 
            value={tempProfile.name || ""}
            className="w-full p-3 mb-4 mt-1 bg-slate-50 border-0 rounded-xl text-sm"
            onChange={(e) => setTempProfile({...tempProfile, name: e.target.value})}
          />

          <label className="text-[10px] font-bold text-slate-400 uppercase">Phone Number</label>
          <input 
            value={tempProfile.phone || ""}
            className="w-full p-3 mb-6 mt-1 bg-slate-50 border-0 rounded-xl text-sm"
            onChange={(e) => setTempProfile({...tempProfile, phone: e.target.value})}
          />

          <div className="flex gap-3">
            <button onClick={() => setShowProfileModal(false)} className="flex-1 py-3 rounded-xl font-bold bg-gray-100">Cancel</button>
            <button 
              onClick={() => {
                const updatedProfile = { 
                  ...tempProfile, 
                  zone: tempProfile.zone || 'None'
                };
                
                localStorage.setItem('customer_profile', JSON.stringify(updatedProfile));
                
                setUserProfile(updatedProfile); 
                
                setShowProfileModal(false);
              }}
              className="flex-1 py-3 rounded-xl font-bold text-white bg-[#008751]"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}  

