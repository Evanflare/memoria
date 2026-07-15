//! "删除"相关的命令

use std::sync::Mutex;

use crate::core::PasswdManager;
use crate::{error::Error, utils::passwd_vec_utils::check_secret_right_or_error};
use log::{info, warn};
use tauri::State;

/// 用来删除tauri中的passwd vector状态中的memory points 中的项。
#[tauri::command(rename_all = "snake_case")]
pub fn del_memory_point(
    point_str: &str,
    secret_key: &str,
    state: State<'_, Mutex<PasswdManager>>,
) -> Result<(), Error> {
    // 得到passwdvector
    let mut manager = state.lock().unwrap();
    if manager.passwds.nickname.del_nickname(point_str, secret_key) {
        let _ = manager.passwds.store(&manager.config.passwd_file_path);
        return Ok(());
    } else {
        return Err(Error::NotFoundItem(
            "无法找到对象，或者密码错误。".to_string(),
        ));
    }
}

/// 用来删除passwd vector中的passwd通过uid判断
#[tauri::command(rename_all = "snake_case")]
pub fn del_passwd_by_uid(
    uid: &str,
    secret_key: &str,
    state: State<'_, Mutex<PasswdManager>>,
) -> Result<(), Error> {
    // 得到passwdvector
    let mut manager = state.lock().unwrap();
    // 先校验密码是否正确
    match check_secret_right_or_error(&manager.passwds, secret_key) {
        Ok(_) => {}
        Err(_) => return Err(Error::SecretKeyError("密码不正确".to_string())),
    }
    if manager.passwds.remove_passwd_by_unique_id(uid) {
        let _ = manager.passwds.store(&manager.config.passwd_file_path);
        return Ok(());
    } else {
        return Err(Error::NotFoundItem("无法找到对象".to_string()));
    }
}

/// 用于删除内部文件
#[tauri::command(rename_all = "snake_case")]
pub fn del_inner_file(
    del_file_name: &str,
    secret_key: &str,
    state: State<'_, Mutex<PasswdManager>>,
) -> Result<(), Error> {
    info!("成功调用 del_inner_file 命令");
    // 得到passwdvector
    let manager = state.lock().unwrap();
    // 先校验密码是否正确
    match check_secret_right_or_error(&manager.passwds, secret_key) {
        Ok(_) => {}
        Err(_) => {
            warn!("密码不正确");
            return Err(Error::SecretKeyError("密码不正确".to_string()));
        }
    }
    info!("密码正确");
    match manager.file_operator.del_inner_file(del_file_name) {
        Ok(_) => {
            info!("文件删除成功");
            return Ok(());
        }
        Err(_) => {
            warn!("无法找到文件: {}", del_file_name);
            return Err(Error::NotFoundItem("无法找到文件".to_string()));
        }
    }
}
