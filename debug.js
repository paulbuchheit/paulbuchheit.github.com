// Copyright 2009 Paul Buchheit
// Licensed under the Apache License, Version 2.0

// To activate the debug window, press the 'D' key (Shift-d)
// Press 'escape' to hide
// Assumes jQuery has already been included.

document.write(
'<style type="text/css">'+
'#dbgwin { position:fixed;width:95%;left:1%;top:55%;height:40%;padding:10px; border:1px solid #888; background:white;'+
'          overflow:auto; z-index:20000; }'+
'#dbgwin .dbgresults { border:2px solid #0023df; margin-bottom:1em; padding:1%; width:95%; height:60%; background:white; overflow:auto }'+
'#dbgwin .dbgcommand { border:2px solid #23df00; width:97%; height:25% }'+
'#dbgwin #dbgmain { height:95%; }'+
'#dbgwin #dbghide { float:right; color:#0023df; cursor:pointer;cursor:hand; }'+
'</style>'
);

(function() {
  // Using a function is faster than 4 regexs when there are few matches
  var htmlCharMap = {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'};
  function htmlCharEsc(c) { return htmlCharMap[c]; }  // don't create a closure, and don't keep recreating htmlCharMap
  function htmlEscape(s) { return String(s).replace(/[&<>\"]/g, htmlCharEsc); }
  if (!String.prototype.endsWith)
    String.prototype.endsWith = function(s) { return this.indexOf(s, this.length - s.length) != -1; }
  if (!String.prototype.startsWith)
    String.prototype.startsWith = function(s) { return this.lastIndexOf(s, 0) != -1; }

  function hideDebugWin() {
    $('#dbgwin').css('display', 'none').find(".dbgcommand").blur();
  }

  function showDebugWin() {
    if ($('#dbgwin').length != 0) {
      $('#dbgwin').css('display', 'block');
      $('#dbgwin .dbgcommand').focus();
      window.dprint('');
      return;
    }
      
    $('body').append('<div id=dbgwin><span id=dbghide class=al>Hide</span><div id=dbgmain></div></div>');
    $('#dbghide').click(hideDebugWin);
    new DebugWin($('#dbgmain'));

  }

  var inputtagnames = { 'INPUT':1, 'TEXTAREA':1, 'SELECT':1, 'BUTTON':1 };
  function isInputTag(tag) { return inputtagnames[tag.tagName]; }

  $(function() {
    $(document).keypress(function (e) {
      if (isInputTag(e.target)) return;
      if ((e.keyCode || e.which) == 68) {
        showDebugWin();
        return false; // nullify keypress
      }
    });
  });

  function str(o) {
    if (o && typeof(o) == 'object' && o.toSource) return o.toSource();
    return ''+o;
  }

  var dprint_buf = []
  window.dprint = function(msg) {
    if (window.console && window.console.log) {
      console.log(msg);
    }
    dprint_buf.push(str(msg));
    if (dprint_buf.length > 30) dprint_buf.shift();
  }

  window.dprintObj = function(o) {
    for (var i in o) window.dprint(i + ": " + o[i]);
  }

  function DebugWin(container) {
    this.container = container;
    this.hist = [''];
    this.h_pos = 0;

    this.container.html('<div class=dbgresults></div><textarea class=dbgcommand></textarea>');
    this.cmdbox = $(".dbgcommand", this.container);
    this.resbox = $(".dbgresults", this.container);

    var self = this;

    this.cmdbox.keydown(function(e) {
      // IE only generates keydown events for arrow keys.
      // keydown(38) == 'up arrow' but keypress(38) == '&'. go figure.
      if ($.browser.safari || $.browser.msie)
        switch (e.keyCode) {
          case 38: self.hist_nav(-1); return false;
          case 40: self.hist_nav(1); return false;
        }
    } ).keypress(function(e) {
     switch (e.keyCode) {
        case 13:  self.go(); return false;
        case 38:     if ($.browser.safari || $.browser.msie) return;   // safari/ie use 38 and 40 for & and (
        case 63232:  self.hist_nav(-1); return false; // safari uses 63232/3 for up/down
        case 40:     if ($.browser.safari || $.browser.msie) return; 
        case 63233:  self.hist_nav(1); return false;
        case 27:  hideDebugWin(); return false;
      }
    } ).get(0).focus();


    window.dprint = function(msg) { 
        if (arguments.length > 1) msg = [].join.call(arguments, ", ");
        self.print(msg); 
    }
    $.each(dprint_buf, function(i, s) { self.print(s); });
    dprint_buf = null;
  }

  DebugWin.prototype = {
    hist_nav: function (dir) {
      var nhp = this.h_pos + dir;
      if (nhp < 0 || nhp >= this.hist.length) return;
      if (this.h_pos == this.hist.length-1)
        this.hist[this.h_pos] = this.cmdbox.val();
        
      this.h_pos = nhp;
      this.cmdbox.val(this.hist[this.h_pos]).focus();
    },

    printHTML: function(msg) {
      this.resbox.append(msg);
      var r = this.resbox.get(0);
      setTimeout(function() { r.scrollTop = r.scrollHeight; }, 1);
    },

    print: function (msg) {
      this.printHTML('<pre>' + htmlEscape(str(msg)) + '</pre>');
    },

    go: function () {
      this.c = $.trim(this.cmdbox.val());

      this.h_pos = this.hist.length-1;
      this.hist[this.h_pos] = this.c;
      this.hist[++this.h_pos] = '';

      this.cmdbox.val('');
      try {
        if (this.c.endsWith(";")) {
            var r = eval('$_=((function () { ' + this.c + ' })())');
        } else {
            var r = eval('$_=(' + this.c + ')');
        }
        this.printHTML('<pre>&gt; ' + htmlEscape(this.c + '\n' + r) + '</pre>');
      } catch(e) {
        this.printHTML('<pre>Error: ' + e + '</pre>');
      }
    }
  }

  window.dtimer = function(name) {
    if (name) {
      name = '[' + name + '] ';
    } else {
      name = '';
    }
    var start = new Date();
    var prev = start;
    return function (text) {
      var now = new Date();
      dprint(name + (text || "") + " " + (now - start) + "ms (+" + (now - prev) + "ms)");
      prev = now;
    }
  };

  window.objkeys = function(o) {
    var r = [];
    for (var i in o) r.push(i);
    return r;
  }
})();

window.getStackTrace = (function () {

var mode;
try {(0)()} catch (e) {
    mode = e.stack ? 'Firefox' : window.opera ? 'Opera' : 'Other';
}

switch (mode) {
    case 'Firefox' : return function () {
        try {(0)()} catch (e) {
            return e.stack.replace(/^.*?\n/,'').
                           replace(/(?:\n@:0)?\s+$/m,'').
                           replace(/^\(/gm,'{anonymous}(').
                           split("\n");
        }
    };

    case 'Opera' : return function () {
        try {(0)()} catch (e) {
            var lines = e.message.split("\n"),
                ANON = '{anonymous}',
                lineRE = /Line\s+(\d+).*?in\s+(http\S+)(?:.*?in\s+function\s+(\S+))?/i,
                i,j,len;

            for (i=4,j=0,len=lines.length; i<len; i+=2) {
                if (lineRE.test(lines[i])) {
                    lines[j++] = (RegExp.$3 ?
                        RegExp.$3 + '()@' + RegExp.$2 + RegExp.$1 :
                        ANON + RegExp.$2 + ':' + RegExp.$1) +
                        ' -- ' + lines[i+1].replace(/^\s+/,'');
                }
            }

            lines.splice(j,lines.length-j);
            return lines;
        }
    };

    default : return function () {
        var curr  = arguments.callee.caller,
            FUNC  = 'function', ANON = "{anonymous}",
            fnRE  = /function\s*([\w\-$]+)?\s*\(/i,
            stack = [],j=0,
            fn,args,i;

        while (curr) {
            fn    = fnRE.test(curr.toString()) ? RegExp.$1 || ANON : ANON;
            args  = stack.slice.call(curr.arguments);
            i     = args.length;

            while (i--) {
                switch (typeof args[i]) {
                    case 'string'  : args[i] = '"'+args[i].replace(/"/g,'\\"')+'"'; break;
                    case 'function': args[i] = FUNC; break;
                }
            }

            stack[j++] = fn + '(' + args.join() + ')';
            curr = curr.caller;
        }

        return stack;
    };
}

})();

window.printStackTrace = function () {
    dprint(getStackTrace().join("\n"));
}
