/*
 * Filter.js
 * version: 1.5 (22/4/2013)
 *
 * Licensed under the MIT:
 *   http://www.opensource.org/licenses/mit-license.php
 *
 * Copyright 2013 Jiren Patel[ joshsoftware.com ]
 * Modified by Rishi Shah
 * Modified by David Young [ http://deepinthecode.com david@deepinthecode.com ]
 *
 * Dependency:
 *  jQuery(v1.8 >=)
 */

(function(window) {

  'use strict';

  var FilterJS = function(data, container, view, options, afterView) {
    return new _FilterJS(data, container, view, options, afterView);
  };

  FilterJS.VERSION = '1.5.0';

  window.FilterJS = FilterJS;

  var _FilterJS = function(data, container, view, options, afterView) {
    var property_count = 0;

    this.data = data;
    this.view = view;
    this.afterView = afterView;
    this.container = container;
    this.options = options || {};
    this.categories_map = {}
    this.record_ids = [];

    if (this.data.constructor != Array) this.data = [this.data];
    
    this.output = this.data.slice(0); // Sorted output

    for (var name in this.data[0]) {
      this.root = name;
      property_count += 1;
    }

    if (property_count == 1) {
      this.getRecord = function(i, d) {
        return d[i][this.root];
      }
    } else {
      this.getRecord = function(i, d) {
        return d[i];
      }
      this.root = 'fjs';
    }

    this.render(this.data.slice(0, window.city_config['block size']));
    this.parseOptions();
    this.buildCategoryMap(this.data);
    this.bindEvents();

    if (this.options.exec_callbacks_on_init && this.options.callbacks)
      this.execCallBacks(this.record_ids);

    this.options.filter_types = this.options.filter_types || {};

    if (!this.options.filter_types['range'])
      this.options.filter_types['range'] = this.rangeFilter;

    this.options.streaming = this.options.streaming || {};
    if (this.options.streaming.data_url) {
      this.options.streaming.stream_after = (this.options.streaming.stream_after || 2) * 1000;
      this.options.streaming.batch_size = this.options.streaming.batch_size || false;
      this.timer = this.setStreamingTimer();
    }

    return this;
  };

  _FilterJS.prototype = {
    // Get Sorted Output
    getOutput: function() {
      return this.output;
    },
    
    //Render Html using JSON data
    render: function(data) {
      var $container = $(this.container),
        record, el;

      if (!data) return;

      for (var i = 0, l = data.length; i < l; i++) {
        record = this.getRecord(i, data);
        el = $(this.view(record));
        el.attr({
          id: this.root + '_' + record.id,
          'data-fjs': true
        });
        el = $container.append(el);
      }
      
      this.afterView();
    },

    prevEvent: null, // Previous event fire

    //Bind Events to filter html elements
    bindEvents: function() {
      var self = this,
        s = this.options.selectors,
        i = 0,
        l = s.length;

      for (i; i < l; i++) {
        this.bindSelectorEvent(s[i], self);
      }

      if (this.options.search) {
        var options = {
          callback: function (value) {
            self.filter();
          },
          wait: 600,
          highlight: true,
          captureLength: 0
        };

        $(this.options.search.input).typeWatch(options);

        if (this.options.search.wholeword) {
          $(this.options.search.wholeword).change(function(e) {self.filter();});
        }
      }
    },

    bindSelectorEvent: function(selector, context) {
      $(selector.element).on(selector.events, function(e) {
        context.filter();
      });
    },

    //Unbind fileter events
    clear: function() {
      var s = this.options.selectors,
        i = 0,
        l = s.length;

      for (i; i < l; i++)
        $(s[i].element).off(s[i].events);

      if (this.options.search) $(this.options.search.input).off('keyup');

      this.category_map = null;
      this.record_ids = null;
    },

    //Find elements according to selection criteria.
    filter: function() {
      var result, s, selected_vals, records, selected_none = false,
        i = 0,
        l = this.options.selectors.length;

      for (i; i < l; i++) {
        s = this.options.selectors[i];
        selected_vals = $(s.element).filter(s.select).map(function() {
          return $(this).val();
        });
        
        if (selected_vals.length) { // CHANGE
          records = this.findObjects(selected_vals, this.categories_map[s.name], this.options.filter_types[s.type]);

          result = $.grep((result || this.record_ids), function(v) {
            return (records.indexOf(v) != -1);
          });
        } else {
          selected_none = true;
        }
      }

      if (selected_none && this.options.and_filter_on) result = [];

      if (this.options.search) result = this.search(this.options.search, result);

      this.hideShow(result);

      if (this.options.callbacks) this.execCallBacks(result);
    },

    //Compare and collect objects
    findObjects: function(category_vals, category_map, filter_type_func) {
      var r = [],
        ids, category_val, i = 0,
        l = category_vals.length;

      for (i; i < l; i++) {
        category_val = category_vals[i];

        if (filter_type_func) {
          ids = $.map(category_map, function(n, v) {
            if (filter_type_func(category_val, v)) return n;
          });
        } else {
          ids = category_map.constructor == Array ? category_map : category_map[category_val];
        }

        if (ids) r = r.concat(ids);
      }

      return r;
    },

    //Make eval expresssion  to collect object from the json data.
    buildEvalString: function(field_map) {
      var fields = field_map.split('.ARRAY.'),
        eval_str, i = 1,
        l = fields.length;

      eval_str = fields[0];

      for (i; i < l; i++) {
        eval_str += ".filter_collect('" + fields[i] + "')";
      }

      return eval_str;
    },

    addIdFilterCriteria: function(name, criteria, ids_or_mapping) {
      this.categories_map[name] = {};

      var selector = this.parseSelectorOptions({
        name: name
      }, [criteria]);
      ids_or_mapping = ids_or_mapping || $(selector.element).data('ids') || [];

      this.options.selectors.push(selector);
      this.categories_map[name] = ids_or_mapping;

      this.bindSelectorEvent(selector, this);
    },

    //Create map accroding to selection criteria.
    parseOptions: function() {
      var filter_criteria = this.options.filter_criteria,
        selector, criteria, ele, ele_type;
      this.options.selectors = [];

      for (var name in filter_criteria) {

        criteria = filter_criteria[name];
        selector = this.parseSelectorOptions({
          name: name
        }, criteria);

        this.options.selectors.push(selector);

        criteria.push(this.buildEvalString(criteria[1]));
        this.categories_map[name] = {};
      }
    },

    parseSelectorOptions: function(selector, criteria) {
      selector.element = criteria[0].split(/.EVENT.|.SELECT.|.TYPE./)[0];
      selector.events = (criteria[0].match(/.EVENT.(\S*)/) || [])[1];
      selector.select = (criteria[0].match(/.SELECT.(\S*)/) || [])[1];
      selector.type = (criteria[0].match(/.TYPE.(\S*)/) || [])[1];

      var ele = $(selector.element),
        ele_type = ele.attr('type');

      return selector;
    },

    buildCategoryMap: function(data) {
      var filter_criteria = this.options.filter_criteria,
        record, categories, obj, x;

      for (var i = 0, l = data.length; i < l; i++) {
        record = this.getRecord(i, data);
        this.record_ids.push(record.id);

        for (var name in filter_criteria) {
          categories = eval('record.' + filter_criteria[name][2]);
          obj = this.categories_map[name];

          if (categories && categories.constructor == Array) {
            for (var j = 0, lj = categories.length; j < lj; j++) {
              x = categories[j];
              obj[x] ? obj[x].push(record.id) : obj[x] = [record.id];
            }
          } else {
            obj[categories] ? obj[categories].push(record.id) : obj[categories] = [record.id];
          }
        }
      }
    },

    hideShow: function(ids) {
      var e_id = '#' + this.root + '_',
        i = 0,
        l = ids.length;

      $(this.container + ' > *[data-fjs]').remove();
      this.output = [];

      for (i; i < l; i++) {
        this.output.push(this.data[ids[i] - 1]);
      }
      
      this.render(this.output.slice(0, window.city_config['block size']));
      $.waypoints('refresh');
    },

    search: function(search_config, filter_result) {
      var val = $.trim($(search_config.input).val());

      if (val.length < 2) return filter_result;

      /**
       * CHANGED: The following searches DOM elements, we need to search
       * the array
       */
      var search_in = search_config.search_in;
      var id_prefix = '#' + this.root + '_';
      val = val.toUpperCase();

      if (search_config.wholeword) {
        var searchWholeWord = $(search_config.wholeword).prop('checked');
      }

      var self = this;
      return $.map(filter_result, function(id) {
        /* The following searches DOM */
        //         var $ele = $(id_prefix + id);
        //         if (serach_in) $ele = $ele.find(serach_in);
        //         var eleText = $ele.text().toUpperCase();
        
        var eleText = '';
        $.each(self.data[id - 1], function(key, value) {
          eleText += value + ' ';
        });
        eleText = eleText.toUpperCase();
        
        if(searchWholeWord) {
          if (eleText.match('\\b' + val + '\\b')) return id;
        } else {
          if (eleText.indexOf(val) >= 0) return id;
        }
      });
    },

    execCallBacks: function(result) {
      for (var name in this.options.callbacks)
        this.options.callbacks[name].call(this, result);
    },

    rangeFilter: function(category_value, v) {
      var range = category_value.split('-');

      if (range.length == 2) {
        if (range[0] == 'below') range[0] = -Infinity;
        if (range[1] == 'above') range[1] = Infinity;
        if (Number(v) >= range[0] && Number(v) <= range[1]) {
          return true;
        }
      }
    },

    //Collect Records by id array
    getRecordsByIds: function(ids) {
      var records = [],
        r, i = 0,
        l = this.data.length;

      for (i; i < l; i++) {
        r = this.getRecord(i, this.data);
        if (ids.indexOf(r.id) != -1) records.push(r)
      }

      return records;
    },

    /**
     * Tag to make html elements.
     * i.e this.content_tag('span', {class: 'logo_text'}, "Logo Text")
     * First argument is tag name
     * Second argument is attributes class,title,id etc.
     * Last argument is array of html elements or text.
     **/
    content_tag: function(tag, attrs, content) {
      var $el = $(document.createElement(tag)),
        i = 0,
        j, c;

      if (attrs) $el.attr(attrs);
      if (content) {
        if (content.constructor == Array) {
          for (i, j = content.length; i < j; i++) {
            if (c = content[i]) $el.append(c.constructor == String ? c : $(c));
          }
        } else {
          $el.html(content);
        }
      }
      return $el[0];
    },

    /**
     * Link Tag:
     * i.e. this.link('/test/1' ,{'title': 'title'}, 'link text')
     **/
    link: function(url, attrs, content) {
      attrs = attrs || {};
      attrs['href'] = url;
      return this.content_tag('a', attrs, content)
    },

    /**
     * Image Tag:
     * i.e. this.image('/test.png', {class: 'image'})
     **/
    image: function(url, attrs) {
      attrs = attrs || {};
      attrs['src'] = url;
      return this.content_tag('img', attrs)
    },

    addData: function(data) {
      var i = 0,
        l = data.length,
        r, uniq_data = [],
        e_id = '#' + this.root + '_';

      if (this.options.streaming.before_add)
        this.options.streaming.before_add.call(this, data);

      for (i, l; i < l; i++) {
        r = this.getRecord(i, data);
        if ($(e_id + r.id).length == 0) uniq_data.push(data[i]);
      }

      if (uniq_data.length) {
        this.data = this.data.concat(uniq_data);
        this.render(uniq_data);
        this.buildCategoryMap(uniq_data);
      }

      if (this.options.streaming.after_add)
        this.options.streaming.after_add.call(this, data);

      this.filter();
    },

    setStreamingTimer: function() {
      var self = this,
        timer_func = this.options.streaming.batch_size ? setInterval : setTimeout;

      return timer_func(function() {
        self.streamData();
      }, this.options.streaming.stream_after);
    },

    clearStreamingTimer: function() {
      if (this.timer) clearTimeout(this.timer);
    },

    streamData: function() {
      var self = this,
        params = this.options.params || {},
        opts = this.options.streaming;

      params['offset'] = this.data.length;

      if (opts.batch_size) params['limit'] = opts.batch_size;
      if (this.options.search) params['q'] = $.trim($(this.options.search.input).val());


      $.getJSON(opts.data_url, params).done(function(data) {
        if (data && data.length > 0) {
          self.addData(data);
        } else {
          clearTimeout(self.timer);
        }
      });
    }

  };

  FilterJS.registerHtmlElement = function(tag_name) {
    _FilterJS.prototype[tag_name] = function(attrs, content) {
      return _FilterJS.prototype.content_tag(tag_name, attrs, content);
    }
  };

  $.each(['div', 'span', 'li', 'ul', 'p'], function(i, t) {
    FilterJS.registerHtmlElement(t);
  });

})(this);

/**
 * Recursive method to collect object from json object.
 * i.e. test =  [ {"deal": {"id": 1 }}, {"deal": {"id": 2}}]
 *  - to collect id from the json data
 *    test.filter_collect('deal').filter_collect('id')
 *    this will return [1,2]
 */
Array.prototype.filter_collect = function(field, arr) {
  var arr = arr || [];
  for (var i = 0, l = this.length; i < l; i++) {
    var obj = this[i];
    if (obj.constructor == Array) {
      obj.filter_collect(field, arr);
    } else {
      arr.push(obj[field]);
    }
  }

  return arr;
};

//In IE indexOf method not define.
if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function(obj, start) {
    for (var i = (start || 0), j = this.length; i < j; i++) {
      if (this[i] === obj) {
        return i;
      }
    }
    return -1;
  }
}