/* Presentation copy shared by menus, commander selection and live commands.
   Hero bonuses describe existing engine rules; no difficulty ratings are invented. */
(function () {
  const menu = {
    en: {
      menu_training_title: 'Training', menu_training_hint: 'Sharpen your tactics against AI',
      menu_war_room: 'War room', brand_tagline: 'Real-time strategy',
      menu_intro: 'Build your army. Capture castles. Hold the crown.',
      menu_start_battle: 'Start battle', menu_solo_hint: 'Single player · AI opponent',
      menu_online_battle: 'Online battle', menu_online_hint: 'Find an opponent',
      menu_with_friend: 'Play with a friend', menu_friend_hint: 'Create or join a room',
      menu_practice: 'Practice against AI', menu_battlefield: 'Battlefield', menu_change_map: 'Change map',
      menu_commanders: 'Commanders', menu_profile: 'Profile', menu_settings: 'Settings', menu_help: 'Help',
      menu_no_battles: 'No battles yet', menu_winrate: 'win rate', menu_random_map: 'Random battlefield',
      menu_prototype: 'Open 3D prototype ↗'
    },
    ru: {
      menu_training_title: 'Тренировка', menu_training_hint: 'Отточите тактику против ИИ',
      menu_war_room: 'Военный совет', brand_tagline: 'Стратегия в реальном времени',
      menu_intro: 'Соберите армию. Захватите замки. Удержите корону.',
      menu_start_battle: 'Начать битву', menu_solo_hint: 'Одиночная игра · Соперник ИИ',
      menu_online_battle: 'Битва онлайн', menu_online_hint: 'Найти соперника',
      menu_with_friend: 'Игра с другом', menu_friend_hint: 'Создать комнату или войти по коду',
      menu_practice: 'Тренировка против ИИ', menu_battlefield: 'Поле битвы', menu_change_map: 'Выбрать карту',
      menu_commanders: 'Полководцы', menu_profile: 'Профиль', menu_settings: 'Настройки', menu_help: 'Помощь',
      menu_no_battles: 'Пока нет сражений', menu_winrate: 'побед', menu_random_map: 'Случайная карта',
      menu_prototype: 'Открыть 3D-прототип ↗'
    },
    uz: {
      menu_training_title: 'Mashg‘ulot', menu_training_hint: 'AI raqibga qarshi taktikani sinang',
      menu_war_room: 'Harbiy kengash', brand_tagline: 'Real vaqtli strategiya',
      menu_intro: 'Armiya tuzing. Qal’alarni egallang. Tojni saqlab qoling.',
      menu_start_battle: 'Jang boshlash', menu_solo_hint: 'Yakka o‘yin · AI raqib',
      menu_online_battle: 'Onlayn jang', menu_online_hint: 'Raqib topish',
      menu_with_friend: 'Do‘st bilan', menu_friend_hint: 'Xona ochish yoki kod bilan kirish',
      menu_practice: 'AI bilan mashq', menu_battlefield: 'Jang maydoni', menu_change_map: 'Xaritani tanlash',
      menu_commanders: 'Sarkardalar', menu_profile: 'Profil', menu_settings: 'Sozlamalar', menu_help: 'Yordam',
      menu_no_battles: 'Hali jang bo‘lmagan', menu_winrate: 'g‘alaba', menu_random_map: 'Tasodifiy xarita',
      menu_prototype: '3D prototipni ochish ↗'
    }
  };
  for (const [lang, values] of Object.entries(menu)) Object.assign(CrownI18n.TRANSLATIONS[lang], values);
})();
(function () {
  const copy = {
    en: {
      ui_war_council:'Crownfall · War council', hero_pick_title:'Choose your commander',
      ui_pick_hint:'Choose a portrait. Review your strengths. Lead your army.',
      ui_battle_settings:'Battle settings', settings_ai_diff:'Opponent difficulty',
      ui_unselected:'No commander selected', ui_preview_title:'Your commander awaits',
      ui_preview_hint:'Select one of four commanders to inspect their passive abilities.',
      ui_play_as:'Play as {hero}', ui_passive:'Passive ability', ui_playstyle:'Playstyle',
      ui_role_vanguard:'Vanguard · Mobility', ui_role_fortifier:'Fortifier · Development',
      ui_role_guildmaster:'Guildmaster · Economy', ui_role_infiltrator:'Infiltrator · Flanking',
      ui_perk_vanguard:'+15% army speed', ui_perk_fortifier:'−25% upgrade cost',
      ui_perk_guildmaster:'+30% Gold income', ui_perk_infiltrator:'+25% flank speed',
      ui_ability_vanguard:'Swift march', ui_ability_fortifier:'Stone citadel', ui_ability_guildmaster:'Golden age', ui_ability_infiltrator:'Night raid',
      ui_style_vanguard:'Reach new castles quickly and reinforce distant fronts.',
      ui_style_fortifier:'Develop your keeps earlier and strengthen local production.',
      ui_style_guildmaster:'Invest extra Gold in upgrades and castle specializations.',
      ui_style_infiltrator:'Take flank routes to gain speed and stronger siege attacks.',
      ui_bonus_vanguard:'+15% army movement speed.|+10% effective strength when resolving two-faction road battles. Survivors still use raw troop counts.',
      ui_bonus_fortifier:'25% cheaper upgrades: 75 / 165 Gold.|+0.5 troops/s at main keeps, before specialization modifiers.',
      ui_bonus_guildmaster:'+150 starting Gold: 350 total.|+30% Gold income from every owned castle.',
      ui_bonus_infiltrator:'+25% movement speed on flank routes.|+20% effective siege strength on flank attacks.',
      ui_castle_actions:'Castle actions', ui_all_sources:'All castles', ui_save_difficulty:'Apply difficulty',
      ui_upgrade:'Upgrade', ui_off:'Off', ui_saved:'Changes saved.', ui_reserve_invalid:'Enter a whole reserve from 0 to 1,000,000,000,000.',
      ui_supply_invalid:'Supply needs a different friendly castle and cannot form a loop.', ui_same_spec:'This specialization is already active.',
      ui_no_supply:'Capture another castle to establish a supply line.', ui_spec_hint:'Apply now for 50 Gold, or use this choice on your next upgrade.',
      ui_copied:'Copied to clipboard.', ui_copy_failed:'Copy unavailable. Select and copy the text below.',
      ui_connecting:'Connecting…', ui_connection_failed:'Unable to connect. Retry, or play offline practice.', ui_room_error:'Room unavailable. Check the code and try again.',
      ui_loading_rooms:'Finding open rooms…', ui_rooms_failed:'Rooms could not be loaded. Check your connection and refresh.',
      ui_ready:'Ready', ui_host_ready:'Host · Ready', ui_bot:'AI opponent', ui_waiting:'Waiting', ui_wait_host:'Waiting for the host to start',
      ui_remove_bot:'Remove AI', ui_occupied:'Player joined', ui_wait_players:'Add an AI or invite a player to start.', ui_leave_room:'Leave room',
      ui_rematch_wait:'Rematch requested · waiting for opponent', ui_dispatched:'Troops dispatched', ui_upgraded:'Castle upgraded', ui_orders:'Coordinated attack scheduled',
      ui_stats_dispatched:'Troops dispatched', res_stat_lost:'Total troops lost',
      ui_auth_required:'Enter a username and password.', ui_auth_failed:'Sign-in failed. Check your details and try again.',
      ui_quality:'Graphics', ui_troops:'troops', ui_troops_per_second:'troops/s', ui_players:'players',
      spec_balanced:'Balanced', spec_military:'Military', spec_economy:'Economy', passive_citadel:'Elite Citadel: +1 troop/s; required for Crown Control.',
      passive_watch:'Watch Keep: produces a local garrison. No extra combat defense bonus.',
      passive_archer:'Archer Tower: defensive volley scales with tower level; blizzards weaken the volley.',
      stabilizing_badge:'Stabilizing', spec_apply_btn:'Apply specialization · 50 Gold', spec_error_gold:'Requires 50 Gold.', spec_changed:'Specialization changed.',
      tactics_spec_label:'Castle specialization', telemetry_live:'11 battlefields · Online & offline', menu_telemetry:'11 battlefields · Online & offline',
      hero_league_badge:'Find your next opponent', fair_play_badge:'Same rules for every faction', server_status_ok:'Online opponent or AI fallback',
      pcount_2:'2 players', pcount_3:'3 players', pcount_4:'4 players',
      ui_objective_crown:'Hold 14 castles + the Citadel for 30s', ui_objective_conquest:'Capture all castles or eliminate opponents',
      ui_queued:'Scheduled', ui_no_orders:'No scheduled attacks', ui_cancel_order:'Cancel', ui_order_cancelled:'Scheduled attack cancelled',
      ui_back:'Back', ui_match_started:'Battle started', ui_reconnecting:'Reconnecting', ui_reconnected:'Connection restored', ui_room_created:'Room created', ui_room_joined:'Joined room', ui_room_left:'Left room', ui_joined:'joined', ui_opponent_found:'Opponent found', ui_welcome:'Welcome', ui_logged_out:'Signed out', ui_guest:'Playing as guest'
    },
    ru: {
      ui_war_council:'Crownfall · Военный совет',hero_pick_title:'Выберите полководца',ui_pick_hint:'Выберите портрет. Изучите преимущества. Возглавьте армию.',
      ui_battle_settings:'Настройки битвы',settings_ai_diff:'Сложность соперника',ui_unselected:'Полководец не выбран',ui_preview_title:'Кто поведёт вашу армию?',ui_preview_hint:'Выберите одного из четырёх героев, чтобы изучить его пассивные способности.',ui_play_as:'В бой: {hero}',ui_passive:'Пассивная способность',ui_playstyle:'Стиль игры',
      ui_role_vanguard:'Авангард · Скорость',ui_role_fortifier:'Архитектор · Развитие',ui_role_guildmaster:'Казначей · Экономика',ui_role_infiltrator:'Лазутчик · Фланги',ui_perk_vanguard:'+15% к скорости армий',ui_perk_fortifier:'−25% к цене улучшений',ui_perk_guildmaster:'+30% дохода золота',ui_perk_infiltrator:'+25% к скорости на фланге',
      ui_ability_vanguard:'Стремительный марш',ui_ability_fortifier:'Каменная твердыня',ui_ability_guildmaster:'Золотой век',ui_ability_infiltrator:'Ночной рейд',
      ui_style_vanguard:'Быстро занимайте замки и перебрасывайте подкрепления.',ui_style_fortifier:'Раньше улучшайте замки и наращивайте гарнизоны.',ui_style_guildmaster:'Вкладывайте золото в улучшения и специализации.',ui_style_infiltrator:'Используйте фланги для ускорения и усиления осады.',
      ui_bonus_vanguard:'+15% к скорости всех армий.|+10% эффективной силы в дорожном бою двух фракций. Выжившие считаются по исходному числу войск.',ui_bonus_fortifier:'Улучшения дешевле на 25%: 75 / 165 золота.|+0,5 войск/с в главных замках до модификаторов специализации.',ui_bonus_guildmaster:'+150 стартового золота: всего 350.|+30% дохода золота от каждого своего замка.',ui_bonus_infiltrator:'+25% к скорости фланговых маршрутов.|+20% эффективной силы осады при атаке с фланга.',
      ui_castle_actions:'Действия замка',ui_all_sources:'Все замки',ui_save_difficulty:'Применить сложность',ui_upgrade:'Улучшить',ui_off:'Отключено',ui_saved:'Изменения сохранены.',ui_reserve_invalid:'Введите целый резерв от 0 до 1 000 000 000 000.',ui_supply_invalid:'Выберите другой свой замок. Цепочка снабжения не должна замыкаться.',ui_same_spec:'Эта специализация уже активна.',ui_no_supply:'Захватите ещё один замок для снабжения.',ui_spec_hint:'Примените за 50 золота или выберите для следующего улучшения.',
      ui_copied:'Скопировано.',ui_copy_failed:'Копирование недоступно. Выделите и скопируйте текст ниже.',ui_connecting:'Подключение…',ui_connection_failed:'Не удалось подключиться. Повторите попытку или играйте с ИИ.',ui_room_error:'Комната недоступна. Проверьте код.',ui_loading_rooms:'Поиск открытых комнат…',ui_rooms_failed:'Не удалось загрузить комнаты. Проверьте связь и обновите.',
      ui_ready:'Готов',ui_host_ready:'Хост · Готов',ui_bot:'ИИ-соперник',ui_waiting:'Ожидание',ui_wait_host:'Ожидание запуска матча хостом',ui_remove_bot:'Убрать ИИ',ui_occupied:'Игрок в комнате',ui_wait_players:'Пригласите игрока или добавьте ИИ.',ui_leave_room:'Покинуть комнату',ui_rematch_wait:'Реванш запрошен · ожидание соперника',ui_dispatched:'Войска отправлены',ui_upgraded:'Замок улучшен',ui_orders:'Общая атака запланирована',ui_stats_dispatched:'Отправлено войск',res_stat_lost:'Всего потерь',
      ui_auth_required:'Введите имя пользователя и пароль.',ui_auth_failed:'Не удалось войти. Проверьте данные.',ui_quality:'Графика',ui_troops:'войск',ui_troops_per_second:'войск/с',ui_players:'игрока',spec_balanced:'Баланс',spec_military:'Военная',spec_economy:'Экономика',passive_citadel:'Элитная цитадель: +1 войск/с; нужна для Контроля Короны.',passive_watch:'Дозорный замок: производит гарнизон. Нет бонуса к защите в бою.',passive_archer:'Башня лучников: сила залпа зависит от уровня; метель ослабляет залп.',stabilizing_badge:'Стабилизация',spec_apply_btn:'Применить специализацию · 50 золота',spec_error_gold:'Нужно 50 золота.',spec_changed:'Специализация изменена.',tactics_spec_label:'Специализация замка',telemetry_live:'11 карт · Онлайн и оффлайн',menu_telemetry:'11 карт · Онлайн и оффлайн',hero_league_badge:'Найдите следующего соперника',fair_play_badge:'Единые правила для всех',server_status_ok:'Соперник онлайн или ИИ',pcount_2:'2 игрока',pcount_3:'3 игрока',pcount_4:'4 игрока',ui_objective_crown:'14 замков + Цитадель на 30с',ui_objective_conquest:'Захватите все замки или устраните соперников',ui_queued:'Запланировано',ui_no_orders:'Нет отложенных атак',ui_cancel_order:'Отменить',ui_order_cancelled:'Атака отменена',ui_back:'Назад',ui_match_started:'Битва началась',ui_reconnecting:'Переподключение',ui_reconnected:'Связь восстановлена',ui_room_created:'Комната создана',ui_room_joined:'Вход в комнату',ui_room_left:'Вы вышли из комнаты',ui_joined:'присоединился',ui_opponent_found:'Соперник найден',ui_welcome:'Добро пожаловать',ui_logged_out:'Вы вышли из аккаунта',ui_guest:'Игра в гостевом режиме'
    },
    uz: {
      ui_war_council:'Crownfall · Harbiy kengash',hero_pick_title:'Sarkardangizni tanlang',ui_pick_hint:'Portretni tanlang. Afzalliklarni bilib oling. Armiyani boshqaring.',ui_battle_settings:'Jang sozlamalari',settings_ai_diff:'Raqib qiyinligi',ui_unselected:'Sarkarda tanlanmagan',ui_preview_title:'Sarkardangiz kutmoqda',ui_preview_hint:'Passiv qobiliyatlarini bilish uchun to‘rt sarkardadan birini tanlang.',ui_play_as:'Jangga: {hero}',ui_passive:'Passiv qobiliyat',ui_playstyle:'O‘yin uslubi',
      ui_role_vanguard:'Avangard · Tezlik',ui_role_fortifier:'Me’mor · Rivojlanish',ui_role_guildmaster:'Xazinabon · Iqtisod',ui_role_infiltrator:'Josus · Qanotlar',ui_perk_vanguard:'+15% armiya tezligi',ui_perk_fortifier:'−25% yangilash narxi',ui_perk_guildmaster:'+30% oltin daromadi',ui_perk_infiltrator:'+25% qanot tezligi',ui_ability_vanguard:'Tezkor yurish',ui_ability_fortifier:'Tosh istehkom',ui_ability_guildmaster:'Oltin asri',ui_ability_infiltrator:'Tungi reyd',ui_style_vanguard:'Qal’alarni tez egallang va uzoq safga yordam yetkazing.',ui_style_fortifier:'Qal’alarni ertaroq yaxshilang va garnizonni kuchaytiring.',ui_style_guildmaster:'Qo‘shimcha oltinni yangilash va ixtisoslashuvga sarflang.',ui_style_infiltrator:'Tezlik va qamal kuchi uchun qanot yo‘llaridan foydalaning.',
      ui_bonus_vanguard:'Barcha armiyalar +15% tez yuradi.|Ikki tomonli yo‘l jangida +10% samarali kuch. Omon qoluvchilar asl askar sonidan hisoblanadi.',ui_bonus_fortifier:'Yangilash 25% arzon: 75 / 165 oltin.|Asosiy qal’alarda +0.5 askar/s, ixtisoslashuvdan oldin.',ui_bonus_guildmaster:'+150 boshlang‘ich oltin: jami 350.|Har bir qal’adan +30% oltin daromadi.',ui_bonus_infiltrator:'Qanot yo‘llarida +25% tezlik.|Qanot hujumlarida +20% samarali qamal kuchi.',
      ui_castle_actions:'Qal’a amallari',ui_all_sources:'Barcha qal’alar',ui_save_difficulty:'Qiyinlikni qo‘llash',ui_upgrade:'Yangilash',ui_off:'O‘chirilgan',ui_saved:'O‘zgarishlar saqlandi.',ui_reserve_invalid:'0 dan 1 000 000 000 000 gacha butun son kiriting.',ui_supply_invalid:'Boshqa o‘z qal’angizni tanlang. Ta’minot zanjiri aylanma bo‘lmasin.',ui_same_spec:'Bu ixtisoslashuv faol.',ui_no_supply:'Ta’minot uchun yana bir qal’a egallang.',ui_spec_hint:'50 oltinga hozir qo‘llang yoki keyingi yangilashda ishlating.',ui_copied:'Nusxalandi.',ui_copy_failed:'Nusxalash imkonsiz. Quyidagi matnni belgilang va nusxalang.',ui_connecting:'Ulanmoqda…',ui_connection_failed:'Ulanib bo‘lmadi. Qayta urining yoki oflayn o‘ynang.',ui_room_error:'Xona topilmadi. Kodni tekshiring.',ui_loading_rooms:'Ochiq xonalar qidirilmoqda…',ui_rooms_failed:'Xonalar yuklanmadi. Aloqani tekshiring va yangilang.',
      ui_ready:'Tayyor',ui_host_ready:'Host · Tayyor',ui_bot:'AI raqib',ui_waiting:'Kutilmoqda',ui_wait_host:'Xona egasi jangni boshlashini kuting',ui_remove_bot:'AI ni olib tashlash',ui_occupied:'O‘yinchi qo‘shilgan',ui_wait_players:'O‘yinchi taklif qiling yoki AI qo‘shing.',ui_leave_room:'Xonadan chiqish',ui_rematch_wait:'Revansh so‘raldi · raqib kutilmoqda',ui_dispatched:'Qo‘shin yuborildi',ui_upgraded:'Qal’a yangilandi',ui_orders:'Umumiy hujum rejalashtirildi',ui_stats_dispatched:'Yuborilgan askarlar',res_stat_lost:'Jami yo‘qotishlar',ui_auth_required:'Foydalanuvchi nomi va parolni kiriting.',ui_auth_failed:'Kirish amalga oshmadi. Ma’lumotlarni tekshiring.',ui_quality:'Grafika',ui_troops:'askar',ui_troops_per_second:'askar/s',ui_players:'o‘yinchi',spec_balanced:'Muvozanatli',spec_military:'Harbiy',spec_economy:'Iqtisodiy',passive_citadel:'Buyuk Sitadel: +1 askar/s; Toj nazorati uchun zarur.',passive_watch:'Kuzatuv qal’asi: garnizon yetishtiradi. Qo‘shimcha jang himoyasi yo‘q.',passive_archer:'O‘qchilar minorasi: zarba darajaga bog‘liq; qor bo‘roni uni zaiflashtiradi.',stabilizing_badge:'Barqarorlashuv',spec_apply_btn:'Ixtisoslashuvni qo‘llash · 50 oltin',spec_error_gold:'50 oltin kerak.',spec_changed:'Ixtisoslashuv o‘zgardi.',tactics_spec_label:'Qal’a ixtisoslashuvi',telemetry_live:'11 xarita · Onlayn va oflayn',menu_telemetry:'11 xarita · Onlayn va oflayn',hero_league_badge:'Keyingi raqibingizni toping',fair_play_badge:'Barcha tomonlarga bir xil qoidalar',server_status_ok:'Onlayn raqib yoki AI',pcount_2:'2 o‘yinchi',pcount_3:'3 o‘yinchi',pcount_4:'4 o‘yinchi',ui_objective_crown:'14 qal’a + Sitadelni 30s ushlang',ui_objective_conquest:'Barcha qal’alarni oling yoki raqiblarni yo‘qoting',ui_queued:'Rejalashtirilgan',ui_no_orders:'Rejalashtirilgan hujum yo‘q',ui_cancel_order:'Bekor qilish',ui_order_cancelled:'Hujum bekor qilindi',ui_back:'Orqaga',ui_match_started:'Jang boshlandi',ui_reconnecting:'Qayta ulanmoqda',ui_reconnected:'Aloqa tiklandi',ui_room_created:'Xona yaratildi',ui_room_joined:'Xonaga ulandingiz',ui_room_left:'Xonadan chiqildi',ui_joined:'qo‘shildi',ui_opponent_found:'Raqib topildi',ui_welcome:'Xush kelibsiz',ui_logged_out:'Tizimdan chiqildi',ui_guest:'Mehmon sifatida o‘ynash'
    }
  };
  for (const [lang, values] of Object.entries(copy)) {
    Object.assign(CrownI18n.TRANSLATIONS[lang], values);
    const dict=CrownI18n.TRANSLATIONS[lang];
    dict.sfx_volume=dict.settings_sfx_volume;dict.music_volume=dict.settings_music_volume;dict.auth_title=dict.auth_login_tab;
    for (const hero of ['vanguard','fortifier','guildmaster','infiltrator']) {
      CrownI18n.TRANSLATIONS[lang][`hero_${hero}_desc`] = values[`ui_bonus_${hero}`].replace('|', ' ');
    }
  }
})();
(function(){
  const additions={
    en:{ui_single_source:'Selected castle only',ui_selection_cleared:'Target cleared',ui_online_clock:'Online matches use the server clock; pause and speed changes are unavailable.',ui_resume:'Resume game',ui_pause:'Pause game',ui_next_castle:'Next owned castle',ui_zoom_in:'Zoom in',ui_zoom_out:'Zoom out',ui_zoom_reset:'Reset view',ui_group_forecast:'Armies arrive together and resolve separately. Road combat and weather can change the outcome.',ui_captured:'Castle captured',ui_lost:'Castle lost · tap to locate',ui_threat:'Under attack',ui_tour:'Quick start',ui_coach1:'Choose a target',ui_coach1_desc:'Your castle is selected. Tap a destination on the map.',ui_coach2:'Choose your army',ui_coach2_desc:'Choose 25%, 50%, 75% or 100%. Review the battle forecast.',ui_coach3:'Send your troops',ui_coach3_desc:'Press Attack. Each castle sends its own troops. Survivors hold the captured castle.',ui_reset_stats:'Reset career statistics?',ui_reset_stats_body:'This removes your local battle history, rank and achievements.',ui_reset:'Reset',ui_cancel:'Cancel',ui_stats_reset:'Career statistics reset.',quality_auto:'Automatic',quality_low:'Low · fewer effects',quality_medium:'Medium · balanced',quality_high:'High · full effects',ui_troops_title:'Troop Recruitment',ui_train:'Train',ui_soldier:'Soldier',ui_archer:'Archer',ui_knight:'Knight',ui_cavalry:'Cavalry',ui_queue_label:'Training Queue',ui_cancel_train:'Cancel',ui_train_hint:'Recruit specialized troops with Gold.',ui_train_cost:'Cost',ui_train_time:'Time',ui_locked:'Locked',ui_dragon_strike:'Dragon Strike',ui_dragon_hint:'Incinerate enemy formations and scorch keeps (1000 Gold).',ui_dragon_ready:'Dragon Ready',ui_dragon_cooldown:'Dragon Cooldown',ui_dragon_confirm:'Unleash Dragon',ui_dragon_cancel:'Cancel Strike',ui_dragon_warning:'Select Target Zone',ui_scorched_badge:'Scorched',ui_army_details:'Army Inspection',ui_recall_army:'Recall Army',ui_in_battle:'Locked in Combat',ui_eta:'ETA',ui_composition:'Composition',map_europe_1805:'Europe 1805 (Napoleonic Era)',map_orient_empires:'Empires of the Orient',era_medieval:'Medieval Age',era_napoleonic:'Napoleonic Era',era_orient:'Eastern Dynasties'},
    ru:{ui_single_source:'Только выбранный замок',ui_selection_cleared:'Цель отменена',ui_online_clock:'Сетевой матч работает по часам сервера; пауза и изменение скорости недоступны.',ui_resume:'Продолжить игру',ui_pause:'Пауза',ui_next_castle:'Следующий свой замок',ui_zoom_in:'Приблизить',ui_zoom_out:'Отдалить',ui_zoom_reset:'Сбросить вид',ui_group_forecast:'Армии прибывают вместе, но вступают в бой отдельно. Погода и бои в пути могут изменить исход.',ui_captured:'Замок захвачен',ui_lost:'Замок потерян · нажмите для перехода',ui_threat:'Под атакой',ui_tour:'Быстрый старт',ui_coach1:'Выберите цель',ui_coach1_desc:'Ваш замок уже выбран. Нажмите на цель на карте.',ui_coach2:'Выберите армию',ui_coach2_desc:'Выберите 25%, 50%, 75% или 100%. Изучите прогноз боя.',ui_coach3:'Отправьте войска',ui_coach3_desc:'Нажмите «Атака». Каждый замок отправляет свои войска. Выжившие остаются в захваченном замке.',ui_reset_stats:'Сбросить статистику?',ui_reset_stats_body:'Будут удалены локальная история боёв, ранг и достижения.',ui_reset:'Сбросить',ui_cancel:'Отмена',ui_stats_reset:'Статистика сброшена.',quality_auto:'Автоматически',quality_low:'Низкая · меньше эффектов',quality_medium:'Средняя · баланс',quality_high:'Высокая · все эффекты',ui_troops_title:'Наём войск',ui_train:'Нанять',ui_soldier:'Пехотинец',ui_archer:'Лучник',ui_knight:'Рыцарь',ui_cavalry:'Кавалерия',ui_queue_label:'Очередь найма',ui_cancel_train:'Отмена',ui_train_hint:'Нанимайте специализированные войска за золото.',ui_train_cost:'Цена',ui_train_time:'Время',ui_locked:'Заблокировано',ui_dragon_strike:'Удар Дракона',ui_dragon_hint:'Испепелите армии врага и подожгите цитадели (1000 золота).',ui_dragon_ready:'Дракон готов',ui_dragon_cooldown:'Перезарядка',ui_dragon_confirm:'Обрушить Дракона',ui_dragon_cancel:'Отмена удара',ui_dragon_warning:'Выберите зону удара',ui_scorched_badge:'Выжжен',ui_army_details:'Обзор армии',ui_recall_army:'Отозвать армию',ui_in_battle:'В бою на дороге',ui_eta:'Прибытие',ui_composition:'Состав',map_europe_1805:'Европа 1805 (Эпоха Наполеона)',map_orient_empires:'Империи Востока',era_medieval:'Средневековье',era_napoleonic:'Эпоха Наполеона',era_orient:'Восточные династии'},
    uz:{ui_single_source:'Faqat tanlangan qal’a',ui_selection_cleared:'Nishon bekor qilindi',ui_online_clock:'Onlayn jang server vaqti bilan ishlaydi; pauza va tezlik o‘zgarishi yo‘q.',ui_resume:'Davom etish',ui_pause:'Pauza',ui_next_castle:'Keyingi o‘z qal’angiz',ui_zoom_in:'Yaqinlashtirish',ui_zoom_out:'Uzoqlashtirish',ui_zoom_reset:'Ko‘rinishni tiklash',ui_group_forecast:'Armiyalar birga yetib boradi, ammo alohida jang qiladi. Ob-havo va yo‘l jangi natijani o‘zgartirishi mumkin.',ui_captured:'Qal’a egallandi',ui_lost:'Qal’a yo‘qotildi · topish uchun bosing',ui_threat:'Hujum ostida',ui_tour:'Tezkor boshlash',ui_coach1:'Nishonni tanlang',ui_coach1_desc:'Sizning qal’angiz tanlangan. Xaritadan nishon tanlang.',ui_coach2:'Armiyani tanlang',ui_coach2_desc:'25%, 50%, 75% yoki 100% tanlang. Jang taxminini ko‘ring.',ui_coach3:'Qo‘shin yuboring',ui_coach3_desc:'Hujumni bosing. Har qal’a o‘z askarlarini yuboradi. Omon qolganlar egallangan qal’ada qoladi.',ui_reset_stats:'Statistikani tozalash?',ui_reset_stats_body:'Mahalliy jang tarixi, martaba va yutuqlar o‘chiriladi.',ui_reset:'Tozalash',ui_cancel:'Bekor qilish',ui_stats_reset:'Statistika tozalandi.',quality_auto:'Avtomatik',quality_low:'Past · kam effektlar',quality_medium:'O‘rtacha · muvozanatli',quality_high:'Yuqori · to‘liq effektlar',ui_troops_title:'Qo‘shin yollash',ui_train:'Yollash',ui_soldier:'Piyoda askar',ui_archer:'O‘qchi',ui_knight:'Ritsar',ui_cavalry:'Otliq askar',ui_queue_label:'Yollash navbati',ui_cancel_train:'Bekor qilish',ui_train_hint:'Oltin evaziga maxsus qo‘shinlarni yollang.',ui_train_cost:'Narxi',ui_train_time:'Vaqti',ui_locked:'Qulflangan',ui_dragon_strike:'Ajdaho zarbasi',ui_dragon_hint:'Dushman qo‘shinlarini kuydiring va istehkomlarni yondiring (1000 oltin).',ui_dragon_ready:'Ajdaho tayyor',ui_dragon_cooldown:'Qayta tiklanish',ui_dragon_confirm:'Ajdahoni yuborish',ui_dragon_cancel:'Zarপরni bekor qilish',ui_dragon_warning:'Nishon hududini tanlang',ui_scorched_badge:'Yondirilgan',ui_army_details:'Armiya tafsilotlari',ui_recall_army:'Armiyani qaytarish',ui_in_battle:'Yo‘l jangida qatnashmoqda',ui_eta:'Yetib borish',ui_composition:'Tarkibi',map_europe_1805:'Yevropa 1805 (Napoleon davri)',map_orient_empires:'Sharq imperiyalari',era_medieval:'O‘rta asrlar',era_napoleonic:'Napoleon davri',era_orient:'Sharq sulolalari'}
  };
  for(const [lang,values] of Object.entries(additions))Object.assign(CrownI18n.TRANSLATIONS[lang],values);
})();

/* Castles grant passive bonuses; all armies use a single troop count. */
(function () {
  const copy = {
    en: {
      ui_castle_buffs: 'Castle bonus', ui_auto_garrison: 'Troops grow automatically in owned castles. Special castles grant passive bonuses.',
      hotkey_manage: '<b>Castle management:</b> Open or close the panel with Tab or M. Shift+Tab and Tab inside dialogs navigate controls.',
      hotkey_recall: '<b>Recall:</b> Return the selected marching army to an allied castle.',
      buff_archer_desc: '+15% defense for this castle’s garrison.',
      buff_knight_desc: 'Armies departing this castle gain +25% march speed and +20% siege strength.',
      buff_cavalry_desc: 'Armies departing this castle gain +25% march speed.',
      buff_small_desc: '+20% local defense and +15% defense for nearby allied castles within 520 map units.',
      buff_gold_desc: 'Higher automatic Gold income for your faction; fund castle upgrades.',
      buff_troop_desc: 'Faster automatic troop growth in this garrison.',
      buff_elite_desc: '+1 troop/s in this garrison and the Crown Control victory core.',
      buff_main_desc: 'Your capital automatically produces troops and shared Gold.',
      buff_scope_local: 'Local garrison', buff_scope_nearby: 'Local garrison and nearby allies',
      buff_scope_army: 'Armies departing this castle', buff_scope_economy: 'Faction economy',
      buff_defense_legend: 'Defense Tower: +15% local defense. Watch Keep: +20% local defense and +15% defense for nearby allies.',
      audit_friendly_help: 'Select a friendly castle as your source. Shift-click or drag to another ally to reinforce. C cycles castles; Tab opens management.',
      audit_special_buildings: 'Castles automatically produce troops and Gold. Special castles grant defense, siege strength or speed bonuses.',
      rules_p3: '<b>Combat:</b> All troops share one strength. Castle and commander bonuses modify defense, siege strength and march speed. Survivors hold captured castles.',
      passive_archer: '+15% local garrison defense', passive_knight: '+25% march speed and +20% siege strength',
      passive_watch: '+20% local defense; +15% nearby allied defense', weather_snow_desc: 'Snowfall across the battlefield'
    },
    uz: {
      ui_castle_buffs: 'Qal’a bonusi', ui_auto_garrison: 'Qo‘shin o‘z qal’alaringizda avtomatik ko‘payadi. Maxsus qal’alar doimiy bonus beradi.',
      hotkey_manage: '<b>Qal’a boshqaruvi:</b> Tab yoki M panelni ochadi va yopadi. Shift+Tab va dialog ichidagi Tab tugmalar bo‘ylab yuradi.',
      hotkey_recall: '<b>Qaytarish:</b> Tanlangan yo‘ldagi armiyani o‘z qal’angizga qaytaradi.',
      buff_archer_desc: 'Ushbu qal’a garnizoniga +15% himoya.',
      buff_knight_desc: 'Ushbu qal’adan chiqqan armiyalarga +25% yurish tezligi va +20% hujum kuchi.',
      buff_cavalry_desc: 'Ushbu qal’adan chiqqan armiyalarga +25% yurish tezligi.',
      buff_small_desc: 'Qal’aga +20% himoya va 520 xarita birligi ichidagi yaqin ittifoqchi qal’alarga +15% himoya.',
      buff_gold_desc: 'Davlatingizga ko‘proq avtomatik oltin daromadi; qal’alarni yaxshilash uchun.',
      buff_troop_desc: 'Ushbu qal’a garnizonida qo‘shin tezroq avtomatik ko‘payadi.',
      buff_elite_desc: 'Ushbu garnizonga +1 askar/s va Crown Control g‘alaba o‘zagi.',
      buff_main_desc: 'Poytaxtingiz avtomatik qo‘shin va umumiy oltin ishlab chiqaradi.',
      buff_scope_local: 'Ushbu qal’a garnizoni', buff_scope_nearby: 'Ushbu qal’a va yaqin ittifoqchilar',
      buff_scope_army: 'Ushbu qal’adan chiqqan armiyalar', buff_scope_economy: 'Davlat iqtisodiyoti',
      buff_defense_legend: 'Himoya minorasi: +15% himoya. Kuzatuv qal’asi: +20% mahalliy himoya va yaqin ittifoqchilarga +15% himoya.',
      audit_friendly_help: 'O‘z qal’angizni manba sifatida tanlang. Yordam uchun Shift bilan bosing yoki chiziq torting. C qal’alarni almashtiradi; Tab boshqaruvni ochadi.',
      audit_special_buildings: 'Qal’alar avtomatik qo‘shin va oltin ishlab chiqaradi. Maxsus qal’alar himoya, hujum yoki tezlik bonusini beradi.',
      rules_p3: '<b>Jang:</b> Qo‘shinlar bitta kuch bilan hisoblanadi. Qal’a va sarkarda bonuslari himoya, hujum va yurish tezligiga ta’sir qiladi. Omon qolganlar egallangan qal’ada qoladi.',
      passive_archer: '+15% mahalliy himoya', passive_knight: '+25% yurish tezligi va +20% hujum kuchi',
      passive_watch: '+20% mahalliy va +15% yaqin ittifoqchilar himoyasi', weather_snow_desc: 'Jang maydonida qor yog‘moqda'
    },
    ru: {
      ui_castle_buffs: 'Бонус замка', ui_auto_garrison: 'Войска автоматически растут в ваших замках. Особые замки дают пассивные бонусы.',
      hotkey_manage: '<b>Управление замком:</b> Tab или M открывает и закрывает панель. Shift+Tab и Tab в диалогах перемещают фокус.',
      hotkey_recall: '<b>Отозвать:</b> Вернуть выбранную армию в свой замок.',
      buff_archer_desc: '+15% защиты гарнизону этого замка.',
      buff_knight_desc: 'Армии из этого замка получают +25% скорости марша и +20% силы штурма.',
      buff_cavalry_desc: 'Армии из этого замка получают +25% скорости марша.',
      buff_small_desc: '+20% местной защиты и +15% защиты союзным замкам в радиусе 520 единиц карты.',
      buff_gold_desc: 'Повышенный автоматический доход золота для улучшения замков.',
      buff_troop_desc: 'Ускоренный автоматический прирост войск в этом гарнизоне.',
      buff_elite_desc: '+1 воин/с в этом гарнизоне и центр победы Crown Control.',
      buff_main_desc: 'Столица автоматически производит войска и общее золото.',
      buff_scope_local: 'Местный гарнизон', buff_scope_nearby: 'Местный гарнизон и соседние союзники',
      buff_scope_army: 'Армии из этого замка', buff_scope_economy: 'Экономика фракции',
      buff_defense_legend: 'Башня защиты: +15% местной защиты. Сторожевой замок: +20% местной и +15% защиты соседних союзников.',
      audit_friendly_help: 'Выберите свой замок. Для подкрепления используйте Shift или перетаскивание. C меняет замки; Tab открывает управление.',
      audit_special_buildings: 'Замки автоматически производят войска и золото. Особые замки дают бонусы защиты, штурма или скорости.',
      rules_p3: '<b>Бой:</b> Все войска имеют одинаковую силу. Бонусы замков и командиров меняют защиту, силу штурма и скорость. Выжившие остаются в захваченном замке.',
      passive_archer: '+15% местной защиты', passive_knight: '+25% скорости марша и +20% силы штурма',
      passive_watch: '+20% местной и +15% защиты соседних союзников', weather_snow_desc: 'Снег на поле боя'
    }
  };
  for (const [lang, values] of Object.entries(copy)) Object.assign(CrownI18n.TRANSLATIONS[lang], values);
})();
