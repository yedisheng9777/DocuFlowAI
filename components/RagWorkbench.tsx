"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  BookOpenCheck,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Database,
  FileText,
  Loader2,
  Send,
  Sparkles,
  Trash2,
  UploadCloud,
  User,
} from "lucide-react";
import type {
  SuggestedQuestion,
  SupportedUiLang,
} from "@/lib/sample-manual";
import { useI18n } from "@/components/I18nProvider";

interface KnowledgeChunk {
  id: string;
  docId: string;
  docName: string;
  section: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
}

interface StoredDocument {
  id: string;
  name: string;
  charCount: number;
  chunkCount: number;
  sections: string[];
  createdAt: string;
  isSample?: boolean;
}

interface SourceReference {
  id: string;
  docName: string;
  section: string;
  chunkIndex?: number;
  chunkNumber?: number;
  score: number;
  similarityPercent?: number;
  snippet: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  queryText?: string;
  sources?: SourceReference[];
  modelUsed?: string;
  primaryModel?: string;
  fallbackUsed?: boolean;
  attempts?: number;
  isStreaming?: boolean;
  error?: string;
}

type IngestNoticeState =
  | { kind: "upload"; name: string; chunks: number }
  | { kind: "sample"; chunks: number }
  | null;

interface RagWorkbenchProps {
  onStatusChange?: (info: { docCount: number; chunkCount: number }) => void;
}

function renderFormattedText(text: string) {
  const lines = text.split("\n");
  return lines.map((line, lineIdx) => {
    const parts = line.split(/(\[引用:[^\]]+\]|\*\*[^*]+\*\*)/g);
    return (
      <div
        key={lineIdx}
        className={line.trim() === "" ? "h-2" : "leading-relaxed"}
      >
        {parts.map((part, partIdx) => {
          if (part.startsWith("[引用:") && part.endsWith("]")) {
            return (
              <span
                key={partIdx}
                className="mx-0.5 inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700"
              >
                <BookOpenCheck className="h-3 w-3 shrink-0" />
                {part.slice(1, -1)}
              </span>
            );
          }
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <strong key={partIdx} className="font-semibold text-slate-900">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return <React.Fragment key={partIdx}>{part}</React.Fragment>;
        })}
      </div>
    );
  });
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractHighlightTerms(queryText?: string): string[] {
  if (!queryText) return [];
  const rawTokens = queryText
    .split(/[\s、。，．？！?!・()（）「」『』【】/\\:;,.をにがはのとでかやも的了吗呢]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);

  return Array.from(new Set(rawTokens))
    .sort((a, b) => b.length - a.length)
    .slice(0, 12);
}

function renderHighlightedSnippet(snippet: string, queryText?: string) {
  const terms = extractHighlightTerms(queryText);
  if (terms.length === 0) return snippet;

  const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi");
  const segments = snippet.split(pattern);

  return segments.map((seg, idx) => {
    const isMatch = terms.some(
      (term) => term.toLowerCase() === seg.toLowerCase()
    );
    if (isMatch) {
      return (
        <mark
          key={idx}
          className="rounded bg-amber-100/90 px-0.5 font-medium text-amber-950"
        >
          {seg}
        </mark>
      );
    }
    return <React.Fragment key={idx}>{seg}</React.Fragment>;
  });
}

export default function RagWorkbench({ onStatusChange }: RagWorkbenchProps) {
  const { locale, t } = useI18n();
  const [sessionId, setSessionId] = useState<string>("");
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [knowledgeChunks, setKnowledgeChunks] = useState<KnowledgeChunk[]>([]);
  const totalChunks = knowledgeChunks.length;
  const [suggestionsCache, setSuggestionsCache] = useState<
    Partial<Record<SupportedUiLang, SuggestedQuestion[]>>
  >({});
  const [suggestionsDocLang, setSuggestionsDocLang] =
    useState<SupportedUiLang | null>(null);
  const [suggestionsDocId, setSuggestionsDocId] = useState<string | null>(null);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestAction, setIngestAction] = useState<"upload" | "sample" | null>(
    null
  );
  const [ingestError, setIngestError] = useState<string | null>(null);
  const [ingestNotice, setIngestNotice] = useState<IngestNoticeState>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [expandedSources, setExpandedSources] = useState<
    Record<string, boolean>
  >({});

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const preloadSeqRef = useRef(0);

  const activeSuggestions =
    knowledgeChunks.length > 0
      ? (suggestionsCache[locale] ??
          (suggestionsDocLang
            ? suggestionsCache[suggestionsDocLang]
            : undefined) ??
          Object.values(suggestionsCache).find(
            (list) => Array.isArray(list) && list.length > 0
          ) ??
          [])
      : [];

  useEffect(() => {
    const newId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `session-${Date.now()}`;
    setSessionId(newId);
  }, []);

  useEffect(() => {
    onStatusChange?.({
      docCount: documents.length,
      chunkCount: totalChunks,
    });
  }, [documents.length, totalChunks, onStatusChange]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function preloadRemainingLanguagesSilently(
    questions: SuggestedQuestion[],
    sourceLang: SupportedUiLang,
    targetDocId: string
  ) {
    if (questions.length === 0) return;
    const seq = ++preloadSeqRef.current;

    void fetch("/api/rag/translate-suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questions, sourceLang }),
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (preloadSeqRef.current !== seq) return;
        if (
          ok &&
          data?.ok &&
          data.translations &&
          typeof data.translations === "object"
        ) {
          setSuggestionsCache((prev) => {
            if (preloadSeqRef.current !== seq || !prev[sourceLang]?.length) {
              return prev;
            }
            void targetDocId;
            return {
              ...prev,
              ...(data.translations as Partial<
                Record<SupportedUiLang, SuggestedQuestion[]>
              >),
            };
          });
        }
      })
      .catch(() => {
        // Silent background preload: keep original-language suggestions if translation fails
      });
  }

  async function handleFileUpload(file: File) {
    if (!sessionId || isIngesting) return;
    preloadSeqRef.current += 1;
    setIngestError(null);
    setIngestNotice(null);
    setIsIngesting(true);
    setIngestAction("upload");
    setIsGeneratingSuggestions(true);
    setSuggestionsCache({});
    setSuggestionsDocLang(null);
    setSuggestionsDocId(null);

    try {
      const formData = new FormData();
      formData.append("sessionId", sessionId);
      formData.append("file", file);

      const res = await fetch("/api/rag/ingest", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || t.rag.ingestErrorFallback);
      }

      const uploadedDoc = data.document as StoredDocument;
      const uploadedChunks = Array.isArray(data.chunks)
        ? (data.chunks as KnowledgeChunk[])
        : [];
      setDocuments((prev) => [...prev, uploadedDoc]);
      setKnowledgeChunks((prev) => [...prev, ...uploadedChunks]);
      setIngestNotice({
        kind: "upload",
        name: uploadedDoc.name,
        chunks: uploadedDoc.chunkCount,
      });

      const docLang: SupportedUiLang =
        data.docLang === "zh" || data.docLang === "ja" || data.docLang === "en"
          ? data.docLang
          : "ja";
      const questions = Array.isArray(data.suggestedQuestions)
        ? (data.suggestedQuestions as SuggestedQuestion[])
        : [];

      if (questions.length > 0) {
        setSuggestionsCache({ [docLang]: questions });
        setSuggestionsDocLang(docLang);
        setSuggestionsDocId(data.document.id);
        preloadRemainingLanguagesSilently(questions, docLang, data.document.id);
      }
    } catch (err) {
      setIngestError(
        err instanceof Error ? err.message : t.rag.ingestErrorFallback
      );
    } finally {
      setIsIngesting(false);
      setIsGeneratingSuggestions(false);
      setIngestAction(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleLoadSample() {
    if (!sessionId || isIngesting) return;

    preloadSeqRef.current += 1;
    setIsGeneratingSuggestions(false);
    setIngestError(null);
    setIngestNotice(null);
    setIsIngesting(true);
    setIngestAction("sample");

    try {
      const res = await fetch("/api/rag/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "sample", sessionId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || t.rag.ingestErrorFallback);
      }

      const sampleDoc = data.document as StoredDocument;
      const sampleChunks = Array.isArray(data.chunks)
        ? (data.chunks as KnowledgeChunk[])
        : [];
      const existingSampleIds = new Set(
        documents.filter((d) => d.isSample).map((d) => d.id)
      );
      setDocuments((prev) => [...prev.filter((d) => !d.isSample), sampleDoc]);
      setKnowledgeChunks((prev) => [
        ...prev.filter((c) => !existingSampleIds.has(c.docId)),
        ...sampleChunks,
      ]);

      if (
        data.suggestedQuestionsByLang &&
        typeof data.suggestedQuestionsByLang === "object"
      ) {
        setSuggestionsCache(
          data.suggestedQuestionsByLang as Partial<
            Record<SupportedUiLang, SuggestedQuestion[]>
          >
        );
        setSuggestionsDocLang("ja");
        setSuggestionsDocId(sampleDoc.id);
      } else if (Array.isArray(data.suggestedQuestions)) {
        setSuggestionsCache({
          ja: data.suggestedQuestions as SuggestedQuestion[],
        });
        setSuggestionsDocLang("ja");
        setSuggestionsDocId(sampleDoc.id);
      }
      setIngestNotice({
        kind: "sample",
        chunks: sampleDoc.chunkCount,
      });
    } catch (err) {
      setIngestError(
        err instanceof Error ? err.message : t.rag.ingestErrorFallback
      );
    } finally {
      setIsIngesting(false);
      setIngestAction(null);
    }
  }

  function handleRemoveDocument(docId: string, isSample?: boolean) {
    const remainingDocs = documents.filter((d) => d.id !== docId);
    const remainingChunks = knowledgeChunks.filter((c) => c.docId !== docId);
    setDocuments(remainingDocs);
    setKnowledgeChunks(remainingChunks);
    if (
      isSample ||
      docId === suggestionsDocId ||
      remainingChunks.length === 0
    ) {
      preloadSeqRef.current += 1;
      setSuggestionsCache({});
      setSuggestionsDocLang(null);
      setSuggestionsDocId(null);
    }
    if (remainingChunks.length === 0) {
      setIngestNotice(null);
    }
  }

  function handleClearAll() {
    preloadSeqRef.current += 1;
    setIsGeneratingSuggestions(false);
    setDocuments([]);
    setKnowledgeChunks([]);
    setSuggestionsCache({});
    setSuggestionsDocLang(null);
    setSuggestionsDocId(null);
    setMessages([]);
    setIngestNotice(null);
    setIngestError(null);
  }

  async function submitQuestion(rawQuestion: string) {
    const question = rawQuestion.trim();
    if (!question || !sessionId || isAsking || knowledgeChunks.length === 0) {
      return;
    }

    const userMsgId = `u-${Date.now()}`;
    const assistantMsgId = `a-${Date.now() + 1}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);

    setInputValue("");
    setIsAsking(true);
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", content: question },
      {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        queryText: question,
        isStreaming: true,
      },
    ]);

    try {
      const res = await fetch("/api/rag/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          question,
          knowledgeChunks,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(errBody.error || `HTTP ${res.status}`);
      }

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("text/event-stream") || !res.body) {
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          answer?: string;
          citations?: SourceReference[];
          model?: string;
          primaryModel?: string;
          fallbackUsed?: boolean;
          error?: string;
        };
        if (!data.ok || !data.answer) {
          throw new Error(data.error || t.rag.requestErrorFallback);
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content: data.answer || "",
                  sources: data.citations || [],
                  modelUsed: data.model,
                  primaryModel: data.primaryModel,
                  fallbackUsed: Boolean(data.fallbackUsed),
                  isStreaming: false,
                }
              : m
          )
        );
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const handlePayload = (line: string) => {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) return;
        const jsonStr = trimmed.slice(5).trim();
        if (!jsonStr) return;

        const payload = JSON.parse(jsonStr) as {
          type?: string;
          sources?: SourceReference[];
          text?: string;
          model?: string;
          primaryModel?: string;
          fallbackUsed?: boolean;
          error?: string;
        };

        if (payload.type === "sources" && Array.isArray(payload.sources)) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, sources: payload.sources || [] }
                : m
            )
          );
        } else if (payload.type === "delta" && typeof payload.text === "string") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: `${m.content}${payload.text}` }
                : m
            )
          );
        } else if (payload.type === "done") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    modelUsed: payload.model,
                    primaryModel: payload.primaryModel,
                    fallbackUsed: Boolean(payload.fallbackUsed),
                    isStreaming: false,
                  }
                : m
            )
          );
        } else if (payload.type === "error") {
          throw new Error(payload.error || t.rag.requestErrorFallback);
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx = buffer.indexOf("\n");
        while (newlineIdx >= 0) {
          const line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          handlePayload(line);
          newlineIdx = buffer.indexOf("\n");
        }
      }

      if (buffer.trim()) {
        handlePayload(buffer);
      }
    } catch (err) {
      const isAbort =
        controller.signal.aborted ||
        (err instanceof Error && err.name === "AbortError");
      const errorMessage = isAbort
        ? t.rag.requestErrorFallback
        : err instanceof Error
          ? err.message
          : t.rag.requestErrorFallback;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, isStreaming: false, error: errorMessage }
            : m
        )
      );
    } finally {
      clearTimeout(timer);
      setIsAsking(false);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId ? { ...m, isStreaming: false } : m
        )
      );
    }
  }

  return (
    <div className="flex h-full flex-col gap-5">
      {/* Module Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex shrink-0 items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200">
              {t.modules.rag.badge}
            </span>
            <h2 className="text-lg font-semibold text-slate-900">
              {t.rag.heading}
            </h2>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            {t.rag.description}
          </p>
        </div>

        {documents.length > 0 && knowledgeChunks.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t.rag.clearKb}
          </button>
        )}
      </div>

      {/* Knowledge Base Ingestion Row */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-12">
          {/* File Upload Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const dropped = e.dataTransfer.files?.[0];
              if (dropped) handleFileUpload(dropped);
            }}
            onClick={() => !isIngesting && fileInputRef.current?.click()}
            className={`lg:col-span-7 flex cursor-pointer items-center gap-4 rounded-xl border-2 border-dashed px-5 py-4 transition ${
              isDragging
                ? "border-indigo-500 bg-indigo-50/70"
                : "border-slate-200 bg-slate-50/60 hover:border-indigo-300 hover:bg-slate-50"
            } ${isIngesting ? "pointer-events-none opacity-60" : ""}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200">
              {ingestAction === "upload" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <UploadCloud className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800">
                {ingestAction === "upload"
                  ? t.rag.dropzoneUploading
                  : t.rag.dropzoneIdle}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                <span className="font-mono font-medium">.txt</span> /{" "}
                <span className="font-mono font-medium">.md</span> /{" "}
                <span className="font-mono font-medium">.pdf</span>{" "}
                {t.rag.dropzoneFormats}
              </p>
            </div>
          </div>

          {/* Highlighted Demo Sample CTA */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span>{t.rag.sampleTag}</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                {t.rag.sampleDesc}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLoadSample}
              disabled={isIngesting}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2.5 text-center text-xs font-semibold leading-snug text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
            >
              {ingestAction === "sample" ? (
                <>
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  <span>{t.rag.sampleLoading}</span>
                </>
              ) : (
                <>
                  <BookOpenCheck className="h-4 w-4 shrink-0" />
                  <span>{t.rag.sampleButton}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status Feedback */}
        {ingestError && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{ingestError}</span>
          </div>
        )}
        {ingestNotice && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              {ingestNotice.kind === "sample"
                ? t.rag.sampleSuccess(ingestNotice.chunks)
                : t.rag.ingestSuccess(ingestNotice.name, ingestNotice.chunks)}
            </span>
          </div>
        )}

        {/* Loaded Documents List */}
        {documents.length > 0 && knowledgeChunks.length > 0 && (
          <div className="mt-3 border-t border-slate-100 pt-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Database className="h-3.5 w-3.5 shrink-0" />
              <span>{t.rag.loadedDocsHeading(documents.length, totalChunks)}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
                  <span className="truncate font-medium text-slate-800">
                    {doc.name}
                  </span>
                  <span className="shrink-0 text-slate-400">
                    {doc.chunkCount} {t.rag.chunkUnit} ·{" "}
                    {doc.charCount.toLocaleString()} {t.rag.charUnit}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveDocument(doc.id, doc.isSample)}
                    title={t.rag.removeDocTooltip}
                    className="ml-1 shrink-0 rounded p-0.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Suggested Questions (strictly visible only when knowledgeChunks > 0) */}
      {(isGeneratingSuggestions ||
        (knowledgeChunks.length > 0 && activeSuggestions.length > 0)) && (
        <section className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            {isGeneratingSuggestions ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-indigo-600" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
            )}
            <span>
              {isGeneratingSuggestions
                ? t.rag.generatingSuggestions
                : t.rag.suggestedHeading}
            </span>
          </div>

          {isGeneratingSuggestions ? (
            <div className="grid gap-2 md:grid-cols-3">
              {[0, 1, 2].map((idx) => (
                <div
                  key={idx}
                  className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3"
                >
                  <div className="h-4 w-24 animate-pulse rounded bg-indigo-100/80" />
                  <div className="h-3 w-full animate-pulse rounded bg-slate-200/80" />
                  <div className="h-3 w-4/5 animate-pulse rounded bg-slate-200/80" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-3">
              {activeSuggestions.map((sq) => (
                <button
                  key={sq.id}
                  type="button"
                  disabled={isAsking || isIngesting}
                  onClick={() => submitQuestion(sq.question)}
                  className="group flex flex-col items-start rounded-lg border border-slate-200 bg-slate-50/80 p-2.5 text-left transition hover:border-indigo-300 hover:bg-indigo-50/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="flex w-full items-start justify-between gap-2">
                    <span className="rounded bg-white px-1.5 py-0.5 text-[11px] font-medium leading-snug text-indigo-700 ring-1 ring-indigo-100">
                      {sq.title || t.rag.suggestedLabels[sq.id] || sq.label}
                    </span>
                    <span className="shrink-0 whitespace-nowrap text-[11px] text-slate-400 group-hover:text-indigo-600">
                      {t.rag.suggestedAction}
                    </span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-700">
                    {sq.question}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* RAG Chat Workspace */}
      <section className="flex min-h-[380px] flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Chat Stream Area */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 ? (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <Bot className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-slate-800">
                {totalChunks > 0
                  ? t.rag.emptyReadyTitle
                  : t.rag.emptyWaitingTitle}
              </h3>
              <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-500">
                {totalChunks > 0
                  ? t.rag.emptyReadyDesc
                  : t.rag.emptyWaitingDesc}
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === "user";
              const isSourcesOpen = Boolean(expandedSources[msg.id]);

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  {!isUser && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
                      isUser
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 bg-slate-50/70 text-slate-800"
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {msg.content}
                      </p>
                    ) : msg.error ? (
                      <div className="flex items-start gap-2 text-red-600">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{msg.error}</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {msg.content ? (
                          <div className="space-y-1">
                            {renderFormattedText(msg.content)}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                            <span>{t.rag.streamingLoading}</span>
                          </div>
                        )}

                        {msg.isStreaming && msg.content && (
                          <span className="inline-block h-4 w-1.5 animate-pulse rounded-sm bg-indigo-500 align-middle" />
                        )}

                        {/* Active Model Badge */}
                        {msg.modelUsed && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-slate-500">
                            <span
                              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono ${
                                msg.fallbackUsed
                                  ? "border border-amber-200 bg-amber-50 text-amber-800"
                                  : "bg-slate-200/70 text-slate-600"
                              }`}
                            >
                              {msg.fallbackUsed
                                ? `${t.common.fallbackBadgePrefix}: ${msg.modelUsed} (${msg.primaryModel} ${t.common.fallbackUnavailable})`
                                : `${t.common.modelBadge}: ${msg.modelUsed}`}
                            </span>
                          </div>
                        )}

                        {/* Retrieved Source Snippets Drawer (Top-3 Citations) */}
                        {msg.sources && msg.sources.length > 0 && (() => {
                          const topPct = Math.max(
                            0,
                            Math.min(
                              100,
                              msg.sources[0].similarityPercent ??
                                msg.sources[0].score * 100
                            )
                          ).toFixed(1);

                          return (
                            <div className="mt-3 border-t border-slate-200/80 pt-2.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedSources((prev) => ({
                                    ...prev,
                                    [msg.id]: !prev[msg.id],
                                  }))
                                }
                                aria-expanded={isSourcesOpen}
                                className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700"
                              >
                                <span className="inline-flex items-center gap-1.5">
                                  <BookOpenCheck className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
                                  <span>
                                    {t.rag.sourcesDrawerLabel(
                                      msg.sources.length
                                    )}
                                  </span>
                                </span>
                                <span className="inline-flex items-center gap-2">
                                  <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-indigo-700">
                                    {t.rag.topMatchLabel(topPct)}
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                                    {isSourcesOpen
                                      ? t.rag.collapseCitationsHint
                                      : t.rag.expandCitationsHint}
                                    {isSourcesOpen ? (
                                      <ChevronUp className="h-3.5 w-3.5" />
                                    ) : (
                                      <ChevronDown className="h-3.5 w-3.5" />
                                    )}
                                  </span>
                                </span>
                              </button>

                              {isSourcesOpen && (
                                <div className="mt-2 space-y-2.5">
                                  {msg.sources.map((src, idx) => {
                                    const pctNum = Math.max(
                                      0,
                                      Math.min(
                                        100,
                                        src.similarityPercent ??
                                          Number((src.score * 100).toFixed(1))
                                      )
                                    );
                                    const pctStr = pctNum.toFixed(1);
                                    const chunkNum =
                                      src.chunkNumber ??
                                      (typeof src.chunkIndex === "number"
                                        ? src.chunkIndex + 1
                                        : idx + 1);
                                    const barColor =
                                      pctNum >= 75
                                        ? "bg-emerald-500"
                                        : pctNum >= 55
                                          ? "bg-indigo-500"
                                          : "bg-slate-400";
                                    const badgeStyle =
                                      pctNum >= 75
                                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                        : pctNum >= 55
                                          ? "bg-indigo-50 text-indigo-700 ring-indigo-200"
                                          : "bg-slate-100 text-slate-600 ring-slate-200";

                                    return (
                                      <div
                                        key={src.id}
                                        className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-sm"
                                      >
                                        {/* Source Metadata Header */}
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                            <span className="inline-flex items-center rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white">
                                              #{idx + 1}
                                            </span>
                                            <span className="inline-flex items-center rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200">
                                              {t.rag.chunkNumberLabel(chunkNum)}
                                            </span>
                                            <span className="truncate font-medium text-slate-800">
                                              {src.docName}
                                            </span>
                                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                                              {src.section}
                                            </span>
                                          </div>

                                          <span
                                            className={`shrink-0 rounded px-2 py-0.5 font-mono text-[11px] font-semibold ring-1 ring-inset ${badgeStyle}`}
                                          >
                                            {t.rag.similarityLabel(pctStr)}
                                          </span>
                                        </div>

                                        {/* Cosine Similarity Progress Bar */}
                                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                          <div
                                            className={`h-full rounded-full transition-all ${barColor}`}
                                            style={{ width: `${pctNum}%` }}
                                          />
                                        </div>

                                        {/* Highlighted Original Snippet */}
                                        <p className="mt-2.5 whitespace-pre-wrap rounded-md border border-slate-100 bg-slate-50/70 p-2.5 leading-relaxed text-slate-700">
                                          {renderHighlightedSnippet(
                                            src.snippet,
                                            msg.queryText
                                          )}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-700">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitQuestion(inputValue);
          }}
          className="border-t border-slate-200 bg-slate-50/70 p-3"
        >
          <div className="flex items-end gap-2">
            <textarea
              rows={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitQuestion(inputValue);
                }
              }}
              disabled={totalChunks === 0 || isAsking}
              placeholder={
                totalChunks > 0
                  ? t.rag.inputPlaceholderReady
                  : t.rag.inputPlaceholderWaiting
              }
              className="max-h-32 min-h-[42px] flex-1 resize-none rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
            <button
              type="submit"
              disabled={
                totalChunks === 0 || isAsking || inputValue.trim().length === 0
              }
              className="inline-flex h-[42px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isAsking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span>{t.rag.sendButton}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
