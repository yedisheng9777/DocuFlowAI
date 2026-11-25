export type SupportedUiLang = "zh" | "ja" | "en";

export interface SuggestedQuestion {
  id: string;
  title: string;
  question: string;
  category?: string;
  label?: string;
}

export type TrilingualSuggestedQuestions = Record<
  SupportedUiLang,
  SuggestedQuestion[]
>;

export const SAMPLE_MANUAL_TITLE = "株式会社サンプル 社内規定・経費精算マニュアル";
export const SAMPLE_MANUAL_FILENAME = "株式会社サンプル_社内規定・経費精算マニュアル.md";

export const SAMPLE_MANUAL_CONTENT = `# 株式会社サンプル 社内規定・経費精算マニュアル（2026年度版）

制定日：2026年4月1日
管理部門：総務・人事部

## 交通費精算規定

第1条（通勤交通費の支給上限）
1. 正社員および契約社員の通勤交通費は、最も経済的かつ合理的な経路による1か月定期券代を基準として支給する。
2. 通勤交通費の月額支給上限は **50,000円（税込）** とする。上限を超える場合は、事前に総務・人事部および所属長へ「特別通勤経路申請書」を提出し、承認を得なければならない。
3. 在宅勤務（テレワーク）が週3日以上となる社員については、定期券支給ではなく「出社実費精算方式」へ切り替えるものとする。

第2条（国内出張・新幹線・タクシー利用ルール）
1. 片道100km以上の国内出張における新幹線・特急列車の利用は、原則として **普通車指定席** とする。グリーン車の利用は執行役員以上、または医師の診断書等により特別な配慮が認められた場合のみ許可する。
2. タクシーの利用は原則禁止とするが、以下のいずれかに該当する場合は上長承認のうえで精算を認める。
   - 終電後（22:00以降の業務終了）または始発前の移動
   - 悪天候や公共交通機関の運休・大幅遅延時
   - 重い機材・機密書類を運搬する場合
3. タクシーおよび1回あたり **3,000円以上** の交通費精算には、必ず領収書（インボイス対応）の原本または電子データの添付を必須とする。

第3条（精算申請の締切）
交通費および出張旅費の精算申請は、毎月月末締め・**翌月5営業日以内** に経費精算システム（FlowExpense）から申請すること。期限を過ぎた申請は原則として翌月度への繰り越し処理となる。

---

## 時間外労働・残業申請規定

第4条（事前申請の原則と期限）
1. 社員が所定労働時間（9:00〜18:00、休憩1時間）を超えて時間外労働を行う場合は、原則として **当日17:00まで** に勤怠管理システムより「残業事前申請」を提出し、直属の上長（課長職以上）の承認を受けなければならない。
2. 事後申請は、緊急の障害対応や顧客トラブル等やむを得ない事情がある場合に限り、翌営業日午前10:00までの事後承認申請を認める。無断残業は原則として認めない。

第5条（残業時間の上限と特別承認フロー）
1. 月間の時間外労働時間は、36協定に基づき原則 **45時間以内** とする。
2. 業務繁忙等により月30時間を超える見込みとなった時点で、上長および人事部による業務負荷面談を実施する。
3. やむを得ず月45時間を超える場合は、特別条項適用申請として **部門長および人事部長の二段階承認** が事前に必要となる。

第6条（深夜残業・休日出勤の取扱い）
1. 深夜時間帯（22:00〜翌5:00）の勤務は原則禁止とする。やむを得ない場合は、事前に部門長承認を取得すること。
2. 休日に出勤する場合は、原則として事前に「休日出勤申請」および **振替休日の取得予定日**（同月内または翌月以内）を指定して申請すること。割増賃金精算を選択する場合は人事部の確認を要する。
3. 残業時間の計算単位は **15分単位** とし、15分未満の端数は切り捨てではなく1分単位の記録をもとに月次集計で法定義務に従い処理する。

---

## テレワーク・在宅勤務規定

第7条（対象者および実施日数上限）
1. テレワーク（在宅勤務）の対象者は、入社後3か月の試用期間を満了した正社員および契約社員とする。
2. テレワークの実施日数は **週3日まで（月間最大12日程度）** を上限とし、チーム連携維持のため **毎週月曜日および木曜日は原則出社日（オフィス出社推奨日）** とする。
3. テレワークを実施する前日18:00までに、勤怠システム上で勤務形態を「在宅勤務」として登録し、上長へ共有すること。

第8条（テレワーク手当・通信環境）
1. 在宅勤務に伴う光熱費および通信費の補助として、実際の在宅勤務日数に応じて **1日あたり300円（月額上限4,500円）** のテレワーク手当を支給する。
2. コアタイムは出社時と同じ **10:00〜15:00** とし、始業時・終業時は社内チャット（Slack）の勤怠チャンネルへ打刻報告を行うこと。

第9条（情報セキュリティ遵守事項）
1. 業務には必ず会社貸与のPCを使用し、社内ネットワークへ接続する際は **会社指定のVPN接続** を常時有効にすること。
2. カフェや空港等の公衆無線LAN（フリーWi-Fi）をVPNなしで利用すること、および機密情報を含む社内資料を自宅プリンタで印刷することは厳禁とする。
3. 画面覗き見防止のため、公共スペースでのWeb会議や機密資料の閲覧は禁止する。

---

## 慶弔見舞金・特別休暇規定

第10条（慶弔休暇および見舞金）
1. 本人が結婚する場合は、特別有給休暇として **5日間**（入籍日から6か月以内に取得）および結婚祝金 **30,000円** を支給する。
2. 配偶者が出産する場合は、配偶者出産休暇として **3日間**（有給）を取得できる。
3. 慶弔関連の申請は、事実発生後速やかに人事部ポータルより証憑書類（案内状・証明書等）を添えて提出すること。
`;

export const SAMPLE_SUGGESTED_QUESTIONS_BY_LANG: TrilingualSuggestedQuestions = {
  zh: [
    {
      id: "q-transport",
      category: "交通費精算規定",
      title: "交通费报销上限与规则",
      label: "交通费报销上限与规则",
      question:
        "通勤交通费的每月上限是多少？什么情况下可以乘坐新干线或出租车，报销截止期限是什么时候？",
    },
    {
      id: "q-overtime",
      category: "時間外労働・残業申請規定",
      title: "加班申请流程与上限",
      label: "加班申请流程与上限",
      question:
        "加班（时间外劳动）的事前申请截止时间是几点？每月超过 45 小时需要经过怎样的审批流程？",
    },
    {
      id: "q-telework",
      category: "テレワーク・在宅勤務規定",
      title: "远程办公规定与补贴",
      label: "远程办公规定与补贴",
      question:
        "居家办公每周最多可以申请几天？补贴金额是多少，有哪些信息安全禁止事项？",
    },
  ],
  ja: [
    {
      id: "q-transport",
      category: "交通費精算規定",
      title: "交通費の上限と精算ルール",
      label: "交通費の上限と精算ルール",
      question:
        "通勤交通費の上限額や、新幹線・タクシーを利用できる条件と精算期限を教えてください。",
    },
    {
      id: "q-overtime",
      category: "時間外労働・残業申請規定",
      title: "残業申請の締切と承認フロー",
      label: "残業申請の締切と承認フロー",
      question:
        "残業（時間外労働）の事前申請の締切時刻と、月45時間を超える場合の承認フローを教えてください。",
    },
    {
      id: "q-telework",
      category: "テレワーク・在宅勤務規定",
      title: "テレワーク日数上限と手当",
      label: "テレワーク日数上限と手当",
      question:
        "テレワーク（在宅勤務）は週何日まで可能ですか？手当の金額やセキュリティ上の禁止事項も教えてください。",
    },
  ],
  en: [
    {
      id: "q-transport",
      category: "交通費精算規定",
      title: "Commute & Travel Expense Cap",
      label: "Commute & Travel Expense Cap",
      question:
        "What is the monthly cap for commuting expenses, when are Shinkansen or taxis permitted, and what is the reimbursement deadline?",
    },
    {
      id: "q-overtime",
      category: "時間外労働・残業申請規定",
      title: "Overtime Request & Approval Flow",
      label: "Overtime Request & Approval Flow",
      question:
        "What is the deadline for submitting prior overtime approval, and what approval workflow applies when exceeding 45 hours per month?",
    },
    {
      id: "q-telework",
      category: "テレワーク・在宅勤務規定",
      title: "Remote Work Limit & Allowance",
      label: "Remote Work Limit & Allowance",
      question:
        "How many days per week is telework allowed, what is the daily/monthly allowance, and what security restrictions apply?",
    },
  ],
};

export const SAMPLE_SUGGESTED_QUESTIONS: SuggestedQuestion[] =
  SAMPLE_SUGGESTED_QUESTIONS_BY_LANG.ja;

export function getSampleSuggestedQuestions(
  lang?: string
): SuggestedQuestion[] {
  if (lang === "ja" || lang === "en" || lang === "zh") {
    return SAMPLE_SUGGESTED_QUESTIONS_BY_LANG[lang];
  }
  return SAMPLE_SUGGESTED_QUESTIONS_BY_LANG.zh;
}
