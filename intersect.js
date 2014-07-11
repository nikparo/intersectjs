/**
*
* intersect.js - Boolean div operations for pixel perfect clipping and compositing.
* URL: http://www.nikparo.com/intersection.js/
* Version: 0.1.1
* Author: Nik Paro
*
* Requires JQuery (at least for now) (tested with 1.11.1)
*/

/*
TODO:
Check for support with modernizr. Fallback - ?
- Replace DOM 'el' elements with locally created 'el' containing the dom element and other info.
  // E.g. el.dom, el.masks, el.styles, ... // This would solve quite a few problems.

DESIGN DECISIONS:
- If you need different effects for different 'self' elements, run .intersect() on each.
- el.dom vs el // Confusion ensues ... =s

Name? ClipMasks, DynamicClip, ClipOverlay, ... DynClip
CompositeClip.js
clip.js
booleanclip.js
intersection.js
divclip.js - kinda taken, also, is it really clipping?
divmix.js
divblend.js
divmerge.js
merge.js
- intersect.js - (best so far!)
overlay.js

Functions: (el / index / el_index optional for individual updates.)
// Better yet, allow this.elements[2].refresh(indexes) // Index being index of self. Only runs on elements[2].
this.refresh(indexes) - Thorough refresh, updates shapes. Takes delays & timers into acocunt.
this.refreshLoc(indexes) - location refresh. Good for scrolling. Takes delays & timers into acocunt.
this.refreshShape(indexes)
this.refreshContent(indexes)
update(elements, indexes) - thorough update, local. Used by refresh and elsewhere.
updateLoc(elements, indexes) - local location update, used by locRefresh.
updateShape(elements, indexes)
updateContent(elements, indexes)

*/

(function($) {

  $.fn.intersect = function(options) {
    
    "use strict";

    // Default settings for the plug-in
    var settings = {
      elements: '.elements', // Jquery selector string, or a list of dom elements?
      delayedUpdate: false, // Set as false or a value in milliseconds.
      updateTimeout: 0, // Timeout in milliseconds, 0 for no timeout check.
      copyContent: true,
      // overlays: '.overlay'
      // clipType: 'intersection' // XOR, in out etc. 
      // clipType Not needed, do this through css styles. Visibility: hidden etc.
    };

    // Merge options with the default settings
    if (options) {
      $.extend(settings, options);
    }
    // set updateTimeout to definite integer.
    settings.updateTimeout = parseInt(settings.updateTimeout);
    if ( isNaN(settings.updateTimeout) || settings.updateTimeout < 0 ) {
      settings.updateTimeout = 0;
    }

    // var underlays = $(settings.elements);
    // console.log(underlays);

    // // Support for multiple instances (needed?) Or better treat them as one collection throughout? 
    // // what happens if you want to change settings for one later on? or just update one?
    //
    // Decision: use .each() for simpler code. Create one .intersect() object for each element that might clip.
    // But.. I don't like it :/ .. irrational or not?
    // if (this.length > 1) {
    //     this.each(function() {
    //         console.log('this should only be run once per update cycle etc.');
    //         $(this).intersect(options);
    //     });
    //     return this;
    // }

    // var clipSvg;

    // jQuery caches
    var self = this;

    // var slider = $(self);
    // var slideContainer = slider.children('div.slides');
    // var slides = slideContainer.children('div.slide');
    // var resources = slider.children('.resources');
    // var listItems = resources.find('li');
    // var clippath;
    // var clipChild;
    var timer;
    var delayTimer;
    var savedSVGPaths;

    this.elements = []; // A list of dom elements that will clip 'self'.
    // Change to this.elements ?! for reference from outside. allow e.g. this.elements[2].refreshAll();
    // var elcache = []; // Change to elstyles ? Clearer, maybe. It's all cache anyway...
    // Cache of clipping element attributes - to check whether an update is needed.
    // Index is same as index in elements.
    // Is this actually needed? will it be faster than just setting values again?
    // elcache.length = elements.length;
    // var el_interior = []; // A list of interior elements created, in the form of [[el1,el2][el3,el4][el5,el6]].
    // el_interior.length = self.length;
    // var masks = []; // The masks for elements - in the form of [[][][]], similar to el_interior.
    // // For a masks[self-index][el-index] syntax.
    // masks.length = self.length;
    // for (var i=0; i<self.length; i++) {
    //   el_interior[i] = [];
    //   el_interior[i].length = elements.length;
    //   masks[i] = [];
    //   masks[i].length = elements.length;
    // }




    function init() {
      /* List of what happens here: 
      Save a list of elements to check collision with.

      */

      // Setup elements objects and cache content.
      var tmp_elements = $(settings.elements).get();
      self.elements.length = tmp_elements.length;
      for (var i=0; i<self.elements.length; i++) {

        var masks = [];
        var contents = [];
        masks.length = contents.length = self.length;
        // for (var j=0; j<self.length; j++) {
        //   contents[j] = [];
        //   masks[j] = [];
        // }

        self.elements[i] = { 
          dom: tmp_elements[i],
          refresh: self.refresh, 
          masks: masks,
          contents: contents
        }
      }

      // var elements = $(settings.elements).get(); // A list of dom elements that will clip 'self'.
      // // Change to this.elements ?! for reference from outside. allow e.g. this.elements[2].refreshAll();
      // var elcache = []; // Change to elstyles ? Clearer, maybe. It's all cache anyway...
      // // Cache of clipping element attributes - to check whether an update is needed.
      // // Index is same as index in elements.
      // // Is this actually needed? will it be faster than just setting values again?
      // elcache.length = elements.length;
      // var el_interior = []; // A list of interior elements created, in the form of [[el1,el2][el3,el4][el5,el6]].
      // el_interior.length = self.length;
      // var masks = []; // The masks for elements - in the form of [[][][]], similar to el_interior.
      // // For a masks[self-index][el-index] syntax.
      // masks.length = self.length;
      // for (var i=0; i<self.length; i++) {
      //   el_interior[i] = [];
      //   el_interior[i].length = elements.length;
      //   masks[i] = [];
      //   masks[i].length = elements.length;
      // }

      // // Save a list of clipping elements (this should be in a general function I think..)
      // for ( var i = 0; i < elements.length; i++ ) {
      //   // var styles = document.defaultView.getComputedStyle(el,null);
      //   var styles = [ 'position', 'top', 'left', 'right', 'bottom', 'border-radius',
      //     'border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 
      //     'border-bottom-right-radius', 'width', 'height', 'margin', 'padding' ]; 
      //     // Move this elsewhere, for more generic code.
      //   // Transform, rotate, etc.
      //   // Border-box ...
      //   // Clip, mask
      //   elcache[i] = getStyles(elements[i], styles);
      // }

      // Loop through self to set everything up.
      var s;
      for ( var i = 0; i < self.length; i++ ) {

        // Check that self is positioned. If not, set position: relative. 
        s = getStyles(self[i], 'position');
        if ( s == 'static' ) {
            self[i].style.position = 'relative';
        }

        // Create the internal structure for clippings
        for (var j=0; j<self.elements.length; j++) {
          // No check whether it exists or not, PRONE TO BREAK?!
          var iresult = interior(self[i], self.elements[j].dom);
          // console.log(iresult);
          // masks[i][j] = iresult[0];
          // el_interior[i][j] = iresult[1];
          console.log(self.elements, j, i);
          self.elements[j].masks[i] = iresult[0];
          self.elements[j].contents[i] = iresult[1];
        }
      }

      self.update();
      return self;
      // End of init() function.
    }

    function getStyles(el, styles) {
        // Return an array of relevant styles for dom element el.

      if ( !(styles instanceof Array) ) { styles = [styles] };

      // console.log('styles-passed', styles);

      var result = {};
      if (el.currentStyle) {
        // getComputedStyle isn't compatible with all older browsers (notably IE).
        // From http://www.quirksmode.org/dom/getstyles.html
        console.log('using el.currentStyle');
        for (var i=0; i<styles.length; i++) {
            result[styles[i]] = el.currentStyle[styles[i]];
        }
      }
      else if (window.getComputedStyle) {
        // var y = document.defaultView.getComputedStyle(el,null).getPropertyValue(styleProp);
        var cstyles = document.defaultView.getComputedStyle(el,null);
        // console.log(cstyles);
        for (var i=0; i<styles.length; i++) {
          // result.append(relStyles[i]: styles.getPropertyValue(relStyles[i]));
          result[styles[i]] = cstyles.getPropertyValue(styles[i]);
        }
      }

      // console.log('styles', result);

      return result;
      // End of getRelStyles(el) function.
    }

    function setStyles(el, styles) {
      var val;
      // console.log('setstyles', el, styles);
      for (var key in styles) {
        if ( typeof styles[key] != 'string' ) { val = topx(styles[key]) }
        else { val = styles[key] };
        el.style.setProperty(key, val);
      }
    }

    function getRelPos(el1, el2) {
      // Get the position of el2 relative to el1. Return a {left: x, top: y} array.
      var rect1 = el1.getBoundingClientRect();
      var rect2 = el2.getBoundingClientRect();

      return {left: rect2.left-rect1.left, top: rect2.top-rect1.top};
    }

    function interior(el1, el2) {
      // Create the interior structure of self[index]. index optional.
      // I don't really like this implementation. Might be better as this.interior(el), 
      // iterating over self. Take el as specified or all (clipping) elements.
      // index = parseInt(index);
      // if !( isNaN(index) ) { divs = [self[index]] };
      // else { divs = self.get() };

      // for (var i=0; i<divs.length; i++) {
      var content = el1.innerHTML;
      // var iclass = $(el).data('intersect-class'); //Jquery, but should be fairly fast. Easy.
      var iclass = el2.dataset.intersectClass; // Turns out the DOM is no worse.

      var mask = $(el1).find('> .intersect-mask').get(); // Will this give an error? :s
      // var mask = el2.masks[index]; // Faster, + works with new syntax ...
      // console.log('prior', mask, mask.length);
      if (mask.length == 0) {
        mask = document.createElement('div');
        // if (iclass) { mask.className = 'intersect-mask ' + iclass }
        // else { mask.className = 'intersect-mask' };
      }
      // console.log('post', mask);
      console.log('adding classes: ', 'intersect-mask '+iclass, 'to intersect-mask.');
      $(mask).addClass('intersect-mask '+iclass);
      
      // mask.className = 'intersect-mask';
      // Set the dimensions of mask
      // var styles = [ 'top', 'left', 'right', 'bottom', 'width', 'height', 'padding'];
      var styles = [ 'width', 'height', 'padding', 
      'border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius' ];
      var relpos = getRelPos(el1,el2);
      // console.log('relpos', relpos);
      // console.log('getStyles', getStyles(el2, styles));
      setStyles(mask, getStyles(el2, styles));
      // console.log('el2 styles:', getStyles(el2, styles));
      // console.log('mask before relpos', mask.style);
      setStyles(mask, getRelPos(el1, el2));
      // console.log('mask after relpos', mask.style);

      var interior = document.createElement('div');
      // var styles = [ 'width', 'height', 'padding', 'border-radius']; // no need to declare it twice when it's the same.
      setStyles(interior, getRelPos(el2, el1));
      setStyles(interior, getStyles(el1, styles));

      // if (iclass) { interior.className = 'intersect-content ' + iclass }
      // else { interior.className = 'intersect-content' };
      interior.className = 'intersect-content';
      // Set style properties for interior
      interior.innerHTML = content;

      interior = mask.appendChild(interior);
      mask = el1.appendChild(mask);
      // }
      
      // what do I return here?! MASK .. and revert to el1, el2 syntax. I don't know the index of el anyway.
      return [mask, interior];
    }

    function topx(i) {
      return i+'px';
    }

    this.update = function(el) {
      // Thorough update function. Internal? Run this when you know that shapes have changed.
      // el is an optional dom element.

      // self.oldUpdate(el);

      // console.log('attempting refresh code');

      if (!(el)) {
        el = self.elements;
      }

      for (var i=0; i<el.length; i++) {

      }

      updateLoc();

      return self;
    }

    function insert(str, values) {
      // Function to replace e.g. all $2 for values[2] in string str.
      for (var i=0; i=str.length; i++) {
        str.split('$'+i).join(values[i]);
      }
    }

    this.refresh = function(el) {
      // Public function to be used in scroll events etc. Timed wrapper.
      if ( settings.updateTimeout > 0 ) {
        clearTimeout(timer);
        timer = setTimeout(self.update, settings.updateTimeout, el);
      }
      else {
        self.update(el);
      }
      if ( settings.delayedUpdate ) {
        // console.log('delay timer is on for sure');
        clearTimeout(delayTimer);
        delayTimer = setTimeout(function() {
          console.log('running delay timer function');
          self.update(el);
        }, settings.delayedUpdate);
      }
      // self.update(el);
      return self;
    }
    this.refreshShape = function(el) {
      // Public function to be used in scroll events etc. Timed wrapper.
      if ( settings.updateTimeout > 0 ) {
        clearTimeout(timer);
        timer = setTimeout(updateShape, settings.updateTimeout, el);
      }
      else {
        updateShape(el);
      }
      if ( settings.delayedUpdate ) {
        // console.log('delay timer is on for sure');
        clearTimeout(delayTimer);
        delayTimer = setTimeout(function() {
          console.log('running delay timer function for updateShape');
          updateShape(el);
        }, settings.delayedUpdate);
      }

      return self;
    }

    function updateLoc(el) {
    // this.updateLoc = function(el) {
      // Update location of dom_el if given and shape hasn't changed.
      // This starts to fall apart unless given an index instead of el, (which is a bit tricky),
      // or if el is self created element, containing the dom reference, and other info.
      // el ignored for now. !! HACK.
      // self.update(el);
      // console.log('running updateLoc');
      // console.log(elements);
      for (var i=0; i<self.length; i++) {
        for (var j=0; j<self.elements.length; j++) {
          var el1 = self[i];
          var el2 = self.elements[j].dom;
          // var relpos = getRelPos(el1,el2);
          // var mask = masks[i][j];
          var mask = self.elements[j].masks[i];
          // var interior = el_interior[i][j];
          var interior = self.elements[j].contents[i];
          // console.log('mask:', mask);

          setStyles(mask, getRelPos(el1, el2));
          setStyles(interior, getRelPos(el2, el1));
        }
      }
    }

    function updateShape(el) {
      for (var i=0; i<self.length; i++) {
        for (var j=0; j<self.elements.length; j++) {
          var el1 = self[i];
          var el2 = self.elements[j].dom;
          // var relpos = getRelPos(el1,el2);
          // var mask = masks[i][j];
          var mask = self.elements[j].masks[i];
          // var interior = el_interior[i][j];
          var interior = self.elements[j].contents[i];
          // console.log('mask:', mask);
          
          var styles = [ 'width', 'height', 'padding', 'border-top-left-radius', 
            'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius' ];
          setStyles(mask, getRelPos(el1, el2));
          setStyles(mask, getStyles(el2, styles));
          setStyles(interior, getRelPos(el2, el1));
          setStyles(interior, getStyles(el1, styles)); // Style update for el1 needed or not? May as well.
        }
      }
    }

    function updateContent(el) {
      // Presumes that element el has changed, so updates each self[] with new content.

    }

    this.oldUpdate = function(el) {

      console.log('update function getting ready!');

      // var overlays = $(settings.overlays).get();
      var overlays = self.get();
      var underlays = $(settings.elements).get();
      // console.log('1', underlays[0]);

      // clipSvg = makeSVG('rectangle', { x: 0, y: 0, height:150, width:270, rx:20, ry:20 });
          // document.getElementById('s').appendChild(clipSvg);

      var _svgNS = 'http://www.w3.org/2000/svg';
      var parent = document.getElementById('s');

      // var clippath = document.createElementNS(_svgNS, 'clipPath');

      // var rect = makeSVG('rect', { x: 0, y: 0, height:100, width:270, rx:20, ry:20 });
      // var rect = document.createElementNS(_svgNS, 'rect');
      // rect.setAttributeNS(null, 'x', '0');
      // rect.setAttributeNS(null, 'y', '0');
      // rect.setAttributeNS(null, 'width', '200');
      // rect.setAttributeNS(null, 'height', '100');
      // clippath.appendChild(rect);


      var rect1;
      var rect2;
      var overlap;
      for (var j=0; j<overlays.length; j++) {
        rect1 = overlays[j].getBoundingClientRect();
        for (var i=0; i<underlays.length; i++) {
          // var rect1 = div1.getBoundingClientRect();
          rect2 = underlays[i].getBoundingClientRect();
        }
        // if (!overlap) {
        //  // console.log('they are NOT overlapping!');
        //  $(overlays[j]).removeClass($(overlays[j]).data('boolean-class'));
        // }
      }

      // console.log(rect1, rect2);
      // console.log(underlays[0]);
      // console.log(toSVGPath($(settings.underlays)));
      // var radius = underlays[0].style.borderRadius;
      // var radius = $(settings.underlays).css('border-radius');
      // console.log(radius);
      // var attrs = { 
      //  x: rect2.left - rect1.left,
      //  y: rect2.top - rect1.top,
      //  height: rect2.bottom-rect2.top,
      //  width: rect2.right - rect2.left,
      //  rx: radius,
      //  ry: radius
      // }

          var x = rect2.left - rect1.left;
      var y = rect2.top - rect1.top;

      var attrs = {
        d: toSVGPath($(settings.elements),x,y)
      };

      if (clippath == null) {
        clippath = document.createElementNS(_svgNS, 'clipPath');
        parent.appendChild(clippath);
        clippath.setAttributeNS(null, 'id', 'clipPolygon');
        // var rect = makeSVG('rect', attrs);
        // clippath.appendChild(rect);
        var path = makeSVG('path', attrs);
        clippath.appendChild(path);
        clipChild = clippath.firstChild;
      }
      updateSVG(clipChild, attrs);
            console.log('update function got to the end');

    }

    return init();

  }
})(jQuery);
