;(function(window, document, $, _, undefined) {
  window.bundle = function() {
    // code...
    var args = arguments;
    if ( !args.length ) return;
    
    var items=[];
    var $els, evt, cls;
    _.each( args, function( item ) {
      if ( !item ) return;
      if ( typeof item == 'object' && typeof item.selector == 'string' ) {
        $els = $(item.selector);
        cls = item.class || 'is-active';
        switch ( typeof item.event ) {
          case 'undefined':
            evt = 'click';
            break;
          case 'string':
            evt = item.event;
            break;
          default:
            evt = false;
            break;
        }
      } else {
        $els = $(item);
        evt = 'click';
        cls = 'is-active';
      }
      
      if ( $els.length ) {
        $els.each( function( index ) {
          this._index = index;
          this._class = cls;
          if ( !items[index] ) items[index] = [];
          items[index].push( $(this) );
        });
      }

      if ( evt ) { $els.on( evt, function(){ switchItem(this._index) } ); }
    } );

    function switchItem( index ) {
      if ( switchItem._currentIndex === index ) return;
      if ( typeof switchItem._currentIndex != 'undefined' ) {
        _.each( items[switchItem._currentIndex], function( item ){
          item.removeClass( item[0]._class );
        } );
      };
      _.each( items[index], function( item ){
        item.addClass( item[0]._class );
      } );
      switchItem._currentIndex = index;
    }

    switchItem(0);
    return switchItem;
  }
})(window, document, jQuery, _);