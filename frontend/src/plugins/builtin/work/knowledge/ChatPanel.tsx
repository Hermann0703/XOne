"use client";

import { useEffect, useState, useRef } from "react";
import {
  Send,
  Plus,
  MessageSquare,
  Trash2,
  Loader2,
  Bot,
  User,
  FileText,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useKnowledgeStore, type ChatMessage, type CitationSource } from "./store";

// ─── 对话列表项 ──────────────────────────────────────

function ConversationItem({
  id,
  title,
  isActive,
  onClick,
}: {
  id: number;
  title: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors flex items-center gap-2 ${
        isActive
          ? "bg-primary/10 text-primary font-medium"
          : "hover:bg-muted text-foreground"
      }`}
    >
      <MessageSquare className="size-4 flex-shrink-0" />
      <span className="truncate">{title}</span>
    </button>
  );
}

// ─── 引用来源卡片 ────────────────────────────────────

function CitationCard({ source }: { source: CitationSource }) {
  return (
    <Card className="bg-muted/50 border-muted">
      <CardContent className="p-3 space-y-1">
        <div className="flex items-center gap-2 text-xs font-medium">
          <FileText className="size-3 text-muted-foreground" />
          <span>{source.document_title}</span>
          {source.score !== undefined && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
              {(source.score * 100).toFixed(0)}%
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
          {source.content}
        </p>
      </CardContent>
    </Card>
  );
}

// ─── 聊天气泡 ────────────────────────────────────────

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`flex items-start gap-3 max-w-[80%] ${
          isUser ? "flex-row-reverse" : "flex-row"
        }`}
      >
        {/* 头像 */}
        <div
          className={`flex-shrink-0 size-8 rounded-full flex items-center justify-center text-white text-sm ${
            isUser ? "bg-blue-500" : "bg-gray-500"
          }`}
        >
          {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
        </div>

        {/* 气泡内容 */}
        <div className="space-y-2 min-w-0">
          <div
            className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
              isUser
                ? "bg-blue-500 text-white rounded-br-md"
                : "bg-muted text-foreground rounded-bl-md"
            }`}
          >
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </div>

          {/* 引用来源 (仅助手消息) */}
          {!isUser && message.sources && message.sources.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                引用来源 ({message.sources.length})
              </p>
              <div className="grid grid-cols-1 gap-2">
                {message.sources.slice(0, 3).map((source, i) => (
                  <CitationCard key={i} source={source} />
                ))}
              </div>
              {message.sources.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  还有 {message.sources.length - 3} 条引用...
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 主聊天面板 ──────────────────────────────────────

export default function ChatPanel() {
  const {
    conversations,
    activeConversationId,
    chatHistory,
    chatLoading,
    fetchConversations,
    createConversation,
    setActiveConversation,
    sendMessage,
    clearChat,
  } = useKnowledgeStore();

  const [inputValue, setInputValue] = useState("");
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [newConvTitle, setNewConvTitle] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 初始加载对话列表
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // 滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // 发送消息
  const handleSend = async () => {
    if (!inputValue.trim() || chatLoading) return;
    const content = inputValue.trim();
    setInputValue("");

    // 如果没有活跃对话，先创建
    if (!activeConversationId) {
      const conv = await createConversation("新的对话");
      if (conv) {
        // 等待 store 更新后再发送
        setTimeout(() => {
          useKnowledgeStore.getState().sendMessage(content);
        }, 100);
      }
    } else {
      await sendMessage(content);
    }

    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 创建新对话
  const handleCreateConversation = async () => {
    const title = newConvTitle.trim() || "新的对话";
    await createConversation(title);
    setNewConvTitle("");
    setNewConvOpen(false);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* 左侧对话列表 */}
      <div className="w-64 border-r flex flex-col bg-card shrink-0">
        <div className="p-3 border-b flex items-center justify-between">
          <h2 className="text-sm font-semibold">对话历史</h2>
          <Button
            variant="ghost"
            size="icon"
            title="新建对话"
            onClick={() => setNewConvOpen(true)}
          >
            <Plus className="size-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1 p-2">
          <div className="space-y-1">
            {conversations.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                暂无对话
              </p>
            ) : (
              conversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  id={conv.id}
                  title={conv.title}
                  isActive={conv.id === activeConversationId}
                  onClick={() => setActiveConversation(conv.id)}
                />
              ))
            )}
          </div>
        </ScrollArea>
        {activeConversationId && (
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground text-xs"
              onClick={clearChat}
            >
              <Trash2 className="size-3 mr-2" />
              清除当前对话
            </Button>
          </div>
        )}
      </div>

      {/* 右侧消息区 */}
      <div className="flex-1 flex flex-col bg-background">
        {/* 消息滚动区 */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {chatHistory.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <Bot className="size-16 mx-auto text-muted-foreground/30" />
                <h3 className="text-lg font-medium text-muted-foreground">
                  知识库问答
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  基于已上传文档的向量检索与 RAG 生成回答，每个回答均附引用来源。
                  选择一个对话或创建新对话开始提问。
                </p>
                <Button
                  variant="outline"
                  onClick={() => setNewConvOpen(true)}
                  className="mt-4"
                >
                  <Plus className="size-4 mr-2" />
                  新建对话
                </Button>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto">
              {chatHistory.map((msg, i) => (
                <ChatBubble key={i} message={msg} />
              ))}
              {chatLoading && (
                <div className="flex justify-start mb-4">
                  <div className="flex items-start gap-3">
                    <div className="size-8 rounded-full bg-gray-500 flex items-center justify-center">
                      <Bot className="size-4 text-white" />
                    </div>
                    <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-md">
                      <Loader2 className="size-5 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* 底部输入区 */}
        <div className="border-t p-4 bg-card">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <Input
              ref={inputRef}
              placeholder={
                activeConversationId
                  ? "输入问题，基于知识库文档回答..."
                  : "创建一个对话开始提问..."
              }
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
              disabled={chatLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || chatLoading}
              size="icon"
            >
              {chatLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 新建对话对话框 */}
      <Dialog open={newConvOpen} onOpenChange={setNewConvOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>新建对话</DialogTitle>
            <DialogDescription>
              输入对话标题，将基于知识库文档进行 RAG 问答
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="对话标题 (可选)"
              value={newConvTitle}
              onChange={(e) => setNewConvTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateConversation();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewConvOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateConversation}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
