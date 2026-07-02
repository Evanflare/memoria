import { useCallback, useEffect, useRef, useState } from "react";

export function useKeyboardAvoidance<T extends HTMLElement>(initialFocusRef: React.RefObject<T | null>) {
    const [dialogOffset, setDialogOffset] = useState(0);
    const viewportHeightRef = useRef<number>(window.visualViewport?.height ?? window.innerHeight);

    const ensureInputVisible = useCallback(() => {
        // 只做上浮，禁止滚动页面。
        // 保持在输入聚焦时仅使用 dialogOffset 进行位移，不执行 scrollIntoView。
    }, [initialFocusRef]);
    console.log("避免声明后未使用的变量警告，viewportHeightRef :", viewportHeightRef);
    useEffect(() => {
        const initial = initialFocusRef.current;
        if (initial) {
            initial.focus();
        }

        const updateKeyboardState = () => {
            const viewport = window.visualViewport;
            const currentHeight = viewport?.height ?? window.innerHeight;
            const offsetTop = viewport?.offsetTop ?? 0;
            const keyboardHeight = window.innerHeight - currentHeight - offsetTop;
            const visible = keyboardHeight > 120;
            setDialogOffset(visible ? Math.min(80, Math.max(20, Math.round(keyboardHeight / 2))) : 0);
            if (document.activeElement instanceof HTMLElement) {
                ensureInputVisible();
            }
        };

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                const active = document.activeElement as HTMLElement | null;
                active?.blur();
            }
        };

        window.addEventListener("keydown", onKey);
        window.addEventListener("resize", updateKeyboardState);
        window.visualViewport?.addEventListener("resize", updateKeyboardState);

        return () => {
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("resize", updateKeyboardState);
            window.visualViewport?.removeEventListener("resize", updateKeyboardState);
            setDialogOffset(0);
        };
    }, [ensureInputVisible, initialFocusRef]);

    return {
        dialogOffset,
        ensureInputVisible,
    };
}
