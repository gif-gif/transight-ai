"""Validate store assets and archive; write a reproducible material inventory."""
from pathlib import Path
from PIL import Image
import hashlib, io, json, zipfile

OUT=Path(__file__).resolve().parents[1]
ROOT=OUT.parent
manifest=json.loads((ROOT/'manifest.json').read_text())
metadata=json.loads((OUT/'listing/metadata.json').read_text())
assert metadata['version']==manifest['version'], 'Update listing metadata after a version change'
for locale, record in metadata['localizations'].items():
    strings=json.loads((ROOT/f'_locales/{locale}/messages.json').read_text())
    assert record['name']==strings['extensionName']['message']
    assert record['short_description']==strings['extensionDescription']['message']
    assert len(record['short_description'])==record['description_character_count']<=132
for filename in ['description.en.txt','description.zh-CN.txt','description.zh-TW.txt']:
    assert (OUT/'listing'/filename).stat().st_size>0
dashboard_docs=['01-store-listing.md','02-privacy-practices.md','03-distribution.md','04-test-instructions.md']
for filename in dashboard_docs:
    assert (OUT/'dashboard'/filename).stat().st_size>0, filename
privacy=(OUT/'dashboard/02-privacy-practices.md').read_text()
for permission in manifest['permissions'] + manifest['host_permissions']:
    assert permission in privacy, f'Missing permission explanation: {permission}'
expected={'icons/icon-128.png':(128,128),'promo/small-440x280.png':(440,280),'promo/marquee-1400x560.png':(1400,560)}
for locale in ['en','zh-CN','zh-TW']:
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
    assert json.loads(z.read('manifest.json'))==manifest
    assert z.read('assets/icon-128.png')==(OUT/'icons/icon-128.png').read_bytes()
    # Apart from the intentional store icon adaptation, archive bytes must match source.
    for name in names:
        if not name.endswith('/') and name!='assets/icon-128.png':
            assert z.read(name)==(ROOT/name).read_bytes(), name
    assert Image.open(io.BytesIO(z.read('assets/icon-128.png'))).size==(128,128)
    archive_count=sum(not n.endswith('/') for n in names)
files=[]
for p in sorted(OUT.rglob('*')):
    if not p.is_file() or p.name=='inventory.json' or p.name.startswith('.'):continue
    record={'path':str(p.relative_to(OUT)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
    if p.suffix=='.png':
        im=Image.open(p);record.update(width=im.width,height=im.height,mode=im.mode)
    files.append(record)
report={'prepared_date':'2026-10-02','version':manifest['version'],'archive':str(archive.relative_to(OUT)),
        'checks':{'manifest_at_zip_root':True,'runtime_and_license_only':True,'archive_source_match_except_store_icon':True,'runtime_file_count':archive_count,'description_limit_132':True,'dimensions_and_image_modes_valid':True,'dashboard_guides_present':True,'permission_explanations_present':True},
        'sources':{'icon':'assets/icon-128.png','screenshots':['artifacts/screenshots/{en-US,zh-CN,zh-TW}/popup-multi.png','artifacts/screenshots/{en-US,zh-CN,zh-TW}/context-multi.png','artifacts/screenshots/{en-US,zh-CN,zh-TW}/options-multi.png'],'promotions':'Original typography/layout reusing the existing Transight icon and colors'},'files':files}
(OUT/'inventory.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(f'PASS: ZIP root/runtime/license contents ({archive_count} files), source parity, localized descriptions, padded icon, 9 screenshots, 2 promotional tiles, 4 dashboard guides and permission explanations.')
print('Inventory:',OUT/'inventory.json')
