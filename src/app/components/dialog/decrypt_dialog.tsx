import { useRef, useState } from "react";
import { decyptPasswd, PasswdSummary } from "../../tauri_core/command_frontend";
import { Eye, X, Lock } from "lucide-react";
import { PasswdPageAction } from "../pages/dispacher/passwd_dispacher";
import { useKeyboardAvoidance } from "../ui/useKeyboardAvoidance";

export default function DecryptDialog({
    entry,
    onClose,
    dispacher
}: {
    entry: PasswdSummary;
    onClose: () => void;
    dispacher: React.Dispatch<PasswdPageAction>
}) {
    const [secretKey, setSecretKey] = useState("");
    const [plaintext, setPlaintext] = useState<string | null>(null);
    const [error, setError] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const { dialogOffset, ensureInputVisible } = useKeyboardAvoidance(inputRef);

    const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            decyted();
        }
    };

    const decyted = async () => {
        if (!secretKey.trim()) {
            setError(true);
            return;
        }
        setError(false);
        try {
            const decrypted = await decyptPasswd(entry.uid, secretKey);
            setPlaintext(decrypted);
            dispacher({
                type: 'decypt',
                uid: entry.uid,
                plaintext: decrypted,
            });
        } catch (err) {
            console.error("解密失败", err);
            setError(true);
            setPlaintext(null);
        }
    };

    const handleClose = () => {
        setPlaintext(null);
        setSecretKey("");
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-500 ease-out"
            onClick={(e) => {
                if (e.target === e.currentTarget) handleClose();
            }}
        >
            <div
                className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden transition-transform duration-400 ease-out"
                style={{ transform: dialogOffset ? `translateY(-${dialogOffset}px)` : undefined }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Lock size={15} className="text-primary" />
                        </div>
                        <div>
                            <div className="font-semibold">{entry.name}</div>
                            <div className="text-xs text-muted-foreground">
                                {entry.description}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Body with scroll support */}
                <div className="px-6 py-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
                    {!plaintext ? (
                        <>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm">密钥</label>
                                <input
                                    ref={inputRef}
                                    type="password"
                                    value={secretKey}
                                    onChange={(e) => {
                                        setSecretKey(e.target.value);
                                        setError(false);
                                    }}
                                    onKeyDown={handleKeyDown}
                                    onFocus={ensureInputVisible}
                                    onClick={ensureInputVisible}
                                    onTouchStart={ensureInputVisible}
                                    onPointerDown={ensureInputVisible}
                                    placeholder="按Enter确认"
                                    className={`w-full px-3 py-2 rounded-lg bg-input-background text-foreground border text-sm outline-none transition-colors ${error ? "border-destructive" : "border-border focus:border-primary"
                                        }`}
                                />
                                {error && (
                                    <p className="text-xs text-destructive">
                                        Incorrect secret key. Try again.
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => decyted()}
                                className="w-full py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm"
                            >
                                解密
                            </button>
                        </>
                    ) : (
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Eye size={14} />
                                密码记忆
                            </div>
                            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-muted border border-border font-mono tracking-wide select-all">
                                {plaintext}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                关闭页面或者按Esc退出，都会直接清除内存中暂存密码记忆明文
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}