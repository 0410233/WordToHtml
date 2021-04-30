;(function( window, _, undefined ) {

  var log = console.log;

  var 
    //空白字符
    whitespace = "[\\x20\\t\\r\\n\\f]",

    //html 纯字符串
    //htmlString = "[^<>]+",

    //html 注释
    htmlComment = "<!--[\\s\\S]*?-->",

    //<![if ...]>
    msIf = "<!\\[if(?:" + whitespace + "+.*?)?\\]>",

    //<![endif]>
    msEndif = "<!\\[endif\\]>",

    //标签名
    tagname = "(?:\\w+|\\w+:\\w+)",

    //属性名
    identifier = "(?:\\\\.|[\\w-]|[^\0-\\xa0])+",

    //属性
    attribute = identifier + "(?:" +

      //匹配有属性值的属性
      whitespace + "*=" + whitespace + "*(?:" + 
        "\"[^\"]*\"" + //带双引号
        "|'[^']*'" + //带单引号
        "|" + identifier + ")" + //不带引号

      //匹配没有属性值的情况
      "|(?=" + whitespace + "+|>)" + 

    ")",

    //开标签
    startTag = "<" + tagname + "(?:" + whitespace + "+" + attribute + ")*" + whitespace + "*>",

    //闭标签
    endTag = "<\\/" + tagname + whitespace + "*>";

  var identifier = "(?:\\\\.|[\\w-]|[^\0-\\xa0])+";
  var theEnd = "(?=\\s+|$)";
  var attribute = identifier + "(?:" + 

      //匹配单独的（没有赋值的）属性
      theEnd + "|" + 

      //匹配有赋值符号的属性
      "\\s*=\\s*" + "(?:" +
      
        //有赋值符号（ = ），但没有属性值
        theEnd + "|" + 

        //有属性值，且属性值由单引号包裹
        "'(?:\\\\.|[^\\\\'])*'" + "|" + 

        //有属性值，且属性值由双引号包裹
        "\"(?:\\\\.|[^\\\\\"])*\"" + "|" + 

        //有属性值，且属性值裸露（没有被任何引号包裹）
        identifier + 

      ")" + 

    ")";

  function tokenizer( html ) {

    var tokens = [], opentags = [];
    var re = /^[^<>]+|^<!--[\s\S]*?-->|^<[^>]*>/;

    while( html ) {

      html = html.replace(re, function(match) {

        var index = tokens.length;
        var token = new HtmlToken(match);
        var mate = null;

        switch(token.TYPE) {

          case 'string':
          case 'comment':
          case 'other':
            tokens.push(token);
            break;

          //如果是 opentag 则放入 opentags 数组
          //以备后续查找
          case 'opentag':
            tokens.push(token);
            opentags.push(token);
            break;

          //如果是 closetag 则查找 opentags 数组
          //如果找到了匹配的 opentag 则配对两个标签
          //如果找不到，则该 closetag 是一个错误的存在，忽略之
          case 'closetag':
            for (var i = opentags.length-1; i > -1; i--) {
              if(opentags[i].TAGNAME === token.TAGNAME) {
                mate = opentags[i];
              }
            }
            if (mate) {
              tokens.push(token);

              token.mate = mate;
              mate.mate = token;

              opentags.splice(i, 1);
            }
            break;

          default:
            break;
        }

        token = null;
        mate = null;

        return '';
      });
    }

    opentags = null;

    var prev = null;
    _.each(tokens, function(token) {

      token.prev = prev;
      if (prev) prev.next = token;
      prev = token;
      
      if (token.mate === null) {
        token.TYPE = 'single';
      }
    });

    //single and other
    // log('Singles and others:');
    // log(_.filter(tokens, function(token) {
    //   return (token.TYPE === 'single' || token.TYPE === 'other');
    // }));

    return tokens;
  }

  //移除一个标签，包括头尾和内容
  function removeTags(){}

  //移除一个或一对标签，仅头尾标签，保留内容
  function stripTags(){}

  //插入
  function insert(){}

  //生成一个 htmltoken
  function HtmlToken( content ) {

    this.init(content);

    return this;
  }

  var _htp = HtmlToken.prototype;

  _htp.init = function(content) {

    this._source = content;
    this._content = '';
    this._hidden = false;

    var res = {
      string: /^[^<>]+$/,
      comment: /^<!--[\s\S]*?-->$/,
      opentag: /^<(?<NAME>[\w:]+)(?<ATTR>[^>]*)>$/,
      closetag: /^<\/(?<NAME>[\w:]+)>$/,
      other: /^[\s\S]+$/
    };

    var keys = _.keys(res);
    var key, match, group, attr;

    for (var i = 0; i < keys.length; i++) {
      
      key = keys[i];
      if (match = content.match(res[key])) {

        this.TYPE = key;

        switch(key) {
          case 'string':
          case 'comment':
          case 'other':
            this._content = this._source;
            break;

          case 'opentag':
          case 'closetag':
            group = match['groups'];
            this.TAGNAME = group['NAME'].toLowerCase();
            this.mate = null;
            if (key === 'opentag') {
              this.Attributes = new AttrList(group['ATTR'] || '');
            }
            break;

          default:
            this._content = this._source;
            break;
        }
        break;
      }
    }

    if (!this.TYPE) this.hide();

    return this;
  };

  _htp.hide = function() {
    this._hidden = true;
    if (this.mate) this.mate.hide();
    return this;
  };

  _htp.isHidden = function() {
    return this._hidden;
  };

  _htp.setContent = function( content ) {
    if (this.TYPE === 'string') {
      this._content = content;
    }
  };

  _htp.getContent = function() {

    if (this.isHidden()) return '';
    
    switch(this.TYPE) {
      case 'opentag':
        var attr = this.Attributes.VALUE;
        return '<' + this.TAGNAME + (attr && ' '+attr) + '>';

      case 'closetag':
        return '</' + this.TAGNAME + '>';

      default:
        return this._content;
    }
  };

  _htp.getSource = function() {
    return this._source;
  };

  // 生成一个属性列表对象
  function AttrList(attr) {
    this.init(attr);
    return this;
  }

  var AL_proto = AttrList.prototype;

  // 初始化
  AL_proto.init = function(attributes) {

    if (_.isArray(attributes)) {
      attributes = _.object(attributes);
    }
    
    if (_.isObject(attributes)) {

      this._list = attributes;
      this._splitStyle();
      this._join();

    } else if (_.isString(attributes)) {

      this.VALUE = attributes.trim();
      this._split();

    } else {

      this._list = {};
      this.VALUE = '';
    }

    return this;
  };

  AL_proto.pick = function() {
    var keep = _.flatten(_.toArray(arguments));
    this._list = _.pick(this._list, keep);
    this._splitStyle();
    this._join();
    return this;
  };

  AL_proto.has = function(key) {
    return _.has(this._list, key);
  };

  // 修改或获取属性值
  AL_proto.attr = function(key, value) {

    if (value || value === '') {
      this._list[key] = value;
      if (key === 'style') this._splitStyle();
      this._join();
      return this;
    }
    return this._list[key];
  };

  // 删除属性
  AL_proto.remove = function(key) {
    if (key && _.has(this._list, key)) {
      delete this._list[key];
      this._join()._split();
    }
    return this;
  };

  //
  AL_proto.each = function( callback ) {

    _.each(_.pairs(this._list), function(item) {
      callback.apply(null, item);
    });

    this._splitStyle();
    this._join();

    return this;
  };

  // 将属性列表重新组合为字符串
  AL_proto._join = function() {

    //_.pairs 用于将一个 Object 变换为 [[key, value], ... ] 形式的数组
    this.VALUE = _.reduce(_.pairs(this._list), function(attributes, item) {

      var key = item[0], value = item[1];

      //合并 style
      if (key === 'style') { 
        value = _.reduce(_.pairs(value), function(style, item) {
          return style + item.join(':') + ';';
        }, '');
      }
      value = '"' + value + '"';

      return attributes + ' ' + key + '=' + value;

    }, '');

    this.VALUE = this.VALUE.trim();

    return this;
  };

  // 分解 style 
  AL_proto._splitStyle = function( style ) {

    if (!(_.has(this._list, 'style'))) return this;

    var style = this._list['style'];
    var styleList = {};

    if (_.isObject(style)) {

      styleList = style;

    } else if (_.isArray(style)) {

      styleList = _.object(style);

    } else if (_.isString(style) && style.trim()) {

      var styleItem, styleName, styleValue;
      style = style.trim().split(';');

      for (var i = 0; i < style.length; i++) {

        if (!style[i]) continue;

        styleItem = style[i].split(':');

        styleName = styleItem[0].toLowerCase().trim();
        if (!styleName) continue;

        styleValue = '' + (styleItem[1] || '');

        styleList[styleName] = styleValue.trim();
      }
    }

    this._list['style'] = styleList;

    return this;;
  };

  // 分解属性列表
  AL_proto._split = function() {

    this._list = {};

    var attr = this.VALUE;

    var identifier = "(?:\\\\.|[\\w-]|[^\0-\\xa0])+";
    var theEnd = "(?=\\s+|$)";
    var attributes = identifier + "(?:" + 

        //匹配单独的（没有赋值的）属性
        theEnd + "|" + 

        //匹配有赋值符号的属性
        "\\s*=\\s*" + "(?:" +
        
          //有赋值符号（ = ），但没有属性值
          theEnd + "|" + 

          //有属性值，且属性值由单引号包裹
          "'(?:\\\\.|[^\\\\'])*'" + "|" + 

          //有属性值，且属性值由双引号包裹
          "\"(?:\\\\.|[^\\\\\"])*\"" + "|" + 

          //有属性值，且属性值裸露（没有被任何引号包裹）
          identifier + 

        ")" + 

      ")";

    var reAttr = new RegExp(attributes, 'g');
    var match = attr.match(reAttr);

    if (match) {

      var attrList = {};
      var attrItem, attrName, attrValue;

      for (var i = 0; i < match.length; i++) {

        attrItem = match[i];
        if (!attrItem) continue;

        attrItem = attrItem.split('=');

        attrName = attrItem[0].toLowerCase().trim();
        if (!attrName) continue;

        attrValue = attrItem[1] || '';
        attrValue = attrValue.replace(/^\s*(['"])(.*?)\1\s*$/, '$2').replace(/"/g, "'").trim();

        attrList[attrName] = attrValue;
      }

      this._list = attrList;
      attrList = null;
    }

    this._splitStyle();

    return this;
  };

  window.HtmlTokenizer = tokenizer;

})( window, _ );