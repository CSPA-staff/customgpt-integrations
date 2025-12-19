#!/usr/bin/env python3
import os
import re
import html
import asyncio
import logging
from io import BytesIO
from typing import Dict, Optional, List, Tuple
from datetime import datetime
from dotenv import load_dotenv

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, BotCommand
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, filters, ContextTypes
from telegram.constants import ParseMode, ChatAction
from telegram.error import BadRequest
import structlog

# Pillow for table image generation
try:
    from PIL import Image, ImageDraw, ImageFont
    PILLOW_AVAILABLE = True
except ImportError:
    PILLOW_AVAILABLE = False
    logger_init = None  # Will use structlog after init

from customgpt_client import CustomGPTClient


def extract_markdown_tables(text: str) -> List[Tuple[str, List[str], List[List[str]]]]:
    """
    Extract markdown tables from text.
    Returns list of tuples: (original_table_text, headers, rows)
    """
    tables = []
    lines = text.split('\n')
    current_table_lines = []
    headers = []
    rows = []
    in_table = False
    table_start_idx = 0

    for i, line in enumerate(lines):
        # Check if this looks like a table line (has pipes)
        is_table_line = '|' in line and (line.strip().startswith('|') or line.strip().count('|') >= 2)

        # Skip separator lines like |---|---|
        is_separator = is_table_line and re.match(r'^\s*\|[-:\s|]+\|\s*$', line)

        if is_table_line:
            if not in_table:
                in_table = True
                table_start_idx = i
                current_table_lines = []
                headers = []
                rows = []

            current_table_lines.append(line)

            if not is_separator:
                # Extract cells
                cells = [c.strip() for c in line.split('|')]
                cells = [c for c in cells if c]  # Remove empty cells

                if not headers:
                    headers = cells
                else:
                    rows.append(cells)
        else:
            # Not a table line
            if in_table and headers and rows:
                # End of table - save it
                original_text = '\n'.join(current_table_lines)
                tables.append((original_text, headers, rows))

            in_table = False
            current_table_lines = []
            headers = []
            rows = []

    # Handle table at end of text
    if in_table and headers and rows:
        original_text = '\n'.join(current_table_lines)
        tables.append((original_text, headers, rows))

    return tables


def wrap_text(text: str, font, max_width: int, draw) -> List[str]:
    """Wrap text to fit within max_width, returning list of lines."""
    if not text:
        return [""]

    words = text.split()
    lines = []
    current_line = ""

    for word in words:
        test_line = f"{current_line} {word}".strip() if current_line else word
        bbox = draw.textbbox((0, 0), test_line, font=font)
        if bbox[2] - bbox[0] <= max_width:
            current_line = test_line
        else:
            if current_line:
                lines.append(current_line)
            # If single word is too long, just use it anyway
            current_line = word

    if current_line:
        lines.append(current_line)

    return lines if lines else [""]


def generate_table_image(headers: List[str], rows: List[List[str]],
                         max_width: int = 1200, padding: int = 12,
                         font_size: int = 14, header_font_size: int = 15) -> Optional[BytesIO]:
    """
    Generate a table image using Pillow with text wrapping support.
    Returns BytesIO object containing PNG image, or None if Pillow not available.
    """
    if not PILLOW_AVAILABLE:
        return None

    if not headers or not rows:
        return None

    try:
        # Try to load a readable font, fallback to default
        try:
            font_paths = [
                # Sans-serif fonts (more readable)
                "/System/Library/Fonts/Helvetica.ttc",
                "/System/Library/Fonts/SF-Pro-Text-Regular.otf",
                "/Library/Fonts/Arial.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
                # Fallback to monospace
                "/System/Library/Fonts/Menlo.ttc",
                "/System/Library/Fonts/Monaco.ttf",
                "C:\\Windows\\Fonts\\arial.ttf",
                "C:\\Windows\\Fonts\\segoeui.ttf",
            ]
            font = None
            header_font = None
            for path in font_paths:
                try:
                    font = ImageFont.truetype(path, font_size)
                    header_font = ImageFont.truetype(path, header_font_size)
                    break
                except:
                    continue

            if font is None:
                font = ImageFont.load_default()
                header_font = font
        except:
            font = ImageFont.load_default()
            header_font = font

        # Strip markdown formatting from cells
        def clean_cell(text: str) -> str:
            text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
            text = re.sub(r'__(.+?)__', r'\1', text)
            text = re.sub(r'\*(.+?)\*', r'\1', text)
            text = re.sub(r'_(.+?)_', r'\1', text)
            text = re.sub(r'`(.+?)`', r'\1', text)
            text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
            return text.strip()

        headers = [clean_cell(h) for h in headers]
        rows = [[clean_cell(cell) for cell in row] for row in rows]

        # Create temp image for measurements
        temp_img = Image.new('RGB', (1, 1))
        temp_draw = ImageDraw.Draw(temp_img)

        # Get line height
        bbox = temp_draw.textbbox((0, 0), "Hg", font=font)
        line_height = bbox[3] - bbox[1] + 4  # Add small spacing

        # Determine column widths based on number of columns
        num_cols = len(headers)
        available_width = max_width - padding * 2

        # For 2-column tables (like Feature|Description), give more space to second column
        if num_cols == 2:
            col_widths = [int(available_width * 0.30), int(available_width * 0.70)]
        else:
            # Equal distribution for other tables
            col_widths = [available_width // num_cols] * num_cols

        # Calculate wrapped text for each cell and determine row heights
        wrapped_headers = []
        for i, header in enumerate(headers):
            wrapped = wrap_text(header, header_font, col_widths[i] - padding * 2, temp_draw)
            wrapped_headers.append(wrapped)

        header_lines = max(len(w) for w in wrapped_headers)
        header_height = header_lines * line_height + padding * 2

        wrapped_rows = []
        row_heights = []
        for row in rows:
            wrapped_row = []
            max_lines = 1
            for i, cell in enumerate(row):
                if i < len(col_widths):
                    wrapped = wrap_text(cell, font, col_widths[i] - padding * 2, temp_draw)
                    wrapped_row.append(wrapped)
                    max_lines = max(max_lines, len(wrapped))
            wrapped_rows.append(wrapped_row)
            row_heights.append(max_lines * line_height + padding * 2)

        # Calculate total dimensions
        total_width = sum(col_widths) + padding * 2
        total_height = header_height + sum(row_heights) + padding * 2

        # Create image with white background
        img = Image.new('RGB', (total_width, total_height), color='#FFFFFF')
        draw = ImageDraw.Draw(img)

        # Colors - Modern design
        header_bg = '#1E40AF'    # Blue header
        header_text_color = '#FFFFFF'  # White
        row_bg_even = '#F8FAFC'  # Very light gray
        row_bg_odd = '#FFFFFF'   # White
        cell_text_color = '#1F2937'    # Dark gray
        border_color = '#E5E7EB'  # Light border
        col1_bg = '#F0F9FF'      # Light blue tint for first column

        y = padding

        # Draw header row
        x = padding
        draw.rectangle([x, y, total_width - padding, y + header_height], fill=header_bg)

        for i, (wrapped, width) in enumerate(zip(wrapped_headers, col_widths)):
            text_y = y + padding
            for line in wrapped:
                bbox = draw.textbbox((0, 0), line, font=header_font)
                text_width = bbox[2] - bbox[0]
                # Center text in header
                text_x = x + (width - text_width) // 2
                draw.text((text_x, text_y), line, fill=header_text_color, font=header_font)
                text_y += line_height
            x += width

        y += header_height

        # Draw data rows
        for row_idx, (wrapped_row, row_height) in enumerate(zip(wrapped_rows, row_heights)):
            x = padding
            bg_color = row_bg_even if row_idx % 2 == 0 else row_bg_odd
            draw.rectangle([x, y, total_width - padding, y + row_height], fill=bg_color)

            for i, width in enumerate(col_widths):
                # First column gets subtle highlight
                if i == 0 and num_cols == 2:
                    draw.rectangle([x, y, x + width, y + row_height], fill=col1_bg)

                if i < len(wrapped_row):
                    wrapped = wrapped_row[i]
                    text_y = y + padding
                    for line in wrapped:
                        draw.text((x + padding, text_y), line, fill=cell_text_color, font=font)
                        text_y += line_height
                x += width

            y += row_height

        # Draw borders
        # Outer border
        draw.rectangle([padding, padding, total_width - padding, total_height - padding],
                      outline=border_color, width=2)

        # Horizontal lines
        y = padding + header_height
        for row_height in row_heights:
            draw.line([(padding, y), (total_width - padding, y)], fill=border_color, width=1)
            y += row_height

        # Vertical lines
        x = padding
        for width in col_widths[:-1]:
            x += width
            draw.line([(x, padding), (x, total_height - padding)], fill=border_color, width=1)

        # Save to BytesIO
        output = BytesIO()
        img.save(output, format='PNG', optimize=True)
        output.seek(0)

        return output

    except Exception as e:
        # Log error but don't fail
        return None


from simple_cache import SimpleCache


# Telegram message length limit
TELEGRAM_MAX_MESSAGE_LENGTH = 4096


def escape_html(text: str) -> str:
    """Escape HTML special characters for Telegram."""
    return html.escape(text, quote=False)


def convert_markdown_table_to_cards(text: str) -> str:
    """
    Convert markdown tables to a card-style vertical layout.
    This looks much better on mobile Telegram than horizontal tables.

    Input:
    | Feature | Description |
    |---------|-------------|
    | Speed   | Very fast   |

    Output:
    ┌─ Speed
    │  Very fast
    └──────────
    """
    lines = text.split('\n')
    result_lines = []
    table_lines = []
    in_table = False
    headers = []

    for line in lines:
        # Check if this is a table line
        if '|' in line and line.strip().startswith('|') or (line.strip().count('|') >= 2):
            # Skip separator lines like |---|---|
            if re.match(r'^\s*\|[-:\s|]+\|\s*$', line):
                continue

            # Extract cells
            cells = [c.strip() for c in line.split('|')]
            cells = [c for c in cells if c]  # Remove empty cells

            if not in_table:
                # First row is header
                in_table = True
                headers = cells
            else:
                # Data row - create a card
                table_lines.append(cells)
        else:
            # Not a table line
            if in_table and table_lines:
                # End of table - convert to cards
                cards = format_table_as_cards(headers, table_lines)
                result_lines.append(cards)
                table_lines = []
                headers = []
                in_table = False

            result_lines.append(line)

    # Handle table at end of text
    if in_table and table_lines:
        cards = format_table_as_cards(headers, table_lines)
        result_lines.append(cards)

    return '\n'.join(result_lines)


def format_table_as_cards(headers: list, rows: list) -> str:
    """
    Format table data as vertical cards for mobile-friendly display.
    """
    if not headers or not rows:
        return ""

    cards = []

    # If it's a 2-column table (like Feature | Description), use special format
    if len(headers) == 2:
        for row in rows:
            if len(row) >= 2:
                title = row[0]
                desc = row[1]
                # Strip markdown bold from title since we'll add our own bold
                title = re.sub(r'\*\*(.+?)\*\*', r'\1', title)
                title = re.sub(r'__(.+?)__', r'\1', title)
                # Use bold title with description below
                card = f"<b>📌 {title}</b>\n{desc}"
                cards.append(card)
    else:
        # Multi-column table - show as labeled fields
        for row in rows:
            card_lines = []
            for i, cell in enumerate(row):
                if i < len(headers):
                    header = headers[i]
                    # Strip markdown bold from header
                    header = re.sub(r'\*\*(.+?)\*\*', r'\1', header)
                    card_lines.append(f"<b>{header}:</b> {cell}")
                else:
                    card_lines.append(cell)
            cards.append('\n'.join(card_lines))

    # Join cards with separator
    return '\n\n'.join(cards)


def sanitize_for_telegram(text: str) -> str:
    """
    Convert any text to Telegram-safe HTML.
    Handles all edge cases for Telegram's strict HTML parser.

    Strategy: Escape ALL HTML first, then selectively apply Telegram-safe formatting.
    This is safer than trying to preserve existing HTML tags.
    """
    if not text:
        return ""

    # Step 1: Remove citation markers first (before any HTML processing)
    text = re.sub(r':cit\d+/\d+,?\s*', '', text)

    # Step 2: Extract and preserve code blocks (they need special handling)
    code_blocks = []
    def save_code_block(match):
        lang = match.group(1) or ''
        code = match.group(2)
        idx = len(code_blocks)
        code_blocks.append((lang, code))
        return f'__CODE_BLOCK_{idx}__'

    text = re.sub(r'```(\w*)\n?([\s\S]*?)```', save_code_block, text)

    # Extract inline code
    inline_codes = []
    def save_inline_code(match):
        code = match.group(1)
        idx = len(inline_codes)
        inline_codes.append(code)
        return f'__INLINE_CODE_{idx}__'

    text = re.sub(r'`([^`]+)`', save_inline_code, text)

    # Step 3: Strip ALL HTML tags first (convert to plain text equivalents)
    # Replace <br> with newlines
    text = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)
    # Replace block tags with newlines
    text = re.sub(r'</?(?:p|div|section|article|header|footer|main|aside|nav)[^>]*>', '\n', text, flags=re.IGNORECASE)
    # Replace headers with newline + content + newline
    text = re.sub(r'<h[1-6][^>]*>(.*?)</h[1-6]>', r'\n\1\n', text, flags=re.IGNORECASE | re.DOTALL)
    # Replace <hr> with separator
    text = re.sub(r'<hr\s*/?>', '\n───────────\n', text, flags=re.IGNORECASE)
    # Handle lists
    text = re.sub(r'</?(?:ul|ol)[^>]*>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<li[^>]*>(.*?)</li>', r'• \1\n', text, flags=re.IGNORECASE | re.DOTALL)
    # Handle tables - extract content
    text = re.sub(r'</?(?:table|thead|tbody|tr)[^>]*>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<(?:th|td)[^>]*>(.*?)</(?:th|td)>', r'\1 | ', text, flags=re.IGNORECASE | re.DOTALL)
    # Handle images - extract alt text
    text = re.sub(r'<img[^>]*alt=["\']([^"\']*)["\'][^>]*/?>', r'[Image: \1]', text, flags=re.IGNORECASE)
    # Remove ALL remaining HTML tags
    text = re.sub(r'<[^>]+>', '', text)

    # Step 4: NOW escape all HTML special characters
    # This is the critical step - escape EVERYTHING
    text = html.escape(text, quote=False)

    # Step 5: Handle markdown tables - convert to monospace pre block for better display
    if '|' in text and re.search(r'\|.*\|.*\|', text):
        text = convert_markdown_table_to_cards(text)

    # Step 6: Convert markdown to Telegram HTML (safe since base text is escaped)
    # Headers: ## Header -> <b>Header</b>
    text = re.sub(r'^#{1,6}\s*(.+)$', r'<b>\1</b>', text, flags=re.MULTILINE)

    # Bold: **text** or __text__ -> <b>text</b>
    text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
    text = re.sub(r'__(.+?)__', r'<b>\1</b>', text)

    # Italic: *text* or _text_ -> <i>text</i> (but not inside words or URLs)
    text = re.sub(r'(?<![/\w])\*([^*\n]+)\*(?![/\w])', r'<i>\1</i>', text)
    text = re.sub(r'(?<![/\w])_([^_\n]+)_(?![/\w])', r'<i>\1</i>', text)

    # Strikethrough: ~~text~~ -> <s>text</s>
    text = re.sub(r'~~(.+?)~~', r'<s>\1</s>', text)

    # Markdown links: [text](url) -> <a href="url">text</a>
    # Note: text is already escaped, URL should not be escaped
    def convert_md_link(match):
        link_text = match.group(1)
        url = match.group(2)
        return f'<a href="{url}">{link_text}</a>'
    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', convert_md_link, text)

    # Markdown images: ![alt](url) -> [Image: alt]
    text = re.sub(r'!\[([^\]]*)\]\([^)]+\)', r'[Image: \1]', text)

    # Markdown blockquotes: > text -> ▸ text
    text = re.sub(r'^&gt;\s*(.+)$', r'▸ \1', text, flags=re.MULTILINE)

    # Markdown bullet lists: - item or * item -> • item
    text = re.sub(r'^[\-\*]\s+(.+)$', r'• \1', text, flags=re.MULTILINE)

    # Markdown horizontal rules: --- or *** or ___
    text = re.sub(r'^[\-\*_]{3,}$', '───────────', text, flags=re.MULTILINE)

    # Step 7: Restore code blocks with proper escaping
    for i, (lang, code) in enumerate(code_blocks):
        escaped_code = html.escape(code)
        if lang:
            replacement = f'<pre><code class="language-{lang}">{escaped_code}</code></pre>'
        else:
            replacement = f'<pre>{escaped_code}</pre>'
        text = text.replace(f'__CODE_BLOCK_{i}__', replacement)

    for i, code in enumerate(inline_codes):
        escaped_code = html.escape(code)
        text = text.replace(f'__INLINE_CODE_{i}__', f'<code>{escaped_code}</code>')

    # Step 8: Clean up whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)  # Max 2 consecutive newlines
    text = re.sub(r' {2,}', ' ', text)  # Max 1 consecutive space
    text = re.sub(r'\n +', '\n', text)  # Remove leading spaces after newlines
    text = text.strip()

    return text


def sanitize_citation_title(title: str) -> str:
    """Escape citation title for safe use in HTML."""
    if not title:
        return "Source"
    return html.escape(title, quote=False)


def sanitize_url(url: str) -> str:
    """Ensure URL is safe for use in href attribute."""
    if not url:
        return ""
    # Escape quotes in URL to prevent attribute breakout
    return url.replace('"', '%22').replace("'", '%27')


def chunk_message(text: str, max_length: int = TELEGRAM_MAX_MESSAGE_LENGTH) -> List[str]:
    """
    Split long messages into chunks that fit Telegram's limits.
    Tries to split at natural boundaries (paragraphs, sentences).
    """
    if len(text) <= max_length:
        return [text]

    chunks = []
    remaining = text

    while remaining:
        if len(remaining) <= max_length:
            chunks.append(remaining)
            break

        # Find the best split point
        chunk = remaining[:max_length]

        # Try to split at paragraph boundary
        last_para = chunk.rfind('\n\n')
        if last_para > max_length // 2:
            split_at = last_para
        else:
            # Try to split at newline
            last_newline = chunk.rfind('\n')
            if last_newline > max_length // 2:
                split_at = last_newline
            else:
                # Try to split at sentence boundary
                last_sentence = max(chunk.rfind('. '), chunk.rfind('! '), chunk.rfind('? '))
                if last_sentence > max_length // 2:
                    split_at = last_sentence + 1
                else:
                    # Try to split at word boundary
                    last_space = chunk.rfind(' ')
                    if last_space > max_length // 2:
                        split_at = last_space
                    else:
                        # Force split at max length
                        split_at = max_length

        chunks.append(remaining[:split_at].strip())
        remaining = remaining[split_at:].strip()

    return chunks


def strip_all_formatting(text: str) -> str:
    """Remove all HTML/markdown formatting, return plain text."""
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Remove markdown formatting
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    text = re.sub(r'__(.+?)__', r'\1', text)
    text = re.sub(r'_(.+?)_', r'\1', text)
    text = re.sub(r'~~(.+?)~~', r'\1', text)
    text = re.sub(r'`(.+?)`', r'\1', text)
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    return text


# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = structlog.get_logger()

# Initialize cache
cache = SimpleCache()

# Bot configuration
BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
CUSTOMGPT_API_URL = os.getenv('CUSTOMGPT_API_URL', 'https://app.customgpt.ai')
CUSTOMGPT_API_KEY = os.getenv('CUSTOMGPT_API_KEY')
CUSTOMGPT_PROJECT_ID = os.getenv('CUSTOMGPT_PROJECT_ID')

# Rate limiting
DAILY_LIMIT = int(os.getenv('RATE_LIMIT_PER_USER_PER_DAY', '100'))
MINUTE_LIMIT = int(os.getenv('RATE_LIMIT_PER_USER_PER_MINUTE', '5'))

# Initialize CustomGPT client
customgpt = CustomGPTClient(CUSTOMGPT_API_URL, CUSTOMGPT_API_KEY, CUSTOMGPT_PROJECT_ID)

# Starter questions
STARTER_QUESTIONS = {
    'general': [
        "What can you help me with?",
        "Tell me about your capabilities",
        "How do I get started?"
    ],
    'technical': [
        "Explain how to use the API",
        "What are the best practices?",
        "Show me some examples"
    ],
    'support': [
        "I need help with a problem",
        "How do I troubleshoot issues?",
        "Where can I find documentation?"
    ]
}


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Send a message when the command /start is issued."""
    user_id = update.effective_user.id
    
    # Clear any existing session
    await cache.delete(f"session:{user_id}")
    
    keyboard = [
        [InlineKeyboardButton("🎯 General Questions", callback_data="examples_general")],
        [InlineKeyboardButton("💻 Technical Questions", callback_data="examples_technical")],
        [InlineKeyboardButton("🆘 Support Questions", callback_data="examples_support")],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    welcome_message = f"""
🤖 Welcome to CustomGPT Bot!

I'm powered by AI and ready to help you with your questions.

You can:
• Ask me questions directly
• Use /help to see available commands
• Click the buttons below for example questions
• Use /stats to see your usage

How can I assist you today?
"""
    
    await update.message.reply_text(
        welcome_message,
        reply_markup=reply_markup,
        parse_mode=ParseMode.MARKDOWN
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Send a message when the command /help is issued."""
    help_text = """
📚 **Available Commands:**

/start - Start a new conversation
/help - Show this help message
/examples - Show example questions
/stats - View your usage statistics
/clear - Clear conversation history

**Tips:**
• Just type your question naturally
• I'll remember our conversation context
• Your daily limit is {} messages

**Need more help?** Just ask!
""".format(DAILY_LIMIT)
    
    await update.message.reply_text(help_text, parse_mode=ParseMode.MARKDOWN)


async def examples_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Show example questions"""
    keyboard = [
        [InlineKeyboardButton("🎯 General", callback_data="examples_general")],
        [InlineKeyboardButton("💻 Technical", callback_data="examples_technical")],
        [InlineKeyboardButton("🆘 Support", callback_data="examples_support")],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "Choose a category to see example questions:",
        reply_markup=reply_markup
    )


async def stats_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Show user statistics"""
    user_id = update.effective_user.id
    
    # Get current usage (this is a simplified version)
    _, _, stats = await cache.check_rate_limit(user_id, DAILY_LIMIT, MINUTE_LIMIT)
    
    stats_text = f"""
📊 **Your Usage Statistics**

Today's Usage: {stats.get('daily_used', 0)} / {DAILY_LIMIT}
Remaining Today: {stats.get('daily_remaining', DAILY_LIMIT)}

Keep in mind:
• Daily limit resets at midnight
• Rate limit: {MINUTE_LIMIT} messages per minute
"""
    
    await update.message.reply_text(stats_text, parse_mode=ParseMode.MARKDOWN)


async def clear_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Clear conversation history"""
    user_id = update.effective_user.id
    
    # Clear session
    await cache.delete(f"session:{user_id}")
    
    await update.message.reply_text(
        "✅ Conversation cleared! Start fresh by sending me a message.",
        parse_mode=ParseMode.MARKDOWN
    )


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle user messages"""
    await handle_message_text(
        update.effective_chat.id,
        update.effective_user.id,
        update.message.text,
        context
    )


async def handle_message_text(chat_id: int, user_id: int, user_message: str, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle text message processing"""
    # Check rate limits
    allowed, error_msg, stats = await cache.check_rate_limit(user_id, DAILY_LIMIT, MINUTE_LIMIT)
    
    if not allowed:
        await context.bot.send_message(chat_id=chat_id, text=f"⚠️ {error_msg}")
        return
    
    # Send typing indicator
    await context.bot.send_chat_action(chat_id=chat_id, action=ChatAction.TYPING)
    
    try:
        # Get or create session
        session_id = await cache.get(f"session:{user_id}")
        
        if not session_id:
            # Create new conversation
            session_id = await customgpt.create_conversation()
            if session_id:
                await cache.set(f"session:{user_id}", session_id, ttl_seconds=1800)  # 30 minutes
            else:
                await context.bot.send_message(
                    chat_id=chat_id,
                    text="❌ Sorry, I couldn't start a conversation. Please try again later.",
                    parse_mode=ParseMode.MARKDOWN
                )
                return
        
        # Send message to CustomGPT
        response = await customgpt.send_message(
            session_id=session_id,
            message=user_message,
            stream=False
        )

        if response and response.get('openai_response'):
            bot_response = response['openai_response']

            # Log the raw response to debug citations
            logger.info("raw_response",
                       citations_field=response.get('citations'),
                       metadata=response.get('metadata'),
                       response_keys=list(response.keys()),
                       full_response_text=bot_response[:500] if len(bot_response) > 500 else bot_response)

            # Extract citation IDs from text markers like :cit71614202/3610591687
            # Format is :cit{page_id}/{some_id} - the page_id is what we need for the citations API
            text_citation_matches = re.findall(r':cit(\d+)/(\d+)', bot_response)
            # Use the FIRST number (page_id) as that's what the citations API expects
            text_citation_ids = [int(match[0]) for match in text_citation_matches]

            # Extract tables from raw response BEFORE sanitization (for image generation)
            table_images = []
            if PILLOW_AVAILABLE:
                tables = extract_markdown_tables(bot_response)
                logger.info("table_extraction_result",
                           pillow_available=PILLOW_AVAILABLE,
                           tables_found=len(tables),
                           has_pipe_char='|' in bot_response)
                for original_text, headers, rows in tables:
                    logger.info("table_details",
                               headers=headers,
                               row_count=len(rows),
                               original_preview=original_text[:200] if original_text else "")
                    if headers and rows:
                        table_img = generate_table_image(headers, rows)
                        if table_img:
                            table_images.append(table_img)
                            logger.info("table_image_generated",
                                       headers=headers,
                                       row_count=len(rows),
                                       image_size=len(table_img.getvalue()))
                        else:
                            logger.warning("table_image_generation_failed",
                                          headers=headers,
                                          row_count=len(rows))
            else:
                logger.warning("pillow_not_available")

            # Use the comprehensive sanitizer for all formatting
            bot_response = sanitize_for_telegram(bot_response)

            # Use citation IDs from response field, or fall back to extracted from text
            citation_ids = response.get('citations') or text_citation_ids or []

            # Remove duplicates while preserving order
            seen = set()
            citation_ids = [x for x in citation_ids if not (x in seen or seen.add(x))]

            logger.info("citation_ids_to_fetch",
                       from_response=response.get('citations'),
                       from_text=text_citation_ids,
                       final=citation_ids)

            # Build citations section with proper escaping
            citations_text = ""
            citations = []
            if citation_ids:
                citations = await customgpt.get_citations(citation_ids)
                logger.info("fetched_citations", count=len(citations), citations=citations)
                if citations:
                    citations_text = "\n\n📚 <b>Sources:</b>\n"
                    for i, citation in enumerate(citations, 1):
                        title = sanitize_citation_title(citation.get('title', 'Source'))
                        url = sanitize_url(citation.get('url', ''))
                        if url:
                            citations_text += f'{i}. <a href="{url}">{title}</a>\n'
                        else:
                            citations_text += f"{i}. {title}\n"

            # Step 1: Send text response (without citations if we have table images)
            if table_images:
                # Send text response first (without citations - they come after images)
                message_chunks = chunk_message(bot_response)
            else:
                # No table images - send full response with citations
                full_response = bot_response + citations_text
                message_chunks = chunk_message(full_response)

            # Send message(s) with fallback to plain text on parse errors
            for i, chunk in enumerate(message_chunks):
                try:
                    await context.bot.send_message(
                        chat_id=chat_id,
                        text=chunk,
                        parse_mode=ParseMode.HTML,
                        disable_web_page_preview=True
                    )
                except BadRequest as e:
                    error_msg = str(e).lower()
                    if 'parse' in error_msg or 'entities' in error_msg:
                        # HTML parsing failed - fallback to plain text
                        logger.warning("html_parse_failed_fallback_to_plain",
                                      error=str(e),
                                      chunk_index=i,
                                      chunk_preview=chunk[:200])
                        plain_text = strip_all_formatting(chunk)
                        await context.bot.send_message(
                            chat_id=chat_id,
                            text=plain_text,
                            disable_web_page_preview=True
                        )
                    else:
                        raise  # Re-raise non-parsing errors

            # Step 2: Send table images (after text, before sources)
            if table_images:
                for idx, table_img in enumerate(table_images):
                    try:
                        caption = f"📊 Table {idx + 1}" if len(table_images) > 1 else "📊 Table"
                        await context.bot.send_photo(
                            chat_id=chat_id,
                            photo=table_img,
                            caption=caption
                        )
                        logger.info("table_image_sent", index=idx + 1)
                    except Exception as img_error:
                        logger.warning("table_image_send_failed",
                                      error=str(img_error),
                                      index=idx + 1)

                # Step 3: Send citations after table images
                if citations_text:
                    try:
                        await context.bot.send_message(
                            chat_id=chat_id,
                            text=citations_text.strip(),
                            parse_mode=ParseMode.HTML,
                            disable_web_page_preview=True
                        )
                    except BadRequest as e:
                        # Fallback to plain text for citations
                        plain_citations = strip_all_formatting(citations_text)
                        await context.bot.send_message(
                            chat_id=chat_id,
                            text=plain_citations.strip(),
                            disable_web_page_preview=True
                        )

            # Log successful interaction
            logger.info("message_handled",
                       user_id=user_id,
                       session_id=session_id,
                       message_length=len(user_message),
                       citations_count=len(citation_ids),
                       table_images_sent=len(table_images),
                       chunks_sent=len(message_chunks))
        else:
            await context.bot.send_message(
                chat_id=chat_id,
                text="❌ I couldn't get a response. Please try again.",
                parse_mode=ParseMode.MARKDOWN
            )
            
    except Exception as e:
        logger.error("message_handling_error", error=str(e), user_id=user_id)
        await context.bot.send_message(
            chat_id=chat_id,
            text="❌ An error occurred. Please try again later.",
            parse_mode=ParseMode.MARKDOWN
        )


async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle button clicks"""
    query = update.callback_query
    await query.answer()
    
    if query.data.startswith("examples_"):
        category = query.data.replace("examples_", "")
        questions = STARTER_QUESTIONS.get(category, [])
        
        if questions:
            text = f"**{category.title()} Questions:**\n\n"
            for i, question in enumerate(questions, 1):
                text += f"{i}. {question}\n"
            text += "\nJust click on any question or type your own!"
            
            # Create inline keyboard with questions
            keyboard = []
            for question in questions:
                keyboard.append([InlineKeyboardButton(question, callback_data=f"ask_{question}")])
            
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await query.edit_message_text(
                text=text,
                parse_mode=ParseMode.MARKDOWN,
                reply_markup=reply_markup
            )
    
    elif query.data.startswith("ask_"):
        # Extract the question and send it as if user typed it
        question = query.data.replace("ask_", "")
        
        # Delete the button message
        await query.message.delete()
        
        # Send the question as a message
        await context.bot.send_message(
            chat_id=query.message.chat.id,
            text=f"You asked: _{question}_",
            parse_mode=ParseMode.MARKDOWN
        )
        
        # Process the question
        await handle_message_text(query.message.chat.id, query.from_user.id, question, context)


async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Log errors and notify user"""
    logger.error("update_error", error=context.error, update=str(update))


async def post_init(application: Application) -> None:
    """Set up bot commands"""
    commands = [
        BotCommand("start", "Start a new conversation"),
        BotCommand("help", "Show help information"),
        BotCommand("examples", "Show example questions"),
        BotCommand("stats", "View your usage statistics"),
        BotCommand("clear", "Clear conversation history"),
    ]
    await application.bot.set_my_commands(commands)


def main() -> None:
    """Start the bot."""
    # Validate environment variables
    if not all([BOT_TOKEN, CUSTOMGPT_API_KEY, CUSTOMGPT_PROJECT_ID]):
        logger.error("Missing required environment variables")
        return
    
    # Create the Application
    application = Application.builder().token(BOT_TOKEN).post_init(post_init).build()
    
    # Register handlers
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("examples", examples_command))
    application.add_handler(CommandHandler("stats", stats_command))
    application.add_handler(CommandHandler("clear", clear_command))
    
    # Message handler
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    
    # Button handler
    application.add_handler(CallbackQueryHandler(button_callback))
    
    # Error handler
    application.add_error_handler(error_handler)
    
    # Start the bot
    logger.info("bot_starting", project_id=CUSTOMGPT_PROJECT_ID)
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == '__main__':
    main()