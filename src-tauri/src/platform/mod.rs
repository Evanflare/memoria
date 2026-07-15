#[cfg(target_os = "windows")]
mod windows;
#[cfg(target_os = "windows")]
use std::{fs, path::Path};

#[cfg(target_os = "android")]
mod android;

use log::{debug, info};
use tauri::Manager;

// // 提供给命令层的统一方法
// pub fn get_device_info() -> String {
//     PlatformImpl::device_info()
// }

// pub fn perform_action(action: &str) -> Result<String, String> {
//     PlatformImpl::action(action)
// }

use std::io::ErrorKind;
use std::path::PathBuf;
use tauri::AppHandle;

#[derive(Clone)]
/// 提供文件的读写功能
/// 为了消除windows和android的差异，这里依赖app传入
pub struct FileOperator {
    app: Option<AppHandle>,
}
impl Default for FileOperator {
    fn default() -> Self {
        Self {
            app: Default::default(),
        }
    }
}

impl FileOperator {
    pub fn new(app: AppHandle) -> Self {
        Self { app: Some(app) }
    }
    pub fn get_app_handle(&self) -> Option<&AppHandle> {
        self.app.as_ref()
    }
    /// 获取data文件夹路径
    pub fn get_data_dir(&self) -> Result<PathBuf, String> {
        let data_dir = self
            .app
            .as_ref()
            .expect("不应该调用没有apphandle的对象")
            .path()
            .app_data_dir()
            .map_err(|e| e.to_string())?;
        Ok(data_dir)
    }
    /// 删除内部文件
    pub fn del_inner_file(&self, file_name: &str) -> Result<(), ErrorKind> {
        info!("成功调用删除文件函数");
        debug!("收到参数 filename: {}", file_name);
        use std::fs;
        // 先构建path
        let path = self
            .get_data_dir()
            .unwrap()
            .join(crate::core::PASSWD_DIR_PREFIX)
            .join(file_name);

        debug!("构建好了路径: {}", &path.to_string_lossy());
        // 判断路径是否存在
        if path.exists() && fs::remove_file(path).is_ok() {
            return Ok(());
        } else {
            return Err(ErrorKind::NotFound);
        }
    }
    #[cfg(target_os = "windows")]
    pub fn read_to_string(&self, file_path: &PathBuf) -> Result<String, ErrorKind> {
        let read_result = fs::read_to_string(Path::new(file_path));
        match read_result {
            Ok(content) => Ok(content),
            Err(e) => Err(e.kind()),
        }
    }
    #[cfg(target_os = "android")]
    pub fn read_to_string(&self, file_uri: &PathBuf) -> Result<String, ErrorKind> {
        if !file_uri.display().to_string().starts_with("content") {
            use tauri_plugin_android_fs::{AndroidFsExt, FileUri};
            match AndroidFsExt::android_fs(&self.app.clone().unwrap())
                .read_to_string(&&FileUri::from_path(file_uri))
            {
                Ok(content) => Ok(content),
                Err(e) => {
                    use log::warn;

                    warn!("无法读取文件: {}", file_uri.display());
                    warn!("错误原因: {}", e);
                    Err(ErrorKind::NotFound)
                }
            }
        } else {
            use std::io::Read;
            use tauri_plugin_android_fs::{AndroidFsExt, FileAccessMode, FileUri};
            let binding = self.app.clone().unwrap();
            let android_fs = binding.android_fs();
            let mut file = match android_fs
                .open_file(
                    &&FileUri::from_uri(file_uri.display().to_string()),
                    FileAccessMode::Read,
                )
                .map_err(|e| format!("无法打开文件: {}", e))
            {
                Ok(file) => file,
                Err(_) => return Err(ErrorKind::NotFound),
            };
            let mut c = String::new();
            match file
                .read_to_string(&mut c)
                .map_err(|e| format!("读取文件失败: {}", e))
            {
                Ok(_) => Ok(c),
                Err(_) => return Err(ErrorKind::Other),
            }
        }
    }
    #[cfg(target_os = "windows")]
    pub fn write(&self, content: &str, file_path: &PathBuf) -> Result<(), ErrorKind> {
        let write_result = fs::write(file_path, content);
        match write_result {
            Ok(_) => Ok(()),
            Err(e) => Err(e.kind()),
        }
    }
    #[cfg(target_os = "android")]
    pub fn write(&self, content: &str, file_uri: &PathBuf) -> Result<(), ErrorKind> {
        use tauri_plugin_android_fs::{AndroidFsExt, FileUri};
        let write_result;
        if file_uri.display().to_string().starts_with("content") {
            write_result = match AndroidFsExt::android_fs(&self.app.clone().unwrap())
                .write(&FileUri::from_uri(file_uri.display().to_string()), content)
            {
                Ok(_) => Ok(()),
                Err(_) => Err(()),
            };
        } else {
            use std::fs;
            write_result = match fs::write(file_uri, content) {
                Ok(_) => Ok(()),
                Err(_) => Err(()),
            };
        }
        match write_result {
            Ok(_) => Ok(()),
            Err(_) => Err(ErrorKind::NotFound),
        }
    }
}
