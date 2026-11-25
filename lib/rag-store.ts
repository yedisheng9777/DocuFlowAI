import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";
import { PRIMARY_CHAT_MODEL, withGeminiRetry } from "@/lib/gemini-resilient";

export const EMBEDDING_MODEL = "gemini-embedding-001";
export const CHAT_MODEL = PRIMARY_CHAT_MODEL;

export interface DocumentChunk {
  id: string;
  docId: string;
  docName: string;
  section: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
}

export interface StoredDocument {
  id: string;
  name: string;
  charCount: number;
  chunkCount: number;
  sections: string[];
  createdAt: string;
  isSample?: boolean;
  lang?: "zh" | "ja" | "en";
}

export interface RetrievedChunk {
  id: string;
  docName: string;
  section: string;
  chunkIndex: number;
  chunkNumber: number;
  content: string;
  score: number;
  similarityPercent: number;
}

interface SessionStore {
  documents: StoredDocument[];
  chunks: DocumentChunk[];
}

const globalForRag = globalThis as unknown as {
  __docuflowRagSessions?: Map<string, SessionStore>;
};

function getSessionMap(): Map<string, SessionStore> {
  if (!globalForRag.__docuflowRagSessions) {
    globalForRag.__docuflowRagSessions = new Map<string, SessionStore>();
  }
  return globalForRag.__docuflowRagSessions;
}

export function getOrCreateSession(sessionId: string): SessionStore {
  const map = getSessionMap();
  let session = map.get(sessionId);
  if (!session) {
    session = { documents: [], chunks: [] };
    map.set(sessionId, session);
  }
  return session;
}

export function getSessionDocuments(sessionId: string): {
  documents: StoredDocument[];
  totalChunks: number;
} {
  const session = getOrCreateSession(sessionId);
  return {
    documents: session.documents,
    totalChunks: session.chunks.length,
  };
}

export function clearSession(sessionId: string): void {
  getSessionMap().delete(sessionId);
}

export function removeDocumentFromSession(
  sessionId: string,
  docId: string
): { documents: StoredDocument[]; totalChunks: number } {
  const session = getOrCreateSession(sessionId);
  session.documents = session.documents.filter((d) => d.id !== docId);
  session.chunks = session.chunks.filter((c) => c.docId !== docId);
  return {
    documents: session.documents,
    totalChunks: session.chunks.length,
  };
}

export function saveDocumentToSession(
  sessionId: string,
  doc: StoredDocument,
  chunks: DocumentChunk[]
): { documents: StoredDocument[]; totalChunks: number } {
  const session = getOrCreateSession(sessionId);
  // Avoid duplicating the sample manual if clicked multiple times
  if (doc.isSample) {
    const existingSampleIds = new Set(
      session.documents.filter((d) => d.isSample).map((d) => d.id)
    );
    if (existingSampleIds.size > 0) {
      session.documents = session.documents.filter((d) => !d.isSample);
      session.chunks = session.chunks.filter(
        (c) => !existingSampleIds.has(c.docId)
      );
    }
  }
  session.documents.push(doc);
  session.chunks.push(...chunks);
  return {
    documents: session.documents,
    totalChunks: session.chunks.length,
  };
}

interface RawChunk {
  section: string;
  content: string;
}

const HEADING_PATTERNS = [
  /^#{1,4}\s+(.+)$/,
  /^【([^】]{2,50})】$/,
  /^(第[0-9一二三四五六七八九十百]+[章節編部][\s　：:].+)$/,
];

function detectHeading(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 80) return null;
  for (const pattern of HEADING_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      return match[1].replace(/\*\*|`/g, "").trim();
    }
  }
  return null;
}

/**
 * Splits text into section-aware overlapping chunks suitable for RAG retrieval.
 */
export function chunkDocument(
  rawText: string,
  docName: string,
  maxChunkChars = 550,
  overlapChars = 90
): RawChunk[] {
  const normalized = rawText.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!normalized) return [];

  const lines = normalized.split("\n");
  const sections: { section: string; body: string }[] = [];
  let currentSection = docName.replace(/\.[^.]+$/, "");
  let buffer: string[] = [];

  for (const line of lines) {
    const heading = detectHeading(line);
    if (heading) {
      const body = buffer.join("\n").trim();
      if (body) {
        sections.push({ section: currentSection, body });
      }
      currentSection = heading;
      buffer = [line];
    } else {
      buffer.push(line);
    }
  }

  const trailingBody = buffer.join("\n").trim();
  if (trailingBody) {
    sections.push({ section: currentSection, body: trailingBody });
  }

  const chunks: RawChunk[] = [];
  for (const sec of sections) {
    if (sec.body.length <= maxChunkChars) {
      chunks.push({ section: sec.section, content: sec.body });
      continue;
    }

    const paragraphs = sec.body.split(/\n\n+/);
    let current = "";
    for (const para of paragraphs) {
      const trimmedPara = para.trim();
      if (!trimmedPara) continue;

      if (current && current.length + trimmedPara.length + 2 > maxChunkChars) {
        chunks.push({ section: sec.section, content: current.trim() });
        const overlap = current.slice(-overlapChars).trim();
        current = overlap ? `${overlap}\n\n${trimmedPara}` : trimmedPara;
      } else if (trimmedPara.length > maxChunkChars) {
        if (current) {
          chunks.push({ section: sec.section, content: current.trim() });
          current = "";
        }
        let start = 0;
        while (start < trimmedPara.length) {
          const slice = trimmedPara.slice(start, start + maxChunkChars).trim();
          if (slice) {
            chunks.push({ section: sec.section, content: slice });
          }
          if (start + maxChunkChars >= trimmedPara.length) break;
          start += maxChunkChars - overlapChars;
        }
      } else {
        current = current ? `${current}\n\n${trimmedPara}` : trimmedPara;
      }
    }
    if (current.trim()) {
      chunks.push({ section: sec.section, content: current.trim() });
    }
  }

  return chunks;
}

/**
 * Generates embeddings for document chunks using Gemini embedding model.
 */
export async function embedDocumentChunks(
  texts: string[],
  apiKey: string
): Promise<number[][]> {
  if (texts.length === 0) return [];
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });

  const allEmbeddings: number[][] = [];
  const batchSize = 50;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    try {
      const { result: res } = await withGeminiRetry(
        () =>
          model.batchEmbedContents({
            requests: batch.map((text) => ({
              content: { role: "user", parts: [{ text }] },
              taskType: TaskType.RETRIEVAL_DOCUMENT,
            })),
          }),
        { label: `EmbedBatch(${EMBEDDING_MODEL})` }
      );
      for (const emb of res.embeddings) {
        allEmbeddings.push(emb.values);
      }
    } catch {
      for (const text of batch) {
        const { result: res } = await withGeminiRetry(
          () =>
            model.embedContent({
              content: { role: "user", parts: [{ text }] },
              taskType: TaskType.RETRIEVAL_DOCUMENT,
            }),
          { label: `EmbedItem(${EMBEDDING_MODEL})` }
        );
        allEmbeddings.push(res.embedding.values);
      }
    }
  }

  return allEmbeddings;
}

export async function embedQueryText(
  query: string,
  apiKey: string,
  signal?: AbortSignal
): Promise<number[]> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
  const res = await model.embedContent(
    {
      content: { role: "user", parts: [{ text: query }] },
      taskType: TaskType.RETRIEVAL_QUERY,
    },
    signal ? { signal } : undefined
  );
  return res.embedding.values;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export function retrieveTopChunks(
  sessionId: string,
  queryEmbedding: number[],
  topK = 3
): RetrievedChunk[] {
  const session = getOrCreateSession(sessionId);
  if (session.chunks.length === 0) return [];

  return session.chunks
    .map((chunk) => {
      const score = cosineSimilarity(queryEmbedding, chunk.embedding);
      const clampedScore = Math.max(0, Math.min(1, score));
      return {
        id: chunk.id,
        docName: chunk.docName,
        section: chunk.section,
        chunkIndex: chunk.chunkIndex,
        chunkNumber: chunk.chunkIndex + 1,
        content: chunk.content,
        score,
        similarityPercent: Number((clampedScore * 100).toFixed(1)),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
