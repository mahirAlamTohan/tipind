#!/usr/bin/env python3
"""
Builds the client content questionnaire (.docx) for the tipind site.

Every user-visible string on the site that is currently a placeholder is listed
here, grouped by section and tagged with a priority, so the client can answer in
order of what actually blocks launch.

Run with the venv that has python-docx:
    /tmp/.venv-docx/bin/python scripts/build-client-questionnaire.py
"""
from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

OUT = "docs/TIPIND-CLIENT-CONTENT-QUESTIONNAIRE.docx"

# Brand-ish palette so the doc does not look like a raw table dump.
INK = RGBColor(0x0F, 0x20, 0x3A)
BLUE = RGBColor(0x1D, 0x4E, 0xD8)
MUTED = RGBColor(0x5A, 0x64, 0x78)
RED = RGBColor(0xB4, 0x23, 0x18)
AMBER = RGBColor(0x9A, 0x63, 0x00)
GREEN = RGBColor(0x1B, 0x6B, 0x3A)

PRIORITY = {
    "P0": ("BLOCKER", RED, "The site cannot go live without this. Nothing else matters until these are answered."),
    "P1": ("ESSENTIAL", AMBER, "Needed before launch. Legal, trust or money is affected if these are wrong."),
    "P2": ("POLISH", GREEN, "Real content preferred, but the site works and looks finished without it."),
}

doc = Document()

# ── page setup ────────────────────────────────────────────────────────────────
for section in doc.sections:
    section.page_width = Cm(21.0)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(2.0)
    section.bottom_margin = Cm(2.0)
    section.left_margin = Cm(2.2)
    section.right_margin = Cm(2.2)

styles = doc.styles
normal = styles["Normal"]
normal.font.name = "Calibri"
normal.font.size = Pt(10.5)
normal.paragraph_format.space_after = Pt(6)
normal.paragraph_format.line_spacing = 1.15


def shade(cell, hex_color):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:fill"), hex_color)
    tc_pr.append(shd)


def cell_text(cell, text, *, bold=False, size=9.5, color=None, align=None):
    cell.text = ""
    p = cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.space_before = Pt(2)
    if align is not None:
        p.alignment = align
    run = p.add_run(text)
    run.bold = bold
    run.font.size = Pt(size)
    if color is not None:
        run.font.color.rgb = color


def badge(cell, label, color):
    """Priority chip: coloured cell with white bold text."""
    cell.text = ""
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.space_before = Pt(2)
    run = p.add_run(label)
    run.bold = True
    run.font.size = Pt(8)
    run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)


def h1(text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(18)
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run(text)
    r.bold = True
    r.font.size = Pt(16)
    r.font.color.rgb = INK
    return p


def h2(text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(3)
    r = p.add_run(text)
    r.bold = True
    r.font.size = Pt(12)
    r.font.color.rgb = BLUE
    return p


def body(text, *, italic=False, color=None, size=10.5, space_after=6):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(space_after)
    r = p.add_run(text)
    r.italic = italic
    r.font.size = Pt(size)
    if color is not None:
        r.font.color.rgb = color
    return p


def rule():
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    p_pr = p._p.get_or_add_pPr()
    borders = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "6")
    bottom.set(qn("w:color"), "D8DEE9")
    borders.append(bottom)
    p_pr.append(borders)


# ── cover ─────────────────────────────────────────────────────────────────────
p = doc.add_paragraph()
p.paragraph_format.space_before = Pt(60)
r = p.add_run("TIPIND WEBSITE")
r.bold = True
r.font.size = Pt(11)
r.font.color.rgb = BLUE
r.font.color.rgb = BLUE

p = doc.add_paragraph()
p.paragraph_format.space_after = Pt(2)
r = p.add_run("Content & details\nquestionnaire")
r.bold = True
r.font.size = Pt(34)
r.font.color.rgb = INK

body(
    "Everything the website needs from you, in one place, ordered by what matters most.",
    size=12,
    color=MUTED,
)

rule()
body(
    "How to use this document: answer only the yellow and red sections first — those are the "
    "ones stopping launch. Green text is polish. You can type your answers directly into the "
    "'Your answer' column, or reply by email pointing at the question numbers. If you do not "
    "care about a question, write 'you decide' and we will keep what is there now.",
    size=10,
    color=MUTED,
)

# Priority legend
h2("Priority key")
legend = doc.add_table(rows=1, cols=3)
legend.style = "Table Grid"
legend.alignment = WD_TABLE_ALIGNMENT.CENTER
legend.autofit = False
widths = [Cm(3.4), Cm(3.4), Cm(9.8)]
# Set the width on the column as well as the cell, otherwise Word autofits and
# the three chips end up different sizes.
for col, w in zip(legend.columns, widths):
    col.width = w
for cell, w in zip(legend.rows[0].cells, widths):
    cell.width = w
for i, key in enumerate(["P0", "P1", "P2"]):
    label, color, desc = PRIORITY[key]
    cell = legend.rows[0].cells[i]
    cell.text = ""
    p = cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.space_before = Pt(2)
    run = p.add_run(f"{key} — {label}")
    run.bold = True
    run.font.size = Pt(9.5)
    run.font.color.rgb = color

row = legend.add_row()
for i in range(3):
    cell = row.cells[i]
    cell.width = widths[i]
for i, key in enumerate(["P0", "P1", "P2"]):
    label, color, desc = PRIORITY[key]
    cell_text(row.cells[i], desc, size=8.5, color=MUTED)

doc.add_page_break()

# ── summary of blocking items ────────────────────────────────────────────────
h1("Read this first — what blocks launch")
body(
    "Five things cannot be guessed, cannot be defaulted, and will actively cost money or "
    "credibility if they ship wrong:",
    space_after=8,
)

blockers = [
    ("1", "Contact channels", "WhatsApp number, email, phone. These are the only way a customer can order. Wrong number = zero sales."),
    ("2", "Shipping countries", "The checkout dropdown accepts five countries (USA, UK, New Zealand, Australia and India), while the FAQ and the checkout notice both say four. The site contradicts itself — one authoritative list is needed."),
    ("3", "Payment methods", "Currently lists Bitcoin, USDT, ETH, USDC. If this is wrong, customers arrive ready to pay a way you cannot accept."),
    ("4", "Reshipment / refund policy", "Currently a placeholder describing a no-refund, conditional-reship policy. This is a legal statement about money. It must be exactly what you intend."),
    ("5", "Support hours + timezone", "Shown in the header and the contact section. Affects when customers expect replies."),
]
t = doc.add_table(rows=1, cols=3)
t.style = "Table Grid"
for cell, w in zip(t.rows[0].cells, [Cm(0.9), Cm(4.2), Cm(11.5)]):
    cell.width = w
for cell, txt in zip(t.rows[0].cells, ["#", "Item", "Why it blocks launch"]):
    cell_text(cell, txt, bold=True, size=9.5, color=RGBColor(0xFF, 0xFF, 0xFF))
    shade(cell, "1D4ED8")
for num, item, why in blockers:
    row = t.add_row()
    for cell, w in zip(row.cells, [Cm(0.9), Cm(4.2), Cm(11.5)]):
        cell.width = w
    cell_text(row.cells[0], num, bold=True, size=9.5)
    cell_text(row.cells[1], item, bold=True, size=9.5)
    cell_text(row.cells[2], why, size=9)

body("", space_after=4)
body(
    "If you only answer five things in this whole document, answer these five.",
    italic=True,
    size=9.5,
    color=MUTED,
)

# ── the question table helper ────────────────────────────────────────────────
COUNTS = {"P0": 0, "P1": 0, "P2": 0, "total": 0}


def tally(prio):
    COUNTS["total"] += 1
    if prio in COUNTS:
        COUNTS[prio] += 1


def question_table(rows, intro=None):
    """rows: (id, priority, location, question, current_placeholder)"""
    if intro:
        body(intro, size=9.5, color=MUTED, space_after=8)
    table = doc.add_table(rows=1, cols=5)
    table.style = "Table Grid"
    table.autofit = False
    widths = [Cm(1.3), Cm(1.2), Cm(3.4), Cm(5.0), Cm(5.7)]
    headers = ["#", "Priority", "Where it appears", "Question", "Currently showing / your answer"]
    for cell, w, txt in zip(table.rows[0].cells, widths, headers):
        cell.width = w
        cell_text(cell, txt, bold=True, size=8.5, color=RGBColor(0xFF, 0xFF, 0xFF))
        shade(cell, "0F203A")
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER

    for qid, prio, where, question, current in rows:
        tally(prio)
        row = table.add_row()
        for cell, w in zip(row.cells, widths):
            cell.width = w
        cell_text(row.cells[0], qid, bold=True, size=8.5)
        label, color, _ = PRIORITY[prio]
        badge(row.cells[1], prio, color)
        shade(row.cells[1], {RED: "FBE3E0", AMBER: "FDF0D5", GREEN: "DFF3E4"}[color])
        # priority text colour needs to be dark on the light chip
        for p in row.cells[1].paragraphs:
            for r in p.runs:
                r.font.color.rgb = color
        cell_text(row.cells[2], where, size=8.5, color=MUTED)
        cell_text(row.cells[3], question, size=8.5)
        cell.text = ""
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.space_before = Pt(2)
        r = p.add_run(current)
        r.font.size = Pt(8.5)
        r.font.color.rgb = MUTED
        r.italic = True
        p2 = cell.add_paragraph()
        p2.paragraph_format.space_before = Pt(4)
        r2 = p2.add_run("Answer: ")
        r2.font.size = Pt(8.5)
        r2.bold = True

    return table


# ══════════════════════════════════════════════════════════════════════════════
doc.add_page_break()
h1("1. Contact & ordering channels")
question_table(
    [
        ("1.1", "P0", "Header strip, footer, contact section, every 'WhatsApp us' button, floating chat button",
         "What is the WhatsApp number customers should message? Include the country code.",
         "+91 8766267499 (wa.me/918766267499)"),
        ("1.2", "P0", "Header strip, footer, contact section, 404 page, JSON-LD for Google",
         "What email address should receive orders and enquiries?",
         "shop@tipind.ru"),
        ("1.3", "P0", "Header strip (phone icon), contact section",
         "Is there a phone number to show, or should the phone line be removed and only WhatsApp + email used?",
         "+91 8766267499 (same as WhatsApp)"),
        ("1.4", "P1", "Contact section, checkout 'Contact options'",
         "Is there a Telegram account? If yes, what is the username? If no, we remove the Telegram link.",
         "@tipind (t.me/tipind)"),
        ("1.5", "P0", "Header strip ('trusted partner since'), contact section",
         "What are your support hours, and in which timezone? Which days are you closed?",
         "Monday – Saturday · 9:00 AM – 8:00 PM IST"),
        ("1.6", "P1", "Footer, contact section",
         "Is there a physical business address you want listed? Or is the business online-only?",
         "Not shown anywhere currently"),
    ],
    intro="These decide whether a customer can actually reach you. Everything in P0 here is a hard launch blocker.",
)

doc.add_page_break()
h1("2. Company identity & claims")
question_table(
    [
        ("2.1", "P0", "Browser tab, logo, footer, JSON-LD, social preview images",
         "Is the business name exactly 'TIPIND' (all caps), 'Tipind', or something else? Is there a full legal name?",
         "tipind (displayed uppercase as TIPIND)"),
        ("2.2", "P0", "Hero eyebrow, about section, footer, JSON-LD founding date",
         "What year was the business established?",
         "2012"),
        ("2.3", "P1", "Hero section headline",
         "The hero currently reads 'Quality medicines. / Better healthcare.' Is this the message you want as the first thing a customer reads? Keep, or replace?",
         "Quality medicines. / Better healthcare."),
        ("2.4", "P2", "Hero section paragraph",
         "One short paragraph under the headline explaining what you do. Max ~2 sentences.",
         "Quality medicines support better healthcare. We provide reliable access to generic and ethical-brand products, backed by thoughtful service and international shipping from India."),
        ("2.5", "P1", "About section",
         "Short paragraph about the business — who you are, what you supply, why customers should trust you. 2–3 sentences.",
         "'{name} has supplied generic medicines and ethical-brand medications from India since {founded}, with a focus on reliable service, competitive pricing and international shipping.'"),
        ("2.6", "P2", "Hero section, three small badges",
         "Three short trust points shown as small labels. Currently: 'Quality focused', 'Worldwide shipping', 'Carefully sourced healthcare'.",
         "Quality focused · Worldwide shipping · Carefully sourced healthcare"),
        ("2.7", "P1", "Footer (legal notice)",
         "The legal/disclaimer text shown in the footer. Any disclaimer you are required to show? (medical advice, prescription, liability)",
         "Information on this website is for general informational purposes only and should not replace professional medical advice. Prescription medicines should be used only under the guidance of a qualified healthcare professional."),
    ],
    intro="Identity and trust. 2.1 and 2.2 are blocking because they appear in Google's structured data and social previews.",
)

doc.add_page_break()
h1("3. Shipping & delivery")
question_table(
    [
        ("3.1", "P0", "Checkout country dropdown, about section, footer, FAQ",
         "Exactly which countries do you ship to, today? This list drives the checkout dropdown, so an incomplete list blocks real orders and a wrong one creates orders you cannot fulfil.",
         "USA, UK, New Zealand, Australia, India — but the FAQ says only the first four"),
        ("3.2", "P0", "FAQ 'Which countries are you shipping to?'",
         "Are there countries you explicitly do NOT ship to that you want named on the site? The current answer names Europe and Canada — please confirm.",
         "Says 'not Europe, not Canada' — conflicts with 3.1, needs one answer"),
        ("3.3", "P1", "FAQ processing & delivery",
         "How long to pack and dispatch, and how long delivery usually takes?",
         "2–5 business days to dispatch; ~2–3 weeks delivery"),
        ("3.4", "P2", "FAQ shipping method",
         "Which carrier(s) do you use, and where do packages ship from?",
         "India Post or another postal service, dispatched from India"),
        ("3.5", "P1", "FAQ minimum order",
         "Is there a minimum order value or quantity?",
         "No minimum order quantity"),
        ("3.6", "P2", "FAQ signature / real name",
         "Do you require a signature on delivery? Do customers need to use their real name?",
         "Signature 'may be required'; real name advised"),
    ],
    intro="Shipping is the second-most blocking area: the checkout form only accepts the countries listed in the code.",
)

doc.add_page_break()
h1("4. Payment, returns and policies")
body(
    "Everything in this section is a statement about money and is currently placeholder text. "
    "A wrong claim here is the highest-risk content on the site — it is what a customer will "
    "quote back to you in a dispute.",
    size=9.5,
    color=RED,
    space_after=8,
)
question_table(
    [
        ("4.1", "P0", "FAQ 'How can I pay?', checkout payment dropdown",
         "Which payment methods do you actually accept? List them exactly as a customer should see them.",
         "Bitcoin (BTC), USDT (ERC-20), USDT (TRC-20), Ethereum (ETH), USDC (ERC-20)"),
        ("4.2", "P0", "FAQ reshipment policy",
         "What is your refund / reshipment policy, in your own words? When do you reship, when do you refuse, is anything refundable?",
         "All sales final, no refunds; reship considered if seized with docs, lost in transit, or no tracking >20 days"),
        ("4.3", "P0", "FAQ 'what if a reshipment is seized'",
         "If a replacement shipment is also seized, what happens?",
         "No refunds; may offer products at base cost for another attempt"),
        ("4.4", "P1", "FAQ wrong/missing item",
         "If an order arrives missing an item or with a different brand, what do you promise?",
         "Send it promptly or include with next order; equivalent-or-higher-value substitution"),
        ("4.5", "P2", "FAQ tracking",
         "How long can tracking be silent before a customer should worry?",
         "Up to two weeks without an update is normal"),
        ("4.6", "P1", "Cart panel, price notice",
         "The cart shows 'prices are based on catalog rates; final pricing confirmed at order'. Is that accurate, and is the catalog USD pricing final?",
         "Prices are based on the listed catalog rate for each pack."),
        ("4.7", "P2", "Checkout",
         "Should customers pick a payment method at checkout, or leave it to be decided with your team?",
         "Currently 'Decide with the team'"),
    ],
    intro="Read 4.1–4.3 twice. These are the answers a customer will hold you to.",
)

doc.add_page_break()
h1("5. Catalogue & product data")
question_table(
    [
        ("5.1", "P0", "Whole catalogue (8,522 products)",
         "The catalogue currently comes from a spreadsheet snapshot. Is this the current, authoritative product list and pricing? Who updates it?",
         "8,522 products, generated from a Google Sheet export"),
        ("5.2", "P1", "Catalog prices",
         "Are the listed prices USD, and are they per-pack as shown? Are they retail prices or indicative?",
         "USD, per pack, e.g. $0.446 per 1x10"),
        ("5.3", "P2", "Catalog filter facets",
         "Do you need any product attributes the catalogue does not currently have (e.g. prescription-only flag, strength, form)?",
         "Manufacturer, packaging, price, active ingredient"),
        ("5.4", "P1", "FAQ / checkout",
         "Are any products prescription-only or restricted, and does the site need to say so?",
         "Nothing on the site mentions prescription requirements"),
    ],
    intro="Product data mostly exists already — this is about confirming it is the live source and whether legal flags are missing.",
)

doc.add_page_break()
h1("6. FAQ — confirm, correct or replace")
body(
    "The FAQ currently contains eleven answers that were written as placeholder copy. Each one "
    "below needs a yes/no confirmation at minimum. If any answer is wrong, write the correct "
    "wording in the last column.",
    size=9.5,
    color=MUTED,
    space_after=8,
)

faq_rows = [
    ("6.1", "P0", "How can I pay?", "See 4.1 — the payment list must match reality."),
    ("6.2", "P1", "How do you ship, and where are orders shipped from?", "Dispatched from India via India Post or similar."),
    ("6.3", "P1", "What if an order is missing an item or the wrong brand arrives?", "See 4.4."),
    ("6.4", "P2", "Why hasn't my tracking information been updated?", "Up to two weeks of silence is normal."),
    ("6.5", "P0", "What is your reshipment policy?", "See 4.2."),
    ("6.6", "P0", "What happens if a reshipment is also seized?", "See 4.3."),
    ("6.7", "P0", "Which countries do you ship to?", "See 3.1/3.2 — currently contradictory."),
    ("6.8", "P1", "How long does processing and delivery take?", "See 3.3."),
    ("6.9", "P2", "Is there a minimum order quantity?", "See 3.5."),
    ("6.10", "P2", "Do I need to sign for my package?", "See 3.6."),
    ("6.11", "P2", "Do I need to use my real name on the shipping address?", "See 3.6."),
    ("6.12", "P1", "— missing —", "Is there a question customers ask constantly that isn't here? Add it."),
]
table = doc.add_table(rows=1, cols=4)
table.style = "Table Grid"
widths = [Cm(1.3), Cm(1.4), Cm(7.4), Cm(7.5)]
for cell, w, txt in zip(table.rows[0].cells, widths, ["#", "Priority", "Existing FAQ question", "Verdict / correction"]):
    cell.width = w
    cell_text(cell, txt, bold=True, size=8.5, color=RGBColor(0xFF, 0xFF, 0xFF))
    shade(cell, "0F203A")
for qid, prio, question, note in faq_rows:
    tally(prio)
    row = table.add_row()
    for cell, w in zip(row.cells, widths):
        cell.width = w
    cell_text(row.cells[0], qid, bold=True, size=8.5)
    _, color, _ = PRIORITY[prio]
    cell_text(row.cells[1], prio, bold=True, size=8.5, color=color)
    shade(row.cells[1], {RED: "FBE3E0", AMBER: "FDF0D5", GREEN: "DFF3E4"}[color])
    cell_text(row.cells[2], question, size=8.5)
    cell_text(row.cells[3], note, size=8.5, color=MUTED)

doc.add_page_break()
h1("7. SEO, social previews and technical strings")
body(
    "These are the words Google and messaging apps show before anyone visits the site. "
    "2.1 and 7.1 are the two that matter most; the rest can stay as-is.",
    size=9.5,
    color=MUTED,
    space_after=8,
)
question_table(
    [
        ("7.1", "P1", "Google search result, social shares, JSON-LD",
         "The meta description (the grey paragraph under the site name in Google). Currently 178 characters. Keep or rewrite?",
         "tipind supplies generic medicines and ethical brand medications from India. Browse the pharmaceutical catalog or contact our team for ordering assistance."),
        ("7.2", "P2", "Browser tab, social preview title",
         "The tagline appended to the name in titles and shares.",
         "Pharmaceutical healthcare you can trust"),
        ("7.3", "P2", "Social preview image (1200×630)",
         "Should the social preview image keep the auto-generated pill/brand artwork, or do you have a real photo?",
         "Auto-generated brand artwork"),
        ("7.4", "P2", "Google keywords",
         "Any specific search terms you want to rank for? (Low impact, but free to set.)",
         "pharmaceutical catalog, generic medicines, healthcare supply"),
        ("7.5", "P0", "Canonical URL, sitemap, JSON-LD, social image URLs",
         "What will the final domain be? (e.g. tipind.com) The site is currently configured for a temporary Cloudflare URL.",
         "https://tipind.mahiralamtohan.workers.dev"),
        ("7.6", "P1", "Manifest / add-to-home-screen",
         "Shown when someone installs the site to their phone home screen.",
         "TIPIND"),
    ],
    intro=None,
)

doc.add_page_break()
h1("8. Legal & compliance")
body(
    "I am not a lawyer and have not invented these answers. Each item below is either missing "
    "from the site or present as guesswork. Please answer or tell us to leave it out.",
    size=9.5,
    color=RED,
    space_after=8,
)
question_table(
    [
        ("8.1", "P1", "Footer, checkout",
         "Do you need a privacy policy page? If the site stores cart + delivery details in the visitor's own browser only, you may still want to say so.",
         "No privacy policy page exists"),
        ("8.2", "P1", "Footer, checkout",
         "Do you need terms & conditions / a terms of sale page?",
         "No terms page exists"),
        ("8.3", "P1", "Whole site",
         "Are you required to display a company registration number, VAT number or similar?",
         "None displayed"),
        ("8.4", "P2", "Footer",
         "Cookie notice: the site currently stores cart and theme preference locally. Do you want a cookie banner?",
         "No cookie banner"),
        ("8.5", "P1", "FAQ, footer",
         "Any regulatory wording required for pharmaceutical sales in your jurisdiction?",
         "Only a general 'not medical advice' disclaimer"),
    ],
)

# ── closing ──────────────────────────────────────────────────────────────────
doc.add_page_break()
h1("What we will do with your answers")
body(
    "Every answer gets written into the site's content files, not hard-coded into pages, so "
    "changing a phone number later is a one-line edit. Once the P0 items are answered we can "
    "remove every remaining placeholder and the site is launch-ready.",
)
body("Suggested order:", space_after=2)
for line in [
    "1. Answer section 1 (contact) and 4.1–4.3 (payment + policy) — this alone unblocks nearly everything.",
    "2. Answer section 3.1/3.2 (shipping countries) so the checkout form is correct.",
    "3. Answer section 2 (identity) and 7.5 (final domain).",
    "4. Everything in section 5–8 can follow after launch if needed.",
]:
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Cm(0.5)
    p.paragraph_format.space_after = Pt(3)
    r = p.add_run(line)
    r.font.size = Pt(10)

rule()
body(
    f"Questions in this document: {COUNTS['total']}.  "
    f"Blocking (P0): {COUNTS['P0']}.  "
    f"Essential (P1): {COUNTS['P1']}.  "
    f"Polish (P2): {COUNTS['P2']}.",
    italic=True,
    size=9,
    color=MUTED,
)

doc.save(OUT)
print("wrote", OUT)
