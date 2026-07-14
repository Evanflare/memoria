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
} from "lucide-react";

type Page = "passwd-list" | "nickname-manager" | "config";

const NAV_ITEMS: {
  id: Page;
  label: string;
  icon: React.ReactNode;
}[] = [
    {
      id: "passwd-list",
      label: "密码记忆",
      icon: <KeyRound size={18} />,
    },
    {
      id: "nickname-manager",
      label: "记忆点集",
      icon: <UserRound size={18} />,
    },
    {
      id: "config",
      label: "配置信息",
      icon: <Settings size={18} />,
    },
  ];


import PasswordListPage from "./components/pages/passwd_list_page";
import ConfigPage from "./components/pages/config_page";
import NicknameManagerPage from "./components/pages/nickname_page";
import { getConfig, update_dark_mode } from "./tauri_core/command_frontend";
import { Toaster } from "sonner";
function ActivePage({ page, isAndroid }: { page: Page, isAndroid: boolean }) {
  if (page === "passwd-list") return <PasswordListPage isAndroid={isAndroid} />;
  if (page === "nickname-manager")
    return <NicknameManagerPage isAndroid={isAndroid} />;
  return <ConfigPage />;
}

export default function App() {
  console.log("App.tsx 被加载了");
  const [activePage, setActivePage] =
    useState<Page>("passwd-list");
  const [dark, setDark] = useState(true);
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

  // 简单的 Android 检测（运行时）——用于在 Android 上调整布局
  let isAndroid = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    try {
      localStorage.setItem("kv_sidebar_width", String(sidebarWidth));
    } catch { }
  }, [sidebarWidth]);

  // 当组件挂载时，获取配置并设置 dark 状态
  useEffect(() => {
    async function fetchConfig() {
      try {
        // 调用 getConfig 函数获取配置
        console.log("Fetching config...");
        const config = await getConfig();
        setDark(config.dark_mode);
        console.log("Got config dark_mode:", config.dark_mode);
      } catch (error) {
        console.error("Failed to fetch config:", error);
      }
    }

    fetchConfig();
  }, []);

  // 监听 dark 状态变化，并更新配置
  useEffect(() => {
    async function updateDarkModeConfig() {
      try {
        console.log("Updating dark mode config to:", dark);
        if (typeof dark !== "boolean") {
          console.error("Invalid dark mode value:", dark);
          return;
        }
        await update_dark_mode(dark);
      } catch (error) {
        console.error("Failed to update dark mode config:", error);
      }
    }

    updateDarkModeConfig();
  }, [dark]);

  return (
    <>
      <Toaster richColors />
      <div className="size-full flex flex-col justify-between min-h-screen bg-background text-foreground ">
        {/* Header (Android 时显示暗黑切换和 Log) */}
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

            <div className="flex items-center gap-3">
              <button
                onClick={() => setDark(!dark)}
                className="flex items-center gap-2 px-3 py-1 rounded-md border border-sidebar-border bg-sidebar-accent/50"
              >
                <span>{dark ? "Dark" : "Light"}</span>
                <span className="w-7 h-7 rounded flex items-center justify-center">
                  {dark ? <Moon size={16} /> : <Sun size={16} />}
                </span>
              </button>
            </div>
          </header>
        )}

        <div className="flex-1 flex overflow-y-auto">
          {/* Sidebar (非 Android 显示) */}
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
              {/* Logo + App name (click logo to toggle collapse) */}
              <button
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                onClick={() => setCollapsed(!collapsed)}
                className={`flex items-center gap-3 ${collapsed ? 'px-2' : 'px-3'} py-6 border-b border-sidebar-border text-left`}
              >
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
                  <ShieldCheck
                    size={20}
                    className="text-primary-foreground"
                  />
                </div>
                {!collapsed &&
                  (<div className={`overflow-hidden transition-all ${collapsed ? 'w-0 opacity-0' : ''}`}>
                    <div className="text-xs text-sidebar-foreground/50 leading-none mb-0.5">
                      密码
                    </div>
                    <div className="font-semibold text-sidebar-foreground leading-none">
                      记忆点管理
                    </div>
                  </div>)
                }

              </button>

              {/* Navigation */}
              <nav className="flex-1 px-1 py-4 flex flex-col gap-1">
                {NAV_ITEMS.map((item) => {
                  const active = activePage === item.id;
                  const iconElement = (item.icon && (item.icon as any).type)
                    ? cloneElement(item.icon as any, { size: collapsed ? 20 : 18 })
                    : item.icon;
                  const btnClass = collapsed
                    ? `flex items-center justify-center w-full px-0 py-2 rounded-lg text-sm transition-colors ${active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`
                    : `flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`;

                  return (
                    <button
                      key={item.id}
                      onClick={() => setActivePage(item.id)}
                      title={collapsed ? item.label : undefined}
                      className={btnClass}
                    >
                      <span className={active ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/50"}>
                        {iconElement}
                      </span>
                      {!collapsed && (
                        <span className={`transition-all duration-150`}>{item.label}</span>
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* drag handle */}
              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  draggingRef.current = true;
                  document.body.style.cursor = 'col-resize';
                  const onMove = (ev: MouseEvent) => {
                    const rect = asideRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    const newWidth = Math.max(160, Math.min(800, ev.clientX - rect.left));
                    setSidebarWidth(newWidth);
                    setCollapsed(false);
                  };
                  const onUp = () => {
                    draggingRef.current = false;
                    document.body.style.cursor = '';
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                  };
                  document.addEventListener('mousemove', onMove);
                  document.addEventListener('mouseup', onUp);
                }}
                className="absolute top-0 right-0 h-full w-2 cursor-col-resize hover:bg-sidebar-accent/40"
                style={{ touchAction: 'none' }}
              />

              {/* Theme toggle (仅在非 Android 的侧栏中显示) */}
              <div className="px-4 py-5 border-t border-sidebar-border">
                {!collapsed ? (
                  <button
                    onClick={() => setDark(!dark)}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-sidebar-border bg-sidebar-accent/50 hover:bg-sidebar-accent transition-colors group"
                  >
                    <span className="text-sm text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground transition-colors">
                      {dark ? "黑夜模式" : "明亮模式"}
                    </span>
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-sidebar text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground transition-colors shadow-sm">
                      {dark ? <Moon size={16} /> : <Sun size={16} />}
                    </span>
                  </button>
                ) : (
                  <div className="flex items-center justify-center">
                    <button
                      onClick={() => setDark(!dark)}
                      title={dark ? "Dark Mode" : "Light Mode"}
                      className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-sidebar-accent transition-colors"
                    >
                      {dark ? <Moon size={16} /> : <Sun size={16} />}
                    </button>
                  </div>
                )}
              </div>
            </aside>
          )}

          {/* Main content — key forces remount on page change, resetting all local state */}
          <main className={`flex-1 overflow-auto bg-background `}>
            <ActivePage isAndroid={isAndroid} key={activePage} page={activePage} />
          </main>
        </div>

        {/* Footer (Android 时将导航放在底部) */}
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
    // {/* MARKER-MAKE-KIT-INVOKED */}


  );
}