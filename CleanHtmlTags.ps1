# 清理MD文件中的{=html}标签和HTML注释
# 直接在当前目录运行，避免中文路径编码问题
Set-Location -Path "f:\Works\九王爷\九龙修真记\md"

Get-ChildItem -Filter "*.md" | ForEach-Object {
    $filePath = $_.FullName
    $fileName = $_.Name
    Write-Host "Processing file: $fileName"
    
    # 读取文件内容
    $content = Get-Content -Path $filePath -Encoding UTF8 -Raw
    
    # 检查文件是否包含{=html}标签
    if ($content -match '{=html}') {
        Write-Host "  Found {=html} tags, cleaning..."
        
        # 清理{=html}标签和其中的HTML注释
        # 匹配模式：```{=html}\s*<!--.*?-->\s*``` （跨行匹配）
        $cleanContent = $content -replace '(?s)```\{=html\}\s*<!--.*?-->\s*```', ''
        
        # 也处理单独的{=html}标签
        $cleanContent = $cleanContent -replace '```\{=html\}\s*```', ''
        
        # 写入清理后的内容
        Set-Content -Path $filePath -Value $cleanContent -Encoding UTF8
        Write-Host "  Cleaned successfully"
    } else {
        Write-Host "  No {=html} tags found"
    }
}

Write-Host "\nAll files processed!"