
const iframeCss = [
  './www/css/style.css',
];

const iframeJs = [
  './www/js/lazyscript.js',
  './www/js/custom.js',
];

const options = {
  img_path: '/images/',
  img_lightbox: true,
  img_lazyload: true,
  list_type: 'ul',
  table_class: 'table',
  table_wrapper: true,
  table_wrapper_class: 'table-wrapper',
};

const optionsDialog = new Vue({
  el: '#clean-menu',
  data: function() {
    return {
      dialogVisible: false,
      form: options,
      formLabelWidth: '120px',
    };
  },
});

const codebox = document.getElementById('code');

const btnUndo = document.getElementById('btn-undo');
const btnBeautify = document.getElementById('btn-beautify');
const btnClear = document.getElementById('btn-clear');
const btnWrap = document.getElementById('btn-wrap');

const colPreview = document.getElementById('col-preview');
const btnTogglePreview = document.getElementById('toggle-preview');
// const btnRefreshPreview = document.getElementById('refresh-preview');
const previewWindow = document.getElementById('preview_window');
const iframeDoc = previewWindow.contentWindow.document;

btnTogglePreview.onclick = function() {
  colPreview.classList.add('is-show')
  colPreview.classList.add('is-animated')
  btnTogglePreview.onclick = function() {
    colPreview.classList.toggle('is-show')
  }
}

function cleanHtml(html) {
  // return html;
  const htmldoc = new DocHtml(html, options);
  htmldoc.simplify();
  return htmldoc.html;
}

const editor = CodeMirror(document.getElementById('code'), {
  value: '',
  mode:  "htmlmixed",
  lineNumbers: true,
  tabSize: 2,
  theme: 'material',
  lineWrapping: true,
});

const editor_doc = editor.getDoc();

editor.setSize('100%','100%');
editor.on('paste', function(cm, e) {
  e.preventDefault()
  let source = e.clipboardData.getData('text/html').trim();
  console.log(source)
  if (source) {
    source = cleanHtml(source)
  } else {
    source = e.clipboardData.getData('text/plain')
  }
  editor_doc.replaceRange(source, editor_doc.getCursor())
})

function switchOption(optionName) {
  editor.setOption(optionName, !editor.getOption(optionName))
}

btnUndo.onclick = function() {
  editor_doc.undo()
}

btnBeautify.onclick = function() {
  let content = html_beautify(editor_doc.getValue(), {
    "indent_size": "2",
    "indent_char": " ",
    "max_preserve_newlines": "5",
    "preserve_newlines": true,
    "keep_array_indentation": false,
    "break_chained_methods": false,
    "indent_scripts": "normal",
    "brace_style": "collapse",
    "space_before_conditional": true,
    "unescape_strings": false,
    "jslint_happy": false,
    "end_with_newline": false,
    "wrap_line_length": "0",
    "indent_inner_html": false,
    "comma_first": false,
    "e4x": false,
    "indent_empty_lines": false
  }).replace(/&nbsp;| /g, ' ');
  editor_doc.setValue(content)
}

btnClear.onclick = function() {
  editor_doc.setValue('')
}

btnWrap.onclick = function() {
  switchOption('lineWrapping')
}

function refreshPreview() {
  let content = '';
  if(iframeCss && iframeCss.length) {
    for (let i = 0; i < iframeCss.length; i++) {
      content += `<link rel="stylesheet" href="${iframeCss[i]}">`;
    }
  }

  content += editor_doc.getValue();
  content += `
<script>
  document.querySelectorAll('a[href]').forEach(function(el){
    el.onclick = function(e){ e.preventDefault() }
  })
<\/script>`;

  if(iframeJs && iframeJs.length) {
    for (let i = 0; i < iframeJs.length; i++) {
      content += `<script src="${iframeJs[i]}"></script>`;
    }
  }

  iframeDoc.write(content)
  iframeDoc.close()
}

editor.on('change', function(cm, e) {
  refreshPreview()
})

// btnRefreshPreview.onclick = function() {
//   refreshPreview()
// }

refreshPreview();

// 编辑器宽度变化时刷新
(function() {
  let width = codebox.offsetWidth;
  setInterval(function() {
    if (width !== codebox.offsetWidth) {
      width = codebox.offsetWidth
      editor.refresh()
    }
  }, 200)
})();
