/**
 * Generates crisp, realistic Japanese receipt and business card PNG Files
 * on an offscreen HTML5 canvas for zero-dependency demo mode testing.
 */
function canvasToPngFile(
  canvas: HTMLCanvasElement,
  fileName: string
): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("无法生成示例图片"));
        return;
      }
      resolve(new File([blob], fileName, { type: "image/png" }));
    }, "image/png");
  });
}

export async function createSampleReceiptFile(): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = 620;
  canvas.height = 760;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 不可用");

  // Receipt paper background
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 2;
  ctx.fillRect(40, 28, 540, 704);
  ctx.strokeRect(40, 28, 540, 704);

  const fontSans =
    '"Yu Gothic UI", "Meiryo", "Hiragino Sans", "Microsoft YaHei", sans-serif';
  const fontMono = '"Consolas", "Courier New", monospace';

  ctx.fillStyle = "#0f172a";
  ctx.textAlign = "center";
  ctx.font = `bold 28px ${fontSans}`;
  ctx.fillText("株式会社マルシェ東京 虎ノ門店", 310, 92);

  ctx.font = `16px ${fontSans}`;
  ctx.fillStyle = "#475569";
  ctx.fillText("東京都港区虎ノ門1-15-8  TEL: 03-5555-0192", 310, 126);
  ctx.fillText("登録番号: T1234567890123", 310, 152);

  ctx.font = `bold 24px ${fontSans}`;
  ctx.fillStyle = "#0f172a";
  ctx.fillText("領 収 書 / レシート", 310, 202);

  ctx.textAlign = "left";
  ctx.font = `17px ${fontMono}`;
  ctx.fillStyle = "#334155";
  ctx.fillText("日付: 2026年11月24日 14:28", 74, 248);
  ctx.fillText("レジNo: 02   担当: 041   取引No: 8821", 74, 276);

  // Dashed divider
  ctx.strokeStyle = "#94a3b8";
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(74, 298);
  ctx.lineTo(546, 298);
  ctx.stroke();

  // Line items
  ctx.setLineDash([]);
  ctx.font = `18px ${fontSans}`;
  ctx.fillStyle = "#0f172a";
  const items = [
    ["A4コピー用紙 (500枚×2)", "x1", "¥1,400"],
    ["USB-C ハブ (会議室用)", "x1", "¥1,800"],
    ["ホワイトボードマーカー 4色", "x1", "¥300"],
  ];

  let y = 340;
  for (const [name, qty, price] of items) {
    ctx.textAlign = "left";
    ctx.fillText(name, 74, y);
    ctx.textAlign = "right";
    ctx.fillText(qty, 420, y);
    ctx.fillText(price, 546, y);
    y += 42;
  }

  ctx.strokeStyle = "#94a3b8";
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(74, 476);
  ctx.lineTo(546, 476);
  ctx.stroke();

  // Subtotal & Tax
  ctx.setLineDash([]);
  ctx.font = `18px ${fontSans}`;
  ctx.fillStyle = "#334155";
  ctx.textAlign = "left";
  ctx.fillText("小計（10%対象）", 74, 518);
  ctx.textAlign = "right";
  ctx.fillText("¥3,500", 546, 518);

  ctx.textAlign = "left";
  ctx.fillText("消費税（10%）", 74, 554);
  ctx.textAlign = "right";
  ctx.fillText("¥350", 546, 554);

  // Total
  ctx.fillStyle = "#0f172a";
  ctx.font = `bold 26px ${fontSans}`;
  ctx.textAlign = "left";
  ctx.fillText("合 計", 74, 608);
  ctx.textAlign = "right";
  ctx.fillText("¥3,850", 546, 608);

  // Payment & summary
  ctx.font = `17px ${fontSans}`;
  ctx.fillStyle = "#475569";
  ctx.textAlign = "left";
  ctx.fillText("支払方法：法人クレジットカード（一括）", 74, 656);
  ctx.fillText("但書：事務用品・会議備品代として", 74, 688);

  return canvasToPngFile(canvas, "sample-receipt.png");
}

export async function createSampleBusinessCardFile(): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = 780;
  canvas.height = 460;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 不可用");

  // Outer card background
  ctx.fillStyle = "#f1f5f9";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 2;
  ctx.fillRect(30, 25, 720, 410);
  ctx.strokeRect(30, 25, 720, 410);

  // Left accent bar
  ctx.fillStyle = "#4f46e5";
  ctx.fillRect(30, 25, 14, 410);

  const fontSans =
    '"Yu Gothic UI", "Meiryo", "Hiragino Sans", "Microsoft YaHei", sans-serif';

  // Company name & English tagline
  ctx.fillStyle = "#4f46e5";
  ctx.font = `bold 24px ${fontSans}`;
  ctx.fillText("株式会社テックフロー・ソリューションズ", 78, 86);

  ctx.fillStyle = "#64748b";
  ctx.font = `14px ${fontSans}`;
  ctx.fillText("TechFlow Solutions Inc. | Enterprise AI & DX", 78, 114);

  // Department & Title
  ctx.fillStyle = "#334155";
  ctx.font = `18px ${fontSans}`;
  ctx.fillText("法人営業本部  エンタープライズ営業部  課長", 78, 174);

  // Name & Furigana
  ctx.fillStyle = "#0f172a";
  ctx.font = `bold 38px ${fontSans}`;
  ctx.fillText("佐藤 健太", 78, 226);

  ctx.fillStyle = "#64748b";
  ctx.font = `16px ${fontSans}`;
  ctx.fillText("サトウ ケンタ / Kenta Sato", 270, 224);

  // Divider
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(78, 256);
  ctx.lineTo(705, 256);
  ctx.stroke();

  // Contact details
  ctx.fillStyle = "#334155";
  ctx.font = `17px ${fontSans}`;
  ctx.fillText("〒106-6120  東京都港区六本木6-10-1 六本木ヒルズ森タワー20F", 78, 296);
  ctx.fillText("TEL: 03-6400-8820 (代表)   携帯: 090-4521-7731", 78, 330);
  ctx.fillText("E-mail: k.sato@techflow-solutions.co.jp", 78, 364);
  ctx.fillText("URL: https://www.techflow-solutions.co.jp", 78, 398);

  return canvasToPngFile(canvas, "sample-business-card.png");
}
