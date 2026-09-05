"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type ReviewStatus = "pending" | "published" | "rejected";
type QueueFilter = "pending" | "risky" | "reported" | "banned" | "published" | "rejected" | "all";

type ReviewLetter = {
  id: string;
  addressee: string;
  content: string;
  author: string;
  theme: string;
  status: ReviewStatus;
  riskScore: number;
  moderationFlags: string[];
  reportCount: number;
  likeCount: number;
  canBan: boolean;
  senderBanned: boolean;
  createdAt: string;
  reviewedAt: string | null;
};

const FILTERS: Array<{ id: QueueFilter; label: string }> = [
  { id: "pending", label: "等待审核" },
  { id: "risky", label: "需要留意" },
  { id: "reported", label: "收到举报" },
  { id: "banned", label: "已封禁投稿者" },
  { id: "published", label: "已经公开" },
  { id: "rejected", label: "未予公开" },
  { id: "all", label: "全部档案" },
];

const FLAG_LABELS: Record<string, string> = {
  self_harm: "自伤风险",
  violence_threat: "暴力威胁",
  minor_safety: "未成年人安全",
  sexual_content: "露骨内容",
  hate_harassment: "骚扰辱骂",
  illegal_trade: "违法交易",
  scam_spam: "诈骗广告",
  extremist_content: "极端内容",
  privacy_doxxing: "隐私曝光",
  personal_information: "个人信息",
};

const STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: "等待审核",
  published: "已经公开",
  rejected: "未予公开",
};

function countForFilter(letters: ReviewLetter[], filter: QueueFilter) {
  if (filter === "all") return letters.length;
  if (filter === "risky") return letters.filter((letter) => letter.riskScore > 0).length;
  if (filter === "reported") return letters.filter((letter) => letter.reportCount > 0).length;
  if (filter === "banned") return letters.filter((letter) => letter.senderBanned).length;
  return letters.filter((letter) => letter.status === filter).length;
}

function matchesFilter(letter: ReviewLetter, filter: QueueFilter) {
  if (filter === "all") return true;
  if (filter === "risky") return letter.riskScore > 0;
  if (filter === "reported") return letter.reportCount > 0;
  if (filter === "banned") return letter.senderBanned;
  return letter.status === filter;
}

function formatDate(value: string) {
  const date = new Date(value.endsWith("Z") ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function ReviewBrand() {
  return (
    <span className="review-brand" aria-hidden="true">
      <span>V</span>
      <b>CH POSTAL<br />REVIEW OFFICE</b>
    </span>
  );
}

export default function LettersReviewPage() {
  const [authState, setAuthState] = useState<"checking" | "signed-out" | "signed-in">("checking");
  const [password, setPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  const [letters, setLetters] = useState<ReviewLetter[]>([]);
  const [filter, setFilter] = useState<QueueFilter>("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [actionState, setActionState] = useState<"idle" | "working">("idle");
  const [actionMessage, setActionMessage] = useState("");

  const loadLetters = async () => {
    const response = await fetch("/api/admin/letters", { headers: { accept: "application/json" } });
    if (response.status === 401) {
      setAuthState("signed-out");
      return;
    }
    if (!response.ok) throw new Error("无法读取审核队列");
    const payload = (await response.json()) as { letters: ReviewLetter[] };
    setLetters(payload.letters);
    setSelectedId((current) => current ?? payload.letters.find((letter) => letter.status === "pending")?.id ?? payload.letters[0]?.id ?? null);
    setLoadState("ready");
  };

  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      try {
        const response = await fetch("/api/admin/session", { headers: { accept: "application/json" } });
        const payload = (await response.json()) as { authenticated?: boolean };
        if (cancelled) return;
        if (!payload.authenticated) {
          setAuthState("signed-out");
          return;
        }
        setAuthState("signed-in");
        try {
          await loadLetters();
        } catch {
          if (!cancelled) setLoadState("error");
        }
      } catch {
        if (!cancelled) {
          setAuthState("signed-out");
          setLoginMessage("审核室暂时无法开启，请确认环境密钥已经配置。");
        }
      }
    };
    void bootstrap();
    return () => { cancelled = true; };
  }, []);

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginMessage("正在核对审核凭证");
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "审核口令不正确");
      setPassword("");
      setAuthState("signed-in");
      setLoginMessage("");
      setLoadState("loading");
      await loadLetters();
    } catch (error) {
      setLoginMessage(error instanceof Error ? error.message : "审核室暂时无法开启");
    }
  };

  const logout = async () => {
    await fetch("/api/admin/session", { method: "DELETE" });
    setLetters([]);
    setAuthState("signed-out");
    setPassword("");
  };

  const reviewLetter = async (id: string, action: "publish" | "reject" | "pending") => {
    setActionState("working");
    setActionMessage("");
    try {
      const response = await fetch(`/api/admin/letters/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) throw new Error("审核结果未能保存");
      const nextStatus: ReviewStatus = action === "publish" ? "published" : action === "reject" ? "rejected" : "pending";
      setLetters((current) => current.map((letter) => letter.id === id ? { ...letter, status: nextStatus } : letter));
      setActionMessage(action === "publish" ? "信件已经进入公开信池。" : action === "reject" ? "信件已经移出公开队列。" : "信件已经重新放回待审队列。");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "审核操作失败");
    } finally {
      setActionState("idle");
    }
  };

  const deleteLetter = async (id: string) => {
    if (!window.confirm("确定永久删除这封信吗？此操作无法撤销。")) return;
    setActionState("working");
    setActionMessage("");
    try {
      const response = await fetch(`/api/admin/letters/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("信件未能删除");
      setLetters((current) => current.filter((letter) => letter.id !== id));
      setSelectedId(null);
      setActionMessage("信件已经永久删除。");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "删除操作失败");
    } finally {
      setActionState("idle");
    }
  };

  const changeBan = async (letter: ReviewLetter) => {
    if (!letter.canBan || actionState === "working") return;
    const action = letter.senderBanned ? "unban" : "ban";
    const question = letter.senderBanned
      ? "确定解除这位投稿者的封禁吗？之前被拒绝的信不会自动公开。"
      : "确定封禁这位投稿者吗？该投稿者的来信会全部停止公开，且此浏览器将无法继续投稿、点赞或举报。";
    if (!window.confirm(question)) return;

    setActionState("working");
    setActionMessage("");
    try {
      const response = await fetch(`/api/admin/letters/${encodeURIComponent(letter.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, reason: "人工审核封禁" }),
      });
      if (!response.ok) throw new Error(action === "ban" ? "封禁未能保存" : "解封未能保存");
      await loadLetters();
      setActionMessage(action === "ban" ? "投稿者已封禁，相关来信已经停止公开。" : "投稿者已解除封禁，旧信仍保持原审核状态。" );
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "封禁操作失败");
    } finally {
      setActionState("idle");
    }
  };

  if (authState !== "signed-in") {
    return (
      <main className="review-login-page">
        <nav className="review-nav"><Link href="/"><ReviewBrand /></Link><Link href="/letters">返回陌生来信</Link></nav>
        <section className="review-login-stage">
          <div className="review-login-copy">
            <p>PRIVATE REVIEW OFFICE</p>
            <h1>{authState === "checking" ? "正在确认身份" : "进入信件审核室"}</h1>
            <span>这里只向负责整理陌生来信的人开放。</span>
          </div>
          {authState === "checking" ? (
            <div className="review-login-loading" role="status"><i /><span>正在检查审核会话</span></div>
          ) : (
            <form className="review-login-form" onSubmit={login}>
              <label htmlFor="review-password">审核口令</label>
              <input id="review-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="输入只属于你的审核口令" />
              <button type="submit">打开档案室 <span>→</span></button>
              <p role="status" aria-live="polite">{loginMessage}</p>
            </form>
          )}
        </section>
      </main>
    );
  }

  const filteredLetters = letters.filter((letter) => matchesFilter(letter, filter));
  const selectedLetter = filteredLetters.find((letter) => letter.id === selectedId) ?? filteredLetters[0] ?? null;

  return (
    <main className="review-page">
      <nav className="review-nav">
        <Link href="/"><ReviewBrand /></Link>
        <div><Link href="/letters">查看公开信池</Link><button type="button" onClick={() => void logout()}>退出审核</button></div>
      </nav>

      <header className="review-header">
        <div><p>LETTER REVIEW OFFICE</p><h1>逐封审核陌生来信</h1></div>
        <dl>
          <div><dt>等待审核</dt><dd>{countForFilter(letters, "pending")}</dd></div>
          <div><dt>需要留意</dt><dd>{countForFilter(letters, "risky")}</dd></div>
          <div><dt>收到举报</dt><dd>{countForFilter(letters, "reported")}</dd></div>
        </dl>
      </header>

      <section className="review-workspace">
        <aside className="review-queue" aria-label="审核队列">
          <div className="review-filter-list" role="tablist" aria-label="筛选信件">
            {FILTERS.map((item) => (
              <button key={item.id} type="button" role="tab" aria-selected={filter === item.id} onClick={() => { setFilter(item.id); setSelectedId(null); setActionMessage(""); }}>
                <span>{item.label}</span><b>{countForFilter(letters, item.id)}</b>
              </button>
            ))}
          </div>
          <div className="review-queue-list">
            {filteredLetters.map((letter) => (
              <button key={letter.id} type="button" className={selectedLetter?.id === letter.id ? "is-selected" : ""} onClick={() => { setSelectedId(letter.id); setActionMessage(""); }}>
                <span>{letter.author}</span>
                <small>{letter.content.slice(0, 42)}{letter.content.length > 42 ? "…" : ""}</small>
                <i>{letter.riskScore > 0 ? `风险 ${letter.riskScore}` : STATUS_LABELS[letter.status]}</i>
              </button>
            ))}
          </div>
        </aside>

        <div className="review-desk">
          {loadState === "loading" ? (
            <div className="review-state" role="status"><i /><h2>正在整理待审来信</h2><p>档案会按照风险和举报情况排列。</p></div>
          ) : loadState === "error" ? (
            <div className="review-state"><h2>审核队列暂时无法读取</h2><button type="button" onClick={() => { setLoadState("loading"); void loadLetters().catch(() => setLoadState("error")); }}>重新读取</button></div>
          ) : selectedLetter ? (
            <article className={`review-letter review-theme-${selectedLetter.theme}`}>
              <div className="review-letter-top">
                <span>{STATUS_LABELS[selectedLetter.status]}</span>
                <time>{formatDate(selectedLetter.createdAt)}</time>
              </div>
              <h2>{selectedLetter.addressee}</h2>
              <div className="review-letter-content">
                {selectedLetter.content.replace(/\\n/g, "\n").split(/\n{2,}/).map((paragraph, index) => <p key={`${selectedLetter.id}-${index}`}>{paragraph}</p>)}
              </div>
              <p className="review-letter-author">{selectedLetter.author}</p>

              <div className="review-evidence">
                <div><span>风险分</span><strong>{selectedLetter.riskScore}</strong></div>
                <div><span>举报</span><strong>{selectedLetter.reportCount}</strong></div>
                <div><span>喜欢</span><strong>{selectedLetter.likeCount}</strong></div>
                <div><span>投稿者</span><strong className={selectedLetter.senderBanned ? "is-banned" : ""}>{selectedLetter.senderBanned ? "已封禁" : selectedLetter.canBan ? "可管理" : "旧信"}</strong></div>
                <div className="review-flags"><span>审核标记</span><p>{selectedLetter.moderationFlags.length ? selectedLetter.moderationFlags.map((flag) => FLAG_LABELS[flag] ?? flag).join("、") : "未命中关键词"}</p></div>
              </div>

              <div className="review-actions">
                <button type="button" className="review-approve" disabled={actionState === "working" || selectedLetter.status === "published"} onClick={() => void reviewLetter(selectedLetter.id, "publish")}>通过并公开</button>
                <button type="button" disabled={actionState === "working" || selectedLetter.status === "rejected"} onClick={() => void reviewLetter(selectedLetter.id, "reject")}>拒绝公开</button>
                {selectedLetter.status !== "pending" && <button type="button" disabled={actionState === "working"} onClick={() => void reviewLetter(selectedLetter.id, "pending")}>退回待审</button>}
                <button type="button" className="review-ban" disabled={actionState === "working" || !selectedLetter.canBan} onClick={() => void changeBan(selectedLetter)}>{selectedLetter.senderBanned ? "解除投稿者封禁" : "封禁投稿者"}</button>
                <button type="button" className="review-delete" disabled={actionState === "working"} onClick={() => void deleteLetter(selectedLetter.id)}>永久删除</button>
              </div>
              <p className="review-action-message" role="status" aria-live="polite">{actionState === "working" ? "正在保存审核结果" : actionMessage}</p>
            </article>
          ) : (
            <div className="review-state"><h2>这里暂时没有信件</h2><p>新的投稿进入待审队列后，会出现在这里。</p></div>
          )}
        </div>
      </section>
    </main>
  );
}
