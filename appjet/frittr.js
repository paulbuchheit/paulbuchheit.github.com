/* appjet:version 0.1 */
// Copyright 2008 Paul Buchheit
// Licensed under the Apache License, Version 2.0

import("dlog")
import("storage")
if (!storage.ftags) storage.ftags = {};

page.showRenderTime(false);

function randStr() { return md5(Math.random() + " " + Math.random()); }

// I'm including "frtr-" in the SUP-ID for easier debug
function supID(tag) { return 'frtr-' + md5(tag).substring(0, 8); }
function setSUPHeader(tag) {
    response.setHeader("X-SUP-ID", "http://friendfeed.com/api/public-sup.json#" + supID(tag));
}


function post_new() {
    var tags = trim(request.params.tags.replace(/[\s,<>]+/g, ' '));
    tags = tags.replace(/[&?\/]/g, '-').toLowerCase();
    if (!tags) tags = "public";
    tags = tags.split(' ');
    var path = "/" + tags[0];
    var text = trim(request.params.text).substring(0, 1000);
    if (!text) {
        response.redirect(path);
        return;
    }
    
    var entry = new StorableObject({
        text: text,
        tags: tags.join(' '),
        eid: randStr().substring(0, 11),
        date: (new Date()).getTime()
    });
    
    for each(var tag in tags) {
        var name = "tag_" + tag;
        var ftag = storage.ftags[name];
        if (!ftag) storage.ftags[name] = ftag = new StorableCollection();                            
        ftag.add(entry);
        var supid = supID(tag);
        var res = wpost("http://friendfeed.com/api/public-sup-ping", {supid: supid});
        dlog.info(sprintf("Ping for %s/%s: %s", tag, supid, res));
    }
    response.redirect(path);
}

function print_page(tag, eid) {
    setSUPHeader(tag);  // SUP works for html too
    page.head.write(LINK({rel:"alternate", href:"/" + tag + "?output=atom",  
        type:"application/atom+xml"}));
        
    var entries = DIV({id:"entries"});
    var main = DIV({id:"main"},
        A({href:"/", id:"logo"}, "frittr"),
        "What is you doing?",
        FORM({method:"POST", action:"/new"},
        TEXTAREA({name:"text"}), "Tags: ",
        INPUT({type:"text", name:"tags", value:tag + " "}),
        INPUT({type:"submit", value:"Update", id:"update"})),
        entries
    );

    var ftag = storage.ftags["tag_" + tag];
    if (ftag) {
        if (eid) ftag = ftag.filter({eid:eid});
        ftag.sortBy("date").reverse().skip((request.params.start || 0)-0)
            .limit(20).forEach(function(entry) {
            var e = DIV({"class": "entry"}, DIV({"class":"etext"}, entry.text)) 
            for each(var t in entry.tags.split(' ')) {
                e.push(" ");
                e.push(A({href: "/" + t}, t));
            }
            e.push(A({"class":"date", href: "/" + tag + "/" + entry.eid}, new Date(entry.date)));
            entries.push(e);
        });
    }


    print(DIV({id:"wrapper"}, main, aboutHtml, realtimeHtml));
}

function atomDate(d) {
    d = new Date(d);
    return sprintf("%04d-%02d-%02dT%02d:%02d:%02dZ", 
                   d.getUTCFullYear(), d.getUTCMonth()+1, d.getUTCDate(),
                   d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds());
}

function print_feed(tag) {
    setSUPHeader(tag);  // SUP works for html too
    response.setContentType("application/atom+xml; charset=UTF-8");
    page.setMode("plain");
    var ftag = storage.ftags["tag_" + tag];
    if (!ftag || ftag.size() < 1) {
        response.notFound();
        return;
    }
    ftag = ftag.sortBy("date").reverse().limit(30);
    var link = "http://" + request.headers.Host + "/" + tag;
    var a = {};
    importTags(a, "feed title updated link id entry content".toUpperCase().split(' '));
    var feed = a.FEED({xmlns:"http://www.w3.org/2005/Atom"},
        a.TITLE("frittr / " + tag),
        a.ID(link),
        a.LINK({rel:"alternate", type:"text/html", href:link}),
        a.LINK({rel:"http://api.friendfeed.com/2008/03#sup", xmlns:"http://www.w3.org/2005/Atom",
            type:"application/json", href:"http://friendfeed.com/api/public-sup.json#" + supID(tag)}),
        a.UPDATED(atomDate(ftag.first().date))
        );
    ftag.forEach(function(entry) {
        feed.push(a.ENTRY(
            a.TITLE(entry.text),
            a.LINK({href: link + "/" + entry.eid}),
            a.ID({href: link + "/" + entry.eid}),
            a.UPDATED(atomDate(entry.date))));
    });
    print(raw('<?xml version="1.0" encoding="utf-8"?>'))
    print(feed);        
}

var aboutHtml = raw("""<div id="about">
<div style="color:red;font-size:18pt">What is frittr?</div>
<div style="margin:8px 0 9px 0"><span style="color:#00dd00">frittr</span> = twitter - login + tags</div>
<div style="font-size:12pt">It's an ultra-simple micro-blogging type app centered around tags
instead of people, and without login (wiki style). <br/><br/>
<a href="http://friendfeed.com/paul">I</a> wrote it as a demonstration of how apps can easily add
<a href="http://code.google.com/p/simpleupdateprotocol/">SUP</a> support with just a few
lines of code, using FriendFeed's <a href="http://friendfeed.com/api/public-sup">public SUP feed</a>.
Entries tagged 'public' automatically appear in the 
<a href="http://friendfeed.com/rooms/frittr-public">frittr/public room</a> within about a
minute thanks to frittr's use of SUP.<br/><br/>
The entire app is written in about 150 lines of code (plus 100 lines of CSS) using AppJet, and
<a href="http://source.frittr.appjet.net/">the source code</a> is free.</div>
</div>""");

var realtimeHtml = raw("""<div id="rtbox">
<iframe src="http://friendfeed.com/rooms/frittr-public/realtime?embed=1"
 frameborder="0" height="400" width="430"></iframe>
</div>""");

if (request.isPost) {
    post_new();
} else {
    var parts = request.path.split('/');
    var tag = parts[1] || "public"; 
    if (request.params.output == "atom") {
        print_feed(tag);
    } else {
        print_page(tag, parts.length ? parts[2] : undefined);
    }
}

/* appjet:css */

body {
    background: #585068;
}

#about,
#logo,
#rtbox,
#main {
    -moz-border-radius: 10px;    
    -webkit-border-radius: 10px;
}

#logo:visited,
#logo {
    position:absolute;
    top: -50px;
    left: -10px;
    
    font-size:50px;
    color: #00dd00;
    display:block;
    text-decoration:none;
    background: white;
    padding:10px 15px 5px 15px;
    line-height:1em;
}

#about {
    position:relative;
    top: -35px;
    left: 95px;
    background:white;
    padding: 13px 20px 13px 20px;
    width: 450px;
}

#about a { color: blue; }

#rtbox {
    position:relative;
    left: -25px;
    width: 430px;
    background:white;
    padding: 0px 15px 15px 15px;
}

#wrapper {
    margin: 65px auto 0px auto;
    width:560px;
}
    
#main {
    padding:30px;
    padding-top:25px;
    padding-bottom:4em;
    min-height:15em;
    background: white;
    position: relative;
    background: #eeeeee;
}
textarea {
    width:500px;
    height:5em;
    margin-bottom:10px;
    padding:3px;
    font-size: 16px;
}
#update {
    width:80px;
    position:absolute;
    right:30px;
}

.entry {
    font-size: 14px;
}

.etext {
    background: white;
    border: 1px solid #ddd;
    margin-top:20px;
    margin-bottom: 5px;
    padding:7px;
    font-size: 20px;
    -moz-border-radius: 7px;
    -webkit-border-radius: 7px;
    overflow:hidden;
}

.entry a:visited,
.entry a {
    padding-left:7px;
    color: #0000ee;
}
    
.entry a.date:visited,
.entry a.date {
    font-size:9px;
    color: #666;
    padding-left:7px;
    text-decoration: none;
}
.entry a.date:hover {
    text-decoration: underline;
}

#appjetfooter {
    border-top: 1px solid black !important;
}

