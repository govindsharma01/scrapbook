// Object.create support test, and fallback for browsers without it
if ( typeof Object.create !== "function" ) {
  Object.create = function (o) {
    function F() {}
    F.prototype = o;
    return new F();
  };
}
if (typeof($.plugin) == 'undefined') {
  // Create a plugin based on a defined object
  $.plugin = function( name, object ) {
    $.fn[name] = function( options ) {
      return this.each(function() {
        if ( ! $.data( this, name ) ) {
          $.data( this, name, Object.create(object).init( options, this ) );
        }
      });
    };
  };
}

jQuery(document).ready(function($) {
  $.plugin('zsbObj', zenlanScrapbook);
  var obj = {};
  $(obj).zsbObj({
    name: "example",
    gaEvents : false
  });
  window.zsbObj = $(obj).data('zsbObj');
  window.zsbObj.initialise();

});

var zenlanScrapbook = {

  default_vars : {
    name : 'scrapbook',
    currentBook : 'default',
    libraryIndex : ':library',
    gaEvents : true
  },
  default_elems : {
    newbook : 'newbook',
    library : 'library',
    btnEmpty : 'btn-empty',
    btnSave : 'btn-save',
    btnDelete : 'btn-delete',
    scrapbook : 'scrapbook-list',
    object : 'object',
    btnRemove : 'btn-object-remove',
    btnHide : 'btn-object-hide',
    btnLink : 'btn-object-link',
    objectTitle : 'object-title',
    objectImage : 'object-image'
  },

  log : function(msg) {
    console.log(msg);
  },

  init : function ( options, elem ) {
    var base = this;
    base.options = $.extend( {}, base.default_vars, options );
    if (base.options.name.length > 0) {
      base.options.libraryIndex = base.options.name + ':library';
    }
    base.elems = {};
    $.each(base.default_elems, function(key, value) {
      base.elems[key] = $(document.getElementById(value));
    });
    return base;
  },

  getOptions : function () {
    return this.options;
  },

  getOption : function (name) {
    if (this.options.hasOwnProperty(name)) {
      return this.options[name];
    }
    return false;
  },

  setOption : function (name, value) {
    if (this.options.hasOwnProperty(name)) {
      this.options[name] = value;
      return true;
    }
    return false;
  },

  getElem : function (name) {
    if (this.elems.hasOwnProperty(name)) {
      return this.elems[name];
    }
    return false;
  },

  checkVersion : function () {
    var version = localStorage.getItem(this.options.name + ':version');
    if (version == null) {
      localStorage.setItem(this.options.name + ':version', '0.2.0-beta');
    }
    else if (version != '0.2.0-beta') {
    // need to check existing scrapbooks for attr changes
    }
  },

  hideObject : function () {
    this.elems.object.css('display', 'none');
  },

  emptyScrapbook : function () {
    var base = this;
    base.hideObject();
    localStorage.removeItem(base.getStorageName());
    base.resetIsotope(base.elems.scrapbook);
  },

  showScrapbook : function () {
    var base = this;
    base.hideObject();
    base.elems.newbook.val('');
    base.elems.scrapbook.empty();
    base.resetIsotope(base.elems.scrapbook);
    try {
      var $items = $(base.getScrapbook());
      $items.imagesLoaded(function(){
        $items.each(function(){
          base.handleScrapbookItem($(this));
        });
        base.elems.scrapbook.isotope('insert', $items, function(){
          base.saveScrapbook();
        });
      //this.elems.btnScrap.text(this.options.currentbook);
      });
    } catch (error) {
      console.error("Corrupt scrapbook deleted: " + error);
      base.emptyScrapbook();
    }
  },

  getLastBook : function () {
    var scrapbookname = localStorage.getItem(this.options.name + ':scrapbook');
    if (scrapbookname == null) {
      scrapbookname = 'default';
      localStorage.setItem(this.options.name + ':scrapbook', scrapbookname);
    }
    return scrapbookname;
  },

  showLibraryList : function (selected) {
    var base = this;
    base.elems.library.empty();
    base.elems.newbook.val('');
    var library = base.getLibrary();
    $.each(library, function(i,item) {
      if (selected == item) {
        base.elems.library.append('<option value="' + item + '" selected>' + base.parseStorageName(item) + '</option>');
      }
      else {
        base.elems.library.append('<option value="' + item + '">' + base.parseStorageName(item) + '</option>');
      }
    });
  },

  getLibrary : function (){
    var base = this;
    var library;
    if(typeof(Storage) !== 'undefined') {
      library = localStorage.getItem(base.options.libraryIndex);
      if (library == null) {
        library = new Array();
      }
      else {
        library = JSON.parse(library);
        library = library.filter( function(element, index, array) {
          return (element != null);
        });
        localStorage.setItem(base.options.libraryIndex, JSON.stringify(library));
        library = localStorage.getItem(base.options.libraryIndex);
        library = JSON.parse(library);
      }
      if (library.length == 0) {
        library.push(this.options.name + ':default');
        localStorage.setItem(base.options.libraryIndex, JSON.stringify(library));
        library = localStorage.getItem(base.options.libraryIndex);
        library = JSON.parse(library);
      }
    }
    else {
      library = new Array('default');
    }
    return library;
  },

  storeLibrary : function (scrapbookname){
    var base = this;
    if(typeof(Storage) !== 'undefined') {
      var library = base.getLibrary();
      if ($.inArray(scrapbookname, library) == -1) {
        library.push(scrapbookname);
        localStorage.setItem(base.options.libraryIndex, JSON.stringify(library));
        base.showLibraryList(scrapbookname);
      }
    }
  },

  removeFromLibrary : function (scrapbookname){
    var base = this;
    if(typeof(Storage) !== 'undefined') {
      var library = base.getLibrary();
      localStorage.removeItem(scrapbookname);
      i = $.inArray(scrapbookname, library);
      if (i != -1) {
        library.splice(i,1);
        localStorage.setItem(base.options.libraryIndex, JSON.stringify(library));
        base.showLibraryList(scrapbookname);
      }
    }
  },

  /* ISOTOPE FUNCTIONS */

  initIsotope : function ($container) {
    $container.isotope({
      itemSelector : '.iso',
      layoutMode: 'masonry',
      masonry: {
        columnWidth : 20
      }
    });
  },

  resetIsotope : function ($container) {
    $container.empty();
    $container.isotope('destroy');
    this.initIsotope($container);
  },

  /* STORAGE FUNCTIONS */

  getStorageName : function () {
    var scrapbookname;
    if (this.elems.newbook.val() == '') {
      scrapbookname = this.elems.library.val();
    }
    else {
      scrapbookname = this.options.name + ':' + this.elems.newbook.val();
      this.storeLibrary(scrapbookname);
    }
    //this.elems.currentbook = 'Scrapbooks (' + this.parseStorageName(scrapbookname) + ')';
    localStorage.setItem(this.options.name + ':scrapbook', scrapbookname);
    return scrapbookname;
  },

  parseStorageName : function (scrapbookname) {
    var result = scrapbookname.substr(8);
    return result;
  },

  getScrapbook : function () {
    var content = '';
    if(typeof(Storage)!=='undefined') {
      content = localStorage.getItem(this.getStorageName());
    }
    return content;
  },

  saveScrapbook : function () {
    if(typeof(Storage) !== 'undefined') {
      var content = this.elems.scrapbook.html();
      localStorage.setItem(this.getStorageName(), content);
    }
  },

  deleteScrapbook : function () {
    if(typeof(Storage) !== 'undefined') {
      this.emptyScrapbook();
      this.removeFromLibrary(this.getStorageName());
    }
  },

  addToScrapbook : function(item) {
    var id = $(item).attr('id');
    if (id == this.elems.scrapbook.find('#' + item.id).attr('id')) {
      return;
    }
    var src, title, url;
    if (item.hasOwnProperty('src')) {
      src = item.src;
      title = item.title;
    }
    else {
      var img = $(item).find('img');
      src = $(img).attr('src');
      title = $(img).attr('title');
    }
    url = $(item).attr('data-url');
    var elem = '<li class="iso" id="' + item.id
    + '" data-url="' + url + '">'
    + '<img class="scrapbook" src="' + src
    + '" title="' + html_sanitize(title) + '"/></li>';
    this.handleScrapbookItem(elem);
    this.elems.scrapbook.isotope('insert', $(elem));
    this.saveScrapbook();
  },

  handleScrapbookItem : function (elem) {
    var base = this;
    $(elem).click(function(){
      base.elems.object.css('display', 'block');
      var $img = $(this).find('img');
      base.elems.object.attr('title', $img.attr('title'));
      base.elems.objectTitle.text($img.attr('title'));
      base.elems.objectImage.attr('src', $img.attr('src')).attr('alt', $img.attr('title'));
      var link = $(this).attr('data-url');
      if (typeof(link) == 'undefined') {
        link = $(this).attr('objurl'); // old version
      }
      base.elems.btnLink.attr('href', link);
      base.elems.btnRemove.attr('data-id', $(this).attr('id')).click(function() {
        base.elems.object.css('display', 'none');
        var item = base.elems.scrapbook.find('#' + $(this).attr('data-id'));
        base.elems.scrapbook.isotope('remove', item, function(){
          base.saveScrapbook();
        });
      });
    });
  },

  trackEventScrapbook : function (action) {
    if (this.options.gaEvents == true) {
      _gaq.push([
        '_trackEvent',document.URL,'scrapbook',
        action + ' [' + this.getStorageName() + ' (' + this.elems.scrapbook.children().length + ')]'
        ]);
    }
  },

  initialise : function() {
    var base = this;
    base.checkVersion();
    $.fn.modal.defaults.height = function(){
      return $(window).height() - 165;
    }
    $.fn.modal.defaults.focusOn = base.elems.library;
    //$.fn.modal.defaults.modalOverflow = true;
    base.showScrapbook();
    base.initIsotope(this.elems.scrapbook);
    base.showLibraryList(base.getLastBook());
    $('#scrapbooks').on('shown', function () {
      base.trackEventScrapbook('open');
      base.showScrapbook();
    });
    base.elems.library.change(function(){
      base.trackEventScrapbook('change');
      base.showScrapbook();
    });
    base.elems.btnEmpty.click(function(){
      base.trackEventScrapbook('btn-empty');
      base.emptyScrapbook();
    });
    base.elems.btnSave.click(function(){
      base.trackEventScrapbook('btn-save');
      base.saveScrapbook();
    });
    base.elems.btnDelete.click(function(){
      base.trackEventScrapbook('btn-delete');
      base.deleteScrapbook();
      base.showLibraryList('');
      base.showScrapbook();
    });
    base.elems.btnHide.click(function(){
      base.hideObject();
    });
  }
}