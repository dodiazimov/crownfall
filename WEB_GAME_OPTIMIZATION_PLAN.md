# Crownfall web o‘yini — to‘liq optimizatsiya rejasi

Sana: 2026-10-08. Loyiha: `/home/behruz`. Hujjat keyingi model uchun bajariladigan texnik topshiriq.

**Implementatsiya yangilanishi (2026-10-08):** profiling harness, persistent battle/effect/dragon rendering, Low army LOD, quality/CSS, lossless terrain, HTTP compression/cache, collision geometry va render pacing bo‘yicha ishlar bajarildi. Natija, o‘lchov va qolgan vazifalar [WEB_GAME_OPTIMIZATION_RESULTS.md](WEB_GAME_OPTIMIZATION_RESULTS.md)da. Quyidagi “kod yozilmadi” va baseline qaydlari reja dastlab tuzilgan paytga tegishli; ishni davom ettirishdan oldin natija hujjatini o‘qing.

## 1. Vazifa va chegaralar

Foydalanuvchi o‘yinni optimizatsiya qilish bo‘yicha maslahatni `.md` faylda saqlashni so‘radi. **Ushbu bosqichda optimizatsiya kodi yozilmadi:** kod tahlil qilindi va ish rejasi tuzildi. Keyingi model implementatsiya so‘ralganda shu reja bilan ishlasin.

**Godot tekshirilmasin va o‘zgartirilmasin.** `godot-prototype/` va `dist/godot-test/` ushbu ish doirasidan tashqarida. Asosiy yo‘nalish: `dist/` ichidagi web o‘yin, `server.js`, `multiplayer.js` va tegishli testlar.

Maqsad: jangdagi qotishlarni, CPU/GPU yukini, xotira va trafik sarfini kamaytirish; boshlanish va boshqaruv javobini tezlashtirish. O‘yin qoidalari, grafikaning asosiy uslubi, AI adolati, save va multiplayer ishlashi saqlansin.

**Dalil chegarasi:** quyidagi kod yo‘llari va fayl hajmlari tekshirildi. Haqiqiy qurilmada FPS, GPU, heap, tarmoq va ko‘p xonali server profili olinmadi. Shuning uchun “eng katta bottleneck”, aniq FPS o‘sishi yoki foizli tezlashish hali tasdiqlanmagan. Ustuvorliklar — tekshirilishi kerak bo‘lgan tavsiyalar.

## 2. Keyingi model avval bilishi kerak bo‘lgan holat

- Bu oddiy HTML/CSS/JavaScript/SVG o‘yin. Ob-havo uchun Canvas ham bor; backend Node.js va WebSocket ishlatadi.
- `dist/` amaldagi tahrirlanadigan web koddir; `package.json`da build skripti yo‘q. Alohida `src/` yaratib, mavjud ish tartibini sababsiz ko‘chirmang.
- Xarita koordinatalari **2200 × 1500**, engine hozir **21 qal’a** bilan ishlaydi. Eski hujjatlardagi 1100 × 780 o‘lchamlarini implementatsiyaga ko‘chirmang.
- `dist/ai.js` faqat adapter. Haqiqiy AI algoritmlari `dist/engine.js` ichida, `aiForPlayer()` va uning yordamchi funksiyalarida.
- Server kodidagi amaldagi port `4173`; README’dagi `3000` eskirgan. `PORT`, `HOST`, `CROWNFALL_DATA_DIR` orqali sozlash mumkin.
- Node tekshiruv muhiti: `v20.18.0`. `server.js` yangi Node’da `node:sqlite`, mavjud bo‘lmasa JSON fallback ishlatadi. Ishlayotgan backendni o‘lchovda qayd eting.
- Ishchi daraxt allaqachon o‘zgartirilgan: `dist/app.js`, `career.js`, `engine.js`, `experience.js`, `i18n.js`, `view.js`, `multiplayer.js`, `server.js`, `package.json` va ayrim testlar. Bu o‘zgarishlarni reset/revert qilmang. `git diff` boshlang‘ich holatini tekshiring; eski commit bilan solishtirish hozirgi baseline o‘rnini bosmaydi.
- [Oldingi mantiq auditi](LOGIC_AUDIT_2026-10-07.md)dagi tuzatishlarni saqlang: maxfiy buyruqlar, snapshot validatsiyasi, jangdagi harakat, qo‘shin tarkibi, save, career va rematch.
- [Oldingi optimizatsiya g‘oyalari](OPTIMIZATION_AND_MAPS.md) tarixiy hujjat. Undagi “FPS cheklovi yo‘q”, “high 144 FPS”, eski askar sonlari va ayrim xarita ma’lumotlari hozirgi kodni to‘liq ifodalamaydi. Performance ishida ushbu yangi tekshiruvdan boshlang; yangi gameplay funksiyalarini shu vazifaga aralashtirmang.

## 3. Kod xaritasi va allaqachon bajarilgan optimizatsiyalar

Satrlar shu sanadagi holatga tegishli; fayl o‘zgarsa funksiyaning nomini `rg -n` bilan toping.

| Joy | Vazifa / hozirgi holat |
|---|---|
| `dist/app.js:4327`, `frame()` | Simulation, UI, autosave va render. Low 30 FPS; medium **va high 60 FPS**. 144 FPS haqidagi izoh kodga mos emas. |
| `dist/app.js:4387` | Hidden tab’da offline o‘yin pause/save qilinadi; asosiy frame menu/hidden holatida erta qaytadi. |
| `dist/view.js:660`, `syncArmies()` | Armiya DOM tugunlari `marching` Map’da saqlanadi; viewportdan tashqarida yashiriladi; sprite/roster keshlar mavjud. |
| `dist/view.js:828`, `render()` | Castle art/detail va ownership keshlar bor; route preview faqat kalit o‘zgarsa qayta hisoblanadi. |
| `dist/view.js:585`, `syncRoadBattles()` | Jangning JSON kaliti bir xil bo‘lsa qayta chizish o‘tkazib yuboriladi, lekin kalitning o‘zi har renderda quriladi. |
| `dist/view.js:937` atrofida | Aktiv effektlar `innerHTML` orqali renderda qayta yaratiladi. |
| `dist/experience.js:141`, `sampleFrame()` | Auto grafikada sekin kadrlar bo‘yicha high → medium → low pasayish bor. |
| `dist/map-style.js:19` va `:27` | Texture/coast/route keshlar, xarita rasmlarini tanlash; 1–10 xaritalarda ko‘pincha katta PNG ishlatiladi. |
| `dist/view.js:1190`, `loadMatchTerrain()` | Terrainni kechiktirib yuklash mexanizmi bor. Yangi preload shu afzallikni yo‘qqa chiqarmasin. |
| `dist/engine.js:2624`, `move()` | Armiyalar orasida barcha juftliklarni tekshirish va kontakt guruhlarini yig‘ish. |
| `dist/engine.js:2729`, `aiForPlayer()` | AI baholash, yordam, hujum, yo‘l va kelajak holat hisoblari. AI har frame’da emas, timerlar bilan ishlaydi. |
| `dist/engine.js:3185`, `tick()` | Kiruvchi dt ≤ 0.25 s, ichki bo‘laklar ≤ 0.025 s. Bu qat’iy doimiy 40 Hz scheduler degani emas. |
| `dist/app.js:572`, `applySnapshot()` | Snapshotni validatsiya qiladi; holatni almashtiradi; effekt identifikatsiyasini saqlaydi. Oddiy snapshotda darhol render qilmaydi. |
| `server.js:241`, `broadcastToRoom()` | Har mijozga shaxsiy orders; sekin socket uchun 32768 byte buffer chegarasida periodik snapshotni tashlab yuborish bor. |
| `server.js:1282`, `multiplayer.js:113` | Server 100 ms interval bilan xonalarni yangilaydi, to‘liq snapshot yuboradi; simulation tezligi `0.65`. |

**Qayta yaratish kerak emas:** quality selector, kamera culling, shared AI, persistent army DOM, hidden-tab pause, asosiy render limit, socket backpressure va mavjud art keshlar. Ularning qolgan xarajatlarini o‘lchang va takomillashtiring.

## 4. P0 — o‘lchash va baseline

Implementatsiya shu bosqichdan boshlansin. O‘lchovsiz engine yoki renderer almashtirmang.

### 4.1 Takrorlanadigan ssenariylar

1. Menu → hero → match, cold cache va warm cache: yuklangan byte, rasmlarning decode vaqti, birinchi boshqariladigan o‘yin holatigacha vaqt.
2. Oddiy 2 o‘yinchili xarita: tinch holat, yurish, qal’a olish, upgrade va effect.
3. 4 o‘yinchi/Hard botlar: 10, 50, 100 va 200 **armiya obyektli** nazorat qilinadigan stress holatlar. Bu 200 askar degani emas. Real o‘yinga o‘xshash fixture va sun’iy yuqori limit natijasini alohida yozing.
4. Bir joydagi bir nechta yo‘l janglari; recall/intercept; dragon; rain/fog/snow; uzoq va yaqin zoom; pan/pinch.
5. Save/restore, pause, menu, hidden → visible, restart/rematchni kamida 20 marta takrorlash.
6. 2 va 4 mijozli multiplayer; reconnect, sekin tarmoq, socket backpressure. Server yuk sinovini 1/10/50 xona bosqichlarida boshlang; undan yuqoriga faqat resurs yetganda boring.

Har bir o‘lchovda seed, map, epoch, bot darajasi, armiyalar/janglar soni, quality, ekran, DPR, brauzer, CPU/GPU, Node, commit + local diff holati yozilsin. Bir xil ssenariyda 10 s qizdirish, 60 s o‘lchash, kamida 3 takror tavsiya qilinadi. Uzoq xotira sinovi 15–30 daqiqa.

### 4.2 O‘lchanadigan ko‘rsatkichlar

- `E.tick`, `move`, AI, `V.render`, `syncArmies`, `syncRoadBattles`, `updateUI`, `saveMatch`, snapshot parse/validate/apply uchun p50/p95/p99 davomiylik.
- rAF intervalini **haqiqiy render qilingan kadr** intervali va JS ish vaqtidan alohida yozing. 144 Hz callback mavjudligi o‘yin 144 FPS chizayotganini anglatmaydi.
- Brauzer Performance trace: scripting, style/layout, paint, raster, long task >50 ms. JS vaqtigina GPU holatini ko‘rsatmaydi.
- DOM/SVG node soni, ko‘rinayotgan sprite soni, heap va detached node; restartdan so‘ng kesh/listener/timer o‘sishi.
- Server: tick sikli p95/p99, event-loop kechikishi, RSS/heap, CPU, snapshot byte/client/s, encode/serialize vaqt, skip qilingan snapshotlar.
- Network waterfall: qaysi asset haqiqatda yuklandi, siqilgan transfer va decoded rasm hajmi. Diskdagi umumiy asset hajmini bitta sahifa trafikiga tenglashtirmang.

Profiling flag bilan yoqilsin; har kadrda console log yoki cheksiz `performance.mark` yozilmasin. Bounded ring-buffer va davriy agregatsiya ishlating. Artefaktlarni `artifacts/web-optimization/`ga saqlash mumkin; Node smoke harness, browser fixture va natija JSON’lari reproduksiyaga yetarli bo‘lsin.

### 4.3 Boshlang‘ich qabul maqsadlari

Quyidagilar **o‘lchangan natija emas**, kelishiladigan boshlang‘ich budget:

| Muhit | Maqsad |
|---|---|
| Vakil desktop, medium/high | 60 FPS; rendered frame interval p95 ≤20 ms, p99 ≤33.4 ms; JS simulation+render p95 ≤10 ms |
| Vakil kuchsiz qurilma, low | Barqaror 30 FPS; interval p95 ≤36 ms, p99 ≤50 ms; JS p95 ≤20 ms |
| Boshqaruv | Buyruqning lokal vizual tasdig‘i p95 <100 ms; tarmoq round-trip alohida |
| Server | Kelishilgan xona yukida barcha xonalarni yangilash + snapshot sikli p95 <50 ms; 100 ms intervaldan ortib ketishlar qayd etilsin |
| Xotira | Isinishdan keyin restart/rematch bilan doimiy ko‘payib boradigan retained node/kesh aniqlanmasin |

Headless/CPU throttling qiyoslashga yordam beradi; fizik telefon yoki integratsiyalashgan GPU tekshiruvini to‘liq almashtirmaydi. Ishlatilgan qurilma ma’lum bo‘lmasa “barcha qurilmalarda 60 FPS” deb yozmang.

## 5. P1 — render va UI xarajatini kamaytirish

### R1. Jang va effekt DOM’ini barqaror qilish

**Dalil:** `syncRoadBattles()` JSON kalitini qurishda `b.armies` ichidagi har id uchun `s.armies.find()` chaqiradi; keyin o‘zgargan janglar uchun butun qatlam `innerHTML` bilan yangilanadi. Qo‘shin soni o‘zgarsa bu tez-tez sodir bo‘ladi. `render()` aktiv effektlar uchun ham qatlamni qayta yasaydi.

**Amal:** render boshida bir marta `armyById` tuzing yoki mavjud yaroqli indeksdan foydalaning. Jang tugunlarini `battle.id` bo‘yicha saqlang. Statik tutun/ramka alohida, son/ratio/position faqat o‘zgarganda yangilansin. Effektlarda cheklangan qayta ishlatiladigan tugunlar yoki lokal identifikator qo‘llang; tugagan effektlar tozalansin. Vizual particle limit gameplaydagi zarar yoki engine eventlarini tashlab yubormasin. Armiya/battle indeksi state almashtirilganda eskirib qolmasin.

**Qabul:** bir xil jang holatini qayta chizganda node yaratilishi yo‘q; qo‘shin soni va ratio yangilanadi; jang tugashi/restartdan keyin node/kesh tozalanadi; effect ovozi snapshotlarda takrorlanmaydi; runtime va allocations baseline’dan yaxshilanadi.

### R2. Low rejimda army LOD’ni haqiqatan yengillashtirish

**Dalil:** `syncArmies()` low’da zoomga qarab 6 yoki 10, boshqa rejimlarda 8/12/20 gacha sprite tanlaydi. Har ko‘rinadigan sprite uchun `Math.sin` va `transform` yoziladi. Low ham shu yo‘ldan o‘tadi; ayrim `.querySelector()`/`.querySelectorAll()` chaqiruvlari kadr ichida qolgan.

**Amal:** low uchun avval 1–3 vakil sprite, bitta umumiy harakat transformi, qadam/bob va dust o‘chirilgan variantni o‘lchang. Tarkib matni, askar soni, bayroq, recall va klik maydoni saqlansin. Medium/high uslubini birdan kamaytirmang. Statik child reference’larni tugun yaratilganda keshlang; roster/composition/ARIA/owner/weather qiymatlari faqat tegishli ma’lumot o‘zgarsa yangilansin. Ekran bo‘yicha umumiy sprite budgetni ham o‘lchab ko‘ring; faqat per-army limit yuzlab armiyalarda yetmasligi mumkin.

**Qabul:** 50/100/200 armiya sahnalarida SVG mutation va render p95 kamayadi; yaqin/uzoq zoom, epoch, cavalry yo‘nalishi, jang, recall, qaytish va accessibility ishlaydi. Culling simulationni o‘chirmaydi. Armiya tashqarida bo‘lsa-da yo‘li ekranni kesib o‘tishi mumkin — route ko‘rinishi talabini tekshiring.

### R3. UI va pause holatini faqat kerak bo‘lganda yangilash

**Dalil:** `updateUI()` allaqachon 0.15–0.2 s oralig‘ida ishlaydi, lekin qayta `E.sync`, totals/income/owned va ko‘p DOM yozuvlari bor. `render()` castle cache kaliti uchun ham `E.defense` va composition hisoblaydi. Pause holatida asosiy loop render/UI/save ishiga baribir kirishi mumkin.

**Amal:** bitta UI yangilanishida faction summary/defense’ni qayta-qayta hisoblamang; o‘zgarmagan text/attribute yozilmasin. Yopiq training/dock/table panelining qimmat tarkibini faqat ochilganda yoki dirty bo‘lsa yangilang. Engine `sync` invarianti nima ekanini tekshirmasdan o‘chirmang. Pause’da interaction, kamera, quality, tooltip va zarur HUD invalidation ishlasin, qolgan statik battlefield ishini cheklang.

**Qabul:** qo‘shin/oltin/timer/toast va action availability eskirib qolmaydi; pause paytida tanlash/zoom/settings ishlaydi; qaytishda catch-up sakrash yo‘q; UI p95 va idle CPU kamayadi.

### R4. CSS, weather va quality izchilligi

**Dalil:** CSS tartibi `fonts.css → style.css → reference-ui.css → battlefield-ui.css`. `reference-ui.css` low castle filter’ini o‘chiradi, keyingi `battlefield-ui.css:15` boshqa kuchli `!important` filter qo‘yadi. Qaysi qoida haqiqatan ishlashini browser computed style bilan tekshirish zarur. `setQuality()` weatherni yangilaydi, lekin `V.init()`da tanlangan statik detallarni qayta qurmaydi.

**Amal:** low’dagi hisoblangan filter/backdrop-filter/animation va ustma-ust override’larni tekshiring; zarur minimal override’ni to‘g‘ri cascade joyida yozing. Butun CSS’ni birdan qayta yozmang. Quality o‘zgarganda barcha tegishli qatlamlar yangilansin, kamera va selection yo‘qolmasin. Weather’da mavjud low/clear/hidden early-return’larni saqlang; DPR/backing-size budgetni o‘lchang. Reduced-motion dekorativ animatsiyalarda izchil ishlasin.

**Qabul:** low’da qimmat filterlar tasdiqlangan ravishda o‘chiq; medium/high ko‘rinishi saqlangan; match ichida quality almashtirish to‘g‘ri; pause/reduced-motion va rain/snow regressiyasi yo‘q.

## 6. P1 — asset va yuklanish

**Disk inventari:** Godot eksportisiz `dist/` **71,378,809 byte (~68.1 MiB)**. Bu boshlang‘ich download hajmi emas. `app.js` 180,311 byte; `engine.js` 118,015; `view.js` 91,118. Ayrim terrain PNG fayllari 2.8–3.6 MB.

Muhim misollar: `terrain-premium-8.png` 3,565,451 byte; `terrain-premium-2.png` 3,475,280; `terrain-premium-6-v3.png` 2,782,439. `dist/map-style.js:27–31` tanloviga ko‘ra ular amalda ishlatilishi mumkin; katalogda WebP borligi o‘zi yetarli emas.

**Amal tartibi:**

1. Network trace bilan menu va tanlangan xaritaning haqiqiy yukini yozing. Faqat kerakli terrain/epoch assetlarini yuklashni saqlang.
2. Amalda tanlanayotgan premium PNG uchun sifatli WebP variant yarating; desktop va kichik ekran o‘lchamini alohida baholang. Mavjud `terrain_N.webp` aynan shu art ekanini tekshirmasdan almashtirmang.
3. Rasm o‘lchami kamayishida yuqori zoom, koordinata, gate/road anchor va aspect ratio saqlansin. Alpha kerak bo‘lgan structure/sprite chetlari buzilmasin.
4. Asset yo‘llari hozir ayrim joylarda `/assets/...` bilan boshlanadi. README offline/file launchni va’da qiladi, lekin bu yo‘llar muammo tug‘dirishi mumkin. Relativ URLga o‘tishda localhost, subpath va `file://`ni tekshiring; mavjud xatoni baseline’dan ajrating.
5. Keraksiz PNG/JPG variantlarni source/deployment manifest orqali aniqlang. Reference/art manbalarini ko‘r-ko‘rona o‘chirmang. Disk hajmini kamaytirish FPS oshishi degani emas.
6. Fontlar uchun amalda ishlatilayotgan face/weightlarni aniqlang; WOFF2/subset faqat zarur belgilar (lotin, o‘zbek apostroflari, kirill va boshqa mavjud tillar) va litsenziya saqlanganda. Avval PNG yukini kamaytirish foydasini o‘lchang.
7. Minify va modulga ajratish keyingi bosqich: script tartibi/global API/offline launch buzilmasin. Birinchi ish sifatida framework migratsiyasi yoki umumiy bundler qayta qurilishi talab qilinmaydi.

**Qabul:** cold-cache selected-map byte va ready-time kamaygan; yuqori zoom screenshot qiyosi qoniqarli; barcha xarita/epoch assetlari mavjud; HTTP cache’da yangilangan artning eski nusxasi qolmaydi.

## 7. P1/P2 — server va multiplayer

### N1. Har request’da sinxron compressionni olib tashlash

**Dalil:** `server.js:716–745` faylni o‘qigach `brotliCompressSync` yoki `gzipSync` bajaradi; bu shu processdagi o‘yin ticklari bilan event loopni bo‘lishadi. Tayyor `.gz` bo‘lsa ishlatish yo‘li allaqachon bor.

**Amal:** tanlangan web JS/CSS/HTML/SVG uchun deploy vaqtida `.br`/`.gz` yaratish yoki hajmi cheklangan, file revision bilan invalidatsiya qilinadigan compressed-response cache. On-demand kerak bo‘lsa async API va bir xil asset so‘rovlarini birlashtirish. Barcha katta rasmlarni cheksiz RAM cache’ga olmang. `Accept-Encoding` sifati/q=0, identity fallback, `Vary`, `Content-Length` va 404/path traversal himoyasini saqlang.

**Qabul:** parallel cold asset yuklari davomida match tick/event-loop p95 yaxshilanadi; brauzer to‘g‘ri decode qiladi; identity/gzip/br bir xil manbani beradi. Godot fayllari va eksport pipeline’i bu ishga kiritilmasin.

### N2. Asset versiyasi va HTTP cache to‘g‘riligi

**Dalil:** server rasm/font/SVG’larni URL hash bo‘lmasa ham bir yil `immutable` qiladi. Yangi WebP’ni eski nomga yozish foydalanuvchiga eski artni qoldirishi mumkin.

**Amal:** o‘zgarmas URL uchun content hash yoki izchil versiya; HTML revalidation, versiyasiz o‘zgaruvchan fayllarga mos ETag/Last-Modified. Barcha referenslar bir release’ga tegishli bo‘lsin. HTML’ning `v=` qiymatlarini tegishli JS/CSS o‘zgarganda yangilang.

**Qabul:** warm cache’da ortiqcha transfer kamayadi, deploydan so‘ng yangi kod va art yuklanadi, eski URL hali kerak bo‘lsa ishlaydi.

### N3. Snapshot nusxalash va yuborish xarajati

**Dalil:** server har 100 ms to‘liq state yuboradi. `broadcastToRoom()` avval umumiy JSON/frame tayyorlaydi, so‘ng snapshot uchun har role’ga alohida JSON yaratadi. Mijoz `JSON.parse`dan keyin `E.deserialize(object)` orqali yana stringify/parse qiladi. Bu nusxalash mavjud validatsiya va inputni mutatsiya qilmaslik kafolatining bir qismi.

**Avval:** keraksiz umumiy encode’ni snapshot yo‘lidan olib tashlashni o‘lchang. Parse/clone/validate uchun alohida vaqt oling. Size limit, schema va clone semantikasini saqlagan holda snapshot decode yo‘lini takomillashtiring; “server ishonchli” deb validatsiyani tashlamang. Save parserni tarmoq uchun soddalashtirib buzib qo‘ymang.

**Keyin, trafik haqiqiy muammo bo‘lsa:** versiyalangan snapshot DTO; match boshida static map/config, keyin dynamic state. Delta protokol faqat full resync, matchId/revision, o‘chirilgan entitylar, reconnect va gap recovery bilan. Sekin socketda skip qilingan delta keyingi patchni buzmasin; full snapshot hozirgi backpressure bilan xavfsizroq.

**Qabul:** recipient faqat o‘zining hali jo‘natilmagan orders’ini oladi; forged/invalid state rad etiladi; reconnect/rematch va effect identity saqlanadi; bandwidth/parse/encode p95 natijasi yoziladi. Tick rate yoki snapshot chastotasini o‘lchovsiz kamaytirmang.

### N4. Login/persistence event-loop bosimi

**Dalil:** `hashPassword()` `scryptSync` ishlatadi; JSON fallbackda sinxron file read/write mavjud.

**Amal:** faol match bilan parallel login yukini o‘lchang. Zarur bo‘lsa async scrypt, chegaralangan concurrency va mavjud rate limitni saqlash. Persistence async bo‘lsa yozuvlar navbati/atomikligi ham hal qilinsin; parallel read-modify-write foydalanuvchilarni yo‘qotmasin. Real `data/` bilan stress test o‘tkazmang.

**Qabul:** login/account/session semantikasi saqlanadi; noto‘g‘ri parol testi, parallel registration/save va room-tick kechikishi tekshiriladi. Worker yoki xonalarni processlarga bo‘lish faqat o‘lchangan sig‘im talab qilganda.

## 8. P2 — engine va AI; regressiya xavfi yuqoriroq

### E1. Collision broad-phase

**Dalil:** `move()` har segmentda armiyalarni juftma-juft tekshiradi — shu qism O(A²). `contactTime()` har juftlikda bir nechta `position()` chaqiradi; kontakt guruhlarini yig‘ish ham qayta skan qiladi. Umumiy xarajat segmentlar va janglarga ham bog‘liq.

**Amal:** profilingda bu ustun bo‘lsa, avval segment uchun position/velocity/next-corner hisoblarini qayta ishlating. Keyin swept AABB/spatial hash kabi broad-phase bilan faqat ehtimoliy juftliklarni `contactTime()`ga uzating. Faqat hozirgi nuqta yoki bir xil route ID bilan filtrlash yetmaydi: kesishadigan yo‘llar, yaqin parallel yo‘llar, tez cavalry, recall/intercept va turgan jangga kelayotgan armiya bor. Hozirgi eng erta kontakt va bir vaqtdagi guruhlash semantikasi saqlansin; tartib barqaror bo‘lsin.

**Qabul:** eski-yangi algoritmni bir xil fixture/seed/dt bo‘yicha taqqoslang: kontakt, arrival, g‘olib, unit tarkibi, resurs va buyruqlar. Float xatolik uchun belgilangan tolerance; o‘yin natijasidagi farq yashirilmasin. 50/100/200 armiya benchmarki va barcha xaritalar regressiyasi.

### E2. AI va yo‘l hisoblarining qisqa muddatli keshi

**Dalil:** `aiTravelTime()` → `routeBetween()` → route length takrorlanadi; incoming/forecast/owned filtrlari ko‘p. Lekin yo‘llar qisqa va qal’alar 21 ta: foyda collision yoki renderdan kichik bo‘lishi mumkin.

**Amal:** static route geometry/lengthni map+koordinata+route mode bo‘yicha keshlashni o‘lchang. Butun ETA’ni shu kalit bilan keshlamang: weather, hero, unit tarkibi, speed/boost ham ta’sir qiladi. AI bir qaror ichida dispatch/recruit/cancel qiladi; forecast cache shu mutatsiyadan keyin invalidatsiya qilinsin. Kesh match/room hayoti bilan chegaralansin.

**Qabul:** AI dushmanning maxfiy buyruqlarini bilib qolmaydi; mavjud strategiya va iqtisodiy adolat saqlanadi; brauzer/server bir engine’dan foydalanadi; Hard/Normal fixture natijalari va decision p95 tekshiriladi. Tezlatish uchun AI’ni kamroq aqlli yoki sun’iy kuchli qilish bu vazifa emas.

### E3. Simulation/render vaqtini ajratish

**Dalil:** render 30/60 bilan cheklangan, `E.tick` esa offline’da har rAF callbackda ishlaydi. Engine kiruvchi dt’ni mayda bo‘laklaydi, ammo yuqori Hz’da invocation xarajati ortishi mumkin. `lastRenderTime = now` ham ayrim refresh chastotalarida kadr pacingini noqulay qilishi mumkin; bu profil bilan tasdiqlansin.

**Amal:** avval 60/75/120/144 Hz pacing va tick vaqtini tekshiring. Zarur bo‘lsa alohida simulation accumulator, cheklangan catch-up va renderer interpolation. `E.tick` ichidagi qadam chegarasi, `simSpeed`, multiplayer `0.65`, pause/result/hidden vaqtlarining semantikasi saqlansin. Renderer interpolation authoritative gameplay ma’lumotini buzmasin. Boshida faqat pacing remainder’ni to‘g‘rilashning foydasini o‘lchang; butun timestep tizimini shoshilib almashtirmang.

**Qabul:** bir xil elapsed game time’da income, training, weather, crown timer va troop arrival mos; pause/hidden’dan qaytganda katta sakrash yo‘q; multiplayer server tezligi client FPS’iga bog‘liq emas.

## 9. P2/P3 — save, xotira, audio va uzoq sessiya

- `saveMatch()` hozir har 4 s `E.serialize` + sinxron `localStorage.setItem` qiladi. Profilga spike chiqsa dirty save, xavfsiz vaqtga coalescing va bounded scheduling qo‘shing; pause/pagehide/manual save hamda restore ishlasin. Pagehide’da kechiktirilgan async yozuvga yolg‘iz tayanmang. IndexedDB migratsiyasi faqat real ehtiyoj bilan, eski save o‘qilishi saqlanib.
- `marching`, battle/effect pool, art/texture/route keshlar va UI listenerlari restart/epoch/map switchdan so‘ng tekshirilsin. `requestAnimationFrame`, timer, ResizeObserver, WebSocket callback va Web Audio node’larda lifecycle egasi aniq bo‘lsin. Heap snapshot bilan leak tasdiqlamasdan “memory leak tuzatildi” demang.
- `sound.js` allaqachon hidden’da tone yaratishni cheklaydi. Profilda ko‘p ovoz bo‘lsa bir xil vaqtdagi SFX’ga limit/coalescing; tugagan node’larni disconnect qilishni tekshiring. AudioContext bitta qayta ishlatiladigan lifecycle’da qolsin. Bir marta start/stop qilinadigan OscillatorNode’ni qayta start qilishga urinish yaramaydi; barcha obyektlarni ko‘r-ko‘rona poolga ko‘chirmang.
- `sampleFrame()` hozir callback dt >35 ms mezoni bilan ishlaydi; 60 FPS target’dagi 25–30 ms sustlikni yetarli ko‘rmasligi mumkin. Targetga mos sustained budget, warm-up, cooldown/hysteresis va render/CPU metrikalariga asoslang. Qo‘lda tanlangan quality’ni majburan o‘zgartirmang; short asset-decode spike’ni doimiy zaif qurilma deb qabul qilmang.
- Canvas/WebGL renderer, Worker simulation yoki katta ECS qayta yozish faqat yuqoridagi choralardan keyingi profil bilan oqlansa alohida tajriba bo‘lsin. 21 qal’ali SVG UI’ni almashtirish hit-testing, text, touch, accessibility va screenshot regressiyalarini keltiradi.

## 10. Testlar va bajarish buyruqlari

Avval `package.json`ni tekshiring: script va testlar o‘zgarishi mumkin. Mavjud testni o‘tkazish uchun assertion’ni susaytirmang. Faqat haqiqatda o‘zgargan behavior/algoritm uchun ma’noli regression qo‘shing.

```bash
cd /home/behruz
git status --short
npm run test:all
```

`test:all` engine, audit regression, camera, career, interface va serverni qamraydi. **Barcha visual/map/browser testlarni qamramaydi.** UI/renderer/asset o‘zgarganda tegishlilarini qo‘shimcha ishlating:

```bash
npm run test:mobile
npm run test:map
npm run test:map-style
npm run test:map-audit
npm run test:battlefield
npm run test:anchors
npm run test:castle-evolution
node tests/army-art.test.cjs
```

Haqiqiy browser test uchun Playwright va uning Chromium’i, shuningdek ishlab turgan server kerak. Dependency mavjud bo‘lmasa oldin tekshiring, keyin lockfile bilan mos `npm ci`/browser install qiling. Ishlayotgan server portini egallamang. Izolyatsiyalangan data bilan alohida terminalda:

```bash
PORT=4175 HOST=127.0.0.1 CROWNFALL_DATA_DIR=/tmp/crownfall-web-opt-data node server.js
```

Ikkinchi terminalda:

```bash
CROWNFALL_URL=http://127.0.0.1:4175 npm run test:browser
```

Haqiqiy local `data/users.json` yoki `data/crownfall.db`ni test fixture sifatida ishlatmang. Server jarayonini yakunda faqat o‘zingiz ishga tushirgan PID orqali to‘xtating. Test artefaktlari va profil natijalarini real foydalanuvchi ma’lumotlaridan ajrating.

Engine o‘zgarsa: 11 xarita × oddiy/tasodifiy qal’alar, 2/3/4 faction, progressive/nonprogressive combat, weather, hero, supply/reserve, coordinate, recall/intercept, dragon, training, victory, serialize/deserialize invariantlari. UI o‘zgarsa: 1440×900, 768×1024, 390×844, 320×568; barcha quality va epoch; touch/keyboard; 2-mijozli reconnect/rematch.

## 11. Tavsiya etilgan bajarish ketma-ketligi

| Navbat | Ish paketi | Tugallanganini ko‘rsatadigan dalil |
|---|---|---|
| 1 | P0 baseline va o‘lchov harness | JSON/trace + fixture + qurilma/muhit tavsifi |
| 2 | R1 jang/effect, R2 low army, R3 UI | DOM mutation/allocation/render p95 oldin-keyin; browser regression |
| 3 | R4 CSS/quality/weather va assetlar | Computed style, screenshot, cold/warm load qiyosi |
| 4 | N1/N2 compression/cache | Parallel asset + match yuk testi; release cache to‘g‘riligi |
| 5 | N3/N4 snapshot/login | Encode/parse/bandwidth/event-loop metrikalari; maxfiylik/reconnect testlari |
| 6 | Profilda ustun bo‘lgan E1/E2/E3 | Deterministik behavior qiyosi va engine benchmark |
| 7 | Save/lifecycle/adaptive quality | 15–30 min soak va 20 restart; xotira/idle CPU |
| 8 | Yakuniy tekshiruv va handoff | Regressiyalar, oldin-keyin jadval, ochiq cheklovlar |

Har paket alohida kichik diff bo‘lsin. Foyda bermagan murakkablashtirishni qoldirmang. Baseline fayllari va patchdan keyingi natijalar bir xil fixture’da olinsin. Paketni “done” qilishdan oldin gameplay saqlanganini ham, performance yaxshilanganini ham tekshiring.

## 12. Keyingi modelga tayyor boshlash topshirig‘i

> `WEB_GAME_OPTIMIZATION_PLAN.md`ni o‘qi va Crownfall web o‘yinini shu asosda optimizatsiya qil. Godot kataloglarini tekshirma yoki o‘zgartirma. Mavjud uncommitted o‘zgarishlarni saqla. Avval P0 baseline ol, profilingga qarab P1 ishlaridan boshla. Eski optimizatsiya hujjatidagi allaqachon mavjud funksiyalarni qayta yaratma. Engine/AI/network o‘zgarishlarini alohida tekshir; gameplay, maxfiy orders, save validatsiyasi, kamera, epoch va offline ishlashni saqla. Har paket uchun oldin-keyin raqamlar va tegishli testlar yoz. Fizik qurilmada o‘lchanmagan natijani kafolat sifatida bermagin. Oxirida qaysi vazifalar bajarildi, qaysilari foydasiz bo‘lgani uchun qoldirildi, qaysilari ochiq ekanini shu hujjatga bog‘langan natija faylida qayd et.

## 13. Texnik manbalar

- rAF monitor refresh bilan bog‘liq; vaqtga asoslangan harakat va background tab xulqi uchun [MDN requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame). Bu loyiha FPS’i o‘lchovi emas.
- Script, style, layout, paint va composite xarajatlarini ajratib tekshirish uchun [web.dev Rendering performance](https://web.dev/articles/rendering-performance).
- Node compression API’lari va async/threadpool xulqi uchun [Node.js Zlib](https://nodejs.org/api/zlib.html). API tanlashda o‘rnatilgan Node versiyasi bilan moslikni tekshiring.

## 14. Ushbu hujjat tayyorlangandagi tekshiruv qaydi

- Web/client/engine/AI/server kod yo‘llari va asset hajmlari o‘qib tekshirildi; Godot tahlil qilinmadi.
- O‘yin implementatsiyasiga o‘zgartirish kiritilmadi.
- `npm run test:all` boshlang‘ich holatda muvaffaqiyatli tugadi (exit code 0): engine, audit regression, camera, career, interface va server suite’lari o‘tdi. Vaqtinchalik log: `/tmp/crownfall-optimization-baseline.log`. Bu functional baseline; FPS yoki tezlashish isboti emas.
- Brauzer performance trace, haqiqiy qurilma FPS/GPU, memory soak va server load benchmark hali bajarilmagan; ular P0 vazifalaridir.
