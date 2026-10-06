#!/usr/bin/env python3
"""Refresh pinned presentation assets; review hashes/licenses and browser QA before committing."""
import concurrent.futures, hashlib, json, pathlib, re, subprocess, urllib.parse
VERSION='2.0.0'
THEME='undrr' # Deliberate build-time choice; see docs/MANGROVE.md.
THEMES={'undrr':('style.css','https://assets.undrr.org/logos/undrr/undrr-logo-blue.svg'),'preventionweb':('style-preventionweb.css','https://assets.undrr.org/logos/pw/pw-logo.svg')}
ROOT=pathlib.Path(__file__).resolve().parents[1]/'public/vendor/mangrove'/VERSION
CSS_URL=f'https://assets.undrr.org/mangrove/{VERSION}/css/{THEMES[THEME][0]}'
records=[]
def fetch(url,target):
 target.parent.mkdir(parents=True,exist_ok=True)
 subprocess.run(['curl','--fail','--location','--silent','--show-error','--user-agent','Mozilla/5.0',url,'--output',str(target)],check=True)
 return {'path':str(target.relative_to(ROOT)),'url':url,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'bytes':target.stat().st_size}
source=ROOT/'upstream.css';records.append(fetch(CSS_URL,source));css=source.read_text()
urls=sorted(set(x.strip('\"\'') for x in re.findall(r'url\(([^)]+)\)',css) if not x.strip('\"\'').startswith('data:')))
def asset_url(url):return urllib.parse.urljoin(CSS_URL,url)
def local_path(url):
 absolute=asset_url(url);parsed=urllib.parse.urlparse(absolute)
 return ROOT/'assets'/parsed.netloc/parsed.path.lstrip('/')
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
 records.extend(pool.map(lambda u:fetch(asset_url(u),local_path(u)),urls))
for url in urls:css=css.replace(url,'./'+str(local_path(url).relative_to(ROOT)))
(ROOT/'style.css').write_text(css)
records.append({'path':'style.css','derivedFrom':'upstream.css','sha256':hashlib.sha256(css.encode()).hexdigest(),'bytes':len(css.encode()),'modification':'Only url() asset references rewritten to bundled relative paths.'})
extras={
 'LICENSE.txt':'https://raw.githubusercontent.com/PreventionWeb/undrr-mangrove/main/LICENSE',
 'logo.svg':THEMES[THEME][1],
 'tokens.json':'https://mangrove.undrr.org/tokens.json',
 'noto-kufi-OFL.txt':'https://assets.undrr.org/fonts/noto-kufi-arabic/v1.1.0/OFL.txt',
 'noto-arabic-OFL.txt':'https://assets.undrr.org/fonts/noto-sans-arabic/v1.0.0/OFL.txt',
 'icon-font-LICENSE.txt':'https://raw.githubusercontent.com/PreventionWeb/undrr-mangrove/main/stories/assets/fonts/mangrove-icon-set/LICENSE.txt',
 'icon-font-README.txt':'https://raw.githubusercontent.com/PreventionWeb/undrr-mangrove/main/stories/assets/fonts/mangrove-icon-set/README.txt',
 'fonts-README.md':'https://assets.undrr.org/fonts/README.md',
 'noto-kufi-README.md':'https://assets.undrr.org/fonts/noto-kufi-arabic/v1.1.0/README.md',
 'noto-arabic-README.md':'https://assets.undrr.org/fonts/noto-sans-arabic/v1.0.0/README.md',
 'logos-README.md':'https://assets.undrr.org/logos/undrr/README.md'}
for name,url in extras.items():records.append(fetch(url,ROOT/name))
# Preserve the common full SIL legal text alongside the icon-font attribution notice.
ofl=(ROOT/'noto-arabic-OFL.txt').read_text();body=ofl[ofl.index('SIL OPEN FONT LICENSE'):];(ROOT/'OFL-1.1.txt').write_text(body)
records.append({'path':'OFL-1.1.txt','derivedFrom':'noto-arabic-OFL.txt','sha256':hashlib.sha256(body.encode()).hexdigest(),'bytes':len(body.encode()),'modification':'Universal SIL OFL 1.1 legal text; per-font copyright notices remain separately bundled.'})
(ROOT/'manifest.json').write_text(json.dumps({'version':VERSION,'theme':THEME,'files':sorted(records,key=lambda r:r['path'])},indent=2)+'\n')
print(f'{len(records)} assets recorded in {ROOT}; {sum(x["bytes"] for x in records):,} bytes')
