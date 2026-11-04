# umbra

brave extension i made so sites can't put my identities together. scrubs the tracking out of urls, cuts referrers, forces https and hides the fingerprint stuff sites read.

## install

open `brave://extensions`, turn on dev mode in the corner, click  `Load unpacked` and drag the folder into it

## what it does

- strips utm_*, fbclid, gclid and friends out of urls
- referrers dropped on cross site requests
- http jumps to https
- webrtc limited to the public interface, prediction off, hyperlink auditing off, third party cookies blocked
- spoof.js fakes navigator/screen, blanks canvas reads, hides the webgl renderer, rounds timers to 100ms
- wipe button clears cookies and site data

everything toggleable in the GUI popup

## known limits

- url rewriting needs the params to be in the url, it can't fix sites that already logged you
- canvas blanking breaks sites that actually draw (maps, editors)
- audio, fonts, timezone and window size still leak so maybe could fix idk
- none of this touches your ip or tls fingerprint, use a vpn for that such as mullvad, Wiregaurd, Amnezia VPN or Headscale (Actual trusted VPNS)
- no telemetry
- no network calls
