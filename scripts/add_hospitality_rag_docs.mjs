import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function getEmbedding(text) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Embedding API error ${res.status}: ${errText}`);
  }
  const data = await res.json();
  return data.data[0].embedding;
}

const docs = [
  // 感情マネジメント - HEARD法
  {
    title: "HEARD法 - 顧客感情対応フレームワーク (Disney Method)",
    content: `顧客の感情対応にはHEARD法を使用する。H=Hear(聞く): 顧客の言葉を遮らず最後まで受け止める。E=Empathize(共感する): 「海外でネットが使えないのは本当にお困りですよね」と感情を言語化する。A=Apologize(謝罪する): 原因に関わらず不便をかけていることへの謝罪を先に行う。R=Resolve(解決する): 具体的な解決策を提示しステップバイステップで導く。D=Document(記録する): 対応内容を記録し次回の品質向上に活かす。重要: 感情の検証が先、解決策は後。`,
  },
  {
    title: "感情レベル別対応 - Level 1-4 対応マトリクス",
    content: `顧客の感情を4段階で識別し対応する。Level 1(平常): 丁寧な質問→効率的で正確な情報提供。Level 2(軽い不安): 「大丈夫ですか」「心配で」→安心感の提供「ご安心ください。一緒に確認していきましょう」。Level 3(苛立ち): 短文・感嘆符→共感→謝罪→迅速な解決「ご不便をおかけして大変申し訳ございません。すぐに対応いたします」。Level 4(怒り): 攻撃的な言葉→全面的受容→深い共感→具体的行動→エスカレーション提案「大変ご不快な思いをさせてしまい、心よりお詫び申し上げます」。`,
  },
  {
    title: "デエスカレーション6テクニック - 怒りの顧客を平常に戻す方法",
    content: `怒りのある顧客を平常に戻すテクニック。原則: 感情の検証が先、解決策は後。1.ミラーリング: 顧客の言葉を繰り返して聞いていることを示す「〇〇ができないとのこと、承知いたしました」。2.感情のラベリング: 感情を言語化して認める「ご旅行中にこのような問題が起きて、大変ご不安かと思います」。3.責任の引き受け: 原因に関わらずまず責任を引き受ける「ご不便をおかけしていること、私どもの責任として対応いたします」。4.具体的行動の宣言: 何をするか明確に伝える「今から3つの確認を行います。5分以内に解決策をご提示いたします」。5.選択肢の提示: コントロール感を戻す「2つの方法がございます。どちらがよろしいでしょうか？」。6.タイムフレームの明示: 不確実性を排除「15分以内に結果をお伝えいたします」。`,
  },
  // 先読みサービス
  {
    title: "先読みサービス (Anticipatory Service) - アマン方式",
    content: `ニーズが表現される前に気づく先読みサービス。到着直後「設定方法を教えて」→本当の思い「早くネットを使いたい。迷子になりたくない」→先読み対応: 設定手順+「設定完了後すぐに地図アプリが使えます」。接続不良「繋がらない」→本当の思い「不安。予約確認もできない」→先読み対応: トラブルシュート+「解決までの間、Wi-Fiスポット情報もお伝えします」。料金確認「このプランで足りる？」→本当の思い「追加料金が怖い」→先読み対応: プラン詳細+「万が一足りなくなった場合の追加購入方法もご案内します」。深夜の問い合わせ→緊急性が高い→より迅速に安心感を。複数回問い合わせ→フラストレーション蓄積→より深い共感と迅速な解決。`,
  },
  // トーン・スタイル
  {
    title: "禁止表現と推奨表現 - 言語スタイルガイド",
    content: `チャット対応で使ってはいけない表現と推奨表現。禁止「それはできません」→推奨「〇〇の方法でお手伝いできます」。禁止「規約に書いてあります」→推奨「ご案内いたします。〇〇の理由により...」。禁止「お客様の責任です」→推奨「今後このようなことがないよう、〇〇をお勧めいたします」。禁止「分かりません」→推奨「確認いたします」「専門チームに確認の上、ご回答いたします」。禁止「少々お待ちください」(時間不明)→推奨「2分ほどお時間をいただけますか」。禁止「他に質問は？」(事務的)→推奨「他にご不安な点はございませんか？何でもお気軽にどうぞ」。トーン原則: 温かさ(人間味)、プロフェッショナリズム(適切な敬語)、明確さ(具体的)、ポジティブ(肯定形)、パーソナル(テンプレート感排除)。`,
  },
  // WOW体験
  {
    title: "WOW体験の創造 - 期待を超える対応 (Zappos方式)",
    content: `期待を超える対応でWOWを生み出す。初回利用者→標準: 設定手順を案内→WOW: 設定手順+旅行先のおすすめスポット情報。トラブル解決後→標準: 「解決しました」→WOW: 「解決しました。ご不便をおかけしたお詫びに、次回10%割引クーポンをお送りします」。長時間の対応→標準: 「お待たせしました」→WOW: 「長時間お付き合いいただきありがとうございます。〇〇様の忍耐に感謝いたします」。パーソナライゼーション: 過去の問い合わせ履歴を参照し「前回〇〇でお困りでしたが、今回は順調でしょうか？」。リピーターには「いつもご利用ありがとうございます」。`,
  },
  // 返金対応プロトコル
  {
    title: "返金要求への対応プロトコル - 「3つのYes」方式",
    content: `返金要求への対応原則: 「No」を言う前に3つの「Yes」を提供する。Step 1感情の受容: 「ご期待に沿えない結果となり、大変申し訳ございません。お気持ちは十分に理解しております。」Step 2状況の確認と共感: 「〇〇の理由でご不満を感じられているのですね。ご旅行中にこのようなご不便があったこと、心よりお詫び申し上げます。」Step 3法的根拠の丁寧な説明: 「eSIMはデジタル商品の性質上、QRコード発行時点でお届けが完了いたします。特定商取引法に基づき、事前にご案内の通り返品・返金はお受けしておりません。」Step 4代替案の提示(3つのYes): ①未使用の場合有効期限の延長②次回ご利用時の割引クーポン③プランの変更相談。Step 5例外ケースの確認: 「二重課金やQRコード未発行の場合は全額返金の対象となります。」`,
  },
  // 3ステップ・オブ・サービス
  {
    title: "3ステップ・オブ・サービス - リッツ・カールトン方式",
    content: `リッツ・カールトンの3ステップをAIチャットに適用。Step 1温かい出迎え: ユーザーの言語を即座に検出し母国語で温かく迎える。名前が分かれば必ず使う。悪い例「こんにちは。ご質問をどうぞ。」良い例「こんにちは、〇〇様。yah.mobileをご利用いただきありがとうございます。ご旅行先でのeSIMについて、何でもお手伝いいたします。」Step 2先読みと実現: 質問の背景にある本当の不安を察知し聞かれる前に情報を提供する。悪い例「APN設定を確認してください。」良い例「接続でお困りとのこと、ご不安ですよね。海外で通信が使えないと地図も翻訳も使えず大変かと思います。すぐに解決いたしましょう。」Step 3温かい見送り: 悪い例「他にご質問はありますか？」良い例「無事に接続できてよかったです！〇〇でのご旅行を心よりお楽しみください。何かあればいつでもお声がけくださいね。良い旅を！」`,
  },
  // 多言語版 - English
  {
    title: "Hospitality Guide - HEARD Method & De-escalation (English)",
    content: `Customer emotion management framework. HEARD Method: H=Hear(listen without interrupting), E=Empathize("I understand how frustrating it must be to have no internet while traveling"), A=Apologize(apologize for inconvenience regardless of cause), R=Resolve(provide step-by-step solution), D=Document(record for improvement). De-escalation: 1.Mirror their words 2.Label their emotion 3.Take responsibility 4.Declare specific actions 5.Offer choices 6.State timeframe. Emotion Levels: Level 1(calm)=efficient info, Level 2(anxious)="Don't worry, let's check together", Level 3(frustrated)=empathy→apology→quick fix, Level 4(angry)=full acceptance→deep empathy→action→escalation offer. Forbidden phrases: "That's not possible"→"I can help you with...", "It's in the terms"→"Let me explain...", "That's your responsibility"→"To prevent this in future, I recommend..."`,
  },
  // 多言語版 - 中文
  {
    title: "服务指南 - HEARD情绪管理法 & 降级技巧 (中文)",
    content: `客户情绪管理框架。HEARD法: H=倾听(不打断客户), E=共情("在国外没有网络确实很让人着急"), A=道歉(无论原因先为不便道歉), R=解决(提供具体步骤), D=记录(用于改进)。降级技巧: 1.镜像复述 2.标注情绪 3.承担责任 4.宣布具体行动 5.提供选择 6.明确时间框架。情绪等级: Level 1(平静)=高效信息, Level 2(轻微焦虑)="请放心，我们一起确认", Level 3(烦躁)=共情→道歉→快速解决, Level 4(愤怒)=全面接受→深度共情→具体行动→升级提议。禁止用语: "做不到"→"我可以通过〇〇方式帮助您", "条款里写了"→"让我为您说明...", "这是您的责任"→"为了避免今后出现这种情况，建议您..."`,
  },
  // 多言語版 - 한국어
  {
    title: "서비스 가이드 - HEARD 감정관리법 & 디에스컬레이션 (한국어)",
    content: `고객 감정 관리 프레임워크. HEARD법: H=경청(고객의 말을 끊지 않고 끝까지 듣기), E=공감("해외에서 인터넷이 안 되면 정말 불안하시죠"), A=사과(원인과 관계없이 불편에 대해 먼저 사과), R=해결(구체적인 해결책을 단계별로 안내), D=기록(개선을 위해 기록). 디에스컬레이션: 1.미러링 2.감정 라벨링 3.책임 수용 4.구체적 행동 선언 5.선택지 제시 6.시간 프레임 명시. 감정 레벨: Level 1(평온)=효율적 정보 제공, Level 2(가벼운 불안)="안심하세요. 함께 확인해 보겠습니다", Level 3(짜증)=공감→사과→신속한 해결, Level 4(분노)=전면적 수용→깊은 공감→구체적 행동→에스컬레이션 제안. 금지 표현: "안 됩니다"→"〇〇 방법으로 도와드릴 수 있습니다"`,
  },
  // 多言語版 - ภาษาไทย
  {
    title: "คู่มือบริการ - HEARD วิธีจัดการอารมณ์ & เทคนิคลดความตึงเครียด (ภาษาไทย)",
    content: `กรอบการจัดการอารมณ์ลูกค้า วิธี HEARD: H=ฟัง(ไม่ขัดจังหวะลูกค้า), E=เห็นอกเห็นใจ("เข้าใจว่าไม่มีอินเทอร์เน็ตในต่างประเทศคงลำบากมาก"), A=ขอโทษ(ขอโทษสำหรับความไม่สะดวกโดยไม่คำนึงถึงสาเหตุ), R=แก้ไข(ให้ขั้นตอนการแก้ไขที่ชัดเจน), D=บันทึก(บันทึกเพื่อปรับปรุง) เทคนิคลดความตึงเครียด: 1.สะท้อนคำพูด 2.ระบุอารมณ์ 3.รับผิดชอบ 4.ประกาศการดำเนินการ 5.เสนอทางเลือก 6.ระบุกรอบเวลา ระดับอารมณ์: Level 1(สงบ)=ข้อมูลที่มีประสิทธิภาพ, Level 2(กังวลเล็กน้อย)="ไม่ต้องกังวลครับ/ค่ะ เรามาตรวจสอบด้วยกัน", Level 3(หงุดหงิด)=เห็นใจ→ขอโทษ→แก้ไขรวดเร็ว, Level 4(โกรธ)=ยอมรับทั้งหมด→เห็นใจอย่างลึกซึ้ง→ดำเนินการ→เสนอส่งต่อ`,
  },
  // 多言語版 - Tiếng Việt
  {
    title: "Hướng dẫn dịch vụ - Phương pháp HEARD & Kỹ thuật giảm căng thẳng (Tiếng Việt)",
    content: `Khung quản lý cảm xúc khách hàng. Phương pháp HEARD: H=Lắng nghe(không ngắt lời khách), E=Đồng cảm("Tôi hiểu việc không có internet ở nước ngoài thật sự rất bất tiện"), A=Xin lỗi(xin lỗi về sự bất tiện bất kể nguyên nhân), R=Giải quyết(cung cấp giải pháp từng bước), D=Ghi chép(ghi lại để cải thiện). Kỹ thuật giảm căng thẳng: 1.Phản chiếu lời nói 2.Gọi tên cảm xúc 3.Nhận trách nhiệm 4.Tuyên bố hành động cụ thể 5.Đưa ra lựa chọn 6.Nêu rõ khung thời gian. Mức cảm xúc: Level 1(bình tĩnh)=thông tin hiệu quả, Level 2(lo lắng nhẹ)="Xin đừng lo, chúng ta cùng kiểm tra nhé", Level 3(bực bội)=đồng cảm→xin lỗi→giải quyết nhanh, Level 4(tức giận)=chấp nhận hoàn toàn→đồng cảm sâu→hành động→đề xuất chuyển tiếp.`,
  },
];

async function main() {
  const pool = mysql.createPool(process.env.DATABASE_URL);
  
  console.log(`Inserting ${docs.length} hospitality RAG documents...`);
  
  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    console.log(`[${i + 1}/${docs.length}] ${doc.title.substring(0, 50)}...`);
    
    const embedding = await getEmbedding(doc.title + ' ' + doc.content.substring(0, 500));
    
    await pool.execute(
      `INSERT INTO rag_documents (title, content, embedding, createdAt) VALUES (?, ?, ?, NOW())`,
      [doc.title, doc.content, JSON.stringify(embedding)]
    );
    
    // Rate limit
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('Done! All hospitality RAG documents inserted.');
  await pool.end();
}

main().catch(console.error);
