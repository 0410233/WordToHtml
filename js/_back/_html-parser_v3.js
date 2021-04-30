/**
 * 简化版 html-parser
 * 假定： 
 *  1.没有未封闭的标签
 *  2.没有省略的或丢失的结束标签
 **  3.没有不合理的嵌套（偶尔存在不合理的嵌套）
 *  4.标签名不含特殊字符
 */

;(function (window, _, undefined) {

'use strict';

// 连结两个节点
function connectNodes () {

  var nodes = _.compact(_.toArray(arguments));
  var count = nodes.length;
  if (count < 2) return;

  for (var i = 1; i < count; i++) {
    nodes[i-1].next = nodes[i];
    nodes[i].prev = nodes[i-1];
  }
}

// 从链表中移除节点
function removeNode (node) {
  connectNodes(node.prev, node.next);
  node.next = null;
  node.prev = null;
  node.list = null;
  return node;
};


// 节点对象
var ListNode = (function ListNode(element) {

  if (element === undefined) {
    element = null;
  } else {
    if (element instanceof ListNode) return element;
    if (!(this instanceof ListNode)) return new ListNode(element);
  }

  this.element = element;
  this.next = null;
  this.prev = null;

  return this;
});


/* */

// 定义双向链表对象
function LinkedList () {

  var head = new ListNode();
  head.next = head;
  head.prev = head;
  head.list = this;

  this.head = head;
  this._current = head;

  head = null;
  return this;
}

var ll_proto = LinkedList.prototype;

ll_proto.fn = ll_proto;

ll_proto.destroy = function() {

  var node = this.head;
  var next;

  do {
    next = node.next;
    node.next = null;
    node.prev = null;
    node = next;
  } while (node.next)

  node = null;
  next = null;
  this.head = null;
};

// 在给定节点之前插入节点
ll_proto.insertBefore = function(current, node) {
  if (this.has(current)) {
    node = ListNode(node);
    connectNodes(current.prev, node, current);
    node.list = this;
    return node;
  }
  return null;
};

// 在给定节点之后插入节点
ll_proto.insertAfter = function(current, node) {
  if (this.has(current)) {
    node = ListNode(node);
    connectNodes(current, node, current.next);
    node.list = this;
    return node;
  }
  return null;
};

// 在链表头部插入一个节点
ll_proto.prepend = function (node) {
  return this.insertAfter(this.head, node);
};

// 在链表尾部插入一个节点
ll_proto.append = function (node) {
  return this.insertBefore(this.head, node);
};

// 将node.element（而非 node）转为数组，不包含 head.element（element == null）
ll_proto.toArray = function () {

  var arr = [];
  this.each(function(node) {
    arr.push(node.element);
  });

  return arr;
};

// 将链表转为字符串，调用元素自身的 toString 方法
// 元素必须提供 toString 方法
ll_proto.toString = function () {
  var html = '';
  this.each(function(node) {
    html += node.element.toString();
  });
  return html;
};

// 遍历链表，会自动跳过头节点和标记为删除的节点
ll_proto.each = function (callback) {
  
  this._current = this.head;
  // var node = this.head;

  while(true) {
    this._current = this._current.next;
    if (this._current === this.head) break;
    // if (this._current._deleted) continue;
    if (false === callback(this._current, this)) break;
  }

  return this;
};

// 移除节点，参数可以是一个或多个
ll_proto.remove = function () {

  var _this = this;
  var nodes = _.filter(_.toArray(arguments), function(node) { 
    return node && node.list === _this; 
  });

  nodes = _.uniq(nodes);

  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i] === this._current) {
      this._current = nodes[i].prev;
    }
    removeNode(nodes[i]);
  }

  return this._current;
};

ll_proto.has = function (node) {
  if (node.list === this) return true;
  return false;
};


/**
 * Make a map and return a function for checking if a key
 * is in that map.
 */
function makeMap (str) {
  var map = Object.create(null);
  var list = str.split(',');
  for (var i = 0; i < list.length; i++) {
    map[list[i]] = true;
  }
  return function (val) { return map[val.toLowerCase()]; }
}

// 是否单标签
var isUnaryTag = makeMap(
  'area,base,br,col,embed,frame,hr,img,input,isindex,keygen,' +
  'link,meta,param,source,track,wbr'
);

// Special Elements (can contain anything)
var isPlainTextElement = makeMap('script,style,textarea');

var decodingMap = {
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&amp;': '&',
  '&#10;': '\n',
  '&#9;': '\t'
};

var encodedAttr = /&(?:lt|gt|quot|amp|#10|#9);/g;

function decodeAttr (value) {
  return value.replace(encodedAttr, function (match) { return decodingMap[match]; })
}

/**
 * @param String style
 * @return Object
 */
function styleSplit (style) {

  var item, key, value;
  var array = style.trim().split(';');
  var list = {};

  for (var i = 0; i < array.length; i++) {
    if (!array[i]) continue;

    item = array[i].split(':');
    key = item[0].toLowerCase().trim();
    if (!key) continue;

    value = '' + (item[1] || '');
    value = value.trim();

    list[key] = value;
  }

  return list;
}

/**
 * @param Object style
 * @return String
 */
function styleToString (style) {
  return _.reduce(_.pairs(style), function(result, item) {
    return result + item.join(':') + ';';
  }, '');
}

/**
 * @param Array array
 * @return Object
 */
function attrSplit (array) {

  var list = Object.create(null);

  if (_.isArray(array)) {

    var attr, key, value;

    for (var i = 0; i < array.length; i++) {
    
      attr = array[i].split('=');
      key = attr[0].trim();
      if (attr.length > 2) {
        value = attr.slice(1).join('=');
      } else {
        value = attr[1] || '';
      }
      value = value.replace(/^\s*'([^']*)'\s*$/, '$1').replace(/^\s*"([^"]*)"\s*$/, '$1').replace(/"/g, "'");

      if (key === 'style') {
        value = styleSplit(value);
      } else {
        value = decodeAttr(value).trim();
      }

      list[key] = value;
    }
  };

  return list;
}

/**
 * @param Object attr
 * @return String
 */
function attrToString (attr) {

  var result = _.reduce(_.pairs(attr), function(result, item) {

    var key = item[0], value = item[1];
    if (key === 'style') value = styleToString(value);
    value = '"' + value + '"';

    return result + ' ' + key + '=' + value;

  }, '');

  return result.trim();
}

var hasTagName = makeMap('start,end,single');
var hasAttributes = makeMap('start,single');

/**
 * @param STRING source
 * @param STRING type
 * @param STRING tagName
 * @param ARRAY attrs
 * @return Object
 */
function HtmlNode (source, type, tagName, attributes) {
  this.source = source;
  this.type = type;
  if (hasTagName(this.type)) {
    this.tagName = tagName || '';
  }
  if (hasAttributes(this.type)) {
    this.attributes = attrSplit(attributes);
  }
  return this;
}

var hn_proto = HtmlNode.prototype;

hn_proto.toString = function() {
  switch (this.type) {
    case 'START':
    case 'SINGLE':
      var attr = attrToString(this.attributes);
      if (attr) attr = ' ' + attr;
      return '<' + this.tagName + attr + '>';

    case 'END':
      return '</' + this.tagName + '>';

    default: return this.source || '';
  }
};

hn_proto.rename = function (tagName) {
  switch (this.type) {
    case 'START':
    case 'SINGLE':
    case 'END':
      this.tagName = tagName;
      this.source = this.toString();
      break

    default: break
  }
  return this;
};

hn_proto.attr = function (attrName, attrValue) {
  switch (this.type) {
    case 'START':
    case 'SINGLE':
      if (attrValue === undefined) {
        var value = this.attributes[attrName];
        if (attrName === 'style') {
          value = styleToString(value);
        }
        return value;
      } else {
        if (attrName === 'style' && _.isString(attrValue)) {
          attrValue = styleSplit(attrValue);
        }
        this.attributes[attrName] = attrValue;
        return this;
      }
      break

    default: break
  }
  return null;
}


/*!
 * HTML Parser By John Resig (ejohn.org)
 * Modified by Juriy "kangax" Zaytsev
 * Original code by Erik Arvidsson, Mozilla Public License
 * http://erik.eae.net/simplehtmlparser/simplehtmlparser.js
 */

// Regular Expressions for parsing tags and attributes
var attribute = /^\s*[^\s"'<>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?/;

// 完整的字符集参看 https://www.w3.org/TR/1999/REC-xml-names-19990114/#NT-QName
// 这里仅使用一个子集，假定标签名不含有任何非英文字符
var ncname = '[a-zA-Z_][\\w\\-\\.]*';
var qnameCapture = "((?:" + ncname + "\\:)?" + ncname + ")";

var notag = /^<!/;
var startTag = new RegExp("^<" + qnameCapture);
var endTag = new RegExp("^<\\/" + qnameCapture + "\\s*>");

var startTagClose = /^\/?>/;

var comment = /^<!--[\s\S]*?-->/;
var MSIf = /^<!\[if\b.*?\]>[\s\S]*?<!\[endif\]>/i;
var cndtComment = /^<!\[[\s\S]*?\]>/;
var doctype = /^<!DOCTYPE[^>]+>/i;

function parse(html) {

  var reCache = {};
  var stack = [];
  var tokens = new LinkedList();

  var text = '';
  var match = null;

  while (html) {

    if (notag.test(html)) {
      handleNoTag();
      continue
    }

    if (match = html.match(endTag)) {
      handleEndTag(match);
      continue
    }

    if (match = html.match(startTag)) {
      handleStartTag(match);
      continue
    }
    
    text += html[0];
    advance(1);
  }

  match = null;
  handleText();

  // console.log(tokens.toArray());

  return tokens;

  function handleText () {
    if (text) {
      tokens.append(new HtmlNode(text, 'TEXT'));
      text = '';
    }
  }

  function advance (n) {
    html = html.substring(n);
  }

  function textTill (endFlag) {
    var end = html.indexOf(endFlag);
    if (end >= 0) return html.substring(0, end) + endFlag;
    return html + endFlag;
  }

  function handleNoTag () {

    handleText();

    var match, source, type = null;

    // Comment:
    if (match = html.match(comment)) {
      type = "COMMENT";
    }

    // MSIf
    else if (match = html.match(MSIf)) {
      type = "MSIF";
    }

    // conditinalComment
    else if (match = html.match(cndtComment)) {
      type = "CNDT";
    }

    // Doctype
    else if (match = html.match(doctype)) {
      type = "DOCTYPE";
    }

    if (!type) {
      type = "NOTAG";
      source = textTill('>');
    } else {
      source = match[0];
    }

    advance(source.length);
    tokens.append(new HtmlNode(source, type));
  }

  // 处理开始标签
  // 正则匹配的是开始标签的开始部分，即 '<tagname'
  // 此函数将继续匹配后续部分：属性和结束标志 '>'
  // 在遇到结束标志 '>' 前，每匹配到一个属性，就将其加入到属性数组
  // 然后，使用属性、标签名等生成一个 HtmlNode，并添加到链表中
  // 最后，会检测此开始标签是不是一个特殊的文本标签: textarea, style, script
  // 如果是，将一次性获取标签内的全部内容（不包括结束标签），然后添加一个文本节点
  function handleStartTag (match) {

    handleText();
    advance(match[0].length);

    var source = match[0];

    var type = "START";
    var tagName = match[1].toLowerCase();
    if (isUnaryTag(tagName)) type = "SINGLE";

    var attributes = [];
    var end, attrMatch, attr;

    while (html && !(end = html.match(startTagClose))) {
      if (attrMatch = html.match(attribute)) {
        advance(attrMatch[0].length);
        source += ' ' + attrMatch[0].trim();
        attributes.push(attrMatch[0]);
      } else {
        advance(1);
      }
    }

    if (end) {
      advance(end[0].length);
      if (end[0] === "/>") type = "SINGLE";
    }

    source += '>';
    var node = tokens.append(new HtmlNode(source, type, tagName, attributes));

    if (type === 'START') stack.push(node);

    if (isPlainTextElement(tagName)) {
      var re = reCache[tagName] || (reCache[tagName] = new RegExp("^[\\s\\S]*?(?=<\\/" + tagName + "\\s*>)"));
      var content = html.match(re);
      if (content && content[0]) {
        advance(content[0].length);
        tokens.append(new HtmlNode(content[0], "TEXT"));
      }
    }
  }

  // 处理结束标签
  function handleEndTag (match) {

    handleText();
    advance(match[0].length);

    var tagName = match[1].toLowerCase();
    var _tagName, end;

    for (var pos = stack.length - 1; pos >= 0; pos--) {
      if (stack[pos].element.tagName === tagName) break;
    }

    if (pos >= 0) {
      for (var i = stack.length - 1; i >= pos; i--) {
        _tagName = stack[i].element.tagName;
        end = tokens.append(new HtmlNode("</" + _tagName + ">", "END", _tagName));
        stack[i].match = end;
        end.match = stack[i];
      }
      stack.length = pos;
    }
  }
}

window.parseHTML = parse;
window.HtmlNode = HtmlNode;

})(window, _);
