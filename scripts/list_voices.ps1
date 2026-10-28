Get-ChildItem 'HKLM:\SOFTWARE\Microsoft\Speech\Voices\Tokens' | ForEach-Object {
    $prop = Get-ItemProperty $_.PSPath
    Write-Host "SAPI5: $($prop.'(default)')"
}
Get-ChildItem 'HKLM:\SOFTWARE\Microsoft\Speech_OneCore\Voices\Tokens' -ErrorAction SilentlyContinue | ForEach-Object {
    $prop = Get-ItemProperty $_.PSPath
    Write-Host "OneCore: $($prop.'(default)')"
}
