import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Sparkles, RotateCcw, TrendingUp } from "lucide-react";
import {
    getExpenseOverview,
    getIncome,
    getBudgets,
    getWallet,
    chatWithBot,
} from "../services/api";
import "./KharchaBot.css";

// ── Markdown-lite renderer ────────────────────────────────────
// Handles: **bold**, bullet lists (- / •), numbered lists, line breaks
function renderMarkdown(text) {
    const lines = text.split("\n");
    const elements = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        // Numbered list
        if (/^\d+\.\s/.test(line)) {
            const items = [];
            while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
                items.push(lines[i].replace(/^\d+\.\s/, ""));
                i++;
            }
            elements.push(
                <ol key={elements.length} className="kbot-list kbot-list--ordered">
                    {items.map((item, j) => (
                        <li key={j} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
                    ))}
                </ol>
            );
            continue;
        }

        // Bullet list
        if (/^[-•*]\s/.test(line)) {
            const items = [];
            while (i < lines.length && /^[-•*]\s/.test(lines[i])) {
                items.push(lines[i].replace(/^[-•*]\s/, ""));
                i++;
            }
            elements.push(
                <ul key={elements.length} className="kbot-list kbot-list--unordered">
                    {items.map((item, j) => (
                        <li key={j} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
                    ))}
                </ul>
            );
            continue;
        }

        // Empty line
        if (line.trim() === "") {
            elements.push(<div key={elements.length} className="kbot-spacer" />);
            i++;
            continue;
        }

        // Regular paragraph
        elements.push(
            <p
                key={elements.length}
                dangerouslySetInnerHTML={{ __html: formatInline(line) }}
            />
        );
        i++;
    }

    return elements;
}

function formatInline(text) {
    return text
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/`(.+?)`/g, "<code>$1</code>");
}

// ── Typing indicator ──────────────────────────────────────────
function TypingIndicator() {
    return (
        <div className="kbot-message kbot-message--bot">
            <div className="kbot-bubble kbot-bubble--bot kbot-typing-bubble">
                <span className="kbot-dot-pulse" />
                <span className="kbot-dot-pulse" />
                <span className="kbot-dot-pulse" />
            </div>
        </div>
    );
}

// ── Single message ────────────────────────────────────────────
function Message({ msg }) {
    const isUser = msg.role === "user";
    return (
        <div className={`kbot-message kbot-message--${isUser ? "user" : "bot"}`}>
            {!isUser && (
                <div className="kbot-bot-avatar">
                    <Sparkles size={12} />
                </div>
            )}
            <div className={`kbot-bubble kbot-bubble--${isUser ? "user" : "bot"}`}>
                {isUser ? (
                    <p>{msg.content}</p>
                ) : (
                    renderMarkdown(msg.content)
                )}
            </div>
        </div>
    );
}

// ── Welcome screen shown when chat is empty ───────────────────
const SUGGESTIONS = [
    { icon: "💸", text: "How do I send money?" },
    { icon: "💳", text: "How do I get a Kharcha Card?" },
    { icon: "📊", text: "Analyze my expenses" },
    { icon: "💰", text: "Help me save more money" },
];

function WelcomeScreen({ onSuggestion, contextLoading }) {
    return (
        <div className="kbot-welcome">
            <div className="kbot-welcome-icon">
                <Sparkles size={28} />
            </div>
            <h3 className="kbot-welcome-title">Hi! I'm Kharcha AI</h3>
            <p className="kbot-welcome-sub">
                Ask me anything about the app, or let me analyse your spending to help you save more.
            </p>

            {contextLoading && (
                <div className="kbot-context-loading">
                    <TrendingUp size={14} />
                    <span>Loading your financial data…</span>
                </div>
            )}

            <div className="kbot-suggestions">
                {SUGGESTIONS.map((s) => (
                    <button
                        key={s.text}
                        className="kbot-suggestion"
                        onClick={() => onSuggestion(s.text)}
                    >
                        <span className="kbot-suggestion-icon">{s.icon}</span>
                        <span>{s.text}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

// ── Main KharchaBot component ─────────────────────────────────
export default function KharchaBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [financialContext, setFinancialContext] = useState(null);
    const [contextLoading, setContextLoading] = useState(false);
    const [error, setError] = useState(null);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const contextFetchedRef = useRef(false);

    // Auto-scroll to latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isTyping]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Fetch financial context once on first open
    useEffect(() => {
        if (isOpen && !contextFetchedRef.current) {
            contextFetchedRef.current = true;
            fetchFinancialContext();
        }
    }, [isOpen]);

    const fetchFinancialContext = useCallback(async () => {
        setContextLoading(true);
        try {
            const now = new Date();
            const y = now.getFullYear();
            const m = now.getMonth();

            const fmt = (d) => d.toISOString().split("T")[0];
            const curStart = fmt(new Date(y, m, 1));
            const curEnd = fmt(now);
            const lstStart = fmt(new Date(y, m - 1, 1));
            const lstEnd = fmt(new Date(y, m, 0));

            const [walletRes, curExpRes, lstExpRes, incRes, budRes] =
                await Promise.allSettled([
                    getWallet(),
                    getExpenseOverview(curStart, curEnd),
                    getExpenseOverview(lstStart, lstEnd),
                    getIncome(curStart, curEnd),
                    getBudgets(curStart, curEnd),
                ]);

            const toCtx = (res) => (res.status === "fulfilled" ? res.value : null);

            // Build a clean summary the AI can use
            const curExp = toCtx(curExpRes);
            const lstExp = toCtx(lstExpRes);
            const inc = toCtx(incRes);
            const bud = toCtx(budRes);
            const wallet = toCtx(walletRes);

            const summarizeExpenses = (data) => {
                if (!data) return null;
                // Backend returns { success, data: [...] }; also handle bare array fallback
                const rows = data.data || data.categories || data.expense_summary || (Array.isArray(data) ? data : []);
                if (!Array.isArray(rows)) return null;
                const categories = rows.map((c) => ({
                    name: c.category_name || c.name || "Other",
                    total: c.total_amount || c.total || 0,
                    count: c.count || c.transaction_count || 0,
                }));
                const total = categories.reduce((s, c) => s + Number(c.total), 0);
                return { totalExpenses: total.toFixed(2), categories };
            };

            const summarizeBudgets = (data) => {
                if (!data) return null;
                // Backend returns { success, data: [...] }; data.data is the array
                const budgets = data.data || data.budgets || (Array.isArray(data) ? data : []);
                if (!Array.isArray(budgets)) return [];
                return budgets.map((b) => ({
                    category: b.categories?.name || b.category_name || b.name || "Category",
                    budgetAmount: b.amount || b.budget_amount || 0,
                    spent: b.spent || b.spent_amount || 0,
                }));
            };

            const summarizeIncome = (data) => {
                if (!data) return null;
                // Backend returns { success, data: [...], total_income, pagination }
                const entries = data.data || data.income || data.incomes || [];
                const total = entries.reduce((s, e) => s + Number(e.amount || 0), 0);
                return { totalIncome: total.toFixed(2), entries: entries.slice(0, 5) };
            };

            setFinancialContext({
                walletBalance: wallet?.wallet?.balance,
                currentMonth: {
                    ...summarizeExpenses(curExp),
                    ...summarizeIncome(inc),
                    budgets: summarizeBudgets(bud),
                },
                lastMonth: summarizeExpenses(lstExp),
            });
        } catch (err) {
            console.error("[KharchaBot] Failed to load financial context:", err);
        } finally {
            setContextLoading(false);
        }
    }, []);

    const sendMessage = useCallback(
        async (text) => {
            const content = (text || input).trim();
            if (!content || isTyping) return;

            setInput("");
            setError(null);

            const userMsg = { role: "user", content };
            const newMessages = [...messages, userMsg];
            setMessages(newMessages);
            setIsTyping(true);

            try {
                const res = await chatWithBot({
                    messages: newMessages,
                    financialContext,
                });
                setMessages((prev) => [
                    ...prev,
                    { role: "assistant", content: res.message },
                ]);
            } catch (err) {
                setError("Couldn't reach the AI. Check your connection and try again.");
            } finally {
                setIsTyping(false);
            }
        },
        [input, messages, isTyping, financialContext]
    );

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleReset = () => {
        setMessages([]);
        setError(null);
        inputRef.current?.focus();
    };

    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);

    return (
        <>
            {/* ── Floating Action Button ── */}
            <button
                className={`kbot-fab${isOpen ? " kbot-fab--hidden" : ""}`}
                onClick={handleOpen}
                aria-label="Open Kharcha AI assistant"
            >
                <Sparkles size={20} />
                <span className="kbot-fab-label">AI</span>
            </button>

            {/* ── Chat Overlay ── */}
            {isOpen && (
                <div className="kbot-overlay" role="dialog" aria-label="Kharcha AI Assistant">
                    {/* Mobile backdrop */}
                    <div className="kbot-backdrop" onClick={handleClose} />

                    <div className="kbot-panel">
                        {/* Header */}
                        <div className="kbot-header">
                            <div className="kbot-header-left">
                                <div className="kbot-header-avatar">
                                    <Sparkles size={14} />
                                </div>
                                <div className="kbot-header-info">
                                    <span className="kbot-header-name">Kharcha AI</span>
                                    <span className="kbot-header-status">
                                        <span className="kbot-status-dot" />
                                        Financial Assistant
                                    </span>
                                </div>
                            </div>
                            <div className="kbot-header-actions">
                                {messages.length > 0 && (
                                    <button
                                        className="kbot-icon-btn"
                                        onClick={handleReset}
                                        aria-label="Clear conversation"
                                        title="New conversation"
                                    >
                                        <RotateCcw size={15} />
                                    </button>
                                )}
                                <button
                                    className="kbot-icon-btn kbot-icon-btn--close"
                                    onClick={handleClose}
                                    aria-label="Close"
                                >
                                    <X size={17} />
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="kbot-messages">
                            {messages.length === 0 ? (
                                <WelcomeScreen
                                    onSuggestion={sendMessage}
                                    contextLoading={contextLoading}
                                />
                            ) : (
                                <>
                                    {messages.map((msg, i) => (
                                        <Message key={i} msg={msg} />
                                    ))}
                                    {isTyping && <TypingIndicator />}
                                    {error && (
                                        <div className="kbot-error">
                                            <span>{error}</span>
                                            <button onClick={() => sendMessage(messages[messages.length - 1]?.content)}>
                                                Retry
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input row */}
                        <div className="kbot-input-area">
                            <div className="kbot-input-wrap">
                                <textarea
                                    ref={inputRef}
                                    className="kbot-input"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask me anything…"
                                    rows={1}
                                    disabled={isTyping}
                                />
                                <button
                                    className="kbot-send-btn"
                                    onClick={() => sendMessage()}
                                    disabled={!input.trim() || isTyping}
                                    aria-label="Send message"
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                            <p className="kbot-input-hint">
                                Press Enter to send · Shift+Enter for new line
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}