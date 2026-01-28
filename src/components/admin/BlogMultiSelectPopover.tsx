import { useMemo, useState } from "react";
import { ChevronDown, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type BlogMultiSelectItem = {
  id: string;
  title: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blogs: BlogMultiSelectItem[];
  selectedBlogIds: string[];
  onToggleBlog: (blogId: string) => void;
  onClear: () => void;
  triggerClassName?: string;
  contentClassName?: string;
};

export function BlogMultiSelectPopover({
  open,
  onOpenChange,
  blogs,
  selectedBlogIds,
  onToggleBlog,
  onClear,
  triggerClassName,
  contentClassName,
}: Props) {
  const [query, setQuery] = useState("");
  const selectedSet = useMemo(() => new Set(selectedBlogIds), [selectedBlogIds]);

  const filteredBlogs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return blogs;
    return blogs.filter((b) => b.title.toLowerCase().includes(q));
  }, [blogs, query]);

  return (
    <Popover open={open} onOpenChange={onOpenChange} modal={false}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={triggerClassName}
          aria-expanded={open}
          data-blog-filter-trigger
        >
          <span className="truncate">
            {selectedBlogIds.length === 0
              ? "All Blogs"
              : `${selectedBlogIds.length} blog${selectedBlogIds.length === 1 ? "" : "s"} selected`}
          </span>
          <ChevronDown className={`h-4 w-4 opacity-60 transition-transform ${open ? "rotate-180" : ""}`} />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className={contentClassName}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          // Clicking the trigger should toggle, not be treated as "outside".
          const target = e.target as HTMLElement;
          if (target.closest("[data-blog-filter-trigger]")) e.preventDefault();
        }}
      >
        <div className="p-2 border-b border-border">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search blogs..."
            className="h-8"
          />
        </div>

        <div className="max-h-[300px] overflow-y-auto p-1">
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              onClear();
              onOpenChange(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClear();
                onOpenChange(false);
              }
            }}
            className="flex items-center justify-between px-2 py-1.5 rounded-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
          >
            <span>All Blogs</span>
            {selectedBlogIds.length === 0 ? <Check className="h-4 w-4" /> : null}
          </div>

          {filteredBlogs.map((blog) => {
            const checked = selectedSet.has(blog.id);
            return (
              <div
                key={blog.id}
                role="button"
                tabIndex={0}
                onClick={() => onToggleBlog(blog.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onToggleBlog(blog.id);
                  }
                }}
                className="flex items-center justify-between px-2 py-1.5 rounded-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
              >
                <span className="truncate pr-2">{blog.title}</span>
                <Checkbox checked={checked} className="pointer-events-none" />
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
