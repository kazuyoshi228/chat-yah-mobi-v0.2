/**
 * labels — ウィジェット内の静的な多言語ラベル辞書
 *
 * Firestore由来の動的テキスト（フローノード等）は lib/i18nJson.parseI18n、
 * ここは「ウィジェットUI自体」の固定文言（6言語）。
 */

/** 問い合わせフォーム（販売サイト）。AIが解決できない時の人間ハンドオフ先。 */
export const CONTACT_FORM_URL = "https://yah.mobi/contact";

/** chat の言語コード → 販売サイト(/contact)の言語コード（サイトは en/ko/zh-CN/zh-TW/th のみ） */
const SITE_LANG: Record<string, string> = { ko: "ko", th: "th", zh: "zh-CN" };

/**
 * /contact のURLを組み立てる。言語＋（あれば）カテゴリ/注文IDをプリフィルとして引き継ぐ。
 * 販売側 ContactSection が ?category=&orderId=&lang= を解釈する（batch2-B）。
 */
export function buildContactUrl(
  lang: string,
  ctx?: { category?: string | null; orderId?: string | null }
): string {
  const params = new URLSearchParams();
  const siteLang = SITE_LANG[lang];
  if (siteLang) params.set("lang", siteLang);
  if (ctx?.category) params.set("category", ctx.category);
  if (ctx?.orderId) params.set("orderId", ctx.orderId);
  const qs = params.toString();
  return qs ? `${CONTACT_FORM_URL}?${qs}` : CONTACT_FORM_URL;
}

/** マイページ（QR再取得・アカウント系の自己解決先） */
export const MYPAGE_URL = "https://yah.mobi/mypage";

type LabelMap = Record<string, string>;

const L = (
  ja: string,
  en: string,
  zh: string,
  ko: string,
  th: string,
  vi: string
): LabelMap => ({ ja, en, zh, ko, th, vi });

/** 言語→ラベル解決（en フォールバック） */
export const pick = (map: LabelMap, lang: string): string =>
  map[lang] ?? map.en;

export const CONTACT_LABEL = L(
  "お問い合わせフォームを開く",
  "Open the contact form",
  "打开咨询表单",
  "문의 양식 열기",
  "เปิดแบบฟอร์มติดต่อ",
  "Mở biểu mẫu liên hệ"
);

/** AIチャットへのフォールバック導線 */
export const AI_CHAT_LABEL = L(
  "AIサポートに質問する",
  "Ask AI Support",
  "向AI支持提问",
  "AI 지원에 질문하기",
  "ถาม AI Support",
  "Hỏi AI Support"
);

/** QR案内（再取得はマイページで自己解決・chat は案内のみ） */
export const QR_LABELS = {
  guide: L(
    "QRコードは、ご購入時のアカウントでマイページにログインすると、いつでも確認・再取得できます。",
    "You can view and retrieve your QR code anytime by logging in to My Page with the account used for your purchase.",
    "使用购买时的账号登录“我的页面”，即可随时查看和重新获取二维码。",
    "구매 시 사용한 계정으로 마이페이지에 로그인하면 언제든지 QR 코드를 확인·재취득할 수 있습니다.",
    "คุณสามารถดูและรับ QR Code ได้ทุกเมื่อโดยเข้าสู่ระบบ My Page ด้วยบัญชีที่ใช้ตอนซื้อ",
    "Bạn có thể xem và lấy lại mã QR bất cứ lúc nào bằng cách đăng nhập My Page với tài khoản đã dùng khi mua."
  ),
  openMyPage: L(
    "マイページを開く",
    "Open My Page",
    "打开我的页面",
    "마이페이지 열기",
    "เปิด My Page",
    "Mở My Page"
  ),
  cantFind: L(
    "見つからない場合はチャットで相談",
    "Can't find it? Ask chat support",
    "找不到？咨询聊天支持",
    "찾을 수 없나요? 채팅으로 문의",
    "หาไม่เจอ? สอบถามผ่านแชท",
    "Không tìm thấy? Hỏi hỗ trợ qua chat"
  ),
};

/** ログイン/新規登録パネル */
export const AUTH_LABELS = {
  signin: L("ログイン", "Sign in", "登录", "로그인", "เข้าสู่ระบบ", "Đăng nhập"),
  signout: L("ログアウト", "Sign out", "登出", "로그아웃", "ออกจากระบบ", "Đăng xuất"),
  register: L("新規登録", "Sign up", "注册", "회원가입", "สมัคร", "Đăng ký"),
  google: L(
    "Google で続ける",
    "Continue with Google",
    "使用 Google 继续",
    "Google로 계속",
    "ดำเนินการต่อด้วย Google",
    "Tiếp tục với Google"
  ),
  email: L("メールアドレス", "Email", "邮箱", "이메일", "อีเมล", "Email"),
  password: L("パスワード", "Password", "密码", "비밀번호", "รหัสผ่าน", "Mật khẩu"),
  toLogin: L(
    "アカウントをお持ちの方",
    "Already have an account? Sign in",
    "已有账号？登录",
    "이미 계정이 있으신가요? 로그인",
    "มีบัญชีแล้ว? เข้าสู่ระบบ",
    "Đã có tài khoản? Đăng nhập"
  ),
  toRegister: L(
    "アカウントを作成",
    "Create an account",
    "创建账号",
    "계정 만들기",
    "สร้างบัญชี",
    "Tạo tài khoản"
  ),
  hint: L(
    "ログインすると、ご注文やeSIMの状況を確認できます。",
    "Sign in to get help with your orders and eSIM status.",
    "登录后可查询您的订单和 eSIM 状态。",
    "로그인하면 주문·eSIM 상태를 확인할 수 있습니다.",
    "เข้าสู่ระบบเพื่อดูคำสั่งซื้อและสถานะ eSIM ของคุณ",
    "Đăng nhập để xem đơn hàng và trạng thái eSIM của bạn."
  ),
  error: L(
    "認証に失敗しました。メール/パスワードをご確認ください。",
    "Sign-in failed. Please check your email/password.",
    "认证失败，请检查邮箱/密码。",
    "인증 실패. 이메일/비밀번호를 확인하세요.",
    "การเข้าสู่ระบบล้มเหลว โปรดตรวจสอบอีเมล/รหัสผ่าน",
    "Đăng nhập thất bại. Vui lòng kiểm tra email/mật khẩu."
  ),
  or: L("または", "or", "或", "또는", "หรือ", "hoặc"),
};
