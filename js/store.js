// ===== Trạng thái & hằng số dùng chung =====

// S: các biến toàn cục bị gán lại và được nhiều module đọc.
export const S = {
  lang: localStorage.getItem('vtm_lang') || 'vi',
  CATS: null, // danh mục động (Firebase) — khởi tạo bên dưới
};

export const DEFAULT_CATS = {
  expense: [
    {id:'food',emo:'🍜',vi:'Ăn uống',en:'Food & Drink'},{id:'shop',emo:'🛍️',vi:'Mua sắm',en:'Shopping'},
    {id:'transport',emo:'🚕',vi:'Đi lại',en:'Transport'},{id:'home',emo:'🏠',vi:'Nhà cửa',en:'Housing'},
    {id:'fun',emo:'🎮',vi:'Giải trí',en:'Entertainment'},{id:'health',emo:'💊',vi:'Sức khoẻ',en:'Health'},
    {id:'edu',emo:'📚',vi:'Học tập',en:'Education'},{id:'bill',emo:'🧾',vi:'Hoá đơn',en:'Bills'},
    {id:'other',emo:'📦',vi:'Khác',en:'Other'},
  ],
  income: [
    {id:'salary',emo:'💵',vi:'Lương',en:'Salary'},{id:'bonus',emo:'🎁',vi:'Thưởng',en:'Bonus'},
    {id:'invest',emo:'📊',vi:'Đầu tư',en:'Investment'},{id:'gift',emo:'💝',vi:'Được tặng',en:'Gift'},
    {id:'freelance',emo:'💻',vi:'Freelance',en:'Freelance'},{id:'other',emo:'📦',vi:'Khác',en:'Other'},
  ]
};
// Khởi tạo danh mục từ mặc định để UI chạy được trước khi đồng bộ Firebase.
S.CATS = {expense: DEFAULT_CATS.expense.map(c=>({...c})), income: DEFAULT_CATS.income.map(c=>({...c}))};

export const CAT_EMOJIS = ['🍜','🍔','🍕','🍳','☕','🍰','🍺','🍱','🛒','🛍️','👕','👟','💄','🚕','🚌','⛽','🚗','✈️','🏠','🛋️','🔧','💡','🎮','🎬','🎵','🎤','🎁','📚','✏️','🎓','💊','🏥','💪','🐶','✂️','🧾','📱','💻','🌐','🔌','💰','💵','🏦','💳','📈','📊','🏖️','🎉','❤️','🙏','📦','⚽','🍎','🌸'];
export const GOAL_ICONS = ['🐷','🏍️','🚗','🏠','✈️','💍','🎓','📱','💻','🏖️','🎁','💰','🚑','👶','🐶','🎮','💵','⛑️','🛡️','🌴'];
export const WALLET_ICONS = ['💵','🏦','💳','📱','🪙','💰','🏧','🐷'];
export const WALLET_COLORS = {'💵':'#34e0a1','🏦':'#60a5fa','💳':'#ff6b8b','📱':'#a78bfa','🪙':'#ffb86b','💰':'#22d3ee','🏧':'#7c5cff','🐷':'#ff6bcb'};
export const COLORS = ['#7c5cff','#22d3ee','#34e0a1','#ffb86b','#ff6b8b','#ff6bcb','#a78bfa','#60a5fa','#f472b6'];
export const THEMES = [
  {key:'',        c1:'#7c5cff',c2:'#22d3ee'},
  {key:'ocean',   c1:'#3b82f6',c2:'#22d3ee'},
  {key:'forest',  c1:'#10b981',c2:'#34e0a1'},
  {key:'sunset',  c1:'#fb7185',c2:'#fbbf24'},
  {key:'sakura',  c1:'#ec4899',c2:'#a78bfa'},
  {key:'ruby',    c1:'#ef4444',c2:'#fb923c'},
  {key:'midnight',c1:'#64748b',c2:'#38bdf8'}
];

export const state = {
  tab:'dash',
  txType:'expense', cat:'food', walletInput:'',
  recType:'expense', recCat:'food', recIcon:'💵',
  wIcon:'💵',
  filter:{q:'',type:'all',cat:'all',wallet:'all',from:'',to:''},
  txs:[], wallets:[], recurring:[], goals:[], debts:[], bills:[], budget:{total:0,perCat:{}},
};
