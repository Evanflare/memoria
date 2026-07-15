use crate::core::PasswdManager;
// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::sync::Mutex;
use tauri::{generate_context, Manager};

/// 模块定义
pub mod commands;
pub mod core;
pub mod error;
pub mod logger;
pub mod platform;
pub mod status;
pub mod utils;
/// 重导出
pub use commands::*;

use log::info;
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    logger::init();
    info!("开始运行应用程序");
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init());

    #[cfg(target_os = "android")]
    let builder = builder.plugin(tauri_plugin_android_fs::init());

    builder
        .setup(|app| {
            let state = Mutex::new(PasswdManager::new(app.handle().clone()));
            app.manage(state);
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            list_passwds,
            get_passwd,
            get_memory_points,
            plaintext_points,
            get_app_config_dir_files,
            extern_file_include,
            del_inner_file,
            change_secret_key,
            change_file,
            export_string,
            add_nickname,
            search_passwds,
            get_config,
            add_passwd,
            import_from_file,
            get_app_data_dir,
            update_passwd,
            del_memory_point,
            del_passwd_by_uid,
            update_dark_mode
        ])
        .run(generate_context!())
        .expect("error while running tauri application");
}
