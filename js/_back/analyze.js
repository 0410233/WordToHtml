;(function(window, document, analyze) {

  window.addEventListener('DOMContentLoaded', function() {

    function getById( id ) {
      return document.getElementById(id);
    }

    var input       = getById('inarea'),
        output      = getById('outarea'),
        analyzeBtn  = getById('analyze'),
        clearBtn    = getById('clear');

    analyze( input );

    analyzeBtn.onclick = function() {
      output.value += input.simplifyWords();
      input.value = '';
    };

    clearBtn.onclick = function() {
      output.value = '';
    };

  });

})(window, document, function() {

  var log = console.log;

  if (typeof String.prototype.trim !== 'function'){
    String.prototype.trim = function(){
      return this.replace(/^\s*|\s*$/g, '');
    }
  }

  //是否为空字符串
  function isEmpty(s){
    return ( ( typeof s == 'string' && /^\s*$/.test(s) ) || typeof s == 'undefined' || s===null );
  }

  //测试标签和空白都去掉后是否为空
  function isEmptyHTML(s){
    return !s || ( typeof s === 'string' && /^\s*$/.test( s.replace(/<[^>]*>/g, '') ) );
  }

  //增强的 trim 函数
  function exTrim(s, charset){

    if (!charset) {
      return s.trim();
    } else {
      charset = charset.replace(/\//g, '\\/').replace(/\\/g, '\\\\');

      var reg = new RegExp('^['+charset+']*|['+charset+']*$', 'ig');

      return s.trim().replace(reg, '');
    }
  }

  //字符实体转为字符
  function entityToString(entity){
    var div = document.createElement('div');
    div.innerHTML = entity;
    var res = div.innerText||div.textContent;
    return res;
  }

  //获取 html 文档的 <body> 标签内容
  function getBody( content ) {
    if (/<body\b[^>]*>([\s\S]*?)<\/body>/i.test(content)) {
      return RegExp['$1'];
    }
    return content;
  }

/*
  if (!Array.isArray) {
    Array.isArray = function(arg) {
      return Object.prototype.toString.call(arg) === '[object Array]';
    };
  }

  function isArray(obj) {
    return Array.isArray(obj);
  }

  //
  function indexOf(array, value) {
    if (!isArray(array) || !array.length) {
      return -1;
    }

    for (var i = 0; i < array.length; i++) {
      if(array[i] === value) return i;
    }

    return -1;
  }

  function lastIndexOf(array, value) {
    if (!isArray(array) || !array.length) {
      return -1;
    }

    for (var i = array.length-1; i >= 0; i-) {
      if(array[i] === value) return i;
    }

    return -1;
  }

  //正则包装
  function refnWrap(source, flag) {

    if (!flag || typeof flag !== 'string') {
      return '(' + source + ')';
    }

    if (flag == '?:' || flag == '?!') {
      return '(' + flag + source + ')';
    }

    if (/^\w+$/.test(flag)) {
      return '(?<' + flag + '>' + source + ')';
    }

    return '(' + source + ')';
  }

  //生成一个用于匹配标签的正则（字符串）
  function refnTag( tagName, type ) {
    tagName = tagName || '\\w+';
    type = type || 'left';
    switch(type) {
      case 'left':
        return '<tagName\\b[^>]*>';

      case 'right':
        return '<\\/tagName>';

      case 'all':
      default:
        return '<\\/?tagName\\b[^>]*>';
    }
  }
*/

  //
  function Words(msword) {

    this.origin = msword;

    var content = getBody(msword);
    content = content.replace(/[\n\r]/g, ' ').replace(/ {2,}/g, ' ');

    this.content = content;
    this.trimTags();

    return this;
  }

  var _prototype = Words.prototype;

  _prototype.do = function( fn ) {

    log('Open: '+fn);

    this[fn]();

    log('End: '+fn);

    return this;
  };

  //清除标签内的空格
  _prototype.trimTags = function() {

    var content = this.content;

    content = content.replace(/<(.*?)>/g, function($0, $1) { 
      return '<'+$1.trim().replace(/^\/\s+/, '/')+'>'; 
    });

    this.content = content;

    return this;
  };

  //清除标签内容中的空格
  _prototype.trimInner = function() {

    var content = this.content;

    while(/<\w+[^>]*>\s+/.test(content) || /\s+<\/\w+>/.test(content)) {
      content = content.replace(/(<\w+[^>]*>)(\s+)/g, '$2$1').replace(/(\s+)(<\/\w+>)/g, '$2$1');
    }

    this.content = content;

    return this;
  };

  //合并空白字符
  _prototype.mergeSpace = function() {

    var content = this.content;

    content = content.replace(/(\s){2,}/g, '$1');

    this.content = content;

    return this;
  };

  //替换中文符号
  _prototype.chrReplace = function() {

    var content = this.content;

    content = content.replace(/([【】（）：“”‘’；、，。？！])/g, function($0, $1) {
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

    this.content = content;

    return this;
  };

  //清除注释 和 <![if ...]><![endif]> 结构
  _prototype.clearComments = function() {

    var content = this.content;

    //清除注释
    content = content.replace(/<!--[\s\S]*?-->/g, '');

    //清除 <![if ...]><![endif]> 结构
    content = content.replace(/<!\[if [^\]]*?\]>[\s\S]*?<!\[endif\]>/ig, '');

    this.content = content;

    return this;
  };

  //清除 o:p font div a 标签，仅清除标签，保留内容
  _prototype.clearUselessTags = function() {

    var content = this.content;

    var uselessTags = ['o:\\w+', 'font', 'div', 'a'];
    var reUselessTags = new RegExp('<\\/?(' + uselessTags.join('|') + ')[^>]*>', 'ig');

    content = content.replace(reUselessTags, '');

    this.content = content;

    return this;
  };

  //清除无用属性
  //仅保留 usefullProperties 列表中的属性
  _prototype.cleanProperties = function() {
    
    var content = this.content;

    var usefullProperties = ['style', 'colspan', 'rowspan'];
    var reUsefullProperties = RegExp('^\\s*(' + usefullProperties.join('|') + ')\\s*=', 'i');

    content = content.replace(/<(\w+)(\s+[^>]*)>/g, function(match, tagName, propList) {

      var properties = propList.match(/\b\w+=[^'"\s]+|\b\w+='[^']*'|\b\w+="[^"]*"/g);
      var trimmed = '';

      if (properties) {
        for (var i = 0; i < properties.length; i++) {
          if (reUsefullProperties.test(properties[i])) {
            trimmed += properties[i]+' ';
          }
        }
        trimmed = trimmed.trim();
      }

      return '<' + tagName + (trimmed ? ' '+trimmed : '') + '>';
    });

    this.content = content;
    this.trimTags();

    return this;
  };

  //修剪 style 属性
  //当 mso-list 存在时，保留 margin-left
  //保留 color
  //其余都清除
  _prototype.cleanStyle = function() {

    var content = this.content;

    content = content.replace(/<(\w+)([^>]*)>/ig, function(match, tagName, propList) {

      tagName = tagName.toLowerCase();

      propList = propList.replace(/\s+style\s*=\s*(['"])(.*?)\1/i, function($0, $1, styleContent) {

        var _style = '';
        if (styleContent.indexOf('mso-list') > -1 || (tagName == 'span' && styleContent.indexOf('color') > -1)) {
          var css = styleContent.split(';');
          for (var i = 0; i < css.length; i++) {
            if (/^\s*margin-left:/i.test(css[i])) {
              _style += ' style-list="' + parseFloat((css[i].split(':'))[1]) + '"';
            } else if (/^\s*color:/i.test(css[i])) {
              _style += ' style-color="' + (css[i].split(':'))[1].trim() + '"';
            }
          }
        }

        return _style;
      });

      return '<'+tagName+propList+'>';
    });

    this.content = content;
    this.trimTags();

    return this;
  };

  //整理备注信息（Memo）
  _prototype.clearMemos = function() {

    var content = this.content;
    
    //若存在嵌套的备注 ( 形如 [...[...]...] ，误输入造成 ) ，取内部的
    while(/\[[^\]]*\[|\][^\[]*\]/.test(content)) {
      content = content.replace(/\[([^\]]*\[)/g, '$1').replace(/(\][^\[]*)\]/g, '$1');
    }

    //整理 memo 内部
    content = content.replace(/\[([^\[\]]*)\]/g, function($0, memo) {

      var tokens = [];

      var memo2 = memo;

      while( !(/^$/.test(memo)) ) {

        if (/^[^<>]+/.test(memo)) {
          memo = memo.replace(/^[^<>]+/, function($0) {
            tokens.push({
              type: 'string',
              content: $0
            });
            return '';
          });
        }

        if (/^<\w+[^>]*>/.test(memo)) {
          memo = memo.replace(/^<(\w+)[^>]*>/, function($0, tagName) {

            tagName = tagName.toLowerCase();
            if (tagName === 'img' || tagName === 'br') return ' ';

            tokens.push({
              type: 'opentag',
              tagName: tagName,
              content: $0
            });

            return '';
          });
        }

        if (/^<\/\w+>/.test(memo)) {
          memo = memo.replace(/^<\/(\w+)>/, function($0, tagName) {
            tagName = tagName.toLowerCase();
            tokens.push({
              type: 'closetag',
              tagName: tagName,
              content: $0
            });
            return '';
          });
        }
      }

      log(tokens);

      var opentags = [], closetags = [];
      var node, index;

      for (var i = 0; i < tokens.length; i++) {
        node = tokens[i];
        if (node.type === 'opentag') {
          opentags.push(node.tagName);
        } else if (node.type === 'closetag') {
          index = opentags.lastIndexOf(node.tagName);
          if (index > -1) {
            opentags.splice(index, 1);
          } else {
            closetags.push(node.tagName);
          }
        }
      }

      var openBracketLeft = '',
        openBracketRight = '',
        closeBracketLeft = '',
        closeBracketRight = '';

      

      memo = memo2;

      //清除 img 和 br 标签
      memo = memo.replace(/<(img|br)\b[^>]*>/ig, '');

      //清除完全处于备注内部的标签
      while(/<(\w+)[^>]*>.*?<\/\1>/.test(memo)) {
        memo = memo.replace(/<(\w+)[^>]*>(.*?)<\/\1>/g, '$2');
      }

      log('B: '+memo);
      
      /* 有问题 */
      //将半处于内部的标签的左/右标签移出到备注外面
      while(/\[[^\]<>]*<\/\w+[^>]*>|<\w+[^>]*>[^\]<>]*\]/.test(memo)) {
        memo = memo.replace(/\[([^\]<>]*)(<\/\w+[^>]*>)/, '$2[$1');
        memo = memo.replace(/(<\w+[^>]*>)([^\]<>]*)\]/, '$2]$1');
      }

      log('A: '+memo);

      return memo;
    });

    //将备注清除，或转为标记
    //锚点标记: [#...]
    //链接标记: [/...]
    //标题标记: [H1-6]
    content = content.replace(/\[[^\[\]]*\]/g, function(memo) {
      if (/\[\s*(#|\/|H[1-6])/i.test(memo)) {
        return memo.replace(/\[(.*?)\]/, function(match, inner) {
          return '{{~mark:' + inner.trim() + '}}';
        });
      }
      return '';
    });

    this.content = content;

    return this;
  };

  //标记
  _prototype.completeMarks = function() {

    var content = this.content;

    //剥除仅包裹 {{~mark:...}} 的标签
    var reHasMark = /<(\w+)[^>]*>\s*\{\{~mark:.*?\}\}\s*<\/\1>/i;
    while(reHasMark.test(content)) {
      content = content.replace(/<(\w+)[^>]*?>(?<mark>\s*\{\{~mark:.*?\}\}\s*)<\/\1>/ig, '$<mark>');
    }

    this.content = content;
    this.trimInner();

    content = this.content;

    //形如 <tag>...content{{~mark:...}}</tag>
    //变形为 <tag>{{mark:...}}...content{{/mark}}</tag>
    var reMarkInner = /(?<tag><(?<tagname>\w+)[^>]*>)(?<content>(.(?!<\/?\k<tagname>\b[^>]*>))*?)\{\{~mark:(?<mark>[^\}]*)\}\}<\/\k<tagname>>/ig;
    content = content.replace(reMarkInner, '$<tag>{{mark:$<mark>}}$<content>{{/mark}}</$<tagname>>');

    //形如 <tag>...content</tag>{{~mark:...}}
    //变形为 {{mark:...}}...content{{/mark}}
    var reMarkOuter = /<(?<tagname>\w+)[^>]*>(?<content>\s*|(.(?!<\/?\k<tagname>\b[^>]*>))*.)<\/\k<tagname>>(?<space>[\s\.,?;'"!]*)\{\{~mark:(?<mark>[^\}]*)\}\}/ig;
    content = content.replace(reMarkOuter, '{{mark:$<mark>}}$<content>{{/mark}}$<space>');

    //形如 <tag>...content{{~mark:...}}...
    //变形为 <tag>{{mark:...}}...content{{/mark}}...
    var reMarkInner2 = /(?<tag><(?<tagname>\w+)[^>]*>)(?<content>(.(?!<\/?\k<tagname>\b[^>]*>))*?)\{\{~mark:(?<mark>[^\}]*)\}\}/ig;
    content = content.replace(reMarkInner2, '$<tag>{{mark:$<mark>}}$<content>{{/mark}}');


    //剥除仅包裹 {{mark:...}}...content{{/mark}} 的标签
    var reRemoveWrapper = /<(b|u|i|span|em)\b[^>]*>\s*\{\{mark:[^\}]*\}\}.*?\{\{\/mark\}\}\s*<\/\1>/i;
    while(reRemoveWrapper.test(content)) {
      content = content.replace(/<(b|u|i|span|em)\b[^>]*>(?<mark>\s*\{\{mark:[^\}]*\}\}.*?\{\{\/mark\}\}\s*)<\/\1>/ig, '$<mark>');
    }

    //剥除包裹在 {{mark:...}}...content{{/mark}} 内部的标签
    //形如 {{mark:...}}<tag>...content</tag>{{/mark}}
    var retRemoveInnerWrapper = /\{\{mark:[^\}]*\}\}<(?<tagname>\w+)[^>]*>(?:\s*|(?:.(?!<\/?\k<tagname>\b[^>]*>))*.)<\/\k<tagname>>\s*\{\{\/mark\}\}/i;
    var repRemoveInnerWrapper = /(?<mark>\{\{mark:[^\}]*\}\})<(?<tagname>\w+)[^>]*>(?<inner>\s*|(.(?!<\/?\k<tagname>\b[^>]*>))*.)<\/\k<tagname>>(?<space>\s*)\{\{\/mark\}\}/ig;

    while(retRemoveInnerWrapper.test(content)) {
      content = content.replace(repRemoveInnerWrapper, '$<mark>$<inner>{{/mark}}$<space>');
    }

    content = content.replace(/(\{\{mark:[^\}]*\}\})(\s*)/ig, '$2$1').replace(/(\s*)(\{\{\/mark\}\})/ig, '$2$1');

    this.content = content;

    return this;
  };

  //将相邻的行内元素（b, u, i 等）融合
  _prototype.mergeTags = function() {

    var content = this.content;
    
    while(/<\/(b|u|i|em|strong|small)>\s*<\1\b[^>]*>/i.test(content)) {
      content = content.replace(/<\/(b|u|i|em|strong|small)>(\s*)<\1\b[^>]*>/ig, '$2');
    }

    this.content = content;

    return this;
  };

  //简化 span
  _prototype.cleanSpan = function() {

    var content = this.content;

    //确保 span 是最靠内的标签，直接接触文字，内部不会再出现其他标签
    while(/<span\b[^<>]*>[^<>]*<span\b[^<>]*>/i.test(content)) {
      content = content.replace(/(<span\b[^<>]*>[^<>]*)(<span\b[^<>]*>)/ig, '$1</span>$2');
    };

    while(/<span\b[^<>]*>[^<>]*<\w+[^<>]*>/i.test(content)) {
      content = content.replace(/(?<span><span\b[^<>]*>)(?<content>[^<>]*)(?<tag><\w+[^<>]*>)/ig, function() {
        var group = arguments.slice(-1)[0];

      });
    };

    //判断是否存在两个连续的 span
    var retSpanSpan = /(<span\b[^>]*>)[^<>]*<\/span>\s*\1/i;

    //合并连续的 span
    var repSpanSpan = /(?<span><span\b[^>]*>)(?<content>[^<>]*)<\/span>(?<space>\s*)\1/ig;


    //判断是否存在形如 <tag><span>...content</span></tag> 的 span
    var retTagSpan = /<(\w+)[^>]*>\s*<span\b[^>]*>[^<>]*<\/span>\s*<\/\1>/i;

    //清除 <tag><span>...content</span></tag> 结构中的 span 标签
    var repTagSpan = /(?<tag><(?<tagname>\w+)[^>]*>\s*)<span\b[^>]*>(?<content>[^<>]*)<\/span>(?<space>\s*)<\/\k<tagname>>/ig;

    

    //同时判断，同时处理
    while(retSpanSpan.test(content) || retTagSpan.test(content)) {
      content = content.replace(repSpanSpan, '$<span>$<content>$<space>');
      content = content.replace(repTagSpan, '$<tag>$<content>$<space></$<tagname>>');
      //content = content.replace(repWrapOuter, '$<content>');
    }

    this.content = content;

    return this;
  };

  //清除所有 span 标签
  _prototype.clearSpan = function() {

    var content = this.content;

    content = content.replace(/<\/?span\b[^>]*>/ig, '');

    this.content = content;

    return this;
  };

  //清理空标签，仅清除标签，保留内容
  //空的 p 标签会被替换为 br 标签
  //被其他标签包裹的 br 标签会被当作空标签清除
  //而未被其他标签包裹的 br 则保留
  _prototype.clearEmptyTags = function() {

    var content = this.content;

    content = content.replace(/&nbsp;/g, ' ');
    var reEmptyTag = /<(\w+)[^>]*>(<br(\s*\/)?>|\s)*<\/\1>/g;

    while (reEmptyTag.test(content)) {
      content = content.replace(/<p[^>]*>\s*<\/p>/ig, '<br>');
      content = content.replace(/<(\w+)[^>]*>(<br(\s*\/)?>|\s)*<\/\1>/g, ' ');
    }

    this.content = content;

    return this;
  };

  //主函数
  _prototype.simplify = function() {

    log('simplify');

    //将标签内头尾空白字符移出到标签外

    //空白的 td th 应该保留
    //为了保留空白的 td th ，应该处理一下 img 标签

    //清除注释，清除无用标签，替换中文符号
    this.do('clearComments').do('clearUselessTags').do('chrReplace');

    //清理不需要的属性, 简化 style
    this.do('cleanProperties').do('cleanStyle');

    //清理标签，包括：清除空标签，合并相邻的行内标签，简化 span 标签
    //this.do('cleanTags');

    //<span\b[^>]*>[^<>]*<(b|i|u)\b[^>]*>[^<>]*<\/\1>[^<>]*</span>

    log(this.content);

    //清理空标签
    this.do('clearEmptyTags');

    //清理备注（以[]包裹的文字）
    //清除，或转为标记
    this.do('clearMemos');

    log(this.content);

    //整理行内标签：合并，简化
    this.do('cleanSpan').do('mergeTags');

    //log('Before Remark: '+this.content);

    //处理标记（ {{~mark:...}} ）
    //找到标记对应的内容，然后变换标记将其包裹起来
    this.do('completeMarks');

    //log('After Remark: '+this.content);



    //清理所有 span
    this.do('clearSpan');

    //再次整理行内标签：合并，简化
    this.do('mergeTags');

    //清理标签及内容两端的空白字符，合并空白字符
    this.do('trimTags').do('trimInner').do('mergeSpace');

    return this;
  };

  return function( elem ) {

    elem.simplifyWords = function() {

      var words = this.words;

      if (words && words instanceof Words) {
        words.simplify();
        return words.content;
      }

      return '';
    };

    elem.addEventListener('paste', function(e){
      this.words = new Words(e.clipboardData.getData('text/html'));
      log( this.words.origin );
    });
  }
}());



///////////////////////////////////////////////////////////////////////////////////

/* 第一版的代码 */

function _ver1() {

  //替换用正则列表
  var replist = [
      ['[\\n\\r]+', 'g', '\n'],
      ['[：]', 'g', ':'],
      ['\\s*(显示名称)\\s*[:]+\\s*', 'g', '{title}'],
      ['\\s*(图片名称|图片名|名称)\\s*[:]+\\s*', 'g', '{name}'],
      ['\\s*(描述)\\s*[:]+\\s*', 'g', '{desc}'],
      ['\\s*(\\salt\\s*[:]+\\s*)', 'ig', '{alt}'],
      ['\\s*[\\uf06c\\uf06e\\uf075]\\s*', 'g', '{li}']
    ],

    reglist = {
      img: '\\{name\\}(.*?\\.jpg)\\s+\\{alt\\}(.*?)\\s+\\{desc\\}(.*?)\\s*$',
      list: '\\{li\\}\\s*(.*?)(?=\\s*\\{li\\}|\\{end\\})',
      segColon: '((.*?)[:])?(.*?)$'
    },

    newRegList = [
      {
        tag: 'name',
        exp: /{name}([^{}]*?{)/,
        reg: new RegExp('\\{name\\}([^\\{\\}]*?)\\{')
      },
      {
        tag: 'alt',
        reg: new RegExp('\\{alt\\}([^\\{\\}]*?)\\{')
      },
      {
        tag: 'desc',
        reg: new RegExp('\\{desc\\}([^\\{\\}]*?)\\{'),
        fn: function(s){
          var arr = /(([^:]*?)[:])?([^:]*?)$/.exec( s.trim().replace(/\s*:\s*/, ':') );
          return ( arr[2] ? '<b>'+arr[2]+':</b> ' : '' ) + arr[3];
        }
      },
      {
        tag: 'title',
        reg: new RegExp('\\{title\\}([^\\{\\}]*?)\\{')
      }
    ],

    // 函数列表
    fn = {
      img: function(c){

        var template = ''
            + '<div>'
            +   '<img src="/{path}/{name}" alt="{alt}">'
            +   '<p>{desc}</p>'
            + '</div>';

        return imgAnalyze2(c, template);
      },

      gallery: function(c){

        var template = ''
            + '<li>'
            +   '<img src="/{path}/{name}" alt="{alt}">'
            +   '<p>{desc}</p>'
            + '</li>';
        return imgAnalyze2(c, template);
      },

      lightbox: function(c){

        var imgset = $(c).children('div');
        var lightbox = '';

        var group = 'lb_'+String(Math.random()).substr(2,5);

        imgset.each(function(){
          var img = $(this).find('img'),
            p = $(this).find('p');

          var src = img.attr('src'),
            alt = img.attr('alt'),
            p_text = p.text(),
            p_html = p.html();

            lightbox = lightbox
              + '<div>'
              +   '<a rel="nofollow" href="'+src+'" data-lightbox="'+group+'" title="'+p_text+'">'
              +     '<img src="'+src+'" alt="'+alt+'">'
              +   '</a>'
              +   '<p>'+p_html+'</p>'
              + '</div>';
        });

        // lightbox = 

        return '<div class="img-set">'+lightbox+'</div>';

      },

      masonry: function(c){

        var template = ''
            + '<div class="figure">'
            +   '<img src="/{path}/{name}" alt="{alt}" />'
            +   '<div class="figcaption">'
            +     '<div class="caption-text">'
            +       '<p class="cap-header">{title}</p>'
            +       '<p>{desc}</p>'
            +     '</div>'
            +   '</div>'
            + '</div>';

        return imgAnalyze2(c, template);
      },

      specification: function(c){

        var content = analyze();
        var result = '';
        $(content).each(function(){
          if (this.tagName === 'UL') {
            $(this).children('li').each(function(){

              var html = this.innerHTML.replace(/^\s*<b>(.*?)<\/b>([\s\S]*)$/i, '$1}{$2')
              if ( !(/^\}\{$/.test(html)) ) html += '}{';

              html = '{'+html+'}';
              result += html.replace(/^\{(.*?)\}\{([\s\S]*)\}$/, function($0, $1, $2){
                  return '<li><div>'+trim($1,':')+'</div><div>'+trim($2,':')+'</div></li>';
                })
            });

            return false;
          }
        });

        return '<div class="section specification"><h2>Specification</h2><ul class="spec-list">'+result+'</ul></div>';

      },

      list: function(c){

          var arr = lstAnalyze(c);
          var arr2 = [];
          var reg = new RegExp(reglist.segColon);
          var str = '<ul>';

          for (var i = 0; i < arr.length; i++) {
              arr2 = reg.exec(arr[i]);
              str += '<li>' + ( arr2[2] ? '<b>'+trim(arr2[2])+':</b> ' : '' ) + trim(arr2[3]) + '</li>'
          }
          str += '</ul>';
          return str;
      },

      table: function(c){
        var $s = $("#inarea_ifr").contents().find('table');
        if ($s.length === 0) {
            alert('无法识别表格');
            return '';
        }
        var $all = $s.find('*');
        $all.each(function() {
          var $this = $(this);
          if ( !this.hasChildNodes() ) { 
            $this.remove();
          } else {
            var as = this.attributes;
            var ss = '';
            for (var j = 0; j < as.length; j++) {
              if (as[j].name !== 'rowspan' && as[j].name !== 'colspan'){
                ss += as[j].name + ' ';
              }
            }
            $this.removeAttr(ss);
          }
        });

        var s = $s.html();
        s = s.replace(/<p>|<\/p>|<span>|<\/span>/g, '')         // 去除p和span标签
             .replace(/(<\/?)strong>/g, '$1b>')                 // 替换strong标签为b标签
             .replace(/\s{2,}/g, ' ')                              // 替换所有连续或不连续的空字符为单空格
             .replace(/(>)\s*(<)/g, '$1$2')                     // 去除所有标签间空格
             .replace(/\s*(<\/?)(tbody|thead|tfoot|caption|tr|td|th)(\s*[^><]*)\s{0,}(>)\s*/g, '$1$2$3$4')
             .replace(/\s*(<)(sub|sup)\s*(>)\s*/g, '$1$2$3')
             .replace(/\s*(<\/)(sub|sup)\s*(>)/g, '$1$2$3')
             .replace(/(<td)(\s*[^><]*>)\s*<b>(.*?)<\/b><\/td>/g, '<th$2$3</th>')
             .replace(/(<\/?tbody\s*[^><]*>)/g, '    $1\n')
             .replace(/(<\/?tr\s*[^><]*>)/g, '        $1\n')
             .replace(/(<t[dh]\s*[^><]*>)/g, '            $1')
             .replace(/(<\/t[dh]\s*[^><]*>)/g, '$1\n');

        s = '<table>\n' + s + '</table>';
        $("#inarea_ifr").contents().find('body').html('');
        
        return s;
      },

      auto: function (){

        return analyze();

      }
    };

  function analyze(){

    // 获取 body 标签内的内容
    var match = srcContent.match(/<body[^>]*>([\s\S]*?)<\/body>/);
    content = match? match[1] : '';

    //console.log(content);

    if (isEmpty(content)) {
      return '';
    }

    var space = ' ';

    //console.log('content_0: '+content);
    content = content

      //删除注释
      .replace(/<!--[\s\S]*?-->/g, '')
      //content = content.replace(/<!--[^(-->)]*?-->/g, '');

      //删除 <![if ...]><![endif]> 标签及其内容
      .replace(/<!\[if [^\]]*?\]>[\s\S]*?<!\[endif\]>/ig, '')

      //清除 o:p font 标签，仅清除标签，保留内容
      .replace(/<\/?o:p>/g, '')
      .replace(/<\/?font(?:\s+[^>]*)?>/g, '');

    //console.log('content_1: '+content);

    content = content

      //空格替换
      .replace(/&nbsp;|\n|\r/g, space)
      .replace(/\s{2,}/g, space)

      //中文符号替换
      .replace(/【/g, '[')
      .replace(/】/g, ']')
      .replace(/（/g, '(')
      .replace(/）/g, ')')
      .replace(/：/g, ':')
      

      //删除 标签
      //.replace(/<\/?o:p(?:(\s*([^\s'">]+|[^\s'">]+?='[^']*'|[^\s'">]+?="[^"]*")?)*?)>/g, '')

      //清除 o:p font div span a img 标签，仅清除标签，保留内容
      .replace(/<img(?:\s+[^>]*)?\/?>/ig, '')
      .replace(/<\/?span(?:\s+[^>]*)?>/g, '')
      .replace(/<\/?a(?:\s+[^>]*)?>/g, '')
      .replace(/<\/?div(?:\s+[^>]*)?>/g, '');

    //console.log('content_2: '+content);

    // 清除无用属性，顺便生成 li 标签
    content = trimProperty(content);
    //trim = clearEmpty(trim);

    //console.log('content_2: '+content);

    //连续的行内标签
    while(/<\/(b|u|i)>(\s*)<\1>/i.test(content)){
      content = content.replace(/<\/(b|u|i)>(\s*)<\1>/g, '$2');
    }

    //console.log('content_3: '+content);
    content = content
      //strong标签
      .replace(/<b><i><u>([^<>]*?)<\/u><\/i><\/b>/, '<strong>$1</strong>')

      // 添加 id 属性 和 a 标签
      .replace(/<(\w+)(\s+[^>]*)?>(.*?)<\/\1>/g, function(){

        var tag = arguments[0],
          inner = arguments[3];

        if (/\[/.test(inner) && /\]/.test(inner)) {
          //console.log('inner: '+inner);
          var name = arguments[1],
            prop = arguments[2] || '';

          while(/(\[[^\]<>]*?)(<\/?\w+(?:\s+[^>]*)?>)([^\]]*?\])/.test(inner)){
            inner = RegExp['$2']+RegExp['$1']+RegExp['$3'];
          }

          inner = inner.replace(/\[\s*/g, '[').replace(/\s*\]/g, ']');

          var id = '';
          if (/\[#\s*([^\s\]]*)\]/.test(inner)) {
            id = ' id="'+RegExp['$1']+'"';
          }

          inner = inner.replace(/<u>([\s,.;:?]*)/ig, '$1<u>').replace(/([\s,.;:?]*)<\/u>/ig, '</u>$1');
          inner = replaceLink(inner);

          //console.log('inner: '+inner);

          return '<'+name+id+prop+'>'+inner.replace(/\[[^\[\]<>]*\]/g, '')+'</'+name+'>';

        } else {
          return tag;
        }
        
      });
    
    //console.log('content_4: '+content);
    content = content

      //分组 li 标签
      .replace(/((<li(\s+[^>]*)?>.*?<\/li>\s*)+)/g, '<ul>$1</ul>')

      //
      .replace(/<\/b>(\s*):/ig, ':<\/b>$1')
      .replace(/(\s+):/g, ':$1')
      .replace(/(\s+)<\/b>/ig, '<\/b>$1')
      .replace(/(<b>)?\s*(产品|文章)(名|名字|名称)?:(<\/b>)?\s*/i, '{NAME}')
      .replace(/(<b>)?\s*((图片)?标题|显示名称):(<\/b>)?\s*/ig, '{TITLE}')
      .replace(/(<b>)?\s*(关键(字|词)):(<\/b>)?\s*/i, '{KEYWORDS}')
      .replace(/(<b>)?\s*(描述|简述):(<\/b>)?\s*/ig, '{DESCRIPTION}')
      .replace(/(<b>)?\s*h1:(<\/b>)?\s*/i, '{H}')
      .replace(/(<b>)?\s*网址:(<\/b>)?\s*/i, '{URL}')
      .replace(/(<b>)?\s*(添加(到|位置)?):(<\/b>)?\s*/i, '{POS}')
      //处理 “图片名称” 前面可能会出现数字
      .replace(/([\d.]*\s*<b>)?\s*[\d.]*\s*(图片名称|图片名|名称):(<\/b>)?\s*/ig, '{IMGNAME}')
      .replace(/(<b>)?\s*alt:(<\/b>)?\s*/ig, '{ALT}')

      //处理 “图片名称” 前面可能出现的数字+换行
      .replace(/<p>(?:<b>)?\s*[\d.]+\s*(?:<\/b>)?<\/p>\s*(<p>)?\s*(\{[A-Z]+\})/ig, '$1$2')
      //处理 “图片名称” 后面可能出现换行的情况
      .replace(/<(\w+)(\s+[^>]*)?>\s*(\{[A-Z]+\})\s*<\/\1>\s*<\1(?:\s+[^>]*)?>([^{}]*?)<\/\1>/g, '<$1$2>$3$4</$1>')

      //行内标签的尖括号暂时换为方括号，图片生成后再转回来
      .replace(/<(\/?(a|b|br|sub|sup))>/ig, '[$1]')
      .replace(/\{([A-Z]+)\}([^{<]*)/g, function($0, $1, $2){ return '{'+$1+'='+$2.trim()+'}'; })
      .replace(/<(\w+)(?:\s+[^>]*)?>[^<>{}]*(\{[^{}]*\}[^<>]*)<\/\1>/g, '$2')
      .replace(/(\{IMGNAME=[^}]*\}\s*\{ALT=[^}]*\}(\s*\{DESCRIPTION=[^}]*\})?)/g, '{image}$1{/image}')
      .replace(/\[(\/?(a|b|br|sub|sup)(\s+[^>]*)?)\]/ig, '<$1>');

    //console.log('content_5: '+content);
    
    content = content

      //嵌套的双标签
      .replace(/<(\w+)>\s*<\1>([\s\S]*?)<\/\1>\s*<\/\1>/g, '<$1>$2</$1>')

      //连续的行内标签
      .replace(/<\/(b|u)>(\s*)<\1>/g, '$2')

      //处理 td 标签 和 图片
      .replace(/<td(\s+[^>]*)?>(.*?)<\/td>/g, function($0, prop, inner){
        //console.log('$0: '+$0+', prop: '+prop+', inner: '+inner);

        if (isEmpty(inner) || isEmptyHTML(inner)) {
          return ''
        } else if (/(\{image\}.*?\{\/image\})/i.test(inner)) {
          return '<td class="isimage">'+RegExp['$1']+'</td>';
        } else {
          prop = prop || '';

          //去掉td内单独的p标签
          if( isEmptyHTML( inner.replace(/<p(\s+[^>]*)?>(.*?)<\/p>/, '') ) ){
            var p_inner = RegExp['$2'];
            if ( !isEmpty(p_inner) && isEmpty( p_inner.replace(/<b(\s+[^>]*)?>.*?<\/b>/i, '') )) {
              return '<th'+prop+'>'+(inner.replace(/<\/?(p|b)(?:\s+[^>]*)?>/g, ''))+'</th>'
            }
            return '<td'+prop+'>'+(inner.replace(/<\/?p(?:\s+[^>]*)?>/g, '').replace(/<br>/g, '[br]'))+'</td>'
          }
          return $0.replace(/<br>/g, '[br]');
        }
      })

      //<br> 标签
      .replace(/<br>/g, '')
      .replace(/\[br\]/g, '<br>')
      .replace(/\s+/g, ' ');

    //console.log('content_6: '+content);

    //清除空标签，添加分隔符：;;;
    while(/<(\w+)(?:>|\s+[^>]*?>)\s*<\/\1>/.test(content)){
      content = content.replace(/<p(?:>|\s+[^>]*?>)\s*<\/p>/g, ';;;')
        .replace(/<(\w+)(?:>|\s+[^>]*?>)(\s*)<\/\1>/g, '$2');
    }

    //删除多余分隔符
    content = content.replace(/\s*;;;\s*/g, ';;;').replace(/;{4,}/g, ';;;')
      .replace(/<(\w+)(?:>|\s+[^>]*?>)[\s\S]*?<\/\1>/g, function($0){
        return $0.replace(';;;', '');
      });

    //替换分隔符
    content = ('{SECTION}' + content.replace(/;;;/g, '{/SECTION}{SECTION}') + '{/SECTION}')
      .replace(/\{SECTION\}\s*\{\/SECTION\}/g, '');

    //console.log(content);
    content = content.replace(/<ul>([\s\S]*?)<\/ul>/g, function($0, $1){
      //console.log($1);
      return listex($1);
    });
    
    //console.log('content_7: '+content);

    content = content
      .replace(/<table(\s+[^>]*)?>(.*?)<\/table>/g, function($0, $1, $2){

        var table = $0, prop = $1||'', innerHTML = $2;
        var images = 0, inner = '';

        $(table).find('td').each(function(){
          if ($(this).hasClass('isimage')) {
            images ++;
            inner += this.innerHTML;
          } else {
            images = 0;
            inner = '';
            return false;
          }
        });

        //console.log('inner: '+inner);
        var layout = '';

        if (images === 2) {
          layout = ' img-md-2';
        } else if (images%4 === 0) {
          layout = '';
        } else if (images%3 === 0) {
          layout = ' img-md-3';
        } else if (images%4 === 3) {
          layout = '';
        } else if (images%3 === 2) {
          layout = ' img-md-3';
        } else if (images%4 === 2) {
          layout = '';
        }

        switch(images){
          case 0:
            innerHTML = innerHTML.replace(/\s+class="isimage"/g, '');
            return '<div class="table-box"><table'+prop+'><tbody>'+innerHTML+'</tbody></table></div>';

          case 1:
            return toImage(inner);

          default:
            return '<div class="img-set'+layout+'">'+toImage(inner, true)+'</div>';
        }
      });

    //console.log('content_8: '+content);

    content = content
      .replace(/(\{image\}.*?\{\/image\})/g, function(){
        return toImage(arguments[1]);
      });

    content = clean(content)
      .replace(/<p(\s+[^>]*)?>\s*<b>([^<>]*?)<\/b>\s*<\/p>/g, '<h2$1>$2</h2><h3$1>$2</h3><p$1><b>$2</b></p>');

    //console.log('content_9: '+content);
    return content;
  }
  
  function clean(c){

    var content = c;

    //安全的内容处理
    content = content

      //符号替换
      .replace(/℃/g, '°C')
      .replace(/℉/g, '°F')
      .replace(/ x /g, ' × ')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, '\'')

      //实体转换
      .replace(/&#\d+;/g, function(match){ return entityToString(match); })

      //孤立的&符号
      .replace(/&(?=[a-zA-Z0-9]*?[^a-zA-Z0-9;#])/g, '&amp;')

      //将行内标签内部紧邻的空白字符移出
      .replace(/<(b|strong|sup|sub)>(\s+)/g, '$2<$1>')
      .replace(/(\s+)<\/(b|strong|sup|sub)>/g, '</$2>$1')
      .replace(/<\/(b|strong|sup|sub)>\b/g, '</$1> ')

      //清除多余的空白字符
      .replace(/\s+/g, ' ')
      .replace(/<(\w+)\s+>/g, '<$1>')
      .replace(/\s*<\s*(\/?(p|div|ul|ol|li|table|caption|tbody|thead|td|tr|th)(\s+[^>]*?)?)\s*>\s*/g, '<$1>')

      .replace(/\{SECTION\}/g, '').replace(/\{\/SECTION\}/g, '\n\n');

      //console.log('content3: '+content);

    return content;

    //更多的内容处理，未经过足够的检验，可能会导致意外的格式错误
    var content = c
      //~ - => –
      .replace(/(\d)\s*(~|-)\s*(\d)/g, '$1–$3')

      //符号替换
      .replace(/(\d)(x|×|&times;)(\d)/g, '$1 × $3')

      //单位前的空格
      .replace(/(\d)(mm|cm|m|km|kg|g|mpa|°C|°F)([\b\/])/ig, '$1 $2$3')
      .replace(/(\S)(\()(mm|cm|m|km|kg|g|mpa|°C|°F)(\)|\/)/ig, '$1 $2$3$4')
      .replace(/(\d) (mm|cm|m) (×|&times;) ([\d\.]+) \2\b/ig, '$1 × $4 $2')
      .replace(/(\d) (mm|cm|m) (×|&times;) ([\d\.]+) \2\b/ig, '$1 × $4 $2')

      //标点符号前后的空格
      .replace(/(\S)\s+(,|;|:|\?|!)/g, '$1$2')
      .replace(/(,|;|:|\?|!)(\S)/g, '$1 $2')

      //孤立的&符号
      .replace(/&(?=[a-zA-Z0-9]*?[^a-zA-Z0-9;#])/g, '&amp;');

    return content;
  }

  function trimProperty(s){
    s = s
      //单独处理 br 标签
      //img 已清除，再没有别的闭合标签了
      .replace(/<br(\s+[^>]*)?\/?>/ig, '<br>')

      //修剪属性
      .replace(/<(\w+)(\s+[^>]*)?>(.*?)<\/\1>/g, function(){
        var tag = arguments[0],
          name = arguments[1],
          prop = arguments[2] || '',
          inner = arguments[3];

        if (isEmptyHTML(inner)) {
          return inner.replace(/<\/?[^>]*>/g, '');
        }

        if (/mso-list:/i.test(prop) && /margin-left:\s*([\d.]+)/i.test(prop)) {
          return '<li list="'+(RegExp['$1']||0)+'">'+trimProperty(inner)+'</li>';
        }

        var colspan = '', rowspan = '';

        if (name === 'td' || name === 'th') {
          if (/\scolspan=(['"]?)(\d+)\1/i.test(prop)) {
            colspan = ' colspan="'+RegExp['$2']+'"';
          }

          if (/\srowspan=(['"]?)(\d+)\1/i.test(prop)) {
            rowspan = ' rowspan="'+RegExp['$2']+'"';
          }
        }

        return '<'+name+rowspan+colspan+'>'+trimProperty(inner)+'</'+name+'>';
      });

    return s;
  }

  function toImage(s, lightbox){

    if (lightbox) {
      var lightboxid = 'lb_'+String(Math.random()).substr(2,5);
    }

    s = s.replace(/\{image\}(.*?)\{\/image\}/g, function(){
      var name = alt = desc = title = template = '';
      var inner = arguments[1];

      if (/\{IMGNAME=([^}]*)\}/.test(inner)) {
        name = RegExp['$1'].trim().replace(/"/g, '&quot;');
      }

      if (/\{ALT=([^}]*)\}/.test(inner)) {
        alt = RegExp['$1'].trim().replace(/"/g, '&quot;');
      }

      if (/\{DESCRIPTION=([^}]*)\}/.test(inner)) {
        desc = RegExp['$1']
          .replace(/\s*(<b>)?\s*([^\s:]*?)\s*:\s*(<\/b>)?\s*/i, '<b>$2:</b> ')
          .trim();
      }

      if (!name && !alt) {
        return desc;
      } else {

        //console.log('name: '+name+'; alt: '+alt+'; desc:'+desc);
        if (lightbox) {
          template = ''
            + '<div>'
            +   '<a rel="nofollow" href="/{path}/{name}" data-lightbox="'+lightboxid+'" title="{title}">'
            +     '<img src="/{path}/{name}" alt="{alt}">'
            +   '</a>'
            +   '<p>{desc}</p>'
            + '</div>';

          title = desc.replace(/<[^>]+>/g, '').trim();

        } else {
          template = ''
            + '<div class="image">'
            +   '<img src="/{path}/{name}" alt="{alt}">'
            +   '<p>{desc}</p>'
            + '</div>';
        }

      /* template = ''
          + '<li class="image">'
          +   '<img src="/{path}/{name}" alt="{alt}">'
          +   '<p>{desc}</p>'
          + '</li>';
      */
        template = template.replace(/\{name\}/g, name)
          .replace(/\{alt\}/g, alt)
          .replace(/\{desc\}/g, desc)
          .replace(/\{title\}/g, title);

        //console.log('Template: '+template);
        return template;
      }
    });

    return s;
  }

  function replaceLink(s){

    if (s && /\[\/\s*([^\]]*)\]/.test(s)) {

      var left = RegExp.leftContext || '',
        right = RegExp.rightContext || '',
        link = RegExp['$1'].replace(/\s+/g, '');

        //console.log('LEFT: '+left+'; RIGHT: '+right+'; LINK: '+link);

      s = left.replace(/<u>([^<>]*)<\/u>/i, function(){
        if (link.indexOf('#') === 0) {
          return '<a rel="nofollow" href="'+link+'">'+arguments[1]+'</a>';
        } else {
          return '<a href="/'+link+'">'+arguments[1]+'</a>';
        }
      }) + replaceLink(right);

      return s.replace(/\s{2,}/g, ' ');
    } else {
      return s;
    }
  }

  function listex(c){

    var li = /<li(\s+[^>]*)>(.*?)<\/li>/g,
      list = /\s+list="([\d.]+)"/i;

    var result = '',
      lic = null,
      margin = 0,
      inner = '',
      prop = '',
      level = [],
      curLevel = -10,
      i = 0,
      j = 0;

    function eq(num1, num2){
      return Math.abs(num1-num2)<5;
    }

    while( lic = li.exec(c) ){
      prop = lic[1];
      if (list.test(prop)) {
        margin = RegExp['$1'];
        inner = lic[2];
        prop = prop.replace(list, '');
      } else {
        continue;
      }

      //console.log('lic[1]: '+lic[1]);
      if (!eq(margin, curLevel)) {
        for (i = 0; i < level.length; i++) {
          if(eq(level[i], margin)) break;
        }
        if (i>=level.length) {
          result += '<ul>';
          curLevel = margin;
          level.push(margin);
        } else {
          curLevel = level[i];
          for (j = level.length-1; j > i; j--) {
            result += '</li></ul>';
            level.pop();
          }
        }
      }
      result += '</li><li'+prop+'>'+inner;
    }
    for (j = level.length-1; j >= 0; j--) {
      result += '</li></ul>';
    }
    result = result.replace(/<ul><\/li>/g, '<ul>').replace('<ul>', '<ul class="ul-custom">');
    return result;
  }

  function rep(val) {
      //
      if(!val) return '';
      
      var c = val;
      for ( var i = 0; i < replist.length; i++ ) {
          c = c.replace( (new RegExp(replist[i][0], replist[i][1])), replist[i][2] );
      }
      return c + '{end}';;
  }

  function imgAnalyze2(s, t){

      var arr, rep;

      for (var i = 0; i < newRegList.length; i++) {
          rep = newRegList[i];
          arr = (rep.reg).exec(s);
          if (arr) {
              arr[1] = rep.fn ? rep.fn.call(null, arr[1]) : arr[1];
              t = t.replace( ( new RegExp('{'+rep.tag+'}', 'ig') ), arr[1] );
          }
      }

      return t;
  }


  function imgAnalyze(s){

      var reg = new RegExp(reglist.img, 'i');
      var regseg = new RegExp(reglist.segColon);
      var arr = reg.exec(s);

      if(!arr) {
          alert("无法识别: "+s);
          return false;
      }

      arr[1] = trim(arr[1]);
      arr[2] = trim(arr[2]);
      arr[3] = trim(arr[3]);

      if (arr[3]) {
          var arrDesc = regseg.exec(arr[3]);
          arr[3] = ( arrDesc[2] ? '<b>'+trim(arrDesc[2])+':</b> ' : '' ) + trim(arrDesc[3]);
      }
      
      return arr;
  }

  function lstAnalyze(s){

      var reg = new RegExp(reglist.list, 'g');
      var arr = [];
      var arrtmp = [];

      do {
          arrtmp = reg.exec(s);
          if ( arrtmp && arrtmp[1] ) arr.push( arrtmp[1].trim() );
      } while (reg.lastIndex>0)
      
      return arr;
  }

  function meta(c){
      var tit = '标题：',
          key = '关键字：',
          desc = '描述：',
          h1 = 'H1：',
          cnt = '内容：',
          reg,
          arr = [];
      reg = /<title>(.*?)<\/title>/ig;
      arr = reg.exec(c);
      if (arr && arr.length>1) {
          tit += arr[1];
      } else {
          tit += '未找到！';
      }
      tit += '\n\n';

      reg = /<meta name="keywords" content="(.*?)">/ig;
      arr = reg.exec(c);
      if (arr && arr.length>1) {
          key += arr[1];
      } else {
          key += '未找到！';
      }
      key += '\n\n';

      reg = /<meta name="description" content="([^"]*?)">/ig;
      arr = reg.exec(c);
      if (arr && arr.length>1) {
          desc += arr[1];
      } else {
          desc += '未找到！';
      }
      desc += '\n\n';

      reg = /<h1\s?[^>]*>(.*?)<\/h1>/ig;
      arr = reg.exec(c);
      if (arr && arr.length>1) {
          h1 += arr[1];
      } else {
          h1 += '未找到！';
      }
      h1 += '\n\n';

      return tit+desc+key+h1;
  }

  win.onload = function(){
    $(input).show();
  }

}
