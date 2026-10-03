"""Repeticiones de dominadas a partir de la pose de herramientas/pose_video.py.
Uso: python3 herramientas/dominadas_reps.py <pose.json sin .json> <t0> <t1> <y_barra>
Saca por repetición: arriba (boca/nariz/hombro frente a la barra), codo abajo, tobillo, cadera y rodilla."""
import json, math, sys
import numpy as np
def ang(a,b,c):
    v1=np.array(a[:2])-b[:2]; v2=np.array(c[:2])-b[:2]
    return math.degrees(math.acos(np.clip(v1@v2/np.linalg.norm(v1)/np.linalg.norm(v2),-1,1)))
def serie(v,t0,t1):
    d=json.load(open(v if v.endswith('.json') else v+'.json'))
    F=[f for f in d['frames'] if t0<=f['t']<=t1 and f['p']]
    t=np.array([f['t'] for f in F])
    P=np.array([f['p'] for f in F])  # n,33,3
    g=lambda k,c: P[:,k,c]
    S={'t':t,'sh':(g(11,1)+g(12,1))/2,'mo':(g(9,1)+g(10,1))/2,'no':g(0,1),
       'wr':(g(15,1)+g(16,1))/2,'an':(g(27,1)+g(28,1))/2,'hipx':(g(23,0)+g(24,0))/2,
       'ankx':(g(27,0)+g(28,0))/2,'shx':(g(11,0)+g(12,0))/2,'knx':(g(25,0)+g(26,0))/2,
       'el':np.array([(ang(p[11],p[13],p[15])+ang(p[12],p[14],p[16]))/2 for p in P]),
       'knee':np.array([(ang(p[23],p[25],p[27])+ang(p[24],p[26],p[28]))/2 for p in P]),
       'hipang':np.array([(ang(p[11],p[23],p[25])+ang(p[12],p[24],p[26]))/2 for p in P]),
       'wrx':(g(15,0)+g(16,0))/2,'wsep':abs(g(15,0)-g(16,0)),'ssep':abs(g(11,0)-g(12,0)),'i':np.array([f['i'] for f in F])}
    k=np.ones(5)/5
    for key in ['sh','mo']: S[key+'s']=np.convolve(S[key],k,'same')
    return S
if __name__=='__main__':
    v,t0,t1,bar=sys.argv[1],float(sys.argv[2]),float(sys.argv[3]),float(sys.argv[4])
    S=serie(v,t0,t1); t=S['t']; sh=S['shs']
    # topes: mínimos locales de hombro claramente por encima del reposo
    hang=np.percentile(sh,90)
    tops=[]
    for j in range(8,len(t)-8):
        if sh[j]==sh[j-8:j+9].min() and sh[j]<hang-120:
            if not tops or t[j]-t[tops[-1]]>1.0: tops.append(j)
    print(v,'colgado (p90 hombro)',round(hang),'barra y=',bar,'repeticiones detectadas:',len(tops))
    prev=None
    for n,j in enumerate(tops):
        a = prev if prev is not None else max(0,j-60)
        seg=slice(a,j+1)
        jb=a+int(np.argmax(sh[seg]))
        print(f"rep {n+1}: arriba t={t[j]:.2f}s (fot {S['i'][j]}) boca {S['mo'][j]:.0f} nariz {S['no'][j]:.0f} hombro {S['sh'][j]:.0f} | "
              f"abajo previo t={t[jb]:.2f} hombro {S['sh'][jb]:.0f} codo {S['el'][jb]:.0f}° tobillo_y {S['an'][jb]:.0f} | "
              f"codo máx en tramo {S['el'][seg].max():.0f}° | tobillo_y máx tramo {S['an'][seg].max():.0f} | "
              f"cadera_x rango {S['hipx'][seg].min():.0f}-{S['hipx'][seg].max():.0f} tobillo_x rango {S['ankx'][seg].min():.0f}-{S['ankx'][seg].max():.0f} rodilla mín {S['knee'][seg].min():.0f}° cadera ang mín {S['hipang'][seg].min():.0f}°")
        prev=j
    print('separación muñecas / hombros (px, en reposo):', np.median(S['wsep'][:30]).round(), np.median(S['ssep'][:30]).round())
