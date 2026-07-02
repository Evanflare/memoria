import { open, save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { writeTextFile } from '@tauri-apps/plugin-fs';

// 导入按钮的处理函数
const handleChooseImportFile = async (): Promise<string | null> => {
    try {
        const selected = await open({
            multiple: false,
            directory: false,
            title: "导入文件",
            filters: [{ name: "toml", extensions: ["toml"] }]
        });
        if (!selected) return null;
        return selected;

    } catch (error: any) {
        console.error("导入失败", error);
        throw Error("导入失败:" + error?.message)
    }
};

// 切换按钮的处理函数
const handleCheckOut = async (): Promise<string | null> => {
    try {
        const selected = await open({
            multiple: false,
            directory: false,
            title: "切换到文件",
            filters: [{ name: "toml", extensions: ["toml"] }]
        });
        if (!selected) return null;

        return selected;
    } catch (error: any) {
        console.error("切换失败", error);
        throw Error("切换失败:" + error?.message)
    }
};


// 导出按钮的处理函数
const handleExport = async (): Promise<boolean> => {
    try {
        const savePath = await save({
            title: "导出文件",
            defaultPath: `passwd.toml`,
            filters: [{ name: "toml", extensions: ["toml"] }]
        });
        if (!savePath) return false;

        // 调用tauri命令
        let toml_text: string = await invoke('export_string');
        await writeTextFile(savePath, toml_text);
        console.log("导出成功");
        return true;
    } catch (error: any) {
        console.error("导出失败", error);
        throw Error("导出失败：" + error)
    }
};

export { handleExport, handleChooseImportFile, handleCheckOut }