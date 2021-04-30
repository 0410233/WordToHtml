;(function(window, _, undefined) {

// 连结两个节点
function connectNodes () {
  var nodes = _.toArray(arguments);
  var count = nodes.length;
  var node, next = nodes[0];

  for (var i = 1; i < count; i++) {
    node = next;
    next = nodes[i];
    node.next = next;
    next.prev = node;
  }
}

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

var ln_proto = ListNode.prototype;

// 将节点插入到给定节点之前
ln_proto.insertBefore = function(node) {
  connectNodes(node.prev, this, node);
  return this;
};

// 将节点插入到给定节点之后
ln_proto.insertAfter = function(node) {
  connectNodes(node, this, node.next);
  return this;
};

// 从链表中移除节点
ln_proto.remove = function() {
  connectNodes(this.prev, this.next);
  this.next = null;
  this.prev = null;
  return this;
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

ll_proto.prepend = function(node) {
  ListNode(node).insertAfter(this.head);
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

ll_proto.toString = function() {
  var html = '';
  var node = this.head.next;
  while(node.element) {
    html += node.element.toString();
    node = node.next;
  }
  return html;
};

})(window, _);