//! 管理nickname，生成nickname passwd
//!

use crate::core::crypt::*;
use crate::core::error::CoreError;
use log::debug;
use rand::seq::SliceRandom;
use serde::{Deserialize, Serialize};

/// Nickname对象不应该具有单独持久化的能力，只应该作为一个数据的存储形式。
#[derive(Debug, Default, Serialize, Deserialize, PartialEq)]
pub struct Nickname {
    pub names: Vec<String>,
    pub default_fill_char: char,
}
impl Nickname {
    pub fn new(default_fill_char: char) -> Self {
        Self {
            names: Vec::new(),
            default_fill_char,
        }
    }
    /// 生成密码: 提示组合 + unique码 + 是否打乱
    pub fn generate_passwd_nickname(
        tips_vec: &mut Vec<String>,
        unique: &str,
        random: bool,
    ) -> String {
        if random {
            tips_vec.push(unique.to_string());
            tips_vec.shuffle(&mut rand::rng());
            return tips_vec.join(" ");
        } else {
            return format!("{} {}", tips_vec.join(" ").to_string(), unique.trim());
        }
    }
    /// 获取内部vec<string>
    pub fn get_mut_names(&mut self) -> &mut Vec<String> {
        &mut self.names
    }
    /// 一键修改加密密钥
    pub fn change_encypt_secret(
        &mut self,
        old_secret: &str,
        new_secret: &str,
    ) -> Result<(), CoreError> {
        let mut err_message: String = String::from("记忆点解密部分失败: ");
        let fill_char = self.default_fill_char;
        let mut fail_count = 0;
        let new_names = self
            .get_mut_names()
            .iter()
            .map(|name| -> String {
                // 解密
                let decrypted = decrypt(&hex::decode(name).unwrap(), old_secret, fill_char);
                match decrypted {
                    Ok(text) => {
                        // 加密
                        let e = encrypt(
                            &String::from_utf8_lossy(&text).as_bytes(),
                            new_secret,
                            fill_char,
                        );
                        return format!("{}", hex::encode(&e));
                    }
                    Err(_) => {
                        fail_count += 1;
                        return "".to_string();
                    }
                }
            })
            .filter(|s| s.len() > 0)
            .collect();
        self.names = new_names;
        // 判断是否有错误
        if fail_count > 0 {
            err_message.push_str(&fail_count.to_string());
            err_message.push_str(" 个记忆点解密失败。");
            Err(CoreError::SecretKeyDifferent(err_message))
        } else {
            Ok(())
        }
    }
    /// 获取nickname内部元素个数
    pub fn get_len(&self) -> usize {
        return self.names.len();
    }
    /// 用于判断是否包含密文(注意明文相同但密文可能不同)
    pub fn is_contains_ciphertext(&self, ciphertext: &str) -> bool {
        self.names.contains(&ciphertext.to_string())
    }
    /// 新增nickname
    pub fn add_nickname(&mut self, nick: &str, user_key: &str) {
        // 首先校验是否已有相同元素，如果有直接返回
        for ele in self.names.iter() {
            // 解密
            match decypt_string(ele, user_key, self.default_fill_char) {
                Ok(s) if s == nick => {
                    return ();
                }
                _ => {
                    debug!("{} 与 nickname {} 不相等", ele, nick);
                }
            }
        }
        let e = encrypt(&nick.as_bytes(), user_key, self.default_fill_char);
        let s = format!("{}", hex::encode(&e));
        self.names.push(s);
    }
    /// 检查nickname列表中的第一个值的加密密钥是否正确
    /// 注意：如果列表为空则一定返回true
    pub fn check_decryption_key(&self, key: &str) -> bool {
        if self.names.len() == 0 {
            return true;
        } else {
            // 取第一个密文解密进行校验
            let decrypted = decrypt(
                &hex::decode(&self.names[0]).unwrap(),
                key,
                self.default_fill_char,
            );
            match decrypted {
                Ok(_) => true,
                Err(_) => false,
            }
        }
    }
    /// 直接获取内部的string数组
    pub fn get_string_array(&self) -> Vec<String> {
        return self.names.iter().map(|s| s.clone()).collect();
    }
    /// 解密nickname
    pub fn decrypted_nickname(
        &self,
        user_key: &str,
    ) -> Result<Vec<String>, chacha20poly1305::Error> {
        let mut res: Vec<String> = Vec::with_capacity(self.names.len());
        let mut iter = self.names.iter();
        while let Some(s) = iter.next() {
            let decrypted = decrypt(&hex::decode(s).unwrap(), user_key, self.default_fill_char);
            res.push(format!("{}", String::from_utf8_lossy(&decrypted?)));
        }
        Ok(res)
    }

    /// 删除第一个匹配的nickname元素
    /// 当找不到同名元素、或者密码错误的时候会返回false
    pub fn del_nickname(&mut self, del_name: &str, key: &str) -> bool {
        let mut del_index = self.names.len();
        // 搜索所有项进行匹配
        for (i, crype_text) in self.names.iter().enumerate() {
            // 因为这个加密算法每次加密得到的密文都不一样，所以只能解密进行比对
            let decrypted = decrypt(
                &hex::decode(crype_text).unwrap(),
                key,
                self.default_fill_char,
            );
            if decrypted.is_err() {
                return false;
            }
            let name = format!("{}", String::from_utf8_lossy(&decrypted.unwrap()));
            if del_name == name {
                del_index = i;
                break;
            }
        }
        if del_index != self.names.len() {
            self.names.remove(del_index);
            return true;
        } else {
            return false;
        }
    }
    /// 更新nnickname：先校验密钥是否正确，解密是否成功，如果不成功则不修改对象
    pub fn update_nickname(&mut self, name: Option<&str>, user_key: &str) -> Result<(), CoreError> {
        // 先校验密钥是否正确，解密是否成功，如果不成功则不修改对象
        match self.decrypted_nickname(user_key) {
            Ok(_) => {
                // 如果解密成功，则修改对象
                if let Some(name) = name {
                    self.names.push(name.to_string());
                }
                Ok(())
            }
            Err(_) => Err(CoreError::SecretKeyWrong),
        }
    }
}

impl Nickname {
    pub fn decrypted_nicknames_to_string(
        &self,
        user_key: &str,
    ) -> Result<String, chacha20poly1305::Error> {
        let mut res = String::from("nicknames:[\n");
        let mut iter = self.names.iter();
        while let Some(s) = iter.next() {
            let decrypted = decrypt(
                &hex::decode(s.as_bytes()).unwrap(),
                user_key,
                self.default_fill_char,
            );
            res.push_str(&format!("\t{},\n", String::from_utf8_lossy(&decrypted?))[0..]);
        }
        res.push_str("]");
        Ok(res)
    }
}

#[cfg(test)]
mod tests {

    use crate::core::{config::AppConfig, nickname::Nickname};

    // 测试nickname的加密功能
    #[test]
    fn test_nickname_new_and_encrypt() {
        // 创建nickname
        let mut nick = Nickname::new(AppConfig::default().fill_char);
        const NICK_STRING: &str = "我最爱的猫猫";
        const TEMP_USER_KEY: &str = "123456";
        nick.add_nickname(NICK_STRING, TEMP_USER_KEY);
        dbg!(&nick);
        // 断言：解密之后看是否相等
        assert_eq!(
            NICK_STRING,
            nick.decrypted_nickname(TEMP_USER_KEY)
                .unwrap()
                .get(0)
                .unwrap()
        );
    }

    // 测试通过nickname生成密码
    #[test]
    fn test_nickname_generate_passwd() {
        let mut v = "我 爱 大猫 乖猫"
            .to_string()
            .split(" ")
            .into_iter()
            .map(|s| s.to_string())
            .collect();

        dbg!(Nickname::generate_passwd_nickname(&mut v, "259", true));
        v = "我 爱 大猫 乖猫"
            .to_string()
            .split(" ")
            .into_iter()
            .map(|s| s.to_string())
            .collect();
        assert_eq!(
            Nickname::generate_passwd_nickname(&mut v, "657", false),
            "我 爱 大猫 乖猫 657"
        )
    }
    // 测试nickname的to_string方法
    #[test]
    fn test_decrypted_nicknames_to_string() {
        // 创建nickname
        let mut nick = Nickname::new(AppConfig::default().fill_char);
        const NICK_STRING1: &str = "我最爱的猫猫";
        const NICK_STRING2: &str = "我家的猫猫叫大猫";
        const TEMP_USER_KEY: &str = "123456";
        let result: &str = &format!(
            "\
nicknames:[
\t{NICK_STRING1},
\t{NICK_STRING2},
]\
"
        )[0..];
        nick.add_nickname(NICK_STRING1, TEMP_USER_KEY);
        nick.add_nickname(NICK_STRING2, TEMP_USER_KEY);
        dbg!(&nick);
        // 断言：解密之后格式是否像这样
        assert_eq!(
            result,
            nick.decrypted_nicknames_to_string(TEMP_USER_KEY).unwrap()
        );
    }
}
