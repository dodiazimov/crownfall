"""Lossless, same-size terrain conversion. Requires Pillow; never changes source PNGs."""
from pathlib import Path
from PIL import Image
import hashlib
import io
import json

root = Path(__file__).resolve().parents[1]
assets = root / 'dist/assets/battlefield'
records = []
for index in range(1, 11):
    stem = f'terrain-premium-{index}' + ('-v3' if index == 6 else '-v2' if index in (9, 10) else '')
    source = assets / f'{stem}.png'
    with Image.open(source) as image:
        buffer = io.BytesIO()
        image.save(buffer, format='WEBP', lossless=True, method=6, exact=True)
        content = buffer.getvalue()
        digest = hashlib.sha256(content).hexdigest()[:12]
        target = assets / f'{stem}.{digest}.webp'
        target.write_bytes(content)
        with Image.open(target) as decoded:
            assert image.convert('RGBA').tobytes() == decoded.convert('RGBA').tobytes(), source
        records.append({'map': index, 'source': str(source.relative_to(root)), 'target': str(target.relative_to(root)),
                        'dimensions': image.size, 'sourceBytes': source.stat().st_size, 'targetBytes': len(content), 'pixelsIdentical': True})
out = root / 'artifacts/web-optimization/terrain-conversion.json'
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(records, indent=2) + '\n')
print(json.dumps(records, indent=2))
