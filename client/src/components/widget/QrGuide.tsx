/**
 * QrGuide — QRコード再取得の案内（マイページで自己解決・chat は案内のみ＝非履行）
 */
import { Button } from "@/components/ui/button";
import { Bot } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { MYPAGE_URL, QR_LABELS, pick } from "./labels";

interface QrGuideProps {
  /** マイページでも見つからない場合の AI チャット起動 */
  onAskChat: () => void;
}

export function QrGuide({ onAskChat }: QrGuideProps) {
  const { lang: language } = useLanguage();

  return (
    <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto">
      {/* ボットメッセージ */}
      <div className="flex items-start gap-2">
        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot className="w-3.5 h-3.5 text-gray-500" />
        </div>
        <div className="bg-gray-100 rounded-xl rounded-tl-sm px-3 py-2.5 text-xs text-gray-800 leading-relaxed max-w-[85%]">
          <p className="whitespace-pre-wrap">{pick(QR_LABELS.guide, language)}</p>
        </div>
      </div>

      <Button
        onClick={() => window.open(MYPAGE_URL, "_blank", "noopener,noreferrer")}
        className="w-full bg-black hover:bg-gray-800 text-white text-xs"
      >
        {pick(QR_LABELS.openMyPage, language)}
      </Button>

      <Button variant="outline" onClick={onAskChat} className="w-full text-xs">
        <Bot className="w-3 h-3 mr-1" />
        {pick(QR_LABELS.cantFind, language)}
      </Button>
    </div>
  );
}
