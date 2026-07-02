
import { Dispatch, SetStateAction, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { changeSecret } from "../../tauri_core/command_frontend";
import { message } from "@tauri-apps/plugin-dialog";
import { useKeyboardAvoidance } from "../ui/useKeyboardAvoidance";

export default function ChangeSecretDialog({ changeKeyDialogOpen, setChangeKeyDialogOpen }: {
    changeKeyDialogOpen: boolean;
    setChangeKeyDialogOpen: Dispatch<SetStateAction<boolean>>;
}) {

    const [currentKey, setCurrentKey] = useState("");
    const [newKey, setNewKey] = useState("");
    const [confirmNewKey, setConfirmNewKey] = useState("");
    const [isChangingKey, setIsChangingKey] = useState(false);
    const currentKeyRef = useRef<HTMLInputElement>(null);
    const { dialogOffset, ensureInputVisible } = useKeyboardAvoidance(currentKeyRef);

    // 修改密钥的处理函数
    const handleChangeKey = async () => {
        console.log("避免声明后未使用的变量警告，dialogOffset:", dialogOffset);
        if (!currentKey.trim() || !newKey.trim() || !confirmNewKey.trim()) {
            await message("请完整填写所有密钥字段", { title: "提示", kind: "warning" });
            return;
        }
        if (newKey !== confirmNewKey) {
            await message("新密钥与确认密钥不一致", { title: "提示", kind: "warning" });
            return;
        }
        setIsChangingKey(true);
        try {
            // 调用后端命令，传递当前密钥和新密钥（命令名称可自定义）
            await changeSecret(currentKey, newKey);
            await message("密钥修改成功！", { title: "成功", kind: "info" });
            // 清空表单并关闭对话框
            setCurrentKey("");
            setNewKey("");
            setConfirmNewKey("");
            setChangeKeyDialogOpen(false);
        } catch (error) {
            await message(`修改失败：${(error as Error)?.message}`, { title: "错误", kind: "error" });
        } finally {
            setIsChangingKey(false);
        }
    };

    return (
        < Dialog open={changeKeyDialogOpen} onOpenChange={setChangeKeyDialogOpen} >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>修改加密密钥</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        <div className="text-sm font-medium mb-1">当前密钥</div>
                        <input
                            ref={currentKeyRef}
                            type="password"
                            value={currentKey}
                            onChange={(e) => setCurrentKey(e.target.value)}
                            onFocus={ensureInputVisible}
                            onClick={ensureInputVisible}
                            onTouchStart={ensureInputVisible}
                            onPointerDown={ensureInputVisible}
                            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
                        />
                    </div>
                    <div>
                        <div className="text-sm font-medium mb-1">新密钥</div>
                        <input
                            type="password"
                            value={newKey}
                            onChange={(e) => setNewKey(e.target.value)}
                            onFocus={ensureInputVisible}
                            onClick={ensureInputVisible}
                            onTouchStart={ensureInputVisible}
                            onPointerDown={ensureInputVisible}
                            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
                        />
                    </div>
                    <div>
                        <div className="text-sm font-medium mb-1">确认新密钥</div>
                        <input
                            type="password"
                            value={confirmNewKey}
                            onChange={(e) => setConfirmNewKey(e.target.value)}
                            onFocus={ensureInputVisible}
                            onClick={ensureInputVisible}
                            onTouchStart={ensureInputVisible}
                            onPointerDown={ensureInputVisible}
                            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => setChangeKeyDialogOpen(false)}>
                        取消
                    </Button>
                    <Button onClick={handleChangeKey} disabled={isChangingKey}>
                        {isChangingKey ? "修改中..." : "确认修改"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog >

    );
}