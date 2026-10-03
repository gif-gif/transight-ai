"""Validate store assets and archive; write a reproducible material inventory."""
from pathlib import Path
from PIL import Image
import argparse, hashlib, io, json, zipfile
from datetime import date

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--assets-only", action="store_true", help="Validate materials and record archive drift without requiring a release-ready ZIP")
args = parser.parse_args()

OUT=Path(__file__).resolve().parents[1]
ROOT=OUT.parent
manifest=json.loads((ROOT/'manifest.json').read_text())
metadata=json.loads((OUT/'listing/metadata.json').read_text())
assert set(metadata['localizations']) == {p.name for p in (ROOT/'_locales').iterdir() if p.is_dir()}, 'Listing locales must match packaged locales'
assert metadata['version']==manifest['version'], 'Update listing metadata after a version change'
for locale, record in metadata['localizations'].items():
    strings=json.loads((ROOT/f'_locales/{locale}/messages.json').read_text())
    assert record['name']==strings['extensionName']['message']
    assert record['short_description']==strings['extensionDescription']['message']
    assert len(record['short_description'])==record['description_character_count']<=132
for filename in ['description.en.txt','description.zh-CN.txt','description.zh-TW.txt','description.ja.txt','description.ko.txt']:
    assert (OUT/'listing'/filename).stat().st_size>0
dashboard_docs=['01-store-listing.md','02-privacy-practices.md','03-distribution.md','04-test-instructions.md']
for filename in dashboard_docs:
    assert (OUT/'dashboard'/filename).stat().st_size>0, filename
privacy=(OUT/'dashboard/02-privacy-practices.md').read_text()
for permission in manifest['permissions'] + manifest['host_permissions']:
    assert permission in privacy, f'Missing permission explanation: {permission}'
expected={'icons/icon-128.png':(128,128),'promo/small-440x280.png':(440,280),'promo/marquee-1400x560.png':(1400,560)}
for locale in ['en','zh-CN','zh-TW','ja','ko']:
    screenshots=sorted((OUT/'screenshots'/locale).glob('*.png'))
    assert 1<=len(screenshots)<=5
    expected.update({str(p.relative_to(OUT)):(1280,800) for p in screenshots})
for filename,dimensions in expected.items():
    im=Image.open(OUT/filename)
    assert im.size==dimensions and im.format=='PNG', filename
    assert im.mode==('RGBA' if filename.startswith('icons/') else 'RGB'), filename
icon=Image.open(OUT/'icons/icon-128.png')
assert icon.getchannel('A').getbbox()==(16,16,112,112)
archive=OUT/'package'/f'transight-{manifest["version"]}.zip'
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    names=z.namelist()
    assert 'manifest.json' in names and 'LICENSE' in names
    assert all(n in ('manifest.json', 'LICENSE') or n.startswith(('assets/','src/','_locales/')) for n in names)
    assert not any('..' in Path(n).parts or n.startswith('/') or Path(n).name.startswith('.') for n in names)
    manifest_matches = json.loads(z.read('manifest.json'))==manifest
    assert z.read('assets/icon-128.png')==(OUT/'icons/icon-128.png').read_bytes()
    # Compare the complete runtime set too, so new source files missing from
    # an older archive cannot accidentally pass source parity.
    expected_runtime = {'manifest.json', 'LICENSE'}
    for directory, extensions in [('src', {'.js', '.css', '.html'}), ('assets', {'.png', '.svg'}), ('_locales', {'.json'})]:
        for path in (ROOT/directory).rglob('*'):
            if path.is_file() and path.suffix in extensions and not any(part.startswith('.') for part in path.relative_to(ROOT).parts):
                expected_runtime.add(str(path.relative_to(ROOT)))
    archived_runtime = {name for name in names if not name.endswith('/')}
    missing = sorted(expected_runtime - archived_runtime)
    extra = sorted(archived_runtime - expected_runtime)
    changed = sorted(name for name in expected_runtime & archived_runtime
                     if name != 'assets/icon-128.png' and z.read(name) != (ROOT/name).read_bytes())
    source_matches = manifest_matches and not (missing or extra or changed)
    assert Image.open(io.BytesIO(z.read('assets/icon-128.png'))).size==(128,128)
    archive_count=len(archived_runtime)
archive_status = 'current' if source_matches else 'outdated: listing and screenshots are current; existing ZIP does not match source and must be rebuilt before submission'
files=[]
for p in sorted(OUT.rglob('*')):
    if not p.is_file() or p.name=='inventory.json' or p.name.startswith('.'):continue
    record={'path':str(p.relative_to(OUT)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
    if p.suffix=='.png':
        im=Image.open(p);record.update(width=im.width,height=im.height,mode=im.mode)
    files.append(record)
report={'prepared_date':date.today().isoformat(),'version':manifest['version'],'archive':str(archive.relative_to(OUT)),
        'checks':{'manifest_at_zip_root':True,'runtime_and_license_only':True,'archive_source_match_except_store_icon':source_matches,'runtime_file_count':archive_count,'description_limit_132':True,'dimensions_and_image_modes_valid':True,'dashboard_guides_present':True,'permission_explanations_present':True},
        'validation_mode':'assets-only' if args.assets_only else 'release',
        'archive_status':archive_status,'ready_to_upload_archive':source_matches,
        'archive_differences':{'missing':missing,'extra':extra,'changed':changed},
        'sources':{'icon':'assets/icon-128.png','screenshots':['artifacts/screenshots/{en-US,zh-CN,zh-TW,ja-JP,ko-KR}/popup-multi.png','artifacts/screenshots/{en-US,zh-CN,zh-TW,ja-JP,ko-KR}/context-multi.png','artifacts/screenshots/{en-US,zh-CN,zh-TW,ja-JP,ko-KR}/options-multi.png','artifacts/screenshots/{en-US,zh-CN,zh-TW,ja-JP,ko-KR}/selection-locked.png'],'promotions':'Original typography/layout reusing the existing Transight icon and colors'},'files':files}
(OUT/'inventory.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
screenshot_count = sum(len(list((OUT/'screenshots'/locale).glob('*.png'))) for locale in ['en','zh-CN','zh-TW','ja','ko'])
print(f'PASS: localized descriptions, padded icon, {screenshot_count} screenshots, 2 promotional tiles, 4 dashboard guides and permission explanations.')
print('Archive:', archive_status)
print('Inventory:',OUT/'inventory.json')
if not source_matches:
    print(f'Archive drift: {len(missing)} missing, {len(extra)} extra, {len(changed)} changed runtime files.')
    if not args.assets_only:
        raise SystemExit('FAIL: stale ZIP. Rebuild explicitly before release, or use --assets-only to validate materials without packaging.')
else:
    print(f'PASS: ZIP root/runtime/license contents ({archive_count} files) and complete source parity.')
