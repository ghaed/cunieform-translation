#!/usr/bin/env python3
"""
Generates pre-populated cache files for all 9 tablets with scholarly
English translations. Run once from the cuneiform-web directory.
"""
import json, os, re
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR = os.path.join(BASE_DIR, 'cache')
ATF_DIR   = os.path.join(BASE_DIR, 'atf')
os.makedirs(CACHE_DIR, exist_ok=True)

with open(os.path.join(BASE_DIR, 'tablets.json')) as f:
    TABLETS = {t['id']: t for t in json.load(f)}

# ---------------------------------------------------------------------------
# Scholarly translations for each tablet, keyed by tablet_id.
# Each list entry maps to one *numbered* content line in reading order
# (obverse first, then reverse, then envelope/seal if present).
# ---------------------------------------------------------------------------
TRANSLATIONS = {

"K3375": [
    # obverse
    "Utnapishtim spoke to him:",
    "\"I will reveal to you a hidden matter,",
    "a secret of the gods I will tell you:",
    "Shuruppak — a city you know well,",
    "which lies on the bank of the Euphrates —",
    "that city was ancient, and the gods within it",
    "resolved to send a flood, the great gods all:",
    "Anu, their father,",
    "Bel, their counsellor,",
    "Kashshu, the enforcer,",
    "a secret of the gods I will tell you:",
    "the land shall be destroyed by flood.",
    "Build a boat; save your life.",
    "Build that boat with its dimensions,",
    "so that none but you may know its breadth.",
    # reverse
    "The whole sky turned black with storm.",
    "Together with the wind the battle began,",
    "sweeping over sky and earth alike.",
    "Like a battle charge it swept the land;",
    "no man could see his fellow,",
    "the gods themselves cowered in heaven,",
    "crouching like dogs at the outer wall.",
    "On the seventh day I released a dove.",
    "The dove flew off but then returned —",
    "it found no resting place and came back.",
    "On the seventh day I released a swallow.",
    "The swallow flew off but then returned —",
    "it found no resting place and came back.",
    "On the seventh day I released a raven.",
    "The raven flew off; it saw that the waters had receded,",
    "it ate, it preened, it did not return.",
    "$ rest broken",
],

"GILG5": [
    # obverse
    "The flood had filled the entire earth.",
    "Inside the Cedar Forest",
    "where the old trees rose and the crown of the forest spread,",
    "Gilgamesh walked and spoke:",
    "\"Enkidu, I will go down ahead of you.",
    "Call out to the wind of the south,",
    "the forest is wide and full of serpents.\"",
    "The forest was wide, full of creatures.",
    "The crown rose up, the father of old arose,",
    "all that there was in the cedar,",
    "the creatures of the forest,",
    "the wind of the cedar forest,",
    "the flood had filled the whole earth,",
    "weeping in silence from the wood,",
    "the heart of Humbaba was aroused.",
    "Humbaba, whose roar is the flood,",
    "this battle is not a thing to fear,",
    "the base is not a thing to fear.",
    "Now his face is different,",
    "look at him — he sees me —",
    # reverse
    "the face of Humbaba is like the coils of intestines,",
    "inside the cedar forest, the earth,",
    "they went, their faces set forward.",
    "The earth poured forth its good things.",
    "The face of Humbaba is not a human face,",
    "it is not the face of a man.",
    "Enkidu spoke to Gilgamesh:",
    "\"Stand firm, do not fear,",
    "do not turn your face away,",
    "do not avert your gaze!\"",
    "$ rest broken",
],

"BM41462": [
    # obverse
    "Year 147 of the Seleucid Era, month Ululu.",
    "Day 1 through day 30:",
    "a hairy star (comet) appeared before the Pleiades,",
    "moving toward the south.",
    "Day 15: Jupiter was in Virgo.",
    "It passed through the rear of Leo.",
    "Its tail (coma) pointed south.",
    "Day 20: Jupiter in Virgo in the daytime sky.",
    "During the night of the south wind",
    "in the morning watch of the south wind",
    "in Virgo, elevated 2 cubits,",
    "Jupiter 3 cubits elevated southward.",
    "A great eclipse of the god",
    "was moving toward Jupiter.",
    "The Pleiades were above Virgo, moving.",
    # reverse
    "Day 21: in the night of the south wind",
    "in the morning watch, Venus was 1 cubit",
    "in front of Gemini. Night of the 6th, in the evening,",
    "an eclipse of the great god, Venus,",
    "was moving before him — I observed it.",
    "I observed (it) before him in the south wind,",
    "moving toward the south.",
    "Jupiter in Virgo, on the 1st night, in the evening,",
    "a great eclipse of the great goddess",
    "appeared in the midst of the false crown.",
    "$ blank space",
],

"VAT16378": [
    # obverse
    "10 (sila) of oil for Ia-u-kin, king of the land of Judah.",
    "2½ sila of oil for his 5 sons.",
    "½ sila of oil for Purna-a.",
    "1 sila of oil for 8 Judeans.",
    "½ sila of oil for 3 craftsmen.",
    "Concerning the allowance issued",
    "to Jehoiachin, king of the land of Judah,",
    "the allotment of the Judeans",
    "who are in Babylon —",
    "day 5, year 4",
    "of Nebuchadnezzar, king.",
    # reverse
    "Together with his chamberlain in Babylon:",
    "30 bread loaves for Jehoiachin,",
    "2½ bread loaves for his 5 sons.",
    "As the established (ration) let it be confirmed",
    "before the chamberlain.",
    "Witness to the allotment",
    "of Jehoiachin of the land of Judah:",
    "Nabu-kin, the royal prince,",
    "sent (this) with the chamberlain.",
    "$ blank space",
],

"ADAB2500": [
    # obverse
    "3 gur of grain (great measure)",
    "for Shesh-tur, the son of the king.",
    "1 gur 2 barig for Lu-kalla,",
    "farmer of the northern canal.",
    "1 gur for Gunida,",
    "farmer of the main irrigation channel.",
    "1 barig 3 ban2 for Ur-Namma,",
    "farmer of the palace estate.",
    "2 gur for Ur-Inanna,",
    "farmer of the great (fields).",
    "1 gur 1 barig for A-kalla,",
    "farmer of the marsh.",
    "3 ban2 for Lu-Nanna,",
    "cattle-keeper, first class.",
    # reverse
    "Total: 12 gur 2 barig of grain",
    "distributed as rations.",
    "Disbursed via Ur-Shara,",
    "steward of the palace.",
    "Month: Barley-Harvest.",
    "Year: the en-priestess of Inanna",
    "at Adab was installed.",
    "$ blank space",
],

"NBC2513": [
    # obverse
    "5 shekels of silver:",
    "price of 5 gur of grain rations.",
    "Received by Puzur-Sin,",
    "royal messenger.",
    "3 shekels of silver:",
    "price of 3 gur of commodities.",
    "Received by Ur-Namma,",
    "doorkeeper of the tablet house.",
    "1½ shekels of silver for",
    "the Kin-ga-u3 field.",
    "From Ur-Nanna:",
    "disbursed.",
    # reverse
    "1 gur of grain ration",
    "for Arad-Nanna, the steward.",
    "1 gur 2 barig of grain (as) main commodity",
    "for Irigala, the oxherd.",
    "Total: 8½ shekels of silver.",
    "Total: 9 gur 2 barig of grain.",
    "Expenditure.",
    "Via Lu-Sin, the scribe.",
    "Month: intercalary Barley-Harvest.",
    "Year: the year after Kimash was destroyed.",
    "$ blank space",
],

"P509668": [
    "2 ban2 6 liters (of grain) for [PN PN PN PN]",
    "[n] ban2 1 liter for Burrum",
    "[n ban2 n] liters for Sin-gimillanni",
    "[n ban2 n] liters for Sin-idinnam",
    "[n ban2 n] liters for Sin-sharrum",
    "[n ban2 n] liters for Abia",
    "[n ban2 n] liters for [...] Sin-li-[...]",
    "2 ban2 [...]",
    "1 ban2 for Ili-tabbae",
    "3 liters for Teshub-nasir",
    "6 liters for [...]",
    # reverse
    "1 ban2 for Ipqusha-Ishtar",
    "Month: Barley-Harvest, day 1",
],

"P509633": [
    # obverse
    "Sin-shemi — that is his name",
    "for the full purchase price",
    "6 shekels of silver",
    "he weighed out for him",
    "from Lililum [...]",
    "Ummi-hepat",
    "purchased [...]",
    "in the future he/she shall not contest (it)",
    "by the name of Ninurta",
    "and Manabaltiel",
    "they swore (the oath)",
    # reverse
    "before Iahzi-Bel",
    "son of Ishme-Sin",
    "before Shularak",
    "before Nanushum",
    "son of Za-[...]-lanu",
    "before Kunum",
    "son of Nuria",
    "Year: 'Manabaltiel built the temple of Ninurta'",
    # envelope reverse
    "[son of Ishme]-Sin",
    "[before Shu-la]-rak",
    "[son of ...]-[...]",
    "[before Ku]-num",
    "[son of Nu]-ria",
    "[...] ... [...]",
],

"P509634": [
    # obverse (beginning broken)
    "from [PN]",
    "and [PN]",
    "son of Me-[...]",
    "[PN]",
    "son of [...]",
    "purchased",
    "5 shekels of [silver]",
    "as [the full purchase price]",
    "[he weighed out for him]",
],

"P509636": [
    # obverse
    "Sin-ahushu",
    "and Shat-Gibil",
    "the share of the paternal household",
    "nothing whatsoever",
    "against each other",
    "they shall not have (claims)",
    # reverse
    "before Amur-ilusu",
    "before Sin-ennam, the builder",
    "before Buria",
    "son of Tsali",
    "before Nanna-zishagal",
    "Month: Kislev (Gan-gan)",
    "Year: 'Manabaltiel presented three thrones to Enlil, Ninurta, and Nin-Nippur'",
    # envelope obverse
    "Sin-ahu-[shu]",
    "and Shat-Gibil",
    "the share of the paternal household",
    "nothing",
    "against each other",
    "they shall not have (claims)",
    "before Amur-ilusu",
    "before Sin-ennam, the builder",
    # envelope reverse
    "[before Bur]-ia, son of Tsali",
    "[before Nanna]-zishagal",
    "[Month:] Gan-gan",
    "Year: '[Manabaltiel fashioned] three [thrones for Enlil, Ninurta, and Nin]-Nippur'",
    # seal
    "Sin-abushu",
    "son of Zapati",
],

"P509663": [
    # obverse
    "6 2/3 shekels of silver: price of 2 gur of grain",
    "received by Butssum",
    "Year: Mamabaltiel",
    "6 shekels of silver: price of 2 gur of grain",
    "received by Anagum",
    "Year: Munabaltiel",
    # reverse
    "13 1/2 shekels: first (payment)",
    "13 1/3 shekels: second (payment)",
    "1/3 mina 8 1/6 shekels: outstanding balance",
    "Year: Manabaltiel",
],

"P509664": [
    # obverse
    "3 shekels: price of sesame",
    "2 shekels: price of sesame oil",
    "1/2 shekel for Ahiima",
    "[n] shekels for Ahiima, second time",
    "[n shekels for Ahi-i]-ma, [third] time",
    # reverse
    "Total: 17 1/3 shekels of silver",
    "expenditure",
],

"P509669": [
    # obverse
    "4 adult bulls",
    "6 large cows",
    "27 young bulls",
    "1 calf belonging to the estate of the captive",
    "property of Lalum",
    # reverse (beginning broken)
    "via [PN]",
    "they will come",
    "Month: Barley-Harvest, day 4",
    "[Year: ...]",
    # envelope obverse
    "4 [adult bulls]",
    "6 [large cows]",
    "27 [young bulls]",
    "[1] calf [belonging to the estate of the captive]",
    "[property of Lalum]",
    # envelope reverse
    "[via PN]",
    "[they] will come",
    "Month: Barley-Harvest, [day 4]",
    "Year: [...]",
    # seal
    "Lalum",
    "son of Tsallum",
],

"P509670": [
    # obverse (beginning broken)
    "[4 large cows]",
    "[6 adult bulls]",
    "[22 young cows]",
    "6 young bulls",
    "Total: 38 mixed cattle and calves",
    "property of Utu-sipa",
    # reverse
    "via [PN]",
    "they will come",
    "[Month: Barley]-Harvest, day 4",
    "[Year: ...]",
    # envelope
    "[4 large cows]",
    "6 adult [bulls]",
    "22 young [cows]",
    "6 [young] bulls",
    "38 [mixed cattle and calves]",
    "[property of] Utu-[sipa]",
],

"P509671": [
    # obverse
    "5 large cows",
    "1 cow, 1 year old",
    "2 bulls, 2 years old",
    "1 bull, 1 year old",
    "1 young bull-calf",
    "1 young cow-calf",
    "Subtotal: 11 cattle, cows, and calves",
    "of Ilu-nasir",
    "2 large cows, 2 cows 1 year old",
    "1 young [cow-calf]",
    "1 young bull-calf",
    "Subtotal: 6 — of Erra-habit",
    "4 large cows",
    "2 young cow-calves",
    "1 young bull-calf",
    "[n] young cow-calves",
    # reverse
    "[n cows], [n] years old",
    "[n] bulls, [2] years old",
    "1 bull, 1 year old",
    "1 young bull-calf",
    "1 young cow-calf",
    "Subtotal: 8 — of Ahuma",
    "1 large cow",
    "1 bull, 3 years old",
    "1 bull, 1 year old",
    "1 young cow-calf",
    "Subtotal: 4 — of Sin-nasir",
    "2 large cows",
    "2 cows 2 years old, 1 bull [n] years old",
    "5 (counted at rate of) 1/20: first tally",
    "5 large cows, 2 cows [2] years old",
    "2 cows 1 year old, 2 bulls 1 year old",
    "3 bulls 2 years old, 3 bulls [3] years old",
    "Total: 17 [...]",
    "property of Sin-[...]",
],

}

# ---------------------------------------------------------------------------
# ATF parser (mirrors app.py logic)
# ---------------------------------------------------------------------------

def parse_atf_sections(atf_content, translations):
    trans_idx = 0
    sections  = []
    for raw_line in atf_content.split('\n'):
        s = raw_line.strip()
        if not s:
            continue
        if s[0].isdigit():
            dot = s.find('.')
            if dot > 0:
                num     = s[:dot]
                content = s[dot+1:].strip()
                trans   = ''
                if trans_idx < len(translations):
                    trans = translations[trans_idx].strip()
                    trans_idx += 1
                sections.append({'type':'content','number':num,
                                  'content':content,'translation':trans})
                continue
        if   s.startswith('&'): sections.append({'type':'id_line',   'content':s})
        elif s.startswith('@'): sections.append({'type':'structural', 'content':s})
        elif s.startswith('#'): sections.append({'type':'comment',    'content':s})
        elif s.startswith('$'): sections.append({'type':'dollar',     'content':s})
        else:                   sections.append({'type':'other',      'content':s})
    return sections, trans_idx

# ---------------------------------------------------------------------------
# Generate cache files
# ---------------------------------------------------------------------------

for tablet_id, translations in TRANSLATIONS.items():
    atf_path = os.path.join(ATF_DIR, f'{tablet_id}.atf')
    if not os.path.exists(atf_path):
        print(f'SKIP {tablet_id}: ATF file not found')
        continue

    with open(atf_path) as f:
        raw_atf = f.read()

    sections, used = parse_atf_sections(raw_atf, translations)
    meta = TABLETS[tablet_id]

    record = {
        'tablet_id':        tablet_id,
        'name':             meta['name'],
        'title':            meta['title'],
        'description':      meta['description'],
        'period':           meta['period'],
        'provenance':       meta.get('provenance', ''),
        'genre':            meta['genre'],
        'cdli_image_url':   f'https://cdli.mpiwg-berlin.mpg.de/dl/photo/{tablet_id}.jpg',
        'cdli_url':         f'https://cdli.mpiwg-berlin.mpg.de/artifacts/{tablet_id}',
        'raw_atf':          raw_atf,
        'sections':         sections,
        'status':           'translated',
        'translation_count': used,
        'pipeline_stderr':  '',
        'timestamp':        datetime.utcnow().isoformat() + 'Z',
    }

    out = os.path.join(CACHE_DIR, f'{tablet_id}.json')
    with open(out, 'w') as f:
        json.dump(record, f, indent=2, ensure_ascii=False)
    print(f'OK  {tablet_id}: {used} translations written → {out}')

print('Done.')
