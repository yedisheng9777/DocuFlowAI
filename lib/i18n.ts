export type Locale = "ja" | "zh" | "en";

export const LOCALE_OPTIONS: { code: Locale; label: string }[] = [
  { code: "ja", label: "日本語" },
  { code: "zh", label: "中文" },
  { code: "en", label: "English" },
];

export interface I18nDictionary {
  common: {
    appTitle: string;
    appSubtitle: string;
    modulesHeading: string;
    engineTitle: string;
    enginePrimaryModel: string;
    engineEmbedModel: string;
    engineResilience: string;
    modelBadge: string;
    fallbackBadgePrefix: string;
    fallbackUnavailable: string;
  };
  modules: {
    rag: { title: string; subtitle: string; badge: string };
    email: { title: string; subtitle: string; badge: string };
    ocr: { title: string; subtitle: string; badge: string };
  };
  rag: {
    heading: string;
    description: string;
    clearKb: string;
    kbReady: (docs: number, chunks: number) => string;
    kbWaiting: string;
    dropzoneUploading: string;
    dropzoneIdle: string;
    dropzoneFormats: string;
    sampleTag: string;
    sampleDesc: string;
    sampleLoading: string;
    sampleButton: string;
    ingestSuccess: (name: string, chunks: number) => string;
    sampleSuccess: (chunks: number) => string;
    ingestErrorFallback: string;
    loadedDocsHeading: (docs: number, chunks: number) => string;
    chunkUnit: string;
    charUnit: string;
    removeDocTooltip: string;
    suggestedHeading: string;
    suggestedAction: string;
    suggestedLabels: Record<string, string>;
    emptyReadyTitle: string;
    emptyWaitingTitle: string;
    emptyReadyDesc: string;
    emptyWaitingDesc: string;
    streamingLoading: string;
    sourcesDrawerLabel: (count: number) => string;
    topMatchLabel: (pct: string) => string;
    similarityLabel: (pct: string) => string;
    sourceFileLabel: string;
    chunkNumberLabel: (num: number) => string;
    expandCitationsHint: string;
    collapseCitationsHint: string;
    inputPlaceholderReady: string;
    inputPlaceholderWaiting: string;
    sendButton: string;
    requestErrorFallback: string;
  };
  email: {
    heading: string;
    description: string;
    tabs: {
      compose: string;
      minutes: string;
    };
    step1Label: string;
    roles: {
      external_client: { title: string; hint: string };
      internal_manager: { title: string; hint: string };
      colleague: { title: string; hint: string };
    };
    step2Label: string;
    presets: {
      id: string;
      badge: string;
      role: "external_client" | "internal_manager" | "colleague";
      requirement: string;
    }[];
    senderLabel: string;
    senderPlaceholder: string;
    step3Label: string;
    requirementPlaceholder: string;
    generatingButton: string;
    generateButton: string;
    previewTitle: string;
    copiedButton: string;
    copyButton: string;
    copyError: string;
    emptyTitle: string;
    emptyDesc: string;
    fields: {
      subject: string;
      recipientLine: string;
      greeting: string;
      body: string;
      closing: string;
    };
    keigoNotesTitle: string;
    errorFallback: string;
  };
  meeting: {
    description: string;
    samplesLabel: string;
    sampleButtons: {
      "project-weekly": string;
      "client-requirements": string;
    };
    inputLabel: string;
    inputPlaceholder: string;
    extractButton: string;
    extractingButton: string;
    resultTitle: string;
    copyMarkdownButton: string;
    copiedMarkdownButton: string;
    copyError: string;
    emptyTitle: string;
    emptyDesc: string;
    summaryHeading: string;
    decisionsHeading: string;
    todoHeading: string;
    todoCols: {
      task: string;
      assignee: string;
      deadline: string;
      priority: string;
    };
    priorityLabels: Record<"高" | "中" | "低", string>;
    emptyListFallback: string;
    errorFallback: string;
  };
  ocr: {
    heading: string;
    description: string;
    modes: {
      auto: string;
      receipt: string;
      business_card: string;
    };
    dropzoneProcessing: string;
    dropzoneIdle: string;
    dropzoneFormats: string;
    demoTag: string;
    demoReceiptBtn: string;
    demoCardBtn: string;
    openCvToggleLabel: string;
    openCvToggleHint: string;
    statusOpenCvApplied: string;
    statusDirectFallback: string;
    statusDirectManual: string;
    previewTabOriginal: string;
    previewTabEnhanced: string;
    metricsResolution: string;
    metricsSharpness: string;
    previewTitle: string;
    previewEmpty: string;
    resultTitle: string;
    typeReceipt: string;
    typeCard: string;
    exportCsvBtn: string;
    processingTitle: string;
    processingDesc: string;
    emptyTitle: string;
    emptyDesc: string;
    tableColField: string;
    tableColValue: string;
    emptyValue: string;
    lineItemsTitle: (count: number) => string;
    lineColName: string;
    lineColQty: string;
    lineColAmount: string;
    notesPrefix: string;
    csvHeaders: {
      docType: string;
      field: string;
      value: string;
      itemName: string;
      itemQty: string;
      itemAmount: string;
    };
    fieldLabels: Record<string, string>;
    errorFallback: string;
  };
}

export const DICTIONARIES: Record<Locale, I18nDictionary> = {
  zh: {
    common: {
      appTitle: "DocuFlow AI",
      appSubtitle: "— 企业知识库与业务自动化助手",
      modulesHeading: "功能模块",
      engineTitle: "AI 引擎与高可用保护",
      enginePrimaryModel: "主模型：gemini-3.1-flash-lite",
      engineEmbedModel: "向量模型：gemini-embedding-001",
      engineResilience: "503/429 指数退避重试 + 自动降级",
      modelBadge: "模型",
      fallbackBadgePrefix: "已回退模型",
      fallbackUnavailable: "不可用",
    },
    modules: {
      rag: {
        title: "企业内部知识库 RAG 问答",
        subtitle: "文档向量检索与引用回答",
        badge: "模块一",
      },
      email: {
        title: "日企商务敬语与邮件 Agent",
        subtitle: "分对象敬语生成与一键复制",
        badge: "模块二",
      },
      ocr: {
        title: "财务单据 / 名片 OCR 智能提取",
        subtitle: "多模态 JSON 提取与 CSV 导出",
        badge: "模块三",
      },
    },
    rag: {
      heading: "企业内部知识库 RAG 问答",
      description:
        "上传企业制度文档（.txt / .md / .pdf）或加载日企社内规定示例，系统自动完成文本分块、Gemini 向量索引与基于引用的流式问答。",
      clearKb: "清空知识库",
      kbReady: (docs, chunks) => `知识库就绪 (${docs} 文档 / ${chunks} 片段)`,
      kbWaiting: "等待加载文档",
      dropzoneUploading: "正在解析文本并生成向量索引...",
      dropzoneIdle: "点击或拖拽上传企业知识文档",
      dropzoneFormats: "格式，自动分块并写入内存向量库",
      sampleTag: "快速体验（免上传）",
      sampleDesc:
        "一键导入《株式会社サンプル 社内規定・経費精算マニュアル》，含交通费上限、加班流程与远程办公规则。",
      sampleLoading: "正在索引日企社内规定...",
      sampleButton: "加载示例日企社内规定（デモ用サンプル）",
      ingestSuccess: (name, chunks) =>
        `已成功解析「${name}」，生成 ${chunks} 个语义分块并完成向量索引。`,
      sampleSuccess: (chunks) =>
        `已加载《株式会社サンプル 社内規定・経費精算マニュアル》（共 ${chunks} 个语义分块），可直接点击下方推荐提问体验 RAG 检索问答。`,
      ingestErrorFallback: "文档处理失败，请重试",
      loadedDocsHeading: (docs, chunks) =>
        `已加载知识源（${docs} 份文档 · 共 ${chunks} 个向量分块）`,
      chunkUnit: "块",
      charUnit: "字",
      removeDocTooltip: "移除该文档",
      suggestedHeading: "推荐提问（点击立即向知识库发起检索问答）",
      suggestedAction: "点击提问 →",
      suggestedLabels: {
        "q-transport": "交通费报销上限与规则",
        "q-overtime": "加班申请流程与上限",
        "q-telework": "远程办公规定与补贴",
      },
      emptyReadyTitle: "知识库已就绪，请输入您的问题",
      emptyWaitingTitle: "请先导入企业文档或加载示例规定",
      emptyReadyDesc:
        "系统将通过 gemini-embedding-001 计算余弦相似度，检索最相关的文档片段并由 Gemini 流式生成带出处的回答。",
      emptyWaitingDesc:
        "点击上方的「加载示例日企社内规定（デモ用サンプル）」即可在 1 秒内体验完整的 RAG 检索与流式问答。",
      streamingLoading: "正在检索知识库并生成回答...",
      sourcesDrawerLabel: (count) =>
        `引用来源（参照ソース / Citations）· ${count} 条命中`,
      topMatchLabel: (pct) => `最高匹配 ${pct}%`,
      similarityLabel: (pct) => `余弦相似度 ${pct}%`,
      sourceFileLabel: "来源文件",
      chunkNumberLabel: (num) => `Chunk #${num}`,
      expandCitationsHint: "展开溯源",
      collapseCitationsHint: "收起",
      inputPlaceholderReady:
        "输入您想查询的社内规定或文档问题（支持中文 / 日语 / English，Enter 发送）...",
      inputPlaceholderWaiting:
        "请先上传文档或点击「加载示例日企社内规定」...",
      sendButton: "发送",
      requestErrorFallback: "回答生成失败，请稍后重试",
    },
    email: {
      heading: "日企商务敬语与邮件 Agent",
      description:
        "支持按沟通对象生成标准日企敬语邮件，或从会议记录中一键结构化提取会议摘要、决议事项与 ToDo 待办表。",
      tabs: {
        compose: "商务敬语邮件生成（ビジネスメール作成）",
        minutes: "会议纪要与待办提取（議事録・ToDo自動抽出）",
      },
      step1Label: "1. 选择邮件发送对象身份",
      roles: {
        external_client: {
          title: "社外客户",
          hint: "尊敬語・謙譲語 / お世話になっております",
        },
        internal_manager: {
          title: "社内上司",
          hint: "報連相 / お疲れ様です＋丁寧敬語",
        },
        colleague: {
          title: "同事",
          hint: "社内協業 / お疲れ様です＋です・ます調",
        },
      },
      step2Label: "2. 一键填入常见日企场景",
      presets: [
        {
          id: "late-train",
          badge: "迟到致歉 · 社内上司",
          role: "internal_manager",
          requirement:
            "因为电车延误，今天上午的例会要迟到15分钟，给田中部长发个道歉邮件",
        },
        {
          id: "client-followup",
          badge: "会后跟进 · 社外客户",
          role: "external_client",
          requirement:
            "感谢株式会社ABC的佐藤部长昨天抽空参加商谈，今天附上最新报价单和方案PDF请查收，希望本周五前得到反馈",
        },
        {
          id: "colleague-review",
          badge: "请求协助 · 同事",
          role: "colleague",
          requirement:
            "请开发部的高桥前辈帮忙确认一下明天客户演示用的PPT第5页数据是否准确，麻烦今天下午5点前回复",
        },
        {
          id: "leave-request",
          badge: "请假交接 · 社内上司",
          role: "internal_manager",
          requirement:
            "因家里临时有事，想向山田课长申请明天上午半天带薪休假，下午1点半正常返岗，紧急事务已拜托铃木代理",
        },
      ],
      senderLabel: "发件人署名（可选）",
      senderPlaceholder: "例如：営業部 王（留空则自动使用占位符）",
      step3Label: "3. 输入您的邮件需求（支持中文 / 日语 / English）",
      requirementPlaceholder:
        "例如：因为电车延误，今天上午的例会要迟到15分钟，给田中部长发个道歉邮件",
      generatingButton: "正在撰写日本商务敬语邮件...",
      generateButton: "生成日企标准商务邮件",
      previewTitle: "生成结果预览",
      copiedButton: "已复制完整邮件",
      copyButton: "一键复制",
      copyError: "复制失败，请手动选中文本复制",
      emptyTitle: "选择场景或输入需求，一键生成标准日本商务邮件",
      emptyDesc:
        "输出将严格拆分「件名」「宛名」「挨拶」「正文」「結び」五段标准商务格式，并根据对象自动匹配敬语级别。",
      fields: {
        subject: "件名",
        recipientLine: "宛名",
        greeting: "挨拶",
        body: "正文",
        closing: "結び",
      },
      keigoNotesTitle: "商务敬语要点说明",
      errorFallback: "邮件生成失败，请重试",
    },
    meeting: {
      description:
        "粘贴日语或中文会议记录，自动结构化提取核心摘要（3条以内）、已敲定决议与带负责人/期限/优先级的 ToDo 表格。",
      samplesLabel: "一键填入日企会议记录示例",
      sampleButtons: {
        "project-weekly": "プロジェクト定例会議（项目周会）",
        "client-requirements": "クライアント要件確認MTG（客户需求确认）",
      },
      inputLabel: "会议记录文本（支持粘贴日语或中文记录）",
      inputPlaceholder:
        "请粘贴会议记录、语音转写稿或讨论纪要，也可点击上方示例按钮快速体验...",
      extractButton: "提取会议纪要与 ToDo",
      extractingButton: "正在结构化分析会议纪要与待办...",
      resultTitle: "结构化纪要提取结果",
      copyMarkdownButton: "Markdown 形式でコピー（复制为 Markdown）",
      copiedMarkdownButton: "已复制 Markdown 纪要",
      copyError: "复制失败，请手动选中复制",
      emptyTitle: "粘贴会议记录或加载日企会议示例",
      emptyDesc:
        "将强制输出结构化 JSON，并自动整理为「会議サマリー」「決定事項」与「ToDo 任务表」，支持一键复制 Markdown。",
      summaryHeading: "会議サマリー（会议核心摘要）",
      decisionsHeading: "決定事項（已敲定决议）",
      todoHeading: "アクションアイテム / ToDo（待办事项）",
      todoCols: {
        task: "任务内容",
        assignee: "担当者",
        deadline: "期限",
        priority: "優先度",
      },
      priorityLabels: {
        高: "高",
        中: "中",
        低: "低",
      },
      emptyListFallback: "未提取到明确记录",
      errorFallback: "会议纪要提取失败，请重试",
    },
    ocr: {
      heading: "财务单据 / 名片 OCR 智能提取",
      description:
        "上传日本收据（レシート）或商务名片照片（JPG / PNG），通过 Gemini 多模态视觉强制输出结构化 JSON，并支持一键导出 CSV 表格。",
      modes: {
        auto: "自动识别",
        receipt: "财务收据",
        business_card: "商务名片",
      },
      dropzoneProcessing: "正在调用 Gemini 多模态视觉识别并提取 JSON...",
      dropzoneIdle: "点击或拖拽上传收据（レシート）/ 名片图片",
      dropzoneFormats: "格式",
      demoTag: "演示模式（一键加载示例图片并实时识别）",
      demoReceiptBtn: "加载示例票据",
      demoCardBtn: "加载示例名片",
      openCvToggleLabel: "OpenCV 图像增强预处理",
      openCvToggleHint: "灰度化 · 去噪 · 对比度增强 · 自适应二值化",
      statusOpenCvApplied: "OpenCV 增强预处理已生效",
      statusDirectFallback: "当前使用原图直连模式（未检测到本地 OpenCV 服务，已自动降级）",
      statusDirectManual: "当前使用原图直连模式（已关闭预处理）",
      previewTabOriginal: "原始图片",
      previewTabEnhanced: "OpenCV 增强图",
      metricsResolution: "分辨率",
      metricsSharpness: "清晰度评分",
      previewTitle: "单据 / 名片图像预览",
      previewEmpty: "上传图片或点击上方「加载示例票据 / 名片」后在此预览",
      resultTitle: "结构化提取结果",
      typeReceipt: "财务收据",
      typeCard: "商务名片",
      exportCsvBtn: "导出为 CSV",
      processingTitle: "正在通过 Gemini 多模态视觉解析图片内容...",
      processingDesc:
        "强制结构化 JSON 输出（含 503/429 自动重试与备用模型保护）",
      emptyTitle: "等待识别单据或名片",
      emptyDesc:
        "识别后将在此以标准表格展示关键字段，支持直接导出为 UTF-8 CSV 文件供 Excel 或财务系统导入。",
      tableColField: "提取字段",
      tableColValue: "识别结果",
      emptyValue: "（未识别到）",
      lineItemsTitle: (count) => `消费明细项（${count} 项）`,
      lineColName: "品名",
      lineColQty: "数量",
      lineColAmount: "金额",
      notesPrefix: "备注：",
      csvHeaders: {
        docType: "单据类型",
        field: "字段",
        value: "提取内容",
        itemName: "明细品名",
        itemQty: "数量",
        itemAmount: "金额",
      },
      fieldLabels: {
        date: "日期（日付）",
        vendor: "店名 / 公司名",
        totalAmount: "总金额（合計）",
        taxAmount: "税额（消費税）",
        currency: "币种",
        paymentMethod: "支付方式",
        summary: "摘要 / 用途",
        name: "姓名（氏名）",
        nameReading: "读音（フリガナ）",
        company: "公司名",
        department: "部门",
        title: "职位",
        phone: "电话",
        email: "邮箱",
        address: "地址",
        website: "网站",
      },
      errorFallback: "图片识别失败，请重试",
    },
  },

  ja: {
    common: {
      appTitle: "DocuFlow AI",
      appSubtitle: "— 社内ナレッジ＆業務自動化アシスタント",
      modulesHeading: "機能モジュール",
      engineTitle: "AI エンジン・高可用性保護",
      enginePrimaryModel: "主モデル：gemini-3.1-flash-lite",
      engineEmbedModel: "埋め込み：gemini-embedding-001",
      engineResilience: "503/429 指数バックオフ再試行・自動切替",
      modelBadge: "モデル",
      fallbackBadgePrefix: "フォールバック",
      fallbackUnavailable: "利用不可",
    },
    modules: {
      rag: {
        title: "社内ナレッジ RAG 検索",
        subtitle: "文書ベクトル検索・出典付き回答",
        badge: "モジュール 1",
      },
      email: {
        title: "ビジネス敬語メール作成",
        subtitle: "相手別敬語生成・ワンクリックコピー",
        badge: "モジュール 2",
      },
      ocr: {
        title: "領収書・名刺 OCR 抽出",
        subtitle: "構造化 JSON 抽出・CSV エクスポート",
        badge: "モジュール 3",
      },
    },
    rag: {
      heading: "社内ナレッジベース RAG Q&A",
      description:
        "社内規定ドキュメント（.txt / .md / .pdf）をアップロードするかサンプル規定を読み込むと、チャンク分割・Gemini ベクトル検索・出典付きのストリーミング回答を実行します。",
      clearKb: "ナレッジをクリア",
      kbReady: (docs, chunks) =>
        `検索準備完了 (${docs} 文書 / ${chunks} チャンク)`,
      kbWaiting: "ドキュメント未登録",
      dropzoneUploading: "テキスト抽出およびベクトルインデックス作成中...",
      dropzoneIdle: "社内ドキュメントをクリックまたはドラッグして追加",
      dropzoneFormats: "形式に対応（自動チャンク分割＆メモリ検索）",
      sampleTag: "クイック体験（アップロード不要）",
      sampleDesc:
        "『株式会社サンプル 社内規定・経費精算マニュアル』（交通費上限・残業申請・テレワーク規定）をワンクリックで読み込みます。",
      sampleLoading: "社内規定サンプルをインデックス中...",
      sampleButton: "サンプル社内規定を読み込む（デモ用）",
      ingestSuccess: (name, chunks) =>
        `「${name}」を解析し、${chunks} 件のセマンティックチャンクを登録しました。`,
      sampleSuccess: (chunks) =>
        `『株式会社サンプル 社内規定・経費精算マニュアル』（全 ${chunks} チャンク）を読み込みました。下の質問例をクリックしてすぐにお試しいただけます。`,
      ingestErrorFallback: "ドキュメントの解析に失敗しました",
      loadedDocsHeading: (docs, chunks) =>
        `読み込み済みナレッジ（${docs} 件の文書・計 ${chunks} チャンク）`,
      chunkUnit: "チャンク",
      charUnit: "文字",
      removeDocTooltip: "この文書を削除",
      suggestedHeading: "質問サンプル（クリックで即座に RAG 検索を実行）",
      suggestedAction: "質問する →",
      suggestedLabels: {
        "q-transport": "交通費の上限と精算ルール",
        "q-overtime": "残業申請の締切と承認フロー",
        "q-telework": "テレワーク日数上限と手当",
      },
      emptyReadyTitle: "ナレッジの準備が整いました。質問を入力してください",
      emptyWaitingTitle:
        "先にドキュメントをアップロードするかサンプルを読み込んでください",
      emptyReadyDesc:
        "gemini-embedding-001 によるコサイン類似度検索で関連箇所を抽出し、Gemini が根拠の出典付きでストリーミング回答します。",
      emptyWaitingDesc:
        "上の「サンプル社内規定を読み込む（デモ用）」をクリックすると、すぐに RAG 検索とストリーミング回答を体験できます。",
      streamingLoading: "ナレッジを検索して回答を生成中...",
      sourcesDrawerLabel: (count) => `参照ソース（引用元）· ${count}件`,
      topMatchLabel: (pct) => `最高一致 ${pct}%`,
      similarityLabel: (pct) => `コサイン類似度 ${pct}%`,
      sourceFileLabel: "出典ファイル",
      chunkNumberLabel: (num) => `Chunk #${num}`,
      expandCitationsHint: "根拠を表示",
      collapseCitationsHint: "閉じる",
      inputPlaceholderReady:
        "社内規定や文書について質問を入力（日本語・中国語・英語対応 / Enter で送信）...",
      inputPlaceholderWaiting:
        "先に文書をアップロードするかサンプル規定を読み込んでください...",
      sendButton: "送信",
      requestErrorFallback: "回答の生成に失敗しました。再試行してください",
    },
    email: {
      heading: "ビジネス敬語メール・議事録 Agent",
      description:
        "相手に応じた標準ビジネスメールの作成に加え、会議メモからサマリー・決定事項・ToDo を構造化抽出できます。",
      tabs: {
        compose: "ビジネスメール作成",
        minutes: "議事録・ToDo自動抽出",
      },
      step1Label: "1. 送信相手の区分を選択",
      roles: {
        external_client: {
          title: "社外顧客（取引先）",
          hint: "尊敬語・謙譲語 / いつも大変お世話になっております",
        },
        internal_manager: {
          title: "社内上司",
          hint: "報連相 / お疲れ様です＋丁寧な敬語",
        },
        colleague: {
          title: "同僚・先輩",
          hint: "社内連携 / お疲れ様です＋です・ます調",
        },
      },
      step2Label: "2. よく使うビジネス定型シーンをワンクリック入力",
      presets: [
        {
          id: "late-train",
          badge: "電車遅延のお詫び・上司",
          role: "internal_manager",
          requirement:
            "電車の遅延により、本日午前の定例会議に15分ほど遅刻してしまうため、田中部長へお詫びのメールを送りたい",
        },
        {
          id: "client-followup",
          badge: "商談後フォロー・社外顧客",
          role: "external_client",
          requirement:
            "株式会社ABCの佐藤部長へ昨日の商談のお礼と、最新のお見積書・提案資料PDFをお送りするので今週金曜日までにご確認いただきたい旨を伝えたい",
        },
        {
          id: "colleague-review",
          badge: "資料確認依頼・同僚",
          role: "colleague",
          requirement:
            "開発部の高橋先輩に、明日顧客プレゼンで使うPPTの5ページ目の数値が正しいか本日17時までに確認をお願いしたい",
        },
        {
          id: "leave-request",
          badge: "半休申請と引継ぎ・上司",
          role: "internal_manager",
          requirement:
            "家庭の急用のため、山田課長に明日午前の半休取得を申請し、13時半に出社することと緊急対応は鈴木さんへ引き継ぎ済みであることを伝えたい",
        },
      ],
      senderLabel: "差出人名（任意）",
      senderPlaceholder: "例：営業部 佐藤（空欄時はプレースホルダーを使用）",
      step3Label: "3. メールの用件を入力（日本語・中国語・英語対応）",
      requirementPlaceholder:
        "例：電車の遅延で本日午前の定例会議に15分遅れるため、田中部長にお詫びメールを送りたい",
      generatingButton: "ビジネス敬語メールを作成中...",
      generateButton: "ビジネスメールを生成",
      previewTitle: "生成メールプレビュー",
      copiedButton: "メール全文をコピーしました",
      copyButton: "一括コピー",
      copyError: "コピーに失敗しました。手動で選択してコピーしてください",
      emptyTitle: "シーンを選択または用件を入力してメールを生成",
      emptyDesc:
        "「件名」「宛名」「挨拶」「本文」「結び」の5要素に構造化し、送信相手に応じた最適な敬語レベルで出力します。",
      fields: {
        subject: "件名",
        recipientLine: "宛名",
        greeting: "挨拶",
        body: "本文",
        closing: "結び",
      },
      keigoNotesTitle: "敬語・ビジネスマナーのポイント",
      errorFallback: "メールの生成に失敗しました",
    },
    meeting: {
      description:
        "日本語または中国語の会議メモを貼り付けると、会議サマリー（3項目以内）・決定事項・担当者/期限/優先度付きの ToDo テーブルを自動抽出します。",
      samplesLabel: "日系企業ミーティング議事録サンプルをワンクリック入力",
      sampleButtons: {
        "project-weekly": "プロジェクト定例会議",
        "client-requirements": "クライアント要件確認MTG",
      },
      inputLabel: "会議メモ・議事録テキスト（日本語／中国語対応）",
      inputPlaceholder:
        "会議の文字起こしや議事メモを貼り付けるか、上のサンプルボタンをお試しください...",
      extractButton: "議事録・ToDo を抽出",
      extractingButton: "構造化 JSON で議事録・ToDo を抽出中...",
      resultTitle: "構造化抽出結果",
      copyMarkdownButton: "Markdown 形式でコピー",
      copiedMarkdownButton: "Markdown をコピーしました",
      copyError: "コピーに失敗しました。手動でコピーしてください",
      emptyTitle: "会議メモを入力またはサンプルを読み込んで抽出",
      emptyDesc:
        "「会議サマリー」「決定事項」「アクションアイテム / ToDo」の3セクションに整理し、Slack / Teams / Notion 向け Markdown でコピーできます。",
      summaryHeading: "会議サマリー",
      decisionsHeading: "決定事項",
      todoHeading: "アクションアイテム / ToDo",
      todoCols: {
        task: "タスク内容",
        assignee: "担当者",
        deadline: "期限",
        priority: "優先度",
      },
      priorityLabels: {
        高: "高",
        中: "中",
        低: "低",
      },
      emptyListFallback: "該当項目なし",
      errorFallback: "議事録の抽出に失敗しました",
    },
    ocr: {
      heading: "領収書・名刺 OCR インテリジェント抽出",
      description:
        "領収書（レシート）や名刺の画像（JPG / PNG）をアップロードすると、Gemini マルチモーダル視覚モデルが構造化 JSON として項目を抽出し、CSV 出力できます。",
      modes: {
        auto: "自動判別",
        receipt: "領収書・レシート",
        business_card: "ビジネス名刺",
      },
      dropzoneProcessing: "Gemini マルチモーダルで画像を解析し JSON 抽出中...",
      dropzoneIdle: "領収書（レシート）または名刺画像をクリック／ドロップ",
      dropzoneFormats: "形式に対応",
      demoTag: "デモモード（サンプル画像を生成してリアルタイム認識）",
      demoReceiptBtn: "レシート例を試す",
      demoCardBtn: "名刺例を試す",
      openCvToggleLabel: "OpenCV 画像強調前処理",
      openCvToggleHint: "グレースケール・ノイズ除去・コントラスト強調・二値化",
      statusOpenCvApplied: "OpenCV 前処理適用済み",
      statusDirectFallback: "原図直結モードで実行中（OpenCV サービス未接続のため自動切替）",
      statusDirectManual: "原図直結モード（前処理オフ）",
      previewTabOriginal: "元画像",
      previewTabEnhanced: "OpenCV 処理後",
      metricsResolution: "解像度",
      metricsSharpness: "鮮明度スコア",
      previewTitle: "画像プレビュー",
      previewEmpty:
        "画像をアップロードするか、上のサンプルボタンからプレビューできます",
      resultTitle: "構造化抽出データ",
      typeReceipt: "領収書・レシート",
      typeCard: "ビジネス名刺",
      exportCsvBtn: "CSV エクスポート",
      processingTitle: "Gemini ビジョンで画像内の文字を構造化解析中...",
      processingDesc:
        "responseMimeType: application/json 強制出力（503/429 自動再試行保護付き）",
      emptyTitle: "領収書または名刺の認識待機中",
      emptyDesc:
        "抽出された項目は一覧テーブルに表示され、Excel で文字化けしない UTF-8（BOM付き）CSV としてダウンロードできます。",
      tableColField: "抽出項目",
      tableColValue: "認識結果",
      emptyValue: "（記載なし）",
      lineItemsTitle: (count) => `明細一覧（${count} 件）`,
      lineColName: "品名",
      lineColQty: "数量",
      lineColAmount: "金額",
      notesPrefix: "補足：",
      csvHeaders: {
        docType: "帳票種別",
        field: "項目",
        value: "抽出値",
        itemName: "明細品名",
        itemQty: "数量",
        itemAmount: "金額",
      },
      fieldLabels: {
        date: "日付",
        vendor: "店舗名・発行元",
        totalAmount: "合計金額",
        taxAmount: "消費税額",
        currency: "通貨",
        paymentMethod: "支払方法",
        summary: "摘要・但書",
        name: "氏名",
        nameReading: "フリガナ",
        company: "会社名",
        department: "部署",
        title: "役職",
        phone: "電話番号",
        email: "メールアドレス",
        address: "住所",
        website: "Webサイト",
      },
      errorFallback: "画像の解析に失敗しました",
    },
  },

  en: {
    common: {
      appTitle: "DocuFlow AI",
      appSubtitle: "— Enterprise Knowledge & Workflow AI",
      modulesHeading: "Modules",
      engineTitle: "AI Engine & Resilience",
      enginePrimaryModel: "Primary: gemini-3.1-flash-lite",
      engineEmbedModel: "Embedding: gemini-embedding-001",
      engineResilience: "503/429 Exponential Backoff & Fallback",
      modelBadge: "Model",
      fallbackBadgePrefix: "Fallback",
      fallbackUnavailable: "unavailable",
    },
    modules: {
      rag: {
        title: "Knowledge Base RAG",
        subtitle: "Vector search & cited streaming Q&A",
        badge: "Module 1",
      },
      email: {
        title: "Business Email Agent",
        subtitle: "Japanese keigo drafting & 1-click copy",
        badge: "Module 2",
      },
      ocr: {
        title: "Receipt & Card OCR",
        subtitle: "Multimodal JSON extraction & CSV",
        badge: "Module 3",
      },
    },
    rag: {
      heading: "Enterprise Knowledge Base RAG",
      description:
        "Upload internal policy documents (.txt, .md, .pdf) or load the sample Japanese corporate manual for automatic chunking, Gemini vector indexing, and cited streaming answers.",
      clearKb: "Clear KB",
      kbReady: (docs, chunks) => `KB Ready (${docs} docs / ${chunks} chunks)`,
      kbWaiting: "No Documents Loaded",
      dropzoneUploading: "Extracting text and building vector index...",
      dropzoneIdle: "Click or drag & drop corporate documents",
      dropzoneFormats: "files supported for in-memory vector indexing",
      sampleTag: "Instant Demo (No Upload Required)",
      sampleDesc:
        "Load the sample Japanese manual (commuting caps, overtime approval, and remote work policy) in one click.",
      sampleLoading: "Indexing sample policy manual...",
      sampleButton: "Load Sample JP Policy Manual (Demo)",
      ingestSuccess: (name, chunks) =>
        `Indexed "${name}" into ${chunks} semantic chunks.`,
      sampleSuccess: (chunks) =>
        `Loaded Sample JP Policy Manual (${chunks} chunks). Click any suggested prompt below to test RAG retrieval.`,
      ingestErrorFallback: "Failed to process document",
      loadedDocsHeading: (docs, chunks) =>
        `Loaded Sources (${docs} docs · ${chunks} vector chunks)`,
      chunkUnit: "chunks",
      charUnit: "chars",
      removeDocTooltip: "Remove document",
      suggestedHeading: "Suggested Prompts (Click to run RAG retrieval)",
      suggestedAction: "Ask →",
      suggestedLabels: {
        "q-transport": "Commute & Travel Expense Cap",
        "q-overtime": "Overtime Request & Approval Flow",
        "q-telework": "Remote Work Limit & Allowance",
      },
      emptyReadyTitle: "Knowledge base is ready. Ask a question below",
      emptyWaitingTitle: "Upload a document or load the sample manual first",
      emptyReadyDesc:
        "Cosine similarity over gemini-embedding-001 retrieves the top matching passages and streams cited answers via Gemini.",
      emptyWaitingDesc:
        'Click "Load Sample JP Policy Manual (Demo)" above to experience instant vector retrieval and streaming answers.',
      streamingLoading: "Retrieving relevant passages and generating answer...",
      sourcesDrawerLabel: (count) => `Citations (Source Chunks) · ${count}`,
      topMatchLabel: (pct) => `Top ${pct}%`,
      similarityLabel: (pct) => `Similarity ${pct}%`,
      sourceFileLabel: "Source",
      chunkNumberLabel: (num) => `Chunk #${num}`,
      expandCitationsHint: "Inspect",
      collapseCitationsHint: "Hide",
      inputPlaceholderReady:
        "Ask about company policies or uploaded docs (supports EN / JA / ZH, press Enter to send)...",
      inputPlaceholderWaiting:
        "Upload a document or load the sample manual first...",
      sendButton: "Send",
      requestErrorFallback: "Failed to generate answer",
    },
    email: {
      heading: "Business Email & Minutes Agent",
      description:
        "Draft properly calibrated Japanese keigo emails by recipient tier, or extract structured summaries, decisions, and action items from meeting notes.",
      tabs: {
        compose: "Business Email Drafting",
        minutes: "Minutes & ToDo Extractor",
      },
      step1Label: "1. Select Recipient Role",
      roles: {
        external_client: {
          title: "External Client",
          hint: "Honorific & humble keigo / Osewa ni natte orimasu",
        },
        internal_manager: {
          title: "Internal Manager",
          hint: "Ho-Ren-So reporting / Otsukaresama desu + polite keigo",
        },
        colleague: {
          title: "Colleague",
          hint: "Team collaboration / Otsukaresama desu + desu/masu",
        },
      },
      step2Label: "2. One-Click Scenario Presets",
      presets: [
        {
          id: "late-train",
          badge: "Train Delay Apology · Manager",
          role: "internal_manager",
          requirement:
            "Due to a train delay, I will be 15 minutes late to this morning's regular meeting. Please draft an apology email to Director Tanaka.",
        },
        {
          id: "client-followup",
          badge: "Meeting Follow-up · Client",
          role: "external_client",
          requirement:
            "Thank Director Sato at ABC Corp for yesterday's meeting, attach our updated quote and proposal PDF, and ask for feedback by Friday.",
        },
        {
          id: "colleague-review",
          badge: "Review Request · Colleague",
          role: "colleague",
          requirement:
            "Ask Takahashi-san in Engineering to double-check the metrics on slide 5 of tomorrow's client pitch deck before 5 PM today.",
        },
        {
          id: "leave-request",
          badge: "Half-Day Leave · Manager",
          role: "internal_manager",
          requirement:
            "Request tomorrow morning off from Manager Yamada for an urgent family matter, noting I'll return at 1:30 PM and Suzuki-san is covering urgent tasks.",
        },
      ],
      senderLabel: "Sender Name (Optional)",
      senderPlaceholder: "e.g., Sales Dept. Alex (defaults to placeholder)",
      step3Label: "3. Describe Your Email Request (EN / JA / ZH)",
      requirementPlaceholder:
        "e.g., Due to a train delay, I will be 15 minutes late to this morning's meeting. Write an apology email to Director Tanaka.",
      generatingButton: "Drafting Japanese keigo email...",
      generateButton: "Generate Business Email",
      previewTitle: "Generated Email Preview",
      copiedButton: "Copied Full Email",
      copyButton: "Copy All",
      copyError: "Copy failed; please copy the text manually.",
      emptyTitle: "Pick a preset or enter your request to draft a keigo email",
      emptyDesc:
        "Outputs are structured into Subject, Recipient, Greeting, Body, and Closing with keigo calibrated to your audience.",
      fields: {
        subject: "Subject",
        recipientLine: "Recipient",
        greeting: "Greeting",
        body: "Body",
        closing: "Closing",
      },
      keigoNotesTitle: "Keigo & Etiquette Notes",
      errorFallback: "Failed to generate email",
    },
    meeting: {
      description:
        "Paste Japanese or Chinese meeting notes to extract a concise summary (up to 3 items), confirmed decisions, and an actionable ToDo table with owners, deadlines, and priorities.",
      samplesLabel: "One-Click Japanese Meeting Samples",
      sampleButtons: {
        "project-weekly": "Project Weekly Sync",
        "client-requirements": "Client Requirements MTG",
      },
      inputLabel: "Meeting Transcript / Notes (JA / ZH)",
      inputPlaceholder:
        "Paste meeting notes or transcripts here, or load a sample preset above...",
      extractButton: "Extract Minutes & ToDo",
      extractingButton: "Extracting structured minutes & action items...",
      resultTitle: "Structured Meeting Minutes",
      copyMarkdownButton: "Copy as Markdown",
      copiedMarkdownButton: "Copied Markdown",
      copyError: "Copy failed; please copy manually.",
      emptyTitle: "Paste meeting notes or load a sample to extract",
      emptyDesc:
        "Enforces JSON extraction into Summary, Decisions, and Action Items, ready to copy as Markdown for Slack, Teams, or Notion.",
      summaryHeading: "Meeting Summary",
      decisionsHeading: "Key Decisions",
      todoHeading: "Action Items / ToDo",
      todoCols: {
        task: "Task",
        assignee: "Owner",
        deadline: "Deadline",
        priority: "Priority",
      },
      priorityLabels: {
        高: "High",
        中: "Medium",
        低: "Low",
      },
      emptyListFallback: "None detected",
      errorFallback: "Failed to extract meeting minutes",
    },
    ocr: {
      heading: "Receipt & Business Card OCR",
      description:
        "Upload a Japanese receipt or business card image (JPG / PNG) for Gemini multimodal vision extraction into strict JSON tables and 1-click CSV export.",
      modes: {
        auto: "Auto Detect",
        receipt: "Receipt",
        business_card: "Business Card",
      },
      dropzoneProcessing: "Running Gemini Vision OCR & JSON extraction...",
      dropzoneIdle: "Click or drop a receipt or business card image",
      dropzoneFormats: "images supported",
      demoTag: "Demo Mode (Render Sample Image & Extract Live)",
      demoReceiptBtn: "Sample Receipt",
      demoCardBtn: "Sample Card",
      openCvToggleLabel: "OpenCV Image Enhancement",
      openCvToggleHint: "Grayscale · Denoise · CLAHE · Adaptive Threshold",
      statusOpenCvApplied: "OpenCV Preprocessed",
      statusDirectFallback: "Direct Original Mode (OpenCV service offline, auto-fallback)",
      statusDirectManual: "Direct Original Mode (Preprocessing disabled)",
      previewTabOriginal: "Original",
      previewTabEnhanced: "OpenCV Enhanced",
      metricsResolution: "Resolution",
      metricsSharpness: "Sharpness",
      previewTitle: "Image Preview",
      previewEmpty:
        "Upload an image or click a sample button above to preview here",
      resultTitle: "Structured Extraction",
      typeReceipt: "Receipt",
      typeCard: "Business Card",
      exportCsvBtn: "Export CSV",
      processingTitle: "Extracting structured fields with Gemini Vision...",
      processingDesc:
        "Enforced JSON output with 503/429 retry & automatic model fallback",
      emptyTitle: "Waiting for receipt or business card",
      emptyDesc:
        "Extracted fields appear in a structured table ready for UTF-8 BOM CSV export into Excel or finance systems.",
      tableColField: "Field",
      tableColValue: "Extracted Value",
      emptyValue: "(Not detected)",
      lineItemsTitle: (count) => `Line Items (${count})`,
      lineColName: "Item",
      lineColQty: "Qty",
      lineColAmount: "Amount",
      notesPrefix: "Notes: ",
      csvHeaders: {
        docType: "Document Type",
        field: "Field",
        value: "Value",
        itemName: "Item Name",
        itemQty: "Quantity",
        itemAmount: "Amount",
      },
      fieldLabels: {
        date: "Date",
        vendor: "Vendor / Store",
        totalAmount: "Total Amount",
        taxAmount: "Tax Amount",
        currency: "Currency",
        paymentMethod: "Payment Method",
        summary: "Summary / Purpose",
        name: "Full Name",
        nameReading: "Reading (Furigana)",
        company: "Company",
        department: "Department",
        title: "Job Title",
        phone: "Phone",
        email: "Email",
        address: "Address",
        website: "Website",
      },
      errorFallback: "OCR extraction failed",
    },
  },
};
