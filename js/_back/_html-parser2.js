
;(function (window, _, undefined) {

'use strict';

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
});

var ln_proto = ListNode.prototype;

// 关联两个节点
ln_proto._connect = function(nodeLeft, nodeRight) {
  nodeLeft.next = nodeRight;
  nodeRight.prev = nodeLeft;
}

// 将节点插入到两个给定节点之间
ln_proto._insertBetween = function(nodeLeft, nodeRight) {

  this._connect(nodeLeft, this);
  this._connect(this, nodeRight);

  return this;
};

// 将节点插入到给定节点之前
ln_proto.insertBefore = function(node) {
  this._insertBetween(node.prev, node);
  return this;
};

// 将节点插入到给定节点之后
ln_proto.insertAfter = function(node) {
  this._insertBetween(node, node.next);
  return this;
};

// 从链表中移除节点
ln_proto.remove = function() {
  this._connect(this.prev, this.next);
  this.element = null;
  this.next = null;
  this.prev = null;
};


/* */

// 定义双向链表对象
function LinkedList () {

  var head = new ListNode();
  head.next = head;
  head.prev = head;

  this.head = head;
  head = null;

  return this;
}

var ll_proto = LinkedList.prototype;

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

ll_proto.append = function(node) {

  ListNode(node).insertBefore(this.head);

  return this;
};

ll_proto.toArray = function() {

  var arr = [];
  var node = this.head.next;
  while(node.element) {
    arr.push(node.element);
    node = node.next;
  }

  return arr;
};

ll_proto.getHTML = function() {
  var html = '';
  var node = this.head.next;
  while(node.element) {
    html += node.element.source;
    node = node.next;
  }
  return html;
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

// Special Elements (can contain anything)
var isPlainTextElement = makeMap('script,style,textarea');

/*!
 * HTML Parser By John Resig (ejohn.org)
 * Modified by Juriy "kangax" Zaytsev
 * Original code by Erik Arvidsson, Mozilla Public License
 * http://erik.eae.net/simplehtmlparser/simplehtmlparser.js
 */

// Regular Expressions for parsing tags and attributes
var attribute = /^\s*[^\s"'<>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?/;

// could use https://www.w3.org/TR/1999/REC-xml-names-19990114/#NT-QName
var ncname = '[a-zA-Z_][\\w\\-\\.]*';
var qnameCapture = "(?:" + ncname + "\\:)?" + ncname;

var notag = /^<!/;
var startTag = new RegExp("^<" + qnameCapture);
var endTag = new RegExp("^<\\/" + qnameCapture);

var startTagClose = /^\/?>/;

var comment = /^<!--/;
var MSIf = /^<!\[if\b[^\]]*\]>/i;
var MSEndif = /^<!\[endif\]>/i;
var doctype = /^<!DOCTYPE[^>]+>/i;

function parse(html) {

  var reCache = {};
  var tokens = new LinkedList();

  var text = '';
  var match = null;

  while (html) {

    if (match = html.match(notag)) {
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
    
    text += feed(1);
    match = null;
  }

  handleText();

  // console.log(tokens.toArray());

  return tokens;

  function handleText() {
    if (text) {
      addToken(text, 'TEXT');
      text = '';
    }
  }

  function handleMatch(match, type) {
    addToken(match[0], type);
    advance(match[0].length);
  }

  function addToken(source, type) {
    tokens.append({
      type: type.toUpperCase(),
      source: source,
    });
  }

  function advance(n) {
    html = html.substring(n);
  }

  function feed (n) {
    var chars = html.substring(0, n);
    advance(n);
    return chars;
  }

  function textUntil(endFlag, flagType) {

    var end = html.indexOf(endFlag);
    if (end >= 0) {
      text = feed(end);
    } else {
      text = html;
      html = '';
    }

    handleText();

    if (html) {
      addToken(endFlag, flagType);
      advance(endFlag.length);
    }
  }

  function handleNoTag (match) {

    handleText();

    var _match = match;

    // Comment:
    if (match = html.match(comment)) {
      handleMatch(match, 'COMMENT_OPEN');
      textUntil('-->', 'COMMENT_CLOSE');
    }

    // MSIf
    else if (match = html.match(MSIf)) {
      handleMatch(match, 'MSIF');
    }

    // MSEndif
    else if (match = html.match(MSEndif)) {
      handleMatch(match, 'MSENDIF');
    }

    // Doctype
    else if (match = html.match(doctype)) {
      handleMatch(match, 'DOCTYPE');
    }

    // <! ... >
    else {
      handleMatch(_match, 'CNDT_COMMENT_OPEN');
      textUntil('>', 'CNDT_COMMENT_CLOSE');
    }
  }

  function handleStartTag (match) {

    handleText();
    handleMatch(match, 'STARTTAG_OPEN');

    var tagName = match[0].substring(1).toLowerCase();
    var tagClose, attrMatch, chars = '';

    while (html && !(tagClose = html.match(startTagClose))) {
      if (attrMatch = html.match(attribute)) {
        handleText();
        handleMatch(attrMatch, 'ATTRIBUTE');
      } else {
        text += feed(1);
      }
    }

    if (tagClose) {
      handleText();
      handleMatch(tagClose, 'STARTTAG_CLOSE');
      if (isPlainTextElement(tagName)) {
        var re = reCache[tagName] || (reCache[tagName] = new RegExp("^[\\s\\S]*?(?=<\\/" + tagName + "(?=[^\\w\\-\\.])|$)"));
        var plainText = html.match(re);
        if (plainText && plainText[0]) handleMatch(plainText, 'TEXT');
      }
    }
  }

  function handleEndTag (match) {
    handleText();
    handleMatch(match, 'ENDTAG_OPEN');
    textUntil('>', 'ENDTAG_CLOSE');
  }
}

// 是否单标签
var isUnaryTag = makeMap(
  'area,base,br,col,embed,frame,hr,img,input,isindex,keygen,' +
  'link,meta,param,source,track,wbr'
);

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

function joinTags(tokenList) {

  var htmlTokens = new LinkedList();
  var currentNode = tokenList.head;
  var element;

  while(true) {

    currentNode = currentNode.next;
    element = currentNode.element;

    if (element === null) break;

    if (element.type === 'COMMENT_OPEN') {
      joinComment();
      continue
    }

    if (element.type === 'CNDT_COMMENT_OPEN') {
      joinCndtComment();
      continue
    }

    if (element.type === 'ENDTAG_OPEN') {
      joinEndTag();
      continue
    }

    if (element.type === 'STARTTAG_OPEN') {
      joinStartTag();
      continue
    }

    if (element.type === 'TEXT') {
      mergeText();
      continue
    }

    htmlTokens.append({
      type: element.type,
      source: element.source
    });
  }

  tokenList.destroy();
  currentNode = null;

  // console.log(htmlTokens.toArray());

  return htmlTokens;

  function joinStartTag() {

    var element = currentNode.element;
    var htmlNode = {
      source: element.source,
      type: 'START',
      tagName: element.source.substring(1).toLowerCase(),
      attr: {},
    };

    if (isUnaryTag(htmlNode.tagName)) {
      htmlNode.type = 'SINGLE';
    }

    var attr, key, value;

    while(true) {

      currentNode = currentNode.next;
      element = currentNode.element;

      if (element === null) {
        htmlNode.source += '>';
        break;
      }

      if (element.type === 'STARTTAG_CLOSE') {
        htmlNode.source += element.source;
        if (element.source === '/>') {
          htmlNode.type = 'SINGLE';
        }
        break;
      }

      if (element.type === 'ATTRIBUTE') {

        attr = element.source.split('=');
        key = attr[0].trim();
        if (attr.length > 2) {
          value = attr.slice(1).join('=');
        } else {
          value = attr[1] || '';
        }
        value = value.trim();

        htmlNode.attr[key] = decodeAttr(value);

        htmlNode.source += ' ' + key;
        if (value) htmlNode.source += '=' + value;

        continue
      }
    }
    
    htmlTokens.append(htmlNode);
  }

  function joinEndTag() {

    var element = currentNode.element;
    var htmlNode = {
      source: element.source,
      type: 'END',
      tagName: element.source.substring(2).toLowerCase(),
    };

    while(true) {

      currentNode = currentNode.next;
      element = currentNode.element;

      if (element === null || element.type === 'ENDTAG_CLOSE') {
        break;
      }
    }

    htmlNode.source += '>';
    htmlTokens.append(htmlNode);
  }

  function joinComment() {

    var element = currentNode.element;
    var htmlNode = {
      source: element.source,
      type: 'COMMENT',
    };

    while(true) {

      currentNode = currentNode.next;
      element = currentNode.element;

      if (element === null || element.type === 'COMMENT_CLOSE') {
        break;
      } else {
        htmlNode.source += element.source;
      }
    }

    htmlNode.source += '-->';
    htmlTokens.append(htmlNode);
  }

  function joinCndtComment() {

    var element = currentNode.element;
    var htmlNode = {
      source: element.source,
      type: 'CNDT_COMMENT',
    };

    while(true) {

      currentNode = currentNode.next;
      element = currentNode.element;

      if (element === null) {
        htmlNode.source += '>';
        break
      } else if (element.type === 'CNDT_COMMENT_CLOSE') {
        htmlNode.source += element.source;
        break
      } else {
        htmlNode.source += element.source;
      }
    }

    htmlTokens.append(htmlNode);
  }

  function mergeText() {

    var element = currentNode.element;
    var htmlNode = {
      source: element.source,
      type: 'TEXT',
    };

    while(true) {

      currentNode = currentNode.next;
      element = currentNode.element;

      if (element === null) break;

      if (element.type === 'TEXT') {
        htmlNode.source += element.source;
        continue
      }

      if (element.type !== 'TEXT') {
        currentNode = currentNode.prev;
        break
      }
    }

    htmlTokens.append(htmlNode);
  }
}

// 可以没有闭标签的元素
var canBeLeftOpenTag = makeMap(
  'colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr,source'
);

// 非短语标签（不可以嵌套在 p 标签中的标签）
var isNonPhrasingTag = makeMap(
  'address,article,aside,base,blockquote,body,caption,col,colgroup,dd,' +
  'details,dialog,div,dl,dt,fieldset,figcaption,figure,footer,form,' +
  'h1,h2,h3,h4,h5,h6,head,header,hgroup,hr,html,legend,li,menuitem,meta,' +
  'optgroup,option,param,rp,rt,source,style,summary,tbody,td,tfoot,th,thead,' +
  'title,tr,track'
);

function connectAndClean (tokens) {

  var currentNode = tokens.head;
  var element, tagName;
  var stack = [];
  var pos, node, lastNode = null, lastTag = '';

  while(true) {

    currentNode = currentNode.next;
    element = currentNode.element;
    if (!element) break;

    if (element.type === 'START') {
      tagName = element.tagName;

      if (lastTag === 'p' && isNonPhrasingTag(tagName)) {
        endTag('p');
      }

      if (lastTag && canBeLeftOpenTag(lastTag) && lastTag === tagName) {
        endTag(lastTag);
      }
      
      stack.push(currentNode);
      lastNode = currentNode;
      lastTag = tagName;
    }

    if (element.type === 'END') {
      tagName = element.tagName;

      for (pos = stack.length - 1; pos >= 0; pos--) {
        if (stack[pos].element.tagName === tagName) {
          break
        }
      }

      if (pos >= 0) {
        // Close all the open elements, up the stack
        for (var i = stack.length - 1; i > pos; i--) {
          node = new ListNode({
            source: '</' + stack[i].element.tagName + '>',
            type: 'END',
            tagName: stack[i].element.tagName,
          });
          node.insertBefore(currentNode);

          node.mate = stack[i];
          stack[i].mate = node;
        }

        currentNode.mate = stack[pos];
        stack[pos].mate = currentNode;

        // Remove the open elements from the stack
        stack.length = pos;
        lastNode = stack[pos - 1] || null;
        lastTag = lastNode && lastNode.element.tagName;

      } else if (tagName === 'br') {

        currentNode.element = {
          source: '<br>',
          type: 'SINGLE',
          tagName: 'br',
          attr: {},
        };

      } else if (tagName === 'p') {

        node = new ListNode({
          source: '<p>',
          type: 'START',
          tagName: 'p',
          attr: {},
        });
        node.insertBefore(currentNode);

        node.mate = currentNode;
        currentNode.mate = node;
      } else {
        currentNode = currentNode.prev;
        currentNode.next.remove();
      }
    }
    continue
  }

  // console.log(tokens.toArray());
  for (var i = 0; i < stack.length; i++) {
    stack[i].remove();
  }
  return tokens;

  function endTag(tagName) {
    var node = new ListNode({
      source: '</' + tagName + '>',
      type: 'END',
      tagName: tagName,
    });

    node.insertBefore(currentNode);

    node.mate = lastNode;
    lastNode.mate = node;

    stack.length--;
    if (stack.length) {
      lastNode = stack[stack.length - 1];
      lastTag = lastNode.element.tagName;
    } else {
      lastNode = null;
      lastTag = '';
    }
  }
}

window.parseHTML = function(html) {
  var tokens = parse(html);
  return connectAndClean(joinTags(tokens));
}

})(window, _);
