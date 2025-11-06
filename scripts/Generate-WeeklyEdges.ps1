param(
  [int]$Season = (Get-Date).Year,
  [int]$Week,
  [string]$InputCsv = "C:\SMEE\sports-edge-ats\output\nfl-week.csv",
  [string]$PublicRoot = "$PSScriptRoot\..\public"
)
if(-not $Week){ throw "Provide -Week (NFL week number)" }
$DataDir = Join-Path $PublicRoot "data\nfl"
New-Item -ItemType Directory -Force -Path $DataDir | Out-Null
$rows = Import-Csv -LiteralPath $InputCsv
$current = [ordered]@{
  season=$Season; week=$Week; updated=(Get-Date).ToString('yyyy-MM-dd HH:mm \P\T');
  record=[ordered]@{green=0;yellow=0;red=0;summary=""};
  games=@()
}
foreach($r in $rows){
  $current.games += [ordered]@{
    home=$r.home; away=$r.away; market=$r.market; line=([double]$r.line);
    model=([double]$r.model); edge=([double]$r.edge); color=$r.color;
    recommendation=$r.recommendation; kickoff=$r.kickoff
  }
  switch($r.color){ 'green'{$current.record.green++}; 'yellow'{$current.record.yellow++}; 'red'{$current.record.red++} }
}
$current.record.summary = "G $($current.record.green) • Y $($current.record.yellow) • R $($current.record.red)"
($current | ConvertTo-Json -Depth 6) | Set-Content -Encoding UTF8 (Join-Path $DataDir 'current.json')

$historyPath = Join-Path $DataDir 'history.json'
if(Test-Path $historyPath){ $history = Get-Content $historyPath -Raw | ConvertFrom-Json } else { $history = @{weeks=@()} }
$history.weeks = @($history.weeks | Where-Object { !($_.season -eq $Season -and $_.week -eq $Week) })
$history.weeks += @{ season=$Season; week=$Week; record=$current.record }
$history.weeks = @($history.weeks | Sort-Object season,week)
($history | ConvertTo-Json -Depth 6) | Set-Content -Encoding UTF8 $historyPath

$wkFile = Join-Path $DataDir ("{0}-w{1}.json" -f $Season, ($Week.ToString('00')))
($current | ConvertTo-Json -Depth 6) | Set-Content -Encoding UTF8 $wkFile

$metaPath = Join-Path (Join-Path $PublicRoot 'data') 'meta.json'
(@{ message = "Last update from PowerShell at $((Get-Date).ToString('HH:mm')) PT — SportsEdge v3.4" } | ConvertTo-Json) |
  Set-Content -Encoding UTF8 $metaPath

Write-Host "✅ Wrote: $($DataDir)\current.json, history.json, $wkFile"
