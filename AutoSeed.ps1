$ErrorActionPreference="Stop"
$Scope  = "jimhs-projects-1c225018"
$Domain = "edge.virtualcoachai.net"
Set-Location "C:\Sites\sports-edge"
mkdir data\nfl -ea 0 | Out-Null
mkdir data\mlb -ea 0 | Out-Null

function New-WeekJson($path,$obj){
  if(Test-Path $path){ return $false }
  ($obj | ConvertTo-Json -Depth 8) | Set-Content $path -Encoding UTF8
  Write-Host "✓ seeded $path"
  return $true
}

# NFL Week 9 baseline (with sides)
$nflW9 = @{
  league="NFL"; season=2024; week=9;
  picks=@(
    @{away="Ravens";  home="Bengals"; type="ATS"; spread=-2.5; price=-110; side="AWAY";  color="GREEN";  units=100; result="P"},
    @{away="Lions";   home="Bears";   type="ML";                price=-145; side="AWAY";  color="GREEN";  units=100; result="P"},
    @{away="Dolphins";home="Jets";    type="OU";  total=41.5;   price=-108; side="OVER";  color="YELLOW"; units=100; result="P"}
  ); results=@(); bankroll=0; weekRoi=0; seasonRoi=0; sparkline=@(); homeRows=@()
}
# MLB Series 1 baseline
$mlbS1 = @{
  league="MLB"; season=2024; week=1;
  picks=@(
    @{away="Dodgers"; home="Rangers";  type="ML";              price=-120; side="AWAY";  color="GREEN";  units=100; result="P"},
    @{away="Braves";  home="Phillies"; type="OU"; total=8.5;   price=-105; side="OVER";  color="YELLOW"; units=100; result="P"},
    @{away="Yankees"; home="Astros";   type="ATS"; spread=-1.5;price=+140; side="AWAY";  color="RED";    units=100; result="P"}
  ); results=@(); bankroll=0; weekRoi=0; seasonRoi=0; sparkline=@(); homeRows=@()
}

$s1 = New-WeekJson "data\nfl\week-09.json" $nflW9
$s2 = New-WeekJson "data\mlb\week-01.json" $mlbS1
if($s1 -or $s2){ Write-Host "Seeding done. Deploying…" -ForegroundColor Cyan }

npx vercel link --scope $Scope --yes | Out-Null
$deployOut = (npx vercel deploy --prod --yes --scope $Scope | Out-String)
$prodUrl   = ([regex]::Match($deployOut,'https?://[^\s]+\.vercel\.app')).Value
if($prodUrl){ npx vercel alias set $prodUrl $Domain --scope $Scope | Out-Null }
Write-Host "✅ Live at https://$Domain"
