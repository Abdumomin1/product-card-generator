/**
 * Карточка товара 1080×1080 по шаблону Maff: фото декора, плашка бренда, «Сделано в России»,
 * нижняя панель с названием и значками характеристик.
 *
 * Весь текст рисуется из данных товара и настроек бренда и всегда вписывается в отведённое место:
 * если строка не помещается — уменьшается шрифт, а не вылезает за рамку.
 * Из картинок берутся только логотип и три значка без текста (вода, фаска, замок).
 */
(function (root) {
  'use strict';

  var W = 1080, H = 1080;
  var CREAM = '#F5F6EC', GOLD = '#F7D058', NAVY = '#112C47', TITLE = '#354D67', GREEN = '#0B7A0B';
  var DIR = root.CARD_DIR || './card/';

  /** Настройки брендов по умолчанию — только то, что есть на готовых карточках владельца. */
  var DEFAULT_BRANDS = {
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
  };

  var AC_BY_CLASS = { 31: 'AC3', 32: 'AC4', 33: 'AC5', 34: 'AC6' };

  // ───────── загрузка шрифтов и картинок ─────────
  var images = {}, ready = null;
  function loadImage(src) {
    return new Promise(function (res) {
      var im = new Image();
      im.onload = function () { res(im); };
      im.onerror = function () { res(null); };
      im.src = src;
    });
  }
  function asset(name) {
    if (!name) return Promise.resolve(null);
    if (images[name] !== undefined) return Promise.resolve(images[name]);
    return loadImage(DIR + name).then(function (im) { images[name] = im; return im; });
  }
  function init() {
    if (ready) return ready;
    var fonts = [
      ['lato-black-italic.woff2', { weight: '900', style: 'italic' }],
      ['lato-bold-italic.woff2', { weight: '700', style: 'italic' }],
      ['lato-bold.woff2', { weight: '700', style: 'normal' }],
      ['lato-normal.woff2', { weight: '400', style: 'normal' }],
    ].map(function (f) {
      var face = new FontFace('MaffLato', 'url(' + DIR + f[0] + ')', f[1]);
      return face.load().then(function (x) { document.fonts.add(x); }, function () {});
    });
    var pics = ['icon-water.png', 'icon-bevel.png', 'icon-nobevel.png', 'icon-lock.png', 'made-in-russia.png'].map(asset);
    ready = Promise.all(fonts.concat(pics));
    return ready;
  }

  // ───────── текст, который не выходит за рамку ─────────
  function font(style, weight, size) { return style + ' ' + weight + ' ' + size + 'px MaffLato, Arial, sans-serif'; }

  /** Рисует строку по центру (cx, cy); шрифт уменьшается, пока строка не поместится в maxW. */
  function fitText(g, text, cx, cy, maxW, style, weight, size, minSize, color) {
    text = String(text == null ? '' : text).trim();
    if (!text) return size;
    var s = size;
    g.font = font(style, weight, s);
    while (s > minSize && g.measureText(text).width > maxW) { s -= 0.5; g.font = font(style, weight, s); }
    g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, cx, cy, maxW);          // maxW — последняя страховка: браузер сожмёт строку, но не выпустит
    return s;
  }

  /** Одна или две строки («Первая|Вторая») одним размером шрифта. */
  function fitLines(g, lines, cx, cy, maxW, size, lineH) {
    lines = lines.filter(Boolean);
    if (!lines.length) return;
    var s = size;
    lines.forEach(function (t) {
      g.font = font('italic', '700', s);
      while (s > 12 && g.measureText(t).width > maxW) { s -= 0.5; g.font = font('italic', '700', s); }
    });
    var y0 = cy - (lines.length - 1) * lineH / 2;
    lines.forEach(function (t, i) { fitText(g, t, cx, y0 + i * lineH, maxW, 'italic', '700', s, 12, NAVY); });
  }

  // ───────── фигуры шаблона ─────────
  function roundRect(g, x, y, w, h, tl, tr, br, bl) {
    g.beginPath();
    g.moveTo(x + tl, y);
    g.lineTo(x + w - tr, y); g.arcTo(x + w, y, x + w, y + tr, tr);
    g.lineTo(x + w, y + h - br); g.arcTo(x + w, y + h, x + w - br, y + h, br);
    g.lineTo(x + bl, y + h); g.arcTo(x, y + h, x, y + h - bl, bl);
    g.lineTo(x, y + tl); g.arcTo(x, y, x + tl, y, tl);
    g.closePath();
  }
  /** Рамка-«капля»: круг со слегка срезанным правым верхним углом, как в шаблоне. */
  function dropFrame(g, cx, cy) {
    var w = 94, h = 92, x = cx - w / 2, y = cy - h / 2;
    roundRect(g, x, y, w, h, 46, 17, 46, 46);
    g.lineWidth = 6; g.strokeStyle = NAVY; g.stroke();
  }
  function drawCover(g, img, x, y, w, h) {
    var k = Math.max(w / img.width, h / img.height);
    var sw = w / k, sh = h / k;
    g.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
  }

  // ───────── данные карточки ─────────
  function titleOf(tpl, p) {
    var th = p.specs && p.specs.th, cl = p.specs && p.specs.cl;
    return String(tpl || '{art} {decor}')
      .replace(/\{art\}/g, p.art || '').replace(/\{decor\}/g, p.decor || '')
      .replace(/\{th\}/g, th || '').replace(/\{cl\}/g, cl || '').replace(/\{coll\}/g, p.coll || '')
      .replace(/\s+/g, ' ').trim();
  }

  /**
   * Что нарисовать для товара. Возвращает { data } или { error } — чего не хватает.
   * brand — настройки бренда (из DEFAULT_BRANDS или сохранённые в админке).
   */
  function cardData(p, brand) {
    // Чего нет в данных — того значка просто нет на карточке. Ничего не придумываем.
    brand = brand || { name: p.factory || '' };
    var s = p.specs || {};
    var miss = [];
    if (!s.th) miss.push('толщина');
    if (!s.cl) miss.push('класс');
    if (s.ch !== true && s.ch !== false) miss.push('фаска');
    if (!brand.lock) miss.push('замок');
    if (!brand.water) miss.push('влагостойкость');
    return { miss: miss, data: {
      title: titleOf(brand.title, p),
      th: s.th ? String(s.th) : '', cl: s.cl ? String(s.cl) : '',
      ac: s.ac || AC_BY_CLASS[s.cl] || '',
      bevel: s.ch === true ? true : s.ch === false ? false : null,
      brand: brand,
    } };
  }

  // ───────── значки нижней панели ─────────
  function iconsFor(d) {
    var b = d.brand, list = [];
    if (d.th) list.push({ kind: 'th', below: ['Толщина', d.th + 'мм'] });
    if (d.cl) list.push({ kind: 'cl', above: ['Класс Нагрузки', d.cl + ' Класс'] });
    if (d.ac) list.push({ kind: 'ac', below: ['Износостойкость', d.ac + ' Класс'] });
    if (b.extraValue) list.push({ kind: 'extra', above: [b.extraTop, b.extraBottom] });
    if (b.water) list.push({ kind: 'water', below: [b.water] });
    if (d.bevel !== null) list.push({ kind: 'bevel', above: String(d.bevel ? b.bevelYes || 'С фаской' : b.bevelNo || 'Без Фаски').split('|') });
    if (b.lock) list.push({ kind: 'lock', below: [b.lock] });
    // подписи чередуются: над значком / под значком — как в шаблоне
    list.forEach(function (it, i) {
      var txt = it.above || it.below;
      it.high = i % 2 === 0; it.label = txt;
    });
    return list;
  }

  function drawIcon(g, it, cx, d, maxLabel) {
    var cy = it.high ? 978 : 1023;
    var b = d.brand;
    if (it.kind === 'water' || it.kind === 'bevel' || it.kind === 'lock') {
      var name = it.kind === 'water' ? 'icon-water.png' : it.kind === 'lock' ? 'icon-lock.png' : d.bevel ? 'icon-bevel.png' : 'icon-nobevel.png';
      var im = images[name];
      if (im) g.drawImage(im, cx - 50, cy - 49, 100, 98); else dropFrame(g, cx, cy);
    } else {
      dropFrame(g, cx, cy);
      if (it.kind === 'th') {
        fitText(g, d.th + ' мм', cx, cy - 14, 76, 'italic', '900', 25, 13, NAVY);
        g.strokeStyle = NAVY; g.lineWidth = 4; g.lineCap = 'round'; g.lineJoin = 'round';
        var ay = cy + 15, ax0 = cx - 25, ax1 = cx + 25;
        g.beginPath(); g.moveTo(ax0, ay); g.lineTo(ax1, ay);
        g.moveTo(ax0 + 9, ay - 9); g.lineTo(ax0, ay); g.lineTo(ax0 + 9, ay + 9);
        g.moveTo(ax1 - 9, ay - 9); g.lineTo(ax1, ay); g.lineTo(ax1 - 9, ay + 9);
        g.stroke();
      } else if (it.kind === 'cl') {
        fitText(g, d.cl, cx, cy - 12, 70, 'normal', '700', 36, 18, NAVY);
        fitText(g, 'КЛАСС', cx, cy + 17, 66, 'normal', '400', 17, 10, NAVY);
      } else if (it.kind === 'ac') {
        fitText(g, d.ac, cx, cy + 1, 80, 'normal', '700', 39, 16, NAVY);
      } else if (it.kind === 'extra') {
        var parts = String(b.extraValue).split(/\s+/).filter(Boolean);
        var color = b.extraGreen ? GREEN : NAVY;
        if (parts.length > 1) {
          fitText(g, parts[0], cx, cy - 13, 74, 'normal', '700', 25, 12, color);
          fitText(g, parts.slice(1).join(' '), cx, cy + 14, 74, 'normal', '700', 25, 12, color);
        } else {
          fitText(g, parts[0] || '', cx, cy + 2, 80, 'normal', '700', 54, 16, color);
        }
      }
    }
    // подпись: над значком (для нижнего ряда) или под значком (для верхнего)
    var two = it.label.filter(Boolean).length > 1;
    if (it.high) fitLines(g, it.label, cx, two ? 1050 : 1049, maxLabel, 20, 21);
    else fitLines(g, it.label, cx, two ? 948 : 952, maxLabel, 20, 21);
  }

  // ───────── сборка ─────────
  /**
   * Рисует карточку на canvas. photo — Image/Canvas/Bitmap с чистым фото декора.
   * Перед первым вызовом дождитесь CardGen.init().
   */
  function render(canvas, photo, d) {
    canvas.width = W; canvas.height = H;
    var g = canvas.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.fillStyle = '#ddd'; g.fillRect(0, 0, W, H);
    if (photo) drawCover(g, photo, 0, 0, W, H);

    var b = d.brand;

    // плашка бренда — слева сверху
    var logo = b.logoImg || (b.logo ? images[b.logo] : null);
    g.font = font('normal', '900', 44);
    var nameW = logo ? Math.min(logo.width, 420) : Math.min(520, g.measureText(b.name || '').width);
    var pw = Math.max(200, nameW + 66), ph = 100;
    roundRect(g, 4 - 40, -40, pw + 40, ph + 40, 0, 0, 54, 54);
    g.fillStyle = CREAM; g.fill(); g.lineWidth = 6; g.strokeStyle = GOLD; g.stroke();
    if (logo) {
      // свой логотип может быть любого размера — вписываем в плашку
      var lk = Math.min(1, (pw - 50) / logo.width, (ph - 24) / logo.height);
      var lw = logo.width * lk, lh = logo.height * lk;
      g.drawImage(logo, 4 + (pw - lw) / 2, (ph - lh) / 2, lw, lh);
    }
    else fitText(g, b.name || '', 4 + pw / 2, ph / 2 + 2, pw - 50, 'normal', '900', 44, 20, '#1b1b1b');

    // «Сделано в России» — справа над панелью
    if (b.madeInRussia && images['made-in-russia.png']) g.drawImage(images['made-in-russia.png'], 812, 690);

    // нижняя панель
    roundRect(g, 3, 862, W - 6, H, 74, 74, 0, 0);
    g.fillStyle = CREAM; g.fill(); g.lineWidth = 7; g.strokeStyle = GOLD; g.stroke();

    fitText(g, d.title, W / 2, 892, 900, 'italic', '900', 39, 22, TITLE);

    var icons = iconsFor(d), n = icons.length;
    var x0 = 118, x1 = 987, step = n > 1 ? (x1 - x0) / (n - 1) : 0;
    // подпись может занять место до соседнего значка, но не дальше края карточки
    var maxLabel = Math.min(170, n > 1 ? step * 2 - 112 : 400);
    icons.forEach(function (it, i) {
      var cx = n > 1 ? x0 + step * i : W / 2;
      var room = Math.min(maxLabel, 2 * Math.min(cx - 14, W - 14 - cx));
      drawIcon(g, it, cx, d, room);
    });
    return canvas;
  }

  /** Уменьшенная копия canvas (для сетки каталога). */
  function scaled(src, size) {
    var c = document.createElement('canvas');
    c.width = size; c.height = Math.round(size * src.height / src.width);
    var g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
    // уменьшаем ступенями — так мелкий текст остаётся читаемым
    var cur = src;
    while (cur.width / 2 > c.width) {
      var t = document.createElement('canvas');
      t.width = Math.round(cur.width / 2); t.height = Math.round(cur.height / 2);
      var tg = t.getContext('2d'); tg.imageSmoothingQuality = 'high';
      tg.drawImage(cur, 0, 0, t.width, t.height);
      cur = t;
    }
    g.drawImage(cur, 0, 0, c.width, c.height);
    return c;
  }

  /** WebP, а где браузер не умеет его делать (старый Safari) — JPEG. */
  function encode(canvas, quality) {
    var url = canvas.toDataURL('image/webp', quality);
    if (url.indexOf('data:image/webp') !== 0) url = canvas.toDataURL('image/jpeg', quality);
    return url;
  }

  root.CardGen = {
    W: W, H: H, DEFAULT_BRANDS: DEFAULT_BRANDS, AC_BY_CLASS: AC_BY_CLASS,
    init: init, asset: asset, cardData: cardData, titleOf: titleOf, iconsFor: iconsFor,
    render: render, scaled: scaled, encode: encode, drawCover: drawCover,
  };
})(window);
