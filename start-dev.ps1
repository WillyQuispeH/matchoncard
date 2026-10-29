<#
  Levanta todo MatchOnCard en desarrollo con un solo comando, en UNA pestana de Windows Terminal
  con un panel por servicio.

    .\start-dev.ps1                  # todo, con app y app-admin abiertos a la red local (https, para el celular)
    .\start-dev.ps1 -Ip 192.168.1.50 # forzar la IP (si detecta otra adaptador)
    .\start-dev.ps1 -SoloLocal       # app y app-admin solo en http://localhost (yarn dev)
    .\start-dev.ps1 -SinTunel        # no abre el tunel SSH a la base (si ya lo tienes abierto en otra parte)
    .\start-dev.ps1 -Detener         # cierra todo lo que escuche en los puertos de desarrollo y el tunel
    .\start-dev.ps1 -Simular         # solo muestra lo que haria, sin levantar nada

  Antes de levantar:
    - detecta tu IP de la red local y revisa que certs-dev/servidor.crt la incluya (si no, lo regenera;
      la CA se reutiliza y los celulares no necesitan nada nuevo)
    - deja PUBLIC_URL de api/.env en https://<ip>:4561 (los links de captura salen con ella)
    - revisa que los puertos esten libres
  Si cambio la IP, el CORS del bucket necesita el origen nuevo: cd api; yarn bucket:configurar

  Si Windows no deja ejecutarlo: powershell -ExecutionPolicy Bypass -File .\start-dev.ps1
  Detalle en DESARROLLO.md, "Probar desde el celular en la red local".
#>
param(
  [string]$Ip,
  [switch]$SoloLocal,
  [switch]$SinTunel,
  [switch]$Detener,
  [switch]$Simular
)
$ErrorActionPreference = 'Stop'
$Raiz = $PSScriptRoot
$Puertos = @{ 'api' = 4560; 'app' = 4561; 'api-webhook' = 4562; 'api-signature' = 4563; 'app-admin' = 4564 }
$PuertoTunel = 27992
$Tunel = '27992:private-a536165-akamai-prod-7313032-default.g2a.akamaidb.net:27992 root@172.233.16.21'

function Escuchando([int]$puerto) {
  Get-NetTCPConnection -State Listen -LocalPort $puerto -ErrorAction SilentlyContinue | Select-Object -First 1
}

# Un panel de Windows Terminal: carpeta, titulo y comando
function Panel([string]$titulo, [string]$carpeta, [string]$comando) {
  Write-Host ("  {0,-14} {1}" -f $titulo, $comando) -ForegroundColor Gray
  "-d `"$carpeta`" --title `"$titulo`" --suppressApplicationTitle powershell -NoExit -NoProfile -Command $comando"
}

# ---------------------------------------------------------------- detener
if ($Detener) {
  foreach ($p in @($Puertos.Values) + $PuertoTunel) {
    $c = Escuchando $p
    if ($c) { taskkill /PID $c.OwningProcess /T /F | Out-Null; Write-Host "  cerrado el proceso del puerto $p" }
  }
  # nodemon y next pueden dejar procesos padre sin puerto
  Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and $_.CommandLine -like "*$Raiz*" -and $_.CommandLine -match 'nodemon|next dev|uvicorn' } |
    ForEach-Object { taskkill /PID $_.ProcessId /T /F 2>$null | Out-Null }
  Write-Host 'Listo: servicios de desarrollo detenidos.' -ForegroundColor Green
  exit 0
}

# ---------------------------------------------------------------- puertos libres
$ocupados = @($Puertos.GetEnumerator() | Where-Object { Escuchando $_.Value } | ForEach-Object { "$($_.Key) ($($_.Value))" })
if ($ocupados.Count) {
  Write-Host "Ya hay algo escuchando en: $($ocupados -join ', ')" -ForegroundColor Yellow
  Write-Host 'Cierralo antes, o corre .\start-dev.ps1 -Detener' -ForegroundColor Yellow
  if (-not $Simular) { exit 1 }
}

# ---------------------------------------------------------------- red local: IP, certificado y PUBLIC_URL
$publica = 'http://127.0.0.1:4561'
if (-not $SoloLocal) {
  if (-not $Ip) {
    # IPv4 de un adaptador real conectado (descarta loopback, WSL/Hyper-V, Bluetooth y direcciones 169.254)
    $Ip = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
      Where-Object { $_.IPAddress -notmatch '^(127\.|169\.254\.)' -and $_.InterfaceAlias -notmatch 'vEthernet|WSL|Loopback|Bluetooth' } |
      Where-Object { (Get-NetAdapter -InterfaceIndex $_.InterfaceIndex -ErrorAction SilentlyContinue).Status -eq 'Up' } |
      Sort-Object { $_.IPAddress -notlike '192.168.*' } | Select-Object -First 1 -ExpandProperty IPAddress
    if (-not $Ip) { Write-Host 'No pude detectar tu IP de la red local; pasala con -Ip <ip>' -ForegroundColor Red; exit 1 }
  }
  Write-Host "IP de la red local: $Ip" -ForegroundColor Cyan

  $crt = Join-Path $Raiz 'certs-dev\servidor.crt'
  $cubre = $false
  if (Test-Path $crt) {
    $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2 $crt
    $san = $cert.Extensions | Where-Object { $_.Oid.Value -eq '2.5.29.17' }
    $cubre = $san -and $san.Format($false) -match "(^|[ ,=:])$([regex]::Escape($Ip))(\s|,|$)" -and $cert.NotAfter -gt (Get-Date).AddDays(7)
  }
  if (-not $cubre -and $Simular) { Write-Host "  (regeneraria el certificado para $Ip)" -ForegroundColor DarkGray }
  elseif (-not $cubre) {
    # el bash de Git (no el de WSL) para el script del certificado
    $git = (Get-Command git -ErrorAction SilentlyContinue).Source
    $bash = if ($git) { @((Join-Path (Split-Path (Split-Path $git)) 'bin\bash.exe'), (Join-Path (Split-Path $git) 'bash.exe')) | Where-Object { Test-Path $_ } | Select-Object -First 1 }
    if (-not $bash) { Write-Host "No encontre el bash de Git. Genera el certificado a mano: bash scripts/certificado-dev.sh $Ip" -ForegroundColor Red; exit 1 }
    Write-Host "El certificado no cubre $Ip (o vence pronto): lo regenero..." -ForegroundColor Yellow
    & $bash (Join-Path $Raiz 'scripts/certificado-dev.sh') $Ip 2>&1 | Where-Object { $_ -match 'CA nueva|Certificado del' } | ForEach-Object { "  $_" }
    if (-not (Test-Path $crt)) { Write-Host 'No se pudo generar el certificado.' -ForegroundColor Red; exit 1 }
  }
  $publica = "https://${Ip}:4561"
}

$envApi = Join-Path $Raiz 'api\.env'
$lineas = Get-Content $envApi -Encoding UTF8
$actual = ($lineas | Where-Object { $_ -match '^PUBLIC_URL=' }) -replace '^PUBLIC_URL=', ''
if ($actual -ne $publica -and $Simular) { Write-Host "  (cambiaria PUBLIC_URL: $actual -> $publica)" -ForegroundColor DarkGray }
elseif ($actual -ne $publica) {
  $nuevas = $lineas | ForEach-Object { if ($_ -match '^PUBLIC_URL=') { "PUBLIC_URL=$publica" } else { $_ } }
  [System.IO.File]::WriteAllLines($envApi, [string[]]$nuevas, (New-Object System.Text.UTF8Encoding $false))
  Write-Host "PUBLIC_URL: $actual -> $publica" -ForegroundColor Yellow
  if (-not $SoloLocal) { Write-Host '  Si es un origen nuevo, agregalo al CORS del bucket: cd api; yarn bucket:configurar' -ForegroundColor Yellow }
}

# ---------------------------------------------------------------- arranque
# Una sola pestana de Windows Terminal dividida en paneles:
#   +---------------+---------------+
#   | api           | app           |
#   +---------------+---------------+
#   | api-webhook   | app-admin     |
#   +---------------+---------------+
#   | api-signature | tunel BD      |
#   +---------------+---------------+
if (-not (Get-Command wt -ErrorAction SilentlyContinue)) {
  Write-Host 'No encontre Windows Terminal (wt). Instalalo desde Microsoft Store: winget install Microsoft.WindowsTerminal' -ForegroundColor Red
  exit 1
}
Write-Host 'Levantando servicios en una pestana de Windows Terminal:' -ForegroundColor Cyan
$dev = if ($SoloLocal) { 'yarn dev' } else { 'yarn dev:red' }
$conTunel = -not $SinTunel -and -not (Escuchando $PuertoTunel)
if (-not $SinTunel -and -not $conTunel) { Write-Host "  tunel BD       ya abierto en $PuertoTunel" -ForegroundColor Gray }

$wt = @(
  "-w 0 new-tab $(Panel 'api' (Join-Path $Raiz 'api') 'yarn dev')"
  "split-pane -V $(Panel 'app' (Join-Path $Raiz 'app') $dev)"
  "split-pane -H $(Panel 'app-admin' (Join-Path $Raiz 'app-admin') $dev)"
)
if ($conTunel) { $wt += "split-pane -H $(Panel 'tunel BD' $Raiz "ssh -N -L $Tunel")" }
$wt += @(
  'move-focus left'
  "split-pane -H $(Panel 'api-webhook' (Join-Path $Raiz 'api-webhook') 'yarn dev')"
  "split-pane -H $(Panel 'api-signature' (Join-Path $Raiz 'api-signature') 'yarn dev')"
)
$argumentos = $wt -join ' ; '
if ($Simular) { Write-Host "`nwt $argumentos" -ForegroundColor DarkGray; exit 0 }
Start-Process wt -ArgumentList $argumentos

$web = if ($SoloLocal) { 'http://localhost' } else { "https://$Ip" }
Write-Host ''
Write-Host 'Listo. Cuando terminen de compilar:' -ForegroundColor Green
Write-Host "  app        $web`:4561   (demo: $web`:4561/demo)"
Write-Host "  app-admin  $web`:4564"
Write-Host "  api        http://127.0.0.1:4560/health"
Write-Host 'Para cerrar todo: .\start-dev.ps1 -Detener'
