"""Lámina de fotogramas con esqueleto y línea de barra.
Uso: python3 herramientas/dominadas_montaje.py <video> <pose.json> <y_barra> <fot1,fot2,...> [x0:y0:x1:y1] [salida.jpg]"""
import json, subprocess, numpy as np, cv2, imageio_ffmpeg, sys
import os, sys; sys.path.insert(0, os.path.dirname(__file__))
ff=imageio_ffmpeg.get_ffmpeg_exe()
def frame(video,i):
    out=subprocess.run([ff,'-v','error','-i',video,'-vf',f'select=eq(n\\,{i}),scale=720:1280','-vframes','1','-f','rawvideo','-pix_fmt','bgr24','-'],capture_output=True).stdout
    return np.frombuffer(out,np.uint8).reshape(1280,720,3).copy()
CON=[(11,12),(11,13),(13,15),(12,14),(14,16),(11,23),(12,24),(23,24),(23,25),(25,27),(24,26),(26,28),(27,31),(28,32)]
def dib(img,p,bar):
    cv2.line(img,(0,int(bar)),(720,int(bar)),(0,255,255),2)
    for a,b in CON: cv2.line(img,tuple(map(int,p[a][:2])),tuple(map(int,p[b][:2])),(0,255,0),2)
    for k in [0,9,10]: cv2.circle(img,tuple(map(int,p[k][:2])),4,(0,0,255),-1)
    return img
video,name,bar=sys.argv[1],sys.argv[2],float(sys.argv[3]); idxs=[int(x) for x in sys.argv[4].split(',')]
crop=sys.argv[5] if len(sys.argv)>5 else None
d=json.load(open(name if name.endswith('.json') else name+'.json')); P={f['i']:f['p'] for f in d['frames']}
tiles=[]
for i in idxs:
    im=dib(frame(video,i),P[i],bar)
    if crop:
        x0,y0,x1,y1=map(int,crop.split(':')); im=im[y0:y1,x0:x1]
    cv2.putText(im,f'{i/30:.2f}s',(5,25),0,0.8,(0,0,255),2)
    tiles.append(im)
cols=min(4,len(tiles)); rows=(len(tiles)+cols-1)//cols
h,w=tiles[0].shape[:2]; M=np.zeros((rows*h,cols*w,3),np.uint8)
for n,t in enumerate(tiles): M[(n//cols)*h:(n//cols+1)*h,(n%cols)*w:(n%cols+1)*w]=t
cv2.imwrite(sys.argv[6] if len(sys.argv)>6 else name+'_mont.jpg',M)
