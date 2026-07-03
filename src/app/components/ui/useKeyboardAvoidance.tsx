import { useCallback, useEffect, useState } from "react";

const KEYBOARD_OFFSET_PX = 120;
const KEYBOARD_TRIGGER_PX = 120;

export function useKeyboardAvoidance<T extends HTMLElement>(initialFocusRef: React.RefObject<T | null>) {
    const [dialogOffset, setDialogOffset] = useState(0);

    const ensureInputVisible = useCallback(() => {
        const viewport = window.visualViewport;
        const viewportHeight = viewport?.height ?? window.innerHeight;
        const viewportOffsetTop = viewport?.offsetTop ?? 0;
        const keyboardHeight = window.innerHeight - viewportHeight - viewportOffsetTop;

        setDialogOffset(keyboardHeight > KEYBOARD_TRIGGER_PX ? KEYBOARD_OFFSET_PX : 0);
    }, []);

    useEffect(() => {
        const initial = initialFocusRef.current;
        if (initial) {
            initial.focus();
        }

        const updateKeyboardState = () => {
            ensureInputVisible();
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
