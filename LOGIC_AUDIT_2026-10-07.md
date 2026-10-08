# Crownfall web o‘yini: mantiq va bug auditi

Sana: 2026-10-07. Tekshiruv asosiy web o‘yini, `dist/engine.js`, AI, brauzer interfeysi, career va multiplayer serveriga tegishli.

**Natija: 25 ta tasdiqlangan bug/mantiqiy nomuvofiqlik va 1 ta balans muammosi.** Bir sababdan kelib chiqqan bir nechta ssenariy bitta topilmaga birlashtirildi. Ushbu 25 ta topilma va infantry training balans muammosi tuzatildi. Drakon zarbasini butun xarita bo‘ylab yuborish ham qo‘shildi. Godotga tegilmadi.

## Tuzatishdan keyingi natija

- **Drakon:** 2200×1500 xaritaning barcha nuqtalari va chetlariga zarba yuboriladi. Nishon tanlash boshlanganda butun xarita ochiladi; sichqoncha, touch va zoomdagi koordinatalar ishlaydi. Reticle haqiqiy 190 radiusni ko‘rsatadi. Tarmoq uzilganida nishon saqlanadi va oltin sarflanmaydi.
- **Multiplayer:** lobby nomi xavfsiz matn sifatida chiqariladi; mehmon nomi serverda chegaralanadi. Host bot qo‘shib/o‘chiradi; hero faqat lobbyda tanlanadi. Har mijoz faqat o‘zining jo‘natilmagan buyruqlarini oladi. Rematchda chiqib ketgan raqib o‘rni botga aylantiriladi.
- **Harakat va jang:** tezlik engine, preview va AI uchun umumiy hisoblanadi; otliq bonuslari weather, redirect, recall va interceptda saqlanadi. Sinxron buyruq qo‘shin tarkibini band qiladi. Siege va uning bashorati bir hisobdan foydalanadi; Watch himoyasi talofatga ham qo‘llanadi. Nonprogressive jang oxirigacha hisoblanadi, damage barcha tomonlarga bir vaqtda qo‘llanadi.
- **Save va snapshot:** unit sonlari, training navbati, battle bog‘lanishlari va timerlar tekshiriladi. Snapshot parsing kiruvchi obyektni o‘zgartirmaydi; effektlar saqlanadi, jangdagi armiya mijozda yurmaydi. Resurs chegarasida qo‘shin tarkibi buzilmaydi.
- **Career:** yagona match ID qayta yozishni to‘xtatadi; durang alohida hisoblanadi; conquest faqat g‘olibga beriladi. Yetkazilgan talofat va ishlab topilgan oltin engine tomonidan alohida sanaladi.
- **AI va balans:** settings faol botlar uslubini o‘zgartiradi. Qal’a tavsiflari amaldagi qoidalarga mos. Navbatdagi infantry **0.5 oltin/askar**, tezkor recruit **1 oltin/askar**: navbat arzonroq, tayyorlanishi vaqt oladi.
- **Qo‘shimcha tuzatish:** Friends dialogidagi Browse tugmasi mavjud bo‘lmagan `fetchPublicRooms()`ga bog‘langan edi. Endi xonalar ro‘yxatini yuklaydi va yangilab turadi.

### Yakuniy tekshiruv

- `npm run test:all`: **179 ta tekshiruv** — engine 96, audit regression 18, kamera 5, career 4, interfeys 52, server 4.
- Haqiqiy Chromium: 4 ekran o‘lchami, multiplayer/reconnect/forfeit, quick-match bot; drakonning to‘rt burchagi, sharq/janub, mouse/touch va zoom; zararli lobby nomining bajarilmasligi.
- **22 ta progressive Hard AI simulyatsiyasi** (11 xarita × oddiy/tasodifiy qal’alar): qo‘shin tarkibi, save tiklanishi va resurs invariantlari o‘tdi. [Natijalar](/home/behruz/artifacts/logic-audit-2026-10-07/post-fix-map-results.json).
- Yangi testlar: [engine/career/multiplayer regression](/home/behruz/tests/audit-regression.test.cjs), [brauzer regression](/home/behruz/tests/audit-browser.test.cjs).

Bashorat mavjud armiyalar va buyruqlar asosida hisoblanadi; kelajakdagi buyruqlar, ob-havo almashishi va yo‘ldagi janglar natijani o‘zgartirishi mumkin. Eski save uchun yetkazilgan talofat va ishlab topilgan oltinning avvalgi qismi qayta hisoblanmaydi; yangi hisob saqlangan holat yuklangandan boshlab davom etadi.

Quyida dastlabki audit va uning takrorlash dalillari tarix sifatida saqlangan.

## Tekshiruv dalillari

- `npm run test:all`: **151 ta tekshiruv o‘tdi** — engine 96, kamera 5, career 4, interfeys 42, server 4.
- Mavjud haqiqiy brauzer testi: 1440×900, 768×1024, 390×844 va 320×568 ekranlarda o‘yin, tactics, saqlash/tiklash; ikki mijozli multiplayer, reconnect, forfeit va quick-match AI fallback o‘tdi.
- 11 xarita × oddiy/tasodifiy qal’alar: **22 ta Hard AI simulyatsiyasi**, har biri g‘alabaga yoki 180 o‘yin soniyasiga qadar. Qo‘shin tarkibi jami, manfiy qiymatlar va saqlash/tiklash invarianti tekshirildi; bu ssenariylarda buzilish aniqlanmadi.
- Yangi diagnostika: **17 ta engine/multiplayer va 14 ta brauzer ssenariyi** quyidagi muammolarni qayta ko‘rsatdi. Brauzer diagnostikasida kutilmagan `pageerror` kuzatilmadi.

Mavjud testlar muvaffaqiyatli o‘tishi bu muammolarni inkor qilmaydi: ular tegishli chekka holatlarni tekshirmaydi. Tekshiruv barcha mumkin bo‘lgan seed, qurilma, tarmoq holati yoki uzoq o‘yin kombinatsiyasini qamramaydi.

## Topilmalar

`Kritik`: boshqa foydalanuvchi brauzerida kod bajarilishi. `Yuqori`: o‘yin boshlanishi, jang natijasi, adolat yoki progress buzilishi. `O‘rta`: boshqaruv, axborot va statistika xatosi. `Past`: kam uchraydigan chegaraviy holat yoki hozirgi UI orqali ochilmagan API muammosi.

| № | Daraja | Muammo va tasdiqlangan natija | Kod joyi | Dalil |
|---|---|---|---|---|
| 1 | **Kritik** | **Lobby nomi orqali XSS.** Server WebSocket orqali HTML bo‘lgan mehmon nomini qabul qiladi. Boshqa o‘yinchi xonalar ro‘yxatini ochganda nom `innerHTML` ichiga qo‘yilib, uning brauzerida JavaScript bajariladi. Izolyatsiyalangan lokal serverda zararsiz marker bilan tasdiqlandi. | [app.js:3110](/home/behruz/dist/app.js:3110), [app.js:3127](/home/behruz/dist/app.js:3127), [server.js:856](/home/behruz/server.js:856) | B13 |
| 2 | **Yuqori** | **Lobbyda bot qo‘shish va o‘chirish ishlamaydi.** `slot.ws !== socket` tekshiruvi bo‘sh o‘rinni ham qaytaradi: bo‘sh o‘rinda `ws=null`, hostda haqiqiy socket. `add_bot` yuborilgandan keyin ham xona 1 o‘yinchili va Red bo‘sh qoladi. Host yakka o‘zi bot bilan shu lobbydan o‘yinni boshlay olmaydi. | [server.js:1018](/home/behruz/server.js:1018) | B12 |
| 3 | **Yuqori** | **Multiplayerda jang davomida hero almashtirish mumkin.** `select_hero` lobby bilan cheklanmagan. Vanguard bilan boshlagan o‘yinchi Fortifierga o‘tib, upgrade narxini darhol 100 → 75 qiladi; turli passivlarni vaziyatga qarab almashtirish mumkin. | [server.js:1055](/home/behruz/server.js:1055), [multiplayer.js:80](/home/behruz/multiplayer.js:80) | M01 |
| 4 | O‘rta | **Hali jo‘natilmagan dushman buyruqlari barcha mijozlarga yuboriladi.** `snapshot()` butun `state.orders`ni beradi. UI buni ko‘rsatmasa ham mijoz kelajakdagi manba, nishon, qo‘shin soni va launch vaqtini o‘qiy oladi. AI uchun bunday buyruqlar maxfiy hisoblanadi, inson multiplayer mijozida esa bu cheklov yo‘q. | [multiplayer.js:36](/home/behruz/multiplayer.js:36), [engine.js:2651](/home/behruz/dist/engine.js:2651) | M02 |
| 5 | **Yuqori** | **Raqib chiqib ketgandan keyingi rematch bo‘sh odamga qarshi boshlanadi.** Forfeitdan keyin slotda eski username saqlanadi. `start()` faqat usernamesiz o‘rinni botga aylantiradi. Natijada `connected=false`, reconnect token yo‘q, `botPlayers=[]`, lekin o‘yin `playing` bo‘ladi. | [multiplayer.js:17](/home/behruz/multiplayer.js:17), [multiplayer.js:102](/home/behruz/multiplayer.js:102), [multiplayer.js:136](/home/behruz/multiplayer.js:136) | M03 |
| 6 | **Yuqori** | **Sinxron hujumda otliq qo‘shinlar birga yetib kelmaydi.** `coordinate()` otliq tarkib tezligini hisoblamaydi, `dispatch()` hisoblaydi. 100 cavalry va 100 infantry bir nishonga buyurilganda kelish vaqti **1.914 soniya** farq qildi. Dushman ularni alohida jangda kutib olishi mumkin. | [engine.js:1901](/home/behruz/dist/engine.js:1901), [engine.js:1913](/home/behruz/dist/engine.js:1913) | E01 |
| 7 | **Yuqori** | **Ob-havo o‘zgarishi otliq tezlik bonuslarini yo‘qotadi.** Weather qayta hisobida cavalry qal’a bonusi va otliq tarkib bonusi tushib qoladi. 100% cavalry armiyasi cavalry qal’adan **132.5 → 63.75 px/s** bo‘ldi; faqat yomg‘irning −25% ta’siri bilan taxminan **99.38** bo‘lishi kerak edi. | [engine.js:3061](/home/behruz/dist/engine.js:3061) | E02 |
| 8 | O‘rta | **Armiyani qayta yo‘naltirishda otliq tarkib tezligi yo‘qoladi.** Bir xil nishonga `redirect()` qilishning o‘zi 100% cavalry armiyasini **106.25 → 85 px/s** tushirdi. `setPath()`da tarkib bonusi qayta qo‘llanmaydi; recall/intercept yo‘llarida ham shu hisobdan foydalaniladi. | [engine.js:1873](/home/behruz/dist/engine.js:1873), [engine.js:1915](/home/behruz/dist/engine.js:1915) | E03 |
| 9 | O‘rta | **Interfeysdagi tezlik va ETA haqiqiy yurishga mos emas.** `routeSpeedFor()` cavalry qal’a hamda qo‘shin tarkibini hisoblamaydi. Tekshirilgan holatda preview **85**, haqiqiy dispatch **132.5 px/s**. AI travel hisobida ham tarkib bonusi yo‘q. | [app.js:205](/home/behruz/dist/app.js:205), [engine.js:2618](/home/behruz/dist/engine.js:2618) | B04 |
| 10 | **Yuqori** | **Qal’a himoya bonusi muvaffaqiyatsiz hujumda noto‘g‘ri talofat beradi.** 100 askarli Watch Keep himoya kuchi 120. 110 infantry uni egallay olmaydi, lekin barcha 100 himoyachini yo‘q qiladi. G‘alaba hisobi bonusli kuchga, himoyachi talofati esa bonusni e’tiborsiz qoldirgan `effAttacker`ga asoslangan. Qal’a eski egada 0 askar bilan qoladi. | [engine.js:2145](/home/behruz/dist/engine.js:2145), [engine.js:2166](/home/behruz/dist/engine.js:2166) | E04 |
| 11 | **Yuqori** | **Hujum bashorati haqiqiy siege qoidalarini takrorlamaydi.** Watch Keepga 110 infantry hujumini “Advantage, 10 survivors” deydi, amalda egallanmaydi. 110 himoyachiga 100 knight hujumini “High risk, 0 survivors” deydi, amalda 8 knight bilan egallanadi. Watch/aura himoyasi hamda knight/cavalry assault bonusi previewda yo‘q. Kelayotgan boshqa armiyalar ham projected himoya hisobiga kiritilmagan. | [app.js:215](/home/behruz/dist/app.js:215), [app.js:1186](/home/behruz/dist/app.js:1186), [engine.js:2137](/home/behruz/dist/engine.js:2137) | B02, B03 |
| 12 | O‘rta | **Eski tezkor jang algoritmi tirik armiyalarni “yo‘q qilindi” deb e’lon qiladi.** `progressiveCombat=false` va maxsus birliklarda simulyatsiya 200 raunddan keyin to‘xtaydi. 100 knight vs 100 knight holatida **2 va 2 tirik** qoldi, event esa “both forces eliminated”. Yangi solo/multiplayer odatda progressive rejimda; muammo eski/nonprogressive holatlar va engine APIga tegishli. | [engine.js:2322](/home/behruz/dist/engine.js:2322), [engine.js:2367](/home/behruz/dist/engine.js:2367) | E05 |
| 13 | O‘rta | **Nonprogressive uch tomonli jang array tartibiga bog‘liq.** Uchta teng 100 knight armiyasi Blue/Red/Green tartibida **2/2/1**, Green/Red/Blue tartibida Blue/Red/Green uchun **1/2/2** qoldirdi. Bir fraksiya `total`i o‘zgartirilgach, keyingisining damage ulushi o‘sha o‘zgargan qiymatdan hisoblanadi. | [engine.js:2336](/home/behruz/dist/engine.js:2336) | E14 |
| 14 | **Yuqori** | **Saqlangan holatning yangi maydonlari yetarli tekshirilmaydi.** `trainingQueue=[null]` qabul qilinadi va birinchi tickda exception beradi. 420 qo‘shinli qal’aga 1,000,000 knight tarkibi yozilgan save qabul qilinadi. Mavjud bo‘lmagan battle IDli armiya save ichida qabul qilinib, qimirlamay qoladi. `units`, training item va battle/army bog‘lanishlari validatsiyasi yetishmaydi. Bu lokal save buzilishi/tahrirlanishiga tegishli; mijoz server jang holatini shu usulda almashtira olmaydi. | [engine.js:3174](/home/behruz/dist/engine.js:3174), [engine.js:3214](/home/behruz/dist/engine.js:3214) | E06, E07, E08 |
| 15 | Past | **Jangdagi armiyani redirect qilish engine APIda qabul qilinadi.** Nishon va path o‘zgaradi, `inBattle` va old battle membership saqlanadi. `recall()` jangdagi armiyani rad etadi, `redirect()` esa rad etmaydi. Hozirgi server command ro‘yxatida redirect yo‘q, shuning uchun bevosita online buyruq sifatida ochilmagan. | [engine.js:1915](/home/behruz/dist/engine.js:1915) | E10 |
| 16 | Past | **Resurs maksimumida troop count va tarkib farqlashadi.** `quickRecruit()` umumiy qo‘shinni 10¹² bilan cheklaydi, `units.soldier`ga esa butun countni qo‘shadi. To‘la qal’ada 100 oltin sarflanadi: troops 10¹², units 10¹²+100. Do‘stona reinforcementda ham umumiy limit va tarkib qo‘shish alohida hisoblanadi. Oddiy o‘yinda bu limitga yetish juda uzoq davom etadi. | [engine.js:1969](/home/behruz/dist/engine.js:1969), [engine.js:2108](/home/behruz/dist/engine.js:2108) | E09 |
| 17 | O‘rta | **Multiplayer snapshot barcha effectlarni yo‘qotadi.** `deserialize(msg.state)` obyektning o‘zini o‘zgartirib, `effects=[]` qiladi. `applySnapshot()` keyin o‘sha bo‘sh `msg.state.effects`ni oladi. Server yuborgan CAPTURED/impact effectlari va effectga bog‘liq zarba ovozi mijozga yetib kelmaydi. | [app.js:587](/home/behruz/dist/app.js:587), [engine.js:3208](/home/behruz/dist/engine.js:3208), [experience.js:501](/home/behruz/dist/experience.js:501) | B01 |
| 18 | Past | **Multiplayer interpolation jangdagi armiyaning yurish vaqtini ham oshiradi.** Server `inBattle` armiyasini to‘xtatadi; client frame esa uning `t` qiymatini oshiradi. 100 ms frame ichida **0 → 0.065** kuzatildi. Renderer jang joyiga armiyani bog‘laydi, lekin ETA/progress vaqtincha noto‘g‘ri; keyingi snapshot uni orqaga qaytaradi. | [app.js:4370](/home/behruz/dist/app.js:4370), [view.js:694](/home/behruz/dist/view.js:694) | B11 |
| 19 | **Yuqori** | **Bir o‘yin careerda bir necha marta sanaladi.** Natijali saqlangan o‘yinni reload qilish wins/battlesni **1 → 2** qiladi. Natija dialogini Escape yopib, `updateUI()` chaqirilsa ham takror sanaydi: umumiy keydown handler dialogning cancel himoyasini chetlab o‘tadi. Match ID yoki “recorded” tekshiruvi yo‘q. Rankni haqiqiy yangi janglarsiz oshirish mumkin. | [app.js:1595](/home/behruz/dist/app.js:1595), [app.js:1672](/home/behruz/dist/app.js:1672), [app.js:4174](/home/behruz/dist/app.js:4174), [career.js:150](/home/behruz/dist/career.js:150) | B05, B10 |
| 20 | O‘rta | **Mag‘lub o‘yinchiga Grand Conquest yutug‘i beriladi.** Barcha qal’alarni Red egallaganida Blue career: wins=0, losses=1, `hasGrandConquest=true`. `allCastlesCaptured` g‘olib uchun hisoblanadi va har bir mijoz careeriga uzatiladi; `recordMatch()` isWin bilan cheklamaydi. | [app.js:1668](/home/behruz/dist/app.js:1668), [career.js:163](/home/behruz/dist/career.js:163) | B06 |
| 21 | O‘rta | **Durang mag‘lubiyat hisoblanadi.** UI drawni to‘g‘ri ko‘rsatadi, lekin career `isWin=false` bo‘lgan barcha natijalar uchun losses++ qiladi. Tasdiqlangan draw: battles=1, losses=1. | [app.js:1673](/home/behruz/dist/app.js:1673), [career.js:155](/home/behruz/dist/career.js:155) | B07 |
| 22 | O‘rta | **“Yetkazilgan talofat”ga o‘z yo‘qotishlari yoziladi.** Blue 17 askar yo‘qotib, Red 100 askar yo‘qotgan holatda `casualtiesInflicted=17` bo‘ldi. `totalLosses` o‘z fraksiyasidan olinib, shu nomdagi statistikaga qo‘shiladi. | [app.js:1676](/home/behruz/dist/app.js:1676), [career.js:159](/home/behruz/dist/career.js:159) | B09 |
| 23 | O‘rta | **Career oltini ishlab topilgan summaning o‘rniga qolgan balansni oladi.** 200 boshlang‘ich oltindan upgradega 100 sarflanganda careerga 100 yoziladi. Kod `goldEarned` sifatida match oxiridagi `myGold`ni uzatadi; daromad bo‘yicha alohida hisob yo‘q. Xarid qilish career oltin ko‘rsatkichini va unga bog‘liq achievement progressini kamaytiradi. | [app.js:1671](/home/behruz/dist/app.js:1671), [app.js:1677](/home/behruz/dist/app.js:1677), [career.js:161](/home/behruz/dist/career.js:161) | B14 |
| 24 | O‘rta | **Settingsdagi AI uslubi amaldagi botni o‘zgartirmaydi.** Select “economist”ga o‘tdi va `state.aiStyle='economist'` bo‘ldi, lekin `state.players.red.aiStyle='balanced'` qoldi. AI avval playerdagi qiymatni tanlaydi, global settings yangi qarorga ta’sir qilmaydi. | [app.js:4129](/home/behruz/dist/app.js:4129), [engine.js:2715](/home/behruz/dist/engine.js:2715) | B08 |
| 25 | O‘rta | **Qal’a tavsiflari real qoidalarga mos emas.** Elite tooltip barcha qal’alarga +1/s aura va’da qiladi, engine faqat Elite ishlab chiqarishini oshiradi: Main 3/s bo‘lib qoladi. Watch tooltip +25% deydi, siege +20% ishlatadi; 121 infantry 100 himoyachini egallaydi. Knight tooltip manbadan +15% attack deydi, engine esa manba bonusini bermay, qo‘shin tarkibidagi knightga +20% siege qo‘shadi. | [engine.js:168](/home/behruz/dist/engine.js:168), [engine.js:172](/home/behruz/dist/engine.js:172), [engine.js:180](/home/behruz/dist/engine.js:180), [engine.js:1767](/home/behruz/dist/engine.js:1767), [engine.js:2140](/home/behruz/dist/engine.js:2140) | E11, E12; Knight qismi koddan tasdiqlandi |

## Dastlabki balans muammosi — tuzatildi

**26. Oddiy infantry training quick recruitga nisbatan foydasiz.** Bir xil 100 oltin uchun training **10 infantry, 16.6 soniya** beradi; quick recruit **100 infantry, darhol** beradi. Birliklar bir xil. Quick recruit takror qo‘llanadi va engine darajasida boshqa owned qal’alarda ham mumkin. Natijada oddiy infantry navbati harbiy tanlov sifatida 10 baravar qimmat va sekin. Bu pul yechishdagi bug emas: ikkala xarid ham narxini to‘g‘ri to‘laydi. Balans uchun narx, limit, cooldown yoki tayyorlangan birlikning qo‘shimcha foydasi haqida qaror kerak.

Kod: [engine.js:1935](/home/behruz/dist/engine.js:1935), [engine.js:1962](/home/behruz/dist/engine.js:1962). Dalil: E13.

## Auditda tavsiya qilingan tuzatish tartibi (bajarildi)

1. XSS uchun serverda nickname chegarasi va mijozda xavfsiz matn renderi; lobby bot guardini tuzatish; hero tanlovini lobby bilan cheklash; rematch rosterini tekshirish.
2. Yurish tezligini dispatch, coordinate, weather, redirect, AI va preview uchun umumiy hisobga yig‘ish. Siege hisobidan preview ham foydalanishi; himoyachi talofatida defense koeffitsiyenti izchil qo‘llanishi.
3. Save ichidagi unit, training va battle bog‘lanishlarini tekshirish; snapshot parse qilishda inputni o‘zgartirmaslik; battle armiyalarini interpolationdan chiqarish.
4. Match natijasini yagona ID bilan bir marta yozish; win/draw/lossni alohida uzatish; achievementni shu o‘yinchining haqiqiy natijasi bilan cheklash; earned gold va inflicted casualtiesni alohida hisoblash.
5. Nonprogressive jangdagi cap va uch tomonli damage tartibini tuzatish; AI settingsni faol botga tatbiq qilish; tavsiflarni haqiqiy qoidaga moslashtirish; infantry narxini qayta ko‘rib chiqish.

## Takrorlash fayllari

Bu fayllar **hozirgi xatoni qayta ko‘rsatadigan diagnostika**: ularning muvaffaqiyati o‘yin to‘g‘ri ishlayapti degani emas. Tuzatishdan so‘ng ulardan kutilgan to‘g‘ri xatti-harakatni tekshiradigan regression testlar chiqarish mumkin.

- [Engine/multiplayer diagnostikasi](/home/behruz/artifacts/logic-audit-2026-10-07/engine-probes.cjs) va [natijalari](/home/behruz/artifacts/logic-audit-2026-10-07/engine-results.json).
- [Brauzer diagnostikasi](/home/behruz/artifacts/logic-audit-2026-10-07/browser-probes.cjs) va [natijalari](/home/behruz/artifacts/logic-audit-2026-10-07/browser-results.json).
- [22 ta xarita simulyatsiyasi natijalari](/home/behruz/artifacts/logic-audit-2026-10-07/map-simulation-results.json).
- [Lobby XSS markerining brauzer skrinshoti](/home/behruz/artifacts/logic-audit-2026-10-07/lobby-name-injection.png).

Engine diagnostikasi:

```bash
node artifacts/logic-audit-2026-10-07/engine-probes.cjs
```

Brauzer diagnostikasi izolyatsiyalangan lokal server talab qiladi. Server uchun alohida vaqtinchalik data katalogi ishlatildi; mavjud foydalanuvchilar bazasiga tegilmadi.

```bash
PORT=4197 HOST=127.0.0.1 CROWNFALL_DATA_DIR=/tmp/crownfall-audit-20261007 node server.js
CROWNFALL_URL=http://127.0.0.1:4197 node artifacts/logic-audit-2026-10-07/browser-probes.cjs
```

`artifacts/` Git tomonidan ignore qilinadi. Hisobot loyiha ildizida saqlangan.
