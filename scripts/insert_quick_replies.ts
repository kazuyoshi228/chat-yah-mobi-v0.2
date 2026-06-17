import { createQuickReply } from "../server/db";

const templates = [
  {
    title: "接続トラブル対応",
    content: "機内モードを一度オンにして、10秒後にオフにしてみてください。それでも繋がらない場合は、「設定」→「モバイル通信」→yah.mobileのプランで「データローミング」がオンになっているかご確認ください。",
  },
  {
    title: "インストール手順案内",
    content: "iPhoneの場合：「設定」→「モバイル通信」→「モバイル通信プランを追加」からQRコードをスキャンしてください。インストール後、「データローミング」をオンにすることをお忘れなく。",
  },
  {
    title: "QRコード再発行の受付",
    content: "ご不便をおかけして申し訳ございません。QRコードの再発行を承ります。ご注文番号またはご登録メールアドレスをお知らせいただけますか？",
  },
  {
    title: "問題解決の確認クローズ",
    content: "ご確認いただきありがとうございます。問題が解決されたようで安心いたしました。他にご不明な点がございましたら、いつでもお気軽にご連絡ください。yah.mobileをご利用いただきありがとうございます。",
  },
  {
    title: "対応開始の挨拶",
    content: "お問い合わせいただきありがとうございます。yah.mobileサポートが担当いたします。状況をお聞かせください。できる限り迅速にご対応いたします。",
  },
];

async function main() {
  for (const t of templates) {
    await createQuickReply({ title: t.title, content: t.content });
    console.log(`✓ Added: ${t.title}`);
  }
  console.log("Done! 5 quick replies added.");
  process.exit(0);
}

main().catch(console.error);
