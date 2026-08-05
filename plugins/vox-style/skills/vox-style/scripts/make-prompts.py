#!/usr/bin/env python3
"""
Développe les prompts de storyboard-flow.md dans prompts-flow.txt.

storyboard-flow.md est la SOURCE et garde les espaces réservés <STYLE TOKENS> et
<CHARACTER>, écrits une seule fois chacun. Les dupliquer dans chaque prompt
obligerait à corriger huit endroits pour un mot, et l'un des huit finirait par
diverger — ce qui casse précisément la chose que ces blocs existent pour tenir :
un monde et un personnage identiques sur des générations indépendantes.

Ce script fait la substitution une fois, et vérifie qu'il n'en reste aucune.

Lancer :  python3 make-prompts.py     (après chaque édition d'un prompt)
"""

"""
=============================================================================
TEMPLATE — COPY IT INTO THE RUN FOLDER, THEN EDIT. Do not run it from here.

    cp <skill>/scripts/make-prompts.py output/<slug>/

Every run has its own script, its own clips and its own cut, so this file is a
starting point rather than a library. What you MUST change per run is listed at
the top of each block below; everything else is machinery that carries over
unchanged and is where the value is.
=============================================================================
"""

# PER RUN, EDIT: LABELS — one entry per prompt in storyboard-flow.md, IN
# DOCUMENT ORDER. The script refuses to run when the counts disagree rather
# than mislabelling silently.
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "storyboard-flow.md"
OUT = ROOT / "prompts-flow.txt"

# Ordre du document. Un prompt ajouté ou retiré dans storyboard-flow.md doit
# apparaître ici, sinon le script s'arrête au lieu de mal étiqueter.
LABELS = [
    ("INGRÉDIENT 1 — PERSONNAGE", "image", "—",
     "À générer EN PREMIER. Regarde-le vraiment avant de lancer un clip."),
    ("INGRÉDIENT 2 — OBJET FIL ROUGE", "image", "—",
     "Présent dans tous les clips."),
    ("CLIP A", "Fast", "plans 1-2", "Ingrédients : PERSONNAGE."),
    ("CLIP B", "Fast", "plans 3-4-5", "Ingrédients : PERSONNAGE."),
    ("CLIP C", "Fast", "plans 6-7", "Ingrédients : PERSONNAGE."),
    ("CLIP D", "Fast", "plan 8", "Exporte sa DERNIÈRE IMAGE pour le clip suivant."),
    ("CLIP E", "Fast", "plans 9-10-11",
     "Ingrédients + la dernière image de D en image de départ."),
]

HEADER = """PROMPTS FLOW — <sujet>, <style>, 9:16
================================================================================
Prompts DÉJÀ DÉVELOPPÉS. Rien à remplacer, rien à assembler.
Copie un bloc entier entre les lignes de tirets et colle-le dans Google Flow.

NE PAS ÉDITER CE FICHIER. Il est régénéré depuis storyboard-flow.md, qui est la
source. Pour changer un prompt : édite le storyboard, puis relance
    python3 make-prompts.py
================================================================================
"""


def main() -> None:
    blocks = re.findall(r"^```\n(.*?)^```", SRC.read_text(), re.S | re.M)
    style = next(b for b in blocks
                 if b.startswith("Handmade stop-motion")).strip()
    character = next(b for b in blocks
                  if b.startswith("<CHARACTER>")).split("\n", 1)[1].strip()
    prompts = [b for b in blocks if b.startswith("<STYLE TOKENS>")]

    if len(prompts) != len(LABELS):
        sys.exit(f"{len(prompts)} prompts dans {SRC.name} pour "
                 f"{len(LABELS)} étiquettes ici. Mets LABELS à jour plutôt que "
                 f"de laisser le script étiqueter de travers.")

    parts = [HEADER]
    for (name, tier, shots, note), p in zip(LABELS, prompts):
        body = (p.replace("<STYLE TOKENS>", style)
                 .replace("<CHARACTER>", character).strip())
        parts.append(f"\n\n{'=' * 80}\n{name}   ·   {tier}   ·   {shots}\n"
                     f"{note}\n{'-' * 80}\n\n{body}\n\n{'-' * 80}")

    text = "\n".join(parts) + "\n"
    left = [t for t in ("<STYLE TOKENS>", "<CHARACTER>") if t in text]
    if left:
        sys.exit(f"substitution incomplète, il reste : {', '.join(left)}")

    OUT.write_text(text)
    print(f"{OUT.name} — {len(LABELS)} blocs, {len(text.splitlines())} lignes, "
          f"aucun espace réservé restant")
    for (name, tier, _, _) in LABELS:
        print(f"  {name:<32} {tier}")


if __name__ == "__main__":
    main()
