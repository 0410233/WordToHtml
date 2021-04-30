;(function(window, document, _, parseHTML, undefined) {

//
var log = console.log;

/**
 * Make a map and return a function for checking if a key
 * is in that map.
 */
function makeMap (str, caseSensitive) {
  var map = Object.create(null);
  var list = str.split(',');
  for (var i = 0; i < list.length; i++) {
    map[list[i]] = true;
  }
  if (!caseSensitive) {
    return function (val) { return _.isString(val) && map[val.toLowerCase()] }
  }
  return function (val) { return map[val] }
}

// 可融合的标签
var canBeMerged = makeMap('a,b,u,i,span');

// HTML5 tags https://html.spec.whatwg.org/multipage/indices.html#elements-3
// Phrasing Content https://html.spec.whatwg.org/multipage/dom.html#phrasing-content
var isNonPhrasingTag = makeMap(
  'address,article,aside,base,blockquote,body,caption,col,colgroup,dd' +
  ',details,dialog,div,dl,dt,fieldset,figcaption,figure,footer,form' +
  ',h1,h2,h3,h4,h5,h6,head,header,hgroup,hr,html,legend,li,menuitem,meta' +
  ',optgroup,option,p,param,rp,rt,source,style,summary,tbody,td,tfoot,th,thead' +
  ',title,tr,track'
);

// 将字符串 rgb(255,255,255) 转为数组 [255,255,255]
function rgbToArray(rgb) {
  rgb = rgb.replace(/\s+/g, '');
  var rgbArray = [0,0,0];
  var match = rgb.match(/^rgb\((\d+,\d+,\d+)\)$/i);
  if (match && match[1]) {
    rgbArray = match[1].split(',');
    for (var i = 0; i < 3; i++) {
      rgbArray[i] = (parseInt(rgbArray[i]) || 0)%256;
    }
  }
  return rgbArray;
}

// 从 rgb 值中提取色调
function hueFromRGB(r, g, b) {
  r /= 255, g /= 255, b /= 255;
  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h;

  if (max == min){
    h = 0; // achromatic
  } else {
    var c = max - min;
    switch(max) {
      case r: h = (g - b) / c + (g < b ? 6 : 0); break;
      case g: h = (b - r) / c + 2; break;
      case b: h = (r - g) / c + 4; break;
    }
    // 四舍五入
    h = Math.round(h) * 60;
    // h *= 60;
  }

  return h;
}

//字符实体转为字符
function entityToString (entity) {
  var div = document.createElement('div');
  div.innerHTML = entity;
  var res = div.innerText||div.textContent;
  return res;
}

function DocHtml(html, options) {

  html = html || '';
  this._source = html;
  // log( 'source: ' + html );

  this.init(options);

  return this;
}

var dh_proto = DocHtml.prototype;

dh_proto.do = function( fn ) {

  // log('Open: '+fn);
  // console.time('Do: '+fn);

  var args = _.toArray(arguments).slice(1);

  if (this[fn]) {
    this[fn].apply(this, args);
  }

  // console.timeEnd('Do: '+fn);
  // log('End: '+fn);

  return this;
};

// ...
dh_proto.init = function (options) {

  var defaults = {
    image: {
      img_path: '/images/',
      gallery_style: 'gallery',
      lightbox: 'on',
      'lazyload': 'on',
    },
    list: {
      list_style: 'list',
      list_type: 'ul',
    },
    table: {
      wrap_table: 'on',
      wrapper_class: 'table-wrapper',
    },
    other: {},
  };

  this.options = _.extend(defaults, options);

  // log(this.options);

  var html = this._source;

  // 如果存在 body 标签，则取 body 标签中的内容
  if (/<body\b[^>]*>([\s\S]*?)<\/body>/i.test(html)) {
    html = RegExp['$1'];
  }

  // 清除注释 和 <![if ...]><![endif]> 结构
  html = html.replace(/<!--[\s\S]*?-->|<!\[if [^\]]*?\]>[\s\S]*?<!\[endif\]>/g, '')
    // 替换任意空白字符为空格
    .replace(/(?:\s|&nbsp;)+/g, ' ')
    // 替换中文符号
    .replace(/([【】（）：“”‘’；、，。？！])/g, function($0, $1) {
      switch( $1 ) {
        case '【'  : return '[';
        case '】'  : return ']';
        case '（' : return '(';
        case '）' : return ')';
        case '：' : return ':';
        case '“'  :
        case '”'  : return '"';
        case '‘'  :
        case '’'  : return '\'';
        case '；' : return ';';
        case '、' :
        case '，' : return ',';
        case '。' : return '.';
        case '？' : return '?';
        case '！' : return '!';
        default: return $1;
      }
    });

  this.html = html;
  // log( 'html: ' + html );

  this._tokens = parseHTML(html);

  return this;
};

// 主函数
dh_proto.simplify = function() {

  // console.time('Do: simplify');

  // 初始的清理工作
  // 包括清理空标签，移除文档头信息，清除注释、无用标签，简化标签属性等
  this.do('cleanUp');
  // log(this._tokens.toArray());

  // log(this._tokens.toString());

  // 清理备注（以[]包裹的文字）
  // 清除，或转为标记
  this.do('clearMemos');

  // 清除所有的 span
  this.do('clearSpan');

  // 查找第一个 <b><i><u> content </u></i></b>
  // 或第一个 <b><i> content </i></b>
  // 转换为 <strong> content </strong>
  this.do('markStrong');

  // 转换列表元素
  this.do('convertList');

  // ...
  this.do('rebuildTable');

  // ...
  this.do('arrangeImages');

  // log(this._tokens.toArray());

  /* 收尾 */

  this.do('wrapTable');

  // 将 <p><b> ... </b></p> 结构转换为 <h2> ... </h2>
  this.do('convertPB', 'h2');

  // log(this._tokens.toString());

  // 处理行内标签头尾的标点符号
  this.do('settlePuncs');

  // 最后一次清理空标签
  this.do('clearEmptyTags', 'br');

  // 最后一次清理 br 标签;
  this.do('clearBr');

  // this.do('switchTo', 'html');
  this.html = this._tokens.toString();

  // log(this.html);
  // console.timeEnd('Do: simplify');

  return this;
};

/**
 * 清除空标签，清除默认的 <br>
 * 空白的 p 标签会被转换为 <br>
 */
dh_proto.clearEmptyTags = function (empty) {

  this._tokens.each(function (node, list) {
    switch (node.type) {
      case 'TAG_END':
        if (node.prevSolid('', empty) === node.match && !node.is('td,th,div')) {
          if (node.tagName === 'p') list.createSingle('br').insertBefore(node.match);
          list.remove(node.match, node);
        }
        break
      default: break
    }
    return true;
  });

  /**
   * 融合清理空标签后可能出现的相邻文本节点
   */
  this.mergeText();

  return this;
};

// 移除文档头信息
dh_proto.removeHead = function () {

  this._tokens.each(function(node, list) {
    if (node.tagName === 'br' && node.prevSolid('br.TAG_SINGLE')) return false;
  });

  var mark = this._tokens.current();
  if (mark.type) {
    var nodes = [];
    var content = '';
    this._tokens.each(function(node, list) {
      if (node === mark) return false;
      nodes.push(node);
      switch (node.type) {
        case 'TEXT':
          content += node.source;
          break;
        case 'TAG_END':
          if (node.tagName === 'p') content += '\n';
          break;
        default: break
      }
    });
    nodes.push(mark);

    var ishead = 0;
    if (/标题/.test(content)) ishead++;
    if (/(?:描述|简述)/.test(content)) ishead++;
    if (/关键(?:字|词)/.test(content)) ishead++;

    if (ishead>=2) {
      this.contentHead = content;
      this._tokens.safeRemove(nodes);
    }
  }

  return this;
};


/**
 * 进行初始的清理工作
 */
dh_proto.cleanUp = function() {

  // ...
  this.do('clearBr');

  // 清除空标签
  this.do('clearEmptyTags');

  // 移除文档头信息
  this.do('removeHead');

  /**
   * 清除注释和无用标签
   * - 无用标签包括 div, font, br 和标签名中含有:的自定义标签，如 <o:p></o:p>，
   * 简化标签属性（主要是 style）
   * 清除没有 href 属性的 a 标签
   */

  // 判断是否无用的标签
  var isUselessTag = makeMap('div,font');

  this._tokens.each(function (node, list) {

    // log('clear Useless Tag');
    var tagName = node.tagName;

    switch(node.type) {
      case "NOTAG_COMMENT":
      case "NOTAG_CNDT":
      case "NOTAG_DOCTYPE":
      case "NOTAG_MSIF":
      case "NOTAG":
        node.remove();
        break;

      case "TAG_SINGLE":
        // 修剪标签属性
        node.attributes = cleanAttr(node.attributes);
        break;

      case "TAG_START":
        // 清除无用标签
        // log(node.capture());
        if (isUselessTag(tagName) || tagName.indexOf(":") >= 0) {
          list.remove(node, node.match);
          break;
        }
        // 清除没有 href 属性的 a 标签
        if (node.tagName === 'a' && !node.attr('href')) {
          list.remove(node, node.match);
          break;
        }
        // 修剪标签属性
        node.attributes = cleanAttr(node.attributes);
        break;

      default: break;
    }
    return true;
  });

  function cleanAttr (attr) {
    if (_.isEmpty(attr)) return attr;
    // 修剪 style
    var style = attr.style;
    if (style) {
      // 使用属性 s-hue 保存颜色色调
      if (_.has(style, 'color')) {
        var hue = hueFromRGB.apply(null, rgbToArray(style['color']));
        if (hue) attr['s-hue'] = '' + hue;
      }
      // 当 mso-list 存在时，使用属性 s-indent 保存 margin-left 值,
      if (_.has(style, 'mso-list')) {
        attr['s-indent'] = '' + (parseFloat(style['margin-left']) || 0);
      }
    }
    return _.pick(attr, ['src','href','colspan','rowspan','s-hue','s-indent']);
  }

  this.mergeTags();

  return this;
};

// 融合相邻的、拥有相同属性的标签
// 清除空标签
// 清除空标签和融合标签是相关动作，需要联合进行
dh_proto.mergeTags = function () {
  this._tokens.each(function (node, list) {
    var tagName = node.tagName;

    switch(node.type) {
      case 'TAG_START':
        // 融合相邻的、拥有相同属性的标签
        if (canBeMerged(tagName)) {
          var prev = node.prevSibling(tagName);
          if (prev && _.isEqual(prev.attributes, node.attributes)) {
            node.mergeUp();
            break;
          }
        }
        break;

      case 'TAG_END':
        if (node.prevSolid() === node.match && !node.is('td,th')) {
          if (tagName === 'p') list.createSingle('br').insertBefore(node.match);
          list.remove(node.match, node);
          break;
        }
        break;

      default: break;
    }
    return true;
  });

  this.mergeText();
  return this;
};

// 清除类似 <tag><span>...</span></tag> 结构中的 span 标签
dh_proto.clearInnerSpan = function() {
  this._tokens.each(function(node, list) {
    if (node.type === 'TAG_START' && node.tagName === 'span' && node.wrapper()) {
      list.remove(node, node.match);
    }
    return true;
  });
};

// 清理备注信息（memo）
dh_proto.clearMemos = function() {

  // 将分散在不同标签中的备注信息聚拢起来
  var memoStart = null;
  this._tokens.each(function(node, list) {

    if (node.type === 'TAG_SINGLE' && memoStart) node.remove();
    if (node.type !== 'TEXT') return true;

    if (memoStart) {
      var pos = node.source.indexOf(']');
      if (pos<0) {
        memoStart.source += node.source;
        node.remove();
      } else {
        pos++;
        memoStart.source += node.source.substring(0, pos);
        node.source = node.source.substring(pos);
        memoStart = null;
      }
    } else if (/\[[^\]]*$/.test(node.source)) {
      memoStart = node;
    }
    return true;
  });

  // 清除备注，或转为标记
  this._tokens.each(function(node, list) {

    if (node.type !== 'TEXT') return true;

    var match;
    if (match = node.source.match(/\[([^\[\]]*)\]/)) {

      var leftContext = node.source.substring(0, match.index);
      var rightContext = node.source.substring(match.index + match[0].length);
      var memo = match[1].trim();

      var mark = list.create('['+memo+']', 'MARK');

      // 标记为锚点（id）: [#...]
      if (/^#/.test(memo)) {
        mark.subtype = 'anchor';

      // 标记为链接: [/...]
      } else if (/^\//.test(memo)) {
        mark.subtype = 'link';

      // 标记为标题: [H1-6]
      } else if (/^H[1-6]$/i.test(memo)) {
        mark.subtype = memo.toLowerCase();

      // 取消标记
      } else {
        mark = null;
      }

      if (mark) {
        node.afterInsert(mark);
        if (rightContext) {
          mark.afterInsert(list.create(rightContext));
        }
        if (leftContext) {
          node.source = leftContext;
        } else {
          node.remove();
        }
        mark.unwrap(true);
      } else {
        node.source = (leftContext + rightContext).trim();
        if (!node.source) node.remove();
      }
    }
  });

  this.mergeTags();
  this.clearInnerSpan();

  // log(this._tokens.captureArray());

  var shouldBeRemainedInTitle = makeMap('text,mark');

  this._tokens.each(function(node, list) {

    if (node.type !== 'MARK' || !(/^(?:anchor|link|H[1-6])$/i.test(node.subtype))) return true;

    var memo = node.source.replace(/^\[|\]$/g, '');
    if (/^\/?#/.test(memo)) {
      memo = memo.substring(1);
    }
    if (!memo) {
      node.remove();
      return true;
    }

    var left = node.prevSolid();
    var wrapper, parent, target = null;
    /**
     * 形如：
     * - <b> text [mark]</b>
     * - <b><span> text </span>[mark]</b>
     * - <span> text </span>[mark]
     * - <span>[mark] text </span>
     */
    if (left && (wrapper = left.topWrapper())) {
      target = wrapper;
      // log(target.capture());
    }
    /**
     * 形如：
     * - <span> text [mark] text </span>
     */
    else if (parent = node.parent()) {
      target = parent;
    }

    if (!target) {
      node.remove();
      return true;
    }

    var subtype = node.subtype.toLowerCase();
    switch (subtype) {
      case 'anchor':
        target.attr('id', memo);
        break;

      case 'link':
        var link = list.createStart('a', ['href="'+memo+'"']);
        if (target.is('p,td,th,li')) {
          target.wrapInner(link);
        } else {
          target.wrap(link);
        }
        list.remove(link.find('u'));
        break;

      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        target.tagRename(subtype);
        var toBeRemoved = target.findAll('b');
        var id;
        for (var i = 0; i < toBeRemoved.length; i++) {
          if (id = toBeRemoved[i].attr('id')) {
            target.attr('id', id);
            break;
          }
        }
        list.remove(toBeRemoved);
        break;

      default: break
    }

    node.remove();
    return true;
  });

  // 清除所有 s-hue 属性
  this._tokens.each(function(node, list){
    if (node.type === 'TAG_START' && node.attr('s-hue')) {
      node.attr('s-hue', '');
    }
  });

  return this;
};

// 清除所有 span 标签
dh_proto.clearSpan = function() {
  this._tokens.each(function(node, list) {
    if (node.tagName === 'span') {
      list.remove(node, node.match);
    }
  });
  return this;
};

// 将 <b><i> ... </i></b> 或 <b><i><u> ... </u></i></b>
// 转换为 <strong> ... </strong>
dh_proto.markStrong = function () {

  if (!this.strong) {

    this.strong = null;
    var _this = this;

    this._tokens.each(function(node, list) {
      if (node.tagName === 'strong') {
        _this.strong = node;
        return false;
      }
    });
  }
  if (this.strong) return this;

  var BIU = {b:1, i:4, u:16};
  this._tokens.each(function(node, list) {

    if (node.type !== 'TAG_END') return true;

    var inner = node, middle, outer;
    var sum = BIU[inner.tagName] || 0;

    if (sum && (middle = inner.wrapper())) {
      sum += BIU[middle.tagName] || 0;
      if (sum === 5) {
        middle.wrap('strong');
        list.remove(inner, inner.match, middle, middle.match);
        return false;
      }
      if (outer = middle.wrapper()) {
        sum += BIU[outer.tagName] || 0;
        if (sum === 21) {
          outer.wrap('strong');
          list.remove(inner, inner.match, middle, middle.match, outer, outer.match);
          return false;
        }
      }
    }
  });

  return this;
};

// 向下融合相邻的文本节点
dh_proto.mergeText = function () {
  var lastText = null;
  this._tokens.each(function(node, list) {
    if (node.type !== 'TEXT') {
      lastText = null;
      return true;
    }
    if (lastText) {
      node.source = lastText.source + node.source;
      lastText.remove();
    }
    lastText = node;
  });
  return this;
};

// 转换列表元素 ul>li
dh_proto.convertList = function () {

  var levelEqual = function (level1, level2) {
    return Math.abs(level1 - level2) < 5;
  };
  // log(this._tokens.captureArray());

  // 将所有带有 s-indent 属性的标签转为 li
  // 与 li 标签紧邻的非 li 标签会被认为是属于 li 的
  this._tokens.each(function (node, list) {

    if (node.type !== 'TAG_START') return true;

    var prev, li;
    if (node.attr('s-indent')) {
      node.tagRename('li');
    } else if ((prev = node.prevSibling('li')) && prev.attr('s-indent')) {
      console.log(prev)
      var phrasingTags = prev.findAll(function(node) {
        return isNonPhrasingTag(node.tagName);
      });
      prev.wrapInner(phrasingTags.length ? 'div' : 'p');
      node.wrap('li').mergeUp('', true);
      // li.mergeUp();
    }

    return true
  });

  var listOptions = this.options.list || {};
  var listType = listOptions.list_type || 'ul';

  // 依据 s-indent 值构建具备层级关系的列表
  this._tokens.each(function (node, list) {

    if (!node.is('li.TAG_START') || !node.attr('s-indent')) {
      return true;
    }

    var next = node.next;

    /**
     * 使用 ul 包裹 li，然后尝试向上融合
     * 如果上面存在相邻的 ul，此操作会将当前 li 送入上面的 ul 中
     */
    node.wrap(listType).mergeUp();

    /**
     * 循环查找当前 li 的正确位置
     */
    var indent = node.attr('s-indent');
    var prev;
    while (true) {
      // 没有相邻的 li 或与相邻 li 同级，则退出循环
      if (!(prev = node.prevSibling('li')) || levelEqual(indent, prev.attr('s-indent'))) break;
      // 使用“包裹->融合”方式，将当前 li 送入上一个 li 中
      node.wrap('li').mergeUp();
      // 再次使用 ul 包裹 li，并尝试向上融合
      node.wrap(listType).mergeUp();
    }

    // list.skipTo(next.prev);

    return true
  });

  // 清除所有 s-indent 属性
  this._tokens.each(function(node, list) {
    if (node.is('li.TAG_START') && node.attr('s-indent')) {
      node.attr('s-indent', '');
    }
  });

  if (listOptions.list_style === 'specification') {
    this._tokens.each(function(node, list) {
      if (node.tagName === 'ul' && node.type === 'TAG_START') {
        node.wrap('div').addClass('specification');
        return true
      }
      if (node.tagName === 'li' && node.type === 'TAG_START' && node.parent().tagName === 'ul') {

        var next = node.next;
        var text = list.create('');
        var divLeft = list.createStart('div');
        var divRight = list.createEnd('div');
        divLeft.matchWith(divRight);

        if (next.type === 'TAG_START' && next.tagName === 'b') {
          text.source = next.innerText().replace(/:\s*$/, '');
          list.remove(next.toArray());
        }

        text.insertAfter(node).wrap('div');
        divLeft.insertAfter(text.next);
        divRight.insertBefore(node.match);
      }
    });
  }

  return this;
};

// ...
dh_proto.rebuildTable = function () {

  // 清空 td 中的空白内容
  var end = _([]);
  var last = null;
  this._tokens.each(function(node, list) {
    switch (node.type) {
      case 'TAG_START':
        if (node.tagName === 'td' || node.tagName === 'th') {
          last = node.match;
          end.push(last);
        }
        break;
      case 'TAG_SINGLE':
        if (!last) break;
        if (node.tagName === 'img' || node.tagName === 'br') node.remove();
        break;
      case 'TAG_END':
        if (!last) break;
        if (last === node) {
          end.pop();
          last = end.last();
        } else if (node.prevSolid() === node.match) {
          list.remove(node.match, node);
        }
        break;
      default: break
    }
  });

  this.mergeText();

  // <td><p> ... </p></td> 结构中的 p 元素
  // 将 <td><p><b> ... </b></p></td> 转为 <th> ... </th>
  this._tokens.each(function(node, list) {
    if (node.is('td.TAG_END')) {

      var inner = node.inner('p');
      if (inner) {
        list.remove(inner, inner.match);
      }

      inner = node.inner('b');
      if (inner) {
        list.remove(inner, inner.match);
        node.tagRename('th');
        return true
      }

      var textAll = node.findAll('.TEXT');
      var isth = !!textAll.length;
      for (var i = 0; i < textAll.length; i++) {
        if(textAll[i].source.replace(/\W/g, '') && !textAll[i].topWrapper('b')) {
          isth = false;
          break;
        }
      }
      if (isth) {
        node.tagRename('th');
        list.remove(node.findAll('b'));
        var pArray = node.findAll('p');
        if (pArray.length) {
          for (var i = 1; i < pArray.length; i+=2) {
            if(pArray[i].nextSolid() !== node) {
              pArray[i].afterInsert(list.createSingle('br'));
            }
          }
          list.remove(pArray);
        }
      }
    }
  });

  // log(this._tokens.toString());

  // 重建表格
  this._tokens.each(function(node, list) {
    if (node.is('table.TAG_END')) {

      // 将表格转为矩阵（二维数组）
      var table = tableToArray(node.match);

      // 消除表格中可省略的行
      table = mergeTableRow(table, 'rowspan');

      // 消除表格中可省略的列（转置矩阵，消除行，然后再次转置）
      if (table.length) {
        table = _.unzip(table);
        table = mergeTableRow(table, 'colspan');
        table = _.unzip(table);
      } else {
        list.remove(node.toArray());
      }

      // 将矩阵中的 undedined 项替换为空的 td 标签
      var row, col;
      for (row = 0; row < table.length; row++) {
        for (col = 0; col < table[row].length; col++) {
          if (table[row][col] === undefined) {
            table[row][col] = createEmptyTd('td', list);
          }
        }
      }

      // log(table);
      // return true;

      var caption = [],
        thead = [],
        tbody = [];

      // 生成 caption
      var tableLen = table[0].length;
      if (table[0][0].colspan === tableLen && table[0][0].tagName === 'th') {
        caption = table[0][0].nodeArray.slice(1,-1);
        table.shift();
      }
      if (caption.length) {
        caption = [list.createStart('caption'), caption, list.createEnd('caption')];
        caption[0].matchWith(caption[2]);
      }

      // 生成 thead 和 tbody
      var isThead = true;
      var rowArray, current, nodes;
      for (row = 0; row < table.length; row++) {
        rowArray = [list.createStart('tr'), [], list.createEnd('tr')];
        rowArray[0].matchWith(rowArray[2]);
        for (col = 0; col < table[row].length; col++) {
          current = table[row][col];
          if(isThead && current.tagName !== 'th') {
            isThead = false;
          }

          // 跳过占位节点
          if (current === table[row][col-1] || (table[row-1] && current === table[row-1][col])) {
            continue
          }

          // 重写节点的 colspan 和 rowspan 属性
          if (current.colspan > 1) {
            current.nodeArray[0].attr('colspan', ''+current.colspan);
          } else {
            current.nodeArray[0].attr('colspan', '');
          }

          if (current.rowspan > 1) {
            current.nodeArray[0].attr('rowspan', ''+current.rowspan);
          } else {
            current.nodeArray[0].attr('rowspan', '');
          }

          rowArray[1].push(current.nodeArray);
        }
        if (!isThead) tbody.push(rowArray);
        else thead.push(rowArray);
      }

      if (thead.length) {
        thead = [list.createStart('thead'), thead, list.createEnd('thead')];
        thead[0].matchWith(thead[2]);
      }

      if (tbody.length) {
        tbody = [list.createStart('tbody'), tbody, list.createEnd('tbody')];
        tbody[0].matchWith(tbody[2]);
      }

      // 移除原有节点
      list.remove(node.findAll());

      // 插入新的节点
      list.insert(node, _.flatten([caption, thead, tbody]));
    }
  });

  // 生成一个空的 td 节点
  function createEmptyTd (tagName, list) {

    var td = Object.create(null);

    var tdStart = list.createStart(tagName);
    var tdEnd = list.createEnd(tagName);
    tdStart.match = tdEnd;
    tdEnd.match = tdStart;

    td.tagName = tagName;
    td.nodeArray = [tdStart, tdEnd];
    td.isEmpty = true;
    td.colspan = 1;
    td.rowspan = 1;

    return td;
  }

  // 将 table 转为矩阵（二维数组）
  function tableToArray (tableStart) {
    var table = new Array();
    var end = tableStart.match;
    var node = tableStart;
    var td, clone;
    var col, row = -1, i, j, locked;

    while (node.next !== end) {
      node = node.next;
      if (node.is('tr.TAG_START')) {
        row++;
      }
      if (node.is('td.TAG_START,th.TAG_START')) {
        if (row < 0) row = 0;

        if(!table[row]) table[row] = new Array();

        td = Object.create(null);
        td.tagName = node.tagName;
        td.nodeArray = node.toArray();
        td.isEmpty = (node.match && node.match === node.nextSolid());
        td.colspan = parseInt(node.attr('colspan')) || 1;
        td.rowspan = parseInt(node.attr('rowspan')) || 1;

        for (i = 0; i < table[row].length; i++) {
          if(table[row][i] === undefined) break;
        }
        col = i;
        table[row][col] = td;

        for (i = 1; i < td.colspan; i++) {
          if(table[row][col+i] === undefined) {
            table[row][col+i] = td;
          } else {
            td.colspan = i;
            break
          }
        }

        locked = false;
        for (j = 1; j < td.rowspan; j++) {
          if (!table[row+j]) table[row+j] = new Array();
          for (i = 0; i < td.colspan; i++) {
            if(table[row+j][col+i] !== undefined) {
              locked = true;
              break
            }
          }
          if (locked) {
            td.rowspan = j;
            break
          } else {
            for (i = 0; i < td.colspan; i++) {
              table[row+j][col+i] = td;
            }
          }
        }

        node = node.match;
        continue
      }
    }

    var maxLength = 0;
    for (i = 0; i < table.length; i++) {
      maxLength = Math.max(table[i].length, maxLength);
    }

    for (i = 0; i < table.length; i++) {
      table[i].length = maxLength;
    }

    return table;
  }

  // 合并行
  // 当某一行的全部节点符合以下任意一个特征
  //  1. 节点.isEmpty === true
  //  2. 节点 === undefined
  //  3. 节点相同位置的元素的 clone
  // 则认为该行是可消除的

  function mergeTableRow (table, spantype) {

    var col, row, empty, current;
    var list;
    for (row = 0; row < table.length; row++) {
      empty = isEmptyRow(table[row], table[row-1]);
      if (!empty) {
        empty = isEmptyRow(table[row], table[row+1]);
      }
      if (empty) {
        for (col = 0; col < table[row].length; col++) {
          current = table[row][col];
          if (current && current !== table[row][col+1]) {
            current[spantype] -= 1;
            // log(spantype+': '+current[spantype]);
            if (current[spantype] === 0) {
              if (!list) list = current.nodeArray[0].list;
              list.remove(current.nodeArray);
            }
          }
        }
        table[row] = undefined;
      }
    }

    table = _.compact(table);

    return table;

    function isEmptyRow (row, another) {
      if (!another) return false;
      var empty = true;
      for (var i = 0; i < row.length; i++) {
        if (row[i] && !row[i].isEmpty && row[i] !== another[i]) {
          empty = false;
          break
        }
      }
      return empty;
    }
  }
};

/**
 * 假设：
 * 1. 图片信息都在 td 标签内
 * 2. 图片标记都在 p 标签内
 */
dh_proto.convertImages = function () {

  var imageOptions = this.options.image || {};

  var marks = [
    ['img_name',  /(?:图片名称|图片名|名称|图片文件|图片文件名称|文件名称?)\s*:\s*/i],
    ['img_alt',   /alt\s*:\s*/i],
    ['img_info',  /(?:描述|简述)\s*:\s*/i],
    ['img_title', /(?:(?:图片)?标题|显示名称)\s*:\s*/i]
  ];

  var content = '';
  this._tokens.each(function(node, list) {
    if (node.type !== 'TAG_END' || node.tagName !== 'td') return true;

    var innerText = node.innerText();
    if (!/(?:图片名称|图片名|名称)\s*:/i.test(innerText)) return true;

    var fields = Object.create(null);

    for (var i = 0; i < marks.length; i++) {
      fields[marks[i][0]] = '';
      innerText = innerText.replace(marks[i][1], '{'+marks[i][0]+'}')
    }

    // log('innerText: '+innerText);

    innerText = innerText.replace(/\{(\w+)\}([^\{\}]*)(?=\{|$)/ig, function(content, key, value) {
      key = key.trim().toLowerCase();
      value = value.trim();
      if (key === 'img_info') {
        var colon = value.indexOf(':');
        if (colon > 0 && colon < value.length) {
          var imageno = value.substring(0, colon).trim();
          if (imageno) {
            value = '<b>'+imageno+'</b>'+': '+value.substring(colon+1).trim();
          } else {
            value = value.substring(colon+1).trim();
          }
        }
      }
      fields[key] = value;
      return '';
    });

    list.remove(node.findAll());

    var data = list.create('', 'DATA');
    data.subtype = 'image';
    data.fields = fields;
    data.fields['img_path'] = imageOptions['img_path'] || '/images/';
    data.fields['lightbox'] = 'lb';

    data.template = '<img src="{img_path}{img_name}" alt="{img_alt}">';

    if (imageOptions.lazyload === 'on') {
      if (imageOptions.gallery_style === 'carousel') {
        data.template = '<img class="owl-lazy" data-src="{img_path}{img_name}" alt="{img_alt}">';
      } else {
        data.template = '<img class="lazyload" data-src="{img_path}{img_name}" alt="{img_alt}">';
      }
    }

    if (imageOptions.lightbox === 'on') {
      data.template = '<a data-lightbox="{lightbox}" href="{img_path}{img_name}">' + data.template + '</a>';
    }

    // data.template = '<div class="k-img"><div class="img-wrapper">' + data.template + '</div></div>';

    if (data.fields.img_info) {
      data.template += '<p>{img_info}</p>';
    }

    data.insertBefore(node);
    // log(data.capture());
    // node.beforeInsert(data);

    data = null;
    fields = null;

    return true;
  });
};

// ...
dh_proto.arrangeImages = function () {

  // ...
  this.do('convertImages');

  var imageOptions = this.options.image || {};
  var list = this._tokens;

  // ...
  this._tokens.each(function(node, list) {
    if (!node.is('table.TAG_END')) return true;

    var table = [];
    var row;
    var tableStart = node.match;
    var end = node;
    var current = tableStart;
    var nodes, i;

    while (current.next !== end) {
      current = current.next;
      if (current.is('tr.TAG_START')) {
        row = current.children();
        for (i = 0; i < row.length; i++) {
          nodes = row[i].findAll();
          if (row[i].nextSolid() === row[i].match) {
            row[i] = undefined;
          } else if (nodes[0].is('.DATA.image')) {
            row[i] = {
              nodes: nodes,
              type: 'image',
            };
          } else {
            row[i] = {
              nodes: nodes,
              type: 'text',
            };
          }
        }
        row = _.compact(row);
        if (row.length) {
          row.tr = current;
          table.push(row);
        }
        current = current.match;
      }
    }

    var collections = [];
    var lastCollect = null;
    var rowType, j;
    for (i = 0; i < table.length; i++) {
      rowType = getRowType(table[i]);
      if (rowType === 'tablerow') break;
      if (!lastCollect || lastCollect.type !== rowType) {
        lastCollect = {
          collect: [],
          type: rowType,
        };
        collections.push(lastCollect);
      }
      lastCollect.collect.push(table[i]);
      list.remove(table[i].tr.toArray());
    }

    if (collections.length) {
      for (i = 0; i < collections.length; i++) {
        if(collections[i].type === 'gallery') {
          if (imageOptions.gallery_style === 'carousel') {
            tableStart.beforeInsert(makeCarousel(collections[i].collect));
          } else {
            tableStart.beforeInsert(makeGallery(collections[i].collect));
          }
          continue
        }
        if (collections[i].type === 'separate') {
          tableStart.beforeInsert(makeImageText(collections[i].collect));
          continue
        }
      }
    }
  });

  this.clearEmptyTags();

  return this;

  function makeGallery (collect) {
    var lb = getLightboxId();
    collect = _.flatten(collect);
    for (var i = 0; i < collect.length; i++) {
      collect[i] = collect[i].nodes;

      // 添加 lightbox 分组 id
      collect[i][0].fields.lightbox = lb;
    }
    var gridClass = 'grid grid--1';
    if (collect.length > 1) {
      gridClass += ' grid--gutter';
      if (collect.length%2 === 0) {
        gridClass += ' grid--md-2';
      } else {
        gridClass += ' grid--md-3';
      }
    }
    for (i = 0; i < collect.length; i++) {
      collect[i] = wrap(collect[i], 'div', 'cell');
    }
    collect = wrap(collect, 'div', gridClass);
    return _.flatten(collect);
  }

  function makeCarousel (collect) {
    var lb = getLightboxId();
    collect = _.flatten(collect);
    for (var i = 0; i < collect.length; i++) {
      collect[i] = collect[i].nodes;

      // 添加 lightbox 分组 id
      collect[i][0].fields.lightbox = lb;
    }
    if (collect.length > 1) {
      for (i = 0; i < collect.length; i++) {
        collect[i] = wrap(collect[i], 'div', 'carousel-item');
      }
      collect = wrap(collect, 'div', 'owl-carousel');
    }
    return _.flatten(collect);
  }

  function makeImageText (collect) {
    var lb = getLightboxId();
    for (var i = 0; i < collect.length; i++) {
      if (collect[i][0].type === 'image') {
        collect[i] = [collect[i][0].nodes, collect[i][1].nodes];
      } else {
        collect[i] = [collect[i][1].nodes, collect[i][0].nodes];
      }

      // 添加 lightbox 分组 id
      collect[i][0][0].fields.lightbox = lb;
    }
    if (collect.length > 1) {
      for (i = 0; i < collect.length; i++) {
        collect[i][0] = wrap(collect[i][0], 'div', 'sep-img');
        collect[i][1] = wrap(collect[i][1], 'div', 'sep-txt');
        collect[i] = wrap(collect[i], 'div', 'layout-separate');
      }
      collect = wrap(collect, 'div');
    }

    return _.flatten(collect);
  }

  function wrap(nodes, tagName, className) {
    var tag = [list.createStart(tagName), nodes, list.createEnd(tagName)];
    tag[0].matchWith(tag[2]);
    if (tagName) tag[0].addClass(className);
    return tag;
  }

  function getLightboxId() {
    return (Math.random()+'0000.0000').replace(/^\d*\.(\d{4}).*$/, 'lb_$1');
  }

  function getRowType(row) {
    var images = 0, texts = 0;
    for (var i = 0; i < row.length; i++) {
      switch (row[i].type) {
        case 'image':
          images++;
          break;
        case 'text':
          texts++;
          break;
        default: break
      }
    }

    if (images === 1 && texts === 1) return 'separate';
    if (images > 0 && texts === 0) return 'gallery';
    return 'tablerow';
  }
};

// ...
dh_proto.wrapTable = function () {
  if (this.options && this.options.table && this.options.table.wrap_table === 'on') {
    var clsName = this.options.table.wrapper_class || 'table-wrapper';
    this._tokens.each(function(node, list){
      if (node.tagName === 'table' && node.type === 'TAG_END') {
        node.addClass('k-table');
        node.wrap('div').addClass(clsName);
      }
    });
  }
};

// 移动行内标签头尾的标点符号和空格到合适的位置
dh_proto.settlePuncs = function () {

  // log(this._tokens.toString());

  var isInline = makeMap('a,b,u,i,span,sub,sup,strong');
  this._tokens.each(function(node, list) {

    if (node.type !== 'TEXT') return true;
    node.source = node.source.replace(/\s+/g, ' ');

    var match;
    var sibling = node.prev;
    if (sibling.type === 'TAG_START') {
      if (isInline(sibling.tagName) && (match = node.source.match(/^[\s,\.?;:!]+/))) {
        node.source = node.source.substring(match[0].length);
        sibling = node.prev;
        while(true) {
          if (!sibling.type) break;
          if (sibling.type === 'TAG_START') {
            if (isInline(sibling.tagName)) {
              sibling = sibling.prev;
              continue
            } else {
              break
            }
          }
          if (sibling.type === 'TAG_END') {
            if (isInline(sibling.tagName)) {
              sibling.afterInsert(list.create(match[0]));
            }
            break
          }
          if (sibling.type === 'TEXT') {
            sibling.source = (sibling.source + match[0]).replace(/\s+/, ' ');
            break
          }
        }
      } else if (!isInline(node.tagName) && (match = node.source.match(/^\s+/))) {
        node.source = node.source.substring(match[0].length);
      }
    }

    sibling = node.next;
    if (sibling.type === 'TAG_END') {
      if (isInline(sibling.tagName) && (match = node.source.match(/[\s,\.?;:!]+$/))) {
        node.source = node.source.substring(0, match.index);
        sibling = node.next;
        while(true) {
          if (!sibling.type) break;
          if (sibling.type === 'TAG_END') {
            if (isInline(sibling.tagName)) {
              sibling = sibling.next;
              continue
            } else {
              break
            }
          }
          if (sibling.type === 'TAG_START') {
            if (isInline(sibling.tagName)) {
              sibling.beforeInsert(list.create(match[0]));
            }
            break
          }
          if (sibling.type === 'TEXT') {
            sibling.source = match[0] + sibling.source;
            break
          }
        }
      } else if (!isInline(node.tagName) && /\s+$/.test(node.source)) {
        node.source = node.source.replace(/\s+$/, '');
      }
    }
  });

  this.clearEmptyTags('br');

  return this
};

// ...
dh_proto.convertPB = function (tagName) {
  tagName = tagName || 'h2';
  this._tokens.each(function(node, list) {
    if (node.tagName === 'p' && node.type === 'TAG_END') {
      var parent = node.parent();
      var inner = node.inner();
      if (!parent && inner && inner.tagName === 'b') {
        node.tagRename(tagName);
        list.remove(inner, inner.match);
      }
    }
  });
};

// ...
dh_proto.clearBr = function () {
  this._tokens.each(function(node, list) {
    if (node.tagName === 'br' && node.type === 'TAG_SINGLE') {
      var parent = node.parent();
      if (parent && (parent.tagName === 'td' || parent.tagName === 'th')) return true;
      list.remove(node);
    }
  });
  return this;
};

window.DocHtml = DocHtml;

})( window, document, _, parseHTML );
