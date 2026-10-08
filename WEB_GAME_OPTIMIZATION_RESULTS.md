# Crownfall web optimizatsiyasi — bajarilgan ishlar

Sana: 2026-10-08. Ish [asosiy reja](WEB_GAME_OPTIMIZATION_PLAN.md) bo‘yicha bajarildi. Godot kataloglari tekshirilmadi yoki o‘zgartirilmadi. Avvalgi uncommitted o‘zgarishlar saqlandi.

## Koddagi o‘zgarishlar

- **Jang va effektlar:** `dist/view.js` jang markerlari, faction label/ratio, effect va drakon tugunlarini saqlaydi; o‘zgargan son, joy va life qiymatlari yangilanadi. Jang uchun armiya id indeksi ishlatiladi. Tugagan entity va match restartida tegishli kesh tozalanadi. Render simulation state’ni o‘zgartirmaydi.
- **Low grafika:** uzoq zoomda 3, yaqin zoomda 4 gacha vakil askar sprite’i; tarkib/son/recall boshqaruvi saqlanadi. Low’da individual qadam animatsiyasi va chang o‘chiq. DOM reference, roster va tarkib matni keshlanadi; o‘zgarmagan atributlar qayta yozilmaydi. `battlefield-ui.css` cascade’da low filter/animatsiya qoidalari to‘g‘ri qo‘llanadi.
- **Quality almashtirish:** dekoratsiya va epoch props yangi sifatga mos yangilanadi; kamera, castle/army selection va engine holati saqlanadi.
- **Render vaqti:** `dist/app.js` render intervalining qoldig‘ini saqlaydi. 144 Hz callback sinovida low 30, high 60 render bo‘ldi. Simulation tick/speed o‘zgartirilmadi.
- **Collision:** `dist/engine.js` har segmentda position/endpoint/bounds’ni armiya uchun bir marta hisoblaydi. Bir-biriga yetishi mumkin bo‘lmagan swept bounds aniq solverdan oldin chiqariladi. Mavjud yaqin-kontakt epsilon’i, pair tartibi, segment/corner va jang qoidalari saqlanadi. Juftlik loopi hali O(A²); spatial hash joriy qilinmadi.
- **Xarita rasmlari:** tanlanadigan 10 premium terrain PNG’ning shu o‘lchamdagi **lossless** WebP varianti yaratildi; dekodlangan RGBA piksellari byte darajasida tekshirildi. Yangi URL’larda content hash bor; `map-style.js` shu fayllarni tanlaydi. Terrain/foundation/castle URL’lari local file launch uchun relativ bo‘ldi. Asl PNG manbalari saqlandi, shuning uchun disk katalogining umumiy hajmi oshgan; foyda faol rasmlarning transfer hajmida.
- **HTTP:** yangi `static-assets.js` kichik text assetlarning identity/gzip/br representation’larini 8 MiB/64 entry chegarasida keshlaydi; bir vaqtdagi bir xil so‘rovlar bitta siqish ishini kutadi. Compression async; katta fayllar stream orqali yuboriladi. ETag/304, encoding quality/q=0, HEAD, Vary va tahrirdan keyingi invalidation tekshirildi. Versiyasiz o‘zgaruvchan asset revalidation qiladi; versiyalangan/hash URL immutable. Alohida Godot exportning eski serving yo‘li saqlangan.
- **Multiplayer:** shaxsiy snapshot yuborishdan oldin ishlatilmaydigan umumiy JSON/frame encode olib tashlandi. Maxfiy orders va socket backpressure semantikasi saqlandi.
- **Test infratuzilmasi:** benchmark va optimization regression skriptlari qo‘shildi. Ayrim eski visual testlar izolyatsiyalangan server uchun `CROWNFALL_URL`ni qabul qiladi. Mobile pinch testi bitta kontakt player-table ustiga tushadigan koordinata xatosidan tuzatildi; assertion saqlangan.

## Tekshiruv dalillari

- `npm run test:all`: **187 tekshiruv**, barchasi o‘tdi — engine 96, audit regression 18, camera 5, career 4, interface 52, server 4, yangi collision/static tests 8.
- `CROWNFALL_URL=http://127.0.0.1:4175 npm run test:browser`: desktop/mobile gameplay, tactics, restore, ikki browserli multiplayer, reconnect/forfeit, quick-match AI, mouse/touch dragon full-map va lobby escaping o‘tdi.
- `test:optimization:browser`: jang/effect/dragon tugun identity’i, sonlar yangilanishi, low computed filter va sprite limit, render purity, 20 restart, 144 Hz pacing, 11 terrain decode va `file://` terrain yuklanishi o‘tdi.
- `test:mobile`: 320×568, 390×844, 568×320, 667×375, 844×390 — touch controls, target inspection, dispatch, pan/pinch, rotation va management o‘tdi.
- `test:map`: 5 viewport’da to‘liq xarita, panel, castle selection va dispatch o‘tdi.
- `test:anchors`: mobil roof selection, zoom va anchor tekshiruvlari o‘tdi.
- `test:map-style`: 11 xarita × 2 viewport × 4 epoch × 3 quality — **264 variant**, selection, dispatch, movement, zoom va clearance o‘tdi.
- Engine eski/yangi nusxalari: **44 ssenariy** (11 xarita × random on/off × progressive on/off), Hard botlar barcha faction’da, 60 o‘yin soniyasigacha; har 0.1 s tick’dan keyingi to‘liq state bir xil bo‘ldi. Road definitions va wall-clock bir xil berildi. Dastlab `/tmp` baseline nusxasi sibling road definitions’ni topmagani uchun qiyos farq bergan; dependency tuzatilgach barcha ssenariylar mos keldi.
- Yangi collision testlar: tez kesishuvchi yo‘llar, ajralgan parallel yurish, near-contact epsilon va corner’dan keyingi kontakt.

Functional tekshiruvlar performance isboti o‘rnini bosmaydi. Natijalarning chegaralari quyida yozilgan.

## Benchmark natijalari

Muhit: Node 20.18.0, headless Chromium 140.0.7339.16; seed 1234, xarita 0, 18th epoch. Har renderer ssenariysi 3 takror × 60 kadr; har takrorda 12 warm-up render va 200 ms kutish. Vaqt JS render chaqiruvining davomiyligi; fizik ekran FPS’i yoki GPU vaqti emas. Timinglar shovqinli, ayniqsa katta High/Medium sahnalarda; DOM mutation/sprite soni barqarorroq dalil.

| Sintetik sahna | Render median: oldin → keyin | Render p95: oldin → keyin | DOM mutation/render: oldin → keyin |
|---|---|---|---|
| Desktop Low, 200 armiya | **13.10 → 5.30 ms** | **53.30 → 7.70 ms** | **3501 → 408** |
| Desktop Low, 100 armiya + 10 jang | 8.50 → 3.60 ms | 26.50 → 6.30 ms | 1775 → 247 |
| 390×844 Low, 100 armiya | **7.70 → 3.10 ms** | **27.50 → 4.40 ms** | **1751 → 208** |
| Desktop Medium, 100 armiya | 7.60 → 6.10 ms | 34.20 → 32.00 ms | 1968 → 1312 |
| Desktop High, 100 armiya + 10 jang | 10.90 → 9.00 ms | 37.40 → 32.80 ms | 2024 → 1505 |
| Desktop Medium, 200 armiya | 15.30 → 13.30 ms | **59.60 → 67.20 ms** | 3934 → 2513 |
| Desktop High, 200 armiya | 15.20 → 13.30 ms | **57.90 → 62.20 ms** | 3934 → 2655 |

Low 200 armiya sahnasida median xarajat taxminan **59.5%**, DOM mutation **88.4%** kamaygan; ko‘rinadigan sprite 1200 → 600. Medium/High 200 armiya p95 yaxshilanmagan: bu sahnalarda qotishning yuqori chekkasi hali ochiq. Natijani “hamma grafikada qotish yo‘qoldi” deb talqin qilmang.

Engine: AI o‘chirilgan, kontakt qilmaydigan parallel 10/50/100/200 armiya, 0.025 s tick; 3 takror, dastlabki 20 tickdan keyingi 80 sample. **200 armiya median 2.504 → 0.298 ms**, p95 **3.652 → 0.503 ms**; 100 armiya median **0.629 → 0.120 ms**. Bu collision qidiruvi sintetik qiyosi, murakkab bir joydagi ko‘p jang yoki Hard AI tick vaqti emas. 10 armiyali median **0.089 → 0.106 ms**: yangi geometry keshining kichik sahnada ozgina qo‘shimcha xarajati bor.

10 premium rasm: **31,364,125 → 22,458,054 byte**, taxminan **28.4% kam transfer**, o‘lcham va piksellar bir xil. Bir match hammasini birdan yuklamaydi; bu o‘nta tanlanadigan asset yig‘indisi.

Server asset sinovi: `/app.js` uchun br/gzip qabul qiladigan **256 so‘rov, concurrency 16**, eski/yangi serverda bir xil o‘zgartirilgan app manbasi bilan: umumiy **1452.83 → 186.76 ms**, request median **49.53 → 5.92 ms**, p95 **90.29 → 43.02 ms**. Yangi natija birinchi sovuq siqish va keyingi kesh hitlarni o‘z ichiga oladi. Bu room capacity yoki auth yuk testi emas.

## Reproduksiya

```bash
cd /home/behruz
npm run test:all
PORT=4175 HOST=127.0.0.1 CROWNFALL_DATA_DIR=/tmp/crownfall-web-opt-data node server.js
```

Server alohida terminalda ishlaganda:

```bash
CROWNFALL_URL=http://127.0.0.1:4175 npm run test:browser
CROWNFALL_URL=http://127.0.0.1:4175 npm run test:optimization:browser
CROWNFALL_URL=http://127.0.0.1:4175 npm run test:mobile
CROWNFALL_URL=http://127.0.0.1:4175 npm run test:map-style
CROWNFALL_URL=http://127.0.0.1:4175 npm run benchmark:render
npm run benchmark:engine
CROWNFALL_URL=http://127.0.0.1:4175 npm run benchmark:static
```

Benchmarkni boshqa og‘ir test/browser jarayonlari bilan bir vaqtda ishlatmang. `tests/performance-benchmark.cjs`, `engine-benchmark.cjs`, `static-benchmark.cjs` argument orqali natija faylini qabul qiladi. Render test app rAF scheduler’ini o‘chirib, real renderer’ni o‘zi chaqiradi; bu isolated renderer xarajati, real match FPS’i emas.

Terrainni qayta yaratish: Pillow mavjud Python bilan `python scripts/optimize-terrain.py`. Skript original PNG’ni o‘zgartirmaydi, pixel equality’ni tekshiradi, hash WebP va manifest yozadi. Encoder versiyasi binary hashni o‘zgartirsa, manifestdagi yangi filename’larni `dist/map-style.js`dagi `terrainAssets`ga moslang. Shu ishda Pillow vaqtinchalik `/tmp/crownfall-image-tools` venv’da ishlatildi; runtime dependency qo‘shilmadi.

## Qolgan ish va cheklovlar

- Fizik telefon/integratsiyalashgan GPU FPS/batareya, GPU raster trace, 15–30 min heap soak va 10/50 room load sinovlari hali bajarilmagan. 20 restart testi DOM lifecycle’ni tekshiradi, retained heap leak yo‘qligini to‘liq isbotlamaydi.
- Medium/high’da individual askar animatsiyasi saqlangan; og‘ir sahnalarning qolgan render xarajati keyingi profilga tegishli. Low’dagi tezlashishni barcha qurilma/profile’ga tatbiq qilmang.
- Snapshotning JSON clone/validatsiyasi, delta protokol, async password hashing/persistence, dirty UI summary, autosave scheduling, AI route/forecast cache, simulation accumulator va spatial hash bu patch’da joriy qilinmadi. Rejadagi shu vazifalar ochiq; profil ko‘rsatgan foyda bo‘yicha davom etilsin.
- Eski PNG va yangi lossless WebP birga saqlanadi. Deployment manifest orqali faqat amalda kerakli artni paketlash keyingi ish bo‘lishi mumkin.
- `artifacts/` gitignore’da. Lokal JSON/screenshotlar shu workspace’da bor; commit/PR yoki boshqa workspace’ga handoff’da zarur artefaktlarni alohida ko‘chiring yoki benchmarkni qayta ishga tushiring. Vaqtinchalik `/tmp` baseline engine nusxasi yangi workspace’da bo‘lmaydi.

## Dalil fayllari

- [Render oldin](artifacts/web-optimization/render-before.json), [render dastlabki patch](artifacts/web-optimization/render-after.json), [render yakuniy](artifacts/web-optimization/render-final.json).
- [Engine oldin](artifacts/web-optimization/engine-before.json), [engine yakuniy](artifacts/web-optimization/engine-final.json), [44 ssenariy qiyosi](artifacts/web-optimization/engine-equivalence.json).
- [Static server oldin](artifacts/web-optimization/static-before.json), [static server keyin](artifacts/web-optimization/static-after.json).
- [Pixel equality va hajmlar](artifacts/web-optimization/terrain-conversion.json), [browser terrain decode](artifacts/web-optimization/terrain-browser.json), [browser regressiyalar](artifacts/web-optimization/browser-regression.json).
