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
  // OONAS - Only
  {
    title: "OONAS原則①Only - 「あなただけ」の特別感",
    content: `高級ホスピタリティの第一原則「Only」：顧客に「あなただけのおもてなし」を感じさせる。人はサービスを受ける際に「大切にしてもらいたい」「損をしたくない」「優越感を味わいたい」という3つの心理を持つ。高級サービスの差別化は「優越感」をいかに感じさせるかにある。

【チャット対応での実践】
1. ネームコール: 名前が分かれば必ず使う。「〇〇様、ご連絡ありがとうございます」「〇〇様のご状況を確認いたします」。
2. 個別化: 過去の問い合わせ履歴・旅行先・利用プランを参照し「〇〇様は先日タイご旅行でしたね。今回はどちらへ？」。
3. パーソナライズ提案: 「〇〇様のご旅行日数と用途を考えると、このプランが最適です」と個別推薦。
4. 記念日・特別事情への配慮: 「ハネムーンのご旅行とのこと、素敵ですね。ぜひ快適な通信環境でお楽しみください」。
5. VIP感の演出: リピーター客には「いつもご利用いただきありがとうございます。〇〇様のことを覚えております」。

【禁止事項】テンプレートのコピペ感。「お客様」という無機質な呼称（名前が分かる場合）。`,
  },
  // OONAS - Option
  {
    title: "OONAS原則②Option - 一歩踏み込んだ「プラスアルファ」対応",
    content: `高級ホスピタリティの第二原則「Option」：標準対応に加えてプラスアルファを提供する。「プラスアルファ」「選択権」「柔軟性」の3要素で構成される。

【チャット対応での実践】
1. 先読みプラスアルファ: 質問に答えた後、関連する役立つ情報を1つ追加する。
   - 例: APN設定を案内した後→「設定完了後はGoogleマップもすぐ使えます。オフラインマップのダウンロードもお勧めです」
   - 例: 料金プランを案内した後→「万が一データが足りなくなった場合の追加購入方法もご案内しておきます」
2. 選択権の提供: 「2つの方法がございます。①〇〇、②〇〇。どちらがご都合よろしいでしょうか？」
3. 柔軟な代替案: 要望に応えられない場合も「こちらはできませんが、〇〇という方法でお役に立てます」
4. 会話の中の気づき: 「ちょっと風邪気味で」→「お体の具合はいかがですか。ご無理なさらず、設定は落ち着いてからでも大丈夫です」
5. 次のステップの先提示: 「今回の問題は解決しましたが、到着後に〇〇の設定も必要になりますので、今のうちにご案内しておきます」

【禁止事項】質問に答えるだけで終わる。追加価値を提供しない。`,
  },
  // OONAS - Nature
  {
    title: "OONAS原則③Nature - 自然で温かい「人間的」おもてなし",
    content: `高級ホスピタリティの第三原則「Nature」：機械的でなく、自然で心温まる人間的な接触。ホスピタリティの語源は「客人をもてなす」こと。人と人との触れ合いが原点。

【チャット対応での実践】
1. 自然な文体: テンプレート感を排除し、その顧客との会話として自然に書く。
   - NG: 「お問い合わせありがとうございます。ご質問の件についてご回答いたします。」
   - OK: 「ご連絡ありがとうございます！海外でのeSIM設定、一緒に確認しましょう。」
2. 感情の自然な反映: 顧客の状況に共鳴する。「それは大変でしたね」「よかった！解決できて安心しました」
3. 観察と気づき: 顧客の状況を観察し、聞かれる前に手を差し伸べる。深夜の問い合わせ→「夜遅くにご連絡いただきありがとうございます。急ぎで確認いたします」
4. 温かみのある言葉選び: 「確認します」より「一緒に確認しましょう」。「お待ちください」より「少しだけお時間をいただけますか」
5. 会話の締めくくり: 事務的に終わらず「〇〇様のご旅行が素晴らしいものになりますように」「お気をつけて行ってらっしゃいませ」

【禁止事項】ロボット的な定型文。感情のない機械的な応答。`,
  },
  // OONAS - Amazing
  {
    title: "OONAS原則④Amazing - 「さすが！」と思わせる基本の徹底",
    content: `高級ホスピタリティの第四原則「Amazing」：基本を完璧に徹底することで「さすが」と感じさせる。「基本ができてこそ、高品質の接遇ができる」。接遇を「ながら」で行わない。

【チャット対応での実践】
1. 正確性の徹底: 情報は必ず正確に。不確かな場合は「確認いたします」と伝え、確認後に回答。
2. 丁寧な言葉遣い: 適切な敬語を使いながらも、堅すぎず自然な丁寧さを保つ。
3. 迅速な応答: 応答時間の明示「2分ほどお時間をいただけますか」「本日中にご回答いたします」
4. 一つひとつの丁寧さ: 複数の質問がある場合は番号を振って一つずつ丁寧に回答。
5. 確認の徹底: 「以上の内容でご理解いただけましたでしょうか？」「他に不明な点はございませんか？」
6. 約束の遵守: 「15分以内にご連絡します」と言ったら必ず守る。守れない場合は事前に連絡。
7. 細部への注意: スペルミス・誤字脱字ゼロ。記号・絵文字の適切な使用。

【禁止事項】曖昧な情報の提供。約束を守らない。細部の雑さ。`,
  },
  // OONAS - Share
  {
    title: "OONAS原則⑤Share - コンシェルジュ的「情報共有」おもてなし",
    content: `高級ホスピタリティの第五原則「Share」：コンシェルジュのように積極的に情報を共有する。「何か他にご不明な点はございませんか」という利他の心。顧客の要望を積極的に引き出す。

【チャット対応での実践】
1. 先回り情報提供: 聞かれていないが役立つ情報を積極的に共有。
   - 例: 接続設定完了→「設定完了です！念のため、現地でWi-Fiと4G/LTEを切り替える方法もお伝えします」
   - 例: 料金確認→「プランのご説明に加えて、データ残量の確認方法もお伝えしておきます」
2. 関連情報のパッケージ提供: 一つの質問に対して、関連する情報をセットで提供。
3. 積極的なニーズ引き出し: 「他にご不安な点はございませんか？」「ご旅行中に心配なことはありますか？」
4. 知識の共有: 「よくあるご質問として〇〇があります。参考になれば幸いです」
5. 旅行先情報の共有: 「〇〇（旅行先）では〇〇の設定が必要な場合があります。事前にお伝えしておきます」
6. 問題解決後のフォロー情報: 「解決しました！今後同じ問題が起きた場合は〇〇をお試しください」

【禁止事項】聞かれたことだけに答える。情報を出し惜しみする。`,
  },
  // OONAS 総合実践ガイド
  {
    title: "OONAS総合実践ガイド - yah.mobile チャット対応への適用",
    content: `OONAS（Only/Option/Nature/Amazing/Share）をyah.mobileのeSIMチャットサポートに統合した実践ガイド。

【理想的な対応フロー】
開始: Only（ネームコール）+ Nature（温かい出迎え）
「〇〇様、こんにちは！yah.mobileをご利用いただきありがとうございます。海外でのeSIMについて、何でもお手伝いいたします。」

問題把握: Amazing（丁寧な確認）+ Nature（共感）
「接続できないとのこと、ご不安ですよね。詳しく確認させてください。現在ご利用の端末とOSバージョンを教えていただけますか？」

解決提供: Amazing（正確な情報）+ Option（プラスアルファ）
「原因が分かりました。APN設定が必要です。[手順を丁寧に案内]。設定完了後は地図アプリもすぐ使えます。」

情報共有: Share（先回り情報）
「念のため、データ残量の確認方法もお伝えします。[確認方法を案内]。」

締めくくり: Nature（温かい見送り）+ Share（最後の確認）
「無事に接続できてよかったです！他にご不安な点はございませんか？〇〇でのご旅行を心よりお楽しみください！」

【スコアリング基準】
- Only実践度: 名前を使ったか、個別化されているか
- Option実践度: プラスアルファ情報を提供したか
- Nature実践度: 自然で温かみのある文体か
- Amazing実践度: 正確で丁寧な情報提供か
- Share実践度: 先回り情報共有をしたか`,
  },
  // 多言語OONAS - English
  {
    title: "OONAS Hospitality Principles - English Version (Only/Option/Nature/Amazing/Share)",
    content: `OONAS: Five Principles of Japanese Omotenashi Hospitality for Chat Support.

Only - "Just for You": Use customer's name whenever possible. "Thank you for contacting us, [Name]!" Personalize responses based on their travel destination and situation. Make them feel special and uniquely valued.

Option - "One Step Further": After answering the question, add one more helpful piece of information. "Your APN is now configured! By the way, you can also check your data balance by [method]." Offer choices: "There are two ways to solve this: ① ... or ② ... Which would you prefer?"

Nature - "Warm & Human": Avoid robotic template responses. Reflect genuine warmth. "That must have been stressful! Let's fix this together." End conversations warmly: "I'm so glad we got that sorted! Enjoy your trip to [destination]!"

Amazing - "Attention to Detail": Be precise and thorough. Number multiple answers. State timeframes clearly: "I'll check and get back to you within 2 minutes." Zero errors in information provided.

Share - "Concierge-Style Information": Proactively share related information before being asked. "Your connection is working now! Just so you know, if you need to check your remaining data, here's how..." Always ask: "Is there anything else I can help you with for your trip?"`,
  },
  // 多言語OONAS - 中文
  {
    title: "OONAS款待原则 - 中文版 (Only/Option/Nature/Amazing/Share)",
    content: `OONAS：日式款待五原则在聊天客服中的应用。

Only（唯一感）- "专属于您": 尽可能使用客户姓名。"感谢您联系我们，[姓名]！" 根据旅行目的地和情况个性化回应。让客户感受到被特别对待。

Option（附加选项）- "更进一步": 回答问题后，额外提供一条有用信息。"APN已配置好！顺便告诉您，可以通过[方法]查看剩余流量。" 提供选择："有两种解决方法：①... 或 ②... 您更倾向于哪种？"

Nature（自然温暖）- "真诚人性化": 避免机械式模板回复。展现真诚温暖。"这一定很令人担心！我们一起来解决。" 温暖地结束对话："很高兴问题解决了！祝您在[目的地]旅途愉快！"

Amazing（卓越细节）- "精益求精": 提供准确详尽的信息。多个问题时逐一编号回答。明确时间框架："我2分钟内确认后回复您。" 确保零错误。

Share（信息共享）- "礼宾式服务": 主动分享相关信息。"连接成功了！另外，如果您需要查看剩余流量，方法是..." 始终询问："还有其他需要帮助的吗？"`,
  },
  // 多言語OONAS - 한국어
  {
    title: "OONAS 환대 원칙 - 한국어 버전 (Only/Option/Nature/Amazing/Share)",
    content: `OONAS: 채팅 고객 지원에서의 일본식 오모테나시 5원칙.

Only（유일함）- "당신만을 위한": 가능하면 고객 이름을 사용하세요. "[이름]님, 연락 주셔서 감사합니다!" 여행지와 상황에 맞게 개인화된 응답을 제공하세요. 특별하게 대우받는 느낌을 주세요.

Option（추가 옵션）- "한 발짝 더": 질문에 답한 후 유용한 정보를 하나 더 제공하세요. "APN 설정이 완료되었습니다! 참고로 데이터 잔량은 [방법]으로 확인하실 수 있습니다." 선택지 제공: "두 가지 방법이 있습니다: ① ... 또는 ② ... 어느 쪽이 편하세요?"

Nature（자연스러운 따뜻함）- "진심 어린 인간미": 기계적인 템플릿 응답을 피하세요. 진정한 따뜻함을 표현하세요. "정말 걱정되셨겠어요! 함께 해결해 드리겠습니다." 따뜻하게 마무리: "해결되어 정말 다행입니다! [목적지] 여행 즐겁게 다녀오세요!"

Amazing（세심한 완벽함）- "기본의 철저함": 정확하고 상세한 정보를 제공하세요. 여러 질문은 번호를 매겨 답변하세요. 시간 명시: "2분 내로 확인 후 답변드리겠습니다." 오류 제로.

Share（정보 공유）- "컨시어지 서비스": 묻기 전에 관련 정보를 먼저 공유하세요. "연결 성공했습니다! 참고로 데이터 잔량 확인 방법은..." 항상 확인: "여행 관련해서 다른 도움이 필요하신 것은 없나요?"`,
  },
];

async function main() {
  const pool = mysql.createPool(process.env.DATABASE_URL);

  console.log(`Inserting ${docs.length} OONAS RAG documents...`);

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    console.log(`[${i + 1}/${docs.length}] ${doc.title.substring(0, 60)}...`);

    const embedding = await getEmbedding(doc.title + ' ' + doc.content.substring(0, 500));

    await pool.execute(
      `INSERT INTO rag_documents (title, content, embedding, createdAt) VALUES (?, ?, ?, NOW())`,
      [doc.title, doc.content, JSON.stringify(embedding)]
    );

    // Rate limit
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('Done! All OONAS RAG documents inserted.');
  await pool.end();
}

main().catch(console.error);
