import sys, pathlib
from PIL import Image
L=sys.argv[1]; d=pathlib.Path(__file__).parent/"screenshots"/L
rows=[]
for pre in ["iphone69","iphone63","ipad"]:
    ims=[Image.open(d/f"{pre}-0{i}.png").convert("RGB") for i in range(1,9)]
    h=600; ims=[im.resize((int(im.width*h/im.height),h)) for im in ims]
    row=Image.new("RGB",(sum(i.width for i in ims)+80,h),"white"); x=0
    for im in ims: row.paste(im,(x,0)); x+=im.width+10
    rows.append(row)
for n in ["header-3840x1646","search-3840x1646"]:
    im=Image.open(d/f"{n}.png").convert("RGB"); rows.append(im.resize((1400,int(im.height*1400/im.width))))
W=max(r.width for r in rows); H=sum(r.height+10 for r in rows)
c=Image.new("RGB",(W,H),"#888"); y=0
for r in rows: c.paste(r,(0,y)); y+=r.height+10
c.save(pathlib.Path(sys.argv[2]))
