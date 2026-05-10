# d3: 知识库 AI 对话 — LLM RAG 集成实施计划

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** 将 rag_service.py 中的占位符替换为真实 LLM 调用，添加 SSE 流式响应，前端支持流式渲染和引用展示。

**Architecture:** 后端通过 OpenAI 兼容 API 调用 LLM（支持 deepseek/openai/ollama），SSE 流式传输到前端 ChatPanel 逐字渲染，答案中引用文档来源。

**Tech Stack:** FastAPI SSE (StreamingResponse) + openai Python SDK + Next.js EventSource/ReadableStream + React state 管理

**前置条件:** 用户需提供 LLM API 配置（endpoint/key/model），或复用 Hermes 已有配置。

---

## Task 1: 添加 LLM 配置到后端 config 和 .env

**Objective:** 在 backend 添加 OPENAI_API_KEY、OPENAI_BASE_URL、LLM_MODEL 环境变量和 Pydantic settings

**Files:**
- Modify: `backend/app/core/config.py`
- Modify: `.env.dev`
- Modify: `.env.example`

**Step 1: 编辑 config.py 添加 LLM 字段**

```python
# 在 Settings 类中添加
OPENAI_API_KEY: str = ""
OPENAI_BASE_URL: str = "https://api.deepseek.com/v1"
LLM_MODEL: str = "deepseek-chat"
```

若 OPENAI_API_KEY 为空则在启动时打印警告而非崩溃。

**Step 2: 编辑 .env.dev 和 .env.example**

```
# LLM (OpenAI 兼容 API)
OPENAI_API_KEY=sk-your-key-here
OPENAI_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat
```

**Step 3: 验证**

```bash
cd backend
python -c "from app.core.config import settings; print(settings.LLM_MODEL)"
# Expected: deepseek-chat
```

---

## Task 2: 重写 rag_service.py — 接入真实 LLM

**Objective:** 用 openai SDK 替换 `[RAG Prompt 已生成...]` 占位符，实现真正的 LLM 问答

**Files:**
- Modify: `backend/app/services/rag_service.py`
- Check: `backend/requirements.txt` 确保 openai 在依赖中

**Step 1: 检查并添加 openai 依赖**

需要 `openai>=1.0.0`。

**Step 2: 重写 `ask_question` 函数**

将第 146-155 行的占位符替换为：

```python
async def ask_question(
    question: str,
    history: Optional[list[dict]] = None,
    top_k: int = 5,
) -> dict:
    """RAG 问答：向量检索 → 上下文拼接 → LLM 生成答案"""
    qdrant = _get_qdrant()
    
    if qdrant is None:
        return {
            "answer": "知识库向量数据库（Qdrant）当前不可用，请稍后重试。",
            "sources": [],
        }
    
    # 向量化问题
    query_vector = _get_embedding(question)
    
    # Qdrant 检索
    try:
        results = qdrant.search(
            collection_name=_collection_name,
            query_vector=query_vector,
            limit=top_k,
        )
    except Exception:
        return {
            "answer": "知识库向量检索失败，请先上传并索引文档后再试。",
            "sources": [],
        }
    
    if not results:
        return {
            "answer": "未找到与您问题相关的知识库内容。请尝试修改问题或上传相关文档。",
            "sources": [],
        }
    
    # 构建上下文和来源列表
    contexts = []
    sources = []
    seen_docs = set()
    
    for r in results:
        payload = r.payload or {}
        snippet = (payload.get("text", "") or "")[:200]
        doc_id = payload.get("doc_id", "")
        
        contexts.append({
            "title": payload.get("title", "未知文档"),
            "text": payload.get("text", ""),
        })
        
        if doc_id and doc_id not in seen_docs:
            seen_docs.add(doc_id)
            sources.append({
                "doc_id": doc_id,
                "title": payload.get("title", "未知文档"),
                "snippet": snippet,
            })
    
    # 构造 prompt
    prompt = _build_prompt(question, contexts, history)
    
    # ── 调用 LLM API ──
    if not settings.OPENAI_API_KEY:
        return {
            "answer": f"[LLM 未配置] 请在 .env.dev 中设置 OPENAI_API_KEY。\n\n检索到 {len(results)} 个相关分块，来自 {len(sources)} 篇文档。",
            "sources": sources,
        }
    
    try:
        import openai
        client = openai.AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL,
        )
        completion = await client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=2000,
        )
        answer = completion.choices[0].message.content or ""
    except Exception as e:
        answer = f"LLM 调用失败: {str(e)[:200]}。检索到 {len(results)} 个相关分块来自 {len(sources)} 篇文档。"
    
    return {
        "answer": answer,
        "sources": sources,
    }
```

**Step 3: 验证**

```bash
cd backend
python -c "
import asyncio
from app.services.rag_service import _build_prompt
# 测试 prompt 构建
prompt = _build_prompt('什么是档案管理？', [{'title':'测试', 'text':'档案管理是...'}])
print('Prompt generated:', len(prompt), 'chars')
"
```

---

## Task 3: 添加 SSE 流式 RAG 问答端点

**Objective:** 添加 `/api/v1/work/knowledge/chat/stream` SSE 端点，实现逐 token 流式推送

**Files:**
- Modify: `backend/app/api/work/knowledge.py`

**Step 1: 添加流式端点**

在 `# RAG 问答端点` 部分添加：

```python
from fastapi.responses import StreamingResponse
import json

@router.post("/chat/stream", summary="RAG 知识库流式问答")
async def chat_stream(
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
):
    """SSE 流式 RAG 问答：逐 token 推送答案，末尾发送完整来源列表"""
    
    async def generate():
        result = await rag_service.ask_stream(
            question=body.question,
            history=body.history,
            top_k=5,
        )
        async for chunk in result:
            yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
```

**Step 2: 在 rag_service.py 添加 `ask_stream` 函数**

```python
async def ask_stream(
    question: str,
    history: Optional[list[dict]] = None,
    top_k: int = 5,
):
    """流式 RAG 问答生成器"""
    qdrant = _get_qdrant()
    
    if qdrant is None:
        yield {"type": "error", "message": "向量数据库不可用"}
        return
    
    # 向量检索
    query_vector = _get_embedding(question)
    try:
        results = qdrant.search(
            collection_name=_collection_name,
            query_vector=query_vector,
            limit=top_k,
        )
    except Exception:
        yield {"type": "error", "message": "向量检索失败"}
        return
    
    if not results:
        yield {"type": "answer", "content": "未找到相关知识库内容。"}
        yield {"type": "done", "sources": []}
        return
    
    # 构建上下文
    contexts = []
    sources = []
    seen_docs = set()
    for r in results:
        payload = r.payload or {}
        doc_id = payload.get("doc_id", "")
        contexts.append({
            "title": payload.get("title", "未知文档"),
            "text": payload.get("text", ""),
        })
        if doc_id and doc_id not in seen_docs:
            seen_docs.add(doc_id)
            sources.append({
                "doc_id": doc_id,
                "title": payload.get("title", "未知文档"),
                "snippet": (payload.get("text", "") or "")[:200],
            })
    
    prompt = _build_prompt(question, contexts, history)
    
    if not settings.OPENAI_API_KEY:
        yield {"type": "error", "message": "LLM 未配置"}
        return
    
    # 流式 LLM 调用
    try:
        import openai
        client = openai.AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL,
        )
        stream = await client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=2000,
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta
            if delta.content:
                yield {"type": "answer", "content": delta.content}
        
        yield {"type": "done", "sources": sources}
    except Exception as e:
        yield {"type": "error", "message": f"LLM 调用失败: {str(e)[:200]}"}
```

---

## Task 4: 前端 ChatPanel 支持 SSE 流式渲染

**Objective:** 更新 conversation-store 和 ChatPanel 支持流式接收逐 token 显示

**Files:**
- Modify: `frontend/src/plugins/builtin/work/knowledge/conversation-store.ts`
- Modify: `frontend/src/plugins/builtin/work/knowledge/ChatPanel.tsx`
- Maybe: `frontend/src/plugins/builtin/work/knowledge/MessageBubble.tsx` (拆分独立文件)

**Step 1: 在 conversation-store 添加流式发送**

在 `sendMessage` 方法中，将 `sendChatMessage` 替换为 SSE 流式获取：

```typescript
sendMessage: async (question) => {
    const { messages, activeConversation } = get()
    if (!question.trim() || messages.length === 0 && !activeConversation) return

    const userMsg: Message = { role: 'user', content: question.trim() }
    const updatedMessages = [...messages, userMsg]
    
    // 先添加空的 assistant 消息（流式填充）
    const assistantMsg: Message = { role: 'assistant', content: '' }
    const withEmptyAssistant = [...updatedMessages, assistantMsg]
    set({ messages: withEmptyAssistant, chatLoading: true })

    try {
        const token = localStorage.getItem('token')
        const response = await fetch(`/api/v1/work/knowledge/chat/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                question: question.trim(),
                history: messages,
            }),
        })

        const reader = response.body?.getReader()
        if (!reader) throw new Error('No reader')

        const decoder = new TextDecoder()
        let buffer = ''
        let fullAnswer = ''
        let sources: any[] = []

        while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue
                const data = line.slice(6)
                if (data === '[DONE]') break
                
                try {
                    const parsed = JSON.parse(data)
                    if (parsed.type === 'answer') {
                        fullAnswer += parsed.content
                        // 更新 messages 中最后一条 assistant 消息
                        set((state) => {
                            const msgs = [...state.messages]
                            msgs[msgs.length - 1] = {
                                ...msgs[msgs.length - 1],
                                content: fullAnswer,
                            }
                            return { messages: msgs }
                        })
                    } else if (parsed.type === 'done') {
                        sources = parsed.sources || []
                    } else if (parsed.type === 'error') {
                        fullAnswer = parsed.message
                    }
                } catch {}
            }
        }

        // 最终更新
        const finalMessages = [...updatedMessages, { role: 'assistant', content: fullAnswer || '无响应' }]
        set({ messages: finalMessages })
        
        // 保存到后端...
    } catch {
        // ...
    } finally {
        set({ chatLoading: false })
    }
},
```

**Step 2: MessageBubble 更新 — 显示来源引用**

在 assistant 消息 bubble 下方添加来源卡片（如果 `message` 包含 `sources` 字段）。

在 Message 接口添加：
```typescript
export interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: Array<{ doc_id: string; title: string; snippet: string }>
}
```

**Step 3: 验证**

```bash
cd frontend && npm run build
# Expected: build passes
```

---

## Task 5: 端到端验证

**Objective:** 验证完整的 RAG 流程：文档上传 → 索引 → 问答

**Step 1: 启动后端服务**

```bash
cd backend
docker compose -f docker/docker-compose.yml --env-file ../.env.dev up -d postgres qdrant meilisearch
# 等待服务就绪
uvicorn app.main:app --reload --port 8000
```

**Step 2: 手动测试（curl）**

```bash
# 检查 Qdrant 健康
curl http://localhost:6333/health

# 上传文档（需要 auth token）
curl -X POST http://localhost:8000/api/v1/work/knowledge/documents \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@test.md" \
  -F "title=测试文档"

# RAG 问答
curl -X POST http://localhost:8000/api/v1/work/knowledge/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"question": "测试问题"}'
```

---

## 注意事项

1. **LLM 配置灵活**: 默认 deepseek，可通过环境变量切 OpenAI/Ollama/任何兼容 API
2. **优雅降级**: API key 未配置时返回友好提示而非 500
3. **流式渲染**: CharPanel 已支持 typing indicator，接入流式后体验接近 ChatGPT
4. **不引入新依赖**: openai SDK 在大多数 Python AI 项目中已预装

---

**预计工作量:** 4-5 个任务，每个 3-5 分钟，总计 20-30 分钟
