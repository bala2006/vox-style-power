#!/usr/bin/env python3
"""
Monte l'ad Culotte Minceur (36,6s, 9:16) depuis cinq clips Flow générés à la main.

Quatre choses que ce script fait et que le pipeline vox ne fait pas :

1. AUCUNE GRILLE FIXE DE 10s. Les blocs durent exactement le temps de leur
   narration, donc zéro image morte. Le BLOCK_SECONDS = 10.0 codé en dur dans
   assemble.py est ce qui avait mis ~1,6s de plan mort dans le cut newsroom.

2. DOUZE PLANS VISIBLES DEPUIS CINQ CLIPS. Chaque clip est coupé sur ses impacts
   internes, un segment est réutilisé en punch-in à 1,20x et lit comme un autre
   angle. Les coupes viennent du montage, pas de la génération.

3. SOUS-TITRES KARAOKÉ MOT À MOT. Les timings viennent de /with-timestamps
   d'ElevenLabs, c'est-à-dire du moteur qui a produit la parole. C'est exact,
   contrairement à passer Whisper sur l'audio et deviner. Rendus en PNG RGBA
   avec Pillow et composités par overlay ffmpeg.

4. DES CONTRÔLES DE SYNCHRO QUI ÉCHOUENT FORT. Un chiffre à l'écran sous une
   autre phrase se lit comme un autre chiffre : c'est un contresens factuel, pas
   un détail de timing. SYNC_CHECKS vérifie que "-50%" est bien à l'image quand
   on dit "moitié prix", et refuse de monter sinon.

Lancer :  python3 build-ad.py
"""

"""
=============================================================================
TEMPLATE — COPY IT INTO THE RUN FOLDER, THEN EDIT. Do not run it from here.

    cp <skill>/scripts/build-ad.py output/<slug>/

Every run has its own script, its own clips and its own cut, so this file is a
starting point rather than a library. What you MUST change per run is listed at
the top of each block below; everything else is machinery that carries over
unchanged and is where the value is.
=============================================================================
"""

# PER RUN, EDIT: N_BLOCKS · SHOTS · FREEZE_TAIL · SYNC_CHECKS · MERGES ·
#                OFFER_LINES · OFFER_SHOT · BAND_Y (measure it, see SKILL.md).
# CARRIES OVER UNCHANGED, and this is the point of the file: the total-duration
# guard, the monotonic-time guard, SYNC_CHECKS itself, the per-clip bed
# normalisation, the ducking, and the word-level caption renderer.
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).parent
WORK = ROOT / ".build"
W, H = 720, 1280
FPS = 25
N_BLOCKS = 5

# --- palette ----------------------------------------------------------------
TERRACOTTA = (196, 98, 58, 255)
CREAM = (247, 241, 232, 255)
INK = (58, 48, 42, 255)

# --- look des sous-titres ---------------------------------------------------
# Retunés pour une audience 50+ : corps plus gros et deux mots par cue au lieu
# de trois. Les mots français sont plus longs que les anglais et on lit moins
# vite à soixante ans qu'à vingt.
FONT = "/System/Library/Fonts/Supplemental/Arial Black.ttf"
SIZE = 54
STROKE = 8                       # contour noir épais, la signature CapCut
IDLE = (255, 255, 255, 255)      # les mots pas encore prononcés
HOT = TERRACOTTA                 # l'accent de la palette, sur le mot actif
HOT_SCALE = 1.20
BAND_H = 320
# Mesuré sur les frames livrées, pas choisi à vue : à 780 la bande tombait
# exactement sur la carte d'argile et masquait le "30 000". Les props gravés
# occupent y 830-960, la bande est donc descendue sous eux. Elle reste au-dessus
# de la zone d'UI Reels, qui mange les ~150 derniers pixels.
BAND_Y = 900
PER_CUE = 2
UPPERCASE = True                 # idiome CapCut. .upper() garde les accents et l'œ

# Le POP : le mot actif entre en sur-échelle puis retombe sur HOT_SCALE en deux
# paliers de ~80 ms. C'est ce qui distingue un karaoké vivant d'un simple
# changement de couleur, et ça ne coûte que deux états de cache supplémentaires
# par cue, pas deux rendus par frame.
POP_STEPS = [(0.00, 1.34), (0.08, 1.26), (0.16, 1.20)]

# --- la carte offre, incrustée sur la carte d'argile vierge du plan 10 -------
# Générer "MOINS DE 11€" dans l'argile serait un pari à chaque re-roll : au-delà
# de ~8 caractères le lettrage IA double et déforme. La carte est générée VIERGE
# et le texte propre vient se poser dessus ici.
OFFER_LINES = [("MOINS DE 11€", 68, TERRACOTTA),
               ("LIVRAISON OFFERTE", 34, INK),
               ("PAIEMENT SÉCURISÉ", 34, INK)]
# Mesuré sur la frame livrée : la carte d'argile vierge occupe y 620-1030. À 430
# l'incrustation flottait au-dessus d'elle au lieu de se poser dessus. À 700 elle
# est centrée sur la carte et reste dégagée de la bande de sous-titres (y 985+).
OFFER_Y = 700
OFFER_SHOT = 12                  # entrée de la carte vierge, puis tenu sur le gel

# --- le montage -------------------------------------------------------------
# (clip, in, out, zoom, speed). Sortie d'un plan = (out - in) / speed, donc
# speed < 1 = ralenti.
#
# LE TEMPS DOIT RESTER MONOTONE À L'INTÉRIEUR D'UN CLIP. Sur un clip à caméra
# mobile continue, réutiliser deux fois le même passage source fait visiblement
# rembobiner l'image : les objets remontent, la caméra recule. Un punch-in change
# l'échelle, pas le temps, et ne cache donc rien. La seule correction honnête est
# la rampe de vitesse, que le playbook demande de toute façon.
#
# VITESSES RÉSOLUES sur les durées de narration RÉELLES, mesurées le 2026-08-05
# avec la voix MNKK2Wl2wbbsEPQTHZGt au preset B (chaleureuse) :
#   5,294 / 7,245 / 5,851 / 5,851 / 12,353  =  36,595s
# Ce script recompare à chaque exécution et refuse de monter si l'écart dépasse
# TOL, donc re-voicer sans re-résoudre est impossible par accident.
#
# Trois choses que ces nombres portent et qu'une lecture rapide manquerait :
#
# - Le plan 8 démarre à 0,55 dans le clip D, pas à 0,00. La sortie de la robe
#   doit tomber sur "La robe, je l'ai ressortie" (23,36 -> 24,24), soit 4,97s
#   après le début du plan. En partant à 0,55 à vitesse native, elle atterrit
#   dessus sans accélérer le seul mouvement de grue payé 100 crédits.
# - Le plan 7 saute la source 3,00-4,00 du clip C. C'est une coupe interne sur le
#   snap élastique, pas un recouvrement : le garde-fou n'interdit que de reculer.
#   Sans ce saut, le bloc 3 aurait forcé le clip C à 1,37x, or c'est le clip qui
#   explique le produit et l'accélérer le rend illisible.
# - Le clip E est découpé en TROIS plans, pas deux. Le bloc 5 dure 12,35s pour
#   8,00s de source, donc E tourne à 0,65x de moyenne et tout y dérive vers la
#   fin. Trois plans permettent de tenir l'étiquette -50% sur "à moitié prix"
#   (28,07 -> 28,80) au lieu de la laisser glisser sous le prix.
SHOTS = [
    ("clip-A", 0.30, 3.40, 1.00, 1.0690),  # 1  elle tient la robe, la range  2.900s
    ("clip-A", 5.30, 8.00, 1.00, 1.1279),  # 2  la porte, son visage         2.394s
    ("clip-B", 0.00, 2.60, 1.00, 1.0833),  # 3  la pile qui monte            2.400s
    ("clip-B", 3.20, 5.40, 1.20, 0.9565),  # 4  elle minuscule, punché       2.300s
    ("clip-B", 6.00, 8.00, 1.00, 0.7859),  # 5  son visage, l'accablement    2.545s
    ("clip-C", 0.30, 3.10, 1.00, 1.0370),  # 6  la remise de la gaine        2.700s
    ("clip-C", 3.40, 6.60, 1.00, 1.0155),  # 7  elle la porte, la robe       3.151s
    ("clip-D", 1.90, 8.00, 1.00, 1.0425),  # 8  HÉROS : la robe ressort      5.851s
    ("clip-E", 1.00, 3.20, 1.00, 1.0680),  # 9  la joie, en robe             2.060s
    ("clip-E", 4.30, 5.60, 1.00, 0.7345),  # 10 le tampon 30 000             1.770s
    ("clip-E", 5.90, 6.70, 1.00, 0.4372),  # 11 l'étiquette -50%             1.830s
    ("clip-E", 6.80, 8.00, 1.00, 0.6000),  # 12 la carte vierge              2.000s
]

# La carte vierge finale est tenue en ARRÊT SUR IMAGE pour le reste du bloc 5.
# Le clip E n'a que 1,2s de source sur ce beat pour 6,4s de call to action : le
# jouer à 0,19x serait une bouillie au ralenti. Un end card immobile se lit comme
# voulu, et c'est là que l'incrustation MOINS DE 11 EUR doit rester lisible.
FREEZE_TAIL = 4.695

TOL = 0.15                       # écart image/narration toléré, en secondes

# Les props sont cuits dans les clips à des positions fixes. Un chiffre affiché
# pendant qu'on parle d'autre chose invite le spectateur à le lire comme le
# mauvais chiffre. C'est ce qui a coûté un round au run précédent, où le 92%
# atterrissait sous "more than half publish every single day".
#
# (mots à trouver dans la narration, plan attendu à l'écran à ce moment)
SYNC_CHECKS = [
    (["ressortie"],          8),   # la robe sort du placard
    (["trente", "mille"],    9),   # elle, en robe, heureuse
    (["moitié", "prix"],    11),   # l'étiquette -50%
]

# Veo rend un niveau audio très inégal d'un clip à l'autre : sur ce run, de
# -23,4 dB (clip B) à -40,7 dB (clip C), soit 17 dB d'écart. Un gain global unique
# ne peut pas corriger ça — le clip B couvrirait la voix pendant que le clip C
# serait inaudible. Chaque clip est donc ramené au même niveau moyen AVANT le
# mixage, et le gain est mesuré à chaque exécution : re-roller un clip ne casse
# pas le mixage.
BED_TARGET_DB = -32.0            # niveau moyen visé pour le lit, avant duck
BED_HEADROOM_DB = -1.0           # marge de crête, pour ne jamais écrêter le lit
BED_GAIN_DB = -9                 # puis le lit passe sous la voix
# release court, et c'est mesuré : les silences entre phrases de cette narration
# durent 0,30 à 0,45s. Avec release=420 le lit n'avait pas le temps de remonter
# et restait ducké en permanence — 29 dB sous la parole, donc inaudible. À 260 ms
# il respire dans les creux sans jamais mordre sur la voix.
DUCK = "threshold=0.025:ratio=9:attack=15:release=260"


def clip_gain(path: Path, _cache={}) -> float:
    """Gain à appliquer à ce clip pour amener son lit au niveau commun."""
    key = str(path)
    if key not in _cache:
        err = subprocess.run(
            ["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-vn",
             "-af", "volumedetect", "-f", "null", "/dev/null"],
            capture_output=True, text=True).stderr
        mean = float(re.search(r"mean_volume: (-?[\d.]+)", err).group(1))
        peak = float(re.search(r"max_volume: (-?[\d.]+)", err).group(1))
        # le plus contraignant des deux : atteindre le niveau visé, sans écrêter
        _cache[key] = round(min(BED_TARGET_DB - mean, BED_HEADROOM_DB - peak), 2)
    return _cache[key]


def run(cmd):
    subprocess.run(cmd, check=True, capture_output=True)


def dur(p: Path) -> float:
    return float(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", str(p)],
        capture_output=True, text=True, check=True).stdout.strip())


# La narration dit "onze euros" pour que le moteur lise le bon nombre, mais le
# SOUS-TITRE doit montrer le prix. Sans ça le prix s'affiche en toutes lettres
# exactement au moment où il doit frapper.
MERGES = [
    (["onze", "euros"], "11€"),
    (["culotte", "minceur"], "Culotte Minceur"),
]


def _bare(s: str) -> str:
    return "".join(c for c in s if c.isalnum()).lower()


def apply_merges(words: list[dict]) -> list[dict]:
    """Replie une suite de mots en le seul token qu'elle doit afficher."""
    out, i = [], 0
    while i < len(words):
        hit = None
        for seq, shown in MERGES:
            n = len(seq)
            if [_bare(w["word"]) for w in words[i:i + n]] == seq:
                hit = (n, shown)
                break
        if hit:
            n, shown = hit
            out.append({"word": shown,
                        "start": words[i]["start"],
                        "end": words[i + n - 1]["end"],
                        "block": words[i]["block"], "solo": True})
            i += n
        else:
            out.append(words[i])
            i += 1
    return out


def load_words() -> list[dict]:
    """Timings des cinq blocs, ramenés sur une seule timeline globale."""
    words, offset = [], 0.0
    for i in range(1, N_BLOCKS + 1):
        blk = json.loads((ROOT / f"audio/block-{i:02d}.words.json").read_text())
        for w in blk:
            words.append({"word": w["word"],
                          "start": w["start"] + offset,
                          "end": w["end"] + offset,
                          "block": i})
        offset += dur(ROOT / f"audio/block-{i:02d}.mp3")
    return apply_merges(words)


def group_cues(words: list[dict]) -> list[list[dict]]:
    """PER_CUE mots par cue, sauf un token fusionné qui a sa cue à lui."""
    cues, cur = [], []
    for w in words:
        if w.get("solo"):
            if cur:
                cues.append(cur)
                cur = []
            cues.append([w])
            continue
        cur.append(w)
        if len(cur) == PER_CUE:
            cues.append(cur)
            cur = []
    if cur:
        cues.append(cur)
    return cues


def shot_bounds() -> list[tuple[float, float]]:
    """(début, fin) de chaque plan sur la timeline de sortie."""
    out, t = [], 0.0
    for i, (_, a, b, _, speed) in enumerate(SHOTS):
        d = (b - a) / speed
        if i == len(SHOTS) - 1:
            d += FREEZE_TAIL          # le dernier plan est tenu en arrêt sur image
        out.append((t, t + d))
        t += d
    return out


def check_sync(words: list[dict]) -> None:
    """Refuse de monter si un prop tombe sous la mauvaise phrase."""
    bounds = shot_bounds()
    bare = [_bare(w["word"]) for w in words]
    for seq, want in SYNC_CHECKS:
        n = len(seq)
        idx = next((i for i in range(len(bare) - n + 1)
                    if bare[i:i + n] == seq), None)
        if idx is None:
            raise SystemExit(
                f"contrôle de synchro : la phrase {' '.join(seq)!r} est "
                f"introuvable dans la narration. Le script a changé sans que "
                f"SYNC_CHECKS suive.")
        t = (words[idx]["start"] + words[idx + n - 1]["end"]) / 2
        got = next((i for i, (a, b) in enumerate(bounds, 1) if a <= t < b),
                   len(SHOTS))
        mark = "ok" if got == want else "ÉCHEC"
        print(f"  synchro {' '.join(seq):<16} t={t:5.2f}s  "
              f"plan {got:>2} (attendu {want:>2})  {mark}")
        if got != want:
            raise SystemExit(
                f"\n  Le plan {got} est à l'écran quand on dit "
                f"{' '.join(seq)!r}, on attendait le plan {want}.\n"
                f"  Un chiffre affiché sous la mauvaise phrase se lit comme le "
                f"mauvais chiffre.\n"
                f"  Corrige les vitesses de SHOTS, pas ce contrôle.")


def check_font() -> ImageFont.FreeTypeFont:
    """Une police sans œ ni accents casserait la moitié des sous-titres."""
    if not Path(FONT).exists():
        raise SystemExit(f"police introuvable : {FONT}")
    f = ImageFont.truetype(FONT, SIZE)
    for ch in "œéèàçûêô€":
        if f.getmask(ch).getbbox() is None:
            raise SystemExit(f"la police {Path(FONT).name} ne rend pas {ch!r}. "
                             f"Choisis-en une autre.")
    return f


def render_band(cue: list[str], active: int,
                pop: float = HOT_SCALE) -> Image.Image:
    """Un état de sous-titre : la cue, avec le mot prononcé chaud et agrandi."""
    if UPPERCASE:
        cue = [w.upper() for w in cue]
    img = Image.new("RGBA", (W, BAND_H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Un token fusionné est un mot insécable : on rétrécit le corps jusqu'à ce
    # qu'il tienne dans le cadre plutôt que de le laisser déborder.
    size = SIZE
    if len(cue) == 1:
        probe = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
        while size > 22:
            f = ImageFont.truetype(FONT, int(size * POP_STEPS[0][1]))
            if probe.textbbox((0, 0), cue[0], font=f,
                              stroke_width=STROKE)[2] <= W - 40:
                break
            size -= 2

    base = ImageFont.truetype(FONT, size)
    big = ImageFont.truetype(FONT, int(size * pop))

    fonts = [big if i == active else base for i in range(len(cue))]
    gap = 16
    widths = [d.textbbox((0, 0), w, font=f, stroke_width=STROKE)[2]
              for w, f in zip(cue, fonts)]
    total = sum(widths) + gap * (len(cue) - 1)

    if total <= W - 40:
        rows = [list(range(len(cue)))]
    else:
        half = len(cue) // 2 + len(cue) % 2
        rows = [list(range(half)), list(range(half, len(cue)))]

    y = (BAND_H - len(rows) * (size + 24)) // 2
    for row in rows:
        rw = sum(widths[i] for i in row) + gap * (len(row) - 1)
        x = (W - rw) // 2
        for i in row:
            f = fonts[i]
            dy = -int(size * (pop - 1) / 2) if i == active else 0
            d.text((x, y + dy), cue[i], font=f,
                   fill=HOT if i == active else IDLE,
                   stroke_width=STROKE, stroke_fill=(0, 0, 0, 255))
            x += widths[i] + gap
        y += size + 24
    return img


def build_offer_card() -> Path:
    """L'offre, posée sur la carte d'argile vierge du dernier plan."""
    pad, gap = 34, 14
    fonts = [(t, ImageFont.truetype(FONT, s), c) for t, s, c in OFFER_LINES]
    probe = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    boxes = [probe.textbbox((0, 0), t, font=f) for t, f, _ in fonts]
    cw = max(b[2] - b[0] for b in boxes) + pad * 2
    ch = sum(b[3] - b[1] for b in boxes) + gap * (len(fonts) - 1) + pad * 2

    img = Image.new("RGBA", (W, ch), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    x0 = (W - cw) // 2
    d.rounded_rectangle([x0, 0, x0 + cw, ch], radius=22, fill=CREAM)

    y = pad
    for (t, f, colour), b in zip(fonts, boxes):
        d.text(((W - (b[2] - b[0])) // 2, y - b[1]), t, font=f, fill=colour)
        y += (b[3] - b[1]) + gap

    out = WORK / "offer.png"
    img.save(out)
    return out


def build_captions(words: list[dict], total: float) -> Path:
    """Une frame RGBA par frame de sortie, muxée en vidéo à alpha."""
    cues = group_cues(words)
    frames = WORK / "cap"
    if frames.exists():
        shutil.rmtree(frames)
    frames.mkdir(parents=True)

    cache, n = {}, int(total * FPS)
    blank = Image.new("RGBA", (W, BAND_H), (0, 0, 0, 0))
    blank_path = WORK / "blank.png"
    blank.save(blank_path)

    for fi in range(n):
        t = fi / FPS
        state = None
        for cue in cues:
            if cue[0]["start"] <= t < cue[-1]["end"] + 0.18:
                act = 0
                for j, w in enumerate(cue):
                    if t >= w["start"]:
                        act = j
                since = t - cue[act]["start"]
                pop = next(v for lim, v in reversed(POP_STEPS) if since >= lim)
                state = (tuple(w["word"] for w in cue), act, pop)
                break
        path = frames / f"cap-{fi:05d}.png"
        if state is None:
            shutil.copy(blank_path, path)
            continue
        if state not in cache:
            key = WORK / f"state-{len(cache):04d}.png"
            render_band(list(state[0]), state[1], state[2]).save(key)
            cache[state] = key
        shutil.copy(cache[state], path)

    out = WORK / "captions.mov"
    run(["ffmpeg", "-loglevel", "error", "-y", "-framerate", str(FPS),
         "-i", str(frames / "cap-%05d.png"), "-c:v", "qtrle", str(out)])
    print(f"  sous-titres : {n} frames, {len(cache)} états distincts")
    return out


def main() -> None:
    missing = [f"clips/{c}.mp4" for c in sorted({s[0] for s in SHOTS})
               if not (ROOT / f"clips/{c}.mp4").exists()]
    if missing:
        sys.exit("clips manquants : " + ", ".join(missing) +
                 "\nGénère-les dans Flow (voir storyboard-flow.md) et "
                 "dépose-les dans clips/.")

    WORK.mkdir(exist_ok=True)
    check_font()

    for c in sorted({s[0] for s in SHOTS}):
        print(f"  lit {c}: {clip_gain(ROOT / f'clips/{c}.mp4'):+.2f} dB")

    words = load_words()
    blocks = [dur(ROOT / f"audio/block-{i:02d}.mp3")
              for i in range(1, N_BLOCKS + 1)]
    total = sum(blocks)
    print("narration " + " / ".join(f"{b:.2f}" for b in blocks) +
          f"  = {total:.2f}s · {len(words)} mots")

    # 1. la durée image doit tomber sur la durée narration
    video = sum((b - a) / sp for _, a, b, _, sp in SHOTS) + FREEZE_TAIL
    print(f"image {video:.2f}s  vs  narration {total:.2f}s  "
          f"(écart {video - total:+.2f}s)")
    if abs(video - total) > TOL:
        sys.exit(
            f"\n  Écart de {abs(video - total):.2f}s, au-delà de {TOL}s.\n"
            f"  Les vitesses de SHOTS sont calées sur des durées ESTIMÉES. "
            f"Résous-les sur ces durées-ci\n"
            f"  et reporte-les aussi dans la carte de temps de "
            f"storyboard-flow.md.")

    # 2. les props doivent tomber sous leur propre phrase
    check_sync(words)

    # 3. les dix plans
    parts, prev = [], {}
    for i, (clip, a, b, zoom, speed) in enumerate(SHOTS, 1):
        if clip in prev and a < prev[clip] - 1e-6:
            sys.exit(
                f"plan {i} : {clip} démarre à {a:.2f} alors que le plan "
                f"précédent issu de ce clip finissait à {prev[clip]:.2f}. "
                f"Le temps reculerait et l'image rembobinerait visiblement.")
        prev[clip] = b

        seg = WORK / f"shot-{i:02d}.mp4"
        vf = [f"scale={W}:{H}"]                     # normalise la sortie Flow
        if zoom != 1.0:
            vf.append(f"scale=iw*{zoom}:ih*{zoom},crop={W}:{H}")
        if speed != 1.0:
            vf.append(f"setpts=PTS/{speed}")
        vf += [f"fps={FPS}", "setpts=PTS-STARTPTS"]
        # atempo n'accepte que 0.5-100 : plus lent se chaîne en deux passes de
        # sqrt(speed).
        if speed == 1.0:
            af = []
        elif speed >= 0.5:
            af = [f"atempo={speed}"]
        else:
            af = [f"atempo={speed ** 0.5:.4f}"] * 2
        af.insert(0, f"volume={clip_gain(ROOT / f'clips/{clip}.mp4')}dB")
        af.append("asetpts=PTS-STARTPTS")
        if i == len(SHOTS) and FREEZE_TAIL > 0:
            # tpad clone la dernière image, apad complète en silence pour que les
            # deux pistes gardent la même longueur.
            vf.append(f"tpad=stop_mode=clone:stop_duration={FREEZE_TAIL}")
            af.append(f"apad=pad_dur={FREEZE_TAIL}")
        run(["ffmpeg", "-loglevel", "error", "-y", "-ss", str(a), "-to", str(b),
             "-i", str(ROOT / f"clips/{clip}.mp4"),
             "-vf", ",".join(vf), "-af", ",".join(af),
             "-c:v", "libx264", "-preset", "medium", "-crf", "18",
             "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
             str(seg)])
        parts.append(seg)

    listing = WORK / "shots.txt"
    listing.write_text("".join(f"file '{p.name}'\n" for p in parts))
    cut = WORK / "cut.mp4"
    run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0",
         "-i", str(listing), "-c", "copy", str(cut)])
    print(f"  montage : {len(SHOTS)} plans, {dur(cut):.2f}s, "
          f"plan moyen {dur(cut)/len(SHOTS):.2f}s")

    # 4. narration, une seule piste
    nar_list = WORK / "nar.txt"
    nar_list.write_text("".join(
        f"file '{(ROOT / f'audio/block-{i:02d}.mp3').resolve()}'\n"
        for i in range(1, N_BLOCKS + 1)))
    narration = WORK / "narration.wav"
    run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0",
         "-i", str(nar_list), "-ac", "2", "-ar", "48000", str(narration)])

    # 5. sous-titres et carte offre
    captions = build_captions(words, total)
    offer = build_offer_card()
    offer_t = shot_bounds()[OFFER_SHOT - 1][0]

    # 6. composite + mix. L'audio natif des clips EST le lit sonore, ducké sous
    #    la voix par sidechaincompress et non remplacé par elle. C'est
    #    exactement l'erreur qui avait laissé le cut newsroom en narration sur
    #    du silence numérique.
    out = ROOT / "final.mp4"
    chain = (
        f"[0:v][1:v]overlay=0:{BAND_Y}:shortest=1[v1];"
        f"[v1][3:v]overlay=0:{OFFER_Y}:enable='gte(t,{offer_t:.2f})'[v];"
        f"[0:a]volume={BED_GAIN_DB}dB[bed];"
        f"[2:a]asplit=2[vc][vk];"
        f"[bed][vk]sidechaincompress={DUCK}[duck];"
        f"[duck][vc]amix=inputs=2:duration=longest:normalize=0[a]"
    )
    run(["ffmpeg", "-loglevel", "error", "-y",
         "-i", str(cut), "-i", str(captions), "-i", str(narration),
         "-loop", "1", "-i", str(offer),
         "-filter_complex", chain, "-map", "[v]", "-map", "[a]",
         "-c:v", "libx264", "-preset", "medium", "-crf", "19",
         "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
         "-shortest", str(out)])
    print(f"  carte offre à partir de {offer_t:.2f}s")
    print(f"\n-> {out.name}  {dur(out):.2f}s")
    print("   Vérifie le lit sonore AVANT de livrer : mesure le RMS dans un "
          "silence entre deux phrases.\n"
          "   -99 dBFS = silence numérique, le lit a sauté.")


if __name__ == "__main__":
    main()
