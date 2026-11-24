/**
 * Настройки заводов для карточки: плашка, «Сделано в России», замок, влагостойкость, 4-й значок.
 * Толщина, класс и фаска здесь НЕ задаются — они берутся из таблицы «Каталог» по каждому товару.
 *
 * Пустое поле = значка на карточке нет. Ничего не выдумываем: заполняем только то, что
 * подтверждено на сайте завода или на готовых карточках владельца.
 * Поменять можно прямо на странице (блок «Настройки заводов»), а потом прислать JSON, чтобы
 * зашить сюда для всех.
 *
 * title: шаблон заголовка. {art} — артикул, {decor} — декор, {th} — толщина, {coll} — коллекция.
 */
window.BRANDS = {
  'Эггер Гагарин': {
    logo: 'logo-egger.png', name: 'ЭГГЕР', madeInRussia: true,
    title: '{art} {decor}',
    extraTop: 'Класс Эко', extraBottom: 'Безопасности', extraValue: 'E1', extraGreen: true,
    water: 'Влагостойкий', lock: 'CLIC it',
    bevelYes: 'С фаской', bevelNo: 'Без Фаски',
  },
  'Ultrablack': {
    logo: '', name: 'ULTRABLACK', madeInRussia: true,
    title: 'Ultrablack {th}мм {decor}',
    extraTop: 'Технология', extraBottom: 'O.R.C.A.', extraValue: 'O.R. C.A.', extraGreen: false,
    water: 'Водостойкий', lock: 'TwinClick',
    bevelYes: 'Фаска V4|с 4-х сторон', bevelNo: 'Без Фаски',
  },
  // Сайт ultradecor.com: «Integrated Aqua Stop System». Замок на сайте не назван.
  'Ultrafloor': { name: 'ULTRAFLOOR', madeInRussia: false, title: '{art} {decor}', water: 'Aqua Stop', lock: '' },
  // swisskrono.ru: толщина/класс/фаска V4 по коллекциям есть, замок и влагостойкость не названы.
  'Свисс Кроно': { name: 'SWISS KRONO', madeInRussia: true, title: '{art} {decor}', water: '', lock: '', bevelYes: 'Фаска V4|с 4-х сторон' },
  'Кроношпан Егорьевск': { name: 'KRONOSPAN', madeInRussia: true, title: '{art} {decor}', water: '', lock: '' },
  'Кроношпан Сморгонь': { name: 'KRONOSPAN', madeInRussia: false, title: '{art} {decor}', water: '', lock: '' },
  'AGT': { name: 'AGT', madeInRussia: false, title: '{art} {decor}', water: '', lock: '' },
  'Кронотекс': { name: 'KRONOTEX', madeInRussia: false, title: '{art} {decor}', water: '', lock: '' },
  'Кронопол': { name: 'KRONOPOL', madeInRussia: false, title: '{art} {decor}', water: '', lock: '' },
  // jossbeaumont.ru: замок JCLICK, фаска 4V, эко-класс E0, пожаробезопасность KM2 (см. SOURCES.md).
  'Бамонт': {
    name: 'JOSS BEAUMONT', madeInRussia: false, title: '{coll} {decor}',
    extraTop: 'Класс Эко', extraBottom: 'Безопасности', extraValue: 'E0', extraGreen: true,
    water: '', lock: 'JCLICK', bevelYes: 'Фаска 4V|с 4-х сторон',
  },
  'Melodia': { name: 'MELODIA', madeInRussia: false, title: '{art} {decor}', water: '', lock: '' },
  'Caravan': { name: 'CARAVAN', madeInRussia: false, title: '{art} {decor}', water: '', lock: '' },
};
