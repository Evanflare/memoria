use tauri_plugin_updater::UpdaterExt;

pub async fn update(app: tauri::AppHandle) -> tauri_plugin_updater::Result<()> {
    if let Some(update) = app.updater()?.check().await? {
        let mut downloaded = 0;

        // alternatively we could also call update.download() and update.install() separately
        update
            .download_and_install(
                |chunk_length, content_length| {
                    downloaded += chunk_length;
                    println!("已下载 {downloaded} 直到 {content_length:?}");
                },
                || {
                    println!("下载完成");
                },
            )
            .await?;

        println!("更新完成");
        app.restart();
    }

    Ok(())
}
