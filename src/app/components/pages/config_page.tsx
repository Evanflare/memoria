import { DeleteConfirmDialog } from '../dialog/DeleteConfirmDialog';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { confirm } from '@tauri-apps/plugin-dialog'; // 已在项目中使用，确认是否已导入
import { useRef, useState, useEffect } from "react";
import { changeFile, del_inner_file, extern_file_include, getConfig } from "../../tauri_core/command_frontend";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "../ui/dialog";
import { useKeyboardAvoidance } from "../ui/useKeyboardAvoidance";
import { Button } from "../ui/button";
import {
    //handleCheckOut,    // 原来的外部切换逻辑，现在可能不用了，但保留为备用
    handleExport,
    handleChooseImportFile,
} from "../../tauri_core/import_export_config";
import { message } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import ChangeSecretDialog from "../dialog/change_secret.dialog";
import { ScrollArea } from "../ui/scroll-area";
import InternalFilePicker, { InternalFile } from "../../components/ui/InternalFilePicker";


export default function ConfigPage() {
    const [passwdFilePath, setPasswdFilePath] = useState("");
    const [configPath, setConfigPath] = useState("");
    const [defaultChar, setDefaultChar] = useState("");
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
    const [localSecret, setLocalSecret] = useState("");
    const [importSecret, setImportSecret] = useState("");
    const [isImporting, setIsImporting] = useState(false);
    const localSecretRef = useRef<HTMLInputElement>(null);
    const { dialogOffset: importDialogOffset, ensureInputVisible: ensureImportInputVisible } = useKeyboardAvoidance(localSecretRef);
    const [changeKeyDialogOpen, setChangeKeyDialogOpen] = useState(false);

    // 密码文件路径弹窗的显隐控制
    const [passwdFileDialogOpen, setPasswdFileDialogOpen] = useState(false);
    // 删除文件功能的状态
    const [deleteDialogOpen, setDeleteDiaglogOpen] = useState(false);
    const [deleteFileName, setDeleteFileName] = useState("");
    const delete_file = del_inner_file;
    useEffect(() => {
        async function loadConfig() {
            const config = await getConfig();
            setPasswdFilePath(config.passwd_file_path);
            setConfigPath(config.profile_path);
            setDefaultChar(config.default_fill_char);
        }
        loadConfig();
    }, []);

    const isAndroid = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);

    const items = [
        { label: "当前配置文件", value: configPath },
        { label: "密钥默认填充符号", value: defaultChar },
    ];

    const handleCopy = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            alert("已复制到剪贴板");
        } catch {
            alert("复制失败，请手动复制");
        }
    };

    // 刷新配置显示
    const refreshConfig = async () => {
        const config = await getConfig();
        setPasswdFilePath(config.passwd_file_path);
        setConfigPath(config.profile_path);
        setDefaultChar(config.default_fill_char);
    };

    // ========== 内部文件选择（密码文件路径弹窗） ==========
    const handleSelectInternalPasswdFile = async (file: InternalFile) => {
        try {
            await changeFile(file.path);
            await message("密码文件切换成功！", { title: "成功", kind: "info" });
            await refreshConfig();
            setPasswdFileDialogOpen(false);
        } catch (error) {
            await message(`切换失败：${(error as Error).message}`, { title: "错误", kind: "error" });
        }
    };

    // ========== 外部文件导入并切换（底部“切换”按钮） ==========
    const handleExternalSwitch = async () => {
        try {
            // 1. 打开系统文件选择器
            const selected = await handleChooseImportFile(); // 假设返回文件路径或 content URI
            if (!selected) return;

            const uri = Array.isArray(selected) ? selected[0] : selected;
            console.log("读取到选择", uri)
            if (!uri) return;

            // 2. 读取外部文件内容
            let dest = await extern_file_include(uri);
            console.log("内部文件的路径为: ", dest)
            // 4. 切换到内部文件
            await changeFile(dest);
            await message("外部文件已导入并切换成功！", { title: "成功", kind: "info" });
            await refreshConfig();
        } catch (error) {
            await message(`外部切换失败：${(error as Error).message} ${error}`, { title: "错误", kind: "error" });
        }
    };

    // ========== 相关（不变） ==========
    const handleSelectFile = async () => {
        try {
            const path = await handleChooseImportFile();
            if (path) setSelectedFilePath(path);
        } catch (error) {
            await message(`选择文件失败：${(error as Error).message}`, { title: "错误", kind: "error" });
        }
    };

    const handleDoImport = async () => {
        if (!selectedFilePath || !localSecret.trim() || !importSecret.trim()) return;
        setIsImporting(true);
        try {
            await invoke("import_from_file", {
                path: selectedFilePath,
                local_secret: localSecret,
                import_secret: importSecret,
            });
            setImportDialogOpen(false);
            setSelectedFilePath(null);
            setLocalSecret("");
            setImportSecret("");
        } catch (error) {
            await message(`导入失败：${(error as Error)?.message}`, { title: "错误", kind: "error" });
        } finally {
            setIsImporting(false);
        }
    };
    // 检测更新
    const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

    const handleCheckUpdate = async () => {
        // 防止重复点击
        if (isCheckingUpdate) return;
        setIsCheckingUpdate(true);

        try {
            // 超时 2 秒
            const update = await Promise.race([
                check(),
                new Promise<null>((_, reject) =>
                    setTimeout(() => reject(new Error('检查更新超时，请检查网络后重试')), 5000)
                )
            ]);

            if (!update) {
                await message('当前已是最新版本', { title: '提示', kind: 'info' });
                return;
            }

            // 发现新版本 -> 询问用户
            const shouldUpdate = await confirm(
                `发现新版本 ${update.version}，是否立即更新？\n\n更新日志：\n${update.body || ''}`,
                { title: '发现更新', kind: 'info' }
            );

            if (shouldUpdate) {
                // 下载并安装
                await message('正在下载更新，请稍候...', { title: '提示', kind: 'info' });
                let downloaded = 0;
                let contentLength: number | undefined = 0;
                await update.downloadAndInstall((event) => {
                    switch (event.event) {
                        case 'Started':
                            contentLength = event.data.contentLength;
                            console.log(`开始下载，总大小 ${contentLength} 字节`);
                            break;
                        case 'Progress':
                            downloaded += event.data.chunkLength;
                            console.log(`已下载 ${downloaded} / ${contentLength}`);
                            break;
                        case 'Finished':
                            console.log('下载完成');
                            break;
                    }
                });
                // 安装完成后重启
                await message('更新安装完成，应用即将重启', { title: '提示', kind: 'info' });
                await relaunch();
            }
        } catch (error) {
            await message((error as Error).message || '检查更新失败', { title: '错误', kind: 'error' });
        } finally {
            setIsCheckingUpdate(false);
        }
    };
    return (
        <div className="relative h-full w-full flex justify-center">
            <div className={`${isAndroid ? 'p-6 w-full' : 'p-6 pt-8 w-4/5'} flex flex-col h-full`}>
                <h1 className="mb-1">配置信息</h1>
                <p className="text-muted-foreground mb-6">关于软件的行为与其他信息。</p>
                <ScrollArea className="m-1">
                    <div className="flex justify-center">
                        <div className={`${isAndroid ? "max-w-[calc(100vw-48px)]" : 'w-full'} px-2`}>

                            <div className={`
                                rounded-xl border border-border divide-y 
                                divide-border min-w-0 overflow-hidden`}>
                                {/* 密码文件路径 —— 内部文件选择器 */}
                                <Dialog
                                    open={passwdFileDialogOpen} onOpenChange={setPasswdFileDialogOpen}>
                                    <DialogTrigger asChild>
                                        <div className="flex flex-col justify-between p-4 bg-card min-w-0 cursor-pointer hover:bg-accent/50 transition-colors">
                                            <div className="font-medium">当前密码文件</div>
                                            <div className="text-sm text-muted-foreground truncate">{passwdFilePath}</div>
                                        </div>
                                    </DialogTrigger>

                                    <DialogContent className="sm:max-w-md">
                                        <DialogHeader>
                                            <DialogTitle className="pb-4">选择内部密码文件</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4 pb-4">
                                            <div className="text-sm font-medium">当前文件路径完整内容</div>
                                            <div className="p-3 bg-muted rounded-md break-all whitespace-pre-wrap text-sm">
                                                {passwdFilePath}
                                            </div>
                                            <Button onClick={() => handleCopy(passwdFilePath)} variant="outline" className="w-full">
                                                一键复制
                                            </Button>
                                        </div>
                                        <div className="space-y-4">
                                            <InternalFilePicker
                                                onSelect={handleSelectInternalPasswdFile}
                                                extensions={["toml"]} // 只检测toml文件
                                                emptyMessage="还没有内部文件，请先通过「外部切换」导入"
                                                setDialogOpen={setPasswdFileDialogOpen}
                                                dialogOpen={passwdFileDialogOpen}
                                                setDeleteDialogOpen={setDeleteDiaglogOpen}
                                                setDeleteFileName={setDeleteFileName}
                                            />
                                            <div className="text-xs text-muted-foreground">
                                                点击列表中的文件即可切换，切换后立即生效。
                                            </div>
                                        </div>
                                    </DialogContent>
                                </Dialog>

                                {/* 其余配置项 */}
                                {items.map((item) => (
                                    <Dialog key={item.label}>
                                        <DialogTrigger asChild>
                                            <div className="flex flex-col justify-between p-4 bg-card min-w-0 cursor-pointer hover:bg-accent/50 transition-colors">
                                                <div className="font-medium">{item.label}</div>
                                                <div className="text-sm text-muted-foreground truncate">{item.value}</div>
                                            </div>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-md">
                                            <DialogHeader>
                                                <DialogTitle>{item.label}</DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-4">
                                                <div className="text-sm font-medium">完整内容</div>
                                                <div className="p-3 bg-muted rounded-md break-all whitespace-pre-wrap text-sm">
                                                    {item.value}
                                                </div>
                                                <Button onClick={() => handleCopy(item.value)} variant="outline" className="w-full">
                                                    一键复制
                                                </Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                ))}
                            </div>

                            {/* 底部按钮区 */}
                            <div className="overflow-hidden mt-6 flex rounded-xl border border-border bg-card">
                                <button className="w-full min-h-10 flex-1 hover:bg-accent/50 border-r-2"
                                    onClick={() => setImportDialogOpen(true)}>
                                    包括
                                </button>
                                <button className="w-full min-h-10 flex-1 hover:bg-accent/50 border-r-2"
                                    onClick={async () => {
                                        try {
                                            const res = await handleExport();
                                            if (res) await message("导出成功！", { title: "成功", kind: "info" });
                                        } catch (e) {
                                            await message(`导出失败：${e}`, { title: "错误", kind: "error" });
                                        }
                                    }}>
                                    导出
                                </button>
                                {/* 外部切换按钮：选择外部文件 → 复制到内部 → 切换 */}
                                <button className="w-full min-h-10 flex-1 hover:bg-accent/50"
                                    onClick={handleExternalSwitch}>
                                    导入文件
                                </button>
                            </div>

                            <div className="overflow-hidden mt-2 flex rounded-xl border border-border bg-card">
                                <button
                                    className="w-full min-h-10 flex-1 hover:bg-accent/50"
                                    onClick={() => setChangeKeyDialogOpen(true)}>
                                    修改密钥
                                </button>
                            </div>

                            {/* 版本信息 */}
                            {/* 检测更新卡片 */}
                            <div className="mt-5 rounded-xl border border-border bg-card">
                                <button
                                    className="w-full min-h-10 flex justify-center items-center gap-2 hover:bg-accent/50 rounded-md px-3 py-2 transition-colors disabled:opacity-60"
                                    onClick={handleCheckUpdate}
                                    disabled={isCheckingUpdate || isAndroid}
                                >
                                    {isCheckingUpdate ? (
                                        <>
                                            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                            <span>正在检查更新...</span>
                                        </>
                                    ) : isAndroid ? (
                                        '检测更新（桌面版专用）'
                                    ) : (
                                        '检测更新'
                                    )}
                                </button>

                                {/* 版本信息 */}
                                <div className="p-5 border-t border-border">
                                    <div className="text-sm font-medium mb-1">软件版本</div>
                                    <div className="text-sm text-muted-foreground">
                                        {import.meta.env.VITE_APP_NAME} v{import.meta.env.VITE_APP_VERSION} — 构建于 {import.meta.env.VITE_BUILD_TIME}
                                    </div>
                                </div>

                                {/* 作者信息 */}
                                <div className="p-5 border-t border-border">
                                    <div className="font-medium">作者</div>
                                    <div className="text-sm text-muted-foreground">蒙煋Evanflare</div>
                                </div>
                            </div>
                            <div className="flex-1"></div>
                        </div>
                    </div>
                </ScrollArea>
            </div >
            {/* 删除确认对话框 */}
            < DeleteConfirmDialog
                open={deleteDialogOpen}
                deleteKey={deleteFileName}
                onClose={() => {
                    setDeleteDiaglogOpen(false);
                    setDeleteFileName("");
                    // 恢复原来的对话框显示
                    setPasswdFileDialogOpen(true);
                }
                }
                deleteFunction={delete_file}
                onSuccess={async () => {
                    //重新加载文件列表
                    await refreshConfig();
                }}
            />
            {/* 导入对话框 */}
            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                <DialogContent
                    data-dialog-content
                    className="sm:max-w-md transition-transform duration-400 ease-out"
                    style={{ transform: importDialogOffset ? `translateY(-${importDialogOffset}px)` : undefined }}
                >
                    <DialogHeader>
                        <DialogTitle>包括</DialogTitle>
                        <span className="text-sm text-muted-foreground">
                            将另外文件中的密码记忆等加入到当前文件
                        </span>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="mb-2">
                            <div className="text-sm font-medium mb-1">文件路径</div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={selectedFilePath || ""}
                                    readOnly
                                    placeholder="未选择文件"
                                    className="flex-1 px-3 py-2 rounded-md border border-border bg-muted text-sm min-w-0"
                                />
                                <Button type="button" variant="outline" onClick={handleSelectFile}>
                                    选择文件
                                </Button>
                            </div>
                        </div>
                        <div className="mb-2">
                            <div className="text-sm font-medium mb-1">当前加密密钥</div>
                            <input
                                ref={localSecretRef}
                                type="password"
                                value={localSecret}
                                onChange={(e) => setLocalSecret(e.target.value)}
                                onFocus={ensureImportInputVisible}
                                onClick={ensureImportInputVisible}
                                onTouchStart={ensureImportInputVisible}
                                onPointerDown={ensureImportInputVisible}
                                disabled={!selectedFilePath}
                                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm disabled:opacity-50"
                            />
                        </div>
                        <div>
                            <div className="text-sm font-medium mb-1">待包括文件加密密钥</div>
                            <input
                                type="password"
                                value={importSecret}
                                onChange={(e) => setImportSecret(e.target.value)}
                                onFocus={ensureImportInputVisible}
                                onClick={ensureImportInputVisible}
                                onTouchStart={ensureImportInputVisible}
                                onPointerDown={ensureImportInputVisible}
                                disabled={!selectedFilePath}
                                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm disabled:opacity-50"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => {
                            setImportDialogOpen(false);
                            setLocalSecret("");
                            setImportSecret("");
                        }}>
                            取消
                        </Button>
                        <Button
                            onClick={handleDoImport}
                            disabled={!selectedFilePath || !localSecret.trim() || !importSecret.trim() || isImporting}
                        >
                            {isImporting ? "导入中..." : "导入"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <ChangeSecretDialog changeKeyDialogOpen={changeKeyDialogOpen} setChangeKeyDialogOpen={setChangeKeyDialogOpen} />

        </div >
    );
}