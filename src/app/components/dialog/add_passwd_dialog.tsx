// src/components/dialog/add_password_dialog.tsx
import { useEffect, useRef, useState } from "react";
import { Plus, X, Shuffle } from "lucide-react";
import { addPasswd, plaintextPoints } from "../../tauri_core/command_frontend";
import { ScrollArea } from "../ui/scroll-area";
import AutocompleteInput from "../ui/autocomplete-input";

interface AddPasswordDialogProps {
    onClosed: () => void;
    onAdded?: () => void;
    hidden: boolean;
}

export default function AddPasswordDialog({ onClosed, onAdded, hidden }: AddPasswordDialogProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [unique, setUnique] = useState("");
    const [parts, setParts] = useState<string[]>([""]); // 至少一个组成部分
    const keyInputRef = useRef<HTMLInputElement | null>(null);
    const [random, setRandom] = useState(false);
    const [key, setKey] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [needAuth, setAuthNeed] = useState<boolean>(true);
    const [keyError, setKeyError] = useState<string>("");
    const nameInputRef = useRef<HTMLTextAreaElement | null>(null);
    const [plaintext_points, setPlaintextPoints] = useState<string[]>([]);

    useEffect(() => {
        if (!hidden) {
            keyInputRef.current?.focus();
        }
    }, [hidden]);

    const onClose = () => {
        setAuthNeed(true);
        setKey("");
        onClosed();
    };

    const handleUnlock = async () => {
        setKeyError("");
        setLoading(true);
        try {
            const plaintext_list = await plaintextPoints(key);
            setPlaintextPoints(plaintext_list);
            setAuthNeed(false);
        } catch (e: any) {
            setKeyError(e?.message || "密钥不正确");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        nameInputRef.current?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClosed]);

    const updatePart = (index: number, value: string) => {
        setParts(prev => {
            const newParts = [...prev];
            newParts[index] = value;
            return newParts;
        });
    };

    const addPart = () => {
        setParts(prev => [...prev, ""]);
    };

    const removePart = (index: number) => {
        if (parts.length === 1) return;
        setParts(prev => prev.filter((_, i) => i !== index));
    };

    const clearForm = () => {
        setName("");
        setDescription("");
        setUnique("");
        setParts([""]);
        setRandom(false);
        // setKey("");
        setLoading(false);
        setError(null);
    }

    const handleSubmit = async () => {
        console.log("提交新的passwd...");
        if (!name.trim()) {
            setError("Name is required");
            return;
        }
        if (!unique.trim()) {
            setError("Unique identifier is required");
            return;
        }
        if (!random && parts.some(p => !p.trim())) {
            setError("All password parts must be filled (or enable random generation)");
            return;
        }
        if (!key.trim()) {
            setError("Secret key is required");
            return;
        }
        console.log("校验通过，调用后端接口...");
        setLoading(true);
        setError(null);
        // 清空
        clearForm();
        try {
            const filteredParts = parts.filter(p => p.trim() !== "");
            await addPasswd(
                filteredParts,
                unique,
                random,
                name,
                description,
                key
            );
            onAdded?.();
            onClose();
        } catch (err: any) {
            console.error("添加失败", err);
            setError(err.message || "Failed to add password");
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        !hidden && (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                onClick={(e) => {
                    if (e.target === e.currentTarget) onClose();
                }}
            >
                <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Plus size={15} className="text-primary" />
                            </div>
                            <div>
                                <div className="font-semibold">添加一个密码回忆</div>
                                <div className="text-xs text-muted-foreground">
                                    用提示词拼接一个密码回忆吧！
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>
                    <ScrollArea className="h-[calc(90vh-88px)] rounded-b-2xl">
                        {needAuth ? (
                            <div className="px-6 py-5 flex flex-col gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm">校验密钥</label>
                                    <input
                                        type="password"
                                        ref={keyInputRef}
                                        value={key}
                                        onChange={(e) => setKey(e.target.value)}
                                        placeholder="输入你的密钥"
                                        className="w-full px-3 py-2 rounded-lg bg-input-background text-foreground border border-border text-sm outline-none focus:border-primary transition-colors"
                                        onKeyDown={(e) => { if (e.key === "Enter") handleUnlock(); }}
                                    />
                                    <p className="text-xs text-muted-foreground">你需要先通过密钥校验之后才能查看详细内容</p>
                                    {keyError && <p className="text-xs text-destructive">{keyError}</p>}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleUnlock}
                                        disabled={loading || !key}
                                        className="py-2 px-4 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition text-sm disabled:opacity-50"
                                    >
                                        {loading ? "解锁中..." : "解锁"}
                                    </button>
                                    <button
                                        onClick={() => setKey("")}
                                        className="py-2 px-4 rounded-lg border border-border bg-muted/10 text-muted-foreground hover:bg-muted/20 transition text-sm"
                                    >
                                        重置
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="px-6 py-5 flex flex-col gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm">名称 *</label>
                                    <textarea
                                        ref={nameInputRef}
                                        value={name}
                                        rows={1}
                                        onChange={(e) => setName(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="例如: github 密码"
                                        className="w-full px-3 py-2 rounded-lg bg-input-background text-foreground border border-border text-sm outline-none focus:border-primary transition-colors"
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm">描述 (可选)</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="时间、地点、人物、网址等"
                                        rows={2}
                                        className="w-full px-3 py-2 rounded-lg bg-input-background text-foreground border border-border text-sm outline-none focus:border-primary transition-colors resize-none"
                                    />
                                </div>


                                <div className="flex flex-col gap-2">
                                    <label className="text-sm">提示词 *</label>
                                    {parts.map((part, idx) => (
                                        <div key={idx} className="flex gap-2 items-center">
                                            <AutocompleteInput
                                                value={part}
                                                onChange={(val) => updatePart(idx, val)}
                                                options={plaintext_points}
                                                placeholder={`提示词 ${idx + 1}`}
                                                onKeyDown={handleKeyDown}
                                            />
                                            {parts.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removePart(idx)}
                                                    className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={addPart}
                                        className="text-xs text-primary hover:underline self-start"
                                    >
                                        + 添加更多
                                    </button>
                                    <p className="text-xs text-muted-foreground">
                                        这些提示词会被拼在一起通过空格分隔，如果选择了随机打乱那么顺序将会变化。
                                    </p>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm">后缀串</label>
                                    <input
                                        type="text"
                                        value={unique}
                                        onChange={(e) => setUnique(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="为这个回忆添加一个独特的后缀，以保证唯一！"
                                        className="w-full px-3 py-2 rounded-lg bg-input-background text-foreground border border-border text-sm outline-none focus:border-primary transition-colors"
                                    />
                                </div>


                                <div className="flex items-center gap-3">
                                    <label className="text-sm flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={random}
                                            onChange={(e) => setRandom(e.target.checked)}
                                            className="rounded border-border"
                                        />
                                        <span>打乱提示词顺序</span>
                                        <Shuffle size={14} className="text-muted-foreground" />
                                    </label>
                                </div>

                                <div className="flex flex-col gap-1.5 hidden">
                                    <label className="text-sm">加密密钥 *</label>
                                    <input
                                        type="password"
                                        value={key}
                                        onChange={(e) => setKey(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="你的加密密钥"
                                        className="w-full px-3 py-2 rounded-lg bg-input-background text-foreground border border-border text-sm outline-none focus:border-primary transition-colors"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        这个密钥将用于加密你的密码回忆。
                                    </p>
                                </div>

                                {error && <p className="text-xs text-destructive">{error}</p>}

                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="w-full py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm disabled:opacity-50"
                                >
                                    {loading ? "添加中..." : "添加"}
                                </button>
                                <button
                                    type="button"
                                    onClick={clearForm}
                                    className="w-full py-2 rounded-lg border border-border bg-muted/10 text-muted-foreground hover:bg-muted/20 transition-colors text-sm"
                                >
                                    重置表单
                                </button>
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </div>
        )
    );
}