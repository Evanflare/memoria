"use client";

import * as React from "react";
import { useRef } from "react";
import { cn } from "./utils";

const SCROLLBAR_WIDTH = 3; // px
const HIDE_DELAY_MS = 1000;

const ScrollArea = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const [thumbHeight, setThumbHeight] = React.useState(0);
  const [thumbTop, setThumbTop] = React.useState(0);
  const [isScrolling, setIsScrolling] = React.useState(false);
  const hideTimeoutRef = useRef<any>(null);

  // 更新滑块尺寸和位置
  const updateThumb = React.useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const { clientHeight, scrollHeight, scrollTop } = viewport;
    if (scrollHeight <= clientHeight) {
      setThumbHeight(0);
      return;
    }

    const thumbHeightValue = Math.max(
      (clientHeight / scrollHeight) * clientHeight,
      20
    );
    setThumbHeight(thumbHeightValue);
    const maxScrollTop = scrollHeight - clientHeight;
    const maxThumbTop = clientHeight - thumbHeightValue;
    const newThumbTop = (scrollTop / maxScrollTop) * maxThumbTop;
    setThumbTop(newThumbTop);
  }, []);

  // 滚动时显示滚动条，并延迟隐藏
  const handleScroll = React.useCallback(() => {
    setIsScrolling(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, HIDE_DELAY_MS);
    updateThumb();
  }, [updateThumb]);

  // 监听滚动和尺寸变化
  React.useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    updateThumb();
    viewport.addEventListener("scroll", handleScroll);
    const resizeObserver = new ResizeObserver(updateThumb);
    resizeObserver.observe(viewport);

    return () => {
      viewport.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [handleScroll, updateThumb]);

  // 内容变化时重新计算滑块
  React.useEffect(() => {
    updateThumb();
  }, [children, updateThumb]);

  return (
    <div
      ref={ref}
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      {/* 滚动内容区：隐藏原生滚动条，并通过 padding-right 为自定义滚动条留出空间 */}
      <div
        ref={viewportRef}
        className="h-full w-full overflow-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        style={{
          //paddingRight: `${SCROLLBAR_WIDTH + 4}px`,
          //paddingLeft: `${SCROLLBAR_WIDTH + 4}px`
        }} // 额外 4px 间距避免滚动条紧贴内容
      >
        {children}
      </div>

      {/* 自定义滚动条轨道（不滚动时淡出） */}
      <div
        className="absolute right-2 top-0 bottom-0 rounded-full transition-opacity duration-300"
        style={{
          width: SCROLLBAR_WIDTH,
          backgroundColor: "rgba(0,0,0,0.1)",
          opacity: isScrolling ? 0.8 : 0,
          pointerEvents: "none", // 让滚动条不干扰点击
        }}
      >
        {/* 滑块 */}
        {thumbHeight > 0 && (
          <div
            className="w-full rounded-full bg-gray-500 dark:bg-gray-400 transition-all duration-75"
            style={{
              height: thumbHeight,
              transform: `translateY(${thumbTop}px)`,
            }}
          />
        )}
      </div>
    </div>
  );
});
ScrollArea.displayName = "ScrollArea";

export { ScrollArea };