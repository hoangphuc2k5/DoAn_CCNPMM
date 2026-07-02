import { useState, useRef, useEffect, useId, useCallback } from "react";
import { createPortal } from "react-dom";
import { Avatar, Spin } from "antd";
import { searchApi } from "../../util/api";
import { getMediaUrl } from "../../util/media";

/* ─── helpers ────────────────────────────────────────────────────────────── */

const esc = (t = "") =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Convert raw text (@[Name](prefix) syntax) → innerHTML with blue chip spans */
const rawToHtml = (text = "") => {
  const re = /@\[([^\]]+)\]\(([^)]+)\)/g;
  let html = "";
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    html += esc(text.slice(last, m.index)).replace(/\n/g, "<br>");
    // chip: contenteditable=false so user cannot type inside it
    html += `<span class="mi-chip" data-raw="${esc(m[0])}" contenteditable="false">${esc(m[1])}</span>`;
    last = re.lastIndex;
  }
  html += esc(text.slice(last)).replace(/\n/g, "<br>");
  return html;
};

/** Convert innerHTML (chips + plain text) → raw text with @[Name](prefix) */
const htmlToRaw = (el) => {
  const walk = (node) => {
    let t = "";
    for (const c of node.childNodes) {
      if (c.nodeType === Node.TEXT_NODE) {
        t += c.textContent;
      } else if (c.nodeType === Node.ELEMENT_NODE) {
        if (c.dataset.raw) {
          t += c.dataset.raw; // restore the mention raw syntax
        } else if (c.tagName === "BR") {
          t += "\n";
        } else if (c.tagName === "DIV") {
          t += "\n" + walk(c);
        } else {
          t += walk(c);
        }
      }
    }
    return t;
  };
  return walk(el);
};

/** Get cursor position expressed as an index in the raw text */
const getCursorRawIndex = (el) => {
  const sel = window.getSelection();
  if (!sel?.rangeCount) return 0;
  const range = sel.getRangeAt(0);
  let idx = 0;
  let found = false;

  const walk = (node) => {
    if (found) return;
    if (node === range.startContainer) {
      idx += range.startOffset;
      found = true;
      return;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      idx += node.length;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.dataset.raw) {
        idx += node.dataset.raw.length;
      } else if (node.tagName === "BR") {
        idx += 1;
      } else if (node.tagName === "DIV") {
        idx += 1;
        for (const c of node.childNodes) walk(c);
      } else {
        for (const c of node.childNodes) walk(c);
      }
    }
  };
  walk(el);
  return idx;
};

/** Move cursor to a given raw-text index after rebuilding innerHTML */
const setCursorAtRawIndex = (el, target) => {
  const sel = window.getSelection();
  let remaining = target;
  let done = false;

  const walk = (node) => {
    if (done) return;
    if (node.nodeType === Node.TEXT_NODE) {
      if (remaining <= node.length) {
        const r = document.createRange();
        r.setStart(node, remaining);
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
        done = true;
        return;
      }
      remaining -= node.length;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.dataset.raw) {
        const len = node.dataset.raw.length;
        if (remaining <= len) {
          // place cursor right after the chip
          const r = document.createRange();
          r.setStartAfter(node);
          r.collapse(true);
          sel.removeAllRanges();
          sel.addRange(r);
          done = true;
          return;
        }
        remaining -= len;
      } else if (node.tagName === "BR") {
        remaining -= 1;
      } else if (node.tagName === "DIV") {
        remaining -= 1;
        for (const c of node.childNodes) walk(c);
      } else {
        for (const c of node.childNodes) walk(c);
      }
    }
  };
  walk(el);
};

/* ─── component ──────────────────────────────────────────────────────────── */

const MentionInput = ({
  type = "input", // "input" | "textarea"
  value = "",
  onChange,
  onPressEnter,
  onFocus,
  onBlur,
  inputRef,        // callback ref: (domEl) => void — lets parent focus the field
  placeholder = "",
  className = "",
  style = {},
  rows = 4,
}) => {
  const elRef = useRef(null);
  const dropdownRef = useRef(null);
  const isProg = useRef(false);      // true while we are setting innerHTML programmatically
  const lastRaw = useRef(value);     // track last raw value to avoid unnecessary DOM updates
  const dropdownId = useId().replace(/:/g, "");

  const [dropOpen, setDropOpen] = useState(false);
  const [queryText, setQueryText] = useState("");
  const [atIdx, setAtIdx] = useState(-1);  // raw-text index where @ was typed
  const [users, setUsers] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState(null);

  const updateDropdownPosition = useCallback(() => {
    if (!elRef.current) return;
    const rect = elRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const showAbove = spaceBelow < 210;

    setDropdownStyle({
      position: "fixed",
      left: rect.left,
      width: Math.max(rect.width, 280),
      zIndex: 10050,
      ...(showAbove
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
  }, []);

  /* ── keep portal dropdown aligned while open ── */
  useEffect(() => {
    if (!dropOpen) {
      setDropdownStyle(null);
      return;
    }
    updateDropdownPosition();
    const onReposition = () => updateDropdownPosition();
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [dropOpen, updateDropdownPosition]);

  /* ── fetch suggestions ── */
  useEffect(() => {
    if (!dropOpen || !queryText) { setUsers([]); return; }
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await searchApi(queryText);
        if (res?.EC === 0) { setUsers(res.data?.users || []); setActiveIdx(0); }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [queryText, dropOpen]);

  /* ── sync DOM when value prop changes externally (e.g. cleared after submit) ── */
  useEffect(() => {
    if (!elRef.current) return;
    if (value === lastRaw.current) return; // already up-to-date
    isProg.current = true;
    elRef.current.innerHTML = rawToHtml(value);
    lastRaw.current = value;
    isProg.current = false;
  }, [value]);

  /* ── expose DOM element via inputRef callback ── */
  useEffect(() => {
    if (typeof inputRef === "function") inputRef(elRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── initialize ── */
  useEffect(() => {
    if (elRef.current && value) {
      elRef.current.innerHTML = rawToHtml(value);
      lastRaw.current = value;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── handle user typing ── */
  const handleInput = () => {
    if (!elRef.current || isProg.current) return;
    const raw = htmlToRaw(elRef.current);
    lastRaw.current = raw;
    onChange?.({ target: { value: raw } });

    // detect @ trigger
    const cur = getCursorRawIndex(elRef.current);
    const before = raw.slice(0, cur);
    const lastAt = before.lastIndexOf("@");
    if (lastAt !== -1) {
      const between = before.slice(lastAt + 1);
      if (
        !between.startsWith(" ") &&
        between.length <= 30 &&
        !/\n/.test(between) &&
        !/\s\s/.test(between)
      ) {
        setAtIdx(lastAt);
        setQueryText(between);
        setDropOpen(true);
        return;
      }
    }
    setDropOpen(false);
  };

  /* ── insert mention chip ── */
  const selectUser = (user) => {
    const prefix = user.email ? user.email.split("@")[0] : "user";
    const name = user.name || prefix;
    const chip = `@[${name}](${prefix})`;

    const raw = htmlToRaw(elRef.current);
    const cur = getCursorRawIndex(elRef.current);
    const newRaw = raw.slice(0, atIdx) + chip + " " + raw.slice(cur);

    isProg.current = true;
    elRef.current.innerHTML = rawToHtml(newRaw);
    lastRaw.current = newRaw;
    isProg.current = false;

    setCursorAtRawIndex(elRef.current, atIdx + chip.length + 1);
    onChange?.({ target: { value: newRaw } });
    setDropOpen(false);
    elRef.current.focus();
  };

  /* ── keyboard navigation ── */
  const handleKeyDown = (e) => {
    if (dropOpen && users.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => (i + 1) % users.length); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx(i => (i - 1 + users.length) % users.length); }
      else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); selectUser(users[activeIdx]); }
      else if (e.key === "Escape") { e.preventDefault(); setDropOpen(false); }
    } else if (e.key === "Enter") {
      if (type === "input") {
        e.preventDefault();
        const raw = htmlToRaw(elRef.current);
        lastRaw.current = raw;
        onChange?.({ target: { value: raw } });
        onPressEnter?.(raw);
      }
    }
  };

  /* ── close dropdown on outside click ── */
  useEffect(() => {
    const h = (e) => {
      if (
        dropdownRef.current?.contains(e.target) ||
        elRef.current?.contains(e.target)
      ) {
        return;
      }
      setDropOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  /* ── sizing ── */
  const minH = type === "textarea" ? `${rows * 1.5715 + 0.6}em` : "32px";
  const maxH = type === "textarea" ? `${(rows + 4) * 1.5715}em` : "32px";

  return (
    <div className="relative flex-1" style={{ width: "100%", minWidth: 0, ...style }}>

      {/* Global chip + placeholder styles */}
      <style>{`
        .mi-chip {
          display: inline;
          color: #1677ff;
          font-weight: 700;
          background: #dbeafe;
          border-radius: 4px;
          padding: 1px 4px;
          user-select: all;
          cursor: default;
        }
        .mi-edit:empty::before {
          content: attr(data-ph);
          color: #bfbfbf;
          pointer-events: none;
        }
        .mi-edit:focus {
          border-color: #4096ff;
          box-shadow: 0 0 0 2px rgba(5,145,255,.1);
          outline: none;
        }
      `}</style>

      {/* ── contenteditable field ── */}
      <div
        ref={elRef}
        contentEditable
        suppressContentEditableWarning
        data-ph={placeholder}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        className={`mi-edit ${className}`}
        style={{
          border: "1px solid #d9d9d9",
          borderRadius: "6px",
          padding: type === "textarea" ? "8px 11px" : "4px 11px",
          fontSize: "14px",
          lineHeight: "1.5715",
          color: "rgba(0,0,0,.88)",
          width: "100%",
          boxSizing: "border-box",
          cursor: "text",
          wordBreak: "break-word",
          overflowY: type === "textarea" ? "auto" : "hidden",
          overflowX: "hidden",
          minHeight: minH,
          maxHeight: maxH,
          whiteSpace: type === "input" ? "nowrap" : "pre-wrap",
          transition: "border-color .2s, box-shadow .2s",
          backgroundColor: "#fff",
        }}
      />

      {/* ── mention dropdown (portal avoids modal/scroll clipping) ── */}
      {dropOpen && dropdownStyle &&
        createPortal(
          <div
            ref={dropdownRef}
            id={`mi-dropdown-${dropdownId}`}
            className="max-h-[200px] overflow-y-auto bg-white border border-gray-100 rounded-xl py-1.5"
            style={{
              ...dropdownStyle,
              boxShadow: "0 10px 25px -5px rgba(0,0,0,.12), 0 8px 10px -6px rgba(0,0,0,.1)",
            }}
          >
            {loading && (
              <div className="px-4 py-2 text-xs text-gray-400 flex items-center gap-2">
                <Spin size="small" /> Đang tìm kiếm...
              </div>
            )}
            {!loading && !queryText && (
              <div className="px-4 py-2 text-xs text-gray-400 italic">
                Nhập tên hoặc email để tìm người dùng
              </div>
            )}
            {!loading && queryText && users.length === 0 && (
              <div className="px-4 py-2 text-xs text-gray-400 italic">
                Không tìm thấy người dùng phù hợp
              </div>
            )}
            {!loading && users.map((item, idx) => {
              const ep = item.email ? item.email.split("@")[0] : "user";
              const active = idx === activeIdx;
              return (
                <div
                  key={item._id || idx}
                  className={`px-4 py-2 flex items-center gap-3 cursor-pointer transition-colors duration-100 ${
                    active ? "bg-blue-50 text-blue-900 font-medium" : "hover:bg-gray-50 text-gray-700"
                  }`}
                  onMouseDown={(e) => e.preventDefault()} // prevent blur before click
                  onClick={() => selectUser(item)}
                  onMouseEnter={() => setActiveIdx(idx)}
                >
                  <Avatar
                    size={30}
                    src={getMediaUrl(item.avatar)}
                    style={{ backgroundColor: "#7F00FD", fontWeight: "bold", fontSize: "12px", flexShrink: 0 }}
                  >
                    {item.name?.[0]?.toUpperCase() || "U"}
                  </Avatar>
                  <div className="flex flex-col items-start overflow-hidden">
                    <span className="text-sm truncate font-semibold leading-tight">{item.name}</span>
                    <span className={`text-xs truncate leading-tight ${active ? "text-blue-500" : "text-gray-400"}`}>
                      @{ep}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
};

export default MentionInput;
