# PRD: Telegram Message Formatting Edge Cases

## Problem Statement

The Telegram Bot API has strict HTML parsing rules. When CustomGPT returns responses with markdown or HTML that doesn't conform to Telegram's supported tags, the `send_message` call fails with errors like:
- `Can't parse entities: unsupported start tag "br" at byte offset X`
- `Can't parse entities: unclosed tag`
- `Can't parse entities: unmatched end tag`

## Telegram Supported HTML Tags (Exhaustive List)

| Tag | Purpose | Notes |
|-----|---------|-------|
| `<b>`, `<strong>` | Bold | Can nest |
| `<i>`, `<em>` | Italic | Can nest |
| `<u>`, `<ins>` | Underline | Can nest |
| `<s>`, `<strike>`, `<del>` | Strikethrough | Can nest |
| `<code>` | Inline code | Cannot contain other tags |
| `<pre>` | Code block | Can only contain `<code>` |
| `<a href="...">` | Links | Must have valid href |
| `<tg-spoiler>` | Spoiler | Can nest basic tags |
| `<blockquote>` | Quote | Can nest basic tags |

## Edge Cases Identified

### Category 1: Unsupported HTML Tags

| Edge Case | Example | Current Handling | Risk |
|-----------|---------|------------------|------|
| `<br>` tags | `line1<br>line2` | ✅ Fixed - converts to `\n` | LOW |
| `<p>` tags | `<p>paragraph</p>` | ❌ Not handled | HIGH |
| `<div>` tags | `<div>content</div>` | ❌ Not handled | HIGH |
| `<span>` without class | `<span>text</span>` | ❌ Not handled | MEDIUM |
| `<h1>`-`<h6>` tags | `<h1>Header</h1>` | ❌ Not handled | MEDIUM |
| `<ul>`, `<ol>`, `<li>` | `<ul><li>item</li></ul>` | ❌ Not handled | HIGH |
| `<table>`, `<tr>`, `<td>` | Full HTML tables | ❌ Not handled | HIGH |
| `<img>` tags | `<img src="...">` | ❌ Not handled | MEDIUM |
| `<hr>` tags | `<hr>` | ❌ Not handled | LOW |

### Category 2: Special Characters (Must Escape)

| Edge Case | Example | Risk |
|-----------|---------|------|
| Unescaped `<` | `5 < 10` | HIGH - breaks parsing |
| Unescaped `>` | `10 > 5` | HIGH - breaks parsing |
| Unescaped `&` | `Q&A section` | HIGH - breaks parsing |
| HTML in citation titles | `Title: <Script>` | HIGH |
| User-generated content | Any `<>` chars | HIGH |

### Category 3: Malformed/Unclosed Tags

| Edge Case | Example | Risk |
|-----------|---------|------|
| Unclosed bold | `**bold text` (no closing) | MEDIUM |
| Unclosed italic | `*italic` (no closing) | MEDIUM |
| Unclosed code | `` `code `` (no closing) | MEDIUM |
| Nested incorrectly | `<b><i>text</b></i>` | MEDIUM |
| Self-closing tags | `<br/>`, `<hr/>` | HIGH |

### Category 4: Markdown Conversion Issues

| Edge Case | Example | Risk |
|-----------|---------|------|
| Code blocks (triple backtick) | ` ```python\ncode\n``` ` | HIGH |
| Markdown links | `[text](url)` | HIGH |
| Markdown images | `![alt](url)` | MEDIUM |
| Horizontal rules | `---` or `***` | LOW |
| Blockquotes | `> quoted text` | MEDIUM |
| Numbered lists | `1. item` | MEDIUM |
| Bullet lists | `- item` or `* item` | MEDIUM |
| Nested lists | Multi-level indentation | HIGH |
| Tables | `| col | col |` | ✅ Partially fixed |

### Category 5: Message Length Issues

| Edge Case | Example | Risk |
|-----------|---------|------|
| Message > 4096 chars | Long AI responses | HIGH |
| Very long URLs | URL > 2048 chars | MEDIUM |
| Many citations | 10+ citation links | MEDIUM |

### Category 6: Unicode/Encoding Issues

| Edge Case | Example | Risk |
|-----------|---------|------|
| Emoji in responses | Various emoji | LOW |
| Non-ASCII in URLs | `https://example.com/文档` | MEDIUM |
| RTL text | Arabic/Hebrew content | LOW |
| Zero-width chars | Hidden characters | LOW |

### Category 7: Citation-Specific Issues

| Edge Case | Example | Risk |
|-----------|---------|------|
| Citation title with HTML | `<script>` in title | HIGH |
| Citation URL with special chars | `url?a=1&b=2` | MEDIUM |
| Empty citation title | `title: null` | LOW |
| Empty citation URL | `url: null` | LOW |
| Malformed citation URL | `not-a-url` | MEDIUM |

## Proposed Solutions

### Solution 1: Robust HTML Sanitizer

```python
def sanitize_for_telegram(text: str) -> str:
    """
    Convert any text to Telegram-safe HTML.

    1. Escape special HTML characters first
    2. Then apply allowed formatting
    """
```

### Solution 2: Comprehensive Markdown-to-Telegram Converter

```python
def markdown_to_telegram_html(text: str) -> str:
    """
    Convert markdown to Telegram HTML with fallbacks.

    Handles: headers, bold, italic, code, links, lists, tables, blockquotes
    """
```

### Solution 3: Message Chunking for Long Messages

```python
def chunk_message(text: str, max_length: int = 4096) -> List[str]:
    """
    Split long messages at safe boundaries.

    - Preserve formatting across chunks
    - Split at paragraph/sentence boundaries
    """
```

### Solution 4: Fallback to Plain Text

```python
async def send_message_safe(chat_id, text, parse_mode='HTML'):
    """
    Try HTML first, fall back to plain text on failure.
    """
    try:
        await bot.send_message(chat_id, text, parse_mode=parse_mode)
    except BadRequest as e:
        if 'parse' in str(e).lower():
            # Strip all formatting and send plain
            plain_text = strip_all_formatting(text)
            await bot.send_message(chat_id, plain_text)
```

## Implementation Priority

| Priority | Edge Cases | Effort |
|----------|------------|--------|
| P0 (Critical) | HTML escaping, unsupported tags, message length | Medium |
| P1 (High) | Markdown conversion, code blocks, links | Medium |
| P2 (Medium) | Lists, blockquotes, tables | High |
| P3 (Low) | Unicode, RTL, edge formatting | Low |

## Success Metrics

1. Zero `Can't parse entities` errors in production
2. 100% of messages delivered successfully
3. Graceful fallback when formatting fails
4. Preserved readability in all edge cases

## Testing Checklist

- [ ] Send message with `<br>` tags
- [ ] Send message with `<p>` tags
- [ ] Send message with `<div>` tags
- [ ] Send message with `<` and `>` in text
- [ ] Send message with `&` in text
- [ ] Send message with unclosed markdown
- [ ] Send message with code blocks
- [ ] Send message with markdown links
- [ ] Send message with markdown tables
- [ ] Send message > 4096 characters
- [ ] Send message with HTML in citation title
- [ ] Send message with special chars in citation URL
