$cwd = "c:\Users\ravul\Downloads\New folder (2)\Farm-Direct\backend";
Set-Location $cwd;
$out = Join-Path $cwd "server_out.log";
$err = Join-Path $cwd "server_err.log";
$emailDebug = Join-Path $cwd "email-debug.log";

$cons = Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue;
if ($cons) { $cons | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }

if (Test-Path $out) { Remove-Item $out -Force }
if (Test-Path $err) { Remove-Item $err -Force }
if (Test-Path $emailDebug) { Remove-Item $emailDebug -Force }

Write-Output "Starting server...";
Start-Process -FilePath "node" -ArgumentList "server.cjs" -WorkingDirectory $cwd -RedirectStandardOutput $out -RedirectStandardError $err -NoNewWindow;

$i = 0;
while ($i -lt 15) {
    if (Test-NetConnection -ComputerName "localhost" -Port 4000 -InformationLevel Quiet) { break }
    Start-Sleep -Seconds 1;
    $i++;
}

Write-Output "Sending POST request...";
$bodyObj = @{
    buyerId = "test_buyer";
    buyerName = "Test Buyer";
    buyerEmail = "buyer+test@example.com";
    buyerPhone = "0000000000";
    farmerId = "test_farmer";
    farmerName = "Test Farmer";
    farmerEmail = "farmer+test@example.com";
    productId = "prod-1";
    productName = "Test Product";
    quantity = 2;
    totalPrice = 123.45;
    paymentMethod = "card";
    paymentStatus = "paid";
    deliveryAddress = "123 Test Lane";
    deliveryOption = "pickup";
};
$jsonBody = $bodyObj | ConvertTo-Json;
try {
    $resp = Invoke-RestMethod -Uri "http://localhost:4000/api/orders" -Method Post -Body $jsonBody -ContentType "application/json";
    $resp | ConvertTo-Json;
} catch {
    Write-Output "POST request failed.";
    $_.Exception.Message;
    if ($_.ErrorDetails) { $_.ErrorDetails.Message }
}

Start-Sleep -Seconds 2;
Write-Output "--- server_out.log ---";
if (Test-Path $out) { Get-Content $out -Tail 50 } else { Write-Output "(no out)" }
Write-Output "--- server_err.log ---";
if (Test-Path $err) { Get-Content $err -Tail 50 } else { Write-Output "(no err)" }
Write-Output "--- email-debug.log ---";
if (Test-Path $emailDebug) { Get-Content $emailDebug -Tail 50 } else { Write-Output "(no email-debug log)" }
