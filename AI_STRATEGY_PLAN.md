# AI bot strategiyasini kuchaytirish rejasi

## Hozirgi holat

- Bot hujum uchun barcha qal'alardagi mavjud kuchni jamlab hisoblaydi, lekin oddiy (`normal`) darajada ko'pincha faqat bitta qal'adan qo'shin yuboradi. Bu yutqazadigan hujumlarga olib keladi.
- Kelayotgan hujum, mahalliy ishlab chiqarish va yordam qo'shinining yetib kelish vaqti birgalikda baholanmaydi.
- Flank yo'nalishi tasodifiy tanlanadi, ba'zan sekinroq yo'l hech qanday foydasiz ishlatiladi.
- Bot qo'shinlarni oldingi chiziqqa muntazam ko'chirmaydi, tezkor yollash va qo'shin turlarini tayyorlash imkoniyatlaridan kam foydalanadi.
- Intercept qarori boshqa vazifaga ketayotgan qo'shinni rejasiz chalg'itishi mumkin.

## Amalga oshirish

1. Dushman yurishini ETA bo'yicha bashorat qilish: kelayotgan qo'shinlar, ishlab chiqarish va oldindan yo'lga chiqqan yordamni hisobga olib, qal'a qachon xavfga tushishini topish.
2. Xavf ostidagi qal'aga vaqtida yetadigan yordam yuborish; zarur bo'lsa oltin bilan tezkor yollash. Boshqa frontni bo'shatib yubormaslik.
3. Hujumni maqsad qiymati, yo'l vaqti, kutilayotgan himoya, qarshi hujum xavfi va mavjud kuch bilan baholash. Faqat yetarli kuch to'planganda yuborish; bir nechta manbani sinxronlashtirish.
4. Qo'shin oqimini xavfsiz orqa qal'alardan muhim frontga yo'naltirish; hujum uchun zaxirani saqlash.
5. Yo'nalish va interceptni vaziyatga qarab tanlash; allaqachon muhim maqsadga ketayotgan armiyani behuda burmaslik.
6. Qal'a yangilash, ixtisoslashtirish, qo'shin tayyorlash va dragon strike xarajatlarini foydaga qarab tanlash.
7. Turli xaritalar, qiyinchilik darajalari va o'yinchi harakatlari uchun regressiya sinovlari; resurslar va saqlangan o'yin holati to'g'riligini tekshirish.

## Mezonlar

- Bot yetarli bo'lmagan yakka hujumni yubormaydi; kerak bo'lsa bir nechta qal'ani muvofiqlashtiradi.
- Dushman bosimini oldindan ko'rib, yordamni belgilangan vaqtdan oldin jo'natadi.
- Tasodifiy qarorlar o'rniga izohlanadigan strategik ustuvorliklar ishlaydi; `easy`, `normal`, `hard` farqi saqlanadi.
- AI server va brauzerda bir xil ishlaydi, mavjud o'yin qoida va saqlash formati buzilmaydi.

## Bajarilgan ish va tekshiruv

- [x] Yetib kelish vaqti bo'yicha dushman armiyasi va muvofiqlashtirilgan buyruqlarni bashorat qilish.
- [x] Vaqtida yordam yuborish, chegaradagi qo'shin to'planishiga javob berish va zarur bo'lsa oltin sarflab tezkor yollash.
- [x] Maqsad qiymati, himoya va yo'l vaqti bo'yicha hujum tanlash; yetarli kuch bo'lmasa kutish, ko'p manbali yurishni sinxronlashtirish.
- [x] Orqa qal'alardan frontga avtomatik ta'minot, vaziyatga mos yo'nalish va himoyaga kerak bo'lgan armiyani intercept qilish.
- [x] Foydali yangilanish, dushman tarkibiga mos qo'shin tayyorlash va o'z qo'shinlariga zararini hisoblaydigan dragon strike tanlovi.
- [x] 88 ta engine, 4 ta server va 42 ta interfeys sinovi o'tdi. 11 xaritada `hard` botlar bilan 180 soniyagacha simulyatsiyada saqlash holati va qo'shin qiymatlari to'g'ri qoldi.

## Ikkinchi bosqich: adolatli va moslashuvchan raqib

1. Bot raqibning hali yo'lga chiqmagan buyruqlaridan xabar topmasin. O'zining buyruqlarini esa himoya va hujum hisobida ko'rsin. Dushman harakatini faqat maydondagi armiya va chegaradagi ochiq qo'shin to'planishidan taxmin qilsin.
2. O'z qal'asidan rejalashtirilgan yurish hujumdan avval qo'shinni kamaytirsa, bot buni oldindan hisoblasin va qal'a yo'qoladigan bo'lsa yurishni bekor qilsin.
3. Himoyaga kerakli qo'shinni qal'aning haqiqiy himoya kuchiga qarab hisoblasin. Yordam beradigan qal'a ham xavfsiz qolsin. Oltin yetmasa ham foydali bo'ladigan qisman tezkor yollashga ruxsat bersin.
4. Raqib katta armiyasini jo'natib zaiflashtirgan qal'aga vaqtida qarshi hujum qilishni maqsad bahosida hisobga olsin; buning uchun o'z mudofaasini xavfga qo'ymasin.
5. Maxfiy buyruq, chiqib ketayotgan qo'shin, qisman yollash va qarshi hujum uchun aniq sinovlar qo'shilsin. Turli xaritalarda resurs va saqlash holati tekshirilsin.
6. Nishon kuchayib, botning oldindan buyurilgan hujumi endi yutmasligi ma'lum bo'lsa, hali jo'natilmagan qo'shinlarni saqlash uchun buyruqni qayta baholab bekor qilsin.

### Natija

- [x] Raqibning maxfiy buyruqlari AI kuzatuvidan chiqarildi; yo'lga chiqqan armiya va ochiq chegaraviy qo'shinlar asosida javob beradi.
- [x] O'zining chiqib ketadigan qo'shinlarini oldindan hisoblaydi va qal'ani yo'qotadigan hujum buyrug'ini bekor qiladi.
- [x] Himoya ehtiyoji haqiqiy himoya kuchidan hisoblanadi; yordamchi qal'a zaxirasi saqlanadi, mavjud oltin qisman tezkor yollashga ham sarflanadi.
- [x] Raqib katta armiyasini chiqarib zaiflashtirgan qal'a qarshi hujum uchun ustuvor bo'ladi.
- [x] Nishon himoyasi kuchaysa, kutilayotgan hujum qayta baholanadi va yutqazadigan buyruqlar bekor qilinadi.
- [x] 93 ta engine, 4 ta server va 42 ta interfeys sinovi o'tdi. 11 xaritada `hard` va progressive combat bilan 240 soniyagacha simulyatsiya saqlash va qo'shin qiymatlari to'g'riligini ko'rsatdi.

## Uchinchi bosqich: Hard rejimni adolatli kuchaytirish

1. Hard botning hozirgi natijasini Normal botga qarshi bir xil xarita va seedlarda o'lchash. Oltin va qo'shin miqdoriga sun'iy bonus berilmaydi.
2. Hard uchun hujumga ozgina kuch yetmagan paytda foydali va xavfsiz nishonga qonuniy `quickRecruit` bilan qo'shin sotib olish. Xarajat cheklansin, mudofaa zaxirasi qolsin.
3. Dragon strike ochilgan va foydali nishon mavjud bo'lsa, Hard bot 1000 oltin yig'ishni yangilashlardan oldin rejalashtirsin; o'z qo'shinlariga tegadigan zarba yubormasin.
4. Hard nishon bahosida yo'l tuguni va keyingi yurish imkonini hisobga olsin, lekin kuchi yetmagan hujumni yubormasin.
5. Yangi qarorlar uchun aniq sinovlar qo'shish; Hard va Normalni bir xil sharoitda solishtirish, 11 xaritada resurs va saqlash holatini tekshirish.
6. Hard uchun yo'lga chiqqan armiya nishon keskin kuchaygani sabab aniq yutqazadigan bo'lsa, imkon borida uni qaytarib qo'shinni saqlash.
7. Oddiy jangda qimmat navbatdagi piyoda tayyorlashni qonuniy, arzonroq tezkor yollash bilan solishtirish; Hard oltinni samaraliroq sarflasin.

Boshlang'ich o'lchov: 6 ta ikki o'yinchili xaritada Hard/Normal tomonlari almashtirilgan 12 o'yinda Hard 6 marta g'alaba qildi, Normal 0 marta; 8 o'yinda Hard ko'proq qal'ani ushlab turdi.

### Uchinchi bosqich natijasi

- [x] Hard raqib chegara qal'asiga qo'shin to'plaganda kattaroq zaxira saqlaydi. Bu qo'shimcha qo'shin yaratmaydi; mavjud qo'shinning bir qismi hujumga sarflanmaydi.
- [x] Hard dragon uchun foydali nishon mavjud bo'lsa 1000 oltinni yig'adi va zarba narxini to'liq to'laydi.
- [x] Ommaviy tezkor yollash, yo'l tuguniga katta bonus, erta chekinish va mashg'ulotni butunlay o'tkazib yuborish teng sharoitdagi natijani pasaytirdi; yakuniy kodga olinmadi.
- [x] 12 ta bir xil o'yinda Hard 6 ta g'alaba, Normal 0 ta g'alaba qayd etdi; Hard 10 o'yinda ko'proq qal'aga ega bo'ldi (boshlang'ich holatda 8 ta). Bu har bir o'yinda g'alabani kafolatlamaydi, lekin xarita nazorati yaxshilandi.
- [x] 95 ta engine, 4 ta server va 42 ta interfeys sinovi o'tdi. 11 xaritada Hard botlar bilan 240 soniyagacha simulyatsiyada resurs va saqlangan holat yaroqli qoldi.
