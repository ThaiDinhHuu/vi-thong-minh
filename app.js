import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, onSnapshot,
  addDoc, deleteDoc, updateDoc, setDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ===================== i18n ===================== */
let lang = localStorage.getItem('vtm_lang') || 'vi';
const WD_VI=['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'];
const WD_EN=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const WDS_VI=['CN','T2','T3','T4','T5','T6','T7'];
const WDS_EN=['Su','Mo','Tu','We','Th','Fr','Sa'];
const MO_VI=['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
const MO_EN=['January','February','March','April','May','June','July','August','September','October','November','December'];
const MO_EN_SHORT=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const wdNames=()=>lang==='en'?WD_EN:WD_VI;
const wdShortNames=()=>lang==='en'?WDS_EN:WDS_VI;
const moNames=()=>lang==='en'?MO_EN:MO_VI;

const I18N={
  vi:{
    'auth.connecting':'Đang kết nối…',
    'auth.welcome':'Chào mừng trở lại','auth.welcomeSub':'Đăng nhập để đồng bộ chi tiêu trên mọi thiết bị',
    'auth.signupTitle':'Tạo tài khoản mới','auth.signupSub':'Đăng ký để bắt đầu quản lý chi tiêu',
    'auth.google':'Tiếp tục với Google','auth.orEmail':'hoặc dùng email',
    'auth.email':'Email','auth.password':'Mật khẩu','auth.emailPh':'ban@email.com','auth.passwordPh':'Tối thiểu 6 ký tự',
    'auth.login':'Đăng nhập','auth.signup':'Đăng ký',
    'auth.noAccount':'Chưa có tài khoản?','auth.signupNow':'Đăng ký ngay','auth.hasAccount':'Đã có tài khoản?','auth.loginNow':'Đăng nhập',
    'auth.switchLang':'🌐 English',
    'setup.title':'⚙️ Cần cấu hình Firebase',
    'setup.body':'App chưa được kết nối với dự án Firebase. Hãy mở <code>firebase-config.js</code> và dán cấu hình dự án vào (xem <b>HUONG-DAN.md</b>).',
    'brand.tagline':'Quản lý chi tiêu cá nhân','nav.logout':'↩ Đăng xuất','nav.theme':'🎨 Giao diện','nav.themeTitle':'Đổi giao diện',
    'tab.dash':'📊 Tổng quan','tab.wallets':'💳 Ví','tab.recurring':'🔁 Định kỳ','tab.budget':'🎯 Ngân sách',
    'stat.balance':'Tổng số dư','stat.balanceSub':'Trên tất cả các ví','stat.income':'Tổng thu','stat.expense':'Tổng chi',
    'stat.walletDetail':'Chi tiết từng ví','stat.txCount':'{n} giao dịch','stat.walletsN':'{n} ví','stat.stable':'✨ ổn định','stat.negative':'⚠️ âm','stat.noWallets':'Chưa có ví nào.',
    'walletBreak.head':'💰 Số dư theo ví',
    'dash.budgetMonth':'🎯 Ngân sách tháng này','dash.spent':'Đã chi','dash.limit':'Hạn mức',
    'list.title':'Lịch sử giao dịch','list.searchPh':'Tìm theo mô tả giao dịch…','list.collapse':'⊟ Thu gọn','list.expand':'⊞ Mở rộng','list.collapseTitle':'Gập/mở tất cả ngày',
    'list.empty':'Không có giao dịch phù hợp.','list.emptyHint':'Thử đổi bộ lọc hoặc thêm giao dịch mới.',
    'chip.all':'Tất cả','chip.income':'Thu','chip.expense':'Chi','chip.transfer':'Chuyển ví',
    'filter.cat':'Danh mục','filter.wallet':'Ví','filter.from':'Từ ngày','filter.to':'Đến ngày',
    'filter.allCats':'Tất cả danh mục','filter.allWallets':'Tất cả ví','filter.clear':'✕ Xoá lọc','filter.export':'⬇ Xuất CSV/Excel',
    'preset.today':'Hôm nay','preset.7d':'7 ngày','preset.30d':'30 ngày','preset.month':'Tháng này','preset.lastmonth':'Tháng trước','preset.year':'Năm nay',
    'form.addTx':'Thêm giao dịch','seg.expense':'Chi tiêu','seg.income':'Thu nhập',
    'form.desc':'Mô tả','form.descPh':'VD: Cà phê với bạn','form.amount':'Số tiền (₫)','form.date':'Ngày','form.wallet':'Ví','form.addBtn':'＋ Thêm giao dịch',
    'chart.title':'Phân tích chi tiêu','chart.byFilter':'theo bộ lọc','chart.all':'tất cả','chart.totalExpense':'tổng chi','chart.noData':'Chưa có chi tiêu để phân tích',
    'wallets.title':'Các ví của bạn','wallets.transfer':'🔄 Chuyển tiền','wallets.addNew':'➕ Thêm ví mới',
    'wallets.name':'Tên ví','wallets.namePh':'VD: Ví Momo','wallets.initial':'Số dư ban đầu (₫)','wallets.icon':'Biểu tượng','wallets.create':'＋ Tạo ví','wallets.empty':'Chưa có ví nào. Tạo ví đầu tiên bên dưới.',
    'rec.title':'Giao dịch định kỳ',
    'rec.hint':'App sẽ <b>tự động ghi nhận</b> các khoản này vào mỗi tháng (khi bạn mở app từ ngày đã chọn trở đi). Phù hợp cho tiền nhà, lương, hoá đơn internet…',
    'rec.addNew':'➕ Thêm khoản định kỳ','rec.descPh':'VD: Tiền thuê nhà','rec.dayOfMonth':'Ngày trong tháng','rec.create':'＋ Tạo khoản định kỳ','rec.empty':'Chưa có khoản định kỳ nào.',
    'rec.dayLabel':'Ngày {d}','rec.monthlyOn':'ngày {d} hằng tháng','rec.lastRun':'lần cuối {m}','rec.suffix':' (định kỳ)',
    'budget.title':'Hạn mức chi tiêu hàng tháng',
    'budget.hint':'Đặt mức trần chi mỗi tháng. App sẽ hiển thị thanh tiến độ và <b>cảnh báo khi bạn dùng tới 80%</b> và khi <b>vượt hạn mức</b>.',
    'budget.total':'Tổng hạn mức / tháng (₫)','budget.totalPh':'VD: 10,000,000','budget.save':'💾 Lưu hạn mức',
    'budget.byCat':'📂 Hạn mức theo từng danh mục (tuỳ chọn)','budget.byCatHint':'Để trống nếu không muốn giới hạn riêng. Thanh màu hiển thị mức đã chi tháng này.',
    'budget.spentOf':'(đã chi {spent})','budget.spentOfLimit':'(đã chi {spent} / {limit})',
    'modal.transferTitle':'🔄 Chuyển tiền giữa các ví','modal.from':'Từ ví','modal.to':'Đến ví','modal.note':'Ghi chú (tuỳ chọn)','modal.notePh':'VD: Rút tiền mặt',
    'modal.editWallet':'✏️ Sửa ví','modal.editTx':'✏️ Sửa giao dịch','et.descPh':'Mô tả giao dịch',
    'btn.cancel':'Huỷ','btn.transfer':'Chuyển','btn.saveChanges':'💾 Lưu thay đổi','btn.delete':'Xoá','confirm.title':'Xác nhận',
    'tx.transfer':'Chuyển tiền','count.txShort':'GD','theme.pick':'🎨 Chọn giao diện',
    'rel.today':'Hôm nay','rel.yesterday':'Hôm qua','dp.clear':'Xoá','dp.today':'Hôm nay',
    'tt.delete':'Xoá','tt.edit':'Sửa','tt.editWallet':'Sửa ví','tt.deleteWallet':'Xoá ví','tt.toggle':'Bật/tắt',
    'theme.':'Tím','theme.ocean':'Đại dương','theme.forest':'Rừng xanh','theme.sunset':'Hoàng hôn','theme.sakura':'Anh đào','theme.ruby':'Hồng ngọc','theme.midnight':'Đêm',
    'toast.added':'Đã thêm {amt}','toast.invalidAmount':'⚠️ Nhập số tiền hợp lệ','toast.saveFail':'⚠️ Không lưu được: {code}',
    'toast.deletedTx':'🗑️ Đã xoá giao dịch','toast.deleteFail':'⚠️ Xoá thất bại','toast.txUpdated':'💾 Đã cập nhật giao dịch',
    'toast.errWallet':'⚠️ Lỗi ví: {code}','toast.errLoad':'⚠️ Lỗi tải dữ liệu: {code}',
    'toast.budgetOver':'🚨 Đã VƯỢT hạn mức tháng! Chi {spent} / {limit}','toast.budgetNear':'⚠️ Sắp chạm hạn mức: đã dùng {pct}%',
    'toast.autoLogged':'🔁 Đã tự ghi: {desc}','toast.walletDeleted':'🗑️ Đã xoá ví','toast.enterWalletName':'⚠️ Nhập tên ví',
    'toast.walletUpdated':'💾 Đã cập nhật ví','toast.updateFail':'⚠️ Cập nhật thất bại','toast.walletCreated':'💳 Đã tạo ví {name}','toast.walletCreateFail':'⚠️ Không tạo được ví',
    'toast.pickTwoWallets':'⚠️ Chọn hai ví khác nhau','toast.need2Wallets':'⚠️ Cần ít nhất 2 ví để chuyển','toast.transferred':'🔄 Đã chuyển {amt}','toast.transferFail':'⚠️ Chuyển thất bại',
    'toast.recCreated':'🔁 Đã tạo khoản định kỳ','toast.recCreateFail':'⚠️ Không tạo được','toast.deleted':'🗑️ Đã xoá',
    'toast.budgetSaved':'💾 Đã lưu hạn mức tháng','toast.catBudgetSaved':'💾 Đã lưu hạn mức danh mục','toast.budgetSaveFail':'⚠️ Lưu thất bại',
    'toast.noExportData':'Không có dữ liệu để xuất','toast.exported':'⬇ Đã xuất {n} giao dịch',
    'confirm.deleteWalletTitle':'🗑️ Xoá ví','confirm.deleteWalletMsg':'Xoá ví "{name}"? Giao dịch cũ vẫn còn nhưng sẽ không thuộc ví nào.',
    'confirm.deleteRecTitle':'🗑️ Xoá định kỳ','confirm.deleteRecMsg':'Xoá khoản định kỳ này?',
    'csv.date':'Ngày','csv.type':'Loại','csv.cat':'Danh mục','csv.desc':'Mô tả','csv.wallet':'Ví / Chuyển','csv.amount':'Số tiền',
    'tab.cats':'📂 Danh mục',
    'cats.expenseTitle':'Danh mục chi tiêu','cats.incomeTitle':'Danh mục thu nhập','cats.add':'➕ Thêm danh mục',
    'cats.addTitle':'➕ Thêm danh mục','cats.editTitle':'✏️ Sửa danh mục','cats.name':'Tên danh mục','cats.namePh':'VD: Cà phê','cats.icon':'Biểu tượng',
    'cats.empty':'Chưa có danh mục nào.','cats.enterName':'⚠️ Nhập tên danh mục',
    'toast.catCreated':'📂 Đã thêm danh mục','toast.catUpdated':'💾 Đã cập nhật danh mục','toast.catSaveFail':'⚠️ Lưu thất bại','toast.catDeleted':'🗑️ Đã xoá danh mục',
    'confirm.deleteCatTitle':'🗑️ Xoá danh mục','confirm.deleteCatMsg':'Xoá danh mục "{name}"? Giao dịch cũ vẫn giữ nhưng sẽ hiện là "Khác".',
    'confirm.deleteTxTitle':'🗑️ Xoá giao dịch','confirm.deleteTxMsg':'Xoá giao dịch "{name}"? Hành động không thể hoàn tác.',
    'err.generic':'Đã xảy ra lỗi',
    'err.auth/invalid-email':'Email không hợp lệ','err.auth/user-not-found':'Tài khoản không tồn tại','err.auth/wrong-password':'Sai mật khẩu',
    'err.auth/invalid-credential':'Email hoặc mật khẩu không đúng','err.auth/email-already-in-use':'Email đã được đăng ký','err.auth/weak-password':'Mật khẩu quá yếu (tối thiểu 6 ký tự)',
    'err.auth/popup-closed-by-user':'Bạn đã đóng cửa sổ đăng nhập','err.auth/operation-not-allowed':'Phương thức này chưa được bật trong Firebase','err.auth/unauthorized-domain':'Tên miền chưa được cho phép trong Firebase Auth',
  },
  en:{
    'auth.connecting':'Connecting…',
    'auth.welcome':'Welcome back','auth.welcomeSub':'Sign in to sync your finances across devices',
    'auth.signupTitle':'Create a new account','auth.signupSub':'Sign up to start managing your money',
    'auth.google':'Continue with Google','auth.orEmail':'or use email',
    'auth.email':'Email','auth.password':'Password','auth.emailPh':'you@email.com','auth.passwordPh':'At least 6 characters',
    'auth.login':'Sign in','auth.signup':'Sign up',
    'auth.noAccount':"Don't have an account?",'auth.signupNow':'Sign up','auth.hasAccount':'Already have an account?','auth.loginNow':'Sign in',
    'auth.switchLang':'🌐 Tiếng Việt',
    'setup.title':'⚙️ Firebase setup required',
    'setup.body':'The app is not connected to your Firebase project yet. Open <code>firebase-config.js</code> and paste your project config (see <b>HUONG-DAN.md</b>).',
    'brand.tagline':'Personal expense manager','nav.logout':'↩ Sign out','nav.theme':'🎨 Theme','nav.themeTitle':'Change theme',
    'tab.dash':'📊 Overview','tab.wallets':'💳 Wallets','tab.recurring':'🔁 Recurring','tab.budget':'🎯 Budget',
    'stat.balance':'Total balance','stat.balanceSub':'Across all wallets','stat.income':'Total income','stat.expense':'Total expense',
    'stat.walletDetail':'Per-wallet detail','stat.txCount':'{n} transactions','stat.walletsN':'{n} wallets','stat.stable':'✨ stable','stat.negative':'⚠️ negative','stat.noWallets':'No wallets yet.',
    'walletBreak.head':'💰 Balance by wallet',
    'dash.budgetMonth':"🎯 This month's budget",'dash.spent':'Spent','dash.limit':'Limit',
    'list.title':'Transaction history','list.searchPh':'Search by description…','list.collapse':'⊟ Collapse','list.expand':'⊞ Expand','list.collapseTitle':'Collapse/expand all days',
    'list.empty':'No matching transactions.','list.emptyHint':'Try changing filters or add a new one.',
    'chip.all':'All','chip.income':'Income','chip.expense':'Expense','chip.transfer':'Transfer',
    'filter.cat':'Category','filter.wallet':'Wallet','filter.from':'From date','filter.to':'To date',
    'filter.allCats':'All categories','filter.allWallets':'All wallets','filter.clear':'✕ Clear filters','filter.export':'⬇ Export CSV/Excel',
    'preset.today':'Today','preset.7d':'7 days','preset.30d':'30 days','preset.month':'This month','preset.lastmonth':'Last month','preset.year':'This year',
    'form.addTx':'Add transaction','seg.expense':'Expense','seg.income':'Income',
    'form.desc':'Description','form.descPh':'e.g. Coffee with friends','form.amount':'Amount (₫)','form.date':'Date','form.wallet':'Wallet','form.addBtn':'＋ Add transaction',
    'chart.title':'Spending breakdown','chart.byFilter':'filtered','chart.all':'all','chart.totalExpense':'total spent','chart.noData':'No spending to analyze yet',
    'wallets.title':'Your wallets','wallets.transfer':'🔄 Transfer','wallets.addNew':'➕ Add new wallet',
    'wallets.name':'Wallet name','wallets.namePh':'e.g. Momo wallet','wallets.initial':'Initial balance (₫)','wallets.icon':'Icon','wallets.create':'＋ Create wallet','wallets.empty':'No wallets yet. Create your first one below.',
    'rec.title':'Recurring transactions',
    'rec.hint':'The app will <b>automatically log</b> these every month (once you open it on/after the chosen day). Great for rent, salary, internet bills…',
    'rec.addNew':'➕ Add recurring','rec.descPh':'e.g. House rent','rec.dayOfMonth':'Day of month','rec.create':'＋ Create recurring','rec.empty':'No recurring transactions yet.',
    'rec.dayLabel':'Day {d}','rec.monthlyOn':'on day {d} monthly','rec.lastRun':'last run {m}','rec.suffix':' (recurring)',
    'budget.title':'Monthly spending limit',
    'budget.hint':'Set a monthly spending cap. The app shows a progress bar and <b>warns at 80%</b> and when you <b>exceed the limit</b>.',
    'budget.total':'Total limit / month (₫)','budget.totalPh':'e.g. 10,000,000','budget.save':'💾 Save limit',
    'budget.byCat':'📂 Per-category limits (optional)','budget.byCatHint':"Leave blank for no specific limit. The colored bar shows this month's spending.",
    'budget.spentOf':'(spent {spent})','budget.spentOfLimit':'(spent {spent} / {limit})',
    'modal.transferTitle':'🔄 Transfer between wallets','modal.from':'From wallet','modal.to':'To wallet','modal.note':'Note (optional)','modal.notePh':'e.g. Cash withdrawal',
    'modal.editWallet':'✏️ Edit wallet','modal.editTx':'✏️ Edit transaction','et.descPh':'Transaction description',
    'btn.cancel':'Cancel','btn.transfer':'Transfer','btn.saveChanges':'💾 Save changes','btn.delete':'Delete','confirm.title':'Confirm',
    'tx.transfer':'Transfer','count.txShort':'txns','theme.pick':'🎨 Choose theme',
    'rel.today':'Today','rel.yesterday':'Yesterday','dp.clear':'Clear','dp.today':'Today',
    'tt.delete':'Delete','tt.edit':'Edit','tt.editWallet':'Edit wallet','tt.deleteWallet':'Delete wallet','tt.toggle':'Toggle',
    'theme.':'Purple','theme.ocean':'Ocean','theme.forest':'Forest','theme.sunset':'Sunset','theme.sakura':'Sakura','theme.ruby':'Ruby','theme.midnight':'Midnight',
    'toast.added':'Added {amt}','toast.invalidAmount':'⚠️ Enter a valid amount','toast.saveFail':"⚠️ Couldn't save: {code}",
    'toast.deletedTx':'🗑️ Transaction deleted','toast.deleteFail':'⚠️ Delete failed','toast.txUpdated':'💾 Transaction updated',
    'toast.errWallet':'⚠️ Wallet error: {code}','toast.errLoad':'⚠️ Load error: {code}',
    'toast.budgetOver':'🚨 Monthly budget EXCEEDED! Spent {spent} / {limit}','toast.budgetNear':'⚠️ Approaching limit: {pct}% used',
    'toast.autoLogged':'🔁 Auto-logged: {desc}','toast.walletDeleted':'🗑️ Wallet deleted','toast.enterWalletName':'⚠️ Enter a wallet name',
    'toast.walletUpdated':'💾 Wallet updated','toast.updateFail':'⚠️ Update failed','toast.walletCreated':'💳 Wallet {name} created','toast.walletCreateFail':"⚠️ Couldn't create wallet",
    'toast.pickTwoWallets':'⚠️ Pick two different wallets','toast.need2Wallets':'⚠️ Need at least 2 wallets to transfer','toast.transferred':'🔄 Transferred {amt}','toast.transferFail':'⚠️ Transfer failed',
    'toast.recCreated':'🔁 Recurring created','toast.recCreateFail':"⚠️ Couldn't create",'toast.deleted':'🗑️ Deleted',
    'toast.budgetSaved':'💾 Monthly limit saved','toast.catBudgetSaved':'💾 Category limit saved','toast.budgetSaveFail':'⚠️ Save failed',
    'toast.noExportData':'No data to export','toast.exported':'⬇ Exported {n} transactions',
    'confirm.deleteWalletTitle':'🗑️ Delete wallet','confirm.deleteWalletMsg':'Delete wallet "{name}"? Past transactions remain but won\'t belong to any wallet.',
    'confirm.deleteRecTitle':'🗑️ Delete recurring','confirm.deleteRecMsg':'Delete this recurring transaction?',
    'csv.date':'Date','csv.type':'Type','csv.cat':'Category','csv.desc':'Description','csv.wallet':'Wallet / Transfer','csv.amount':'Amount',
    'tab.cats':'📂 Categories',
    'cats.expenseTitle':'Expense categories','cats.incomeTitle':'Income categories','cats.add':'➕ Add category',
    'cats.addTitle':'➕ Add category','cats.editTitle':'✏️ Edit category','cats.name':'Category name','cats.namePh':'e.g. Coffee','cats.icon':'Icon',
    'cats.empty':'No categories yet.','cats.enterName':'⚠️ Enter a category name',
    'toast.catCreated':'📂 Category added','toast.catUpdated':'💾 Category updated','toast.catSaveFail':'⚠️ Save failed','toast.catDeleted':'🗑️ Category deleted',
    'confirm.deleteCatTitle':'🗑️ Delete category','confirm.deleteCatMsg':'Delete category "{name}"? Past transactions are kept but will show as "Other".',
    'confirm.deleteTxTitle':'🗑️ Delete transaction','confirm.deleteTxMsg':'Delete transaction "{name}"? This cannot be undone.',
    'err.generic':'Something went wrong',
    'err.auth/invalid-email':'Invalid email','err.auth/user-not-found':'Account not found','err.auth/wrong-password':'Wrong password',
    'err.auth/invalid-credential':'Email or password is incorrect','err.auth/email-already-in-use':'Email already registered','err.auth/weak-password':'Password too weak (min 6 characters)',
    'err.auth/popup-closed-by-user':'You closed the sign-in window','err.auth/operation-not-allowed':'This sign-in method is not enabled in Firebase','err.auth/unauthorized-domain':'Domain not authorized in Firebase Auth',
  }
};
function t(key,p){
  let s=(I18N[lang]&&I18N[lang][key])!=null?I18N[lang][key]:(I18N.vi[key]!=null?I18N.vi[key]:key);
  if(p)for(const k in p)s=s.split('{'+k+'}').join(p[k]);
  return s;
}

/* ===== Static data ===== */
const DEFAULT_CATS={
  expense:[
    {id:'food',emo:'🍜',vi:'Ăn uống',en:'Food & Drink'},{id:'shop',emo:'🛍️',vi:'Mua sắm',en:'Shopping'},
    {id:'transport',emo:'🚕',vi:'Đi lại',en:'Transport'},{id:'home',emo:'🏠',vi:'Nhà cửa',en:'Housing'},
    {id:'fun',emo:'🎮',vi:'Giải trí',en:'Entertainment'},{id:'health',emo:'💊',vi:'Sức khoẻ',en:'Health'},
    {id:'edu',emo:'📚',vi:'Học tập',en:'Education'},{id:'bill',emo:'🧾',vi:'Hoá đơn',en:'Bills'},
    {id:'other',emo:'📦',vi:'Khác',en:'Other'},
  ],
  income:[
    {id:'salary',emo:'💵',vi:'Lương',en:'Salary'},{id:'bonus',emo:'🎁',vi:'Thưởng',en:'Bonus'},
    {id:'invest',emo:'📊',vi:'Đầu tư',en:'Investment'},{id:'gift',emo:'💝',vi:'Được tặng',en:'Gift'},
    {id:'freelance',emo:'💻',vi:'Freelance',en:'Freelance'},{id:'other',emo:'📦',vi:'Khác',en:'Other'},
  ]
};
// Live categories (Firebase-backed). Initialized from defaults so UI works before sync.
let CATS={expense:DEFAULT_CATS.expense.map(c=>({...c})),income:DEFAULT_CATS.income.map(c=>({...c}))};
const CAT_EMOJIS=['🍜','🍔','🍕','🍳','☕','🍰','🍺','🍱','🛒','🛍️','👕','👟','💄','🚕','🚌','⛽','🚗','✈️','🏠','🛋️','🔧','💡','🎮','🎬','🎵','🎤','🎁','📚','✏️','🎓','💊','🏥','💪','🐶','✂️','🧾','📱','💻','🌐','🔌','💰','💵','🏦','💳','📈','📊','🏖️','🎉','❤️','🙏','📦','⚽','🍎','🌸'];
const WALLET_ICONS=['💵','🏦','💳','📱','🪙','💰','🏧','🐷'];
const WALLET_COLORS={'💵':'#34e0a1','🏦':'#60a5fa','💳':'#ff6b8b','📱':'#a78bfa','🪙':'#ffb86b','💰':'#22d3ee','🏧':'#7c5cff','🐷':'#ff6bcb'};
const COLORS=['#7c5cff','#22d3ee','#34e0a1','#ffb86b','#ff6b8b','#ff6bcb','#a78bfa','#60a5fa','#f472b6'];

let state={
  tab:'dash',
  txType:'expense', cat:'food', walletInput:'',
  recType:'expense', recCat:'food', recIcon:'💵',
  wIcon:'💵',
  filter:{q:'',type:'all',cat:'all',wallet:'all',from:'',to:''},
  txs:[], wallets:[], recurring:[], budget:{total:0,perCat:{}},
};
let chart, db, auth, currentUser=null;
let unsubs=[];
let recurringBusy=false, walletsLoaded=false, recurringLoaded=false;

const $=s=>document.querySelector(s);
const $$=s=>document.querySelectorAll(s);
const fmt=n=>new Intl.NumberFormat('vi-VN').format(Math.round(n))+'₫';
const num=s=>parseFloat(String(s).replace(/[^\d]/g,''))||0;
const catFallback=()=>lang==='en'?'Other':'Khác';
const catName=c=>{if(!c)return catFallback();return (lang==='en'?(c.en||c.name||c.vi):(c.vi||c.name||c.en))||catFallback();};
const catInfo=(ty,id)=>{const c=(CATS[ty]||[]).find(x=>x.id===id);return c?{emo:c.emo,name:catName(c)}:{emo:'📦',name:(lang==='en'?'Other':'Khác')};};
const todayISO=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);};
const isoOf=d=>new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);
const fmtDate=iso=>{const [y,m,d]=(iso||'').split('-');return d&&m&&y?`${d}/${m}/${y}`:iso;};
const monthKey=iso=>(iso||'').slice(0,7);
const monthLabel=k=>{const [y,m]=k.split('-');if(!m||!y)return k;return lang==='en'?`${MO_EN_SHORT[parseInt(m)-1]} ${y}`:`Tháng ${parseInt(m)}/${y}`;};
const thisMonth=()=>todayISO().slice(0,7);
function dayHeaderInfo(iso){
  const p=(iso||'').split('-');
  if(p.length!==3)return {wd:'',dd:iso||'',tag:''};
  const y=+p[0],m=+p[1],d=+p[2];const dt=new Date(y,m-1,d);
  const yest=isoOf(new Date(Date.now()-86400000));
  const tag=iso===todayISO()?t('rel.today'):iso===yest?t('rel.yesterday'):'';
  return {wd:wdNames()[dt.getDay()],dd:`${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`,tag};
}

/* ===== Custom date picker (glass theme, replaces native popup) ===== */
const datePicker=(function(){
  let pop=null, active=null, mode='days';
  const view={y:2000,m:0}, reg={};
  const parseIso=iso=>{const p=(iso||'').split('-');return p.length===3?{y:+p[0],m:+p[1]-1,d:+p[2]}:null;};
  const toIso=(y,m,d)=>`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const fmtDisp=iso=>{const o=parseIso(iso);return o?`${String(o.d).padStart(2,'0')}/${String(o.m+1).padStart(2,'0')}/${o.y}`:'';};
  function ensure(){
    if(pop)return;
    pop=document.createElement('div');pop.className='dp-pop';document.body.appendChild(pop);
    pop.addEventListener('mousedown',e=>e.preventDefault());
    document.addEventListener('click',e=>{if(active&&pop&&!pop.contains(e.target)&&e.target!==active.input)close();});
    window.addEventListener('resize',close);window.addEventListener('scroll',close,true);
  }
  function place(){
    const r=active.input.getBoundingClientRect(),w=300,vw=document.documentElement.clientWidth;
    let left=r.left+window.scrollX;
    if(left+w>window.scrollX+vw-8)left=window.scrollX+vw-w-8;
    if(left<window.scrollX+8)left=window.scrollX+8;
    pop.style.left=left+'px';pop.style.top=(r.bottom+window.scrollY+8)+'px';pop.style.width=w+'px';
  }
  function render(){
    if(mode==='months'){
      const {y}=view, selO=parseIso(active.iso);
      pop.innerHTML=`<div class="dp-head"><button class="dp-nav" data-nav="-1">‹</button>`
        +`<button class="dp-title" data-title>${y}</button><button class="dp-nav" data-nav="1">›</button></div>`
        +`<div class="dp-months">${moNames().map((mo,i)=>`<button class="dp-mo${selO&&selO.y===y&&selO.m===i?' sel':''}" data-mo="${i}">${mo}</button>`).join('')}</div>`;
      return bind();
    }
    const {y,m}=view, sel=active.iso, today=todayISO();
    const first=new Date(y,m,1).getDay(), days=new Date(y,m+1,0).getDate(), prevDays=new Date(y,m,0).getDate();
    let cells='';
    for(let i=0;i<first;i++){const d=prevDays-first+1+i;cells+=`<button class="dp-day dim" data-off="-1" data-d="${d}">${d}</button>`;}
    for(let d=1;d<=days;d++){const iso=toIso(y,m,d);let c='dp-day';if(iso===today)c+=' today';if(iso===sel)c+=' sel';cells+=`<button class="${c}" data-d="${d}">${d}</button>`;}
    const trail=(7-(first+days)%7)%7;
    for(let i=1;i<=trail;i++)cells+=`<button class="dp-day dim" data-off="1" data-d="${i}">${i}</button>`;
    pop.innerHTML=`<div class="dp-head"><button class="dp-nav" data-nav="-1">‹</button>`
      +`<button class="dp-title" data-title>${moNames()[m]} ${y}</button><button class="dp-nav" data-nav="1">›</button></div>`
      +`<div class="dp-grid">${wdShortNames().map(w=>`<div class="dp-wd">${w}</div>`).join('')}${cells}</div>`
      +`<div class="dp-foot"><button class="dp-clear" data-clear>${t('dp.clear')}</button><button data-today>${t('dp.today')}</button></div>`;
    bind();
  }
  function bind(){
    pop.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>{const dir=+b.dataset.nav;
      if(mode==='months'){view.y+=dir;}else{view.m+=dir;if(view.m<0){view.m=11;view.y--;}if(view.m>11){view.m=0;view.y++;}}render();});
    const title=pop.querySelector('[data-title]');if(title)title.onclick=()=>{mode=mode==='months'?'days':'months';render();};
    pop.querySelectorAll('[data-mo]').forEach(b=>b.onclick=()=>{view.m=+b.dataset.mo;mode='days';render();});
    pop.querySelectorAll('.dp-day:not(.dim)').forEach(b=>b.onclick=()=>pick(toIso(view.y,view.m,+b.dataset.d)));
    pop.querySelectorAll('.dp-day.dim').forEach(b=>b.onclick=()=>{let yy=view.y,mm=view.m+(+b.dataset.off);
      if(mm<0){mm=11;yy--;}if(mm>11){mm=0;yy++;}pick(toIso(yy,mm,+b.dataset.d));});
    const c=pop.querySelector('[data-clear]');if(c)c.onclick=()=>pick('');
    const td=pop.querySelector('[data-today]');if(td)td.onclick=()=>pick(todayISO());
  }
  function pick(iso){
    active.iso=iso;active.input.value=fmtDisp(iso);active.input.dataset.iso=iso;
    if(active.onChange)active.onChange(iso);
    close();
  }
  function open(rec){
    ensure();active=rec;mode='days';
    const o=parseIso(rec.iso)||parseIso(todayISO());view.y=o.y;view.m=o.m;
    render();place();requestAnimationFrame(()=>pop.classList.add('show'));
  }
  function close(){if(pop)pop.classList.remove('show');active=null;}
  return {
    attach(input,onChange){
      input.type='text';input.readOnly=true;input.autocomplete='off';input.classList.add('dp-input');
      if(!input.placeholder)input.placeholder='dd/mm/yyyy';
      const rec={input,iso:input.dataset.iso||'',onChange};reg[input.id]=rec;
      if(rec.iso)input.value=fmtDisp(rec.iso);
      input.addEventListener('click',e=>{e.stopPropagation();if(active===rec)close();else open(rec);});
      return rec;
    },
    set(id,iso){const r=reg[id];if(!r)return;r.iso=iso||'';r.input.value=fmtDisp(iso);r.input.dataset.iso=iso||'';},
    get(id){const r=reg[id];return r?r.iso:'';}
  };
})();

/* ===== Custom select (rounded option list; native select kept hidden as data source) ===== */
function enhanceSelect(sel){
  if(!sel||sel.dataset.enhanced)return;sel.dataset.enhanced='1';
  const wrap=document.createElement('div');wrap.className='csel';
  sel.parentNode.insertBefore(wrap,sel);wrap.appendChild(sel);sel.classList.add('csel-native');
  const trigger=document.createElement('button');trigger.type='button';trigger.className='csel-trigger';
  const lbl=document.createElement('span'),arr=document.createElement('span');arr.className='csel-arr';arr.textContent='▾';
  trigger.appendChild(lbl);trigger.appendChild(arr);
  const list=document.createElement('div');list.className='csel-list';
  wrap.appendChild(trigger);wrap.appendChild(list);
  const sync=()=>{const o=sel.options[sel.selectedIndex];lbl.textContent=o?o.textContent:'—';};
  const build=()=>{list.innerHTML='';[...sel.options].forEach((o,i)=>{
    const it=document.createElement('div');it.className='csel-item'+(i===sel.selectedIndex?' sel':'');it.textContent=o.textContent;
    it.onclick=()=>{sel.selectedIndex=i;sel.dispatchEvent(new Event('change',{bubbles:true}));sync();close();};
    list.appendChild(it);});};
  const close=()=>wrap.classList.remove('open');
  const open=()=>{closeAllCsel();build();wrap.classList.add('open');};
  trigger.onclick=e=>{e.stopPropagation();wrap.classList.contains('open')?close():open();};
  sel.addEventListener('change',sync);sel._cselSync=sync;sync();
}
function closeAllCsel(){document.querySelectorAll('.csel.open').forEach(w=>w.classList.remove('open'));}
function syncCsels(){document.querySelectorAll('select.csel-native').forEach(s=>s._cselSync&&s._cselSync());}
document.addEventListener('click',()=>closeAllCsel());

/* ===== Color themes ===== */
const THEMES=[
  {key:'',        c1:'#7c5cff',c2:'#22d3ee'},
  {key:'ocean',   c1:'#3b82f6',c2:'#22d3ee'},
  {key:'forest',  c1:'#10b981',c2:'#34e0a1'},
  {key:'sunset',  c1:'#fb7185',c2:'#fbbf24'},
  {key:'sakura',  c1:'#ec4899',c2:'#a78bfa'},
  {key:'ruby',    c1:'#ef4444',c2:'#fb923c'},
  {key:'midnight',c1:'#64748b',c2:'#38bdf8'}
];
const themeName=th=>t('theme.'+th.key);
const currentTheme=()=>document.documentElement.dataset.theme||'';
function applyTheme(key){
  if(key)document.documentElement.dataset.theme=key;else delete document.documentElement.dataset.theme;
  try{localStorage.setItem('vtm_theme',key);}catch(e){}
  const tc=document.querySelector('meta[name=theme-color]');
  if(tc)tc.setAttribute('content',getComputedStyle(document.documentElement).getPropertyValue('--bg-0').trim()||'#0b1020');
  buildThemeGrid();
}
function buildThemeGrid(){
  const grid=$('#themeGrid');if(!grid)return;const cur=currentTheme();grid.innerHTML='';
  THEMES.forEach(th=>{
    const b=document.createElement('button');b.type='button';b.className='theme-sw'+(th.key===cur?' on':'');
    b.innerHTML=`<span class="dot" style="background:linear-gradient(135deg,${th.c1},${th.c2})"></span>${themeName(th)}<span class="chk">✓</span>`;
    b.onclick=()=>applyTheme(th.key);
    grid.appendChild(b);
  });
}

const escapeHtml=s=>(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const walletById=id=>state.wallets.find(w=>w.id===id);
const walletName=id=>{const w=walletById(id);return w?`${w.icon} ${w.name}`:'—';};

function toast(msg,kind){const el=$('#toast');el.className='toast show'+(kind?' '+kind:'');el.innerHTML=msg;clearTimeout(el._tm);el._tm=setTimeout(()=>el.classList.remove('show'),2600);}
const show=el=>el.classList.remove('app-hidden');
const hide=el=>el.classList.add('app-hidden');

/* Attach thousand-separator formatting to a text input */
function attachThousands(el){
  el.addEventListener('input',e=>{
    const tg=e.target;
    const before=tg.value.slice(0,tg.selectionStart).replace(/\D/g,'').length;
    const digits=tg.value.replace(/\D/g,'');
    tg.value=digits?Number(digits).toLocaleString('en-US'):'';
    let pos=0,seen=0;
    while(pos<tg.value.length&&seen<before){if(/\d/.test(tg.value[pos]))seen++;pos++;}
    tg.setSelectionRange(pos,pos);
  });
}

/* ===== Apply language ===== */
function applyLang(){
  document.documentElement.lang=lang;
  paintLangSeg();
  const al=$('#authLangLink');if(al)al.textContent=t('auth.switchLang');
  $('#themeBtn').title=t('nav.themeTitle');
  $('#collapseAll').title=t('list.collapseTitle');
  $$('[data-i18n]').forEach(el=>{el.textContent=t(el.getAttribute('data-i18n'));});
  $$('[data-i18n-html]').forEach(el=>{el.innerHTML=t(el.getAttribute('data-i18n-html'));});
  $$('[data-i18n-ph]').forEach(el=>{el.placeholder=t(el.getAttribute('data-i18n-ph'));});
  buildRecDayOptions();
  renderCatFilterOptions();
  buildThemeGrid();
  setAuthTexts();
  renderFormCats();renderRecCats();renderEtCats();
  updateCollapseAllLabel();
  renderAll();renderRecurring();renderBudget();renderCategoryManage();
  syncCsels();
}
function setLang(l){lang=l;localStorage.setItem('vtm_lang',l);applyLang();}

/* ===== Firebase init ===== */
function configReady(){return firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith('PASTE_');}
if(!configReady()){hide($('#loadingCard'));show($('#setupCard'));}
else{
  const app=initializeApp(firebaseConfig);
  auth=getAuth(app);
  // Cache cục bộ (IndexedDB): đọc/ghi tức thì, hoạt động cả khi offline rồi đồng bộ sau.
  db=initializeFirestore(app,{localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})});
  onAuthStateChanged(auth,user=>{
    currentUser=user;
    if(user){
      hide($('#authCard'));hide($('#loadingCard'));$('#overlay').classList.add('hide');show($('#appRoot'));
      paintUser(user);subscribeAll(user.uid);
    }else{
      unsubs.forEach(u=>u&&u());unsubs=[];recurringBusy=false;walletsLoaded=false;recurringLoaded=false;
      state.txs=[];state.wallets=[];state.recurring=[];state.budget={total:0,perCat:{}};
      renderAll();hide($('#appRoot'));hide($('#loadingCard'));$('#overlay').classList.remove('hide');show($('#authCard'));
    }
  });
}

function paintUser(u){
  const name=u.displayName||u.email.split('@')[0];
  $('#userName').childNodes[0].nodeValue=name;
  $('#userEmail').textContent=u.email||'';
  const av=$('#userAv');
  if(u.photoURL)av.innerHTML=`<img src="${u.photoURL}" alt="">`;
  else av.textContent=(name[0]||'U').toUpperCase();
}

/* ===== Firestore subscriptions ===== */
function col(uid,name){return collection(db,'users',uid,name);}
function subscribeAll(uid){
  unsubs.forEach(u=>u&&u());unsubs=[];
  unsubs.push(onSnapshot(col(uid,'categories'),snap=>{
    if(!snap.size && !localStorage.getItem('seeded_cats_'+uid)){seedCats(uid);return;}
    const ex=[],inc=[];
    snap.docs.forEach(d=>{const data=d.data();const c={docId:d.id,...data,id:data.cid||d.id};(c.type==='income'?inc:ex).push(c);});
    ex.sort((a,b)=>(a.order||0)-(b.order||0));inc.sort((a,b)=>(a.order||0)-(b.order||0));
    CATS={expense:ex,income:inc};
    normalizeCatSelections();
    refreshCatUI();
  },err=>console.error(err)));
  unsubs.push(onSnapshot(col(uid,'wallets'),snap=>{
    state.wallets=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.order||0)-(b.order||0));
    if(!snap.size && !localStorage.getItem('seeded_wallets_'+uid)){seedWallets(uid);}
    walletsLoaded=true;
    renderAll();maybeRunRecurring();
  },err=>toast(t('toast.errWallet',{code:err.code}),'danger')));

  unsubs.push(onSnapshot(col(uid,'transactions'),snap=>{
    state.txs=snap.docs.map(d=>({id:d.id,...d.data()}));
    state.txs.sort((a,b)=>{
      if(a.date!==b.date)return (b.date||'').localeCompare(a.date||'');
      const ta=a.createdAt&&a.createdAt.seconds||0, tb=b.createdAt&&b.createdAt.seconds||0;return tb-ta;
    });
    renderAll();
  },err=>toast(t('toast.errLoad',{code:err.code}),'danger')));

  unsubs.push(onSnapshot(col(uid,'recurring'),snap=>{
    state.recurring=snap.docs.map(d=>({id:d.id,...d.data()}));
    recurringLoaded=true;
    renderRecurring();maybeRunRecurring();
  }));

  unsubs.push(onSnapshot(doc(db,'users',uid,'settings','budget'),snap=>{
    const d=snap.data()||{};state.budget={total:d.total||0,perCat:d.perCat||{}};
    renderBudget();renderBudgetBanner();
  }));
}

async function seedWallets(uid){
  localStorage.setItem('seeded_wallets_'+uid,'1');
  const defs=lang==='en'
    ?[{name:'Cash',icon:'💵',initial:0,order:0},{name:'ATM',icon:'🏦',initial:0,order:1},{name:'Credit Card',icon:'💳',initial:0,order:2}]
    :[{name:'Tiền mặt',icon:'💵',initial:0,order:0},{name:'ATM',icon:'🏦',initial:0,order:1},{name:'Thẻ tín dụng',icon:'💳',initial:0,order:2}];
  for(const w of defs){try{await addDoc(col(uid,'wallets'),{...w,createdAt:serverTimestamp()});}catch(e){console.error(e);}}
}

/* ===== Categories: seed defaults + helpers ===== */
async function seedCats(uid){
  localStorage.setItem('seeded_cats_'+uid,'1');
  let order=0;
  for(const c of DEFAULT_CATS.expense){try{await setDoc(doc(db,'users',uid,'categories','expense_'+c.id),{type:'expense',cid:c.id,vi:c.vi,en:c.en,emo:c.emo,order:order++});}catch(e){console.error(e);}}
  order=0;
  for(const c of DEFAULT_CATS.income){try{await setDoc(doc(db,'users',uid,'categories','income_'+c.id),{type:'income',cid:c.id,vi:c.vi,en:c.en,emo:c.emo,order:order++});}catch(e){console.error(e);}}
}
function normalizeCatSelections(){
  const ensure=(type,cur)=>{const list=CATS[type]||[];return list.some(c=>c.id===cur)?cur:(list[0]?list[0].id:'');};
  state.cat=ensure(state.txType,state.cat);
  state.recCat=ensure(state.recType,state.recCat);
  etCat=ensure(etType,etCat);
}
function refreshCatUI(){
  renderFormCats();renderRecCats();renderEtCats();
  renderCatFilterOptions();renderBudget();renderCategoryManage();
  renderList();renderChart();syncCsels();
}

/* ===== Recurring auto-run ===== */
async function maybeRunRecurring(){
  // Chỉ chạy khi CẢ ví và định kỳ đã tải xong (tránh bật cờ sai khi dữ liệu chưa về đủ).
  if(recurringBusy||!currentUser||!walletsLoaded||!recurringLoaded||!state.wallets.length)return;
  recurringBusy=true; // chống chạy chồng; việc chống ghi trùng do trường lastMonth đảm nhiệm
  try{
    const ym=thisMonth(); const today=parseInt(todayISO().slice(8,10),10);
    for(const r of state.recurring){
      if(!r.active)continue;
      if((r.lastMonth||'')>=ym)continue;
      if((r.day||1)>today)continue;
      const dd=String(Math.min(r.day||1,28)).padStart(2,'0');
      try{
        await addDoc(col(currentUser.uid,'transactions'),{
          type:r.type,cat:r.cat,desc:(r.desc||'')+t('rec.suffix'),amount:r.amount,
          date:`${ym}-${dd}`,walletId:r.walletId||'',createdAt:serverTimestamp()
        });
        await updateDoc(doc(db,'users',currentUser.uid,'recurring',r.id),{lastMonth:ym});
        toast(t('toast.autoLogged',{desc:escapeHtml(r.desc)}));
      }catch(e){console.error(e);}
    }
  }finally{recurringBusy=false;}
}

/* ===== Compute ===== */
function walletBalance(w){
  let b=w.initial||0;
  for(const tr of state.txs){
    if(tr.type==='income'&&tr.walletId===w.id)b+=tr.amount;
    else if(tr.type==='expense'&&tr.walletId===w.id)b-=tr.amount;
    else if(tr.type==='transfer'){if(tr.toWallet===w.id)b+=tr.amount;if(tr.fromWallet===w.id)b-=tr.amount;}
  }
  return b;
}
function monthExpense(ym){return state.txs.filter(tr=>tr.type==='expense'&&monthKey(tr.date)===ym).reduce((s,tr)=>s+tr.amount,0);}
function monthExpenseByCat(ym,catId){return state.txs.filter(tr=>tr.type==='expense'&&tr.cat===catId&&monthKey(tr.date)===ym).reduce((s,tr)=>s+tr.amount,0);}

/* ===== Filtering ===== */
function applyFilters(){
  const f=state.filter;
  return state.txs.filter(tr=>{
    if(f.type!=='all'&&tr.type!==f.type)return false;
    if(f.cat!=='all'&&tr.cat!==f.cat)return false;
    if(f.wallet!=='all'&&tr.walletId!==f.wallet&&tr.fromWallet!==f.wallet&&tr.toWallet!==f.wallet)return false;
    if(f.from&&(tr.date||'')<f.from)return false;
    if(f.to&&(tr.date||'')>f.to)return false;
    if(f.q){const q=f.q.toLowerCase();if(!(tr.desc||'').toLowerCase().includes(q))return false;}
    return true;
  });
}

/* ===== Add / delete transaction ===== */
function addTx(){
  if(!currentUser)return;
  const desc=$('#descInput').value.trim();
  const amount=num($('#amtInput').value);
  const date=datePicker.get('dateInput')||todayISO();
  const walletId=$('#walletInput').value||'';
  if(amount<=0){toast(t('toast.invalidAmount'),'warn');shake($('#amtInput'));return;}
  const type=state.txType;
  $('#descInput').value='';$('#amtInput').value='';
  toast((type==='income'?'📈':'📉')+' '+t('toast.added',{amt:fmt(amount)}));
  addDoc(col(currentUser.uid,'transactions'),{type,cat:state.cat,desc,amount,date,walletId,createdAt:serverTimestamp()})
    .then(()=>{if(type==='expense')checkBudgetWarning(date);})
    .catch(e=>{console.error(e);toast(t('toast.saveFail',{code:e.code}),'danger');});
}
async function removeTx(tr){
  if(!currentUser)return;
  const label=tr.type==='transfer'?t('tx.transfer'):(tr.desc||catInfo(tr.type,tr.cat).name);
  const ok=await confirmDialog(t('confirm.deleteTxMsg',{name:label}),{title:t('confirm.deleteTxTitle')});
  if(!ok)return;
  try{await deleteDoc(doc(db,'users',currentUser.uid,'transactions',tr.id));toast(t('toast.deletedTx'));}
  catch(e){console.error(e);toast(t('toast.deleteFail'),'danger');}
}

function checkBudgetWarning(date){
  if(!state.budget.total||monthKey(date)!==thisMonth())return;
  const spent=monthExpense(thisMonth());const limit=state.budget.total;
  const pct=spent/limit*100;
  if(spent>limit)toast(t('toast.budgetOver',{spent:fmt(spent),limit:fmt(limit)}),'danger');
  else if(pct>=80)toast(t('toast.budgetNear',{pct:Math.round(pct)}),'warn');
}

/* ===== Render: stats ===== */
function animateNumber(el,to){
  const from=parseFloat(el.dataset.v||0);
  if(from===to){el.textContent=fmt(to);return;}
  el.dataset.v=to;
  const dur=600,start=performance.now();
  function step(now){const p=Math.min((now-start)/dur,1);const e=1-Math.pow(1-p,3);el.textContent=fmt(from+(to-from)*e);if(p<1)requestAnimationFrame(step);}
  requestAnimationFrame(step);
}
function renderStats(){
  const inc=state.txs.filter(tr=>tr.type==='income').reduce((s,tr)=>s+tr.amount,0);
  const exp=state.txs.filter(tr=>tr.type==='expense').reduce((s,tr)=>s+tr.amount,0);
  const bal=state.wallets.reduce((s,w)=>s+walletBalance(w),0);
  animateNumber($('#balanceVal'),bal);
  animateNumber($('#incomeVal'),inc);
  animateNumber($('#expenseVal'),exp);
  $('#balanceSub').textContent=t('stat.walletsN',{n:state.wallets.length})+' • '+(bal>=0?t('stat.stable'):t('stat.negative'));
  $('#incomeSub').textContent=t('stat.txCount',{n:state.txs.filter(tr=>tr.type==='income').length});
  $('#expenseSub').textContent=t('stat.txCount',{n:state.txs.filter(tr=>tr.type==='expense').length});
  // per-wallet breakdown
  const inner=$('#walletBreakInner'), toggle=$('#walletToggle');
  if(inner){
    if(!state.wallets.length){
      inner.innerHTML=`<div class="hint" style="padding:6px 0">${t('stat.noWallets')}</div>`;
      if(toggle)toggle.style.display='none';
    }else{
      if(toggle)toggle.style.display='';
      const maxAbs=Math.max(1,...state.wallets.map(w=>Math.abs(walletBalance(w))));
      inner.innerHTML=state.wallets.map(w=>{
        const b=walletBalance(w), c=WALLET_COLORS[w.icon]||'#7c5cff', pct=Math.round(Math.abs(b)/maxAbs*100);
        return `<div class="wb-row">
          <div class="wb-ic" style="background:${c}22;color:${c}">${w.icon}</div>
          <div class="wb-info"><div class="wb-name">${escapeHtml(w.name)}</div>
            <div class="wb-bar"><i style="width:${pct}%;background:${c}"></i></div></div>
          <div class="wb-amt" style="color:${b>=0?'#fff':'var(--red)'}">${fmt(b)}</div>
        </div>`;
      }).join('');
    }
  }
}

/* ===== Render: budget banner (dashboard) ===== */
function renderBudgetBanner(){
  const b=$('#budgetBanner');
  if(!state.budget.total){b.style.display='none';return;}
  b.style.display='block';
  const spent=monthExpense(thisMonth());const limit=state.budget.total;
  const pct=Math.min(spent/limit*100,100);const realPct=Math.round(spent/limit*100);
  $('#bgSpent').textContent=fmt(spent);$('#bgLimit').textContent=fmt(limit);
  $('#budgetPct').textContent=realPct+'%';
  const bar=$('#bgBar');bar.className='bg-bar'+(realPct>=100?' over':realPct>=80?' warn':'');
  $('#budgetPct').style.color=realPct>=100?'var(--red)':realPct>=80?'var(--amber)':'var(--green)';
  requestAnimationFrame(()=>{$('#bgFill').style.width=pct+'%';});
}

/* ===== Render: transaction list (filtered, grouped by day, divided by month) ===== */
function renderList(){
  const list=$('#txList');
  const txs=applyFilters();
  if(!txs.length){list.innerHTML=`<div class="empty"><div class="e">🪶</div>${t('list.empty')}<br>${t('list.emptyHint')}</div>`;return;}
  // group by month -> day
  const months=[],mMap={};
  txs.forEach(tr=>{
    const mk=monthKey(tr.date), dk=tr.date||'(no date)';
    let m=mMap[mk];if(!m){m=mMap[mk]={key:mk,days:[],dMap:{},items:[]};months.push(m);}
    m.items.push(tr);
    let d=m.dMap[dk];if(!d){d=m.dMap[dk]={key:dk,items:[]};m.days.push(d);}
    d.items.push(tr);
  });
  list.innerHTML='';let idx=0;
  months.forEach(m=>{
    const mNet=m.items.reduce((s,tr)=>s+(tr.type==='income'?tr.amount:tr.type==='expense'?-tr.amount:0),0);
    const mCol=collapsedMonths.has(m.key);
    const block=document.createElement('div');block.className='month-block';
    const mhdr=document.createElement('div');mhdr.className='month-divider'+(mCol?' collapsed':'');
    mhdr.innerHTML=`<span class="m-caret">▾</span><span class="m-name">${monthLabel(m.key)}</span>`
      +`<span class="m-cnt">${m.items.length} ${t('count.txShort')}</span>`
      +`<span class="m-net ${mNet>=0?'in':'out'}">${mNet>=0?'+':'−'}${fmt(Math.abs(mNet))}</span>`;
    block.appendChild(mhdr);
    const mbody=document.createElement('div');mbody.className='month-body'+(mCol?' collapsed':'');
    const mInner=document.createElement('div');mInner.className='mb-inner';mbody.appendChild(mInner);
    mhdr.onclick=()=>toggleCollapse(collapsedMonths,m.key,mhdr,mbody);
    m.days.forEach(g=>{
      const net=g.items.reduce((s,tr)=>s+(tr.type==='income'?tr.amount:tr.type==='expense'?-tr.amount:0),0);
      const dh=dayHeaderInfo(g.key);
      const dCol=collapsedDays.has(g.key);
      const hdr=document.createElement('div');hdr.className='month-hdr'+(dCol?' collapsed':'');
      hdr.innerHTML=`<div class="mt"><span class="day-caret">▾</span> ${dh.tag?`<span class="rel">${dh.tag}</span>`:'📅'} <span class="wd">${dh.wd}</span> ${dh.dd} <span class="cnt">${g.items.length} ${t('count.txShort')}</span></div>
        <div class="net ${net>=0?'in':'out'}">${net>=0?'+':'−'}${fmt(Math.abs(net))}</div>`;
      mInner.appendChild(hdr);
      const dayWrap=document.createElement('div');dayWrap.className='day-items'+(dCol?' collapsed':'');
      const inner=document.createElement('div');inner.className='di-inner';dayWrap.appendChild(inner);
      hdr.onclick=()=>toggleCollapse(collapsedDays,g.key,hdr,dayWrap);
      g.items.forEach(tr=>{
        const el=document.createElement('div');el.className='tx';el.style.animationDelay=(idx++*0.02)+'s';
        let emo,title,sub,amtCls,amtTxt;
        if(tr.type==='transfer'){
          emo='🔄';title=escapeHtml(tr.desc)||t('tx.transfer');
          sub=`${walletName(tr.fromWallet)} → ${walletName(tr.toWallet)}`;
          amtCls='tr';amtTxt=fmt(tr.amount);
        }else{
          const ci=catInfo(tr.type,tr.cat);emo=ci.emo;title=escapeHtml(tr.desc)||ci.name;
          sub=`${ci.name}`;amtCls=tr.type==='income'?'in':'out';
          amtTxt=(tr.type==='income'?'+':'−')+fmt(tr.amount);
        }
        const wtag=tr.type!=='transfer'&&tr.walletId?`<span class="wtag">${walletName(tr.walletId)}</span>`:'';
        el.innerHTML=`<div class="emo">${emo}</div>
          <div class="info"><div class="t">${title}</div><div class="d">${sub} ${wtag}</div></div>
          <div class="amt ${amtCls}">${amtTxt}</div>
          <div class="act"><button class="edit" title="${t('tt.edit')}">✎</button><button class="del" title="${t('tt.delete')}">✕</button></div>`;
        el.querySelector('.edit').onclick=()=>openTxEdit(tr);
        el.querySelector('.del').onclick=()=>removeTx(tr);
        inner.appendChild(el);
      });
      mInner.appendChild(dayWrap);
    });
    block.appendChild(mbody);
    list.appendChild(block);
  });
}
let collapsedDays=new Set(), collapsedMonths=new Set();
function toggleCollapse(set,key,hdr,wrap){
  if(set.has(key)){set.delete(key);hdr.classList.remove('collapsed');wrap.classList.remove('collapsed');}
  else{set.add(key);hdr.classList.add('collapsed');wrap.classList.add('collapsed');}
}

/* ===== Render: chart (based on filtered expenses) ===== */
function renderChart(){
  const exp=applyFilters().filter(tr=>tr.type==='expense');
  const totals={};
  exp.forEach(tr=>{const ci=catInfo('expense',tr.cat);totals[ci.name]=(totals[ci.name]||0)+tr.amount;});
  const labels=Object.keys(totals),data=Object.values(totals);
  const total=data.reduce((a,b)=>a+b,0);
  $('#chartTotal').textContent=fmt(total);
  const anyFilter=state.filter.q||state.filter.type!=='all'||state.filter.cat!=='all'||state.filter.wallet!=='all'||state.filter.from||state.filter.to;
  $('#chartScope').textContent=anyFilter?t('chart.byFilter'):t('chart.all');
  const legend=$('#legend');legend.innerHTML='';
  labels.forEach((l,i)=>{const pc=total?Math.round(data[i]/total*100):0;
    const el=document.createElement('div');el.className='leg';
    el.innerHTML=`<span class="sw" style="background:${COLORS[i%COLORS.length]}"></span><span class="nm">${l}</span><span class="pc">${pc}%</span>`;
    legend.appendChild(el);});
  if(!labels.length)legend.innerHTML=`<div style="color:var(--txt-dim);font-size:13px;text-align:center;padding:8px">${t('chart.noData')}</div>`;
  const cfg={type:'doughnut',data:{labels,datasets:[{data,backgroundColor:COLORS,borderWidth:0,hoverOffset:10,borderRadius:6,spacing:2}]},
    options:{cutout:'72%',plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>` ${c.label}: ${fmt(c.raw)}`},backgroundColor:'rgba(20,26,53,.95)',padding:12,cornerRadius:10,titleColor:'#fff',bodyColor:'#cfd6f5'}},animation:{animateScale:true,animateRotate:true,duration:700}}};
  if(chart){chart.data=cfg.data;chart.update('none');}else chart=new Chart($('#chart'),cfg);
}

/* ===== Render: wallets ===== */
function renderWallets(){
  const grid=$('#walletGrid');grid.innerHTML='';
  if(!state.wallets.length){grid.innerHTML=`<div class="hint">${t('wallets.empty')}</div>`;}
  state.wallets.forEach(w=>{
    const bal=walletBalance(w);const c=WALLET_COLORS[w.icon]||'#7c5cff';
    const el=document.createElement('div');el.className='glass wallet';
    el.innerHTML=`<div class="wglow" style="background:${c}"></div>
      <button class="wedit" title="${t('tt.editWallet')}">✎</button>
      <button class="wdel" title="${t('tt.deleteWallet')}">✕</button>
      <div class="wic" style="background:${c}22;color:${c}">${w.icon}</div>
      <div class="wn">${escapeHtml(w.name)}</div>
      <div class="wb" style="color:${bal>=0?'#fff':'var(--red)'}">${fmt(bal)}</div>`;
    el.querySelector('.wedit').onclick=()=>openWalletEdit(w);
    el.querySelector('.wdel').onclick=()=>removeWallet(w);
    grid.appendChild(el);
  });
  // populate wallet selectors
  const opts=state.wallets.map(w=>`<option value="${w.id}">${w.icon} ${escapeHtml(w.name)}</option>`).join('');
  ['#walletInput','#recWallet','#trFrom','#trTo','#etWallet','#etFrom','#etTo'].forEach(sel=>{
    const e=$(sel);if(!e)return;const cur=e.value;e.innerHTML=opts;
    if([...e.options].some(o=>o.value===cur))e.value=cur;
  });
  if(state.wallets.length>1&&!$('#trTo').value)$('#trTo').selectedIndex=1;
  // wallet filter dropdown
  const wf=$('#walletFilter');const curWf=wf.value;
  wf.innerHTML=`<option value="all">${t('filter.allWallets')}</option>`+opts;wf.value=curWf||'all';
}
async function removeWallet(w){
  const ok=await confirmDialog(t('confirm.deleteWalletMsg',{name:w.name}),{title:t('confirm.deleteWalletTitle')});
  if(!ok)return;
  try{await deleteDoc(doc(db,'users',currentUser.uid,'wallets',w.id));toast(t('toast.walletDeleted'));}
  catch(e){console.error(e);toast(t('toast.deleteFail'),'danger');}
}

/* ----- Edit wallet ----- */
let editWalletId=null, ewIcon='💵';
function renderEwIcons(){
  const wrap=$('#ewIcons');wrap.innerHTML='';
  WALLET_ICONS.forEach(ic=>{const el=document.createElement('div');el.className='cat'+(ic===ewIcon?' sel':'');
    el.innerHTML=`<span class="emo">${ic}</span>`;el.onclick=()=>{ewIcon=ic;renderEwIcons();};wrap.appendChild(el);});
}
function openWalletEdit(w){
  editWalletId=w.id;ewIcon=w.icon||'💵';
  $('#ewName').value=w.name;
  $('#ewInit').value=w.initial?Number(w.initial).toLocaleString('en-US'):'';
  renderEwIcons();$('#walletModal').classList.add('show');
}
async function saveWalletEdit(){
  if(!editWalletId)return;
  const name=$('#ewName').value.trim();const initial=num($('#ewInit').value);
  if(!name){toast(t('toast.enterWalletName'),'warn');shake($('#ewName'));return;}
  try{
    await updateDoc(doc(db,'users',currentUser.uid,'wallets',editWalletId),{name,icon:ewIcon,initial});
    $('#walletModal').classList.remove('show');toast(t('toast.walletUpdated'));
  }catch(e){console.error(e);toast(t('toast.updateFail'),'danger');}
}

/* ----- Edit transaction ----- */
let editTxId=null, etType='expense', etCat='food';
function renderEtCats(){buildCats('#etCats',etType,etCat,id=>{etCat=id;renderEtCats();});}
function openTxEdit(tr){
  editTxId=tr.id;
  const isTr=tr.type==='transfer';
  $('#etNormal').style.display=isTr?'none':'';
  $('#etTransfer').style.display=isTr?'':'none';
  $('#etWalletField').style.display=isTr?'none':'';
  $('#etDesc').value=tr.desc||'';
  $('#etAmt').value=tr.amount?Number(tr.amount).toLocaleString('en-US'):'';
  datePicker.set('etDate',tr.date||todayISO());
  if(isTr){
    $('#etFrom').value=tr.fromWallet||'';$('#etTo').value=tr.toWallet||'';
  }else{
    etType=(tr.type==='income')?'income':'expense';
    etCat=tr.cat||(CATS[etType][0]||{}).id||'';
    $('#etSeg').classList.toggle('exp',etType==='income');
    $('#etSeg').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.type===etType));
    renderEtCats();
    $('#etWallet').value=tr.walletId||'';
  }
  syncCsels();
  $('#editTxModal').classList.add('show');
}
async function saveTxEdit(){
  if(!editTxId||!currentUser)return;
  const amount=num($('#etAmt').value);
  if(amount<=0){toast(t('toast.invalidAmount'),'warn');shake($('#etAmt'));return;}
  const date=datePicker.get('etDate')||todayISO();
  const desc=$('#etDesc').value.trim();
  const isTr=$('#etTransfer').style.display!=='none';
  let data;
  if(isTr){
    const from=$('#etFrom').value,to=$('#etTo').value;
    if(!from||!to||from===to){toast(t('toast.pickTwoWallets'),'warn');return;}
    data={amount,date,desc,fromWallet:from,toWallet:to};
  }else{
    data={type:etType,cat:etCat,amount,date,desc,walletId:$('#etWallet').value||''};
  }
  try{
    await updateDoc(doc(db,'users',currentUser.uid,'transactions',editTxId),data);
    $('#editTxModal').classList.remove('show');toast(t('toast.txUpdated'));
    if(!isTr&&etType==='expense')checkBudgetWarning(date);
  }catch(e){console.error(e);toast(t('toast.updateFail'),'danger');}
}

/* ----- Confirm dialog (thay window.confirm) ----- */
let confirmResolver=null;
function confirmDialog(msg,opt){
  opt=opt||{};
  $('#confirmTitle').textContent=opt.title||t('confirm.title');
  $('#confirmMsg').textContent=msg;
  const okBtn=$('#confirmOk');okBtn.textContent=opt.ok||t('btn.delete');
  okBtn.style.background=opt.danger===false?'':'linear-gradient(135deg,var(--red),#e0476a)';
  $('#confirmModal').classList.add('show');
  return new Promise(res=>{confirmResolver=res;});
}
function resolveConfirm(v){$('#confirmModal').classList.remove('show');if(confirmResolver){confirmResolver(v);confirmResolver=null;}}
async function addWallet(){
  const name=$('#wName').value.trim();const initial=num($('#wInit').value);
  if(!name){toast(t('toast.enterWalletName'),'warn');shake($('#wName'));return;}
  try{
    await addDoc(col(currentUser.uid,'wallets'),{name,icon:state.wIcon,initial,order:state.wallets.length,createdAt:serverTimestamp()});
    $('#wName').value='';$('#wInit').value='';toast(t('toast.walletCreated',{name}));
  }catch(e){console.error(e);toast(t('toast.walletCreateFail'),'danger');}
}

/* ===== Transfer ===== */
async function doTransfer(){
  const from=$('#trFrom').value,to=$('#trTo').value;
  const amount=num($('#trAmt').value);const date=datePicker.get('trDate')||todayISO();
  const desc=$('#trDesc').value.trim();
  if(from===to){toast(t('toast.pickTwoWallets'),'warn');return;}
  if(amount<=0){toast(t('toast.invalidAmount'),'warn');shake($('#trAmt'));return;}
  try{
    await addDoc(col(currentUser.uid,'transactions'),{type:'transfer',amount,fromWallet:from,toWallet:to,desc,date,createdAt:serverTimestamp()});
    closeTransfer();toast(t('toast.transferred',{amt:fmt(amount)}));
  }catch(e){console.error(e);toast(t('toast.transferFail'),'danger');}
}
function openTransfer(){if(state.wallets.length<2){toast(t('toast.need2Wallets'),'warn');return;}$('#trAmt').value='';$('#trDesc').value='';datePicker.set('trDate',todayISO());$('#transferModal').classList.add('show');}
function closeTransfer(){$('#transferModal').classList.remove('show');}

/* ===== Recurring ===== */
function renderRecurring(){
  const list=$('#recurringList');list.innerHTML='';
  if(!state.recurring.length){list.innerHTML=`<div class="hint">${t('rec.empty')}</div>`;return;}
  state.recurring.slice().sort((a,b)=>(a.day||1)-(b.day||1)).forEach(r=>{
    const ci=catInfo(r.type,r.cat);
    const el=document.createElement('div');el.className='item-row';
    const meta=`${ci.name} • ${t('rec.monthlyOn',{d:r.day||1})} • ${walletName(r.walletId)}${r.lastMonth?' • '+t('rec.lastRun',{m:monthLabel(r.lastMonth)}):''}`;
    el.innerHTML=`<div class="emo">${ci.emo}</div>
      <div class="info"><div class="t">${escapeHtml(r.desc)||ci.name}</div><div class="d">${meta}</div></div>
      <div class="amt ${r.type==='income'?'in':'out'}">${r.type==='income'?'+':'−'}${fmt(r.amount)}</div>
      <div class="ctl"><div class="switch ${r.active?'on':''}" title="${t('tt.toggle')}"></div><button class="del">🗑</button></div>`;
    el.querySelector('.switch').onclick=()=>toggleRecurring(r);
    el.querySelector('.del').onclick=()=>removeRecurring(r);
    list.appendChild(el);
  });
}
async function addRecurring(){
  const desc=$('#recDesc').value.trim();const amount=num($('#recAmt').value);
  const day=parseInt($('#recDay').value,10)||1;const walletId=$('#recWallet').value||'';
  if(amount<=0){toast(t('toast.invalidAmount'),'warn');shake($('#recAmt'));return;}
  try{
    await addDoc(col(currentUser.uid,'recurring'),{type:state.recType,cat:state.recCat,desc,amount,day,walletId,active:true,lastMonth:'',createdAt:serverTimestamp()});
    $('#recDesc').value='';$('#recAmt').value='';toast(t('toast.recCreated'));
  }catch(e){console.error(e);toast(t('toast.recCreateFail'),'danger');}
}
async function toggleRecurring(r){try{await updateDoc(doc(db,'users',currentUser.uid,'recurring',r.id),{active:!r.active});}catch(e){console.error(e);}}
async function removeRecurring(r){const ok=await confirmDialog(t('confirm.deleteRecMsg'),{title:t('confirm.deleteRecTitle')});if(!ok)return;try{await deleteDoc(doc(db,'users',currentUser.uid,'recurring',r.id));toast(t('toast.deleted'));}catch(e){console.error(e);}}

/* ===== Budget tab ===== */
function renderBudget(){
  if(document.activeElement!==$('#budgetTotal'))$('#budgetTotal').value=state.budget.total?Number(state.budget.total).toLocaleString('en-US'):'';
  const wrap=$('#catBudgetList');if(!wrap)return;wrap.innerHTML='';
  CATS.expense.forEach(c=>{
    const lim=state.budget.perCat[c.id]||0;const spent=monthExpenseByCat(thisMonth(),c.id);
    const pct=lim?Math.min(spent/lim*100,100):0;const realPct=lim?Math.round(spent/lim*100):0;
    const cls=realPct>=100?'over':realPct>=80?'warn':'';
    const note=lim?t('budget.spentOfLimit',{spent:fmt(spent),limit:fmt(lim)}):t('budget.spentOf',{spent:fmt(spent)});
    const row=document.createElement('div');row.className='budget-cat-row';
    row.innerHTML=`<div style="flex:1">
        <div class="nm">${c.emo} ${catName(c)} <span style="color:var(--txt-dim);font-weight:500;font-size:12px">${note}</span></div>
        <div class="mini-bar"><div class="f ${cls}" style="width:${pct}%"></div></div>
      </div>
      <input type="text" inputmode="numeric" data-cat="${c.id}" placeholder="∞" value="${lim?Number(lim).toLocaleString('en-US'):''}" />`;
    const inp=row.querySelector('input');attachThousands(inp);
    inp.addEventListener('change',()=>saveCatBudget(c.id,num(inp.value)));
    wrap.appendChild(row);
  });
}
async function saveBudgetTotal(){
  const total=num($('#budgetTotal').value);
  try{await setDoc(doc(db,'users',currentUser.uid,'settings','budget'),{total},{merge:true});toast(t('toast.budgetSaved'));}
  catch(e){console.error(e);toast(t('toast.budgetSaveFail'),'danger');}
}
async function saveCatBudget(catId,val){
  try{await setDoc(doc(db,'users',currentUser.uid,'settings','budget'),{perCat:{[catId]:val}},{merge:true});toast(t('toast.catBudgetSaved'));}
  catch(e){console.error(e);}
}

/* ===== Category UI builders ===== */
function buildCats(wrapSel,type,selId,onPick){
  const wrap=$(wrapSel);if(!wrap)return;wrap.innerHTML='';
  CATS[type].forEach((c,i)=>{
    const el=document.createElement('div');el.className='cat'+(c.id===selId?' sel':'');
    el.innerHTML=`<span class="emo">${c.emo}</span>${catName(c)}`;
    el.onclick=()=>onPick(c.id);el.style.animation=`pop .3s ${i*0.03}s both`;
    wrap.appendChild(el);
  });
}
function renderFormCats(){buildCats('#cats',state.txType,state.cat,id=>{state.cat=id;renderFormCats();});}
function renderRecCats(){buildCats('#recCats',state.recType,state.recCat,id=>{state.recCat=id;renderRecCats();});}
function renderWalletIcons(){
  const wrap=$('#wIcons');wrap.innerHTML='';
  WALLET_ICONS.forEach(ic=>{
    const el=document.createElement('div');el.className='cat'+(ic===state.wIcon?' sel':'');
    el.innerHTML=`<span class="emo">${ic}</span>`;
    el.onclick=()=>{state.wIcon=ic;renderWalletIcons();};
    wrap.appendChild(el);
  });
}
function renderCatFilterOptions(){
  const sel=$('#catFilter');const cur=sel.value;
  const all=[...new Map([...CATS.expense,...CATS.income].map(c=>[c.id,c])).values()];
  sel.innerHTML=`<option value="all">${t('filter.allCats')}</option>`+all.map(c=>`<option value="${c.id}">${c.emo} ${catName(c)}</option>`).join('');
  sel.value=cur||'all';
}

/* ===== Category management (add/edit/delete) ===== */
let catModalType='expense', catEditDocId=null, catEmoji='🍜';
function renderCatEmojis(){
  const wrap=$('#catEmojis');if(!wrap)return;wrap.innerHTML='';
  CAT_EMOJIS.forEach(ic=>{const el=document.createElement('div');el.className='cat'+(ic===catEmoji?' sel':'');
    el.innerHTML=`<span class="emo">${ic}</span>`;el.onclick=()=>{catEmoji=ic;renderCatEmojis();};wrap.appendChild(el);});
}
function setCatModalType(type){
  catModalType=type;
  $('#catSeg').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.type===type));
  $('#catSeg').classList.toggle('exp',type==='income');
}
function openCatAdd(type){
  catEditDocId=null;catEmoji=CAT_EMOJIS[0];
  $('#catModalTitle').textContent=t('cats.addTitle');
  $('#catNameInput').value='';$('#catSeg').style.display='';
  setCatModalType(type);renderCatEmojis();
  $('#catModal').classList.add('show');
  setTimeout(()=>$('#catNameInput').focus(),50);
}
function openCatEdit(c){
  catEditDocId=c.docId;catEmoji=c.emo||CAT_EMOJIS[0];
  $('#catModalTitle').textContent=t('cats.editTitle');
  $('#catNameInput').value=catName(c);$('#catSeg').style.display='none';
  setCatModalType(c.type);renderCatEmojis();
  $('#catModal').classList.add('show');
}
async function saveCat(){
  if(!currentUser)return;
  const name=$('#catNameInput').value.trim();
  if(!name){toast(t('cats.enterName'),'warn');shake($('#catNameInput'));return;}
  try{
    if(catEditDocId){
      await updateDoc(doc(db,'users',currentUser.uid,'categories',catEditDocId),{name,vi:name,en:name,emo:catEmoji});
      toast(t('toast.catUpdated'));
    }else{
      const cid='c'+Date.now().toString(36)+Math.floor(Math.random()*1000);
      const order=(CATS[catModalType]||[]).length;
      await addDoc(col(currentUser.uid,'categories'),{type:catModalType,cid,name,emo:catEmoji,order,createdAt:serverTimestamp()});
      toast(t('toast.catCreated'));
    }
    $('#catModal').classList.remove('show');
  }catch(e){console.error(e);toast(t('toast.catSaveFail'),'danger');}
}
async function deleteCat(c){
  const ok=await confirmDialog(t('confirm.deleteCatMsg',{name:catName(c)}),{title:t('confirm.deleteCatTitle')});
  if(!ok)return;
  try{await deleteDoc(doc(db,'users',currentUser.uid,'categories',c.docId));toast(t('toast.catDeleted'));}
  catch(e){console.error(e);toast(t('toast.deleteFail'),'danger');}
}
function renderCategoryManage(){
  ['expense','income'].forEach(type=>{
    const wrap=$(type==='expense'?'#expenseCatList':'#incomeCatList');if(!wrap)return;
    const list=CATS[type]||[];
    if(!list.length){wrap.innerHTML=`<div class="hint">${t('cats.empty')}</div>`;return;}
    wrap.innerHTML='';
    list.forEach(c=>{
      const el=document.createElement('div');el.className='item-row';
      el.innerHTML=`<div class="emo">${c.emo}</div>
        <div class="info"><div class="t">${escapeHtml(catName(c))}</div></div>
        <div class="ctl"><button class="edit">✎</button><button class="del">🗑</button></div>`;
      el.querySelector('.edit').onclick=()=>openCatEdit(c);
      el.querySelector('.del').onclick=()=>deleteCat(c);
      wrap.appendChild(el);
    });
  });
}
function buildRecDayOptions(){
  const sel=$('#recDay');const cur=sel.value;sel.innerHTML='';
  for(let d=1;d<=28;d++){const o=document.createElement('option');o.value=d;o.textContent=t('rec.dayLabel',{d});sel.appendChild(o);}
  if(cur)sel.value=cur;
}
function updateCollapseAllLabel(){
  const keys=[...new Set(applyFilters().map(tr=>monthKey(tr.date)))];
  const allCollapsed=keys.length&&keys.every(k=>collapsedMonths.has(k));
  $('#collapseAll').innerHTML=allCollapsed?t('list.expand'):t('list.collapse');
}

function renderAll(){renderStats();renderWallets();renderList();renderChart();renderBudgetBanner();syncCsels();}

function shake(el){el.style.animation='none';el.offsetHeight;el.style.animation='shake .4s';el.style.borderColor='var(--red)';setTimeout(()=>el.style.borderColor='',500);}

/* ===== CSV export ===== */
function exportCSV(){
  const txs=applyFilters();
  if(!txs.length){toast(t('toast.noExportData'),'warn');return;}
  const head=[t('csv.date'),t('csv.type'),t('csv.cat'),t('csv.desc'),t('csv.wallet'),t('csv.amount')];
  const typeLabel={income:t('chip.income'),expense:t('chip.expense'),transfer:t('chip.transfer')};
  const rows=txs.map(tr=>{
    let cat='',wallet='';
    if(tr.type==='transfer'){cat=t('tx.transfer');wallet=`${walletName(tr.fromWallet)} → ${walletName(tr.toWallet)}`;}
    else{cat=catInfo(tr.type,tr.cat).name;wallet=walletName(tr.walletId);}
    const amt=(tr.type==='expense'?'-':tr.type==='income'?'+':'')+tr.amount;
    return [tr.date,typeLabel[tr.type]||tr.type,cat,(tr.desc||''),wallet,amt];
  });
  const esc=v=>{v=String(v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
  const csv=[head,...rows].map(r=>r.map(esc).join(',')).join('\n');
  const blob=new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');
  a.href=url;a.download=`vi-thong-minh_${todayISO()}.csv`;a.click();
  URL.revokeObjectURL(url);toast(t('toast.exported',{n:txs.length}));
}

/* ===================== UI WIRING ===================== */
$('#dateInput').dataset.iso=todayISO();$('#trDate').dataset.iso=todayISO();
function placeWalletPop(){
  const btn=$('#walletToggle'),pop=$('#walletBreakdown');if(!pop.classList.contains('open'))return;
  const r=btn.getBoundingClientRect(),w=300,vw=document.documentElement.clientWidth;
  let left=r.left;if(left+w>vw-10)left=vw-w-10;if(left<10)left=10;
  pop.style.left=left+'px';pop.style.top=(r.bottom+8)+'px';
}
function closeWalletPop(){$('#walletToggle').classList.remove('open');$('#walletBreakdown').classList.remove('open');}
$('#walletToggle').onclick=e=>{
  e.stopPropagation();
  const open=$('#walletToggle').classList.toggle('open');
  $('#walletBreakdown').classList.toggle('open',open);
  if(open)placeWalletPop();
};
document.addEventListener('click',e=>{const pop=$('#walletBreakdown');if(pop.classList.contains('open')&&!pop.contains(e.target)&&e.target!==$('#walletToggle'))closeWalletPop();});
window.addEventListener('resize',closeWalletPop);
window.addEventListener('scroll',()=>{if($('#walletBreakdown').classList.contains('open'))placeWalletPop();},true);

// Theme picker
function placeThemePop(){
  const btn=$('#themeBtn'),pop=$('#themePop');if(!pop.classList.contains('open'))return;
  const r=btn.getBoundingClientRect(),w=248,vw=document.documentElement.clientWidth;
  let left=r.right-w;if(left+w>vw-10)left=vw-w-10;if(left<10)left=10;
  pop.style.left=left+'px';pop.style.top=(r.bottom+8)+'px';
}
function closeThemePop(){$('#themePop').classList.remove('open');}
$('#themeBtn').onclick=e=>{e.stopPropagation();const open=$('#themePop').classList.toggle('open');if(open){buildThemeGrid();placeThemePop();}};
document.addEventListener('click',e=>{const p=$('#themePop'),b=$('#themeBtn');if(p.classList.contains('open')&&!p.contains(e.target)&&!b.contains(e.target))closeThemePop();});
window.addEventListener('resize',closeThemePop);
window.addEventListener('scroll',()=>{if($('#themePop').classList.contains('open'))placeThemePop();},true);
buildThemeGrid();
buildRecDayOptions();
attachThousands($('#amtInput'));attachThousands($('#wInit'));attachThousands($('#recAmt'));attachThousands($('#trAmt'));attachThousands($('#budgetTotal'));
renderFormCats();renderRecCats();renderWalletIcons();renderCatFilterOptions();
document.querySelectorAll('.field select').forEach(enhanceSelect);syncCsels();

// Language
function paintLangSeg(){$$('#langSeg button').forEach(b=>b.classList.toggle('on',b.dataset.lang===lang));}
$$('#langSeg button').forEach(b=>b.onclick=()=>{if(b.dataset.lang!==lang)setLang(b.dataset.lang);});
$('#authLangLink').onclick=()=>setLang(lang==='vi'?'en':'vi');

// Tabs
function activateTab(name){
  const btn=$(`#tabs button[data-tab="${name}"]`);
  if(!btn)name='dash';
  state.tab=name;
  localStorage.setItem('vtm_tab',name);
  $$('#tabs button').forEach(x=>x.classList.toggle('on',x.dataset.tab===name));
  $$('.tab-page').forEach(p=>p.classList.remove('on'));$('#page-'+name).classList.add('on');
  if(name==='budget')renderBudget();
  if(name==='cats')renderCategoryManage();
}
$$('#tabs button').forEach(b=>b.onclick=()=>activateTab(b.dataset.tab));
// Khôi phục tab đã xem trước khi F5
activateTab(localStorage.getItem('vtm_tab')||'dash');

// Form type segment
$('#seg').querySelectorAll('button').forEach(b=>b.onclick=()=>{
  state.txType=b.dataset.type;state.cat=(CATS[state.txType][0]||{}).id||'';
  $('#seg').querySelectorAll('button').forEach(x=>x.classList.remove('active'));b.classList.add('active');
  $('#seg').classList.toggle('exp',state.txType==='income');renderFormCats();
});
// Recurring type segment
$('#recSeg').querySelectorAll('button').forEach(b=>b.onclick=()=>{
  state.recType=b.dataset.type;state.recCat=(CATS[state.recType][0]||{}).id||'';
  $('#recSeg').querySelectorAll('button').forEach(x=>x.classList.remove('active'));b.classList.add('active');
  $('#recSeg').classList.toggle('exp',state.recType==='income');renderRecCats();
});

// Filters
let searchTm;
$('#searchInput').addEventListener('input',e=>{
  const v=e.target.value.trim();
  clearTimeout(searchTm);
  searchTm=setTimeout(()=>{state.filter.q=v;renderList();renderChart();},140);
});
$('#typeChips').querySelectorAll('button').forEach(b=>b.onclick=()=>{
  state.filter.type=b.dataset.f;$('#typeChips').querySelectorAll('button').forEach(x=>x.classList.remove('on'));b.classList.add('on');renderList();renderChart();
});
$('#catFilter').addEventListener('change',e=>{state.filter.cat=e.target.value;renderList();renderChart();});
$('#walletFilter').addEventListener('change',e=>{state.filter.wallet=e.target.value;renderList();renderChart();});
// Custom date pickers (fromDate/toDate update filter live)
datePicker.attach($('#fromDate'),iso=>{state.filter.from=iso;clearDatePresets();renderList();renderChart();});
datePicker.attach($('#toDate'),iso=>{state.filter.to=iso;clearDatePresets();renderList();renderChart();});
datePicker.attach($('#dateInput'));
datePicker.attach($('#trDate'));

// Date range presets (chips)
function rangeFor(key){
  const now=new Date();const y=now.getFullYear(),m=now.getMonth();
  switch(key){
    case 'today':return [isoOf(now),isoOf(now)];
    case '7d':{const f=new Date(now);f.setDate(f.getDate()-6);return [isoOf(f),isoOf(now)];}
    case '30d':{const f=new Date(now);f.setDate(f.getDate()-29);return [isoOf(f),isoOf(now)];}
    case 'month':return [isoOf(new Date(y,m,1)),isoOf(new Date(y,m+1,0))];
    case 'lastmonth':return [isoOf(new Date(y,m-1,1)),isoOf(new Date(y,m,0))];
    case 'year':return [isoOf(new Date(y,0,1)),isoOf(new Date(y,11,31))];
  }
  return ['',''];
}
function clearDatePresets(){$('#datePresets').querySelectorAll('button').forEach(x=>x.classList.remove('on'));}
$('#datePresets').querySelectorAll('button').forEach(b=>b.onclick=()=>{
  const wasOn=b.classList.contains('on');
  clearDatePresets();
  if(wasOn){state.filter.from='';state.filter.to='';datePicker.set('fromDate','');datePicker.set('toDate','');}
  else{const [f,t2]=rangeFor(b.dataset.range);b.classList.add('on');state.filter.from=f;state.filter.to=t2;datePicker.set('fromDate',f);datePicker.set('toDate',t2);}
  renderList();renderChart();
});
$('#clearFilter').onclick=()=>{
  state.filter={q:'',type:'all',cat:'all',wallet:'all',from:'',to:''};
  $('#searchInput').value='';$('#catFilter').value='all';$('#walletFilter').value='all';datePicker.set('fromDate','');datePicker.set('toDate','');
  $('#typeChips').querySelectorAll('button').forEach(x=>x.classList.remove('on'));$('#typeChips').querySelector('[data-f=all]').classList.add('on');
  clearDatePresets();syncCsels();
  renderList();renderChart();
};
$('#exportBtn').onclick=exportCSV;

// Add transaction (with ripple)
$('#addBtn').onclick=function(e){
  const r=document.createElement('span');r.className='ripple';const rect=this.getBoundingClientRect();const d=Math.max(rect.width,rect.height);
  r.style.width=r.style.height=d+'px';r.style.left=(e.clientX-rect.left-d/2)+'px';r.style.top=(e.clientY-rect.top-d/2)+'px';
  this.appendChild(r);setTimeout(()=>r.remove(),600);addTx();
};
$('#amtInput').addEventListener('keydown',e=>{if(e.key==='Enter')$('#addBtn').click();});
$('#descInput').addEventListener('keydown',e=>{if(e.key==='Enter')$('#amtInput').focus();});

// Wallets
$('#addWalletBtn').onclick=addWallet;
$('#transferBtn').onclick=openTransfer;
$('#trCancel').onclick=closeTransfer;
$('#trConfirm').onclick=doTransfer;
$('#transferModal').addEventListener('click',e=>{if(e.target===$('#transferModal'))closeTransfer();});

// Edit wallet modal
attachThousands($('#ewInit'));
$('#ewCancel').onclick=()=>$('#walletModal').classList.remove('show');
$('#ewSave').onclick=saveWalletEdit;
$('#walletModal').addEventListener('click',e=>{if(e.target===$('#walletModal'))$('#walletModal').classList.remove('show');});

// Edit transaction modal
attachThousands($('#etAmt'));datePicker.attach($('#etDate'));
$('#etSeg').querySelectorAll('button').forEach(b=>b.onclick=()=>{
  etType=b.dataset.type;etCat=(CATS[etType][0]||{}).id||'';
  $('#etSeg').querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));
  $('#etSeg').classList.toggle('exp',etType==='income');renderEtCats();
});
$('#etCancel').onclick=()=>$('#editTxModal').classList.remove('show');
$('#etSave').onclick=saveTxEdit;
$('#editTxModal').addEventListener('click',e=>{if(e.target===$('#editTxModal'))$('#editTxModal').classList.remove('show');});

// Collapse / expand all months
$('#collapseAll').onclick=()=>{
  const keys=[...new Set(applyFilters().map(tr=>monthKey(tr.date)))];
  const allCollapsed=keys.length&&keys.every(k=>collapsedMonths.has(k));
  if(allCollapsed)collapsedMonths.clear();else keys.forEach(k=>collapsedMonths.add(k));
  $('#collapseAll').innerHTML=allCollapsed?t('list.collapse'):t('list.expand');
  renderList();
};

// Confirm modal
$('#confirmCancel').onclick=()=>resolveConfirm(false);
$('#confirmOk').onclick=()=>resolveConfirm(true);
$('#confirmModal').addEventListener('click',e=>{if(e.target===$('#confirmModal'))resolveConfirm(false);});

// Recurring
$('#addRecBtn').onclick=addRecurring;

// Budget
$('#saveBudgetBtn').onclick=saveBudgetTotal;

// Categories
$('#addExpenseCatBtn').onclick=()=>openCatAdd('expense');
$('#addIncomeCatBtn').onclick=()=>openCatAdd('income');
$('#catSeg').querySelectorAll('button').forEach(b=>b.onclick=()=>setCatModalType(b.dataset.type));
$('#catCancel').onclick=()=>$('#catModal').classList.remove('show');
$('#catSave').onclick=saveCat;
$('#catNameInput').addEventListener('keydown',e=>{if(e.key==='Enter')saveCat();});
$('#catModal').addEventListener('click',e=>{if(e.target===$('#catModal'))$('#catModal').classList.remove('show');});

// Logout
$('#logoutBtn').onclick=()=>{if(auth)signOut(auth);};

/* ===== Auth UI ===== */
let signupMode=false;
function authError(e){const k='err.'+e.code;const m=(I18N[lang][k]||I18N.vi[k]);$('#authErr').textContent='⚠️ '+(m||e.message||t('err.generic'));}
function setAuthTexts(){
  $('#authTitle').textContent=signupMode?t('auth.signupTitle'):t('auth.welcome');
  $('#authSub').textContent=signupMode?t('auth.signupSub'):t('auth.welcomeSub');
  $('#authSubmit').textContent=signupMode?t('auth.signup'):t('auth.login');
  $('#authToggle').innerHTML=signupMode
    ?`${t('auth.hasAccount')} <a id="toggleLink">${t('auth.loginNow')}</a>`
    :`${t('auth.noAccount')} <a id="toggleLink">${t('auth.signupNow')}</a>`;
  $('#toggleLink').onclick=toggleAuthMode;
}
function toggleAuthMode(){signupMode=!signupMode;setAuthTexts();$('#authErr').textContent='';}
$('#toggleLink').onclick=toggleAuthMode;
$('#authForm').addEventListener('submit',async e=>{
  e.preventDefault();if(!auth)return;
  const email=$('#email').value.trim(),pw=$('#password').value;const btn=$('#authSubmit');btn.disabled=true;$('#authErr').textContent='';
  try{if(signupMode)await createUserWithEmailAndPassword(auth,email,pw);else await signInWithEmailAndPassword(auth,email,pw);}
  catch(err){authError(err);}finally{btn.disabled=false;}
});
$('#googleBtn').onclick=async()=>{if(!auth)return;$('#authErr').textContent='';try{await signInWithPopup(auth,new GoogleAuthProvider());}catch(err){authError(err);}};

// Initial language paint
applyLang();
