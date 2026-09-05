# -*- coding: utf-8 -*-
"""Turn research files into lib/references.json for the BinStaGram app."""
import re, json, pathlib, importlib.util

ROOT = pathlib.Path(__file__).parent
spec = importlib.util.spec_from_file_location('br', ROOT / 'build_report.py')
# build_report writes files on import; that's fine (idempotent)
br = importlib.util.module_from_spec(spec); spec.loader.exec_module(br)

HANDLE = re.compile(r'@([A-Za-z0-9_.]{2,40})')
FOLLOW = re.compile(r'(\d+(?:\.\d+)?)\s*(K|M|만|천)', re.I)
COUNTRY = re.compile(r'(미국|영국|호주|캐나다|인도|프랑스|독일|유럽권|스코틀랜드|미확인)')
FORMAT = re.compile(r'(릴스\s*\+\s*캐러셀|릴스\+캐러셀|릴스 위주|릴스 중심|릴스|캐러셀|혼합|브이로그)')

def parse_creators(md):
    """Heuristic: table rows and bullet lines that carry an @handle."""
    creators = {}
    order = []
    last = None
    lines = md.splitlines()
    for ln in lines:
        s = ln.strip()
        if not s or s.startswith('|---') or s.startswith('| 핸들') or s.startswith('| # '): continue
        hs = HANDLE.findall(s)
        if not hs:
            if last and s.startswith('- ') and not s.startswith(('- 예시','- 출처','- URL','- 국가','- 팔로워','- 형식','- 설명')) and not creators[last]['desc']:
                creators[last]['desc'] = re.sub(r'\*\*', '', s[2:]).strip()
            continue
        h = hs[0].rstrip('.')
        if s.startswith('|'): last = h
        if h.lower() in ('instagram',): continue
        c = creators.setdefault(h, {'handle': h, 'url': f'https://www.instagram.com/{h}/', 'name': '', 'country': '', 'followers': '', 'format': '', 'desc': '', 'aux': False})
        if h not in order: order.append(h)
        if s.startswith('|'):
            cells = [x.strip() for x in s.strip('|').split('|')]
            # name in parentheses in first cell
            m = re.search(r'\(([^)]+)\)', cells[0] if cells else '')
            if m and not c['name']: c['name'] = m.group(1)
            joined = ' '.join(cells)
            fm = FOLLOW.search(joined)
            if fm and not c['followers']: c['followers'] = fm.group(0).replace(' ', '')
            cm = COUNTRY.search(joined)
            if cm and not c['country']: c['country'] = cm.group(1)
            fo = FORMAT.search(joined)
            if fo and not c['format']: c['format'] = fo.group(1)
            # table with 설명 column (kw21-25 style)
            if len(cells) >= 6 and len(cells[-1]) > 30 and not c['desc']:
                c['desc'] = re.sub(r'\s*릴스 탭:.*$', '', cells[-1]).strip()
        else:
            body = re.sub(r'^[-*\d.)\s]+', '', s)
            body = re.sub(r'\*\*', '', body)
            # "@handle — desc" or "@handle (name) — desc"
            m = re.match(r'@[A-Za-z0-9_.]+\s*(?:\(([^)]+)\))?\s*[—\-–:]\s*(.+)$', body)
            if m:
                if m.group(1) and not c['name']: c['name'] = m.group(1)
                if not c['desc']: c['desc'] = m.group(2).strip()
            elif s.startswith('- URL') or s.startswith('- 국가') or s.startswith('- 팔로워') or s.startswith('- 형식') or s.startswith('- 설명'):
                pass
            if '(보조' in s or '보조 후보' in s or '(참고' in s: c['aux'] = True
            fm = FOLLOW.search(body)
            if fm and not c['followers'] and ('팔로워' in body or '스니펫' in body or '프로필' in body): c['followers'] = fm.group(0).replace(' ', '')
            cm = COUNTRY.search(body)
            if cm and not c['country'] and ('국가' in body or '(' in body): c['country'] = cm.group(1)
    # kw26-30 style: "### 1) @handle — Name" followed by "- 국가: …" lines
    cur = None
    for ln in lines:
        s = ln.strip()
        m = re.match(r'^#{2,4}\s*\d+\)\s*@([A-Za-z0-9_.]+)\s*[—\-–]?\s*(.*)$', s)
        if m:
            cur = m.group(1).rstrip('.')
            if cur in creators and m.group(2) and not creators[cur]['name']: creators[cur]['name'] = m.group(2).strip()
            continue
        if cur and cur in creators:
            c = creators[cur]
            if s.startswith('- 국가:'): c['country'] = c['country'] or COUNTRY.search(s).group(1) if COUNTRY.search(s) else c['country']
            elif s.startswith('- 팔로워:'):
                fm = FOLLOW.search(s); c['followers'] = fm.group(0).replace(' ', '') if fm else c['followers']
            elif s.startswith('- 형식:'): c['format'] = s.split(':',1)[1].strip()
            elif s.startswith('- 설명:'): c['desc'] = s.split(':',1)[1].strip()
            elif s.startswith('#'): cur = None
    out = [creators[h] for h in order if creators[h]['followers'] or creators[h]['desc']]
    return out

data = {'generatedAt': '2026-09-02', 'keywords': []}
for n, ko, tags in br.KW:
    ig = br.IG[n]
    web_md = br.web.get(n, '')
    data['keywords'].append({
        'id': n, 'group': '주부' if n <= 15 else '자영업자', 'ko': ko, 'tags': [t.strip() for t in tags.split('/')],
        'hashtag': {'query': ig['tag'], 'strength': ig['strength'], 'label': br.STRENGTH_LABEL[ig['strength']], 'note': ig['note'],
                    'posts': [{'shortcode': sc, 'url': f'https://www.instagram.com/p/{sc}/', 'owner': o, 'metric': m, 'desc': d} for sc, o, m, d in ig['posts']]},
        'creators': parse_creators(web_md),
    })

out = ROOT.parent / 'lib' / 'references.json'
out.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
tot = sum(len(k['creators']) for k in data['keywords'])
print('wrote', out, 'creators', tot)
print('NOTE: 앱 데이터의 원본은 data/references/ 폴더입니다. 이 결과로 폴더를 다시 만들려면')
print('      node scripts/refs.mjs split --force   (폴더 안에서 직접 고친 내용은 사라짐)')
for k in data['keywords'][:30]:
    cs = k['creators']
    print(k['id'], k['ko'], len(cs), '|', '; '.join(f"@{c['handle']} {c['followers'] or '?'} {c['country'] or '?'}" for c in cs[:4]))
