// Object.create support test, and fallback for browsers without it
if (typeof Object.create !== "function") {
  Object.create = function(o) {
    function F() {
    }
    F.prototype = o;
    return new F();
  };
}
if (typeof ($.plugin) === 'undefined') {
  // Create a plugin based on a defined object
  $.plugin = function(name, object) {
    $.fn[name] = function(options) {
      return this.each(function() {
        if (!$.data(this, name)) {
          $.data(this, name, Object.create(object).init(options, this));
        }
      });
    };
  };
}

jQuery(document).ready(function($) {
  $.plugin('zsbObj', zenlanScrapbook);
  var obj = {};
  $(obj).zsbObj({
    name: "example"
  });
  window.zsbObj = $(obj).data('zsbObj');
  window.zsbObj.initialise();

});

var zenlanScrapbook = {
  default_vars: {
    name: 'scrapbook',
    libraryIndex: ':library',
    currentBook: 'default',
    gaEvents: false
  },
  default_elems: {
    newbook: 'newbook',
    library: 'library',
    btnEmpty: 'btn-empty',
    btnSave: 'btn-save',
    btnDelete: 'btn-delete',
    btnExport: 'btn-export',
    scrapbook: 'scrapbook-list',
    object: 'scrappop',
    btnRemove: 'scrap-object-remove',
    btnLink: 'scrap-object-link',
    objectSource: 'scrap-object-source',
    objectTitle: 'scrap-object-title',
    objectImage: 'scrap-object-image',
    objectBook: 'scrap-current-book'
  },
  log: function(msg) {
    console.log(msg);
  },
  init: function(options, elem) {
    var base = this;
    base.options = $.extend({}, base.default_vars, options);
    if (base.options.name.length > 0) {
      base.options.libraryIndex = base.options.name + ':library';
    }
    base.elems = {};
    $.each(base.default_elems, function(key, value) {
      base.elems[key] = $(document.getElementById(value));
    });
    return base;
  },
  getOptions: function() {
    return this.options;
  },
  getOption: function(name) {
    if (this.options.hasOwnProperty(name)) {
      return this.options[name];
    }
    return false;
  },
  setOption: function(name, value) {
    if (this.options.hasOwnProperty(name)) {
      this.options[name] = value;
      return true;
    }
    return false;
  },
  getElem: function(name) {
    if (this.elems.hasOwnProperty(name)) {
      return this.elems[name];
    }
    return false;
  },
  checkVersion: function() {
    if (typeof (Storage) !== 'undefined') {
      var base = this;
      var version = localStorage.getItem(base.options.name + ':version');
      if (version === null) {
        localStorage.setItem(base.options.name + ':version', '0.2.0-beta');
      }
      else if (version !== '0.2.0-beta') {
        // check existing scrapbooks for attr changes
        var library = base.getLibrary();
        var scrapbook = '', content = '';
        $.each(library, function(i, item) {
          scrapbook = localStorage.getItem(item);
          if (scrapbook) {
            content = scrapbook.replace(/\objurl/g, 'data-url');
            if (content !== scrapbook) {
              localStorage.setItem(item, content);
            }
          }
        });
        localStorage.setItem(this.options.name + ':version', '0.2.0-beta');
      }
    }
  },
  hideObject: function() {
    this.elems.object.css('display', 'none');
  },
  exportScrapbook: function() {
    var base = this;
    var img = '', name = base.getStorageName();
    var html = '<!DOCTYPE html><html><head><title>' + name + '</title></head><body>'
            + '<ul style="list-style-type:none;">';
    var items = base.elems.scrapbook.find('li');
    $(items).each(function() {
      img = $(this).find('img');
      html = html + '<li style="display:inline;' + $(this).attr('style') + '">'
              + '<a href="' + $(this).attr('data-url') + '" target="_blank">'
              + '<img src="' + $(img).attr('src') + '" title="' + $(img).attr('title') + '"/>'
              + '</a></li>';
    });
    html = html + '</ul></body></html>';
    var link = document.createElement('a');
    link.download = 'scrapbook_' + name + '.html';
    link.href = 'data:,' + html;
    link.click();
  },
  emptyScrapbook: function() {
    var base = this;
    base.hideObject();
    localStorage.removeItem(base.getStorageName());
    base.resetIsotope(base.elems.scrapbook);
  },
  showLoading: function(status) {
    this.elems.btnLoading = $('#btn-loading');
    if (status) {
      this.elems.btnLoading.html('');
      this.elems.btnLoading.attr('title', 'loading');
      this.elems.btnLoading.addClass('loading loading-sm');
    }
    else {
      this.elems.btnLoading.html('<i class="glyphicon glyphicon-ok-circle"></i>');
      this.elems.btnLoading.attr('title', 'loaded');
      this.elems.btnLoading.removeClass('loading loading-sm');
    }
  },
  showScrapbook: function() {
    var base = this;
    base.showLoading(true);
    base.hideObject();
    base.elems.newbook.val('');
    base.elems.scrapbook.empty();
    base.resetIsotope(base.elems.scrapbook);
    try {
      var $items = $(base.getScrapbook());
      var id = '', dup = [], unq = [];
      $items.imagesLoaded(function() {
        $items.each(function(i, item) {
          id = $(item).attr('id');
          if ($.inArray(id, unq) > -1) {
            dup.push(i);
          }
          else {
            unq.push(id);
            base.handleScrapbookItem($(item));
          }
        });
        var i = dup.length;
        while (i--) {
          $items.splice(dup[i], 1);
        }
        base.elems.scrapbook.isotope('insert', $items, function() {
          base.saveScrapbook();
        });
        base.showLoading(false);
      });
    } catch (error) {
      console.log("Corrupt scrapbook deleted: " + error);
      base.emptyScrapbook();
      base.showLoading(false);
    }
  },
  getLastBook: function() {
    var scrapbookname = localStorage.getItem(this.options.name + ':scrapbook');
    if ((scrapbookname === null) || (scrapbookname.length === 0)) {
      scrapbookname = 'default';
      localStorage.setItem(this.options.name + ':scrapbook', scrapbookname);
    }
    return scrapbookname;
  },
  showLastBook: function() {
    this.elems.objectBook.text('"' + this.parseStorageName(this.getLastBook()) + '"');
  },
  showLibraryList: function(selected) {
    var base = this;
    base.elems.library.empty();
    base.elems.newbook.val('');
    var library = base.getLibrary();
    $.each(library, function(i, item) {
      if (selected === item) {
        base.elems.library.append('<option value="' + item + '" selected>' + base.parseStorageName(item) + '</option>');
      }
      else {
        base.elems.library.append('<option value="' + item + '">' + base.parseStorageName(item) + '</option>');
      }
    });
  },
  getLibrary: function() {
    var base = this;
    var library;
    if (typeof (Storage) !== 'undefined') {
      library = localStorage.getItem(base.options.libraryIndex);
      if (library === null) {
        library = new Array();
      }
      else {
        library = JSON.parse(library);
        library.sort(function(a, b) {
          return a.toLowerCase().localeCompare(b.toLowerCase());
        });
        library = library.filter(function(element, index, array) {
          return (element !== null);
        });
        localStorage.setItem(base.options.libraryIndex, JSON.stringify(library));
        library = localStorage.getItem(base.options.libraryIndex);
        library = JSON.parse(library);
      }
      if (library.length === 0) {
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
  storeLibrary: function(scrapbookname) {
    var base = this;
    if (typeof (Storage) !== 'undefined') {
      var library = base.getLibrary();
      if ($.inArray(scrapbookname, library) === -1) {
        library.push(scrapbookname);
        localStorage.setItem(base.options.libraryIndex, JSON.stringify(library));
        base.showLibraryList(scrapbookname);
      }
    }
  },
  removeFromLibrary: function(scrapbookname) {
    var base = this;
    if (typeof (Storage) !== 'undefined') {
      var library = base.getLibrary();
      localStorage.removeItem(scrapbookname);
      i = $.inArray(scrapbookname, library);
      if (i !== -1) {
        library.splice(i, 1);
        localStorage.setItem(base.options.libraryIndex, JSON.stringify(library));
        base.showLibraryList(scrapbookname);
      }
    }
  },
  /* ISOTOPE FUNCTIONS */
  initIsotope: function($container) {
    $container.isotope({
      itemSelector: '.iso',
      layoutMode: 'masonry',
      masonry: {
        columnWidth: 20
      }
    });
  },
  resetIsotope: function($container) {
    $container.empty();
    $container.isotope('destroy');
    this.initIsotope($container);
  },
  /* STORAGE FUNCTIONS */
  getStorageName: function() {
    if (this.elems.newbook.val() === '') {
      var scrapbookname = this.elems.library.val();
    }
    else {
      var scrapbookname = this.options.name + ':' + this.elems.newbook.val();
      this.storeLibrary(scrapbookname);
    }
    localStorage.setItem(this.options.name + ':scrapbook', scrapbookname);
    return scrapbookname;
  },
  parseStorageName: function(scrapbookname) {
    return scrapbookname.substr(8);
  },
  getScrapbook: function() {
    var content = null;
    if (typeof (Storage) !== 'undefined') {
      content = localStorage.getItem(this.getStorageName());
    }
    if (content === null) {
      content = '';
    }
    return content;
  },
  saveScrapbook: function(content) {
    if (typeof (Storage) !== 'undefined') {
      if (typeof content === 'undefined') {
        content = this.elems.scrapbook.html();
      }
      localStorage.setItem(this.getStorageName(), content);
    }
  },
  deleteScrapbook: function() {
    if (typeof (Storage) !== 'undefined') {
      this.emptyScrapbook();
      this.removeFromLibrary(this.getStorageName());
    }
  },
  addToScrapbook: function(item) {
    var base = this;
    var id = $(item).attr('data-id');
    if (id === this.elems.scrapbook.find('#' + item.id).attr('id')) {
      return;
    }
    var elem = '<li class="iso" id="' + id
            + '" data-source="' + $(item).attr('data-source')
            + '" data-url="' + $(item).attr('data-url') + '">'
            + '<img class="scrapbook" src="' + $(item).attr('data-src')
            + '" title="' + html_sanitize($(item).attr('data-title')) + '"/></li>';
    if (typeof (Storage) !== 'undefined') {
      var content = base.getScrapbook() + elem;
      base.saveScrapbook(content);
    }
    else {
      base.elems.scrapbook.isotope('insert', $(elem));
    }
  },
  handleScrapbookItem: function(elem) {
    var base = this;
    $(elem).on('click', function() {
      var $img = $(this).find('img');
      base.elems.objectSource.text($(this).attr('data-source'));
      base.elems.objectTitle.text($img.attr('title'));
      base.elems.objectImage.attr('src', $img.attr('src')).attr('alt', $img.attr('title'));
      base.elems.btnLink.attr('href', $(this).attr('data-url'));
      base.elems.btnRemove.attr('data-id', $(this).attr('id')).click(function() {
        base.elems.object.modal('hide');
        var item = base.elems.scrapbook.find('#' + $(this).attr('data-id'));
        base.elems.scrapbook.isotope('remove', item).isotope('layout');
        base.elems.scrapbook.isotope('on', 'removeComplete',
                function(isoInstance, removedItems) {
                  base.saveScrapbook();
                }
        );
      });
      base.elems.object.modal('show');
    });
  },
  trackEventScrapbook: function(action) {
    if (this.options.gaEvents === true) {
      _gaq.push([
        '_trackEvent', document.URL, 'scrapbook',
        action + ' [' + this.getStorageName() + ' (' + this.elems.scrapbook.children().length + ')]'
      ]);
    }
  },
  initialise: function() {
    var base = this;
    base.checkVersion();
    base.initIsotope(this.elems.scrapbook);
    var lastBook = base.getLastBook();
    base.showLibraryList(lastBook);
    base.showLastBook();
    $('#scrapbooks').on('shown.bs.modal', function() {
      base.trackEventScrapbook('open');
      base.showScrapbook();
    });
    base.elems.library.change(function() {
      base.trackEventScrapbook('change');
      base.showScrapbook();
      base.showLastBook();
    });
    base.elems.btnEmpty.click(function() {
      base.trackEventScrapbook('empty');
      base.emptyScrapbook();
    });
    base.elems.btnSave.click(function() {
      base.trackEventScrapbook('save');
      base.saveScrapbook();
      base.showLastBook();
    });
    base.elems.btnDelete.click(function() {
      base.trackEventScrapbook('delete');
      base.deleteScrapbook();
      base.showLibraryList();
      base.showScrapbook();
      base.showLastBook();
    });
    base.elems.btnExport.click(function() {
      base.trackEventScrapbook('export');
      base.exportScrapbook();
    });
  }
};