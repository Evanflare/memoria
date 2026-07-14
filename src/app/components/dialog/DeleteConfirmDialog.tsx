import { useState, useRef } from "react";
import { useKeyboardAvoidance } from "../ui/useKeyboardAvoidance";

// 删除确认对话框组件
export function DeleteConfirmDialog({
    open,
    deleteKey,
    onClose,
    onSuccess,
    deleteFunction
}: {
    open: boolean;
    deleteKey: string | null;
    onClose: () => void;
    onSuccess: () => void;
    deleteFunction: (word: string, secret_key: string) => void;
}) {
    const [password, setPassword] = useState("");
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const { dialogOffset, ensureInputVisible } = useKeyboardAvoidance(passwordRef);

    // 封装关闭：清除内部状态，再调用外部 onClose
    const handleClose = () => {
        setPassword("");
        setError(null);
        onClose();
    };

    // 点击背景关闭
    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };
    const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            handleDelete();
        }
    };
    const handleDelete = async () => {
        if (!deleteKey || !password.trim()) {
            setError("请输入密钥");
            return;
        }
        setDeleting(true);
        setError(null);
        try {
            await deleteFunction(deleteKey, password.trim());
            onSuccess();
            handleClose(); // 成功后清除并关闭
        } catch (e: any) {
            setError(e?.message || "删除失败，请检查密钥");
        } finally {
            setDeleting(false);
        }
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex p-4 items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={handleOverlayClick}
        >
            <div
                data-dialog-content
                className="bg-background rounded-2xl shadow-xl w-full max-w-md p-6 border border-border transition-transform duration-300 ease-out"
                style={{ transform: dialogOffset ? `translateY(-${dialogOffset}px)` : undefined }}
                onClick={(e) => e.stopPropagation()} // 阻止冒泡，避免点击内容区关闭
            >
                <h3 className="text-lg font-semibold mb-2">确认删除</h3>
                <p className="text-muted-foreground text-sm mb-4">
                    此操作不可撤销，请输入您的密钥以确认删除该记忆点。
                </p>
                <input
                    ref={passwordRef}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={ensureInputVisible}
                    onClick={ensureInputVisible}
                    onKeyDown={handleKeyDown}
                    onTouchStart={ensureInputVisible}
                    onPointerDown={ensureInputVisible}
                    placeholder="密钥"
                    className="w-full px-3 py-2 rounded-lg bg-input-background border border-border text-sm focus:border-primary outline-none transition-colors mb-4"
                    autoFocus
                />
                {error && <p className="text-destructive text-xs mb-3">{error}</p>}
                <div className="flex justify-end gap-3">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 rounded-lg text-sm border border-border hover:bg-muted transition-colors"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="px-4 py-2 rounded-lg text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
                    >
                        {deleting ? "删除中..." : "确认删除"}
                    </button>
                </div>
            </div>
        </div>
    );
}