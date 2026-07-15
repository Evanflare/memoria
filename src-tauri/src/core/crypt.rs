//! 提供加密，解密功能
//!

use chacha20poly1305::{
    aead::{Aead, KeyInit, OsRng}, // 正确 OsRng
    AeadCore,
    ChaCha20Poly1305,
};

/// 把用户短密码 扩展到 32 字节（根据自定义）
fn expand_user_key(user_key: &str, default_fill_char: char) -> [u8; 32] {
    // 先将用户输入拓展到足够长
    let mut long_enough_key = String::from(user_key);
    if long_enough_key.len() < 32 {
        for _ in long_enough_key.len()..32 {
            long_enough_key.push(default_fill_char);
        }
    }
    let mut key = [0u8; 32];
    let bytes = long_enough_key.as_bytes();

    // 复制用户输入
    let len = bytes.len().min(32);
    key[..len].copy_from_slice(&bytes[..len]);

    key
}

/// 加密
pub fn encrypt(plaintext: &[u8], user_key: &str, default_fill_char: char) -> Vec<u8> {
    let key = expand_user_key(user_key, default_fill_char);
    let cipher = ChaCha20Poly1305::new(&key.into());

    // 正确生成 nonce
    let nonce = ChaCha20Poly1305::generate_nonce(&mut OsRng);

    // 加密
    let mut ciphertext = cipher.encrypt(&nonce, plaintext).unwrap();

    // 拼接 nonce + 密文
    let mut result = Vec::from(nonce.as_slice());
    result.append(&mut ciphertext);

    result
}
/// 加密
pub fn encrypt_string(content: &str, secret_key: &str, fill_char: char) -> String {
    let e = encrypt(&content.as_bytes(), secret_key, fill_char);
    format!("{}", hex::encode(&e))
}

/// 解密
pub fn decrypt(
    ciphertext: &[u8],
    user_key: &str,
    default_fill_char: char,
) -> Result<Vec<u8>, chacha20poly1305::Error> {
    let key = expand_user_key(user_key, default_fill_char);
    let cipher = ChaCha20Poly1305::new(&key.into());
    if ciphertext.len() < 12 {
        return Err(chacha20poly1305::Error);
    }
    // 前 12 字节是 nonce
    let (nonce, ciphertext) = ciphertext.split_at(12);

    // 解密
    cipher.decrypt(nonce.into(), ciphertext)
}

/// 解密
pub fn decypt_string(
    ciphertext: &str,
    secret_key: &str,
    fill_char: char,
) -> Result<String, chacha20poly1305::Error> {
    let decrypted = decrypt(&hex::decode(ciphertext).unwrap(), secret_key, fill_char);
    Ok(format!("{}", String::from_utf8_lossy(&decrypted?)))
}

#[cfg(test)]
mod tests {

    use log::debug;

    use crate::core::config::AppConfig;
    use crate::core::crypt::*;
    // 测试加密之后再解密，比对解密与原文。
    #[test]
    fn test_crypt_passwd() {
        let cfg = AppConfig::default();
        let data = b"hello world";
        let password = "mypass"; // 你的短密钥
                                 // 加密
        let encrypted = encrypt(data, password, cfg.fill_char);
        debug!("密文: {}", hex::encode(&encrypted));
        // 解密
        let decrypted = decrypt(&encrypted, password, cfg.fill_char);
        debug!(
            "解密: {}",
            String::from_utf8_lossy(&decrypted.clone().unwrap())
        );
        // 断言：解密后与加密前内容相同
        assert_eq!(&decrypted.unwrap(), &data);
        // 断言：手动输入填充密钥进行解密，能得到相同内容
        assert_eq!(
            &decrypt(
                &encrypted,
                &format!("{}{1}{1}{1}", &password, &cfg.fill_char),
                cfg.fill_char
            )
            .unwrap(),
            &data
        )
    }
}
