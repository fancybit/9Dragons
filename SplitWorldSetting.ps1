$filePath = "f:\Works\九王爷\九龙修真记\md\九龙修真记 世界设定分类整理.md"
$content = Get-Content -Path $filePath -Raw

# 提取目录
$directory = [regex]::Match($content, '# 九龙修真记 世界设定分类整理\s+## 目录\s+((?:- \[.*?\]\(.*?\)\s*)+)').Value

# 定义一级标题
$titles = @(
    "一、世界本源与格局",
    "二、修炼体系",
    "三、资源体系",
    "四、势力设定",
    "五、角色设定"
)

# 提取每个部分并创建文件
for ($i = 0; $i -lt $titles.Length; $i++) {
    $title = $titles[$i]
    $startPattern = "## $title"
    $endPattern = if ($i -lt $titles.Length - 1) { "## $($titles[$i+1])" } else { "$" }
    
    $sectionPattern = "$startPattern.*?(?=$endPattern|$)"
    $section = [regex]::Match($content, $sectionPattern, [System.Text.RegularExpressions.RegexOptions]::Singleline).Value
    
    if ($section) {
        $fileName = "f:\Works\九王爷\九龙修真记\md\九龙修真记 世界设定 - $title.md"
        Set-Content -Path $fileName -Value $section -Encoding UTF8
        Write-Host "Created: $fileName"
    }
}

# 更新原文件为目录
$newContent = $directory -replace '\(#(.*?)\)', '(九龙修真记 世界设定 - $1.md)'
Set-Content -Path $filePath -Value $newContent -Encoding UTF8
Write-Host "Updated original file to directory only"