//! 关于配置信息导入、导出、切换、更新等命令
//!

use log::{debug, info, warn};
use std::fs;
use std::path::PathBuf;
use std::str::FromStr;
use std::sync::Mutex;
use tauri::{AppHandle, State};
#[cfg(target_os = "android")]
use tauri_plugin_android_fs::{AndroidFsExt, FileAccessMode, FileUri};

use crate::core::error::CoreError::*;
use crate::core::{PasswdError, PasswdManager, PasswdVector};
use crate::error::Error;
use crate::get_app_data_dir;

#[tauri::command(rename_all = "snake_case")]
pub fn export_string(state: State<'_, Mutex<PasswdManager>>) -> Result<String, Error> {
    // 获得passwd vector
    let manager = state.lock().unwrap();
    match manager.passwds.get_save_string() {
        Ok(toml_text) => Ok(toml_text),
        Err(FilePathIsWrong(s)) => Err(Error::FileOperationError(s)),
        _ => Err(Error::FileOperationError("无法导出文件".to_string())),
    }
}

/// 导入文件，将文件中的不同密钥加入当前密码记忆集
#[tauri::command(rename_all = "snake_case")]
pub fn import_from_file(
    path: &str,
    local_secret: &str,
    import_secret: &str,
    state: State<'_, Mutex<PasswdManager>>,
    _app: AppHandle,
) -> Result<(), Error> {
    // 获得passwd vector
    let mut manager = state.lock().unwrap();
    // 获得要导入的passwd vector
    let content: String = if path.starts_with("content") {
        #[cfg(target_os = "android")]
        {
            // 在 Android 上，'path' 是一个 content:// URI

            use std::io::Read;
            let android_fs = _app.android_fs();
            let mut file = match android_fs
                .open_file(&FileUri::from_uri(path), FileAccessMode::Read)
                .map_err(|e| format!("无法打开文件: {}", e))
            {
                Ok(file) => file,
                Err(message) => return Err(Error::FileOperationError(message)),
            };
            let mut c = String::new();
            match file
                .read_to_string(&mut c)
                .map_err(|e| format!("读取文件失败: {}", e))
            {
                Ok(_) => c,
                Err(message) => return Err(Error::FileOperationError(message)),
            }
        }
        #[cfg(not(target_os = "android"))]
        {
            panic!("非android设备不支持 File Uri 文件访问方式")
        }
    } else {
        // 在 Windows 等平台上，'path' 是标准的文件系统路径
        match fs::read_to_string(&path).map_err(|e| format!("读取文件失败: {}", e)) {
            Ok(content) => content,
            Err(message) => return Err(Error::FileOperationError(message)),
        }
    };
    let import_vector = match PasswdVector::create_from_string(&content) {
        Ok(res) => res,
        Err(e) => {
            return Err(Error::FileOperationError(e.as_str().to_string()));
        }
    };
    let config = manager.config.clone();
    match manager.passwds.includes_passwd_vector(
        import_vector,
        local_secret,
        import_secret,
        config.fill_char,
    ) {
        Ok(_) => {
            let _ = manager.passwds.store(&config.passwd_file_path);
            Ok(())
        }
        Err(PasswdError::CoreError(FilePathIsWrong(s))) => Err(Error::FileOperationError(s)),
        Err(PasswdError::CoreError(SecretKeyDifferent(s))) => {
            Err(Error::SecretKeyError(format!("加密密钥不一致:{}", s)))
        }
        Err(PasswdError::CoreError(SecretKeyWrong)) => {
            Err(Error::SecretKeyError("密钥错误".to_string()))
        }
        _ => Err(Error::FileOperationError("无法导入文件".to_string())),
    }
}
/// 将外部文件直接导入到本地配置文件夹
/// 并返回内部配置的路径
#[tauri::command(rename_all = "snake_case")]
pub fn extern_file_include(
    extern_file_path: &str,
    app_handle: AppHandle,
    state: State<'_, Mutex<PasswdManager>>,
) -> Result<String, String> {
    info!("成功调用 extern_file_include 命令");
    debug!("extern_file_path: {}", extern_file_path);
    match PathBuf::from_str(extern_file_path) {
        Ok(path) => {
            // 获取默认配置文件
            let dir = get_app_data_dir(app_handle).unwrap();
            debug!("解析成功路径: {}", path.display());
            let manager = state.lock().unwrap();
            let file_operator = manager.file_operator.clone();
            let content = match file_operator.read_to_string(&path) {
                Ok(content) => content,
                Err(e) => {
                    warn!("读取文件失败: {}", e.to_string());
                    return Err(format!("读取文件失败：{}", e.to_string()));
                }
            };
            debug!("成功读取文件内容：{:10}", content);
            // 构建新路径，并判断路径是否已被占用
            let mut new_path = PathBuf::from_str(&dir).unwrap();
            new_path.push(path.file_name().unwrap());
            if new_path.exists() {
                use uuid::Uuid;
                new_path.pop();
                new_path.push(format!(
                    "{}{}",
                    Uuid::new_v4(),
                    path.file_name().unwrap().display()
                ));
            }
            let _ = file_operator.write(&content, &new_path);
            Ok(new_path.display().to_string())
        }
        Err(_) => {
            warn!("路径无法解析: {}", extern_file_path);
            Err(format!("路径无法解析：{}", extern_file_path))
        }
    }
}
