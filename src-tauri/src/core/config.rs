use crate::platform::FileOperator;
use log::warn;
use serde::{Deserialize, Serialize};
use std::{
    fs::{self},
    path::PathBuf,
};

/// 配置文件名
pub const PROFILE_NAME: &str = "config.toml";
pub const DEFAULT_FILL_CHAR: char = '0';
pub const PASSWD_FILE_NAME: &str = ".passwd.toml";
pub const PASSWD_DIR_PREFIX: &str = "password_files";
pub const CONFIG_DIR_PREFIX: &str = "config_files";

#[derive(Serialize, Deserialize, Clone)]
/// 程序的配置结构体，负责读取配置文件，构造配置文件，修改配置文件，配置文件导出导入。
///
/// # 默认配置
/// 密码文件默认路径 passwd_file_path: "%APPDATA%\\.passwd-nickname\\.passwd.nickname"
/// 配置文件默认路径 profile_path: "%APPDATA%\\passwd-nickname\\config.toml"
/// 默认密钥填充字符 '0'
pub struct AppConfig {
    pub fill_char: char,
    pub passwd_file_path: PathBuf,
    pub profile_path: PathBuf,
    #[serde(skip_serializing, skip_deserializing)]
    pub file_operator: FileOperator,
    pub dark_mode: bool,
}
impl Default for AppConfig {
    fn default() -> Self {
        Self {
            fill_char: Default::default(),
            passwd_file_path: Default::default(),
            profile_path: Default::default(),
            file_operator: FileOperator::default(),
            dark_mode: true, // 默认启用暗模式
        }
    }
}

/// 默认值：依赖cache-dir获取跨平台的文件夹位置
impl AppConfig {
    /// 如果使用default创建对象，后续需要init才能使用
    //  pub fn init(&mut self, manager: Arc<Mutex<PasswdManager>>) {
    //     self.fill_char = DEFAULT_FILL_CHAR;
    //     self.passwd_file_path = manager
    //         .lock()
    //         .expect("出现了数据竞争")
    //         .file_operator
    //         .as_ref()
    //         .expect("不能调用默认PasswdManager")
    //         .get_data_dir()
    //         .expect("无法获得data_dir")
    //         .join(Path::new(APP_NAME))
    //         .join(PASSWD_FILE_NAME);
    //     self.profile_path = manager
    //         .clone()
    //         .lock()
    //         .expect("出现了数据竞争")
    //         .file_operator
    //         .as_ref()
    //         .expect("不能调用默认PasswdManager")
    //         .get_data_dir()
    //         .expect("无法获得data_dir")
    //         .join(Path::new(APP_NAME))
    //         .join(PROFILE_NAME)
    //         .to_path_buf();
    //     self.manager = manager;
    // }
    pub fn generate(file_operator: FileOperator) -> Self {
        //首先读取默认的配置文件，并根据默认配置文件中的二级配置文件路径去读取新的配置
        let default_passwd_path = file_operator
            .get_data_dir()
            .expect("无法获得data_dir")
            .join(PASSWD_DIR_PREFIX)
            .join(PASSWD_FILE_NAME);
        let default_profile_path = file_operator
            .get_data_dir()
            .expect("无法获得data_dir")
            .join(CONFIG_DIR_PREFIX)
            .join(PROFILE_NAME)
            .to_path_buf();
        // 校验默认配置文件是否存在，若不存在，则直接返回默认对象
        match fs::exists(default_profile_path.clone()) {
            Ok(_) => match Self::read_profile(&file_operator, &default_profile_path) {
                Ok(config) => return config,
                Err(_) => {}
            },
            Err(_) => {}
        }
        let default_config = Self {
            file_operator: file_operator,
            fill_char: DEFAULT_FILL_CHAR,
            passwd_file_path: default_passwd_path,
            profile_path: default_profile_path,
            dark_mode: Default::default(),
        };
        let _ = default_config.store();
        default_config
    }
    pub fn set_passwd_file_path(&mut self, path: PathBuf) {
        self.passwd_file_path = path;
    }
    pub fn set_profile_path(&mut self, path: PathBuf) {
        self.profile_path = path;
    }
    pub fn set_fill_char(&mut self, fill_char: char) {
        self.fill_char = fill_char;
    }
}

impl AppConfig {
    // /// 根据baseDir路径，得到默认配置信息
    // pub fn create_from_basedir(
    //     base: &PathBuf,
    //     file_operator: Option<&'a FileOperator<'_>>,
    // ) -> Result<Self, OsString> {
    //     let mut base = base.clone();
    //     base.push(APP_NAME);
    //     let mut profile_path = base.clone();
    //     profile_path.push(format!("{PROFILE_NAME}.toml"));
    //     let mut passwd_file_path = base.clone();
    //     passwd_file_path.push(format!("{PASSWD_FILE_NAME}.toml"));
    //     Ok(AppConfig {
    //         fill_char: DEFAULT_FILL_CHAR,
    //         profile_path: profile_path.into_os_string().into_string()?,
    //         passwd_file_path: passwd_file_path.into_os_string().into_string()?,
    //         file_operator,
    //     })
    // }
    /// 根据baseDir路径,读取或创建默认配置信息
    // pub fn read_or_create_from_basedir(
    //     base: &PathBuf,
    //     file_operator: Option<&'a FileOperator<'_>>,
    // ) -> Result<Self, OsString> {
    //     // 先得到该路径下的默认配置
    //     let default_profile = AppConfig::create_from_basedir(base, Option::None)?;
    //     // 根据默认配置信息检查配置文件是否存在
    //     if fs::exists(default_profile.profile_path.clone()).unwrap() {
    //         // 存在就读取里面的配置信息
    //         Ok(AppConfig::read_profile(&default_profile.profile_path, file_operator).unwrap())
    //     } else {
    //         //默认配置中的二级配置文件位置应该就指向自己，如果不存在就创建文件
    //         let _ = default_profile.store();
    //         Ok(default_profile)
    //     }
    // }
    /// 程序运行时读取配置文件。
    /// 有循环读取的风险
    pub fn read_profile(
        file_operator: &FileOperator,
        profile_path: &PathBuf,
    ) -> Result<AppConfig, ConfigError> {
        // 读取文件
        let toml_text = match file_operator.read_to_string(profile_path) {
            Ok(c) => c,
            Err(e) => return Err(ConfigError::SerializeError(e.to_string())),
        };
        // 反序列化为结构体
        let config: AppConfig = match toml::from_str(&toml_text) {
            Ok(c) => c,
            Err(e) => return Err(ConfigError::SerializeError(e.to_string())),
        };
        // 检查配置文件中配置的路径是否为自身，如果不是则继续递归调用
        if config.profile_path != *profile_path {
            match Self::read_profile(file_operator, &config.profile_path) {
                Ok(config) => Ok(config),
                Err(e) => Err(e),
            }
        } else {
            Ok(config)
        }
    }
    /// 保存当前配置到配置的路径下
    pub fn store(&self) -> Result<(), ConfigError> {
        // 序列化 config 为 TOML 字符串T
        let toml_text: String = match toml::to_string_pretty(self) {
            Ok(t) => t,
            Err(e) => return Err(ConfigError::SerializeError(e.to_string())),
        };
        let path = &self.profile_path;

        // 自动创建父文件夹
        if let Some(parent) = path.parent() {
            if !parent.exists() {
                if let Err(e) = fs::create_dir_all(parent) {
                    if e.kind() == std::io::ErrorKind::PermissionDenied {
                        warn!(
                            "无法创建父目录（只读文件系统或权限不足）：{}，跳过写入。",
                            parent.display()
                        );
                        return Ok(());
                    } else {
                        return Err(ConfigError::FileOperationError(e.to_string()));
                    }
                }
            }
        }
        // 写入文件
        if let Err(e) = self.file_operator.write(&toml_text, path) {
            if e == std::io::ErrorKind::PermissionDenied {
                warn!(
                    "无法写入密码文件（只读文件系统或权限不足）：{}，跳过写入。",
                    path.display()
                );
                return Ok(());
            } else {
                warn!(
                    "路径{}错误，无法写入。错误信息：{}",
                    path.display(),
                    e.to_string()
                );
                return Err(ConfigError::FileOperationError("路径无法写入".to_string()));
            }
        }

        Ok(())
    }
}

pub enum ConfigError {
    SerializeError(String),
    FileOperationError(String),
}

impl ToString for ConfigError {
    fn to_string(&self) -> String {
        match self {
            ConfigError::SerializeError(msg) => msg.clone(),
            ConfigError::FileOperationError(msg) => msg.clone(),
        }
    }
}

#[cfg(test)]
mod tests {}
