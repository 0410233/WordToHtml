/**
 * 简化版 html-parser
 * 假定： 
 *  1.没有未封闭的标签
 *  2.没有省略的或丢失的结束标签
 *  - 3.没有不合理的嵌套（偶尔存在不合理的嵌套）
 *  4.标签名不含特殊字符
 */

/**
 * 标签节点类型：
 * - TAG_START
 * - TAG_END
 * - TAG_SINGLE
 *
 * 非标签节点类型：
 * - NOTAG_COMMENT
 * - NOTAG_MSIF
 * - NOTAG_CNDT
 * - NOTAG_DOCTYPE
 * - NOTAG
 * 
 * 扩展节点类型：
 * - MARK
 * - DATA
 */

;(function (window, _, undefined) {

'use strict';

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
    return function (val) { return map[val.toLowerCase()] }
  }
  return function (val) { return map[val] }
}

// 可融合的标签
var canBeUnwrapped = makeMap('u,i,span');

/**
 * 切分 style 字符串为键值对对象
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
 * 合并 style 对象为字符串
 * @param Object style
 * @return String
 */
function styleToString (style) {
  return _.reduce(_.pairs(style), function(result, item) {
    return result + item.join(':') + ';';
  }, '');
}

// 字符实体映射
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
 * 切分属性数组（元素为属性字符串，类似：属性名=属性值）为键值对对象
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
 * 合并属性对象为字符串
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

function HtmlNodeCapture (node) {

  if (!isHtmlNode(node)) return node;

  var clone = Object.create(null);
  clone.listid = node.listid;
  clone.source = node.source;
  clone.type = node.type;
  if (node.tagName) {
    clone.tagName = node.tagName;
  }
  if (node.attributes) {
    clone.attributes = _.clone(node.attributes);
    if (node.attributes.style) {
      clone.attributes.style = _.clone(node.attributes.style);
    }
  }
  if (node.subtype) {
    clone.subtype = node.subtype;
  }
  if (node.template) {
    clone.template = node.template;
  }
  if (node.fields) {
    clone.fields = _.clone(node.fields);
  }
  return clone;
}

// 连结给定节点
function connectNodes () {
  var nodes = _.compact(_.flatten(_.toArray(arguments)));
  if (!nodes.length) return;

  var list = nodes[0].list;
  for (var i = 1; i < nodes.length; i++) {
    nodes[i-1].next = nodes[i];
    nodes[i].prev = nodes[i-1];
    nodes[i].list = list;
  }
}

// 从链表中移除节点
function removeNode (node) {
  connectNodes(node.prev, node.next);
  node.next = null;
  node.prev = null;
  node.list = null;
  return node;
}

// 使用 condition 检测一个 node
function checkNode (node, condition) {
  var array = condition.trim().split('.');
  return (!array[0] || node.tagName === array[0]) && 
    (!array[1] || node.type === array[1]) && 
    (!array[2] || node.subtype === array[2]);
}

// ...
function isHtmlNode (node) {
  return node instanceof HtmlNode;
}

// ...
function isHtmlList (list) {
  return list instanceof HtmlList;
}

// ...
var createStart = function (tagName, attributes) {
  var node = new HtmlNode('', 'TAG_START', tagName, attributes || []);
  node.source = node.toString();
  return node;
};

// ...
var createEnd = function (tagName) {
  return new HtmlNode('</'+tagName+'>', 'TAG_END', tagName);
};

// ...
var createSingle = function (tagName, attributes) {
  var node = new HtmlNode('', 'TAG_SINGLE', tagName, attributes || []);
  node.source = node.toString();
  return node;
};

// ...
var create = function (source, type) {
  type = type || 'TEXT';
  return new HtmlNode(source, type);
};


var hasTagName = makeMap('TAG_START,TAG_END,TAG_SINGLE', true);
var hasAttributes = makeMap('TAG_START,TAG_SINGLE', true);

/**
 * @param STRING source
 * @param STRING type
 * @param STRING tagName
 * @param ARRAY attrs
 * @return Object
 */
function HtmlNode (source, type, tagName, attributes) {

  this.listid = 0;
  this.source = source || '';
  this.type = type || '';

  if (hasTagName(this.type)) {
    this.tagName = tagName || '';
  }
  if (hasAttributes(this.type)) {
    this.attributes = attrSplit(attributes);
  }

  this.prev = null;
  this.next = null;
  this.list = null;

  return this;
}

var hn_proto = HtmlNode.prototype;

// 将当前节点插入到指定节点之前
hn_proto.insertTo = hn_proto.insertBefore = function (node) {
  if (node.list) {
    node.list.insert(node, this);
  } else {
    connectNodes(node.prev, this, node);
  }
  return this;
};

// 将当前节点插入到指定节点之后
hn_proto.insertAfter = function (node) {
  if (node.list) {
    node.list.insert(node.next, this);
  } else {
    connectNodes(node, this, node.next);
  }
  return this;
};

// 在当前节点之前插入指定节点
hn_proto.beforeInsert = function (node) {
  if (this.list) {
    this.list.insert(this, node);
  } else {
    connectNodes(this.prev, node, this);
  }
  return node;
};

// 在当前节点之后插入指定节点
hn_proto.afterInsert = function (node) {
  if (this.list) {
    this.list.insert(this.next, node);
  } else {
    connectNodes(this, node, this.next);
  }
  return node;
};

// 将当前节点插入到指定链表尾部
hn_proto.appendTo = function (list) {
  if (isHtmlList(list)) list.append(this);
  return this;
};

// 将当前节点插入到指定链表头部
hn_proto.prependTo = function (list) {
  if (isHtmlList(list)) list.prepend(this);
  return this;
};

// ...
hn_proto.toString = function() {
  switch (this.type) {
    case 'TAG_START':
    case 'TAG_SINGLE':
      var attr = attrToString(this.attributes);
      if (attr) attr = ' ' + attr;
      return '<' + this.tagName + attr + '>';

    case 'TAG_END':
      return '</' + this.tagName + '>';

    case 'MARK':
      return '';

    case 'DATA':
      return this.output();

    default: return this.source || '';
  }
};

// ...
hn_proto.output = function () {
  if (!this.template) return '';

  var content = this.template;
  // log(content);
  _.each(_.pairs(this.fields), function(item){
    content = content.replace(new RegExp('\\{'+item[0].toLowerCase()+'\\}', 'g'), item[1]);
  });
  // log(content);

  return content;
};

// 自身快照
hn_proto.capture = function () {

  var node = HtmlNodeCapture(this);
  node.prev = HtmlNodeCapture(this.prev);
  node.next = HtmlNodeCapture(this.next);
  node.match = HtmlNodeCapture(this.match);

  return node;
};

// 如果本节点是一个标签，返回对应的开始标签
// 否则返回 null
hn_proto.start = function () {
  switch (this.type) {
    case 'TAG_START':
      return this;
    case 'TAG_END':
      return this.match || createStart(this.tagName);
    default: return null;
  }
};

// 如果本节点是一个标签，返回对应的结束标签
// 否则返回 null
hn_proto.end = function () {
  switch (this.type) {
    case 'TAG_START':
      return this.match || createEnd(this.tagName);
    case 'TAG_END':
      return this;
    default: return null;
  }
};

// 返回一个由本节点和其匹配节点组成、且按它们在链表中出现顺序排序的数组
hn_proto.pair = function () {
  if (!this.match) return [this];
  switch (this.type) {
    case 'TAG_START':
      return [this, this.match];
    case 'TAG_END':
      return [this.match, this];
    default: break
  }

  var pair = [this];

  // 确定 this 和 this.match 在链表中的出现顺序
  var thisPrev = this.prev, matchPrev = this.match.prev;
  while (true) {
    if (!thisPrev || !thisPrev.type || matchPrev === this) {
      pair.push(this.match);
      break
    }
    if (!matchPrev || !matchPrev.type || thisPrev === this.match) {
      pair.unshift(this.match);
      break
    }
    thisPrev = thisPrev.prev;
    matchPrev = matchPrev.prev;
  }
  return pair;
};

// 返回一个由本节点、本节点的匹配节点（如果存在的话）及其之间的所有节点组成的数组
// 如果不存在匹配节点，则数组中仅包含本节点
hn_proto.toArray = function () {

  var pair = this.pair();
  if (pair.length < 2) {
    return pair;
  }

  var array = [pair[0]];
  var node = pair[0].next;

  while (node !== pair[1]) {
    array.push(node);
    node = node.next;
  }
  array.push(pair[1]);

  return array;
};

// ...
hn_proto.captureArray = function () {
  var array = this.toArray();
  for (var i = 0; i < array.length; i++) {
    array[i] = array[i].capture();
  }
  return array;
};

// 复制自身
hn_proto.clone = function (tagName) {
  var clone = _.create(HtmlNode, this);
  if (this.attributes) {
    clone.attributes = _.clone(this.attributes);
    if (this.attributes.style) {
      clone.attributes.style = _.clone(this.attributes.style);
    }
  }
  if (tagName) clone.renameTo(tagName);

  clone.prev = null;
  clone.next = null;
  clone.list = null;

  return clone;
};

// 从所在链表中移除本节点
hn_proto.remove = function () {
  if (this.list) {
    this.list.remove(this);
  } else {
    removeNode(this);
  }
  return this;
};

// ...
hn_proto.tagRemove = function () {
  var start = this.start();
  if (start) {
    var array = start.toArray();
    if (this.list) {
      this.list.remove(array);
    } else {
      for (var i = 0; i < array.length; i++) {
        removeNode(array[i]);
      }
    }
  }
  return this;
};

// ...
hn_proto.renameTo = function (tagName) {
  switch (this.type) {
    case 'TAG_START':
    case 'TAG_SINGLE':
    case 'TAG_END':
      this.tagName = tagName;
      this.source = this.toString();
      break

    default: break
  }
  return this;
};

// ...
hn_proto.tagRename = function (tagName) {
  this.renameTo(tagName);
  if (this.match) this.match.renameTo(tagName);
};

// ...
hn_proto.convertMark = function () {
  if (!this.type || this.type === 'MARK') return this;
  this.subtype = this.type;
  this.type = 'MARK';
  if (this.match) {
    this.match.subtype = this.match.type;
    this.match.type = 'MARK';
  }
  return this;
};

// ...
hn_proto.markRecover = function () {
  if (!this.type || this.type !== 'MARK') return this;
  this.type = this.subtype;
  delete this.subtype;
  if (this.match) {
    this.match.type = this.match.subtype;
    delete this.match.subtype;
  }
  return this;
};

// ...
hn_proto.attr = function (attrName, attrValue) {
  switch (this.type) {
    case 'TAG_START':
    case 'TAG_SINGLE':
      if (arguments.length === 1) {
        var value = this.attributes[attrName];
        if (attrName === 'style') {
          value = styleToString(value);
        }
        return value;
      } else {
        if (!attrValue) {
          delete this.attributes[attrName];
        } else {
          if (attrName === 'style' && _.isString(attrValue)) {
            attrValue = styleSplit(attrValue);
          }
          this.attributes[attrName] = attrValue;
        }
        return this;
      }
      break

    default: break
  }
  return null;
};

// 似乎没啥用
// hn_proto.isMatch = function (node) {
//   return isHtmlNode(node) && this.list === node.list && this.match === node;
// };

// 检测字符串 condition: tagName.type.subtype
hn_proto.is = hn_proto.meet = function (condition) {
  // if (condition === undefined || condition === '') return true;
  if (!condition) return true;
  // if (typeof condition !== 'string') return false;
  var array = condition.trim().split(',');
  for (var i = 0; i < array.length; i++) {
    if(checkNode(this, array[i])) return true;
  }
  return false;
};

// ...
hn_proto.matchWith = function (node) {
  this.match = node;
  node.match = this;
  return this;
};

// 判断自身是否空节点
// 参数 empty 指定除 MARK 节点和空白 TEXT 节点之外，还有哪些节点应被视为空节点
// 使用 node.is 判断
hn_proto.isEmpty = function (empty) {
  return (this.type === 'TEXT' && !(this.source.trim())) || this.type === 'MARK' || (empty && this.is(empty));
};

// 向前查找第一个非空节点
// 参数 condition 指定检测条件，使用 node.is 进行检测
// - 查找结果只有通过了检测才会被返回，否则返回 null
// 参数 empty 指定除 MARK 节点和空的 TEXT 节点之外，还有哪些节点应被视为空节点
hn_proto.prevSolid = function (condition, empty) {
  var node = this.prev;
  while(node) {
    if (!node.type) return null;
    if (!node.isEmpty(empty)) return node.is(condition) ? node : null;
    node = node.prev;
  }
  return null;
};

// 向后查找第一个非空节点
// 参数 condition 指定检测条件，使用 node.is 进行检测
// - 查找结果只有通过了检测才会被返回，否则返回 null
// 参数 empty 指定除 MARK 节点和空的 TEXT 节点之外，还有哪些节点应被视为空节点
hn_proto.nextSolid = function (condition, empty) {
  var node = this.next;
  while(node) {
    if (!node.type) return null;
    if (!node.isEmpty(empty)) return node.is(condition) ? node : null;
    node = node.next;
  }
  return null;
};

// 向前查找第一个标签
// 参数 condition 指定检测条件，使用 node.is 进行检测
// - 查找结果只有通过了检测才会被返回，否则返回 null
// 参数 empty 指定除 MARK 节点和空的 TEXT 节点之外，还有哪些节点应被视为空节点
hn_proto.prevTag = function (condition, empty) {
  var node = this.prev;
  while (node) {
    if (!node.type) return null;
    if (!node.isEmpty(empty)) {
      switch (node.type) {
        case 'TAG_START':
        case 'TAG_END':
        case 'TAG_SINGLE':
          return node.is(condition) ? node : null;
        default: break;
      }
    }
    node = node.prev;
  }
  return null;
};

// 向后查找第一个标签
// 参数 condition 指定检测条件，使用 node.is 进行检测
// - 查找结果只有通过了检测才会被返回，否则返回 null
// 参数 empty 指定除 MARK 节点和空的 TEXT 节点之外，还有哪些节点应被视为空节点
hn_proto.nextTag = function (condition, empty) {
  var node = this.next;
  while (node) {
    if (!node.type) return null;
    if (!node.isEmpty(empty)) {
      switch (node.type) {
        case 'TAG_START':
        case 'TAG_END':
        case 'TAG_SINGLE':
          return node.is(condition) ? node : null;
        default: break;
      }
    }
    node = node.next;
  }
  return null;
};

// 向前查找第一个同级元素，如果存在则返回它的开始标签（TAG_START 节点）
hn_proto.prevSibling = function (tagNameList, empty) {
  var start = this.start();
  if (!start) return null;

  var inList = tagNameList ? makeMap(tagNameList) : (function(){return true});
  var node = start.prevTag('.TAG_END,.TAG_SINGLE', empty);
  if (node && inList(node.tagName)) {
    return node.match || node;
  }

  return null;
};

// 向后查找第一个同级元素，如果存在则返回它的结束标签（TAG_END 节点）
hn_proto.nextSibling = function (tagNameList, empty) {
  var end = this.end();
  if (!end) return null;

  var inList = tagNameList ? makeMap(tagNameList) : (function(){return true});
  var node = start.prevTag('.TAG_START,.TAG_SINGLE', empty);
  if (node && inList(node.tagName)) {
    return node.match || node;
  }

  return null;
};

// 在本节点及其匹配节点组成的边界的内部（不包括边界）
// 查找所有符合 filter 过滤条件的节点（使用 node.is 判断）
hn_proto.find = hn_proto.findAll = hn_proto.collect = function (filter) {
  var found = this.toArray().slice(1, -1);
  if (found.length) {
    var check = null;
    switch (typeof filter) {
      case 'function':
        check = filter;
        break
      case 'string':
        check = function(node){return node.is(filter)};
        break
      default: break
    }

    if (check) {
      found = _.filter(found, function(node){
        return check(node);
      });
    }
  }
  return found;
};

// ...
hn_proto.filter = function (filter) {
  var found = this.toArray().slice(1, -1);
  if (found.length) {
    var check = null;
    switch (typeof filter) {
      case 'function':
        check = filter;
        break;
      case 'string':
        check = function(node){return node.is(filter)};
        break;
      default: break;
    }

    if (check) {
      found = _.filter(found, function(node){
        return !check(node);
      });
    } else {
      found.length = 0;
    }
  }
  return found;
};

// ...
hn_proto.children = function () {
  var start = this.start();
  if (!start) return [];

  var children = [];
  var isStartTag = makeMap('TAG_START, TAG_SINGLE', true);
  
  var node = start.next;
  var end = start.match;
  while (node !== end) {
    if (isStartTag(node.type)) {
      children.push(node);
      node = node.match || node;
    }
    node = node.next;
  }
  return children;
};

// 貌似没啥用
// hn_proto.firstChild = function () {
//   var start = this.start();
//   if (!start) return null;
//   var tag = start.nextTag();
//   if (tag.type === 'TAG_START') return tag;
//   return null;
// };

// 获取本节点的直接父节点
hn_proto.parent = function () {
  if (!this.type) return null;
  var node = this.start() || this;
  while (true) {
    node = node.prev;
    switch (node.type) {
      case '':
        return null;
      case 'TAG_START': 
        return node;
      case 'TAG_END':
        node = node.match;
        break
      default: break
    }
  }
};

// 获取本节点的所有父节点
hn_proto.parents = function () {
  if (!this.type) return [];
  var parents = [];
  var node = this.start() || this;
  while (true) {
    node = node.prev;
    switch (node.type) {
      case '':
        return parents;
      case 'TAG_START': 
        parents.push(node);
        break
      case 'TAG_END':
        node = node.match;
        break
      default: break
    }
  }
};

// 查找当前元素的包装元素，形如 <wrapper><tag> ... </tag></wrapper>
hn_proto.wrapper = function (tagNameList, empty) {
  if (!this.type) return null;

  var start = (this.start() || this).prevSolid('.TAG_START', empty);
  var end = (this.end() || this).nextSolid('.TAG_END', empty);

  var inList = tagNameList ? makeMap(tagNameList) : (function(){return true});
  if (start && start.match === end && inList(start.tagName)) {
    return start;
  }

  return null;
};

// 向上一层层查找当前元素的包装元素，直到遇到 标签名==tagName 的元素
// 如果没有指定 tagName ，则返回最顶级包装元素
hn_proto.topWrapper = function (tagNameList, empty) {
  var lastWrapper = this.start();
  var wrapper = this.wrapper('', empty);
  var inList = tagNameList ? makeMap(tagNameList) : (function(){return false});
  while(wrapper) {
    lastWrapper = wrapper;
    if (inList(lastWrapper.tagName)) break;
    wrapper = wrapper.wrapper('', empty);
  }
  return lastWrapper && (!tagNameList || inList(lastWrapper.tagName) ? lastWrapper : null);
};

// 返回内包装元素，形如： <tag><inner> ... </inner></tag>
hn_proto.inner = function (tagNameList, empty) {
  var start = this.start();
  if (!start) return null;

  var inList = tagNameList ? makeMap(tagNameList) : (function(){return true});
  var innerLeft = start.nextSolid('.TAG_START', empty);
  if (innerLeft && innerLeft.match === start.match.prevSolid('', empty) && inList(innerLeft.tagName)) {
    return innerLeft;
  }

  return null;
};

// ...
hn_proto.hasInner = function (tagNameList, empty) {
  var start = this.start();
  if (!start) return false;

  var inList = tagNameList ? makeMap(tagNameList) : (function(){return true});
  var inner = this.inner('', empty);
  while (inner) {
    if (inList(inner.tagName)) return true;
    inner = inner.inner('', empty);
  }

  return false;
};

// ...
hn_proto.wrap = function (wrapper) {

  if (!this.type || !wrapper) return this;

  if (typeof wrapper === 'string') {
    wrapper = createStart(wrapper);
  }

  var start = this.start() || this;
  var end = this.end() || this;

  var left = wrapper.start();
  var right = wrapper.end();

  if (left && right) {
    left.insertBefore(start);
    right.insertAfter(end);
    left.matchWith(right);
    return left;
  }

  return this;
};

// ...
hn_proto.wrapInner = function (wrapper) {
  if (!this.type || !wrapper) return this;

  if (typeof wrapper === 'string') {
    wrapper = createStart(wrapper);
  }

  var start = this.start();
  var end = this.end();

  if (start && end) {
    var left = wrapper.start();
    var right = wrapper.end();

    if (left && right) {
      left.insertAfter(start);
      right.insertBefore(end);
      left.matchWith(right);
      return left;
    }
  }

  return this;
};

// ...
hn_proto.unwrap = function (all) {
  if (!this.type) return this;

  var wrapper = this.wrapper();
  var toBeRemoved = [];
  while(wrapper) {
    if (all || canBeUnwrapped(wrapper.tagName)) {
      // list.remove(wrapper, wrapper.match);
      toBeRemoved.push(wrapper, wrapper.match);
      wrapper = wrapper.wrapper();
      continue
    }
    break
  }
  this.list.remove(toBeRemoved);
  return this;
};

// 向上融合
hn_proto.mergeUp = function (empty) {
  var start = this.start();
  if (!start) return this;

  var end = start.match;
  var inner = start.nextSolid('.TAG_START', empty);
  var prev = this.prevSibling(this.tagName, empty);

  if (prev) {
    this.list.remove(prev.match, start);
    prev.matchWith(end);
  }
  return inner;
};

// ...
hn_proto.innerText = function () {
  var start = this.start();
  if (!start) return '';

  return _.reduce(this.find('.TEXT'), function(text, node) {
    return text + node.source;
  }, '');
};

// ...
hn_proto.innerHtml = function () {
  return _.reduce(this.toArray(), function(html, node) {
    return html + (node.type === 'MARK' ? '' : node.toString());
  }, '');
};

// ...
hn_proto.addClass = function (className) {

  if (!_.isString(className) || !className.trim()) return this;

  var target = this.start() || this;
  if (target && target.attributes) {
    var classList = target.attr('class') || '';
    if (!classList) {
      target.attr('class', className.trim());
    } else {
      classList = _.union(classList.split(' '), className.split(' ')).join(' ').trim();
      target.attr('class', classList);
    }
  }

  return this;
};

// ...
hn_proto.removeClass = function (className) {

  if (!_.isString(className) || !className.trim()) return this;

  var target = this.start() || this;
  var classList = target.attr('class');
  if (classList) {
    classList = _.difference(classList.split(' '), className.split(' ')).join(' ').trim();
    target.attr('class', classList);
  }
  return this;
};


/* */

// 定义双向链表对象
function HtmlList () {

  this._id = (function(){
    var id = 1;
    return function(){ return id++ };
  }());

  var head = new HtmlNode();
  head.next = head;
  head.prev = head;
  head.list = this;
  head.listid = this._id();

  this.head = head;
  this._current = head;

  this.append(_.toArray(arguments));

  head = null;
  return this;
}

var hl_proto = HtmlList.prototype;

hl_proto.fn = hl_proto;

hl_proto.first = function () {
  return this.head.next;
};

hl_proto.last = function () {
  return this.head.prev;
};

hl_proto.destroy = function() {
  this.clear();
  this.head = null;
  return this;
};

// 清空链表
hl_proto.clear = function() {

  var node = this.head;
  var next;

  do {
    next = node.next;

    node.next = null;
    node.prev = null;
    node.list = null;
    
    node = next;
  } while (node.next)

  node = null;
  next = null;

  return this;
};

// 在指定位置插入一个或一组节点
hl_proto.insert = function (pos) {
  if (this.has(pos)) {
    var thisList = this;
    var nodes = _.filter(_.flatten(_.toArray(arguments)).slice(1), function(node) {
      if (isHtmlNode(node)) {
        node.remove();
        node.listid = thisList._id();
        return true;
      }
      return false;
    });
    connectNodes(pos.prev, nodes, pos);
  }
  return this;
};

// 在链表头部插入一个节点
hl_proto.prepend = function () {
  this.insert(this.head.next, _.toArray(arguments));
  return this;
};

// 在链表尾部插入一个节点
hl_proto.append = function () {
  this.insert(this.head, _.toArray(arguments));
  return this;
};

// 获取或指定链表遍历指针
hl_proto.current = function (node) {
  if (node && this.has(node)) this._current = node;
  return this._current;
};

// 将遍历指针 (_current) 指向指定的 node
hl_proto.skipTo = function (node) {
  if (this.has(node)) this._current = node;
  return this;
};

// 遍历链表，会自动跳过头节点和标记为删除的节点
hl_proto.each = function (callback) {
  this._current = this.head;
  while(true) {
    this._current = this._current.next;
    if (this._current === this.head) break;
    if (false === callback(this._current, this)) break;
  }
  return this;
};

// 将 list 转为数组，不包含 head
hl_proto.toArray = function () {
  var arr = [];
  var _current = this._current;
  this.each(function(node) {
    arr.push(node);
  });
  this._current = _current;
  return arr;
};

// 将 list 转为快照数组
hl_proto.captureArray = function () {
  var array = this.toArray();
  for (var i = 0; i < array.length; i++) {
    array[i] = array[i].capture();
  }
  return array;
};

// ...
hl_proto.find = hl_proto.findAll = hl_proto.collect = function (filter) {

  var check = function(){return true};
  switch (typeof filter) {
    case 'function':
      check = filter;
      break;
    case 'string':
      check = function(node){return node.is(filter)};
      break;
    default: break;
  }

  return _.filter(this.toArray(), function(node) {
    return check(node);
  });
};

// 将链表转为字符串，调用元素自身的 toString 方法
// 元素必须提供 toString 方法
hl_proto.toString = function () {
  var html = '';
  var _current = this._current;
  this.each(function(node) {
    html += node.toString();
  });
  this._current = _current;
  return html;
};

// 移除节点，参数可以是一个或多个
hl_proto.remove = function () {

  var _this = this;
  var nodes = _.filter(_.flatten(_.toArray(arguments)), function(node) { 
    if (node && node.list === _this) {
      node.list = null;
      return true
    }
    return false
  });
  nodes = _.uniq(nodes);

  while (!this._current.list) {
    this._current = this._current.prev;
  }

  for (var i = 0; i < nodes.length; i++) {
    removeNode(nodes[i]);
  }

  return this;
};

// 安全的移除节点
// 当移除列表中存在一个节点，而该节点的匹配节点却不在移除列表中
// 该节点会被保留
hl_proto.safeRemove = function () {

  var _this = this;
  var nodes = _.filter(_.flatten(_.toArray(arguments)), function(node) {
    if (node && node.list === _this) {
      node.list = null;
      return true
    }
    return false
  });
  nodes = _.uniq(nodes);

  nodes = _.filter(nodes, function(node){
    if (node.match && node.match.list) {
      node.list = node.match.list;
      return false
    }
    return true
  });

  while (!this._current.list) {
    this._current = this._current.prev;
  }

  for (var i = 0; i < nodes.length; i++) {
    removeNode(nodes[i]);
  }

  return this;
};

// ...
hl_proto.removeTags = function () {
  var args = _.toArray(arguments);
  var len = args.length;
  for (var i = 0; i < len; i++) {
    if (args[i] && args[i].match) {
      args.push(args[i].match);
    }
  }
  this.remove(args);
  return this;
};

// ...
hl_proto.moveTagTo = function (start, node) {
  if (start === node) return this;
  var array = start.toArray();
  this.remove(array);
  connectNodes(node.prev, array, node);
  return this;
};

// ...
hl_proto.separate = function () {
  var nodes = _.flatten(_.toArray(arguments));
  this.remove(nodes);
  return new HtmlList(nodes);
};

// 判断链表是否包含给定节点
hl_proto.has = function (node) {
  if (isHtmlNode(node) && node.list === this) return true;
  return false;
};

// ...
hl_proto.children = function () {
  var children = [];
  var isStartTag = makeMap('TAG_START, TAG_SINGLE', true);
  var node = this.head.next;
  while (node !== this.head) {
    if (isStartTag(node.type)) {
      children.push(node);
      node = node.match || node;
    }
    node = node.next;
  }
  return children;
};

// ...
hl_proto.createStart = createStart;
hl_proto.createEnd = createEnd;
hl_proto.createSingle = createSingle;
hl_proto.create = create;


/*!
 * HTML Parser By John Resig (ejohn.org)
 * Modified by Juriy "kangax" Zaytsev
 * Original code by Erik Arvidsson, Mozilla Public License
 * http://erik.eae.net/simplehtmlparser/simplehtmlparser.js
 */

// 是否单标签
var isUnaryTag = makeMap(
  'area,base,br,col,embed,frame,hr,img,input,isindex,keygen,' +
  'link,meta,param,source,track,wbr'
);

// Special Elements (can contain anything)
var isPlainTextElement = makeMap('script,style,textarea');

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
  var tokens = new HtmlList();

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
      type = "NOTAG_COMMENT";
    }

    // MSIf
    else if (match = html.match(MSIf)) {
      type = "NOTAG_MSIF";
    }

    // conditinalComment
    else if (match = html.match(cndtComment)) {
      type = "NOTAG_CNDT";
    }

    // Doctype
    else if (match = html.match(doctype)) {
      type = "NOTAG_DOCTYPE";
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

    var type = "TAG_START";
    var tagName = match[1].toLowerCase();
    if (isUnaryTag(tagName)) type = "TAG_SINGLE";

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
      if (end[0] === "/>") type = "TAG_SINGLE";
    }

    source += '>';
    var node = new HtmlNode(source, type, tagName, attributes);
    tokens.append(node);

    if (type === 'TAG_START') stack.push(node);

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
      if (stack[pos].tagName === tagName) break;
    }

    if (pos >= 0) {
      for (var i = stack.length - 1; i >= pos; i--) {
        end = createEnd(stack[i].tagName);
        tokens.append(end);
        stack[i].matchWith(end);
      }
      stack.length = pos;
    }
  }
}

parse.createList = function () {
  return new HtmlList(_.toArray(arguments));
};

window.parseHTML = parse;
// window.HtmlNode = HtmlNode;

})(window, _);
