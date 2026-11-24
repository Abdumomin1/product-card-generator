/**
 * Распознавание товара по имени файла фото.
 *
 * Данные — лист «Ламинат» (и «Паркет», «SPC») таблицы «Каталог»: завод, коллекция, артикул,
 * номенклатура, толщина, класс, фаска. Из имени файла достаём артикул и ищем строки с ним.
 * Один артикул бывает у нескольких строк (разная толщина, коллекция) — карточка нужна каждой.
 * Если артикул совпал у разных заводов, решает подсказка в имени файла или шаблон артикула
 * (у Эггера EPL/EHL/EL/EC/EBL + цифры, у AGT — PRK + цифры), иначе выбирает человек.
 */
(function (root) {
  'use strict';

  // ───────── CSV ─────────
  function parseCSV(text) {
    var rows = [], row = [], cell = '', q = false;
    text = String(text || '').replace(/^﻿/, '');
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else if (ch !== '\r') cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  // ───────── нормализация ─────────
  // Кириллица, похожая на латиницу: в 1С «К405» и «K405» встречаются вперемешку.
  var LOOK = { 'А': 'A', 'В': 'B', 'С': 'C', 'Е': 'E', 'Н': 'H', 'К': 'K', 'М': 'M', 'О': 'O', 'Р': 'P', 'Т': 'T', 'Х': 'X', 'У': 'Y' };
  function up(s) {
    return String(s || '').toUpperCase().replace(/[АВСЕНКМОРТХУ]/g, function (c) { return LOOK[c]; });
  }
  function tokens(s) {
    return up(s).split(/[^0-9A-ZА-ЯЁ]+/).filter(Boolean);
  }
  function norm(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

  var COLS = {
    factory: ['завод'], spec: ['толщина и класс'], coll: ['коллекция'], art: ['артикул'],
    nom: ['номенклатура'], decor: ['модель', 'декор'], th: ['толщина'], cl: ['класс'], ch: ['фаска'],
  };

  function num(v) { var m = String(v || '').replace(',', '.').match(/\d+(\.\d+)?/); return m ? Number(m[0]) : 0; }

  /** «12/33 фаска» → {th:12, cl:33, ch:true}; правдоподобие проверяем. */
  function specsFromLine(p) {
    var out = {}, m = String(p || '').match(/(\d+)\s*\/\s*(\d+)/);
    if (m) {
      var th = +m[1], cl = +m[2];
      if (th >= 4 && th <= 20) out.th = th;
      if (cl >= 21 && cl <= 34) out.cl = cl;
    } else {
      var t = String(p || '').match(/(\d+)\s*мм/i);
      if (t && +t[1] >= 4 && +t[1] <= 20) out.th = +t[1];
    }
    if (/без\s*фаск/i.test(p)) out.ch = false;
    else if (/фаск/i.test(p)) out.ch = true;
    return out;
  }

  /** Название декора из номенклатуры: всё, что после артикула, без размеров и «Aqua Lock». */
  function decorFrom(nom, art) {
    var s = String(nom);
    var a = String(art || '').split(/\s+/)[0];
    if (a && a !== '—') {
      var i = up(s).indexOf(up(a));
      if (i >= 0) s = s.slice(i + a.length);
    }
    s = s.replace(/\((Left|Right)\)/ig, '')
         .replace(/\s*(aqua\s*)?lock\s*$/i, '')
         .replace(/\d+[.,]?\d*\s*[*xх×]\s*\d+[.,]?\d*(\s*[*xх×]\s*\d+\s*(мм|mm)?)?/gi, '')
         .replace(/\s+/g, ' ').trim();
    return s || String(nom);
  }

  function stripColl(decor, coll) {
    if (!coll) return decor;
    var esc = coll.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var s = decor.replace(new RegExp('(^|\\s)' + esc + '(?=\\s|$)', 'ig'), ' ').replace(/\s+/g, ' ').trim();
    return s || decor;
  }

  /** Строки листа → товары. rows — массив массивов, первая строка — заголовки. */
  function productsFromRows(rows, sheet) {
    if (!rows.length) return [];
    var head = rows[0].map(function (h) { return norm(h).toLowerCase(); });
    var idx = {};
    Object.keys(COLS).forEach(function (k) {
      idx[k] = -1;
      COLS[k].some(function (name) { var i = head.indexOf(name); if (i >= 0) { idx[k] = i; return true; } });
    });
    function cell(r, k) { return idx[k] >= 0 ? norm(r[idx[k]]) : ''; }
    var inherit = {}, out = [];
    rows.slice(1).forEach(function (r) {
      var nom = cell(r, 'nom'); if (!nom) return;
      var coll = cell(r, 'coll'), spec = cell(r, 'spec');
      var sp = specsFromLine(spec);
      var th = num(cell(r, 'th')), cl = num(cell(r, 'cl')), ch = cell(r, 'ch');
      if (th) sp.th = th;
      if (cl) sp.cl = cl;
      if (/^[+да]|^(yes|true|1)$/i.test(ch)) sp.ch = true;
      else if (/^[-—нет]|^(no|false|0)$/i.test(ch)) sp.ch = false;
      // в коллекции характеристики одинаковы — хватает одной заполненной строки
      var key = (cell(r, 'factory') + '|' + coll + '|' + spec).toLowerCase();
      var inh = inherit[key] || (inherit[key] = {});
      ['th', 'cl', 'ch'].forEach(function (f) {
        if (sp[f] === undefined && inh[f] !== undefined) sp[f] = inh[f];
        if (sp[f] !== undefined && inh[f] === undefined) inh[f] = sp[f];
      });
      var art = cell(r, 'art');
      var artMain = art === '—' ? '' : art.split(/\s+/)[0];
      out.push({
        sheet: sheet || '', factory: cell(r, 'factory'), coll: coll, spec: spec,
        art: artMain, artFull: art === '—' ? '' : art, nom: nom,
        decor: cell(r, 'decor') || stripColl(decorFrom(nom, art), coll),
        specs: sp,
        key: up(artMain).replace(/[^0-9A-Z]/g, ''),
        side: (art.match(/\s(L|R)$/i) || nom.match(/\((Left|Right)\)/i) || [])[1],
      });
    });
    return out;
  }

  // ───────── заводы по виду артикула и по словам в имени файла ─────────
  var BRAND_HINTS = [
    { factory: 'Эггер Гагарин', words: ['EGGER', 'ЭГГЕР', 'ЕГГЕР'], art: /^E(PL|HL|BL|C|L)\d{3,4}/ },
    { factory: 'AGT', words: ['AGT'], art: /^PRK\d{3,4}/ },
    { factory: 'Свисс Кроно', words: ['SWISS', 'KRONO SWISS', 'СВИСС', 'SWISSKRONO'] },
    { factory: 'Ultrafloor', words: ['ULTRAFLOOR', 'УЛЬТРАФЛОР'] },
    { factory: 'Ultrablack', words: ['ULTRABLACK'] },
    { factory: 'Кроношпан Егорьевск', words: ['ЕГОРЬЕВСК', 'EGORYEVSK'] },
    { factory: 'Кроношпан Сморгонь', words: ['СМОРГОНЬ', 'SMORGON'] },
    { factory: 'Кронотекс', words: ['KRONOTEX', 'КРОНОТЕКС'] },
    { factory: 'Кронопол', words: ['KRONOPOL', 'КРОНОПОЛ'] },
    { factory: 'Бамонт', words: ['BAMONT', 'БАМОНТ', 'JOSS', 'BEAUMONT', 'ЖОСС'] },
    { factory: 'Melodia', words: ['MELODIA'] },
  ];

  function hintedFactories(name) {
    var u = up(name), toks = tokens(name), found = [];
    BRAND_HINTS.forEach(function (b) {
      var byWord = b.words.some(function (w) { return u.indexOf(up(w)) >= 0; });
      var byArt = b.art && toks.some(function (t) { return b.art.test(t); });
      if (byWord || byArt) found.push(b.factory);
    });
    return found;
  }

  /**
   * Ищет товары для файла. Возвращает { list:[{p, on}], note }.
   * on — выбрана ли карточка сразу; если артикул есть у нескольких заводов и подсказки нет,
   * ничего не выбирается — человек решает сам.
   */
  function match(fileName, products) {
    var base = String(fileName).replace(/\.[a-z0-9]+$/i, '');
    var toks = tokens(base);
    var set = {};
    toks.forEach(function (t) { set[t] = 1; });
    // артикулы вида «EPL240» иногда пишут «EPL 240»: склеиваем соседние токены
    for (var i = 0; i + 1 < toks.length; i++) set[toks[i] + toks[i + 1]] = 1;

    var found = products.filter(function (p) { return p.key && p.key.length >= 3 && set[p.key]; });
    if (!found.length) {
      // длинные артикулы с хвостом: «EC1027F2CL», в файле «EC1027»
      found = products.filter(function (p) {
        return p.key && p.key.length >= 5 && toks.some(function (t) { return t.length >= 5 && p.key.indexOf(t) === 0; });
      });
    }
    var byName = false;
    if (!found.length) {
      // артикула в имени нет — ищем по названию декора («Дуб Лембрук.jpg»)
      var low = ' ' + base.toLowerCase().replace(/ё/g, 'е').replace(/[^0-9a-zа-я]+/g, ' ') + ' ';
      found = products.filter(function (p) {
        var d = String(p.decor).toLowerCase().replace(/ё/g, 'е').replace(/[^0-9a-zа-я]+/g, ' ').trim();
        return d.split(' ').length >= 2 && low.indexOf(' ' + d + ' ') >= 0;
      });
      byName = found.length > 0;
    }
    if (!found.length) return { list: [], note: 'артикул не найден в таблице' };

    var hints = hintedFactories(base);
    if (hints.length) {
      var narrowed = found.filter(function (p) { return hints.indexOf(p.factory) >= 0; });
      if (narrowed.length) found = narrowed;
    }
    // левая/правая доска: «EPL240 L» — если в имени есть L/R или Left/Right, берём только её
    var side = set.L || set.LEFT ? 'L' : set.R || set.RIGHT ? 'R' : '';
    if (side && found.some(function (p) { return p.side; })) {
      var s2 = found.filter(function (p) { return !p.side || p.side[0].toUpperCase() === side; });
      if (s2.length) found = s2;
    }

    var factories = {};
    found.forEach(function (p) { factories[p.factory] = 1; });
    var many = Object.keys(factories).length > 1;
    // по одному названию без артикула уверенности меньше: сразу выбираем, только если вариант один
    var sure = byName ? found.length === 1 : !many;
    return {
      list: found.map(function (p) { return { p: p, on: sure }; }),
      note: many ? 'артикул есть у нескольких заводов — отметьте нужный'
          : byName && !sure ? 'нашёл по названию несколько товаров — отметьте нужные'
          : byName ? 'нашёл по названию декора, без артикула' : '',
    };
  }

  /** Имя файла для бота: номенклатура без знаков, запрещённых в именах файлов. */
  function fileNameFor(p, ext) {
    return p.nom.replace(/[\\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() + '.' + (ext || 'jpg');
  }

  var api = {
    parseCSV: parseCSV, productsFromRows: productsFromRows, match: match, fileNameFor: fileNameFor,
    specsFromLine: specsFromLine, decorFrom: decorFrom, hintedFactories: hintedFactories, up: up,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Match = api;
})(typeof window !== 'undefined' ? window : this);
