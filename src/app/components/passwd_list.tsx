import { PasswdSummary } from "../tauri_core/command_frontend";
import { ScrollArea } from "./ui/scroll-area";  // 你封装的 ScrollArea

export default function PasswdListTable({
    filtered,
    setDecryptTarget,
    onRowClick,
    onDelete,
}: {
    filtered: PasswdSummary[];
    setDecryptTarget: (e: PasswdSummary) => void;
    onRowClick?: (e: PasswdSummary) => void;
    onDelete: (uid: string) => void;
}) {
    return (
        <ScrollArea >
            <div className="w-full text-sm  border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted/50 z-10">
                        <tr>
                            <th className="text-left px-4 py-3 text-muted-foreground">名称</th>
                            <th className="text-left px-4 py-3 text-muted-foreground">描述</th>
                            <th className="px-4 py-3 w-[1%] whitespace-nowrap">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">
                                    没有搜索到任何结果
                                </td>
                            </tr>
                        ) : (
                            filtered.map((e, i) => (
                                <tr
                                    key={e.uid}
                                    onClick={() => onRowClick?.(e)}
                                    className={` last:border-0 hover:bg-accent/40 transition-colors ${i % 2 !== 0 ? "bg-muted/20" : ""} cursor-pointer`}
                                >
                                    {/* 名称：最多200px后截断 */}
                                    <td className="px-4 py-3 font-medium truncate max-w-[25vw]">{e.name}</td>
                                    {/* 描述：最多300px后截断 */}
                                    <td className="px-4 py-3 text-muted-foreground truncate max-w-[25vw]">{e.description}</td>
                                    {/* 操作列：确保两个按钮始终在同一行，不换行 */}
                                    <td className="px-4 py-3 text-right whitespace-nowrap">
                                        <button
                                            onClick={(ev) => {
                                                ev.stopPropagation();
                                                setDecryptTarget(e);
                                            }}
                                            className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-accent transition-colors mr-2"
                                        >
                                            解密
                                        </button>
                                        <button
                                            onClick={(ev) => {
                                                ev.stopPropagation();
                                                onDelete(e.uid);
                                            }}
                                            className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors"
                                        >
                                            删除
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

        </ScrollArea>
    );
}