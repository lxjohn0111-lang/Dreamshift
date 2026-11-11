# Build the CrazyGames upload folder from dreamshift.html: local Three.js + local fonts + CrazyGames SDK v3 script tag.
#   npm i --no-save three@0.170.0 @fontsource/cormorant-garamond @fontsource/jost
#   python3 tools/make_crazygames.py            (NODE_MODULES=/path/to/node_modules to override)
import os, shutil, re
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__))); OUT=ROOT+'/crazygames'; NM=os.environ.get('NODE_MODULES', ROOT+'/node_modules')
s=open(ROOT+'/dreamshift.html').read()
if os.path.isdir(OUT): shutil.rmtree(OUT)
os.makedirs(OUT+'/lib'); os.makedirs(OUT+'/fonts'); os.makedirs(OUT+'/licenses')
faces=[]
for fam,pkg,items in (('Cormorant Garamond','cormorant-garamond',[(300,'normal'),(400,'normal'),(500,'normal'),(300,'italic'),(400,'italic')]),('Jost','jost',[(300,'normal'),(400,'normal'),(500,'normal')])):
    for wgt,sty in items:
        fn=f'{pkg}-latin-{wgt}-{sty}.woff2'; shutil.copy(f'{NM}/@fontsource/{pkg}/files/{fn}', OUT+'/fonts/'+fn)
        faces.append(f"@font-face{{font-family:'{fam}';font-style:{sty};font-weight:{wgt};font-display:swap;src:url('./fonts/{fn}') format('woff2')}}")
    shutil.copy(f'{NM}/@fontsource/{pkg}/LICENSE', f'{OUT}/licenses/{pkg}-OFL.txt')
shutil.copy(NM+'/three/build/three.module.min.js', OUT+'/lib/three.module.min.js'); shutil.copy(NM+'/three/LICENSE', OUT+'/licenses/three-MIT.txt')
m=re.search(r'<link rel="preconnect" href="https://fonts.googleapis.com">\n.*?rel="stylesheet">\n', s, re.S); assert m
s=s.replace(m.group(0), '<style>\n'+'\n'.join(faces)+'\n</style>\n<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>\n<script>window.DREAMSHIFT_THREE = "./lib/three.module.min.js"; window.DREAMSHIFT_PORTAL = "crazygames";</script>\n')
s=s.replace('<title>DREAMSHIFT — The Rooms Between</title>','<title>Dreamshift: The Rooms Between</title>')
assert 'fonts.googleapis' not in s and 'crazygames-sdk-v3.js' in s
open(OUT+'/index.html','w').write(s)
tot=0
for d,_,fs in os.walk(OUT):
    for f in fs: tot+=os.path.getsize(os.path.join(d,f)); print(os.path.relpath(os.path.join(d,f),OUT), os.path.getsize(os.path.join(d,f)))
print('total bytes', tot)
