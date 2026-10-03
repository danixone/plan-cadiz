"""Pose fotograma a fotograma de un vídeo de dominadas (MediaPipe Pose Landmarker heavy).
Uso: python3 herramientas/pose_video.py <video> <salida.json> [ancho]
Guarda, por fotograma, t (s) y los 33 puntos en píxeles (x, y, visibilidad)."""
import sys, json, subprocess, numpy as np, imageio_ffmpeg, mediapipe as mp
from mediapipe.tasks.python import vision, BaseOptions
import os
video, salida = sys.argv[1], sys.argv[2]
ancho = int(sys.argv[3]) if len(sys.argv) > 3 else 720
ff = imageio_ffmpeg.get_ffmpeg_exe()
# tamaño tras rotación
info = subprocess.run([ff, "-i", video], capture_output=True, text=True).stderr
import re
w, h = map(int, re.search(r"(\d{3,5})x(\d{3,5})", info.split("Video:")[1]).groups())
if "rotation of -90" in info or "rotation of 90" in info:
    w, h = h, w
alto = int(round(h * ancho / w / 2) * 2)
fps = 30.0
p = subprocess.Popen([ff, "-v", "error", "-i", video, "-vf", f"scale={ancho}:{alto}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
modelo = os.path.join(os.path.dirname(__file__), "modelos", "pose_landmarker_heavy.task")
lm = vision.PoseLandmarker.create_from_options(vision.PoseLandmarkerOptions(
    base_options=BaseOptions(model_asset_path=modelo), running_mode=vision.RunningMode.VIDEO))
frames, i = [], 0
while True:
    buf = p.stdout.read(ancho * alto * 3)
    if len(buf) < ancho * alto * 3:
        break
    img = np.frombuffer(buf, np.uint8).reshape(alto, ancho, 3)
    r = lm.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=img), int(i * 1000 / fps))
    pts = [[round(q.x * ancho, 1), round(q.y * alto, 1), round(q.visibility, 2)] for q in r.pose_landmarks[0]] if r.pose_landmarks else None
    frames.append({"i": i, "t": round(i / fps, 3), "p": pts})
    i += 1
json.dump({"video": video, "ancho": ancho, "alto": alto, "fps": fps, "frames": frames}, open(salida, "w"))
print(salida, i, "fotogramas", ancho, "x", alto, "con pose:", sum(1 for f in frames if f["p"]))
