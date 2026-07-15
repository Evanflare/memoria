//! get commands 获得的对象都是需要解密的明文

use crate::dto::ConfigInfo;
use crate::error::Error;
use crate::{core::PasswdManager, platform::FileOperator};
use log::warn;
use std::sync::Mutex;
use tauri::{AppHandle, State};

/// 根据唯一ID获取密码条目的明文密码，前端需要提供一个密钥来解密密码条目中的加密密码
#[tauri::command]
pub fn get_passwd(
    uid: String,
    key: String,
    state: State<'_, Mutex<PasswdManager>>,
) -> Result<String, Error> {
    let manager = state.lock().unwrap();
    match manager.passwds.get_passwd_by_uid(&uid) {
        Some(passwd) => passwd
            .decypted_passwd(&key)
            .map_err(|_| {
                warn!("解密失败");
                Error::SecretKeyError(format!("密钥不正确"))
            })
            .map(|plaintext| {
                warn!("解密成功");
                plaintext
            }),
        None => {
            warn!("未找到唯一的密码UID包含{}的密码条目", uid);
            Err(Error::NotFoundItem(format!(
                "未找到唯一的密码UID包含{}的密码条目",
                uid
            )))
        }
    }
}

/// 获得当前的配置项，前端可以根据这些配置项来调整界面或者进行下一步操作
#[tauri::command]
pub fn get_config(state: State<'_, Mutex<PasswdManager>>) -> Result<ConfigInfo, Error> {
    let manager = state.lock().unwrap();
    Ok(ConfigInfo {
        default_fill_char: manager.config.fill_char,
        passwd_file_path: manager.config.passwd_file_path.display().to_string(),
        profile_path: manager.config.profile_path.display().to_string(),
        dark_mode: manager.config.dark_mode,
    })
}

#[tauri::command]
pub fn get_app_data_dir(app_handle: AppHandle) -> Result<String, String> {
    use crate::core::config::AppConfig;
    let default_config = AppConfig::generate(FileOperator::new(app_handle));
    // 给默认内部配置文件路径
    let dir = default_config
        .passwd_file_path
        .parent()
        .expect("默认配置文件所在目录一定不为空");
    Ok(dir.to_string_lossy().to_string())
}

use serde::Serialize;

#[derive(Serialize)]
pub struct Entry {
    pub name: String,
    pub path: String,
}

#[tauri::command]
pub fn get_app_config_dir_files(app_handle: AppHandle) -> Result<Vec<Entry>, String> {
    use crate::core::config::AppConfig;
    // 给默认内部配置文件路径
    let default_config = AppConfig::generate(FileOperator::new(app_handle));
    let dir = default_config
        .passwd_file_path
        .parent()
        .expect("默认配置文件所在目录一定不为空");
    match dir.read_dir() {
        Ok(res) => {
            // 遍历目录所有toml结尾的文件
            Ok(res
                .map(|f| Entry {
                    name: f
                        .as_ref()
                        .unwrap()
                        .file_name()
                        .to_string_lossy()
                        .to_string(),
                    path: f.as_ref().unwrap().path().display().to_string(),
                })
                .collect())
        }
        Err(e) => Err(format!(
            "{}, 无法读取目录: {}",
            e.to_string(),
            dir.display()
        )),
    }
}
