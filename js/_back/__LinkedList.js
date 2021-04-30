;(function(window, _, undefined) {

  window.LinkedList = (function() {

    //节点对象
    var Node = (function Node(element) {
      if (element instanceof Node) return element;
      if (!(this instanceof Node)) return new Node(element);

      if (element === undefined) {
        element = null;
      }
      this.element = element;
      this.prev = null;
      this.next = null;
    });

    var N_proto = Node.prototype;

    //将节点插入到两个给定节点之间
    N_proto._insertBetween = function(nodeLeft, nodeRight) {
      this.prev = nodeLeft;
      this.next = nodeRight;

      nodeLeft.next = this;
      nodeRight.prev = this;

      return this;
    };

    //将节点插入到给定节点之前
    N_proto.insertBefore = function(node) {
      this._insertBetween(node.prev, node);
      return this;
    };

    //将节点插入到给定节点之后
    N_proto.insertAfter = function(node) {
      this._insertBetween(node, node.next);
      return this;
    };


    //存储私有属性
    var privateData = new WeakMap();

    //私有方法
    function getData(list, key) {
      return privateData.get(list)[key];
    }

    function setData(list, change) {
      privateData.set(list, change);
    }

    function lenInc(list) {
      setData(this, {length: getData(list, 'length')++});
    }

    function lenDec(list) {
      setData(this, {length: getData(list, 'length')--});
    }

    function count(list) {
      var len = 0;
      var node = getData(list, 'head');
      while(node) {
        len++;
        node = node.next;
      }
      setData(list, {length: len-2});
    }


    //链表对象
    function LinkedList(element) {

      var head = Node(null);
      var tail = Node(null);

      head.next = tail;
      tail.prev = head;

      setData(this, {
        head: head,
        tail: tail,
        length: 0
      });

      if (element !== undefined && element !== null) {
        this.append(Node(element));
      }

      return this;
    };

    var LL_proto = LinkedList.prototype;

    LL_proto.getHead = function() {
      return getData(this, 'head');
    };

    LL_proto.getTail = function() {
      return getData(this, 'tail');
    };

    LL_proto.getLen = function() {
      return getData(this, 'length');
    };

    //在链表尾部追加一个节点
    LL_proto.append = function( element ) {
      Node(element).insertBefore(this.getTail());
      lenInc();
      return this;
    };

    //在链表头部添加一个节点
    LL_proto.prepend = function( element ) {
      Node(element).insertAfter(this.getHead());
      lenInc();
      return this;
    };

    //
    LL_proto.each = function( callback ) {

      var index = 0;

      var head = this.getHead();
      var tail = this.getTail();

      var node = head.next;

      while(node !== tail) {
        if(false === callback.apply(null, [node, index])) break;
        node = node.next;
        index++;
      }

      return this;
    };

    //
    LL_proto.find = function( target ) {

      var match;
      if (target instanceof Node) {
        match = function(tar, node, index) { return tar === node; };
      } else if (typeof target === 'function') {
        match = function(tar, node, index) { return tar(node.element, index); };
      } else {
        match = function(tar, node, index) { return tar === node.element; }
      }

      var result = null;
      this._each(function(node, index) {
        if (match(target, node, index)) {
          result = node;
          return false;
        }
      });

      return result;
    };

    LL_proto.findAll = function( target ) {

      if (target instanceof Node) return [this.find(target)];

      var match;
      if (typeof target === 'function') {
        match = function(tar, node, index) { return tar(node.element, index); };
      } else {
        match = function(tar, node, index) { return tar === node.element; }
      }

      var result = [];
      this._each(function(node, index) {
        if (match(target, node, index)) {
          result.push(node);
        }
      });

      return result;
    }

    //
    LL_proto.toString = function() {

      var result = '';
      this.each(function(element) {
        try {
          result += element.toString();
        } catch(e) {
          result += '';
        }
      });
    };

    return LinkedList;
  }());

})(window, _);