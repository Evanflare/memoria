import { PasswdSummary, searchPasswds, del_passwd_by_uid } from "../../tauri_core/command_frontend";
import PasswdListTable from "../../components/passwd_list";
import { Search, X, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import DecryptDialog from "../dialog/decrypt_dialog";
import { actionReducer, init_state } from "./dispacher/passwd_dispacher";
import { useImmerReducer } from "use-immer";
import AddPasswordDialog from "../dialog/add_passwd_dialog";
import UpdatePasswdDialog from "../dialog/update_passwd_dialog";
import { DeleteConfirmDialog } from "../dialog/DeleteConfirmDialog";

export default function PasswordListPage({ isAndroid }: { isAndroid: boolean }) {
    console.log("组件渲染开始");

    const [decryptTarget, setDecryptTarget] = useState<PasswdSummary | null>(null);
    const [passwdState, dispatch] = useImmerReducer(actionReducer, init_state);
    const [addPasswdFlag, changeAddFlag] = useState<boolean>(false);
    const [updateTarget, setUpdateTarget] = useState<PasswdSummary | null>(null);

    // 删除对话框状态
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteTargetUid, setDeleteTargetUid] = useState<string | null>(null);

    console.log("当前 passwdState:", passwdState);

    useEffect(() => {
        console.log("首次加载 useEffect 触发");
        dispatch({ type: 'search', query: "" });
    }, []);

    useEffect(() => {
        console.log("query 变化 useEffect 触发, query =", passwdState.query);
        const doSearch = async () => {
            console.log("开始调用 searchPasswds, 参数:", passwdState.query);
            try {
                const filtered_list = await searchPasswds(passwdState.query);
                console.log("searchPasswds 返回结果:", filtered_list);
                dispatch({ type: 'update-list', filtered_list });
            } catch (err) {
                console.error("searchPasswds 调用失败:", err);
            }
        };
        doSearch();
    }, [passwdState.query]);

    useEffect(() => {
        console.log("flushList 变化 useEffect 触发");
        const doSearch = async () => {
            console.log("开始调用 searchPasswds, 参数:", passwdState.query);
            try {
                const filtered_list = await searchPasswds(passwdState.query);
                console.log("searchPasswds 返回结果:", filtered_list);
                dispatch({ type: 'update-list', filtered_list });
            } catch (err) {
                console.error("searchPasswds 调用失败:", err);
            }
        };
        doSearch();
    }, [passwdState.flushList]);

    // 删除回调（供对话框使用）
    const handleDeletePasswd = async (uid: string, password: string) => {
        await del_passwd_by_uid(uid, password);
    };

    // 删除成功后的刷新
    const handleDeleteSuccess = () => {
        dispatch({ type: 'changed' }); // 触发列表刷新
    };

    // 打开删除对话框
    const onDeleteClick = (uid: string) => {
        setDeleteTargetUid(uid);
        setDeleteDialogOpen(true);
    };

    return (
        <div className="relative flex-1 flex justify-center h-full">
            <div className={`${isAndroid ? 'p-6 w-full' : 'p-8 w-4/5 max-w-4xl'} flex flex-col h-full`} >
                <h1 className="mb-1">密码记忆点管理</h1>
                <p className="text-muted-foreground mb-6">
                    管理你的密码记忆，添加一个密码记忆？
                </p>

                {/* Search */}
                <div className="relative mb-5">
                    <Search
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                    />
                    <input
                        type="text"
                        value={passwdState.query}
                        onChange={(e) => {
                            dispatch({
                                type: "search",
                                query: e.currentTarget.value
                            })
                        }}
                        placeholder="搜索'密码名'或者'描述'中的关键词..."
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-input-background text-foreground border border-border text-sm outline-none focus:border-primary transition-colors"
                    />
                    {passwdState.query && (
                        <button
                            onClick={() => {
                                dispatch({ type: "search", query: "" });
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X size={13} />
                        </button>
                    )}
                </div>

                {passwdState.query && (
                    <p className="text-xs text-muted-foreground mb-3">
                        {passwdState.filtered_list.length} 结果 关于:
                        <span className="text-foreground">{passwdState.query}</span>
                        "
                    </p>
                )}

                {/* Table — 新增 onDelete 属性 */}
                <PasswdListTable
                    filtered={passwdState.filtered_list}
                    setDecryptTarget={setDecryptTarget}
                    onRowClick={setUpdateTarget}
                    onDelete={onDeleteClick}   // 传递删除回调
                />
            </div>

            {/* Floating Add button */}
            <button
                onClick={() => changeAddFlag(true)}
                className={`fixed ${isAndroid ? 'bottom-28' : 'bottom-8'} right-8 flex items-center gap-2 px-5 py-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 active:scale-95 transition-all`}>
                <Plus size={16} />
            </button>

            {/* Decrypt dialog */}
            {decryptTarget && (
                <DecryptDialog
                    entry={decryptTarget}
                    onClose={() => setDecryptTarget(null)}
                    dispacher={dispatch}
                />
            )}
            {updateTarget && (
                <UpdatePasswdDialog
                    passwd={updateTarget}
                    hidden={false}
                    onClose={() => {
                        setUpdateTarget(null);
                        // 触发列表刷新
                        dispatch({ type: "changed" });
                    }}
                    onUpdated={() => {
                        setUpdateTarget(null);
                        dispatch({ type: "changed" });
                    }}
                />
            )}
            <AddPasswordDialog
                onClosed={() => changeAddFlag(false)}
                onAdded={() => dispatch({ type: "added" })}
                hidden={!addPasswdFlag}
            />

            {/* 通用删除确认对话框 */}
            <DeleteConfirmDialog
                open={deleteDialogOpen}
                deleteKey={deleteTargetUid}
                deleteFunction={handleDeletePasswd}
                onClose={() => {
                    setDeleteDialogOpen(false);
                    setDeleteTargetUid(null);
                }}
                onSuccess={handleDeleteSuccess}
            />
        </div>
    );
}