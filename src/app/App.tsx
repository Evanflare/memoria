import {
  useState,
  useEffect,
  useRef,
  cloneElement,
} from "react";
import {
  KeyRound,
  UserRound,
  Settings,
  ShieldCheck,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";

type Page = "passwd-list" | "nickname-manager" | "config";
type Theme = "light" | "dark" | "system";

const NAV_ITEMS: {
  id: Page;
  label: string;
  icon: React.ReactNode;
}[] = [
    { id: "passwd-list", label: "密码记忆", icon: <KeyRound size={18} /> },
    { id: "nickname-manager", label: "记忆点集", icon: <UserRound size={18} /> },
    { id: "config", label: "配置信息", icon: <Settings size={18} /> },
  ];

// 主题配置
const THEME_CONFIG: Record<Theme, { label: string; icon: React.ReactNode; next: Theme }> = {
  light: { label: "明亮", icon: <Sun size={16} />, next: "dark" },
  dark: { label: "黑暗", icon: <Moon size={16} />, next: "system" },
  system: { label: "系统", icon: <Monitor size={16} />, next: "light" },
};

// 应用主题到 DOM
function applyTheme(theme: Theme) {
  localStorage.setItem("theme", theme);
  const root = document.documentElement;

  if (theme === "dark") {
    root.classList.add("dark");
  } else if (theme === "light") {
    root.classList.remove("dark");
  } else {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
  }
}

// 读取初始主题（与 index.html 中脚本保持一致）
function getInitialTheme(): Theme {
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

import PasswordListPage from "./components/pages/passwd_list_page";
import ConfigPage from "./components/pages/config_page";
import NicknameManagerPage from "./components/pages/nickname_page";
import { Toaster } from "sonner";

function ActivePage({ page, isAndroid }: { page: Page; isAndroid: boolean }) {
  if (page === "passwd-list") return <PasswordListPage isAndroid={isAndroid} />;
  if (page === "nickname-manager") return <NicknameManagerPage isAndroid={isAndroid} />;
  return <ConfigPage />;
}

export default function App() {
  const [activePage, setActivePage] = useState<Page>("passwd-list");
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const v = localStorage.getItem("kv_sidebar_width");
      return v ? Number(v) : 360;
    } catch {
      return 360;
    }
  });
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const draggingRef = useRef(false);
  const asideRef = useRef<HTMLDivElement | null>(null);

  const isAndroid = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);

  // 监听系统主题变化
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        document.documentElement.classList.toggle("dark", mediaQuery.matches);
      }
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  // 持久化侧边栏宽度
  useEffect(() => {
    try {
      localStorage.setItem("kv_sidebar_width", String(sidebarWidth));
    } catch { }
  }, [sidebarWidth]);

  // 切换主题（三段式循环）
  const cycleTheme = () => {
    const nextTheme = THEME_CONFIG[theme].next;
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  // 当前主题的配置
  const currentThemeConfig = THEME_CONFIG[theme];

  return (
    <>
      <Toaster richColors />
      <div className="size-full flex flex-col justify-between min-h-screen bg-background text-foreground">
        {/* Header（Android） */}
        {isAndroid && (
          <header className="w-full border-b border-sidebar-border bg-sidebar flex-one px-4 pt-8 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
                <ShieldCheck size={20} className="text-primary-foreground" />
              </div>
              <div>
                <div className="text-xs text-sidebar-foreground/50 leading-none mb-0.5">密码</div>
                <div className="font-semibold text-sidebar-foreground leading-none">记忆管理</div>
              </div>
            </div>

            {/* 主题切换按钮 */}
            <button
              onClick={cycleTheme}
              className="flex items-center gap-2 px-3 py-1 rounded-md border border-sidebar-border bg-sidebar-accent/50"
              title={`当前: ${currentThemeConfig.label}，点击切换`}
            >
              <span className="text-sm">{currentThemeConfig.label}</span>
              <span className="w-7 h-7 rounded flex items-center justify-center">
                {currentThemeConfig.icon}
              </span>
            </button>
          </header>
        )}

        <div className="flex-1 flex overflow-y-auto">
          {/* Sidebar（桌面端） */}
          {!isAndroid && (
            <aside
              ref={asideRef}
              className="relative shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border h-full"
              style={{
                width: collapsed ? 56 : sidebarWidth,
                minWidth: collapsed ? 56 : 160,
                maxWidth: 800,
              }}
            >
              {/* Logo */}
              <button
                title={collapsed ? "展开侧栏" : "折叠侧栏"}
                onClick={() => setCollapsed(!collapsed)}
                className={`flex items-center gap-3 ${collapsed ? "px-2" : "px-3"} py-6 border-b border-sidebar-border text-left`}
              >
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
                  <ShieldCheck size={20} className="text-primary-foreground" />
                </div>
                {!collapsed && (
                  <div>
                    <div className="text-xs text-sidebar-foreground/50 leading-none mb-0.5">密码</div>
                    <div className="font-semibold text-sidebar-foreground leading-none">记忆点管理</div>
                  </div>
                )}
              </button>

              {/* 导航 */}
              <nav className="flex-1 px-1 py-4 flex flex-col gap-1">
                {NAV_ITEMS.map((item) => {
                  const active = activePage === item.id;
                  const iconElement =
                    (item.icon as any).type
                      ? cloneElement(item.icon as any, { size: collapsed ? 20 : 18 })
                      : item.icon;

                  return (
                    <button
                      key={item.id}
                      onClick={() => setActivePage(item.id)}
                      title={collapsed ? item.label : undefined}
                      className={
                        collapsed
                          ? `flex items-center justify-center w-full px-0 py-2 rounded-lg text-sm transition-colors ${active
                            ? "bg-sidebar-primary text-sidebar-primary-foreground"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          }`
                          : `flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${active
                            ? "bg-sidebar-primary text-sidebar-primary-foreground"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          }`
                      }
                    >
                      <span
                        className={
                          active
                            ? "text-sidebar-primary-foreground"
                            : "text-sidebar-foreground/50"
                        }
                      >
                        {iconElement}
                      </span>
                      {!collapsed && <span>{item.label}</span>}
                    </button>
                  );
                })}
              </nav>

              {/* 拖拽手柄 */}
              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  draggingRef.current = true;
                  document.body.style.cursor = "col-resize";
                  const onMove = (ev: MouseEvent) => {
                    const rect = asideRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    const newWidth = Math.max(160, Math.min(800, ev.clientX - rect.left));
                    setSidebarWidth(newWidth);
                    setCollapsed(false);
                  };
                  const onUp = () => {
                    draggingRef.current = false;
                    document.body.style.cursor = "";
                    document.removeEventListener("mousemove", onMove);
                    document.removeEventListener("mouseup", onUp);
                  };
                  document.addEventListener("mousemove", onMove);
                  document.addEventListener("mouseup", onUp);
                }}
                className="absolute top-0 right-0 h-full w-2 cursor-col-resize hover:bg-sidebar-accent/40"
                style={{ touchAction: "none" }}
              />

              {/* 主题切换（桌面端侧栏底部） */}
              <div className="px-4 py-5 border-t border-sidebar-border">
                {!collapsed ? (
                  <button
                    onClick={cycleTheme}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-sidebar-border bg-sidebar-accent/50 hover:bg-sidebar-accent transition-colors group"
                  >
                    <span className="text-sm text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground transition-colors">
                      {currentThemeConfig.label}
                    </span>
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-sidebar text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground transition-colors shadow-sm">
                      {currentThemeConfig.icon}
                    </span>
                  </button>
                ) : (
                  <div className="flex items-center justify-center">
                    <button
                      onClick={cycleTheme}
                      title={currentThemeConfig.label}
                      className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-sidebar-accent transition-colors"
                    >
                      {currentThemeConfig.icon}
                    </button>
                  </div>
                )}
              </div>
            </aside>
          )}

          {/* 主内容区 */}
          <main className="flex-1 overflow-auto bg-background">
            <ActivePage isAndroid={isAndroid} key={activePage} page={activePage} />
          </main>
        </div>

        {/* Footer（Android 底部导航） */}
        {isAndroid && (
          <footer className="w-full border-t border-sidebar-border bg-sidebar px-2 py-2 flex-one bottom-0 left-0 right-0">
            <nav className="max-w-xl mx-auto flex items-center justify-between">
              {NAV_ITEMS.map((item) => {
                const active = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActivePage(item.id)}
                    className={`flex-1 flex flex-col items-center gap-1 px-3 py-2 rounded-md text-sm transition-colors ${active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }`}
                  >
                    <span className={active ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/50"}>
                      {item.icon}
                    </span>
                    <span className="text-xs leading-none">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </footer>
        )}
      </div>
    </>
  );
}