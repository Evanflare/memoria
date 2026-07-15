//! 所有更新已有数据的命令

use crate::core::PasswdManager;
use crate::error::Error;
use log::{debug, info, warn};
use std::fs;
use std::path::PathBuf;
use std::str::FromStr;
use std::sync::Mutex;
use tauri::{AppHandle, State};
#[cfg(target_os = "android")]
use tauri_plugin_android_fs::{AndroidFsExt, FileAccessMode, FileUri};
/// 通过这个命令uid来决定更新的对象，传入更新的元素
#[tauri::command(rename_all = "snake_case")]
pub fn update_passwd(
    uid: &str,
    name: Option<&str>,
    descript: Option<&str>,
    plaintext: Option<&str>,
    user_key: &str,
    state: State<'_, Mutex<PasswdManager>>,
) -> Result<(), Error> {
    // 先从uid拿到passwd
    let mut manager = state.lock().unwrap();
    let store_path = &manager.config.passwd_file_path.clone();
    let passwds = &mut manager.passwds;
    let passwd = match passwds.get_mut_passwd_by_uid(uid) {
        Some(passwd) => passwd,
        None => {
            return Err(Error::NotFoundItem(format!(
                "uid：{uid}，找不到唯一的passwd项",
            )));
        }
    };

    match passwd.update(name, descript, plaintext, user_key) {
        Ok(_) => {
            let _ = passwds.store(store_path);
            Ok(())
        }
        Err(_) => Err(Error::SecretKeyError("密钥不正确".to_string())),
    }
}

/// 更新加密密钥
#[tauri::command(rename_all = "snake_case")]
pub fn change_secret_key(
    old_secret: &str,
    new_secret: &str,
    state: State<'_, Mutex<PasswdManager>>,
) -> Result<(), Error> {
    let mut manager = state.lock().unwrap();
    let fill_char = manager.config.fill_char;
    let passswd_file_path = manager.config.passwd_file_path.clone();
    match manager
        .passwds
        .change_encypt_secret(old_secret, new_secret, fill_char)
    {
        Ok(()) => {
            let _ = manager.passwds.store(&passswd_file_path);
            Ok(())
        }
        Err(e) => Err(Error::SomeElementFail(e.as_str())),
    }
}

/// 更换文件
#[tauri::command(rename_all = "snake_case")]
pub fn change_file(
    file_path: &str,
    state: State<'_, Mutex<PasswdManager>>,
    _app: AppHandle,
) -> Result<(), Error> {
    let mut manager = state.lock().unwrap();
    let content = if file_path.starts_with("content") {
        // Android: content URI
        #[cfg(target_os = "android")]
        {
            use std::io::Read;

            let android_fs = _app.android_fs();
            let mut file = match android_fs
                .open_file(&FileUri::from_uri(file_path), FileAccessMode::Read)
                .map_err(|e| Error::FileOperationError(format!("无法打开文件: {}", e)))
            {
                Ok(file) => file,
                Err(message) => return Err(Error::FileOperationError(message.to_string())),
            };
            let mut c = String::new();
            match file
                .read_to_string(&mut c)
                .map_err(|e| Error::FileOperationError(format!("读取文件失败: {}", e)))
            {
                Ok(_) => c,
                Err(message) => return Err(Error::FileOperationError(message.to_string())),
            }
        }
        #[cfg(not(target_os = "android"))]
        {
            // 不应该进入此分支，但为了安全返回错误
            return Err(Error::FileOperationError(
                "非 Android 平台不支持 content URI".into(),
            ));
        }
    } else {
        // Windows / 其他平台: 普通文件路径
        match fs::read_to_string(&file_path)
            .map_err(|e| Error::FileOperationError(format!("读取文件失败: {}", e)))
        {
            Ok(c) => c,
            Err(message) => return Err(Error::FileOperationError(message.to_string())),
        }
    };
    let file_path = match PathBuf::from_str(file_path) {
        Ok(p) => p,
        Err(e) => return Err(Error::FileOperationError(format!("解析路径失败: {}", e))),
    };
    let mut config = manager.config.clone();
    let _ = manager
        .passwds
        ._check_passwd_vector_file(&content, &file_path, &mut config);
    // 将变化后的config覆盖到当前
    manager.config = config;
    Ok(())
}

/// 更新dark_mode
#[tauri::command(rename_all = "snake_case")]
pub fn update_dark_mode(
    dark_mode: bool,
    state: State<'_, Mutex<PasswdManager>>,
) -> Result<(), Error> {
    info!("成功调用 update_dark_mode 命令");
    debug!("dark_mode: {}", dark_mode);
    let mut manager = state.lock().unwrap();
    manager.config.dark_mode = dark_mode;
    let res = manager
        .config
        .store()
        .map_err(|e| Error::FileOperationError(format!("无法保存配置文件: {}", e.to_string())));
    if let Err(e) = res {
        warn!("保存配置文件失败: {}", e);
        return Err(e);
    }
    info!("保存成功");
    Ok(())
}
