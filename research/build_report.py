# -*- coding: utf-8 -*-
"""Build the overseas Instagram reference report (HTML artifact + REPORT.md)
from the six web-search markdown files and the curated Instagram hashtag data."""
import re, json, html, pathlib

ROOT = pathlib.Path(__file__).parent
OUT_HTML = pathlib.Path('/private/tmp/claude-501/-Users-anhyebeen-Documents-Hun-instagram/a4fa9fec-fb70-429a-9b71-7b61481d2c3b/scratchpad/overseas-ig-reference.html')
OUT_MD = ROOT / 'REPORT.md'

KW = [
 (1,'살림 꿀팁','homehacks / cleaninghacks'),(2,'집 정리','homeorganization / declutter'),
 (3,'초간단 집밥','easymeals / quickrecipes'),(4,'육아 꿀팁','momhacks / momlife'),
 (5,'시간 절약 살림','timesavingtips'),(6,'미니멀 라이프','minimalistliving'),
 (7,'냉장고 파먹기','usewhatyouhave / pantrymeals'),(8,'살림 루틴','cleaningroutine / morningroutine'),
 (9,'육아템 추천','momfinds / musthavemomproducts'),(10,'집콕 부업','workfromhomemom / sahmbusiness'),
 (11,'아이 간식 만들기','kidssnacks / toddlermeals'),(12,'절약 챌린지','savingschallenge / budgetliving'),
 (13,'집안일 자동화','smarthomehacks'),(14,'남편 몰래 부업','sidehustleformoms'),
 (15,'주부 자기계발','momselfcare / momgrowth'),
 (16,'자영업 꿀팁','smallbusinesstips'),(17,'매출 올리는 법','boostsales / increaserevenue'),
 (18,'사장님 마인드','entrepreneurmindset / bossmindset'),(19,'창업 초보','startupbeginners / newbusinessowner'),
 (20,'가게 홍보','localbusinessmarketing'),(21,'손님 늘리는 법','attractcustomers'),
 (22,'사장님 브이로그','smallbusinessowner / dayinthelife'),(23,'재고 관리','inventorymanagement'),
 (24,'자영업 실패담','smallbusinessfails / lessonslearned'),(25,'1인 창업','solopreneur'),
 (26,'매장 운영 팁','retailtips / storemanagement'),(27,'사장님 번아웃','businessownerburnout'),
 (28,'온라인 부업 창업','onlinebusinessforbeginners'),(29,'마케팅 저비용','lowbudgetmarketing / diymarketing'),
 (30,'사업 자동화','businessautomation / aiforbusiness'),
]

# Instagram hashtag check. strength: strong / mid / weak / spam / none
# posts: (shortcode, owner, metric, description)
IG = {
 1: dict(tag='#homehacks', strength='strong', note='릴스 위주, 상위 게시물 조회 수천만. 유머형 제품 릴스와 청소 인포그래픽이 섞여 있음.',
   posts=[('DZhj5MWkyZs','(미확인)','371K 좋아요 · 5,920만 조회','#6 순위 릴스(13초)'),
          ('DcrMg2ZzNUt','fannygutus','181K 좋아요 · 1,870만 조회','"DONT show this to your Husband" 유머형 제품 릴스, comment BELLY 링크 유도'),
          ('DaklI0mBW3L','homeio_official','42K 좋아요 · 580만 조회','"Stop cutting vegetables the slow way" 주방 가젯 시연 8초'),
          ('DZm_oRwBHTv','(미확인)','18K 좋아요 · 150만 조회','21초 릴스'),
          ('DZxuqdhgISz','(미확인)','1.1K 좋아요','청소 요령 인포그래픽 이미지')]),
 2: dict(tag='#homeorganization', strength='strong', note='제품 소개 릴스가 상위. 흡착 수납·정리대 등 아마존형 제품과 인포그래픽(HOARDING HABITS, 12 months of organizing habits)이 공존.',
   posts=[('C2D3rwTScI3','amazingsydneylife','130만 좋아요 · 5.1K 댓글 (2024)','Jules Park(호주). 스마트 쓰레기통 협찬 릴스'),
          ('Dcgs7q7t-nq','(차단됨)','465K 좋아요','2026-08-27 게시'),
          ('DZZW_FWvqoa','prettyprinted.co','122K 좋아요','샤워 앰플리파이어 제품 릴스'),
          ('DbC7rlfs_8o','simplyleonfinds','87K 좋아요 · 4.9K 댓글','금속 캐비닛 정리대, 딜 계정'),
          ('DbmwmJAoHHn','lumiarus','47K 좋아요 · 5.3K 댓글','흡착식 수건 바구니 제품 릴스')]),
 3: dict(tag='#easymeals', strength='mid', note='1위는 인도 크리에이터. 서구권은 "lazy girl dinner", 에어프라이어 팁 인포그래픽이 상위.',
   posts=[('DaAjCtqRx35','joee_cooks','584K 좋아요','Sofin Joel(인도). "MEALS UNDER" 시리즈, Hariyali soya rice'),
          ('DZyW3KQxh1y','makayla_thomas_fit','72K 좋아요','MaKayla Thomas(미국). "lazy girl dinner, high protein low cal" 히바치'),
          ('CJ6F5F-gtKN','healthyminutemeals','16K 좋아요 (2020)','리포스트 레시피 계정'),
          ('DZKjMbIpQYE','recipejournal101','7.4K 좋아요','간단 라이스 요리 모음'),
          ('DcG3J_5CJnt','(미확인)','2.6K 좋아요','"20 Air Fryer Tips" 인포그래픽')]),
 4: dict(tag='#momhacks', strength='strong', note='"first time mom이었을 때 알았으면" 형 릴스가 반복 상위. 배변훈련·안전 핵 등 실용 소재.',
   posts=[('DZxO0qHxC4D','awesome_motherhood','401K 좋아요','Yana Kuzmich. 배변훈련 맘핵'),
          ('DIulwCos_he','breandkyleofficial','369K 좋아요 (2025)','Bre & Kyle Prichard. 아기가 물건 입에 넣는 것 막는 핵'),
          ('DZU7AIuur-X','sana.motherhood','332K 좋아요','Sana U. "I wish I knew as a first time mom"'),
          ('DbqwzU-RSoE','awemama_','249K 좋아요','Anastasia Kvasouka. 유치원생 글씨 배우기'),
          ('Da8fA0TpldY','sana.motherhood','81K 좋아요','"Useful mom tips I wish I knew sooner"')]),
 5: dict(tag='#timesavingtips', strength='weak', note='상위가 2.2만 좋아요. 인도계 생활 팁 계정과 텍스트 카드 위주라 해시태그로는 레퍼런스 확보가 어려움. 웹검색 계정 목록을 우선.',
   posts=[('CXPvW6hlKMR','dailylifehackswith_neha','22K 좋아요 (2021)','Neha Sharma(인도). 남은 피자 팬에 데우기'),
          ('DcXihWusn0I','ourmemorymap_','13K 좋아요','토마토 오래 보관하는 법'),
          ('DLVoVolNxGA','(미확인)','1.4K 좋아요','미트로프 기름 빼기 팁'),
          ('DNTVT1PvWMB','(미확인)','146 좋아요','"Top 20 Time-Saving Tips" 텍스트 카드')]),
 6: dict(tag='#minimalistliving', strength='mid', note='상위가 전부 인테리어 렌더링·시공 계정(인도 다수). 미니멀 "라이프" 크리에이터는 해시태그보다 웹검색 목록이 정확.',
   posts=[('DaXqs9QuMG5','siyad_abdali','219K 좋아요','숲속 로프트 인테리어 영상'),
          ('Dadlc6fyY4-','watchthebuild','71K 좋아요','빈 방 → 아늑한 거실 변신'),
          ('DaBD8H4os3a','3d.forgestudio','58K 좋아요','3D 렌더링 스튜디오'),
          ('DcYEFpkTsrn','phoenixhomz.interiors','26K 좋아요','벵갈루루 인테리어 업체'),
          ('DS-0R-0jHdR','modern_homestyle','19K 좋아요','인테리어 큐레이션')]),
 7: dict(tag='#usewhatyouhave · #pantrymeals', strength='weak', note='첫 태그는 공예·화장품 no-buy, 두 번째는 캔 요리 위주로 상위가 2.4만. "냉장고 파먹기" 결은 웹검색의 dtdinners·budgetbytes가 더 맞음.',
   posts=[('C12LJ5Yua5Q','sarah.robertson.barnes','183K 좋아요 (2024)','제로웨이스트. "Are reusables fast fashion now?"'),
          ('Cw0qDWsu7AV','fentybeauty','27K 좋아요','빈 하이라이터 리포스트'),
          ('DaeQ5NWhpTd','good.vibes.cooking','24K 좋아요','Creamy Canned Clams, 캔 재료 요리'),
          ('DXJNNwDCnOh','marionskitchen','13K 좋아요','Marion\'s Kitchen(호주). "Too tired to cook…"'),
          ('CCY3ovspbeu','(미확인)','2.7K 좋아요','Spinach artichoke quesadilla 15분')]),
 8: dict(tag='#cleaningroutine', strength='strong', note='리셋 루틴 브이로그와 요일별 청소표 인포그래픽이 상위. 개인 크리에이터 비중 높음.',
   posts=[('DVB_xgyDVo5','cleaningwithida','348K 좋아요','Ida Julia. "this is how I reset my brain"'),
          ('Da_NTT2t8AE','sss.sophiie','91K 좋아요','Sophie Luxton. 3시간 선데이 리셋, 브랜드 협찬'),
          ('DY995K_SQck','tanya_cleanhome','50K 좋아요','"my mom is a professional cleaner, clean these 5 things"'),
          ('DNF3qB-vQZ_','(미확인)','15K 좋아요','"Ultimate Home Cleaning Schedule" 인포그래픽'),
          ('DOYqcFxiF95','tanyahomeinspo','14K 좋아요','Tanya Mukendi. "10 tiny cleaning habits"')]),
 9: dict(tag='#momfinds', strength='strong', note='아마존 제휴형 릴스. "Follow + comment 키워드" DM 링크 유도가 표준 CTA.',
   posts=[('DZNaX_eRb8f','lena.bostonn','290K 좋아요','Lena Boston. 수영장·목욕 아기템, comment BABY'),
          ('DZq7AxBOd5r','malloryleerichardson','180K 좋아요 · 7.5K 댓글','Mallory Lee(댈러스). 스퀴시 장난감'),
          ('Da5ZVzyR5QL','inmygoodkarma','99K 좋아요','성장형 자전거'),
          ('DcoakIOAtO5','meganlbrown22','44K 좋아요','Megan Brown. 아이 인터랙티브 북 하울, comment SHOP'),
          ('DcYdAbGHPe3','findsworththebuy','39K 좋아요','Sarah Roy. 크리스마스 장난감 예측')]),
 10: dict(tag='#workfromhomemom', strength='weak', note='구인 리스트·명언 카드·인도계 디지털마케팅 부업 계정. 상위도 1천 좋아요 내외.',
   posts=[('DXNnwzoCKUf','navkaurvrk','1.2K 좋아요 · 2.2K 댓글','Navdeep Kaur. "No job. One child. Starting again at 33"'),
          ('DaAxngvzj9v','fellow.mom.friend','506 좋아요','Vaishali WFH Mom. 재택근무 실수'),
          ('DU3tm_xkwqQ','vicwealth.mom','107 좋아요 · 237 댓글','4아이 엄마, 제휴마케팅 "12 companies that pay you to WFH"')]),
 11: dict(tag='#kidssnacks', strength='mid', note='과일 플레이트 아트와 간식 인포그래픽. 확장 프로그램 수치 미로딩으로 게시물 메타 수치 사용.',
   posts=[('DawMB-3uWQD','creativelyemi','9.9K 좋아요 · 1.2K 댓글','Emily. 두 아이 Sunday meal prep'),
          ('DcPRI-bgp23','easysnackkitchen','4.9K 좋아요','바나나 원숭이 과일 플레이트'),
          ('DDWl6dyO_w2','annabelkarmel','3.6K 좋아요','Annabel Karmel(영국). Baby Toast Toppers'),
          ('CzWreJ3MT5q','foodiefunwithus','3.3K 좋아요','Chelsey Watkins. Snack Ideas for Toddlers 인포'),
          ('DbbEJcVEiC6','manakisalami','2.2K 좋아요','꿀벌 과일 플레이트')]),
 12: dict(tag='#savingschallenge', strength='weak', note='기관·소규모 계정, 수백 좋아요. 웹검색의 thebudgetmom·budgetwithmilly 계열이 실제 레퍼런스.',
   posts=[('DZ47DuskR9z','etsy (리포스트)','769 좋아요','저축 플래너 상품'),
          ('DK3qbzToU2N','ukristonaufanisi_dtsacco','244 좋아요','케냐 금융기관, 52주 챌린지'),
          ('DYffEgAp4HE','jeanettes.journey','138 좋아요','Cash Stuffing 101')]),
 13: dict(tag='#smarthomehacks', strength='weak', note='인도 가젯 리뷰·드롭쉬핑 계정 위주. 자동화 크리에이터는 웹검색(brett.tech_ 등) 참고.',
   posts=[('DXweHpnP3oW','reviewsetu','21K 좋아요 · 1.5K 댓글','힌디 가젯 리뷰(탄성 침대시트)'),
          ('DX084UVxApL','nextgen_gadget','10K 좋아요 · 11K 댓글','롤러 블라인드'),
          ('DQAEWtHDSRJ','home_garden_and_diy','1.7K 좋아요','스위치 아이디어')]),
 14: dict(tag='#sidehustleformoms', strength='weak', note='댓글 유도형 제휴 게시물이 섞임. elly.watso 건은 좋아요보다 댓글이 많은 전형적 comment-bait.',
   posts=[('DYBl0MGufK9','elly.watso','84K 좋아요 · 108K 댓글','"Past me wouldn\'t believe this…" 댓글 유도형'),
          ('CqnZl43o9so','savingwithben','231 좋아요','개인재무 팁'),
          ('DZFcLA9Eabm','iamlatashapeterson','165 좋아요','부업 아이디어'),
          ('DahDpJeMnBD','_brendasnider_','35 좋아요 · 191 댓글','"Getting paid to do chores?"')]),
 15: dict(tag='#momselfcare', strength='weak', note='명언·텍스트 카드 커뮤니티 계정. 릴스형 개인 크리에이터는 웹검색(brookeraybould) 참고.',
   posts=[('DEdDj5FioW_','momwithyou','18K 좋아요','Mom Community 명언 카드'),
          ('DGY4b7YyNDD','mommysbundle','1.8K 좋아요','Ana Maria Taney. "Who else needed to hear this"'),
          ('DZzAkpNNtVo','littlejoysformoms','62 좋아요','텍스트 카드')]),
 16: dict(tag='#smallbusinesstips', strength='mid', note='유머 릴스(1인 10역)와 "top 5 tips" 나열형이 통함. 나머지는 소규모 코치.',
   posts=[('DbLI_pWKT2H','_themarketingclub','11K 좋아요','Catherine Casey 마케팅 코치. "1 person working 10 jobs" 유머'),
          ('DQppZtckq13','happyandhannahmade','2.6K 좋아요 · 285 댓글','Hannah Mariona. "my top 5 tips to start a small business"'),
          ('DW6diVdDjGw','yaazhyawns_hair_accesories','623 좋아요','소상공인 아이디어'),
          ('DblhtGiIx4y','tylertalksbusiness','26 좋아요','')]),
 17: dict(tag='#boostsales', strength='spam', note='Shopify·Meta Ads 에이전시와 AI툴 광고만 나옴. 레퍼런스 가치 없음. 웹검색(hormozi, jeremyleeminer, officialandyelliott) 사용.', posts=[]),
 18: dict(tag='#entrepreneurmindset', strength='mid', note='명언 카드 위주. 예외적으로 일러스트 작가의 스토리형 캐러셀이 4.8만.',
   posts=[('DbifZvVs_-t','linesbyloes','48K 좋아요','일러스트 작가. "Say these 2 words and get yourself out there"'),
          ('DAONReyzHWv','aided.co','3K 좋아요','큐레이션 계정 명언'),
          ('DX2GhTZDywP','millionairecodess','-','인도 명언 계정')]),
 19: dict(tag='#newbusinessowner', strength='weak', note='소상공인 개업 공지·개인 스토리. 수백 좋아요.',
   posts=[('DM6P-m6TrJp','hamilton.mitch','531 좋아요','Josh Gyzen. 10년 전 정비소 인수 스토리'),
          ('DcdJIs-vIEn','enchantingresincreations_','211 좋아요','"behind every small business is a real person"')]),
 20: dict(tag='#localbusinessmarketing', strength='weak', note='소규모 에이전시·프리랜서 팁 카드. Google Business Profile 체크리스트 등 소재는 참고 가능.',
   posts=[('DbYAQpVNl8X','thrivestech','274 좋아요','Ravi Yadav. Google Business Profile 체크리스트'),
          ('DbOGAgbI3Ny','aiagently','-','Usama Akram. comment MARKETING → AI 마케팅 자료'),
          ('DcXmFRvxiNX','shanekilby','0','"You don\'t become the local authority by…"')]),
 21: dict(tag='#attractcustomers', strength='spam', note='타로·시길·에이전시 스팸. 유일한 참고는 브랜딩 vs 마케팅 vs 세일즈 인포그래픽.',
   posts=[('DZpLjmqSZsJ','kenny.kenray','5.1K 좋아요','Kenny Song 브랜드 디자이너. branding/marketing/selling 구분 인포')]),
 22: dict(tag='#smallbusinessowner', strength='strong', note='브랜드(라벨프린터) 포장 릴스와 "This is literally me" 공감 릴스가 10만 이상. 태그 유도(TAG YOUR SMALL BUSINESS)도 댓글 9.6K.',
   posts=[('DbOGDhBps-8','phomemo_studio','133K 좋아요 · 5.2K 댓글','라벨프린터 브랜드. 소상공인 포장 릴스'),
          ('DbN6xJtIO5a','simplyscrunchy_','100K 좋아요','헤어액세서리 소상공인. "This is literally me!! Do you relate"'),
          ('Dcf0s9axvRQ','andrarooney','4.3K 좋아요 · 9.6K 댓글','Female Empire Club. "TAG YOUR SMALL BUSINESS" 참여 유도'),
          ('DZ_i897NtyH','shopchrissycreates','-','소상공인 개인 계정')]),
 23: dict(tag='#inventorymanagement', strength='spam', note='B2B SaaS·컨설턴트 카드. 웹검색(theproductboss) 사용.',
   posts=[('DaBF5j4soXr','jaweriaishtiaq_24','11 좋아요','재고 소프트웨어 홍보')]),
 24: dict(tag='#smallbusinessfails', strength='weak', note='소규모 개인의 실패 공유(수십 좋아요). 실패담 포맷은 웹검색(hormozi, thelazyceo, sarablakely) 참고.',
   posts=[('Cs3H8FpNeNB','favoritepostcard_com','81 좋아요','"Let\'s talk about EPIC FAILS"'),
          ('DO8RVU-CVia','webmomster','11 좋아요','Alida Lee. 실패를 축하하는 이유')]),
 25: dict(tag='#solopreneur', strength='mid', note='"스택 공개"·"one-person business" 프레임 릴스. 텍스트온스크린 + 담담한 톤.',
   posts=[('DYVrkfXsjDC','liambuilds.ai','37K 좋아요','Liam Haley. "Days stack. Work compounds."'),
          ('DLKz1ZVRagP','iampascio','1.9K 좋아요 · 126 댓글','Pascio. "5 apps. No office. No team." 소프트웨어 스택 공개'),
          ('DTDtKu-Eaa7','nextmovenick','408 좋아요','Nick DiFrancesco. "one-person business in 2026"'),
          ('DU8U4EICHGE','business__infographics','-','인포그래픽 큐레이션')]),
 26: dict(tag='#retailtips', strength='weak', note='VMD·가격 전략 카드, 수십 좋아요. 웹검색(ajalderson, theboutiquehub, shwinnabegobrand) 사용.',
   posts=[('DWBXV5BCGKe','visual_by_josephine','26 좋아요','비주얼 머천다이징 팁'),
          ('DNQRkm9ALQJ','julia_the_retail_therapist','18 좋아요','Julia Hays. 관세 시대 가격 전략')]),
 27: dict(tag='#businessownerburnout', strength='strong', note='의외로 강함. 심리치료사의 "type A 번아웃" 릴스 63만, 고백형 브이로그·1인 사업자 공감 릴스가 10만 이상.',
   posts=[('DaJbGXOs_V5','therapist_in_chicago','626K 좋아요 · 2.6K 댓글','Jocelyn Nelson LCPC. "type A는 번아웃도 잘하려 한다"'),
          ('DbT3h__Ph7o','maplebutteroll','306K 좋아요 · 3.3K 댓글','Nini. 릴스'),
          ('C3PDsESrfbd','jenayroseofficial','214K 좋아요 · 5.3K 댓글','"Business Owners: But I\'m only one person" 공감형'),
          ('DaxxpLXRusW','phiphamofficial','73K 좋아요 · 6.9K 댓글','Phi Pham. "It\'s been hard today, and it\'s not even 11am" 고백형'),
          ('DaS_145Cqvd','hackinghr','785 좋아요','번아웃 신호 카드')]),
 28: dict(tag='#onlinebusinessforbeginners', strength='weak', note='comment 키워드 → 무료 체크리스트 퍼널이 표준. 규모는 작음.',
   posts=[('DafCEBPI30a','jaiswal_utkarsh99','1.2K 좋아요 · 362 댓글','Pinterest 활용 팁'),
          ('DaNMCqZJtkx','fayedecenilla','511 좋아요 · 336 댓글','Faye Decenilla. comment START 디지털상품 체크리스트'),
          ('DY2RgxkFQ5j','hector.corrales.915','186 좋아요','faceless business')]),
 29: dict(tag='#lowbudgetmarketing', strength='weak', note='그리드만 확인(게릴라 마케팅 2019, "Stop spending hundreds on marketing tools"). 작성자 미확인. 웹검색(pinksparrowsocial, prettylittlemarketer) 사용.', posts=[]),
 30: dict(tag='#businessautomation', strength='none', note='사용자 요청으로 중단. 웹검색 목록(nateherkai, theclarkgary, gannon.meyer) 참고.', posts=[]),
}

STRENGTH_LABEL = {'strong':'해시태그 강함','mid':'해시태그 보통','weak':'해시태그 약함','spam':'스팸 위주','none':'미확인'}

# ---- parse web-search markdown into per-keyword chunks -------------------
HEAD = re.compile(r"^(#{2,3})\s*(\d{1,2})\.\s*(?!@)(\S.*)$")
def load_web():
    chunks = {}
    extras = []
    for f in sorted(ROOT.glob('websearch_kw*.md')):
        text = f.read_text(encoding='utf-8')
        cur = None; buf = []
        def flush():
            if cur is None:
                if buf: extras.append(('\n'.join(buf)).strip())
            else:
                chunks[cur] = ('\n'.join(buf)).strip()
        for line in text.splitlines():
            m = HEAD.match(line)
            if m and 1 <= int(m.group(2)) <= 30:
                flush(); cur = int(m.group(2)); buf = []
                continue
            if cur is not None and re.match(r'^#{1,3}\s', line) and not m and not re.match(r'^#{1,4}\s*\d+\)', line):
                # a non-keyword heading ends the keyword chunk (notes / sources)
                flush(); cur = None; buf = [line]; continue
            buf.append(line)
        flush()
    return chunks, extras

web, extras = load_web()

# ---- REPORT.md -----------------------------------------------------------
md = ['# 해외 인스타그램 레퍼런스 — 키워드 30개', '',
      '조사일 2026-09-02. 웹검색(리스트 기사·프로필 메타) + 인스타그램 해시태그 검색(로그인 계정, 사람 속도) 병행. 국내 크리에이터 제외.', '']
for n, ko, tags in KW:
    ig = IG[n]
    md += [f'## {n}. {ko} — {tags}', '', f'**인스타 해시태그 검색 ({ig["tag"]}) · {STRENGTH_LABEL[ig["strength"]]}**', '', ig['note'], '']
    if ig['posts']:
        md += ['| 게시물 | 작성자 | 반응 | 내용 |', '|---|---|---|---|']
        for sc, owner, metric, desc in ig['posts']:
            md.append(f'| [{sc}](https://www.instagram.com/p/{sc}/) | @{owner} | {metric} | {desc} |')
        md.append('')
    md += ['**웹검색 해외 계정**', '', web.get(n, '_자료 없음_'), '']
md += ['## 부록 · 출처 및 미확인 항목', ''] + [e for e in extras if e]
OUT_MD.write_text('\n'.join(md), encoding='utf-8')

# ---- HTML ----------------------------------------------------------------
def esc(s): return html.escape(s, quote=True)

def ig_block(n):
    ig = IG[n]
    rows = ''
    for sc, owner, metric, desc in ig['posts']:
        owner_html = esc(owner) if owner.startswith('(') else f'<a href="https://www.instagram.com/{esc(owner.split(" ")[0])}/" target="_blank" rel="noopener">@{esc(owner)}</a>'
        rows += (f'<tr><td><a href="https://www.instagram.com/p/{esc(sc)}/" target="_blank" rel="noopener" class="sc">{esc(sc)}</a></td>'
                 f'<td>{owner_html}</td><td class="num">{esc(metric)}</td><td>{esc(desc)}</td></tr>')
    table = f'<div class="tw"><table><thead><tr><th>게시물</th><th>작성자</th><th>반응</th><th>내용</th></tr></thead><tbody>{rows}</tbody></table></div>' if rows else ''
    return (f'<div class="ig"><div class="ig-head"><span class="chip s-{ig["strength"]}">{STRENGTH_LABEL[ig["strength"]]}</span>'
            f'<span class="tag">{esc(ig["tag"])}</span></div><p class="note">{esc(ig["note"])}</p>{table}</div>')

sections = ''
nav_a = ''; nav_b = ''
for n, ko, tags in KW:
    s = IG[n]['strength']
    item = f'<a href="#k{n}"><span class="n">{n}</span><span>{esc(ko)}</span><i class="dot s-{s}"></i></a>'
    if n <= 15: nav_a += item
    else: nav_b += item
    webmd = web.get(n, '_웹검색 자료 없음_')
    sections += (f'<section class="kw" id="k{n}"><header><span class="kn">{n:02d}</span><div><h2>{esc(ko)}</h2>'
                 f'<p class="tags">{esc(tags)}</p></div></header>'
                 f'<h3>인스타그램 해시태그 검색</h3>{ig_block(n)}'
                 f'<h3>웹검색으로 찾은 해외 계정</h3><div class="md" data-md="{esc(webmd)}"></div></section>')

extras_md = '\n\n'.join(e for e in extras if e)
counts = {k: sum(1 for v in IG.values() if v['strength']==k) for k in STRENGTH_LABEL}

page = f'''<title>해외 릴스 레퍼런스 30</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
:root{{--bg:#f7f4f2;--ink:#1e1a1f;--ink-2:#5c525a;--line:#e3dcdb;--panel:#fffdfc;--accent:#8a2c5a;--accent-ink:#fff;
--strong:#2f6f4e;--mid:#8a6d1f;--weak:#9a5a3c;--spam:#8c2f39;--none:#7a7278;--chip-bg:#f1eae9;color-scheme:light}}
@media (prefers-color-scheme: dark){{:root:not([data-theme="light"]){{--bg:#171317;--ink:#f0e9ec;--ink-2:#b3a6ac;--line:#332a30;--panel:#1f1a1e;--accent:#e28ab6;--accent-ink:#1e1a1f;
--strong:#7fcfa0;--mid:#d9b85a;--weak:#e0967a;--spam:#ef8b96;--none:#a89fa5;--chip-bg:#2a2228;color-scheme:dark}}}}
:root[data-theme="dark"]{{--bg:#171317;--ink:#f0e9ec;--ink-2:#b3a6ac;--line:#332a30;--panel:#1f1a1e;--accent:#e28ab6;--accent-ink:#1e1a1f;
--strong:#7fcfa0;--mid:#d9b85a;--weak:#e0967a;--spam:#ef8b96;--none:#a89fa5;--chip-bg:#2a2228;color-scheme:dark}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--bg);color:var(--ink);font-family:"IBM Plex Sans KR",-apple-system,"Apple SD Gothic Neo",sans-serif;font-size:15px;line-height:1.6}}
a{{color:var(--accent)}}a:focus-visible{{outline:2px solid var(--accent);outline-offset:2px}}
.wrap{{display:grid;grid-template-columns:240px minmax(0,1fr);gap:40px;max-width:1240px;margin:0 auto;padding:32px 24px 80px}}
@media (max-width:860px){{.wrap{{grid-template-columns:1fr}}nav{{position:static!important;max-height:none!important}}}}
nav{{position:sticky;top:20px;align-self:start;max-height:calc(100vh - 40px);overflow:auto;font-size:13px}}
nav h4{{margin:18px 0 6px;font:600 11px/1 "IBM Plex Sans KR",sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-2)}}
nav a{{display:flex;align-items:center;gap:8px;padding:4px 6px;border-radius:4px;color:var(--ink);text-decoration:none}}
nav a:hover{{background:var(--chip-bg)}}nav .n{{font:500 12px "IBM Plex Mono",monospace;color:var(--ink-2);width:20px;text-align:right}}
nav .dot{{margin-left:auto;width:8px;height:8px;border-radius:50%;background:currentColor}}
.s-strong{{color:var(--strong)}}.s-mid{{color:var(--mid)}}.s-weak{{color:var(--weak)}}.s-spam{{color:var(--spam)}}.s-none{{color:var(--none)}}
h1{{font:700 clamp(30px,4vw,44px)/1.1 "Bricolage Grotesque","IBM Plex Sans KR",sans-serif;margin:0 0 10px;text-wrap:balance;letter-spacing:-.01em}}
.lede{{max-width:64ch;color:var(--ink-2);margin:0 0 20px}}
.legend{{display:flex;flex-wrap:wrap;gap:8px 18px;font-size:13px;margin:0 0 40px;padding:14px 16px;border:1px solid var(--line);background:var(--panel)}}
.legend span::before{{content:"";display:inline-block;width:8px;height:8px;border-radius:50%;background:currentColor;margin-right:6px}}
.legend b{{color:var(--ink);font-weight:600}}
.group{{margin:56px 0 12px;padding-bottom:8px;border-bottom:2px solid var(--ink);font:700 22px/1.2 "Bricolage Grotesque","IBM Plex Sans KR",sans-serif}}
.group small{{display:block;font:400 13px/1.5 "IBM Plex Sans KR",sans-serif;color:var(--ink-2)}}
section.kw{{padding:28px 0 36px;border-bottom:1px solid var(--line)}}
section.kw header{{display:flex;gap:16px;align-items:baseline;margin-bottom:18px}}
.kn{{font:500 28px/1 "IBM Plex Mono",monospace;color:var(--accent)}}
h2{{font:700 24px/1.2 "Bricolage Grotesque","IBM Plex Sans KR",sans-serif;margin:0}}
.tags{{margin:2px 0 0;font:400 13px "IBM Plex Mono",monospace;color:var(--ink-2)}}
h3{{font:600 12px/1 "IBM Plex Sans KR",sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-2);margin:26px 0 10px}}
.ig{{background:var(--panel);border:1px solid var(--line);padding:14px 16px}}
.ig-head{{display:flex;gap:10px;align-items:center;flex-wrap:wrap}}
.chip{{font:600 12px/1 "IBM Plex Sans KR",sans-serif;padding:5px 9px;border-radius:999px;background:var(--chip-bg)}}
.tag{{font:500 13px "IBM Plex Mono",monospace;color:var(--ink-2)}}
.note{{margin:10px 0 0;max-width:72ch}}
.tw{{overflow-x:auto;margin-top:12px}}
table{{border-collapse:collapse;width:100%;font-size:13.5px}}
th{{text-align:left;font-weight:600;color:var(--ink-2);padding:6px 8px;border-bottom:1px solid var(--line);white-space:nowrap}}
td{{padding:7px 8px;border-bottom:1px solid var(--line);vertical-align:top}}
td.num{{font-variant-numeric:tabular-nums;white-space:nowrap}}
.sc{{font:400 12.5px "IBM Plex Mono",monospace}}
.md{{max-width:76ch}}.md table{{font-size:13px;margin:8px 0 12px}}.md h2,.md h3,.md h4{{font:600 15px/1.3 "IBM Plex Sans KR",sans-serif;letter-spacing:0;text-transform:none;color:var(--ink);margin:18px 0 6px}}
.md p,.md li{{max-width:72ch}}.md blockquote{{margin:0 0 12px;padding:0 0 0 12px;border-left:3px solid var(--line);color:var(--ink-2)}}
.md code{{font:400 12.5px "IBM Plex Mono",monospace;background:var(--chip-bg);padding:1px 4px;border-radius:3px}}
.md strong{{font-weight:600}}
.appendix{{margin-top:48px}}.appendix summary{{cursor:pointer;font-weight:600}}
@media (prefers-reduced-motion:no-preference){{html{{scroll-behavior:smooth}}}}
</style>
<div class="wrap">
<nav>
<h4>주부 타겟</h4>{nav_a}
<h4>자영업자 타겟</h4>{nav_b}
<h4>부록</h4><a href="#appendix"><span class="n">+</span><span>출처·미확인 항목</span></a>
</nav>
<main>
<h1>해외 릴스 레퍼런스 30</h1>
<p class="lede">주부·자영업자 타겟 키워드 30개에 대한 해외 인스타그램 레퍼런스. 웹검색(리스트 기사와 프로필 메타)으로 계정을 모으고, 로그인 계정으로 해시태그 검색을 사람 속도로 돌려 실제 상위 게시물과 작성자를 확인했다. 조사일 2026-09-02, 국내 크리에이터 제외.</p>
<div class="legend"><b>해시태그 판정</b>
<span class="s-strong">강함 {counts['strong']}</span><span class="s-mid">보통 {counts['mid']}</span><span class="s-weak">약함 {counts['weak']}</span><span class="s-spam">스팸 {counts['spam']}</span><span class="s-none">미확인 {counts['none']}</span>
<em style="color:var(--ink-2);font-style:normal">약함·스팸 판정 키워드는 웹검색 계정 목록을 우선 참고</em></div>
<div class="group">주부 타겟 <small>1~15 · 살림·육아·절약·부업</small></div>
{''.join(s for s in sections.split('<section class="kw"')[1:16] and ['<section class="kw"'+x for x in sections.split('<section class="kw"')[1:16]])}
<div class="group">자영업자 타겟 <small>16~30 · 매출·마인드·운영·자동화</small></div>
{''.join('<section class="kw"'+x for x in sections.split('<section class="kw"')[16:])}
<details class="appendix" id="appendix"><summary>부록 · 출처 URL과 미확인 항목</summary><div class="md" data-md="{esc(extras_md)}"></div></details>
</main></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.2/marked.min.js"></script>
<script>
document.querySelectorAll('.md[data-md]').forEach(function(el){{
  try{{ el.innerHTML = marked.parse(el.getAttribute('data-md'), {{gfm:true, breaks:false}}); }}
  catch(e){{ el.textContent = el.getAttribute('data-md'); }}
  el.querySelectorAll('a').forEach(function(a){{a.target='_blank';a.rel='noopener'}});
}});
</script>
'''
OUT_HTML.write_text(page, encoding='utf-8')
print('md', OUT_MD, len('\n'.join(md)), 'html', OUT_HTML, len(page), 'chunks', sorted(web))
