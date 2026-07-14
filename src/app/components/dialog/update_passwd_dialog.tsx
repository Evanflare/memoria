// src/app/components/dialog/update_passwd_dialog.tsx
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { X, Edit3 } from "lucide-react";
import { addPasswd, getPasswd, updatePasswd } from "../../tauri_core/command_frontend";
import { ScrollArea } from "../ui/scroll-area";
import type { PasswdSummary } from "../../tauri_core/command_frontend";

interface UpdatePasswdDialogProps {
    passwd: PasswdSummary; // 包含 uid, name, description, ciphertext
    hidden: boolean;
    onClose: () => void;
    onUpdated?: () => void;
}

export default function UpdatePasswdDialog({ passwd, hidden, onClose, onUpdated }: UpdatePasswdDialogProps) {
    const [stage, setStage] = useState<"auth" | "view">("auth");
    const [secret, setSecret] = useState("");
    const [keyError, setKeyError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // initial values (from props)
    const initial = useRef({
        name: passwd.name,
        description: passwd.description,
        unique: passwd.uid ? passwd.uid : "", // 不会展示 uid but we keep for update calls
    });

    // editable states
    const [name, setName] = useState(initial.current.name);
    const [description, setDescription] = useState(initial.current.description);
    const [unique, setUnique] = useState(initial.current.unique);
    const [plaintext, setPlaintext] = useState(""); // decrypted password (populated after auth)

    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const nameRef = useRef<HTMLTextAreaElement | null>(null);
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    useEffect(() => {
        if (stage === "view") nameRef.current?.focus();
    }, [stage]);

    // 校验 secret 并拉取明文 password（使用 getPasswd(uid, key)）
    const handleUnlock = async () => {
        setKeyError(null);
        setLoading(true);
        try {
            const plain = await getPasswd(passwd.uid, secret);
            setPlaintext(plain);
            setStage("view");
            // 保持 initial values in case parent changes later
            initial.current = { name: passwd.name, description: passwd.description, unique: passwd.uid };
        } catch (e: any) {
            setKeyError(e?.message || "Secret incorrect");
        } finally {
            setLoading(false);
        }
    };

    // 更精确判断 plaintext 是否被修改：比较与解密后得到的原始 plain
    const [plaintextOrig, setPlaintextOrig] = useState<string | null>(null);
    useEffect(() => {
        if (stage === "view" && plaintext && plaintextOrig === null) {
            setPlaintextOrig(plaintext);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stage, plaintext]);

    const isFieldChanged = {
        name: name !== initial.current.name,
        description: description !== initial.current.description,
        unique: unique !== initial.current.unique,
        plaintext: plaintextOrig !== null ? plaintext !== plaintextOrig : false,
    };

    const handleSave = async () => {
        setSaveError(null);
        setSaving(true);
        try {
            // only send changed values (backend accepts Option)
            const nameToSend = isFieldChanged.name ? name : undefined;
            const descriptToSend = isFieldChanged.description ? description : undefined;
            const plaintextToSend = isFieldChanged.plaintext ? plaintext : undefined;

            await updatePasswd({
                uid: passwd.uid,
                name: nameToSend,
                descript: descriptToSend,
                plaintext: plaintextToSend,
                user_key: secret
            });
            onUpdated?.();
            onClose();
        } catch (e: any) {
            setSaveError(e || "Update failed");
        } finally {
            setSaving(false);
        }
    };
    // 另存为新密码条目
    const handleSaveAs = async () => {
        console.log("提交新的passwd...");
        if (!name.trim()) {
            setSaveError("Name is required");
            return;
        }
        if (!unique.trim()) {
            setSaveError("Unique identifier is required");
            return;
        }
        if (!secret.trim()) {
            setSaveError("Secret key is required");
            return;
        }
        console.log("校验通过，调用后端接口...");
        setLoading(true);
        setSaveError(null);
        try {
            const filteredParts = plaintext.split(" ").filter(p => p.trim() !== "");
            await addPasswd(
                filteredParts,
                "", // unique已包含在filterdParts中，暂时传空字符串
                false, // random
                name,
                description,
                secret
            );
            // 成功提示
            toast.success("成功添加新密码条目");
        } catch (err: any) {
            // 失败提示
            toast.error("添加失败: " + (err.message || "Unknown error"));
            console.error("操作失败", err);
            setSaveError(err.message || "Failed to add password");
        } finally {
            setLoading(false);
        }
    };
    if (hidden) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden">
                {/* header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Edit3 size={15} className="text-primary" />
                        </div>
                        <div>
                            <div className="font-semibold">查看 或者 编辑</div>
                            <div className="text-xs text-muted-foreground">详细的展示内容</div>
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
                    <div className="px-6 py-5 flex flex-col gap-4">
                        {stage === "auth" ? (
                            <>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm">校验密钥</label>
                                    <input
                                        type="password"
                                        value={secret}
                                        onChange={(e) => setSecret(e.target.value)}
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
                                        disabled={loading || !secret}
                                        className="py-2 px-4 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition text-sm disabled:opacity-50"
                                    >
                                        {loading ? "解锁中..." : "解锁"}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSecret("")
                                        }}
                                        className="py-2 px-4 rounded-lg border border-border bg-muted/10 text-muted-foreground hover:bg-muted/20 transition text-sm"
                                    >
                                        重置
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Name */}
                                <div className={`flex flex-col gap-1.5 ${isFieldChanged.name ? "ring-2 ring-yellow-300 rounded-md p-2" : ""}`}>
                                    <label className="text-sm flex items-center justify-between">
                                        <span>名称</span>
                                        {isFieldChanged.name && <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">修改部分</span>}
                                    </label>
                                    <textarea
                                        ref={nameRef}
                                        value={name}
                                        rows={1}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg bg-input-background text-foreground border border-border text-sm outline-none focus:border-primary transition-colors"
                                    />
                                </div>

                                {/* Description */}
                                <div className={`flex flex-col gap-1.5 ${isFieldChanged.description ? "ring-2 ring-yellow-300 rounded-md p-2" : ""}`}>
                                    <label className="text-sm flex items-center justify-between">
                                        <span>描述</span>
                                        {isFieldChanged.description && <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">修改部分</span>}
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={3}
                                        className="w-full px-3 py-2 rounded-lg bg-input-background text-foreground border border-border text-sm outline-none focus:border-primary transition-colors resize-none"
                                    />
                                </div>

                                {/* Unique identifier (不渲染) */}
                                {/* <div
                                    className={`flex flex-col gap-1.5 ${isFieldChanged.unique ? "ring-2 ring-yellow-300 rounded-md p-2" : ""}`}>
                                    <label className="text-sm flex items-center justify-between">
                                        <span>Unique Identifier</span>
                                        {isFieldChanged.unique && <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">Modified</span>}
                                    </label>
                                    <input
                                        type="text"
                                        value={unique}
                                        onChange={(e) => setUnique(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg bg-input-background text-foreground border border-border text-sm outline-none focus:border-primary transition-colors"
                                    />
                                </div> */}

                                {/* Decrypted password - now always visible */}
                                <div className={`flex flex-col gap-1.5 ${isFieldChanged.plaintext ? "ring-2 ring-yellow-300 rounded-md p-2" : ""}`}>
                                    <label className="text-sm flex items-center justify-between">
                                        <span>密码记忆</span>
                                        {isFieldChanged.plaintext && <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">修改部分</span>}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={plaintext}
                                            onChange={(e) => setPlaintext(e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg bg-input-background text-foreground border border-border text-sm outline-none focus:border-primary transition-colors font-mono"
                                            spellCheck={false}
                                        />
                                    </div>
                                </div>

                                {saveError && <p className="text-xs text-destructive">{saveError}</p>}

                                <div className="flex gap-2 flex-wrap justify-between">
                                    <div>
                                        <button
                                            onClick={handleSave}
                                            disabled={saving || (!isFieldChanged.name && !isFieldChanged.description && !isFieldChanged.unique && !isFieldChanged.plaintext)}
                                            className="py-2 px-4 mr-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition text-sm disabled:opacity-50"
                                        >
                                            {saving ? "保存中..." : "保存修改"}
                                        </button>
                                        <button
                                            onClick={() => {
                                                // revert changes to initial (keep decrypted value as originally fetched)
                                                setName(initial.current.name);
                                                setDescription(initial.current.description);
                                                setUnique(initial.current.unique);
                                                if (plaintextOrig !== null) setPlaintext(plaintextOrig);
                                            }}
                                            className="py-2 px-4 rounded-lg border border-border bg-muted/10 text-muted-foreground hover:bg-muted/20 transition text-sm"
                                        >
                                            恢复
                                        </button>
                                    </div>

                                    <div className="flex flex-row-reverse">
                                        <button
                                            className="py-2 px-4 rounded-lg border border-border bg-muted/10 text-muted-foreground hover:bg-muted/20 transition text-sm"
                                            onClick={handleSaveAs}
                                        >
                                            另存
                                        </button>
                                    </div>

                                </div>
                            </>
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}