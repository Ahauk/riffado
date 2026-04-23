#!/usr/bin/env bash
# Descarga 20 clips de 15s desde YouTube con yt-dlp.
set -uo pipefail

command -v yt-dlp >/dev/null || { echo "Falta yt-dlp. brew install yt-dlp"; exit 1; }
command -v ffmpeg >/dev/null || { echo "Falta ffmpeg. brew install ffmpeg"; exit 1; }

cd "$(dirname "$0")/clips"

download() {
  local out="$1" query="$2" start="$3"
  local end
  end=$(python3 -c "
m,s=map(int,'$start'.split(':')); t=m*60+s+15
print(f'{t//60}:{t%60:02d}')")
  if [ -f "$out" ]; then
    echo "[skip] $out"
    return
  fi
  echo "[dl] $out ($query, ${start}-${end})"
  if yt-dlp -x --audio-format wav --audio-quality 0 \
      --download-sections "*${start}-${end}" --force-keyframes-at-cuts \
      -o "${out%.wav}.%(ext)s" \
      "ytsearch1:${query}" >/dev/null 2>&1; then
    echo "    ok"
  else
    echo "    FAIL — ajustar manualmente"
  fi
}

download "01_let_it_be.wav"           "Let It Be The Beatles"                 "0:17"
download "02_stand_by_me.wav"         "Stand By Me Ben E King"                "0:00"
download "03_knockin_heaven.wav"      "Knockin on Heavens Door Bob Dylan"     "0:10"
download "04_horse_no_name.wav"       "Horse With No Name America"            "0:10"
download "05_wonderwall.wav"          "Wonderwall Oasis"                      "0:55"
download "06_ho_hey.wav"              "Ho Hey Lumineers"                      "0:20"
download "07_riptide.wav"             "Riptide Vance Joy"                     "0:10"
download "08_wagon_wheel.wav"         "Wagon Wheel Old Crow Medicine Show"    "0:20"
download "09_highway_to_hell.wav"     "Highway to Hell AC DC"                 "0:40"
download "10_black_pearl_jam.wav"     "Black Pearl Jam"                       "0:00"
download "11_with_or_without_you.wav" "With Or Without You U2"                "0:30"
download "12_me_gustas_tu.wav"        "Me Gustas Tu Manu Chao"                "0:20"
download "13_espacio_sideral.wav"     "Espacio Sideral Jesse y Joy"           "0:15"
download "14_clandestino.wav"         "Clandestino Manu Chao"                 "0:10"
download "15_boulevard.wav"           "Boulevard of Broken Dreams Green Day"  "0:10"
download "16_hey_jude.wav"            "Hey Jude Beatles"                      "0:00"
download "17_yesterday.wav"           "Yesterday Beatles"                     "0:05"
download "18_thinking_out_loud.wav"   "Thinking Out Loud Ed Sheeran"          "0:10"
download "19_blinding_lights.wav"     "Blinding Lights The Weeknd"            "0:30"
download "20_wonderwall_live.wav"     "Wonderwall Oasis MTV Unplugged"        "0:55"

echo ""
echo "Clips WAV en clips/: $(ls *.wav 2>/dev/null | wc -l | xargs)"
