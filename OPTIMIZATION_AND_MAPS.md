# Crownfall — Optimizatsiya, 3 Bosqichli Grafika, Random Qal'alar va 5 Xarita Arxitekturasi

Ushbu hujjat Crownfall o'yinini oddiy/kuchsiz kompyuterlarda qotmasdan (laglarsiz) ishlashini ta'minlash, grafikani 3 bosqichga (Nizkiy, Sredniy, Maksimum) ajratish, apparat ta'minotiga qarab avtomatik sozlash, qal'alar turlarini tasodifiy (random) hosil qilish, 5 ta yangi strategik xarita variantlarini joriy qilish hamda o'yinni yangi bosqichga olib chiquvchi g'oyalarni o'z ichiga oladi.

---

## 1. O'yinni Optimizatsiyalash va Laglarning Asl Sabablari

Hozirgi vaqtda oddiyroq (ayniqsa o'rnatilgan Intel HD/UHD Graphics videokartali yoki eski protsessorli) kompyuterlarda o'yinning qotishiga sabab bo'layotgan asosiy omillar:

1. **SVG Filtrlari yuklamasi (`feDropShadow`)**:
   - `dist/view.js` dagi butun orol konturiga qo'llanilgan `filter="url(#landShadow)"` SVG filtri har bir kadrda (frame) GPU va CPU tomonidan rastrlanadi. Integratsiyalashgan videokartalarda bu FPS ni 60 dan 15-20 ga tushirib yuboradi.
2. **Haddan tashqari ko'p SVG DOM elementlari**:
   - Relyef uchun **450 ta ellipse**, **75+ toshlar**, **300+ daraxtlar** — jami 1000 dan ortiq statik SVG tugunlari doimiy ravishda DOM daraxtida saqlanadi va brauzer ularning geometriyasini tekshirib turadi.
3. **Kadrlararo o'zgarishlar (Per-frame DOM Manipulation)**:
   - `syncArmies()` funksiyasida har bir armiya uchun 7 ta askar figurasi mavjud. Har bir kadrda `Math.sin(s.time * 17 + i * 1.9)` orqali barcha askarlarning `transform` koordinatalari yangilanadi. Xaritada 8-10 ta armiya yurganda, bir vaqtning o'zida 70-80 ta DOM tugunining SVG transformatsiyasi hisoblanadi.
4. **CSS `backdrop-filter: blur(12px)`**:
   - Yuqori HUD paneli va modal oynalardagi CSS xiralashtirish (blur) effekti arzon grafik protsessorlarda juda katta yuklama keltirib chiqaradi.
5. **Cheklovsiz render (Uncapped Render Loop)**:
   - `requestAnimationFrame` monitor chastotasi (masalan, 120Hz/144Hz) bo'yicha cheklovsiz ishlaydi, bu esa kuchsiz protsessorlarni 100% yuklab, qizib ketishiga va drossellanishga (thermal throttling) olib keladi.

---

## 2. Grafika Sozlamalarini 3 Bosqichga Bo'lish

Grafika sozlamalari 3 ta aniq rejimga ajratiladi:

| Xususiyat / Element | 🟢 Nizkiy (Low / Tejamkor) | 🟡 Sredniy (Medium / Muvozanatli) | 🔴 Maksimum (High / Ultra) |
|---|---|---|---|
| **Maqsadli auditoriya** | Zaif noutbuklar, Intel HD, eski PC | Standart ofis/uy kompyuterlari | Kuchli PC, diskret videokartalar |
| **FPS cheklovi** | 30 FPS (barqaror, yengil) | 60 FPS | 60–144 FPS (monitorga mos) |
| **SVG Relyef detallari** | 0 ta (tekis chiroyli orol foni) | 120 ta (yengil daraxt va toshlar) | 450+ ta to'liq daraxt, tosh, qirg'oq ko'piklari |
| **Orol soyalari (Filters)** | Filtrlarsiz (tekis SVG rangli qatlam) | Oddiy SVG ofset soyasi (filtrlarsiz) | To'liq `feDropShadow` yumshoq soyasi |
| **Armiya vizualizatsiyasi** | 1 ta ixcham token (bayroq + soni) | 3 ta askar figurasi + engil chang | 7 ta askar + to'liq qadam va chang animatsiyasi |
| **Bulutlar soyasi** | Butunlay o'chirilgan | Statik (harakatsiz yengil soya) | Harakatlanuvchi dinamik bulut soyalari |
| **Jang va portlash effektlari** | Faqat matnli sonlar (`-40`) | 4 ta zarracha + matn | 10 ta porlovchi zarracha + silkinish (shake) |
| **UI CSS effektlari** | `backdrop-filter` o'chirilgan, tekis fon | Yengil shaffoflik | To'liq `blur(12px)` shisha effekti va glow |

### Texnik implementatsiya rejasi:

```javascript
// dist/view.js da sozlamalar profili
const GRAPHIC_PRESETS = {
  low: {
    maxFps: 30,
    terrainDetails: false,
    detailCount: 0,
    useFilters: false,
    unitsPerArmy: 1,
    animatedBob: false,
    dustEffects: false,
    cloudShadows: false,
    effectParticles: 0,
    blurUI: false
  },
  medium: {
    maxFps: 60,
    terrainDetails: true,
    detailCount: 100,
    useFilters: false,
    unitsPerArmy: 3,
    animatedBob: true,
    dustEffects: true,
    cloudShadows: false,
    effectParticles: 4,
    blurUI: true
  },
  high: {
    maxFps: 144,
    terrainDetails: true,
    detailCount: 450,
    useFilters: true,
    unitsPerArmy: 7,
    animatedBob: true,
    dustEffects: true,
    cloudShadows: true,
    effectParticles: 10,
    blurUI: true
  }
};
```

---

## 3. Kompyuterning Xarakteristikasiga Qarab Grafikani Avtomatik Tanlash

Foydalanuvchi hech narsani qo'lda sozlashi shart bo'lmaydi: o'yin ishga tushishi bilan brauzer apparat ta'minotini tahlil qiladi va eng optimal rejimni tanlaydi.

### 1. Apparat ko'rsatkichlari tahlili (Hardware Profiling)
Brauzer API lari orqali quyidagi 3 parametr tekshiriladi:
1. `navigator.hardwareConcurrency` — Protsessorning mantiqiy yadrolari soni.
2. `navigator.deviceMemory` — Operativ xotira (RAM) hajmi (GB).
3. `WEBGL_debug_renderer_info` — Videokarta modeli (GPU unmasked renderer).

```javascript
function detectOptimalPreset() {
  const cores = navigator.hardwareConcurrency || 2;
  const ram = navigator.deviceMemory || 4; // Chrome/Edge qo'llab-quvvatlaydi

  // WebGL orqali videokartani aniqlash
  let isIntegratedGPU = false;
  let isDedicatedGPU = false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      if (dbg) {
        const renderer = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL).toLowerCase();
        // Zaif yoki o'rnatilgan grafik protsessorlar
        if (/intel|uhd|hd graphics|mali|adreno 3|adreno 505|swiftshader|llvmpipe|basic render/i.test(renderer)) {
          isIntegratedGPU = true;
        }
        // Kuchli diskret grafik kartalar
        if (/nvidia|geforce|gtx|rtx|radeon rx|apple m/i.test(renderer)) {
          isDedicatedGPU = true;
        }
      }
    }
  } catch (e) {}

  // Qoidalar matritsasi:
  // 1. Kuchsiz PC: 2 yadro yoki <= 2GB RAM yoki zaif integratsiyalashgan GPU
  if (cores <= 2 || ram <= 2 || (isIntegratedGPU && cores <= 4)) {
    return 'low';
  }
  // 2. Kuchli PC: >= 8 yadro, >= 8GB RAM va diskret GPU
  if (cores >= 8 && ram >= 8 && isDedicatedGPU) {
    return 'high';
  }
  // 3. Qolgan barcha standart holatlar uchun:
  return 'medium';
}
```

### 2. Dinamik FPS monitoringi (Real-time Fallback)
Agar avtomatik tanlangan rejimda ham o'yin jarayonida FPS ketma-ket 3 soniya davomida 28 dan pastga tushib ketsa:
- Tizim avtomatik tarzda grafikani bir pog'ona pastga tushiradi (`high` → `medium`, `medium` → `low`).
- Ekranda bildirishnoma chiqadi: *"Kuchsiz unumdorlik aniqlandi. O'yin tezligi uchun grafika avtomatik tarzda [Nizkiy] rejimiga o'tkazildi."*

---

## 4. Qal'alar Turlarini Random (Tasodifiy) Qilish

Hozirgi versiyada 21 ta qal'aning xaritadagi roli qat'iy belgilangan (masalan, 2-qal'a doim oltin, 10-qal'a doim kamonchi). Bu esa o'yinni bir xil va takroriy qilib qo'yadi.

### Yangi Randomizatsiya Qoidalari:
1. **Adolatli boshlang'ich start (Fairness)**:
   - 0-qal'a (`Azurehold`) — doim Ko'k o'yinchi asosiy qal'asi (`main`).
   - 1-qal'a (`Crimson Keep`) — doim Qizil AI asosiy qal'asi (`main`).
2. **Simmetrik balanslangan juftliklar**:
   - Xarita o'rtasidan o'tuvchi simmetriya chizig'iga asosan har bir juftlik (chap va o'ng tomon) bir xil tasodifiy turga ega bo'ladi. Bu o'yinchiga ham, sun'iy intellektga ham mutlaqo teng sharoit yaratadi.
3. **Qal'alar turlari hovuzi (Archetype Pool)**:
   - `troop` (Askarlar qal'asi — tez ishlab chiqaradi)
   - `gold` (Oltin koni — boylik manbai)
   - `archer` (Kamonchilar minorasi — mustahkam forpost)
   - `knight` (Ritsarlar qal'asi — qamallar markazi)
   - `small` (Kuzatuv minorasi — tez egallanuvchi tayanch nuqta)
   - `elite` (Elita Sitadel — markaziy mega-qal'a)
4. **Dinamik nomlar generatori**:
   - Qal'a turi o'zgarganda uning nomi ham turiga mos ravishda avtomatik tanlanadi (masalan: oltin bo'lsa *Amber Mine*, *Sunstone*, *Kingsgilt*; kamonchi bo'lsa *Willow Spire*, *Hawk Eye*, *Storm Tower*).

```javascript
// Tasodifiy turlar taqsimoti generatori
function generateRandomCastleTypes(seed) {
  const rng = CrownEngine.rng(seed);
  const typesPool = ['gold', 'troop', 'archer', 'knight', 'small'];
  const symmetricPairs = [[2,3], [4,5], [6,7], [8,9], [10,11], [12,13], [14,16], [17,18], [19,20]];

  const assigned = {};
  assigned[0] = 'main';
  assigned[1] = 'main';
  assigned[15] = rng() > 0.4 ? 'elite' : 'knight'; // Markaziy nuqta

  for (const [left, right] of symmetricPairs) {
    const randomType = typesPool[Math.floor(rng() * typesPool.length)];
    assigned[left] = randomType;
    assigned[right] = randomType;
  }
  return assigned;
}
```

---

## 5. Yangi 5 Ta Strategik Xarita Variantlari

Har bir xarita o'ziga xos relyef, ko'priklar, daryolar va taktik vaziyatlarga ega (SVG o'lchami: 1100 × 780):

```
+-------------------------------------------------------------------------+
|                               XARITALAR                                 |
+-------------------------------------------------------------------------+
| 1. The Verdant Isles     | 2. Crossroads of Kings | 3. The Delta Rivers |
| [Moviy] ~|~ [Qizil]      |     [Qal'a] [Qal'a]    | \                 / |
|     Crown Bridge         |         \  |  /        |  === Ko'prik 1 ===  |
|         ~~~              |      [ IMPERIAL ]      |  === Ko'prik 2 ===  |
|    Coastal Detour        |         /  |  \        |  === Ko'prik 3 ===  |
|                          |     [Moviy] [Qizil]    | /                 \ |
+--------------------------+------------------------+---------------------+
| 4. The Iron Gorge (Tog') | 5. Sunken Atoll (Aylana Markaziy Ko'l)       |
|    /\/\/\/\/\/\/\/\      |                  [Qal'a]                     |
| [Moviy] ==Pass 1==       |          /                      \            |
|         ==Pass 2==[Qizil]|      [Moviy]      ( KO'L )      [Qizil]      |
|    \/\/\/\/\/\/\/\/      |          \                      /            |
|                          |                  [Qal'a]                     |
+-------------------------------------------------------------------------+
```

### Xarita 1: "The Verdant Isles" (Klassik Ikki Qirg'oq)
- **Tavsif**: G'arbiy va sharqiy orollar. O'rtadan katta daryo o'tadi.
- **Asosiy yo'llar**: Markaziy "Crown Bridge" (eng tez, 85 px/s) va janubiy aylanma "Coastal Detour" (yashirin qanot yo'li, 65 px/s).
- **Taktika**: Markaziy ko'prikda shiddatli to'qnashuvlar ketayotganda qanot orqali dushmanning orqa oltin konlarini egallash.

### Xarita 2: "Crossroads of Kings" (To'rt Qit'a va Markaziy Taxt)
- **Tavsif**: Xarita X-shaklida 4 ta mustaqil qit'aga bo'lingan: Shimoli-g'arb, Shimoli-sharq, Janubi-g'arb (Moviy baza) va Janubi-sharq (Qizil baza).
- **Markaz**: Markazdagi baland orolda qudratli "Imperial Citadel" joylashgan (450 boshlang'ich garnizon).
- **Taktika**: "King of the Hill" uslubi. Markaziy sitadelni egallagan tomon barcha 4 qit'aga eng qisqa yo'l bilan zaxira va askar yetkazib bera oladi.

### Xarita 3: "Archipelago of Three Bridges" (Uch Ko'prik Deltasi)
- **Tavsif**: Daryo uchta parallel tarmoqqa bo'linadi va orolchalar orqali 3 ta yirik tosh ko'prik bilan ulanadi:
  1. *Shimoliy Ko'prik (North Bridge)* — Kichik forpostlar va kamonchi minoralari yo'li.
  2. *Markaziy Buyuk Ko'prik (High Bridge)* — Katta qal'alar to'qnashuvi.
  3. *Janubiy Qirg'oq Ko'prigi (Reef Crossing)* — Oltin konlari joylashgan orollar.
- **Taktika**: Bir vaqtning o'zida uchala frontda harakatlanish talab qilinadi. Agar bir ko'prik boy berilsa, qolgan ikkitasi orqali qarshi zarba berish mumkin.

### Xarita 4: "The Iron Gorge" (Tog'li Dara va Tor Forpostlar)
- **Tavsif**: Xarita markazida o'tib bo'lmas ulkan tog' qoyalari qad ko'targan. O'tish faqat 2 ta tor darvoza (Chokepoint) orqali mumkin:
  1. *Dragon's Gate* (Shimoliy tor o'tish joyi).
  2. *Iron Gate* (Janubiy tor o'tish joyi).
- **Taktika**: Qanotdan o'tib bo'lmaydi. Har bir darvoza oldidagi qal'alar haqiqiy qalqonga aylanadi. Yo'ldagi qo'shinlar to'qnashuvi eng yuqori intensivlikda kechadi.

### Xarita 5: "The Sunken Atoll" (Halqasimon Orol / Markaziy Ko'l)
- **Tavsif**: Xaritaning qoq o'rtasida chuqur suv havzasi (ko'l) mavjud. Qal'alar tashqi yopiq halqa bo'ylab joylashgan.
- **Baza**: Moviy baza g'arbda, Qizil baza sharqda.
- **Taktika**: O'rtadan to'g'ridan-to'g'ri hujum qilish imkoni yo'q (suv to'sib turadi). Askarlar faqat Shimoliy yarim halqa yoki Janubiy yarim halqa bo'ylab zanjirli tarzda oldinga siljishi mumkin. Bu aylanma qamal va orqa tomondan qurshab olish taktikasini talab qiladi.

---

## 6. O'yinni Yana Ham Takomillashtirish Uchun Keng Qamrovli G'oyalar

Crownfall o'yinini oddiy brauzer o'yinidan xalqaro darajadagi xit RTS/taktik strategiyaga aylantirish uchun taklif etiladigan 7 ta innovatsion yo'nalish:

### 1. Sarkardalar va Qahramonlar Tizimi (Commanders & Heroes)
O'yin boshida har bir tomon bitta sarkardani tanlaydi:
- 🗡️ **Sarkarda Al-Muzaffar (Vanguard)**: Barcha yo'ldagi qo'shinlar harakat tezligi +20% ga oshadi.
- 🛡️ **Bosh Arxitektor (Fortifier)**: Qal'alarning tabiiy mudofaasi +30% ga kuchliroq bo'ladi, upgrade xarajatlari 25% arzonlashadi.
- 💰 **Xazinabon (Guildmaster)**: Barcha oltin konlaridan tushum 1.5 barobar oshadi, boshlang'ich oltin 400 bo'ladi.
- 🏹 **Soyalar Qo'mondoni (Infiltrator)**: Aylanma yo'llarda (flank) yurgan qo'shinlar dushmanga nishonga yetib kelguncha ko'rinmaydi (Stealth march).

### 2. Dinamik Ob-Havo va Vaqt (Dynamic Weather & Nightfall)
Har 60 soniyada xaritada ob-havo o'zgarib turadi:
- ☀️ **Quyoshli havo**: Standart tezlik va ko'rinish.
- 🌧️ **Qattiq yomg'ir va loy**: Yo'ldagi qo'shinlar tezligi 25% ga kamayadi, daryolar toshadi.
- 🌫️ **Qalin Tuman (Fog of War)**: O'yinchi faqat o'ziga tegishli qal'alar va harakatdagi qo'shinlari atrofini ko'radi. Dushmanning harakatlari kutilmagan zarbaga aylanadi.
- 🌙 **Kecha (Night Siege)**: Kamonchilar mudofaasi biroz pasayadi, lekin qo'shinlar to'qnashuvida kutilmagan qochishlar paydo bo'ladi.

### 3. Taktik Qamal Qurollari (Siege Craft)
Faqat oddiy piyoda askarlar emas, balki ixtisoslashgan birliklar:
- 🎯 **Katapulta (Catapult)**: 100 ta askar evaziga yasash mumkin. Uzoq masofadan nishon qal'aning mudofaasiga sekundiga zarar yetkazadi.
- 🛡️ **Qamal minorasi (Siege Tower)**: Qal'aga hujum qilganda himoyachilar zararini 50% yutib yuboradi.
- 🐎 **Kavaleriyaning chaqmoq zarbasi**: Kam sonli, lekin o'ta tezkor (150 px/s) otliqlar yo'ldagi dushman guruhlarini parchalab tashlaydi.

### 4. Afsunlar va Global Qobiliyatlar (Spells & Calamities)
Oltin yoki maxsus "Mana" resursi yig'ilganda ishlatiladigan 1 martalik buyruqlar:
- ⚡ **Chaqmoq zarbasi**: Yo'ldagi dushmanning bitta yirik qo'shinining 40% ini yo'q qiladi.
- 🚧 **Ko'prikni portlatish (Sabotage)**: Daryo ko'prigini 15 soniyaga yopib qo'yadi, dushman aylanib o'tishga majbur bo'ladi.
- 🎺 **Umumiy Safarbarlik (War Horn)**: Barcha o'z qal'alarimizda 5 soniya davomida 2 barobar tez askar ishlab chiqariladi.

### 5. Ko'p O'yinchi Rejimi (Local P2P / WebRTC Multiplayer)
- Server yoki backend talab qilmasdan, brauzerdan brauzerga (WebRTC DataChannel orqali) 1v1 onlayn o'ynash imkoniyati.
- O'yinchi havola (link) yoki QR-kod yaratadi, do'sti telefon yoki boshqa kompyuterda ochsa, real vaqtda bir-biriga qarshi jang qilishi mumkin!

### 6. Kampaniya va Missiyalar Rejimi (Story Campaign)
- 10 ta ketma-ket qiziqarli missiya:
  - *1-missiya: Orqaga chekinish (Kam kuch bilan asosiy qal'ani 2 daqiqa ushlab turish).*
  - *2-missiya: Oltin poygasi (Raqibdan oldin 1000 oltin to'plash).*
  - *3-missiya: Qamal ostida (Crimson Legion 3 tomondan hujum qiladi).*

### 7. Tovushlar va Musiqiy Atmosfera (Procedural Audio & Mood)
- Web Audio API yordamida dinamik fon musiqasi (urush maydonidagi do'mbiralar va shox sadolari).
- Jang vaziyatiga qarab musiqaning shiddati o'zgaradi: tinch rivojlanishda yengil musiqa, katta to'qnashuvlarda g'alabali/xavfli ritmlar.

---

## 7. Bosqichma-bosqich Implementatsiya Rejasi

1. **1-Qadam (`dist/view.js` & `dist/style.css`)**:
   - 3 ta grafik rejimini joriy qilish (`low`, `medium`, `high`).
   - Kuchsiz kompyuterlarda SVG filtrlari va 450 ta relyef nuqtalarini o'chirib, 30 FPS tejamkor render qilish.
2. **2-Qadam (`dist/experience.js` & `dist/app.js`)**:
   - Hardware detektorni qo'shish (`navigator.hardwareConcurrency`, `navigator.deviceMemory`, WebGL).
   - UI dagi Sozlamalar oynasida foydalanuvchiga grafikani erkin o'zgartirish tanlovini berish.
3. **3-Qadam (`dist/engine.js`)**:
   - Random qal'alar spawn generatorini integratsiya qilish.
   - 5 ta yangi xarita konfiguratsiyalari (relyef, ko'priklar, koordinatalar) ni kiritish.
4. **4-Qadam (Tekshirish va Benchmark)**:
   - Oddiy PC va noutbuklarda FPS barqarorligini, yuklanish tezligini va xotira (RAM) sarfini to'liq sinovdan o'tkazish.
