#!/usr/bin/env python3
"""
Génère les cinq blocs de narration française via l'API ElevenLabs directe.

Pourquoi ce fichier existe : le text2speech_v2 de Higgsfield n'expose que
variant + voice_type + voice_id, donc on est limité aux voix curées de
Higgsfield et aucun des contrôles d'interprétation n'est atteignable. En
attaquant l'API directement on récupère toute la bibliothèque de voix plus
stability / style / speed, et c'est là que vit le "plus chaleureux".

La clé API est lue dans ~/.elevenlabs-key (chmod 600, hors du repo pour ne pas
pouvoir être commitée). Elle n'est jamais affichée.

Usage :
    python3 elevenlabs-voice.py <voice_id>            # 3 interprétations, bloc 1
    python3 elevenlabs-voice.py <voice_id> --final A  # les 5 blocs, preset A
"""

"""
=============================================================================
TEMPLATE — COPY IT INTO THE RUN FOLDER, THEN EDIT. Do not run it from here.

    cp <skill>/scripts/elevenlabs-voice.py output/<slug>/

Every run has its own script, its own clips and its own cut, so this file is a
starting point rather than a library. What you MUST change per run is listed at
the top of each block below; everything else is machinery that carries over
unchanged and is where the value is.
=============================================================================
"""

# PER RUN, EDIT: BLOCKS (the narration) and, if the voice is unusual, PRESETS.
# CARRIES OVER UNCHANGED: the curl transport (this machine's Python has no CA
# bundle), the /with-timestamps call, and group_words().
import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).parent
KEY = (Path.home() / ".elevenlabs-key").read_text().strip()
MODEL = "eleven_multilingual_v2"

# Le script du client, verbatim, avec exactement deux retouches de synthèse :
#   - les points de suspension deviennent un point (une ellipse fait respirer le
#     moteur de façon imprévisible, un point coûte ~0,7s stable) ;
#   - "11euros" devient "onze euros", sinon le moteur épelle ou lit un nombre
#     faux. Le sous-titre, lui, réaffiche "11€" via MERGES dans build-ad.py.
# Rien d'autre n'est touché : les chiffres et les promesses appartiennent au
# client et ne sont ni inventés ni adoucis ici.
BLOCKS = [
    "Il y a un an, j'ai rangé ma robe préférée au fond de l'armoire. "
    "Sans rien dire à personne.",

    "On n'en parle pas, mais ça pèse sur le moral. On s'habille pour cacher, "
    "plus pour se plaire, et ça ne devrait pas être le cas.",

    "Un jour, ma sœur m'a montré sa Culotte Minceur. Elle affine la taille dès "
    "qu'on la met, sous les vêtements.",

    "Et elle fait transpirer, tranquillement, pendant qu'on vit sa journée. "
    "La robe, je l'ai ressortie.",

    "Trente mille femmes seniors la portent déjà. Aujourd'hui, elle est à "
    "moitié prix. Moins de onze euros, livraison offerte et rapide avec un "
    "paiement sécurisé. Le lien est juste en dessous.",
]

# Trois interprétations de la même voix. Stability basse = plus de variation et
# d'énergie ; style haut = plus joué. Speed pousse le débit sans changer la
# hauteur.
#
# Ces presets sont volontairement plus posés que ceux du run diorama
# (stability 0.30 / style 0.60 / speed 1.05), qui étaient taillés pour un hook
# nerveux. Ici la promesse est une confidence entre femmes : trop de style et la
# voix sonne comme une pub, ce qui est exactement ce qu'une audience 50+ scrolle.
PRESETS = {
    "A": {"name": "confidente",  "stability": 0.45, "similarity_boost": 0.75,
          "style": 0.35, "use_speaker_boost": True, "speed": 0.98},
    "B": {"name": "chaleureuse", "stability": 0.55, "similarity_boost": 0.75,
          "style": 0.25, "use_speaker_boost": True, "speed": 1.00},
    "C": {"name": "très posée",  "stability": 0.65, "similarity_boost": 0.75,
          "style": 0.15, "use_speaker_boost": True, "speed": 0.95},
    # Mesuré sur cette voix : A, B et C rendent le bloc 1 en 5,11 / 5,15 / 5,20s,
    # soit 0,09s d'écart. stability et style changent l'INTERPRÉTATION, pas le
    # débit — seul speed le change. Or la voix lit à 3,7 mots/s, ce qui est
    # rapide pour une confidence. D est le même réglage que B, ralenti, et c'est
    # le seul preset qui déplace vraiment le curseur.
    "D": {"name": "lente",       "stability": 0.55, "similarity_boost": 0.75,
          "style": 0.25, "use_speaker_boost": True, "speed": 0.85},
}


def say(voice_id: str, text: str, preset: dict, out: Path,
        words_out: Path | None = None) -> None:
    """Synthétise `text`. Avec words_out, écrit aussi les timings mot à mot.

    curl plutôt qu'urllib : le build python.org de cette machine n'embarque pas
    de certificats CA, donc urlopen meurt en CERTIFICATE_VERIFY_FAILED. curl a
    son propre magasin de confiance et ne demande aucune modification de Python.

    L'endpoint /with-timestamps renvoie les temps de début et de fin PAR
    CARACTÈRE, depuis le moteur qui a produit la parole. C'est de la vérité
    terrain, pas une estimation d'ASR, et c'est ce qui rend possible un vrai
    karaoké mot à mot sans Whisper ni aucune autre dépendance.
    """
    settings = {k: v for k, v in preset.items() if k != "name"}
    body = json.dumps({
        "text": text,
        "model_id": MODEL,
        "voice_settings": settings,
    }, ensure_ascii=False).encode()
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    if words_out is not None:
        url += "/with-timestamps"

    r = subprocess.run(
        ["curl", "-sS", "-X", "POST", url,
         "-H", f"xi-api-key: {KEY}",
         "-H", "Content-Type: application/json",
         "--data-binary", "@-", "-o", "-", "-w", "\n%{http_code}"],
        input=body, capture_output=True, check=True)
    raw, _, code = r.stdout.rpartition(b"\n")
    if code.strip() != b"200":
        raise SystemExit(f"ElevenLabs HTTP {code.decode()}: "
                         f"{raw.decode(errors='replace')[:400]}")

    if words_out is None:
        out.write_bytes(raw)
        return

    import base64
    d = json.loads(raw)
    out.write_bytes(base64.b64decode(d["audio_base64"]))
    words_out.write_text(json.dumps(group_words(d["alignment"]),
                                    indent=1, ensure_ascii=False))


def group_words(alignment: dict) -> list[dict]:
    """Replie les timings par caractère en timings par mot."""
    chars = alignment["characters"]
    starts = alignment["character_start_times_seconds"]
    ends = alignment["character_end_times_seconds"]
    words, cur = [], None
    for c, s, e in zip(chars, starts, ends):
        if c.isspace():
            if cur:
                words.append(cur)
                cur = None
            continue
        if cur is None:
            cur = {"word": c, "start": s, "end": e}
        else:
            cur["word"] += c
            cur["end"] = e
    if cur:
        words.append(cur)
    return words


def dur(p: Path) -> float:
    return float(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", str(p)],
        capture_output=True, text=True, check=True).stdout.strip())


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit("usage: elevenlabs-voice.py <voice_id> [--final A|B|C]")
    voice_id = sys.argv[1]

    if "--final" in sys.argv:
        key = sys.argv[sys.argv.index("--final") + 1].upper()
        outdir = ROOT / "audio"
        outdir.mkdir(exist_ok=True)
        print(f"preset {key} ({PRESETS[key]['name']}) -> audio/")
        total = 0.0
        for i, text in enumerate(BLOCKS, 1):
            p = outdir / f"block-{i:02d}.mp3"
            w = outdir / f"block-{i:02d}.words.json"
            say(voice_id, text, PRESETS[key], p, words_out=w)
            d = dur(p)
            total += d
            n = len(json.loads(w.read_text()))
            print(f"  bloc {i}  {d:5.2f}s  {len(text.split()):>2} mots  "
                  f"{len(text.split())/d:.2f} mots/s  -> {n} timings")
        print(f"\n  total narration {total:.2f}s")
        print("  -> reporte ces durées dans la carte de temps de "
              "storyboard-flow.md, puis résous les vitesses de SHOTS.")
        return

    outdir = ROOT / "voice-test"
    outdir.mkdir(exist_ok=True)
    n_mots = len(BLOCKS[0].split())
    print("Même ligne (bloc 1), trois interprétations de la même voix :\n")
    for key, preset in PRESETS.items():
        p = outdir / f"EL-{key}-{preset['name'].replace(' ', '-')}.mp3"
        say(voice_id, BLOCKS[0], preset, p)
        d = dur(p)
        print(f"  {key}  {preset['name']:<12} {d:5.2f}s  "
              f"{n_mots/d:.2f} mots/s  -> {p.name}")
    print("\nÉcoute-les, puis :  python3 elevenlabs-voice.py <voice_id> --final A")


if __name__ == "__main__":
    main()
