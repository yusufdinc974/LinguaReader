"""Builds test/fixtures/book.epub: a tiny French EPUB 3 (with an EPUB 2 NCX)
used by the EPUB tests. It has a cover, a table of contents, a link between
chapters, a hyphen-free multi-sentence paragraph, and things the reader must
throw away (a script, an event handler, an outside image and link).

    python3 scripts/make-epub-fixture.py
"""
import struct, zipfile, zlib
from pathlib import Path

out = Path(__file__).resolve().parent.parent / 'test' / 'fixtures' / 'book.epub'

def png(w, h, rgb):
    raw = b''.join(b'\x00' + bytes(rgb) * w for _ in range(h))
    def chunk(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')

XHTML = '<?xml version="1.0" encoding="utf-8"?>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="fr"><head><title>{t}</title><style>p {{ color: red }}</style></head><body>{b}</body></html>'

files = {
    'META-INF/container.xml': '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
    'OEBPS/content.opf': '''<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="id">linguareader-test-book</dc:identifier>
    <dc:title>Le Marché sous la pluie</dc:title>
    <dc:language>fr</dc:language>
    <meta name="cover" content="cover-img"/>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="cover-img" href="images/cover.png" media-type="image/png" properties="cover-image"/>
    <item id="pic" href="images/stall.png" media-type="image/png"/>
    <item id="cover" href="text/cover.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch1" href="text/ch1.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch2" href="text/ch2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="cover"/>
    <itemref idref="ch1"/>
    <itemref idref="ch2"/>
  </spine>
</package>''',
    'OEBPS/nav.xhtml': XHTML.format(t='Table', b='<nav epub:type="toc"><ol><li><a href="text/ch1.xhtml">Chapitre un</a><ol><li><a href="text/ch1.xhtml#marche">Au marché</a></li></ol></li><li><a href="text/ch2.xhtml">Chapitre deux</a></li></ol></nav>'),
    'OEBPS/toc.ncx': '<?xml version="1.0"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><navMap><navPoint id="a"><navLabel><text>Chapitre un (NCX)</text></navLabel><content src="text/ch1.xhtml"/></navPoint></navMap></ncx>',
    'OEBPS/text/cover.xhtml': XHTML.format(t='Cover', b='<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 60 90"><image width="60" height="90" xlink:href="../images/cover.png"/></svg>'),
    'OEBPS/text/ch1.xhtml': XHTML.format(t='Chapitre un', b='''
<h1>Chapitre un</h1>
<p>Il pleuvait depuis le matin. Les étals du marché étaient vides, et les marchands rangeaient leurs caisses sous les auvents. Personne ne parlait.</p>
<p id="marche" onclick="window.pwned=1">Une vieille femme vendait des <em>pommes</em> et des poires. Elle souriait à chaque client.</p>
<script>window.pwned = 1;</script>
<p><img src="../images/stall.png" alt="Un étal"/><img src="https://example.com/track.png" alt="dehors"/></p>
<p>Voir le <a href="ch2.xhtml#fin">dernier chapitre</a> ou <a href="https://example.com/">ce site</a>.</p>
<custom-tag>Texte dans une balise inconnue.</custom-tag>
'''),
    'OEBPS/text/ch2.xhtml': XHTML.format(t='Chapitre deux', b='''
<h1>Chapitre deux</h1>
<p>Le soleil revint enfin. Les enfants couraient entre les flaques.</p>
''' + ''.join(f'<p>Paragraphe {i} : la ville se réveillait lentement, et chaque rue retrouvait sa voix.</p>' for i in range(60)) + '''
<p id="fin">Fin de l’histoire.</p>
'''),
}

out.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(out, 'w') as z:
    # The mimetype entry comes first and is stored uncompressed (EPUB OCF rule)
    z.writestr(zipfile.ZipInfo('mimetype'), 'application/epub+zip', compress_type=zipfile.ZIP_STORED)
    for name, text in files.items():
        z.writestr(name, text, compress_type=zipfile.ZIP_DEFLATED)
    z.writestr('OEBPS/images/cover.png', png(60, 90, (47, 107, 90)), compress_type=zipfile.ZIP_STORED)
    z.writestr('OEBPS/images/stall.png', png(120, 40, (200, 85, 61)), compress_type=zipfile.ZIP_STORED)
print(out, out.stat().st_size, 'bytes')
