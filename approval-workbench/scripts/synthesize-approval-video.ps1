param([int]$StartPart = 0)
Add-Type -AssemblyName System.Speech
$approvalVideoRoot = Join-Path (Get-Location) 'artifacts\approval-video'
$parts = Get-Content -LiteralPath (Join-Path $approvalVideoRoot 'PLAN.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
$speaker.SelectVoice('Microsoft Zira Desktop')
$speaker.Rate = 0
$format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(24000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$eventName = 'ipdos-new-approval-offline-speech'
$subscription = Register-ObjectEvent -InputObject $speaker -EventName SpeakProgress -SourceIdentifier $eventName
try {
  $index = 0
  foreach ($part in $parts.narration) {
    if ($index -lt $StartPart) { $index++; continue }
    $speaker.SetOutputToWaveFile((Join-Path $approvalVideoRoot ('speech-{0:D2}.wav' -f $index)), $format)
    $speaker.Speak($part.text)
    $speaker.SetOutputToNull()
    $events = @(Get-Event -SourceIdentifier $eventName | ForEach-Object { @{position=$_.SourceEventArgs.CharacterPosition; length=$_.SourceEventArgs.CharacterCount; seconds=$_.SourceEventArgs.AudioPosition.TotalSeconds; text=$_.SourceEventArgs.Text} })
    $events | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $approvalVideoRoot ('speech-{0:D2}-words.json' -f $index)) -Encoding UTF8
    Get-Event -SourceIdentifier $eventName | Remove-Event
    $index++
  }
  $speaker.SetOutputToWaveFile((Join-Path $approvalVideoRoot 'clock-calibration.wav'), $format)
  $speaker.SpeakSsml('<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">One<break time="1500ms"/>two<break time="1500ms"/>three.</speak>')
  $speaker.SetOutputToNull()
  @(Get-Event -SourceIdentifier $eventName | ForEach-Object { @{text=$_.SourceEventArgs.Text; seconds=$_.SourceEventArgs.AudioPosition.TotalSeconds} }) | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $approvalVideoRoot 'clock-calibration-events.json') -Encoding UTF8
  Write-Output ('New offline English narration segments: '+$index)
} finally {
  Get-Event -SourceIdentifier $eventName | Remove-Event
  Unregister-Event -SourceIdentifier $eventName
  $speaker.Dispose()
}
