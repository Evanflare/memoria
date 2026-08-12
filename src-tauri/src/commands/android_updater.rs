// src/commands/android_updater.rs
use futures_util::stream::StreamExt;
use reqwest;
use std::fs::File;
use std::io::Write;
use tauri::Emitter; // 导入 Emitter trait 以使用 emit
use tauri::Manager; // 导入 Manager trait 以使用 .path()

#[tauri::command]
pub async fn download_apk(
    app: tauri::AppHandle,
    url: String,
    version: String,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("下载请求失败: {}", e))?;

    let total_size = response.content_length().unwrap_or(0);
    let cache_dir = app
        .path()
        .cache_dir()
        .map_err(|e| format!("获取缓存目录失败: {}", e))?
        .join(format!("app_update_{}.apk", version));

    let mut file = File::create(&cache_dir).map_err(|e| format!("创建文件失败: {}", e))?;
    let mut downloaded = 0u64;
    let mut stream = response.bytes_stream();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("下载数据块失败: {}", e))?;
        file.write_all(&chunk)
            .map_err(|e| format!("写入文件失败: {}", e))?;
        downloaded += chunk.len() as u64;
        if total_size > 0 {
            let progress = (downloaded as f32 / total_size as f32) * 100.0;
            // 使用 app.emit 发送进度事件
            let _ = app.emit("download-progress", progress as u32);
        }
    }

    Ok(cache_dir.to_string_lossy().to_string())
}
