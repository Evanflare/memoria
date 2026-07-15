use log::LevelFilter;

/// 初始化日志系统，自动识别平台和编译模式
pub fn init(app_name: &str) {
    let max_level = get_log_level();

    #[cfg(target_os = "android")]
    {
        android_logger::init_once(
            android_logger::Config::default()
                .with_max_level(max_level)
                .with_tag(app_name)
                .format(|buf, record| {
                    // Android 上使用简洁格式
                    std::fmt::write(buf, format_args!("[{}] {}", record.level(), record.args()))
                }),
        );
    }

    #[cfg(not(target_os = "android"))]
    {
        let mut builder = env_logger::Builder::new();
        builder.filter_level(max_level);

        // 如果希望自定义格式（可选）
        builder.format(|buf, record| {
            use std::io::Write;
            writeln!(
                buf,
                "{} [{}] [{}] {}",
                chrono::Local::now().format("%Y-%m-%d %H:%M:%S"),
                record.level(),
                record.target(),
                record.args()
            )
        });

        // // 如果需要同时写入文件（Release 版本推荐）
        // #[cfg(not(debug_assertions))]
        // {
        //     if let Ok(log_dir) = dirs_next::data_dir() {
        //         let log_path = log_dir.join("my_app").join("logs");
        //         std::fs::create_dir_all(&log_path).ok();
        //         if let Ok(file) = std::fs::OpenOptions::new()
        //             .create(true)
        //             .append(true)
        //             .open(log_path.join("app.log"))
        //         {
        //             builder.target(env_logger::Target::Pipe(Box::new(file)));
        //         }
        //     }
        // }

        builder.init();
    }

    // 输出初始化信息（仅 debug 模式）
    #[cfg(debug_assertions)]
    {
        log::info!(
            "日志系统已启动 - 平台: {}, 级别: {}",
            std::env::consts::OS,
            max_level
        );
    }
}

/// 根据编译模式和环境变量决定日志级别
fn get_log_level() -> LevelFilter {
    // 根据编译模式设置默认级别
    if cfg!(debug_assertions) {
        // 优先读取环境变量 RUST_LOG（方便临时调试）
        if let Ok(level) = std::env::var("RUST_LOG") {
            match level.to_lowercase().as_str() {
                "trace" => return LevelFilter::Trace,
                "debug" => return LevelFilter::Debug,
                "info" => return LevelFilter::Info,
                "warn" => return LevelFilter::Warn,
                "error" => return LevelFilter::Error,
                _ => {}
            }
        }
        LevelFilter::Debug // 开发时输出所有 Debug 及以上的日志
    } else {
        LevelFilter::Warn // 发布后只输出 Warn 和 Error，防止信息泄露
    }
}
