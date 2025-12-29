import os

filepath = 'md/章节/正传/第13章 天启护天子 三朝忠君王.md'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()
    # 简单的字数统计，按空格分割
    word_count = len(content.strip().split())
    print(f'Word count: {word_count}')
    # 更准确的中文计数，考虑每个字符
    char_count = len(content.strip())
    print(f'Character count: {char_count}')