# Temporary proof driver (removed after the review): drives the Play-signed internal build on an emulator by the
# words on screen (uiautomator), records it, and screenshots the paywall at 390 dp light and dark.
# The review code comes from the env and is never printed; screens after it is typed go only to the encrypted bundle.
import os, re, subprocess, sys, time, xml.etree.ElementTree as ET

OUT = sys.argv[1]
CODE = os.environ['REVIEW_CODE']
PKG = 'com.peacebestillapp.mobile'
os.makedirs(f'{OUT}/plain', exist_ok=True); os.makedirs(f'{OUT}/secret', exist_ok=True)
log = open(f'{OUT}/plain/steps.txt', 'w')

def adb(*a, check=True):
    r = subprocess.run(['adb', *a], capture_output=True, text=True)
    if check and r.returncode: raise SystemExit(f'adb {a[0]} failed: {r.stderr[-300:]}')
    return r.stdout

def note(s):
    s = s.replace(CODE, '[code]'); print(s, flush=True); log.write(s + '\n'); log.flush()

def nodes():
    adb('shell', 'uiautomator', 'dump', '/sdcard/ui.xml', check=False)
    xml = adb('shell', 'cat', '/sdcard/ui.xml', check=False)
    try: root = ET.fromstring(xml[xml.find('<?xml'):] if '<?xml' in xml else xml)
    except ET.ParseError: return []
    out = []
    for n in root.iter('node'):
        label = (n.get('text') or '') + ' | ' + (n.get('content-desc') or '')
        b = re.findall(r'\d+', n.get('bounds') or '')
        if len(b) == 4: out.append((label, [int(x) for x in b], n.get('clickable') == 'true'))
    return out

def words():
    return ' / '.join(sorted({l.strip(' |') for l, _, _ in nodes() if l.strip(' |')})).replace(CODE, '[code]')

def find(pattern, wait=20, scroll=False):
    rx = re.compile(pattern)
    end = time.time() + wait
    while time.time() < end:
        for label, (x1, y1, x2, y2), _ in nodes():
            if rx.search(label): return ((x1 + x2) // 2, (y1 + y2) // 2)
        if scroll: adb('shell', 'input', 'swipe', '540', '1800', '540', '900', '300')
        time.sleep(1)
    return None

def tap(pattern, wait=20, scroll=False, need=True):
    at = find(pattern, wait, scroll)
    if not at:
        if need:
            shot('plain', 'stuck'); note(f'STUCK looking for /{pattern}/; on screen: {words()}'); raise SystemExit(2)
        return False
    adb('shell', 'input', 'tap', str(at[0]), str(at[1])); note(f'tap /{pattern}/'); time.sleep(1.5); return True

def shot(where, name):
    adb('shell', 'screencap', '-p', '/sdcard/s.png'); adb('pull', '/sdcard/s.png', f'{OUT}/{where}/{name}.png')

def dismiss_system():
    for p in [r"^Don.t allow", r"^Not now", r"^Close app", r"^Wait"]: tap(p, wait=1, need=False)

# 390 dp wide: 1170 px at density 480 (iPhone-class width).
adb('shell', 'wm', 'size', '1170x2532'); adb('shell', 'wm', 'density', '480')
adb('shell', 'settings', 'put', 'global', 'window_animation_scale', '0')
rec = subprocess.Popen(['adb', 'shell', 'screenrecord', '--bit-rate', '4000000', '--time-limit', '180', '/sdcard/run1.mp4'])
adb('shell', 'monkey', '-p', PKG, '-c', 'android.intent.category.LAUNCHER', '1')
time.sleep(8); dismiss_system()
note('first screen: ' + words())
tap(r"With God.s Word", wait=60)
at = find(r'Birth year', 30)
if not at: tap(r'Birth year')
adb('shell', 'input', 'tap', str(at[0]), str(at[1])); adb('shell', 'input', 'text', '1985'); note('typed birth year 1985')
adb('shell', 'input', 'keyevent', '111')
tap(r'^Skip', wait=3, need=False); tap(r'^Continue')
tap(r'Hush Harbor', scroll=True); tap(r'^Start Hush Harbor', scroll=True)
time.sleep(3); dismiss_system(); tap(r'^Not now', wait=4, need=False); dismiss_system()
note('after onboarding: ' + words())
# The paywall, as a reviewer reaches it (Settings > A paid plan), by deep link so a layout change never strands the run.
adb('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', 'peacebestill://paid', PKG)
time.sleep(10)
note('paywall: ' + words())
shot('plain', 'paywall-390-light')
adb('shell', 'cmd', 'uimode', 'night', 'yes'); time.sleep(4); shot('plain', 'paywall-390-dark'); note('dark: ' + words())
adb('shell', 'cmd', 'uimode', 'night', 'no'); time.sleep(4)
tap(r'Have a review code\?', scroll=True)
shot('plain', 'review-box-open')
tap(r'App review code')
adb('shell', 'input', 'text', CODE); note('typed the review code')
adb('shell', 'input', 'keyevent', '111')
shot('secret', 'review-code-typed')
tap(r'^Use this code', scroll=True)
ok = find(r'Your paid access is active', 40)
note('after code: ' + words())
shot('secret', 'after-code')
adb('shell', 'pkill', '-INT', 'screenrecord', check=False); time.sleep(3)
adb('pull', '/sdcard/run1.mp4', f'{OUT}/secret/recording.mp4', check=False)
note('RESULT review code: ' + ('UNLOCKED (RevenueCat reports paid)' if ok else 'NOT UNLOCKED'))
sys.exit(0 if ok else 3)
