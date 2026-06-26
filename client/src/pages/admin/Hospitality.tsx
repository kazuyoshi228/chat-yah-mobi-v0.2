import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";

const sections = [
  {
    id: "credo",
    title: "サービスクレド（信条）",
    content: `**クレド:**
「yah.mobileのチャットサポートは、お客様一人ひとりの旅の安心と快適を最高の使命とします。私たちは、言葉にされたニーズだけでなく、言葉にされない不安や期待をも察知し、世界のどこにいても『yah.mobileを選んでよかった』と感じていただける体験を創造します。」

**モットー:**
"We are Digital Concierges serving Global Travelers."

**ゴールデンルール:**
「もし自分が異国の地で通信トラブルに遭遇したら、どのように対応してほしいか」`,
  },
  {
    id: "three-steps",
    title: "3ステップ・オブ・サービス",
    content: `**Step 1: 温かい出迎え**
ユーザーの言語を即座に検出し、母国語で温かく迎える。名前が分かれば必ず使う。

**Step 2: 先読みと実現**
質問の背景にある「本当の不安」を察知し、聞かれる前に情報を提供する。

**Step 3: 温かい見送り**
解決後も「他にご不安はありませんか？」と確認し、旅の安全を祈る言葉で締める。`,
  },
  {
    id: "heard",
    title: "HEARD法（感情マネジメント）",
    content: `**H - Hear（聞く）:** 顧客の言葉を遮らず最後まで受け止める
**E - Empathize（共感する）:** 「海外でネットが使えないのは本当にお困りですよね」
**A - Apologize（謝罪する）:** 原因に関わらず、不便をかけていることへの謝罪を先に
**R - Resolve（解決する）:** 具体的な解決策を提示し、ステップバイステップで導く
**D - Document（記録する）:** 対応内容を記録し、次回の品質向上に活かす`,
  },
  {
    id: "emotion-levels",
    title: "感情レベル別対応マトリクス",
    content: `**Level 1（平常）:** 効率的で正確な情報提供
**Level 2（軽い不安）:** 安心感の提供 + 情報提供「ご安心ください。一緒に確認していきましょう。」
**Level 3（苛立ち）:** 共感 → 謝罪 → 迅速な解決「ご不便をおかけして大変申し訳ございません。」
**Level 4（怒り）:** 全面的受容 → 深い共感 → 具体的行動 → エスカレーション提案`,
  },
  {
    id: "de-escalation",
    title: "デエスカレーション・テクニック",
    content: `**原則：「感情の検証が先、解決策は後」**

1. **ミラーリング** — 顧客の言葉を繰り返して「聞いている」ことを示す
2. **感情のラベリング** — 顧客の感情を言語化して認める
3. **責任の引き受け** — 原因に関わらず、まず責任を引き受ける
4. **具体的行動の宣言** — 「何をするか」を明確に伝える
5. **選択肢の提示** — 顧客にコントロール感を戻す
6. **タイムフレームの明示** — 不確実性を排除する`,
  },
  {
    id: "anticipatory",
    title: "先読みサービス（Anticipatory Service）",
    content: `**アマン方式の先読み原則:**

• 到着直後「設定方法を教えて」→ 設定手順 + 「完了後すぐに地図アプリが使えます」
• 接続不良「繋がらない」→ トラブルシュート + 「解決までの間、Wi-Fiスポット情報もお伝えします」
• 料金確認「このプランで足りる？」→ プラン詳細 + 「万が一の追加購入方法もご案内します」
• 返金要求「返金してほしい」→ ポリシー説明 + 代替案 + 「ご期待に沿えず申し訳ございません」`,
  },
  {
    id: "tone",
    title: "言語・トーン・スタイルガイド",
    content: `**禁止表現 → 推奨表現:**

• 「それはできません」→「〇〇の方法でお手伝いできます」
• 「規約に書いてあります」→「ご案内いたします。〇〇の理由により...」
• 「お客様の責任です」→「今後このようなことがないよう、〇〇をお勧めいたします」
• 「分かりません」→「確認いたします」
• 「少々お待ちください」→「2分ほどお時間をいただけますか」
• 「他に質問は？」→「他にご不安な点はございませんか？何でもお気軽にどうぞ」`,
  },
  {
    id: "wow",
    title: "WOW体験の創造",
    content: `**Zappos「Deliver WOW」の原則 — 期待を超える対応:**

• 初回利用者 → 設定手順 + 旅行先のおすすめスポット情報
• トラブル解決後 → 「解決しました」+ 次回割引クーポン提供
• 長時間の対応 → 「長時間お付き合いいただきありがとうございます」
• 旅行中の問い合わせ → 技術的回答 + 「素敵なご旅行を！」

**パーソナライゼーション:**
• 過去の問い合わせ履歴を参照
• 旅行先に合わせた一言を添える
• リピーターには「いつもご利用ありがとうございます」`,
  },
  {
    id: "refund-protocol",
    title: "返金要求への対応プロトコル",
    content: `**原則：「No」を言う前に、3つの「Yes」を提供する**

Step 1: 感情の受容 — 「ご期待に沿えない結果となり、大変申し訳ございません。」
Step 2: 状況の確認と共感 — 「ご旅行中にこのようなご不便があったこと、心よりお詫び申し上げます。」
Step 3: 法的根拠の丁寧な説明 — 特定商取引法に基づく説明
Step 4: 代替案の提示（3つのYes）— 有効期限延長 / 割引クーポン / プラン変更相談
Step 5: 例外ケースの確認 — 二重課金・QR未発行は全額返金対象`,
  },
  {
    id: "kpi",
    title: "品質測定KPI",
    content: `• **顧客満足度（CSAT）:** 目標 4.5/5.0以上
• **初回解決率（FCR）:** 目標 85%以上
• **感情改善率:** 目標 80%以上（Level 3-4開始 → Level 1-2終了）
• **NPS（推奨度）:** 目標 +50以上
• **平均対応時間:** 目標 3分以内`,
  },
];

function MarkdownLite({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;
        // Bold
        const formatted = line.replace(
          /\*\*(.*?)\*\*/g,
          '<strong class="font-semibold text-foreground">$1</strong>'
        );
        // Bullet
        if (line.startsWith("•") || line.startsWith("- ")) {
          return (
            <div
              key={i}
              className="pl-4 text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: formatted }}
            />
          );
        }
        // Quote
        if (line.startsWith("「") || line.startsWith('"')) {
          return (
            <div
              key={i}
              className="pl-4 border-l-2 border-primary/30 italic text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: formatted }}
            />
          );
        }
        return (
          <div
            key={i}
            className="text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: formatted }}
          />
        );
      })}
    </div>
  );
}

export default function Hospitality() {
  const [expandedId, setExpandedId] = useState<string | null>("credo");

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 p-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Hospitality Guide
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            世界最高峰のサービス哲学に基づくAIチャット対応基準
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Based on: Ritz-Carlton Gold Standards · Four Seasons Golden Rule ·
            Aman Way of Life · Disney HEARD · Zappos WOW · Nordstrom Judgment
          </p>
        </div>

        <div className="space-y-3">
          {sections.map((section) => (
            <div
              key={section.id}
              className="border rounded-lg overflow-hidden transition-all"
            >
              <button
                onClick={() =>
                  setExpandedId(
                    expandedId === section.id ? null : section.id
                  )
                }
                className="w-full flex items-center justify-between p-4 text-left hover:bg-accent/50 transition-colors"
              >
                <span className="font-medium text-sm">{section.title}</span>
                <svg
                  className={`w-4 h-4 text-muted-foreground transition-transform ${
                    expandedId === section.id ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {expandedId === section.id && (
                <div className="px-4 pb-4 border-t pt-3 bg-muted/20">
                  <MarkdownLite text={section.content} />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-xs text-muted-foreground border-t pt-4">
          参考文献: The Ritz-Carlton Gold Standards · Four Seasons Golden Rule ·
          Aman Way of Life · Disney HEARD Method · Zappos 10 Core Values ·
          Nordstrom Employee Handbook · LAST Method · Mandarin Oriental LQE
        </div>
      </div>
    </DashboardLayout>
  );
}
