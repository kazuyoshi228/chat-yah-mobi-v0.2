export type Lang = "en" | "ja" | "zh" | "ko" | "th" | "vi";

export const LANG_OPTIONS: { value: Lang; label: string; flag: string }[] = [
  { value: "en", label: "English", flag: "🇺🇸" },
  { value: "ja", label: "日本語", flag: "🇯🇵" },
  { value: "zh", label: "中文", flag: "🇨🇳" },
  { value: "ko", label: "한국어", flag: "🇰🇷" },
  { value: "th", label: "ภาษาไทย", flag: "🇹🇭" },
  { value: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
];

type Translations = {
  // Home page
  home_hero_badge: string;
  home_hero_title1: string;
  home_hero_title2: string;
  home_hero_subtitle: string;
  home_start_chat: string;
  home_staff_portal: string;
  home_feature_ai_title: string;
  home_feature_ai_desc: string;
  home_feature_escalation_title: string;
  home_feature_escalation_desc: string;
  home_feature_multilingual_title: string;
  home_feature_multilingual_desc: string;
  home_feature_quickreply_title: string;
  home_feature_quickreply_desc: string;
  home_feature_secure_title: string;
  home_feature_secure_desc: string;
  home_feature_survey_title: string;
  home_feature_survey_desc: string;
  home_embed_title: string;
  home_embed_desc: string;
  home_embed_copy: string;
  home_embed_copied: string;
  home_embed_options: string;
  home_embed_opt_lang: string;
  home_embed_opt_position: string;
  home_embed_opt_color: string;
  home_nav_operator: string;
  home_nav_admin: string;

  // Chat start
  chat_start_title: string;
  chat_start_subtitle: string;
  chat_start_name_label: string;
  chat_start_name_placeholder: string;
  chat_start_email_label: string;
  chat_start_email_placeholder: string;
  chat_start_lang_label: string;
  chat_start_message_label: string;
  chat_start_message_placeholder: string;
  chat_start_submit: string;
  chat_start_submitting: string;

  // Chat room
  chat_support_title: string;
  chat_operator_connected: string;
  chat_ai_support: string;
  chat_end: string;
  chat_escalate_question: string;
  chat_connect_operator: string;
  chat_ended_badge: string;
  chat_placeholder: string;
  chat_session_not_found: string;
  chat_start_new: string;
  chat_file_prefix: string;

  // Survey
  survey_title: string;
  survey_resolved_question: string;
  survey_yes: string;
  survey_no: string;
  survey_improve: string;
  survey_improve_placeholder: string;
  survey_comment_placeholder: string;
  survey_submit: string;
  survey_submitting: string;
  survey_thanks: string;
  survey_feedback_received: string;
  survey_close: string;

  // Widget
  widget_greeting: string;
  widget_placeholder: string;
  widget_send: string;
  widget_start_title: string;
  widget_name_placeholder: string;
  widget_message_placeholder: string;
  widget_start_button: string;
  widget_starting: string;
  widget_operator_joined: string;
  widget_typing: string;
  widget_ended: string;
  widget_survey_title: string;
  widget_survey_resolved: string;
  widget_survey_yes: string;
  widget_survey_no: string;
  widget_survey_improve: string;
  widget_survey_submit: string;
  widget_survey_thanks: string;
  widget_survey_close: string;
};

const en: Translations = {
  home_hero_badge: "AI + Operator Real-time Support",
  home_hero_title1: "Elevate Your",
  home_hero_title2: "Customer Support",
  home_hero_subtitle: "AI responds instantly and escalates seamlessly to operators when needed. Multilingual support for customers around the world.",
  home_start_chat: "Start Chatting Now",
  home_staff_portal: "Staff Portal",
  home_feature_ai_title: "AI Auto-Response",
  home_feature_ai_desc: "High-accuracy auto-responses via GPT-4o. Train on your company's knowledge base with RAG for precise answers.",
  home_feature_escalation_title: "Seamless Escalation",
  home_feature_escalation_desc: "When AI can't resolve an issue, it automatically hands off to an operator — with full conversation history shared.",
  home_feature_multilingual_title: "Multilingual Support",
  home_feature_multilingual_desc: "Supports Japanese, English, Chinese, Korean, Thai, and Vietnamese. Serve your global customers in their own language.",
  home_feature_quickreply_title: "Quick Replies",
  home_feature_quickreply_desc: "Operators can insert pre-written responses with one click, reducing response time and ensuring consistency.",
  home_feature_secure_title: "Secure Communication",
  home_feature_secure_desc: "All messages are encrypted. GDPR-compliant data retention with automatic deletion after 2 years.",
  home_feature_survey_title: "Satisfaction Survey",
  home_feature_survey_desc: "Automatic post-chat survey collects CSAT scores and free-form feedback to improve your support quality.",
  home_embed_title: "Embed on Any Website",
  home_embed_desc: "Add the chat widget to your website with a single line of code.",
  home_embed_copy: "Copy",
  home_embed_copied: "Copied!",
  home_embed_options: "Customization options:",
  home_embed_opt_lang: "data-lang — Language (ja / en / zh / ko / th / vi)",
  home_embed_opt_position: "data-position — Position (bottom-right / bottom-left)",
  home_embed_opt_color: "data-color — Button color (HEX)",
  home_nav_operator: "Operator",
  home_nav_admin: "Admin",

  chat_start_title: "Start a Conversation",
  chat_start_subtitle: "Our AI support is available 24/7. Operators are on standby to assist you.",
  chat_start_name_label: "Name (optional)",
  chat_start_name_placeholder: "Your name",
  chat_start_email_label: "Email (optional)",
  chat_start_email_placeholder: "your@email.com",
  chat_start_lang_label: "Language",
  chat_start_message_label: "Message",
  chat_start_message_placeholder: "How can we help you today?",
  chat_start_submit: "Start Chat",
  chat_start_submitting: "Starting...",

  chat_support_title: "yah.mobile Support",
  chat_operator_connected: "Operator connected",
  chat_ai_support: "AI Support",
  chat_end: "End",
  chat_escalate_question: "Need to connect with an operator?",
  chat_connect_operator: "Connect to operator",
  chat_ended_badge: "Chat ended",
  chat_placeholder: "Type a message...",
  chat_session_not_found: "Session not found",
  chat_start_new: "Start a chat",
  chat_file_prefix: "File",

  survey_title: "How was your experience?",
  survey_resolved_question: "Was your issue resolved?",
  survey_yes: "✔ Yes",
  survey_no: "✖ No",
  survey_improve: "What could we improve?",
  survey_improve_placeholder: "Tell us what went wrong or how we can do better.",
  survey_comment_placeholder: "Additional comments (optional)",
  survey_submit: "Submit",
  survey_submitting: "Submitting...",
  survey_thanks: "Thank you!",
  survey_feedback_received: "Your feedback has been received",
  survey_close: "Close",

  widget_greeting: "Hi! How can we help you today?",
  widget_placeholder: "Type a message...",
  widget_send: "Send",
  widget_start_title: "Start a conversation",
  widget_name_placeholder: "Your name (optional)",
  widget_message_placeholder: "How can we help you?",
  widget_start_button: "Start Chat",
  widget_starting: "Starting...",
  widget_operator_joined: "has joined. We'll continue to assist you.",
  widget_typing: "is typing...",
  widget_ended: "Chat ended",
  widget_survey_title: "How was your experience?",
  widget_survey_resolved: "Was your issue resolved?",
  widget_survey_yes: "✔ Yes",
  widget_survey_no: "✖ No",
  widget_survey_improve: "What could we improve?",
  widget_survey_submit: "Submit",
  widget_survey_thanks: "Thank you for your feedback!",
  widget_survey_close: "Close",
};

const ja: Translations = {
  home_hero_badge: "AI + オペレーターリアルタイムサポート",
  home_hero_title1: "カスタマーサポートを",
  home_hero_title2: "次のレベルへ",
  home_hero_subtitle: "AIが即座に応答し、必要に応じてオペレーターへシームレスにエスカレーション。世界中のお客様に多言語対応。",
  home_start_chat: "チャットを開始する",
  home_staff_portal: "スタッフポータル",
  home_feature_ai_title: "AI自動応答",
  home_feature_ai_desc: "GPT-4oによる高精度な自動応答。RAGで自社ナレッジベースを学習し、正確な回答を提供。",
  home_feature_escalation_title: "シームレスなエスカレーション",
  home_feature_escalation_desc: "AIが解決できない問題は、会話履歴ごと自動的にオペレーターへ引き継ぎ。",
  home_feature_multilingual_title: "多言語対応",
  home_feature_multilingual_desc: "日本語・英語・中国語・スペイン語・韓国語に対応。世界中のお客様をそれぞれの言語でサポート。",
  home_feature_quickreply_title: "定型文",
  home_feature_quickreply_desc: "オペレーターはワンクリックで定型文を挿入。応答時間を短縮し、一貫性を確保。",
  home_feature_secure_title: "セキュアな通信",
  home_feature_secure_desc: "全メッセージを暗号化。GDPRに準拠したデータ保持ポリシーで2年後に自動削除。",
  home_feature_survey_title: "満足度アンケート",
  home_feature_survey_desc: "チャット終了後に自動アンケートを実施。CSATスコアと自由記述で改善点を把握。",
  home_embed_title: "任意のウェブサイトに埋め込む",
  home_embed_desc: "1行のコードでチャットウィジェットをウェブサイトに追加できます。",
  home_embed_copy: "コピー",
  home_embed_copied: "コピーしました！",
  home_embed_options: "カスタマイズオプション：",
  home_embed_opt_lang: "data-lang — 言語（ja / en / zh / es / ko）",
  home_embed_opt_position: "data-position — 表示位置（bottom-right / bottom-left）",
  home_embed_opt_color: "data-color — ボタンカラー（HEX）",
  home_nav_operator: "オペレーター",
  home_nav_admin: "管理者",

  chat_start_title: "チャットを開始する",
  chat_start_subtitle: "AIサポートは24時間365日対応。オペレーターも待機中です。",
  chat_start_name_label: "お名前（任意）",
  chat_start_name_placeholder: "お名前",
  chat_start_email_label: "メールアドレス（任意）",
  chat_start_email_placeholder: "your@email.com",
  chat_start_lang_label: "言語",
  chat_start_message_label: "メッセージ",
  chat_start_message_placeholder: "どのようなご用件でしょうか？",
  chat_start_submit: "チャット開始",
  chat_start_submitting: "開始中...",

  chat_support_title: "yah.mobile サポート",
  chat_operator_connected: "オペレーター対応中",
  chat_ai_support: "AI サポート中",
  chat_end: "終了",
  chat_escalate_question: "オペレーターへの接続が必要ですか？",
  chat_connect_operator: "オペレーターに繋ぐ",
  chat_ended_badge: "チャットが終了しました",
  chat_placeholder: "メッセージを入力...",
  chat_session_not_found: "セッションが見つかりません",
  chat_start_new: "チャットを開始する",
  chat_file_prefix: "ファイル",

  survey_title: "チャットはいかがでしたか？",
  survey_resolved_question: "問題は解決しましたか？",
  survey_yes: "✔ はい",
  survey_no: "✖ いいえ",
  survey_improve: "改善点を教えてください",
  survey_improve_placeholder: "何が問題だったか、どうすれば改善できるかをお聞かせください。",
  survey_comment_placeholder: "その他のコメント（任意）",
  survey_submit: "送信",
  survey_submitting: "送信中...",
  survey_thanks: "ありがとうございました",
  survey_feedback_received: "フィードバックを受け付けました",
  survey_close: "閉じる",

  widget_greeting: "こんにちは！どのようなご用件でしょうか？",
  widget_placeholder: "メッセージを入力...",
  widget_send: "送信",
  widget_start_title: "チャットを開始する",
  widget_name_placeholder: "お名前（任意）",
  widget_message_placeholder: "どのようなご用件でしょうか？",
  widget_start_button: "チャット開始",
  widget_starting: "開始中...",
  widget_operator_joined: "が参加しました。引き続きサポートいたします。",
  widget_typing: "が入力中...",
  widget_ended: "チャットが終了しました",
  widget_survey_title: "チャットはいかがでしたか？",
  widget_survey_resolved: "問題は解決しましたか？",
  widget_survey_yes: "✔ はい",
  widget_survey_no: "✖ いいえ",
  widget_survey_improve: "改善点を教えてください",
  widget_survey_submit: "送信",
  widget_survey_thanks: "フィードバックありがとうございました！",
  widget_survey_close: "閉じる",
};

const zh: Translations = {
  home_hero_badge: "AI + 客服实时支持",
  home_hero_title1: "提升您的",
  home_hero_title2: "客户支持体验",
  home_hero_subtitle: "AI即时响应，无缝升级至人工客服。支持全球多语言客户。",
  home_start_chat: "立即开始聊天",
  home_staff_portal: "员工入口",
  home_feature_ai_title: "AI自动回复",
  home_feature_ai_desc: "基于GPT-4o的高精度自动回复。通过RAG训练企业知识库，提供精准答案。",
  home_feature_escalation_title: "无缝升级",
  home_feature_escalation_desc: "AI无法解决时，自动将完整对话记录移交给人工客服。",
  home_feature_multilingual_title: "多语言支持",
  home_feature_multilingual_desc: "支持日语、英语、中文、西班牙语和韩语。用客户的母语提供服务。",
  home_feature_quickreply_title: "快捷回复",
  home_feature_quickreply_desc: "客服一键插入预设回复，缩短响应时间，保持一致性。",
  home_feature_secure_title: "安全通信",
  home_feature_secure_desc: "所有消息均加密。符合GDPR的数据保留政策，2年后自动删除。",
  home_feature_survey_title: "满意度调查",
  home_feature_survey_desc: "聊天结束后自动发送调查问卷，收集CSAT评分和反馈意见。",
  home_embed_title: "嵌入任何网站",
  home_embed_desc: "只需一行代码即可将聊天组件添加到您的网站。",
  home_embed_copy: "复制",
  home_embed_copied: "已复制！",
  home_embed_options: "自定义选项：",
  home_embed_opt_lang: "data-lang — 语言（ja / en / zh / es / ko）",
  home_embed_opt_position: "data-position — 位置（bottom-right / bottom-left）",
  home_embed_opt_color: "data-color — 按钮颜色（HEX）",
  home_nav_operator: "客服",
  home_nav_admin: "管理",

  chat_start_title: "开始对话",
  chat_start_subtitle: "AI支持全天候服务。人工客服随时待命。",
  chat_start_name_label: "姓名（可选）",
  chat_start_name_placeholder: "您的姓名",
  chat_start_email_label: "邮箱（可选）",
  chat_start_email_placeholder: "your@email.com",
  chat_start_lang_label: "语言",
  chat_start_message_label: "消息",
  chat_start_message_placeholder: "请问有什么可以帮助您？",
  chat_start_submit: "开始聊天",
  chat_start_submitting: "启动中...",

  chat_support_title: "yah.mobile 客服",
  chat_operator_connected: "人工客服已接入",
  chat_ai_support: "AI支持中",
  chat_end: "结束",
  chat_escalate_question: "需要连接人工客服吗？",
  chat_connect_operator: "转接人工客服",
  chat_ended_badge: "聊天已结束",
  chat_placeholder: "输入消息...",
  chat_session_not_found: "未找到会话",
  chat_start_new: "开始聊天",
  chat_file_prefix: "文件",

  survey_title: "您的体验如何？",
  survey_resolved_question: "您的问题是否已解决？",
  survey_yes: "✔ 是",
  survey_no: "✖ 否",
  survey_improve: "您有什么改进建议？",
  survey_improve_placeholder: "请告诉我们哪里出了问题或如何改进。",
  survey_comment_placeholder: "其他意见（可选）",
  survey_submit: "提交",
  survey_submitting: "提交中...",
  survey_thanks: "感谢您！",
  survey_feedback_received: "您的反馈已收到",
  survey_close: "关闭",

  widget_greeting: "您好！有什么可以帮助您？",
  widget_placeholder: "输入消息...",
  widget_send: "发送",
  widget_start_title: "开始对话",
  widget_name_placeholder: "您的姓名（可选）",
  widget_message_placeholder: "有什么可以帮助您？",
  widget_start_button: "开始聊天",
  widget_starting: "启动中...",
  widget_operator_joined: "已加入。我们将继续为您提供支持。",
  widget_typing: "正在输入...",
  widget_ended: "聊天已结束",
  widget_survey_title: "您的体验如何？",
  widget_survey_resolved: "您的问题是否已解决？",
  widget_survey_yes: "✔ 是",
  widget_survey_no: "✖ 否",
  widget_survey_improve: "您有什么改进建议？",
  widget_survey_submit: "提交",
  widget_survey_thanks: "感谢您的反馈！",
  widget_survey_close: "关闭",
};

const th: Translations = {
  home_hero_badge: "AI + ผู้ดำเนินการ บริการแบบเรียลไทม์",
  home_hero_title1: "ยกระดับ",
  home_hero_title2: "การบริการลูกค้า",
  home_hero_subtitle: "AI ตอบสนองทันทีและส่งต่อให้ผู้ดำเนินการเมื่อจำเป็น รองรับหลายภาษาสำหรับลูกค้าทั่วโลก",
  home_start_chat: "เริ่มแชทเลย",
  home_staff_portal: "พอร์ทัลพนักงาน",
  home_feature_ai_title: "AI ตอบอัตโนมัติ",
  home_feature_ai_desc: "ตอบอัตโนมัติความแม่นยำสูงด้วย GPT-4o ฝึกด้วยฐานความรู้บริษัทผ่าน RAG",
  home_feature_escalation_title: "ส่งต่อได้ราบรื่น",
  home_feature_escalation_desc: "เมื่อ AI ไม่สามารถแก้ปัญหาได้ จะส่งต่อให้ผู้ดำเนินการพร้อมประวัติการสนทนาทั้งหมด",
  home_feature_multilingual_title: "รองรับหลายภาษา",
  home_feature_multilingual_desc: "รองรับภาษาญี่ปุ่น อังกฤษ จีน เกาหลี ไทย และเวียดนาม",
  home_feature_quickreply_title: "ตอบกลับด่วน",
  home_feature_quickreply_desc: "ผู้ดำเนินการสามารถแทรกคำตอบที่เตรียมไว้ด้วยคลิกเดียว",
  home_feature_secure_title: "การสื่อสารที่ปลอดภัย",
  home_feature_secure_desc: "ข้อความทั้งหมดถูกเข้ารหัส นโยบายการเก็บข้อมูลที่สอดคล้องกับ GDPR",
  home_feature_survey_title: "แบบสอบถามความพึงพอใจ",
  home_feature_survey_desc: "แบบสอบถามหลังแชทอัตโนมัติเพื่อรวบรวมคะแนน CSAT",
  home_embed_title: "ฝังในเว็บไซต์ใดก็ได้",
  home_embed_desc: "เพิ่มวิดเจ็ตแชทในเว็บไซต์ของคุณด้วยโค้ดเพียงบรรทัดเดียว",
  home_embed_copy: "คัดลอก",
  home_embed_copied: "คัดลอกแล้ว!",
  home_embed_options: "ตัวเลือกการปรับแต่ง:",
  home_embed_opt_lang: "data-lang — ภาษา (ja / en / zh / ko / th / vi)",
  home_embed_opt_position: "data-position — ตำแหน่ง (bottom-right / bottom-left)",
  home_embed_opt_color: "data-color — สีปุ่ม (HEX)",
  home_nav_operator: "ผู้ดำเนินการ",
  home_nav_admin: "ผู้ดูแล",

  chat_start_title: "เริ่มการสนทนา",
  chat_start_subtitle: "AI พร้อมให้บริการ 24/7 ผู้ดำเนินการรอช่วยเหลือคุณ",
  chat_start_name_label: "ชื่อ (ไม่บังคับ)",
  chat_start_name_placeholder: "ชื่อของคุณ",
  chat_start_email_label: "อีเมล (ไม่บังคับ)",
  chat_start_email_placeholder: "your@email.com",
  chat_start_lang_label: "ภาษา",
  chat_start_message_label: "ข้อความ",
  chat_start_message_placeholder: "เราช่วยอะไรคุณได้บ้าง?",
  chat_start_submit: "เริ่มแชท",
  chat_start_submitting: "กำลังเริ่ม...",

  chat_support_title: "yah.mobile ซัพพอร์ต",
  chat_operator_connected: "ผู้ดำเนินการเชื่อมต่อแล้ว",
  chat_ai_support: "AI ซัพพอร์ต",
  chat_end: "สิ้นสุด",
  chat_escalate_question: "ต้องการเชื่อมต่อกับผู้ดำเนินการ?",
  chat_connect_operator: "เชื่อมต่อผู้ดำเนินการ",
  chat_ended_badge: "แชทสิ้นสุดแล้ว",
  chat_placeholder: "พิมพ์ข้อความ...",
  chat_session_not_found: "ไม่พบเซสชัน",
  chat_start_new: "เริ่มแชท",
  chat_file_prefix: "ไฟล์",

  survey_title: "ประสบการณ์ของคุณเป็นอย่างไร?",
  survey_resolved_question: "ปัญหาของคุณได้รับการแก้ไขหรือไม่?",
  survey_yes: "✔ ใช่",
  survey_no: "✖ ไม่",
  survey_improve: "เราควรปรับปรุงอะไร?",
  survey_improve_placeholder: "บอกเราว่าอะไรผิดพลาดหรือเราจะปรับปรุงได้อย่างไร",
  survey_comment_placeholder: "ความคิดเห็นเพิ่มเติม (ไม่บังคับ)",
  survey_submit: "ส่ง",
  survey_submitting: "กำลังส่ง...",
  survey_thanks: "ขอบคุณ!",
  survey_feedback_received: "ได้รับความคิดเห็นของคุณแล้ว",
  survey_close: "ปิด",

  widget_greeting: "สวัสดี! เราช่วยอะไรคุณได้บ้าง?",
  widget_placeholder: "พิมพ์ข้อความ...",
  widget_send: "ส่ง",
  widget_start_title: "เริ่มการสนทนา",
  widget_name_placeholder: "ชื่อของคุณ (ไม่บังคับ)",
  widget_message_placeholder: "เราช่วยอะไรคุณได้บ้าง?",
  widget_start_button: "เริ่มแชท",
  widget_starting: "กำลังเริ่ม...",
  widget_operator_joined: "เข้าร่วมแล้ว เราจะช่วยเหลือคุณต่อไป",
  widget_typing: "กำลังพิมพ์...",
  widget_ended: "แชทสิ้นสุดแล้ว",
  widget_survey_title: "ประสบการณ์ของคุณเป็นอย่างไร?",
  widget_survey_resolved: "ปัญหาของคุณได้รับการแก้ไขหรือไม่?",
  widget_survey_yes: "✔ ใช่",
  widget_survey_no: "✖ ไม่",
  widget_survey_improve: "เราควรปรับปรุงอะไร?",
  widget_survey_submit: "ส่ง",
  widget_survey_thanks: "ขอบคุณสำหรับความคิดเห็น!",
  widget_survey_close: "ปิด",
};

const vi: Translations = {
  home_hero_badge: "AI + Nhân viên hỗ trợ thời gian thực",
  home_hero_title1: "Nâng cao",
  home_hero_title2: "Dịch vụ Khách hàng",
  home_hero_subtitle: "AI phản hồi ngay lập tức và chuyển tiếp liền mạch cho nhân viên khi cần. Hỗ trợ đa ngôn ngữ cho khách hàng toàn cầu.",
  home_start_chat: "Bắt đầu Chat ngay",
  home_staff_portal: "Cổng nhân viên",
  home_feature_ai_title: "AI Tự động trả lời",
  home_feature_ai_desc: "Tự động trả lời độ chính xác cao với GPT-4o. Huấn luyện với cơ sở kiến thức qua RAG.",
  home_feature_escalation_title: "Chuyển tiếp liền mạch",
  home_feature_escalation_desc: "Khi AI không thể giải quyết, tự động chuyển cho nhân viên với toàn bộ lịch sử trò chuyện.",
  home_feature_multilingual_title: "Hỗ trợ đa ngôn ngữ",
  home_feature_multilingual_desc: "Hỗ trợ tiếng Nhật, Anh, Trung, Hàn, Thái và Việt. Phục vụ khách hàng toàn cầu bằng ngôn ngữ của họ.",
  home_feature_quickreply_title: "Trả lời nhanh",
  home_feature_quickreply_desc: "Nhân viên có thể chèn câu trả lời soạn sẵn bằng một cú nhấp, giảm thời gian phản hồi.",
  home_feature_secure_title: "Giao tiếp an toàn",
  home_feature_secure_desc: "Tất cả tin nhắn được mã hóa. Chính sách lưu giữ dữ liệu tuân thủ GDPR với xóa tự động.",
  home_feature_survey_title: "Khảo sát hài lòng",
  home_feature_survey_desc: "Khảo sát tự động sau chat để thu thập điểm CSAT và phản hồi.",
  home_embed_title: "Nhúng vào bất kỳ trang web nào",
  home_embed_desc: "Thêm widget chat vào trang web của bạn chỉ với một dòng code.",
  home_embed_copy: "Sao chép",
  home_embed_copied: "Đã sao chép!",
  home_embed_options: "Tùy chọn tùy chỉnh:",
  home_embed_opt_lang: "data-lang — Ngôn ngữ (ja / en / zh / ko / th / vi)",
  home_embed_opt_position: "data-position — Vị trí (bottom-right / bottom-left)",
  home_embed_opt_color: "data-color — Màu nút (HEX)",
  home_nav_operator: "Nhân viên",
  home_nav_admin: "Quản trị",

  chat_start_title: "Bắt đầu cuộc trò chuyện",
  chat_start_subtitle: "Hỗ trợ AI có sẵn 24/7. Nhân viên đang chờ hỗ trợ bạn.",
  chat_start_name_label: "Tên (tùy chọn)",
  chat_start_name_placeholder: "Tên của bạn",
  chat_start_email_label: "Email (tùy chọn)",
  chat_start_email_placeholder: "your@email.com",
  chat_start_lang_label: "Ngôn ngữ",
  chat_start_message_label: "Tin nhắn",
  chat_start_message_placeholder: "Chúng tôi có thể giúp gì cho bạn hôm nay?",
  chat_start_submit: "Bắt đầu Chat",
  chat_start_submitting: "Đang bắt đầu...",

  chat_support_title: "Hỗ trợ yah.mobile",
  chat_operator_connected: "Nhân viên đã kết nối",
  chat_ai_support: "Hỗ trợ AI",
  chat_end: "Kết thúc",
  chat_escalate_question: "Bạn có cần kết nối với nhân viên không?",
  chat_connect_operator: "Kết nối nhân viên",
  chat_ended_badge: "Chat đã kết thúc",
  chat_placeholder: "Nhập tin nhắn...",
  chat_session_not_found: "Không tìm thấy phiên",
  chat_start_new: "Bắt đầu chat",
  chat_file_prefix: "Tệp",

  survey_title: "Trải nghiệm của bạn như thế nào?",
  survey_resolved_question: "Vấn đề của bạn đã được giải quyết chưa?",
  survey_yes: "✔ Có",
  survey_no: "✖ Không",
  survey_improve: "Chúng tôi có thể cải thiện điều gì?",
  survey_improve_placeholder: "Hãy cho chúng tôi biết điều gì đã xảy ra hoặc cách chúng tôi có thể làm tốt hơn.",
  survey_comment_placeholder: "Nhận xét thêm (tùy chọn)",
  survey_submit: "Gửi",
  survey_submitting: "Đang gửi...",
  survey_thanks: "Cảm ơn!",
  survey_feedback_received: "Phản hồi của bạn đã được nhận",
  survey_close: "Đóng",

  widget_greeting: "Xin chào! Chúng tôi có thể giúp gì cho bạn?",
  widget_placeholder: "Nhập tin nhắn...",
  widget_send: "Gửi",
  widget_start_title: "Bắt đầu cuộc trò chuyện",
  widget_name_placeholder: "Tên của bạn (tùy chọn)",
  widget_message_placeholder: "Chúng tôi có thể giúp gì cho bạn?",
  widget_start_button: "Bắt đầu Chat",
  widget_starting: "Đang bắt đầu...",
  widget_operator_joined: "đã tham gia. Chúng tôi sẽ tiếp tục hỗ trợ bạn.",
  widget_typing: "đang nhập...",
  widget_ended: "Chat đã kết thúc",
  widget_survey_title: "Trải nghiệm của bạn như thế nào?",
  widget_survey_resolved: "Vấn đề của bạn đã được giải quyết chưa?",
  widget_survey_yes: "✔ Có",
  widget_survey_no: "✖ Không",
  widget_survey_improve: "Chúng tôi có thể cải thiện điều gì?",
  widget_survey_submit: "Gửi",
  widget_survey_thanks: "Cảm ơn phản hồi của bạn!",
  widget_survey_close: "Đóng",
};

const ko: Translations = {
  home_hero_badge: "AI + 상담원 실시간 지원",
  home_hero_title1: "고객 지원을",
  home_hero_title2: "한 단계 높이세요",
  home_hero_subtitle: "AI가 즉시 응답하고 필요 시 상담원에게 원활하게 에스컬레이션합니다. 전 세계 고객을 위한 다국어 지원.",
  home_start_chat: "지금 채팅 시작",
  home_staff_portal: "직원 포털",
  home_feature_ai_title: "AI 자동 응답",
  home_feature_ai_desc: "GPT-4o 기반의 고정확도 자동 응답. RAG로 기업 지식 베이스를 학습하여 정확한 답변 제공.",
  home_feature_escalation_title: "원활한 에스컬레이션",
  home_feature_escalation_desc: "AI가 해결하지 못할 때 전체 대화 기록과 함께 자동으로 상담원에게 이관.",
  home_feature_multilingual_title: "다국어 지원",
  home_feature_multilingual_desc: "일본어, 영어, 중국어, 스페인어, 한국어 지원. 전 세계 고객을 모국어로 지원.",
  home_feature_quickreply_title: "빠른 답변",
  home_feature_quickreply_desc: "상담원이 클릭 한 번으로 미리 작성된 답변을 삽입하여 응답 시간 단축.",
  home_feature_secure_title: "안전한 통신",
  home_feature_secure_desc: "모든 메시지 암호화. GDPR 준수 데이터 보존 정책으로 2년 후 자동 삭제.",
  home_feature_survey_title: "만족도 설문",
  home_feature_survey_desc: "채팅 종료 후 자동 설문으로 CSAT 점수와 자유 의견을 수집.",
  home_embed_title: "모든 웹사이트에 삽입",
  home_embed_desc: "한 줄의 코드로 채팅 위젯을 웹사이트에 추가하세요.",
  home_embed_copy: "복사",
  home_embed_copied: "복사됨!",
  home_embed_options: "커스터마이즈 옵션:",
  home_embed_opt_lang: "data-lang — 언어 (ja / en / zh / es / ko)",
  home_embed_opt_position: "data-position — 위치 (bottom-right / bottom-left)",
  home_embed_opt_color: "data-color — 버튼 색상 (HEX)",
  home_nav_operator: "상담원",
  home_nav_admin: "관리자",

  chat_start_title: "대화 시작하기",
  chat_start_subtitle: "AI 지원은 24시간 365일 이용 가능합니다. 상담원도 대기 중입니다.",
  chat_start_name_label: "이름 (선택)",
  chat_start_name_placeholder: "이름을 입력하세요",
  chat_start_email_label: "이메일 (선택)",
  chat_start_email_placeholder: "your@email.com",
  chat_start_lang_label: "언어",
  chat_start_message_label: "메시지",
  chat_start_message_placeholder: "무엇을 도와드릴까요?",
  chat_start_submit: "채팅 시작",
  chat_start_submitting: "시작 중...",

  chat_support_title: "yah.mobile 지원",
  chat_operator_connected: "상담원 연결됨",
  chat_ai_support: "AI 지원 중",
  chat_end: "종료",
  chat_escalate_question: "상담원과 연결이 필요하신가요?",
  chat_connect_operator: "상담원 연결",
  chat_ended_badge: "채팅이 종료되었습니다",
  chat_placeholder: "메시지를 입력하세요...",
  chat_session_not_found: "세션을 찾을 수 없습니다",
  chat_start_new: "채팅 시작",
  chat_file_prefix: "파일",

  survey_title: "경험이 어떠셨나요?",
  survey_resolved_question: "문제가 해결되었나요?",
  survey_yes: "✔ 예",
  survey_no: "✖ 아니오",
  survey_improve: "개선할 점이 있나요?",
  survey_improve_placeholder: "무엇이 잘못되었는지 또는 어떻게 개선할 수 있는지 알려주세요.",
  survey_comment_placeholder: "추가 의견 (선택)",
  survey_submit: "제출",
  survey_submitting: "제출 중...",
  survey_thanks: "감사합니다!",
  survey_feedback_received: "피드백이 접수되었습니다",
  survey_close: "닫기",

  widget_greeting: "안녕하세요! 무엇을 도와드릴까요?",
  widget_placeholder: "메시지를 입력하세요...",
  widget_send: "전송",
  widget_start_title: "대화 시작하기",
  widget_name_placeholder: "이름 (선택)",
  widget_message_placeholder: "무엇을 도와드릴까요?",
  widget_start_button: "채팅 시작",
  widget_starting: "시작 중...",
  widget_operator_joined: "님이 참여했습니다. 계속 지원해 드리겠습니다.",
  widget_typing: "님이 입력 중...",
  widget_ended: "채팅이 종료되었습니다",
  widget_survey_title: "경험이 어떠셨나요?",
  widget_survey_resolved: "문제가 해결되었나요?",
  widget_survey_yes: "✔ 예",
  widget_survey_no: "✖ 아니오",
  widget_survey_improve: "개선할 점이 있나요?",
  widget_survey_submit: "제출",
  widget_survey_thanks: "피드백 감사합니다!",
  widget_survey_close: "닫기",
};

export const translations: Record<Lang, Translations> = { en, ja, zh, ko, th, vi };

export function t(lang: Lang, key: keyof Translations): string {
  return translations[lang]?.[key] ?? translations.en[key] ?? key;
}
