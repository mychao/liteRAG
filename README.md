# liteRAG — Enterprise Document Q&A (React + Gemini)

A browser-based RAG (retrieval-augmented generation) assistant for internal documents.
Everything runs client-side — documents are stored in IndexedDB, indexed in memory, and
answers are generated with Google Gemini 2.5 Flash. No backend required for local use,
and an optional server mode is included for enterprise deployments.

## Features

- **Document ingestion** — add text / Markdown / extracted PDF text / images to a knowledge base
- **Chunking with overlap** — 800-character chunks with 100-character overlap so context survives boundaries
- **Hybrid retrieval** — inverted index + TF‑IDF normalisation, Top‑K chunks (default 15), 80k character context budget
- **CJK + English tokenizer** — handles mixed Chinese/English corpora in one index
- **Grounded answers** — chat over the retrieved chunks with source references
- **Knowledge base UI** — paginated document list with a file preview modal
- **Roles and metadata** — documents carry department/type/upload-date metadata; the UI has an admin role switch
- **Model settings** — provider, model name, base URL and API key are configurable at runtime
- **Enterprise server mode** — point the app at your own backend service instead of calling the model directly
- **Bilingual UI** — English / 简体中文 (i18n module)

## Tech stack

| Layer | Choice |
|---|---|
| UI | React 19 + TypeScript |
| Build | Vite 6 |
| Model | `@google/genai` (Gemini 2.5 Flash) |
| Storage | IndexedDB (client-side persistence) |
| Rendering | react-markdown, lucide-react |

## Project layout

```
components/   ChatInterface, KnowledgeBase, Sidebar, Settings, FilePreviewModal
services/     geminiService.ts (chunking, index, retrieval, generation), db.ts (IndexedDB)
utils/        i18n.ts
App.tsx       application shell: tabs, state, role/language/model settings
```

## Run locally

```bash
npm install
# create .env.local with:
# GEMINI_API_KEY=your_key_here
npm run dev
```

`npm run build` produces a static bundle that can be hosted anywhere.

## How retrieval works

1. Each document is split into overlapping chunks; chunk metadata keeps the document id,
   department and type.
2. A term → chunk inverted index is built in memory, with TF‑IDF document norms for scoring.
3. A query is tokenised with the same CJK/Latin tokenizer, scored against the index, and the
   Top‑K chunks are packed into the model context (capped at 80k characters).
4. The model answers only from the retrieved context and cites the source chunks.

## Notes

This is a self-contained demo of the retrieval pipeline — for large corpora swap the in-memory
index for a vector database and move retrieval behind the included server mode.

## License

MIT
